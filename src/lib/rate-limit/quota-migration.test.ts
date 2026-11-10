import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202611100001_initial_schema.sql", "utf8");

describe("database quota and access-control migration", () => {
  it("enables RLS and revokes public table access on every privileged table", () => {
    for (const table of ["questions", "experiment_protocols", "model_runs", "model_responses", "api_usage_buckets"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).toContain("from anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("uses atomic global advisory locking and Pacific-time daily boundaries", () => {
    expect(migration).toContain("pg_advisory_xact_lock(1611512881)");
    expect(migration).toContain("America/Los_Angeles");
    expect(migration).toContain("global_minute_requests");
    expect(migration).toContain("global_minute_tokens");
  });

  it("restricts quota RPC execution to the service role", () => {
    expect(migration).toContain("revoke all on function public.reserve_experiment_quota");
    expect(migration).toContain("grant execute on function public.reserve_experiment_quota");
    expect(migration).toContain("grant execute on function public.reserve_model_request_quota");
  });
});
