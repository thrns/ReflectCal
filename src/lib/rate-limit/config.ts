export interface QuotaConfig {
  dailyRequestBudget: number;
  minuteRequestBudget: number;
  minuteTokenBudget: number;
  visitorDailyExperimentLimit: number;
}

export type LiveConfiguration =
  | { enabled: true; quota: QuotaConfig; modelId: string; requestTimeoutMs: number }
  | { enabled: false; missing: string[]; invalid: string[] };

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function readLiveConfiguration(env: Record<string, string | undefined> = process.env): LiveConfiguration {
  const requiredValues: Array<[keyof QuotaConfig, string | undefined, string]> = [
    ["dailyRequestBudget", env.GEMINI_DAILY_REQUEST_BUDGET, "GEMINI_DAILY_REQUEST_BUDGET"],
    ["minuteRequestBudget", env.GEMINI_MINUTE_REQUEST_BUDGET, "GEMINI_MINUTE_REQUEST_BUDGET"],
    ["minuteTokenBudget", env.GEMINI_MINUTE_TOKEN_BUDGET, "GEMINI_MINUTE_TOKEN_BUDGET"],
    ["visitorDailyExperimentLimit", env.PUBLIC_VISITOR_DAILY_EXPERIMENT_LIMIT, "PUBLIC_VISITOR_DAILY_EXPERIMENT_LIMIT"],
  ];
  const missing: string[] = [];
  const invalid: string[] = [];
  const quota = {} as QuotaConfig;
  for (const [key, value, variable] of requiredValues) {
    const parsed = positiveInteger(value);
    if (value === undefined || value.trim() === "") missing.push(variable);
    else if (parsed === undefined) invalid.push(variable);
    else quota[key] = parsed;
  }
  if (!env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  const modelId = env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const parsedTimeout = positiveInteger(env.GEMINI_REQUEST_TIMEOUT_MS ?? "20000");
  const requestTimeoutMs = parsedTimeout !== undefined && parsedTimeout >= 1_000 && parsedTimeout <= 60_000 ? parsedTimeout : 20_000;
  if (missing.length > 0 || invalid.length > 0) return { enabled: false, missing: [...new Set(missing)], invalid };
  return { enabled: true, quota, modelId, requestTimeoutMs };
}
