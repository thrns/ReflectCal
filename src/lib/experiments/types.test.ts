import { describe, expect, it } from "vitest";
import { generateFixtureDataset } from "@/lib/experiments/dataset/generator";
import { Question, QuestionSchema, toPublicQuestion, validateDataset } from "@/lib/experiments/types";

function sampleQuestion(overrides: Partial<Question> = {}): Question {
  return {
    questionId: "sample-v1-001",
    sourceDataset: "fixture-test",
    sourceVersion: "1.0.0",
    category: "arithmetic",
    subject: "Arithmetic",
    question: "What is 20 + 22?",
    choices: [{ label: "A", text: "40" }, { label: "B", text: "42" }, { label: "C", text: "44" }, { label: "D", text: "46" }],
    correctAnswer: "B",
    split: "playground",
    validationStatus: "validated",
    ...overrides,
  };
}

describe("question dataset validation", () => {
  it("generates the same fixed-seed fixture set every time", () => {
    expect(generateFixtureDataset()).toEqual(generateFixtureDataset());
    expect(generateFixtureDataset()).toHaveLength(16);
  });

  it("computes the arithmetic and probability keys locally", () => {
    const questions = generateFixtureDataset();
    const sum = questions.find((question) => question.questionId === "arith-v1-001")!;
    const evenDie = questions.find((question) => question.questionId === "prob-v1-001")!;
    expect(sum.choices.find((choice) => choice.label === sum.correctAnswer)?.text).toBe("45");
    expect(evenDie.choices.find((choice) => choice.label === evenDie.correctAnswer)?.text).toBe("50%");
  });

  it("keeps the research and playground split IDs disjoint", () => {
    const questions = generateFixtureDataset();
    const errors = validateDataset(questions);
    const researchIds = new Set(questions.filter((question) => question.split === "research").map((question) => question.questionId));
    const playgroundIds = new Set(questions.filter((question) => question.split === "playground").map((question) => question.questionId));
    expect(errors).toEqual([]);
    expect([...researchIds].some((id) => playgroundIds.has(id))).toBe(false);
  });

  it("rejects duplicate IDs", () => {
    expect(validateDataset([sampleQuestion(), sampleQuestion()]).join(" ")).toContain("Duplicate question ID");
  });

  it("rejects malformed choices and duplicate choice labels", () => {
    const invalid = sampleQuestion({ choices: [{ label: "A", text: "40" }, { label: "A", text: "42" }] });
    expect(QuestionSchema.safeParse(invalid).success).toBe(false);
    expect(validateDataset([invalid])).not.toEqual([]);
  });

  it("rejects a correct answer that is not a listed choice", () => {
    expect(QuestionSchema.safeParse(sampleQuestion({ correctAnswer: "D", choices: [{ label: "A", text: "40" }, { label: "B", text: "42" }] })).success).toBe(false);
  });

  it("allows a ten-choice question for future benchmark adapters", () => {
    const choices = Array.from({ length: 10 }, (_, index) => ({ label: String.fromCharCode(65 + index), text: `Option ${index + 1}` }));
    expect(QuestionSchema.safeParse(sampleQuestion({ choices, correctAnswer: "J" })).success).toBe(true);
  });

  it("reports IDs placed in both dataset splits", () => {
    const overlap = sampleQuestion({ split: "research" });
    const errors = validateDataset([sampleQuestion(), overlap]);
    expect(errors.join(" ")).toContain("overlaps the playground and research splits");
  });

  it("strips the answer key and split metadata from public questions", () => {
    const safe = toPublicQuestion(sampleQuestion());
    expect(safe).not.toHaveProperty("correctAnswer");
    expect(safe).not.toHaveProperty("split");
    expect(safe).not.toHaveProperty("validationStatus");
  });
});
