import { describe, expect, it } from "vitest";
import { Question } from "@/lib/experiments/types";
import { ExperimentRepository, SaveResponseInput, RunStatus } from "@/lib/experiments/repository";
import { ModelCallError } from "@/lib/gemini/contracts";
import { MockModelAdapter } from "@/lib/gemini/mock-adapter";
import { QuotaPort, QuotaReservation } from "@/lib/rate-limit/quota";
import { runExperiment } from "@/lib/experiments/run-experiment";

const question: Question = {
  questionId: "test-arithmetic-01",
  sourceDataset: "unit-test",
  sourceVersion: "1.0.0",
  category: "arithmetic",
  subject: "Arithmetic",
  question: "What is 20 + 22?",
  choices: [{ label: "A", text: "40" }, { label: "B", text: "42" }, { label: "C", text: "44" }, { label: "D", text: "46" }],
  correctAnswer: "B",
  split: "playground",
  validationStatus: "validated",
};

const initial = JSON.stringify({ answer: "A", confidence: 0.6, explanation: "The values suggest forty." });
const revised = JSON.stringify({ answer: "B", confidence: 0.8, explanation: "Rechecking gives forty-two." });

class TestRepository implements ExperimentRepository {
  readonly saved: SaveResponseInput[] = [];
  status: RunStatus = "running";
  failure?: string;
  async createRun() { return "run-test-0001"; }
  async saveResponse(_runId: string, input: SaveResponseInput) { this.saved.push(input); }
  async finishRun(_runId: string, status: RunStatus, failure?: string) { this.status = status; this.failure = failure; }
}

class TestQuota implements QuotaPort {
  experimentReservations = 0;
  modelReservations = 0;
  constructor(private readonly modelDecision: QuotaReservation = { allowed: true }, private readonly experimentDecision: QuotaReservation = { allowed: true }) {}
  async reserveExperiment() { this.experimentReservations += 1; return this.experimentDecision; }
  async reserveModelRequest() { this.modelReservations += 1; return this.modelDecision; }
}

describe("mocked end-to-end experiment", () => {
  it("runs direct and reflection, scores both, and reveals the key only after both persist", async () => {
    const model = new MockModelAdapter([initial, revised]);
    const repository = new TestRepository();
    const quota = new TestQuota();
    const result = await runExperiment(question, "a".repeat(64), { model, repository, quota, sleep: async () => undefined });

    expect(result).toMatchObject({
      status: "complete",
      direct: { answer: "A", confidence: 0.6 },
      reflection: { answer: "B", confidence: 0.8 },
      evaluation: { correctAnswer: "B", directCorrect: false, reflectionCorrect: true, transition: "corrected" },
    });
    if (result.status !== "complete") throw new Error("Expected complete result.");
    expect(result.evaluation.confidenceChange).toBeCloseTo(0.2);
    expect(result.evaluation.directBrier).toBeCloseTo(0.36);
    expect(result.evaluation.reflectionBrier).toBeCloseTo(0.04);
    expect(repository.saved.map((row) => row.phase)).toEqual(["direct", "reflection"]);
    expect(repository.status).toBe("complete");
    expect(quota.experimentReservations).toBe(1);
    expect(quota.modelReservations).toBe(1);
    expect(model.inputs).toHaveLength(2);
    expect(model.inputs[1].prompt).toContain("Answer: A");
    expect(model.inputs[0].prompt).not.toContain("correctAnswer");
    expect(model.inputs[1].prompt).not.toContain("correctAnswer");
  });

  it("returns a partial experiment if reflection fails and withholds the answer key", async () => {
    const model = new MockModelAdapter([initial, new ModelCallError("timeout", "timeout", false)]);
    const repository = new TestRepository();
    const result = await runExperiment(question, "b".repeat(64), { model, repository, quota: new TestQuota(), sleep: async () => undefined });
    expect(result.status).toBe("partial");
    expect(result).not.toHaveProperty("evaluation");
    expect(repository.saved.map((row) => row.phase)).toEqual(["direct"]);
    expect(repository.status).toBe("partial");
  });

  it("stops before inference when initial quota is exhausted", async () => {
    const model = new MockModelAdapter([initial]);
    const repository = new TestRepository();
    const quota = new TestQuota({ allowed: true }, { allowed: false, reason: "visitor_daily_limit" });
    const result = await runExperiment(question, "c".repeat(64), { model, repository, quota });
    expect(result.status).toBe("quota_rejected");
    expect(model.inputs).toHaveLength(0);
    expect(repository.status).toBe("quota_rejected");
  });

  it("preserves the direct answer and withholds the key when stage B quota is exhausted", async () => {
    const model = new MockModelAdapter([initial]);
    const repository = new TestRepository();
    const quota = new TestQuota({ allowed: false, reason: "minute_request_budget" });
    const result = await runExperiment(question, "d".repeat(64), { model, repository, quota });
    expect(result.status).toBe("partial");
    expect(result).not.toHaveProperty("evaluation");
    expect(repository.status).toBe("partial");
  });

  it("retries a transient model failure once with a fresh reservation", async () => {
    const model = new MockModelAdapter([new ModelCallError("rate_limited", "429", true), initial, revised]);
    const repository = new TestRepository();
    const quota = new TestQuota();
    const result = await runExperiment(question, "e".repeat(64), { model, repository, quota, sleep: async () => undefined });
    expect(result.status).toBe("complete");
    expect(model.inputs).toHaveLength(3);
    expect(quota.experimentReservations).toBe(1);
    expect(quota.modelReservations).toBe(2);
  });

  it("records model failure without fabricating a result", async () => {
    const model = new MockModelAdapter([new ModelCallError("model_unavailable", "404", false)]);
    const repository = new TestRepository();
    const result = await runExperiment(question, "f".repeat(64), { model, repository, quota: new TestQuota() });
    expect(result).toMatchObject({ status: "failed", failure: { code: "model_unavailable" } });
    expect(repository.status).toBe("model_failure");
    expect(result).not.toHaveProperty("evaluation");
  });

  it("records a validation failure when model output is structurally invalid", async () => {
    const invalid = JSON.stringify({ answer: "A", confidence: 1.2, explanation: "Out of range." });
    const model = new MockModelAdapter([invalid]);
    const repository = new TestRepository();
    const result = await runExperiment(question, "9".repeat(64), { model, repository, quota: new TestQuota() });
    expect(result).toMatchObject({ status: "failed", failure: { code: "incomplete" } });
    expect(repository.status).toBe("validation_failure");
  });
});

describe("quota concurrency semantics", () => {
  it("allows only one concurrent request when one budget slot remains", async () => {
    class LockedQuota {
      remaining = 1;
      private tail = Promise.resolve();
      async reserve(): Promise<boolean> {
        let release!: () => void;
        const previous = this.tail;
        this.tail = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        const allowed = this.remaining > 0;
        if (allowed) this.remaining -= 1;
        release();
        return allowed;
      }
    }
    const quota = new LockedQuota();
    const reservations = await Promise.all(Array.from({ length: 12 }, () => quota.reserve()));
    expect(reservations.filter(Boolean)).toHaveLength(1);
  });
});
