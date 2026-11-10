import { buildDirectPrompt, buildReflectionPrompt, DIRECT_PROMPT_VERSION, generationConfig, PROTOCOL_VERSION, REFLECTION_PROMPT_VERSION } from "@/lib/experiments/protocol";
import { reflectionTransition, scoreAnswer, confidenceChange } from "@/lib/experiments/scoring";
import { ModelCallError, ModelAdapter, ModelGenerationResult, validateModelOutput } from "@/lib/gemini/contracts";
import type { ExperimentRepository, RunStatus } from "@/lib/experiments/repository";
import type { QuotaPort, QuotaReservation } from "@/lib/rate-limit/quota";
import { estimatedTokenCost } from "@/lib/experiments/token-estimate";
import { Question, toPublicQuestion } from "@/lib/experiments/types";

export interface ExperimentDependencies {
  model: ModelAdapter;
  quota: QuotaPort;
  repository: ExperimentRepository;
  sleep?: (milliseconds: number) => Promise<void>;
}

export type PublicExperimentResult =
  | { status: "complete"; runId: string; direct: { answer: string; confidence: number; explanation: string }; reflection: { answer: string; confidence: number; explanation: string }; evaluation: { correctAnswer: string; directCorrect: boolean; reflectionCorrect: boolean; transition: string; confidenceChange: number; directBrier: number; reflectionBrier: number } }
  | { status: "partial"; runId: string; direct: { answer: string; confidence: number; explanation: string }; failure: { code: string; message: string } }
  | { status: "quota_rejected"; runId: string; message: string }
  | { status: "failed"; runId: string; failure: { code: string; message: string } };

const MAX_ATTEMPTS_PER_PHASE = 2;
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function safeFailure(error: unknown): { code: string; message: string; retryable: boolean } {
  if (typeof error === "object" && error !== null && "quotaStorageUnavailable" in error) {
    return { code: "quota_storage_unavailable", message: "Quota protection is unavailable, so live inference is paused.", retryable: false };
  }
  if (error instanceof ModelCallError) {
    const messages: Record<ModelCallError["code"], string> = {
      rate_limited: "Gemini is rate limiting requests. Please try again later.",
      timeout: "Gemini took too long to respond. Please try again later.",
      network: "Gemini could not be reached. Please try again later.",
      provider_error: "Gemini could not complete the request.",
      model_unavailable: "The configured Gemini model is unavailable to this project.",
      refused: "Gemini declined to answer this question.",
      incomplete: "Gemini returned an incomplete or invalid answer.",
    };
    return { code: error.code, message: messages[error.code], retryable: error.retryable };
  }
  return { code: "provider_error", message: "The experiment could not be completed.", retryable: false };
}

async function makeGeneration(
  phase: "direct" | "reflection",
  prompt: string,
  question: ReturnType<typeof toPublicQuestion>,
  dependencies: ExperimentDependencies,
  reserveFirstCallAlreadyDone: boolean,
): Promise<{ generation: ModelGenerationResult; parsed: ReturnType<typeof validateModelOutput> }> {
  const wait = dependencies.sleep ?? pause;
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PHASE; attempt += 1) {
    if (attempt > 0 || !reserveFirstCallAlreadyDone) {
      let reservation: QuotaReservation;
      try {
        reservation = await dependencies.quota.reserveModelRequest(estimatedTokenCost(prompt));
      } catch {
        throw Object.assign(new Error("quota storage unavailable"), { quotaStorageUnavailable: true });
      }
      if (!reservation.allowed) throw Object.assign(new Error("quota rejected"), { quotaReason: reservation.reason });
    }
    try {
      const generation = await dependencies.model.generate({ phase, question, prompt });
      return { generation, parsed: validateModelOutput(generation.text, question) };
    } catch (error) {
      const failure = safeFailure(error);
      if (!failure.retryable || attempt + 1 >= MAX_ATTEMPTS_PER_PHASE) throw error;
      await wait(250);
    }
  }
  throw new Error("Unreachable generation state.");
}

function generationSummary(generation: ModelGenerationResult) {
  const config = generation.generationConfig;
  return {
    temperature: config.temperature ?? 0,
    maxOutputTokens: config.maxOutputTokens ?? 220,
    responseMimeType: config.responseMimeType ?? "application/json",
  };
}

