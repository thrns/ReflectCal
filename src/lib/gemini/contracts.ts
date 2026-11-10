import { ModelAnswer, PublicQuestion } from "@/lib/experiments/types";

export type ExperimentPhase = "direct" | "reflection";

export interface ModelGenerationInput {
  phase: ExperimentPhase;
  question: PublicQuestion;
  prompt: string;
}

export interface ModelGenerationResult {
  text: string;
  modelId: string;
  generationConfig: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
  receivedAt: string;
  latencyMs: number;
}

export interface ModelAdapter {
  generate(input: ModelGenerationInput): Promise<ModelGenerationResult>;
}

export class ModelCallError extends Error {
  constructor(
    readonly code: "rate_limited" | "timeout" | "network" | "provider_error" | "model_unavailable" | "refused" | "incomplete",
    message: string,
    readonly retryable: boolean,
    readonly metadata: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ModelCallError";
  }
}

export function validateModelOutput(text: string, question: PublicQuestion): ModelAnswer {
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    throw new ModelCallError("incomplete", "The model response was not valid JSON.", false);
  }
  const parsed = ModelAnswerSchemaForValidation.safeParse(decoded);
  if (!parsed.success) {
    throw new ModelCallError("incomplete", "The model response did not match the required answer format.", false, {
      validationIssueCount: parsed.error.issues.length,
    });
  }
  if (!question.choices.some((choice) => choice.label === parsed.data.answer)) {
    throw new ModelCallError("incomplete", "The model selected an answer choice that is not listed.", false);
  }
  return parsed.data;
}

import { ModelAnswerSchema as ModelAnswerSchemaForValidation } from "@/lib/experiments/types";
