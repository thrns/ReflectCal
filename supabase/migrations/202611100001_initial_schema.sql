create extension if not exists pgcrypto with schema extensions;

create table if not exists public.questions (
  question_id text primary key,
  source_dataset text not null,
  source_version text not null,
  category text not null,
  subject text not null,
  question text not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'array'),
  correct_answer char(1) not null check (correct_answer in ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J')),
  split text not null check (split in ('research', 'playground')),
  validation_status text not null check (validation_status in ('validated', 'unreviewed', 'rejected')),
  created_at timestamptz not null default now(),
  unique (source_dataset, source_version, question_id)
);
create index if not exists questions_public_playground_idx
  on public.questions (category, question_id) where split = 'playground' and validation_status = 'validated';
create index if not exists questions_research_idx
  on public.questions (source_dataset, source_version, question_id) where split = 'research' and validation_status = 'validated';

create table if not exists public.experiment_protocols (
  protocol_version text primary key,
  direct_prompt_version text not null,
  reflection_prompt_version text not null,
  protocol_definition jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.model_runs (
  run_id uuid primary key default gen_random_uuid(),
  question_id text not null references public.questions(question_id),
  protocol_version text not null references public.experiment_protocols(protocol_version),
  status text not null check (status in ('running', 'complete', 'partial', 'model_failure', 'validation_failure', 'quota_rejected')),
  failure_classification text,
  visitor_key_hash char(64) not null check (visitor_key_hash ~ '^[0-9a-f]{64}$'),
  model_id text not null,
  generation_config jsonb not null,
  request_metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists model_runs_question_created_idx on public.model_runs (question_id, created_at desc);
create index if not exists model_runs_status_created_idx on public.model_runs (status, created_at desc);

create table if not exists public.model_responses (
  response_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.model_runs(run_id) on delete cascade,
  phase text not null check (phase in ('direct', 'reflection')),
  prompt_version text not null,
  prompt_text text not null,
  model_id text not null,
  generation_config jsonb not null,
  raw_response text not null,
  parsed_output jsonb not null,
  is_correct boolean not null,
  brier_score numeric(7, 6) not null check (brier_score >= 0 and brier_score <= 1),
  request_metadata jsonb not null default '{}'::jsonb,
  latency_ms integer not null check (latency_ms >= 0),
  received_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (run_id, phase)
);
create index if not exists model_responses_run_phase_idx on public.model_responses (run_id, phase);

create table if not exists public.api_usage_buckets (
  bucket_id uuid primary key default gen_random_uuid(),
  bucket_scope text not null check (bucket_scope in (
    'visitor_daily_experiments', 'global_daily_requests', 'global_minute_requests', 'global_minute_tokens'
  )),
  window_key text not null,
  visitor_key_hash char(64),
  requests_reserved integer not null default 0 check (requests_reserved >= 0),
  tokens_reserved integer not null default 0 check (tokens_reserved >= 0),
  experiments_reserved integer not null default 0 check (experiments_reserved >= 0),
  updated_at timestamptz not null default now(),
  check (
    (bucket_scope = 'visitor_daily_experiments' and visitor_key_hash is not null)
    or (bucket_scope <> 'visitor_daily_experiments' and visitor_key_hash is null)
  ),
  check (visitor_key_hash is null or visitor_key_hash ~ '^[0-9a-f]{64}$')
);
create unique index if not exists usage_global_bucket_unique
  on public.api_usage_buckets (bucket_scope, window_key) where visitor_key_hash is null;
create unique index if not exists usage_visitor_bucket_unique
  on public.api_usage_buckets (bucket_scope, window_key, visitor_key_hash) where visitor_key_hash is not null;

alter table public.questions enable row level security;
alter table public.experiment_protocols enable row level security;
alter table public.model_runs enable row level security;
alter table public.model_responses enable row level security;
alter table public.api_usage_buckets enable row level security;

revoke all on public.questions, public.experiment_protocols, public.model_runs, public.model_responses, public.api_usage_buckets from anon, authenticated;
grant all on public.questions, public.experiment_protocols, public.model_runs, public.model_responses, public.api_usage_buckets to service_role;

insert into public.experiment_protocols (protocol_version, direct_prompt_version, reflection_prompt_version, protocol_definition)
values (
  'reflectcal-m0-paired-v1.0.0',
  'direct-answer-v1.0.0',
  'self-reflection-v1.0.0',
  '{"stages":["direct","reflection"],"temperature":0,"ground_truth_in_prompts":false,"confidence":"model-elicited self-report"}'::jsonb
)
on conflict (protocol_version) do nothing;

create or replace function public.reserve_experiment_quota(
  p_visitor_key_hash text,
  p_visitor_daily_limit integer,
  p_daily_request_budget integer,
  p_minute_request_budget integer,
  p_minute_token_budget integer,
  p_estimated_tokens integer
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_pacific_day text := to_char(timezone('America/Los_Angeles', now())::date, 'YYYY-MM-DD');
  v_utc_minute text := to_char(date_trunc('minute', timezone('UTC', now())), 'YYYY-MM-DD"T"HH24:MI');
  v_visitor_count integer;
  v_daily_requests integer;
  v_minute_requests integer;
  v_minute_tokens integer;
begin
  if p_visitor_key_hash !~ '^[0-9a-f]{64}$'
    or p_visitor_daily_limit <= 0 or p_daily_request_budget <= 0
    or p_minute_request_budget <= 0 or p_minute_token_budget <= 0
    or p_estimated_tokens <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_configuration');
  end if;
  perform pg_advisory_xact_lock(1611512881);
  delete from public.api_usage_buckets
    where (bucket_scope = 'visitor_daily_experiments' and window_key < to_char((timezone('America/Los_Angeles', now())::date - 7), 'YYYY-MM-DD'))
       or (bucket_scope in ('global_daily_requests') and window_key < to_char((timezone('America/Los_Angeles', now())::date - 7), 'YYYY-MM-DD'))
       or (bucket_scope in ('global_minute_requests', 'global_minute_tokens') and window_key < to_char(date_trunc('minute', timezone('UTC', now()) - interval '2 days'), 'YYYY-MM-DD"T"HH24:MI'));

  select experiments_reserved into v_visitor_count from public.api_usage_buckets
    where bucket_scope = 'visitor_daily_experiments' and window_key = v_pacific_day and visitor_key_hash = p_visitor_key_hash;
  select requests_reserved into v_daily_requests from public.api_usage_buckets
    where bucket_scope = 'global_daily_requests' and window_key = v_pacific_day and visitor_key_hash is null;
  select requests_reserved into v_minute_requests from public.api_usage_buckets
    where bucket_scope = 'global_minute_requests' and window_key = v_utc_minute and visitor_key_hash is null;
  select tokens_reserved into v_minute_tokens from public.api_usage_buckets
    where bucket_scope = 'global_minute_tokens' and window_key = v_utc_minute and visitor_key_hash is null;

  if coalesce(v_visitor_count, 0) >= p_visitor_daily_limit then return jsonb_build_object('allowed', false, 'reason', 'visitor_daily_limit'); end if;
  if coalesce(v_daily_requests, 0) + 1 > p_daily_request_budget then return jsonb_build_object('allowed', false, 'reason', 'daily_request_budget'); end if;
  if coalesce(v_minute_requests, 0) + 1 > p_minute_request_budget then return jsonb_build_object('allowed', false, 'reason', 'minute_request_budget'); end if;
  if coalesce(v_minute_tokens, 0) + p_estimated_tokens > p_minute_token_budget then return jsonb_build_object('allowed', false, 'reason', 'minute_token_budget'); end if;

  insert into public.api_usage_buckets (bucket_scope, window_key, visitor_key_hash, experiments_reserved)
    values ('visitor_daily_experiments', v_pacific_day, p_visitor_key_hash, 1)
    on conflict (bucket_scope, window_key, visitor_key_hash) where visitor_key_hash is not null
    do update set experiments_reserved = api_usage_buckets.experiments_reserved + 1, updated_at = now();
  insert into public.api_usage_buckets (bucket_scope, window_key, requests_reserved)
    values ('global_daily_requests', v_pacific_day, 1)
    on conflict (bucket_scope, window_key) where visitor_key_hash is null
    do update set requests_reserved = api_usage_buckets.requests_reserved + 1, updated_at = now();
  insert into public.api_usage_buckets (bucket_scope, window_key, requests_reserved)
    values ('global_minute_requests', v_utc_minute, 1)
    on conflict (bucket_scope, window_key) where visitor_key_hash is null
    do update set requests_reserved = api_usage_buckets.requests_reserved + 1, updated_at = now();
  insert into public.api_usage_buckets (bucket_scope, window_key, tokens_reserved)
    values ('global_minute_tokens', v_utc_minute, p_estimated_tokens)
    on conflict (bucket_scope, window_key) where visitor_key_hash is null
    do update set tokens_reserved = api_usage_buckets.tokens_reserved + p_estimated_tokens, updated_at = now();
  return jsonb_build_object('allowed', true, 'reason', 'reserved');
end;
$$;

create or replace function public.reserve_model_request_quota(
  p_daily_request_budget integer,
  p_minute_request_budget integer,
  p_minute_token_budget integer,
  p_estimated_tokens integer
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_pacific_day text := to_char(timezone('America/Los_Angeles', now())::date, 'YYYY-MM-DD');
  v_utc_minute text := to_char(date_trunc('minute', timezone('UTC', now())), 'YYYY-MM-DD"T"HH24:MI');
  v_daily_requests integer;
  v_minute_requests integer;
  v_minute_tokens integer;
begin
  if p_daily_request_budget <= 0 or p_minute_request_budget <= 0 or p_minute_token_budget <= 0 or p_estimated_tokens <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_configuration');
  end if;
  perform pg_advisory_xact_lock(1611512881);
  delete from public.api_usage_buckets
    where (bucket_scope in ('global_daily_requests') and window_key < to_char((timezone('America/Los_Angeles', now())::date - 7), 'YYYY-MM-DD'))
       or (bucket_scope in ('global_minute_requests', 'global_minute_tokens') and window_key < to_char(date_trunc('minute', timezone('UTC', now()) - interval '2 days'), 'YYYY-MM-DD"T"HH24:MI'));
  select requests_reserved into v_daily_requests from public.api_usage_buckets where bucket_scope = 'global_daily_requests' and window_key = v_pacific_day and visitor_key_hash is null;
  select requests_reserved into v_minute_requests from public.api_usage_buckets where bucket_scope = 'global_minute_requests' and window_key = v_utc_minute and visitor_key_hash is null;
  select tokens_reserved into v_minute_tokens from public.api_usage_buckets where bucket_scope = 'global_minute_tokens' and window_key = v_utc_minute and visitor_key_hash is null;

  if coalesce(v_daily_requests, 0) + 1 > p_daily_request_budget then return jsonb_build_object('allowed', false, 'reason', 'daily_request_budget'); end if;
  if coalesce(v_minute_requests, 0) + 1 > p_minute_request_budget then return jsonb_build_object('allowed', false, 'reason', 'minute_request_budget'); end if;
  if coalesce(v_minute_tokens, 0) + p_estimated_tokens > p_minute_token_budget then return jsonb_build_object('allowed', false, 'reason', 'minute_token_budget'); end if;

  insert into public.api_usage_buckets (bucket_scope, window_key, requests_reserved) values ('global_daily_requests', v_pacific_day, 1)
    on conflict (bucket_scope, window_key) where visitor_key_hash is null do update set requests_reserved = api_usage_buckets.requests_reserved + 1, updated_at = now();
  insert into public.api_usage_buckets (bucket_scope, window_key, requests_reserved) values ('global_minute_requests', v_utc_minute, 1)
    on conflict (bucket_scope, window_key) where visitor_key_hash is null do update set requests_reserved = api_usage_buckets.requests_reserved + 1, updated_at = now();
  insert into public.api_usage_buckets (bucket_scope, window_key, tokens_reserved) values ('global_minute_tokens', v_utc_minute, p_estimated_tokens)
    on conflict (bucket_scope, window_key) where visitor_key_hash is null do update set tokens_reserved = api_usage_buckets.tokens_reserved + p_estimated_tokens, updated_at = now();
  return jsonb_build_object('allowed', true, 'reason', 'reserved');
end;
$$;

revoke all on function public.reserve_experiment_quota(text, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.reserve_model_request_quota(integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_experiment_quota(text, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.reserve_model_request_quota(integer, integer, integer, integer) to service_role;

comment on table public.questions is 'Privileged dataset storage. correct_answer must never be returned before a run is complete.';
comment on table public.api_usage_buckets is 'Atomic quota reservations; visitor keys are one-way hashes and raw IP addresses are never stored.';
comment on function public.reserve_experiment_quota is 'Atomically reserves visitor, daily request, and minute request/token budgets using Pacific daily windows.';
comment on function public.reserve_model_request_quota is 'Atomically reserves a request and conservative token estimate before each Gemini attempt.';
