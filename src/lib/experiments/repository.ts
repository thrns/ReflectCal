import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { PROTOCOL_VERSION } from "@/lib/experiments/protocol";
import { ModelAnswer } from "@/lib/experiments/types";
import { ExperimentPhase, ModelGenerationResult } from "@/lib/gemini/contracts";
import { getServiceSupabase } from "@/lib/supabase/server";

export type RunStatus = "running" | "complete" | "partial" | "model_failure" | "validation_failure" | "quota_rejected";

export interface StartRunInput {
  questionId: string;
  visitorKeyHash: string;
  modelId: string;
  generationConfig: Record<string, unknown>;
}

export interface SaveResponseInput {
  phase: ExperimentPhase;
  promptVersion: string;
  promptText: string;
  generation: ModelGenerationResult;
  parsed: ModelAnswer;
  isCorrect: boolean;
  brierScore: number;
}

export interface ExperimentRepository {
  createRun(input: StartRunInput): Promise<string>;
  saveResponse(runId: string, input: SaveResponseInput): Promise<void>;
  finishRun(runId: string, status: RunStatus, failureClassification?: string): Promise<void>;
}

export class SupabaseExperimentRepository implements ExperimentRepository {
  constructor(private readonly client: SupabaseClient = getServiceSupabase()) {}

  async createRun(input: StartRunInput): Promise<string> {
    const { data, error } = await this.client.from("model_runs").insert({
      question_id: input.questionId,
      protocol_version: PROTOCOL_VERSION,
      status: "running",
      visitor_key_hash: input.visitorKeyHash,
      model_id: input.modelId,
      generation_config: input.generationConfig,
      request_metadata: { generation_config_location: "model_responses" },
    }).select("run_id").single();
    if (error || !data?.run_id) throw new Error("Experiment record could not be created.");
    return data.run_id as string;
  }

  async saveResponse(runId: string, input: SaveResponseInput): Promise<void> {
    const { error } = await this.client.from("model_responses").insert({
      run_id: runId,
      phase: input.phase,
      prompt_version: input.promptVersion,
      prompt_text: input.promptText,
      model_id: input.generation.modelId,
      generation_config: input.generation.generationConfig,
      raw_response: input.generation.text,
      parsed_output: input.parsed,
      is_correct: input.isCorrect,
      brier_score: input.brierScore,
      request_metadata: input.generation.responseMetadata,
      latency_ms: input.generation.latencyMs,
      received_at: input.generation.receivedAt,
    });
    if (error) throw new Error("Experiment response could not be saved.");
  }

  async finishRun(runId: string, status: RunStatus, failureClassification?: string): Promise<void> {
    const { error } = await this.client.from("model_runs").update({
      status,
      failure_classification: failureClassification ?? null,
      completed_at: new Date().toISOString(),
    }).eq("run_id", runId);
    if (error) throw new Error("Experiment status could not be saved.");
  }
}
