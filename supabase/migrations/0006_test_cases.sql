create table if not exists public.test_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  title text not null,
  prompt text not null,
  dsl_json jsonb not null,
  notes text,
  created_at timestamptz not null default now()
);



