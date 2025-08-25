create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  org_id uuid references public.orgs(id),
  status text not null default 'running',
  input_json jsonb,
  result_json jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int
);

create table if not exists public.run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.workflow_runs(id) on delete cascade,
  node_id text not null,
  name text,
  status text not null,
  input_json jsonb,
  output_json jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int
);



