import "server-only";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { LiveConfiguration, QuotaConfig } from "@/lib/rate-limit/config";
export { estimatedTokenCost } from "@/lib/experiments/token-estimate";

export type QuotaReason = "visitor_daily_limit" | "daily_request_budget" | "minute_request_budget" | "minute_token_budget" | "invalid_configuration";
export type QuotaReservation = { allowed: true } | { allowed: false; reason: QuotaReason };

export interface QuotaPort {
  reserveExperiment(visitorKeyHash: string, estimatedTokens: number): Promise<QuotaReservation>;
  reserveModelRequest(estimatedTokens: number): Promise<QuotaReservation>;
}

export class QuotaStorageError extends Error {
  constructor() {
    super("Quota storage is unavailable.");
    this.name = "QuotaStorageError";
  }
}

function parseReservation(value: unknown): QuotaReservation {
  if (typeof value !== "object" || value === null || !("allowed" in value)) throw new QuotaStorageError();
  const response = value as { allowed: unknown; reason?: unknown };
  if (response.allowed === true) return { allowed: true };
  if (response.allowed !== false || typeof response.reason !== "string") throw new QuotaStorageError();
  const validReasons: QuotaReason[] = ["visitor_daily_limit", "daily_request_budget", "minute_request_budget", "minute_token_budget", "invalid_configuration"];
  if (!validReasons.includes(response.reason as QuotaReason)) throw new QuotaStorageError();
  return { allowed: false, reason: response.reason as QuotaReason };
}

export class SupabaseQuotaManager implements QuotaPort {
  constructor(private readonly config: QuotaConfig, private readonly client = getServiceSupabase()) {}

  async reserveExperiment(visitorKeyHash: string, estimatedTokens: number): Promise<QuotaReservation> {
    const { data, error } = await this.client.rpc("reserve_experiment_quota", {
      p_visitor_key_hash: visitorKeyHash,
      p_visitor_daily_limit: this.config.visitorDailyExperimentLimit,
      p_daily_request_budget: this.config.dailyRequestBudget,
      p_minute_request_budget: this.config.minuteRequestBudget,
      p_minute_token_budget: this.config.minuteTokenBudget,
      p_estimated_tokens: estimatedTokens,
    });
    if (error) throw new QuotaStorageError();
    return parseReservation(data);
  }

  async reserveModelRequest(estimatedTokens: number): Promise<QuotaReservation> {
    const { data, error } = await this.client.rpc("reserve_model_request_quota", {
      p_daily_request_budget: this.config.dailyRequestBudget,
      p_minute_request_budget: this.config.minuteRequestBudget,
      p_minute_token_budget: this.config.minuteTokenBudget,
      p_estimated_tokens: estimatedTokens,
    });
    if (error) throw new QuotaStorageError();
    return parseReservation(data);
  }
}

export function liveConfigurationError(config: LiveConfiguration): string | null {
  if (config.enabled) return null;
  if (config.missing.includes("GEMINI_API_KEY") || config.missing.includes("SUPABASE_URL") || config.missing.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return "Live experiments are not configured on this server.";
  }
  return "Live inference is disabled because the quota budget is missing or invalid.";
}
