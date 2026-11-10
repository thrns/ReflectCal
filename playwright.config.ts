import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", ...devices["Desktop Chrome"] },
  webServer: {
    command: "bun run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      GEMINI_API_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      GEMINI_DAILY_REQUEST_BUDGET: "",
      GEMINI_MINUTE_REQUEST_BUDGET: "",
      GEMINI_MINUTE_TOKEN_BUDGET: "",
      PUBLIC_VISITOR_DAILY_EXPERIMENT_LIMIT: "",
    },
  },
});
