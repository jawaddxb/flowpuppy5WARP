-- OAuth helper table to track anti-CSRF state per flow
create table if not exists oauth_states (
  state text primary key,
  provider_id text not null references providers(id) on delete cascade,
  org_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_oauth_states_provider on oauth_states(provider_id);
create index if not exists idx_oauth_states_expires on oauth_states(expires_at);

