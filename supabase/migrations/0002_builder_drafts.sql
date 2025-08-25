create table if not exists public.builder_drafts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  graph_json jsonb not null,
  created_at timestamptz not null default now()
);

