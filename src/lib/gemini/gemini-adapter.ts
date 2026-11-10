import "server-only";
import { GoogleGenAI } from "@google/genai";
import { generationConfig } from "@/lib/experiments/protocol";
import { ModelAdapter, ModelCallError, ModelGenerationInput, ModelGenerationResult } from "@/lib/gemini/contracts";

function readTimeout(): number {
  const value = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS ?? 20_000);
  return Number.isInteger(value) && value >= 1_000 && value <= 60_000 ? value : 20_000;
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const status = record.status ?? record.statusCode;
    if (typeof status === "number") return status;
    if (typeof status === "string" && /^\d{3}$/.test(status)) return Number(status);
  }
  return undefined;
}

function classifyProviderError(error: unknown): ModelCallError {
  if (error instanceof ModelCallError) return error;
  const status = statusOf(error);
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : "Gemini request failed.";
  if (status === 429) return new ModelCallError("rate_limited", "Gemini rate limit reached.", true, { httpStatus: 429 });
  if (status === 404) return new ModelCallError("model_unavailable", "The configured Gemini model is unavailable to this project.", false, { httpStatus: 404 });
  if (status === 408 || name.toLowerCase().includes("timeout")) {
    return new ModelCallError("timeout", "Gemini did not respond before the request timed out.", true, { httpStatus: status });
  }
  if (status && status >= 500) return new ModelCallError("provider_error", "Gemini is temporarily unavailable.", true, { httpStatus: status });
  if (!status && /fetch|network|socket|econn|connection/i.test(`${name} ${message}`)) {
    return new ModelCallError("network", "The Gemini service could not be reached.", true);
  }
  return new ModelCallError("provider_error", "Gemini could not complete this request.", false, { httpStatus: status });
}

function safeGenerationConfig(input: ModelGenerationInput): Record<string, unknown> {
  const config = generationConfig(input.question);
  return {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    responseMimeType: config.responseMimeType,
    responseJsonSchema: config.responseJsonSchema,
    timeoutMs: readTimeout(),
    sdkRetryAttempts: 1,
  };
}

export class GeminiAdapter implements ModelAdapter {
  private readonly client: GoogleGenAI;
  private readonly modelId: string;

  constructor(apiKey = process.env.GEMINI_API_KEY, modelId = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite") {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    if (!modelId.trim()) throw new Error("GEMINI_MODEL is not configured.");
    this.client = new GoogleGenAI({ apiKey });
    this.modelId = modelId.trim();
  }

  async generate(input: ModelGenerationInput): Promise<ModelGenerationResult> {
    const config = generationConfig(input.question);
    const timeout = readTimeout();
    const started = Date.now();
    try {
      const response = await this.client.models.generateContent({
        model: this.modelId,
        contents: input.prompt,
        config: {
          ...config,
          httpOptions: { timeout, retryOptions: { attempts: 1, httpStatusCodes: [] } },
        },
      });
      const finishReason = response.candidates?.[0]?.finishReason;
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason || ["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(String(finishReason))) {
        throw new ModelCallError("refused", "Gemini declined to answer this question.", false, {
          finishReason: finishReason ? String(finishReason) : undefined,
          blockReason: blockReason ? String(blockReason) : undefined,
        });
      }
      const text = response.text ?? "";
      if (!text.trim()) {
        throw new ModelCallError("incomplete", "Gemini returned no answer text.", false, {
          finishReason: finishReason ? String(finishReason) : undefined,
        });
      }
      return {
        text,
        modelId: this.modelId,
        generationConfig: safeGenerationConfig(input),
        responseMetadata: {
          responseId: response.responseId,
          finishReason: finishReason ? String(finishReason) : undefined,
          promptFeedback: blockReason ? { blockReason: String(blockReason) } : undefined,
          usageMetadata: response.usageMetadata,
        },
        receivedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      if (error instanceof ModelCallError) throw error;
      throw classifyProviderError(error);
    }
  }
}

export function classifyGeminiError(error: unknown): ModelCallError {
  return classifyProviderError(error);
}
