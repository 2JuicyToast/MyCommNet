-- Update shared_profiles view to use stable identifier for profiles without explicit username
create or replace view public.shared_profiles as
select
  id,
  coalesce(nullif(trim(username), ''), 'user' || substr(replace(id::text, '-', ''), 1, 8)) as username,
  full_name,
  bio,
  avatar_url,
  case when coalesce((pass_visibility->>'headline')::boolean, true) then headline end as headline,
  case when coalesce((pass_visibility->>'intro')::boolean, true) then pass_intro end as pass_intro,
  case when coalesce((pass_visibility->>'skills')::boolean, true) then selected_skills end as skills
from public.profiles;

grant select on public.shared_profiles to anon, authenticated;
