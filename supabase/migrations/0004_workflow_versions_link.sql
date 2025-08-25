-- Add a simple view to join latest version per workflow (prep for UI)
create or replace view public.workflow_latest as
select w.id as workflow_id,
       w.name,
       v.id as version_id,
       v.version,
       v.created_at
from public.workflows w
left join lateral (
  select * from public.workflow_versions vv where vv.workflow_id = w.id order by vv.version desc limit 1
) v on true;



