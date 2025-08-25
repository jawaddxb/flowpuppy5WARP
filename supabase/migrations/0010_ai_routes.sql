create table if not exists ai_routes (
  id uuid primary key default gen_random_uuid(),
  org_id text,
  purpose text not null,
  priority_json jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ai_routes_org_purpose on ai_routes(org_id, purpose);


