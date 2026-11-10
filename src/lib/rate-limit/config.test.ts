import { describe, expect, it } from "vitest";
import { readLiveConfiguration } from "@/lib/rate-limit/config";

const validEnv = {
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "gemini-3.1-flash-lite",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "test-secret",
  GEMINI_DAILY_REQUEST_BUDGET: "200",
  GEMINI_MINUTE_REQUEST_BUDGET: "5",
  GEMINI_MINUTE_TOKEN_BUDGET: "8000",
  PUBLIC_VISITOR_DAILY_EXPERIMENT_LIMIT: "2",
};

describe("live configuration", () => {
  it("enables the live service only with every required key and positive quota", () => {
    const config = readLiveConfiguration(validEnv);
    expect(config.enabled).toBe(true);
    if (config.enabled) expect(config.modelId).toBe("gemini-3.1-flash-lite");
  });

  it("disables live inference when a quota variable is missing or invalid", () => {
    expect(readLiveConfiguration({ ...validEnv, GEMINI_DAILY_REQUEST_BUDGET: "" }).enabled).toBe(false);
    expect(readLiveConfiguration({ ...validEnv, GEMINI_MINUTE_TOKEN_BUDGET: "-1" })).toMatchObject({ enabled: false, invalid: ["GEMINI_MINUTE_TOKEN_BUDGET"] });
    expect(readLiveConfiguration({ ...validEnv, PUBLIC_VISITOR_DAILY_EXPERIMENT_LIMIT: "0" }).enabled).toBe(false);
  });

  it("disables live inference when provider or privileged database credentials are missing", () => {
    expect(readLiveConfiguration({ ...validEnv, GEMINI_API_KEY: "" }).enabled).toBe(false);
    expect(readLiveConfiguration({ ...validEnv, SUPABASE_SERVICE_ROLE_KEY: "" }).enabled).toBe(false);
  });
});
