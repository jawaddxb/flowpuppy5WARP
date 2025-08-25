create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid,
  provider text,
  model text,
  purpose text,
  tokens_in int,
  tokens_out int,
  latency_ms int,
  cost_usd numeric,
  status text
);