export async function runExperiment(
  question: Question,
  visitorKeyHash: string,
  dependencies: ExperimentDependencies,
): Promise<PublicExperimentResult> {
  const publicQuestion = toPublicQuestion(question);
  const firstPrompt = buildDirectPrompt(publicQuestion);
  const directConfig = generationConfig(publicQuestion);
  const runId = await dependencies.repository.createRun({
    questionId: question.questionId,
    visitorKeyHash,
    modelId: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
    generationConfig: generationSummary({
      text: "",
      modelId: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      generationConfig: directConfig as unknown as Record<string, unknown>,
      responseMetadata: {},
      receivedAt: new Date().toISOString(),
      latencyMs: 0,
    }),
  });

  let firstReservation: QuotaReservation;
  try {
    firstReservation = await dependencies.quota.reserveExperiment(visitorKeyHash, estimatedTokenCost(firstPrompt));
  } catch {
    await dependencies.repository.finishRun(runId, "quota_rejected", "quota_storage_unavailable").catch(() => undefined);
    return { status: "failed", runId, failure: { code: "quota_storage_unavailable", message: "Quota protection is unavailable, so live inference is paused." } };
  }
  if (!firstReservation.allowed) {
    await dependencies.repository.finishRun(runId, "quota_rejected", firstReservation.reason);
    return { status: "quota_rejected", runId, message: "The live experiment quota is exhausted. Please try again after the quota window resets." };
  }

  let directGeneration: ModelGenerationResult;
  let directAnswer: ReturnType<typeof validateModelOutput>;
  try {
    const direct = await makeGeneration("direct", firstPrompt, publicQuestion, dependencies, true);
    directGeneration = direct.generation;
    directAnswer = direct.parsed;
    const directScore = scoreAnswer(directAnswer, question.correctAnswer);
    await dependencies.repository.saveResponse(runId, {
      phase: "direct",
      promptVersion: DIRECT_PROMPT_VERSION,
      promptText: firstPrompt,
      generation: directGeneration,
      parsed: directAnswer,
      isCorrect: directScore.isCorrect,
      brierScore: directScore.brierScore,
    });
  } catch (error) {
    const failure = safeFailure(error);
    const status: RunStatus = failure.code === "incomplete" ? "validation_failure" : "model_failure";
    await dependencies.repository.finishRun(runId, status, failure.code);
    return { status: "failed", runId, failure: { code: failure.code, message: failure.message } };
  }

  const reflectionPrompt = buildReflectionPrompt(publicQuestion, directAnswer);
  let reflectedGeneration: ModelGenerationResult;
  let reflectedAnswer: ReturnType<typeof validateModelOutput>;
  try {
    const reflected = await makeGeneration("reflection", reflectionPrompt, publicQuestion, dependencies, false);
    reflectedGeneration = reflected.generation;
    reflectedAnswer = reflected.parsed;
    const reflectedScore = scoreAnswer(reflectedAnswer, question.correctAnswer);
    await dependencies.repository.saveResponse(runId, {
      phase: "reflection",
      promptVersion: REFLECTION_PROMPT_VERSION,
      promptText: reflectionPrompt,
      generation: reflectedGeneration,
      parsed: reflectedAnswer,
      isCorrect: reflectedScore.isCorrect,
      brierScore: reflectedScore.brierScore,
    });
  } catch (error) {
    const quotaReason = typeof error === "object" && error !== null && "quotaReason" in error
      ? String((error as { quotaReason: unknown }).quotaReason)
      : undefined;
    const failure = safeFailure(error);
    if (quotaReason) {
      await dependencies.repository.finishRun(runId, "partial", quotaReason);
      return { status: "partial", runId, direct: directAnswer, failure: { code: "quota_exhausted", message: "The first answer is saved, but quota limits prevented the reflection stage." } };
    }
    await dependencies.repository.finishRun(runId, "partial", failure.code);
    return { status: "partial", runId, direct: directAnswer, failure: { code: failure.code, message: failure.message } };
  }

  const directScore = scoreAnswer(directAnswer, question.correctAnswer);
  const reflectionScore = scoreAnswer(reflectedAnswer, question.correctAnswer);
  await dependencies.repository.finishRun(runId, "complete");
  return {
    status: "complete",
    runId,
    direct: directAnswer,
    reflection: reflectedAnswer,
    evaluation: {
      correctAnswer: question.correctAnswer,
      directCorrect: directScore.isCorrect,
      reflectionCorrect: reflectionScore.isCorrect,
      transition: reflectionTransition(directScore.isCorrect, reflectionScore.isCorrect),
      confidenceChange: confidenceChange(directAnswer.confidence, reflectedAnswer.confidence),
      directBrier: directScore.brierScore,
      reflectionBrier: reflectionScore.brierScore,
    },
  };
}

export function experimentProtocolVersion(): string {
  return PROTOCOL_VERSION;
}
