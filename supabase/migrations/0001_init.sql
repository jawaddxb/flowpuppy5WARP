-- Tenancy
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'free',
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner','admin','member');

create table if not exists public.org_memberships (
  org_id uuid references public.orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Workflows
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  version int not null,
  graph_json jsonb not null,
  dsl text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workflow_id, version)
);

-- Conversations
create type convo_purpose as enum ('create_workflow','improve','debug','explain');

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  user_id uuid not null references auth.users(id),
  purpose convo_purpose not null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null,
  content jsonb not null,
  provider_id uuid,
  tokens_in int default 0,
  tokens_out int default 0,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- Mini‑apps
create type visibility as enum ('private','unlisted','public');

create table if not exists public.mini_apps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  visibility visibility not null default 'private',
  theme jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- AI routing
create type ai_type as enum ('claude','openai','deepseek','qwen','gemini','mistral','custom');

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  type ai_type not null,
  model text not null,
  base_url text,
  api_key_encrypted text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_routes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id),
  purpose text not null,
  priority_json jsonb not null
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  provider_id uuid references public.ai_providers(id),
  model text not null,
  tokens_in int default 0,
  tokens_out int default 0,
  latency_ms int,
  cost_usd numeric(12,6),
  status text not null,
  created_at timestamptz not null default now()
);

-- RLS templates (enable per table; example for workflows)
alter table public.workflows enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'workflows' and policyname = 'tenant_select_workflows'
  ) then
    create policy tenant_select_workflows on public.workflows
    for select using (
      org_id = (current_setting('request.jwt.claims', true)::jsonb->>'org_id')::uuid
    );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'workflows' and policyname = 'tenant_all_workflows'
  ) then
    create policy tenant_all_workflows on public.workflows
    for all using (
      org_id = (current_setting('request.jwt.claims', true)::jsonb->>'org_id')::uuid
    ) with check (
      org_id = (current_setting('request.jwt.claims', true)::jsonb->>'org_id')::uuid
    );
  end if;
end $$;

