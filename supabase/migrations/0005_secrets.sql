create table if not exists public.secrets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  name text not null,
  value_encrypted text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);



