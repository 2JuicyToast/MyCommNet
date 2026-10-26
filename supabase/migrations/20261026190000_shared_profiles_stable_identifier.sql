-- Update shared_profiles view to use stable identifier for profiles without explicit username
create or replace view public.shared_profiles
with (security_invoker = true) as
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

-- Ensure select access is available to anon and authenticated users under RLS
grant select on public.shared_profiles to anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- Allow public read of profile rows so security_invoker view can resolve public profile data
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Allow public reading of basic profiles'
  ) then
    create policy "Allow public reading of basic profiles"
      on public.profiles for select
      using (true);
  end if;
end
$$;

