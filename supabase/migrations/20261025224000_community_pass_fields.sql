alter table public.profiles
  add column if not exists headline text,
  add column if not exists pass_intro text,
  add column if not exists selected_skills text[] not null default '{}',
  add column if not exists pass_visibility jsonb not null default '{"headline": true, "intro": true, "skills": true, "stats": false}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_headline_length_check,
  drop constraint if exists profiles_pass_intro_length_check;

alter table public.profiles
  add constraint profiles_headline_length_check check (headline is null or char_length(headline) <= 120),
  add constraint profiles_pass_intro_length_check check (pass_intro is null or char_length(pass_intro) <= 500);

drop view if exists public.shared_profiles;

create view public.shared_profiles as
select
  username,
  full_name,
  bio,
  avatar_url,
  case when coalesce((pass_visibility->>'headline')::boolean, true) then headline end as headline,
  case when coalesce((pass_visibility->>'intro')::boolean, true) then pass_intro end as pass_intro,
  case when coalesce((pass_visibility->>'skills')::boolean, true) then selected_skills end as skills
from public.profiles
where username is not null;

grant select on public.shared_profiles to anon, authenticated;

create or replace function public.prevent_profile_stat_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
    and (new.verified_hours is distinct from old.verified_hours
      or new.events_attended is distinct from old.events_attended) then
    raise exception 'Profile activity statistics are managed by verified activity records';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_activity_statistics on public.profiles;
create trigger protect_profile_activity_statistics
  before update on public.profiles
  for each row execute function public.prevent_profile_stat_edits();
