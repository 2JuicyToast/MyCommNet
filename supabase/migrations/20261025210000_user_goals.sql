create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_key text not null,
  title text not null,
  description text not null,
  action_label text not null,
  action_route text not null,
  status text not null default 'active'
    check (status in ('active', 'completed')),
  step text not null default 'discover'
    check (step in ('discover', 'confirm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, goal_key)
);

alter table public.user_goals enable row level security;

create policy if not exists "Users can view their own goals"
  on public.user_goals for select using (auth.uid() = user_id);

create policy if not exists "Users can insert their own goals"
  on public.user_goals for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update their own goals"
  on public.user_goals for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete their own goals"
  on public.user_goals for delete using (auth.uid() = user_id);

create index if not exists user_goals_user_status_idx
  on public.user_goals (user_id, status, created_at desc);
