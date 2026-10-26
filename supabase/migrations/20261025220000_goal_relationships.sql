update public.user_goals
set completion_context = 'mycommnet_supported'
where completion_context = 'mycommnet';

alter table public.user_goals
  drop constraint if exists user_goals_completion_context_check;

alter table public.user_goals
  add constraint user_goals_completion_context_check
    check (completion_context in ('self', 'mycommnet_supported', 'in_app'));
