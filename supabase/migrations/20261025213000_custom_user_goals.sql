alter table public.user_goals
  add column if not exists goal_type text not null default 'personal',
  add column if not exists completion_requirement text not null default '',
  add column if not exists target_date date,
  add column if not exists completion_context text not null default 'self';

alter table public.user_goals
  alter column action_route drop not null;

alter table public.user_goals
  add constraint user_goals_goal_type_check
    check (goal_type in ('personal', 'career', 'learning', 'community', 'wellbeing', 'other')),
  add constraint user_goals_completion_context_check
    check (completion_context in ('self', 'mycommnet'));
