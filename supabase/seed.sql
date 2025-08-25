-- Minimal seed placeholders for Phase 1
-- profiles depends on auth schema; for now seed orgs and memberships
insert into public.orgs (name) values ('Demo Org') on conflict do nothing;

