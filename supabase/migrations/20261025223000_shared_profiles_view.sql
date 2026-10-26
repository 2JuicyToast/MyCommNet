create or replace view public.shared_profiles as
select
  username,
  full_name,
  bio,
  avatar_url
from public.profiles
where username is not null;

grant select on public.shared_profiles to anon, authenticated;
