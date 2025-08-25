-- Providers registry tables
create table if not exists providers (
  id text primary key,
  name text not null,
  category text not null,
  auth_type text not null check (auth_type in ('none','apiKey','oauth','mcp')),
  required_secrets text[] default '{}',
  config_schema jsonb default '{}'::jsonb,
  capabilities text[] default '{}',
  icon_url text,
  status_check_kind text default 'env',
  oauth_config jsonb,
  mcp_config jsonb,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists org_provider_settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  provider_id text not null references providers(id) on delete cascade,
  secrets jsonb default '{}'::jsonb,
  mock_mode boolean default true,
  default_models jsonb,
  preferred_regions text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_org_provider on org_provider_settings(org_id, provider_id);


