-- ==============================================================================
-- MyCommNet Phase 3: Persistent Real-Time Messaging Schema
-- Migration: 20261026200000_real_messaging_system.sql
-- ==============================================================================

-- 1. Conversations Table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  user1_id uuid references auth.users(id) on delete set null,
  user2_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_convo_unique_pair unique (user1_id, user2_id),
  constraint direct_convo_ordered_users check (user1_id is null or user2_id is null or user1_id < user2_id)
);

alter table public.conversations enable row level security;

-- 2. Conversation Participants Table
create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint conversation_user_unique unique (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

-- 3. Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- 4. Message Attachments Table
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_size integer not null,
  file_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.message_attachments enable row level security;

-- 5. Indexes for fast retrieval
create index if not exists idx_convo_participants_user on public.conversation_participants (user_id);
create index if not exists idx_convo_participants_convo on public.conversation_participants (conversation_id);
create index if not exists idx_messages_convo_created on public.messages (conversation_id, created_at);
create index if not exists idx_messages_sender on public.messages (sender_id);
create index if not exists idx_attachments_msg on public.message_attachments (message_id);

-- ==============================================================================
-- Row Level Security Policies
-- ==============================================================================

-- Conversations Policies
drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations"
  on public.conversations for select
  using (
    auth.uid() = user1_id or auth.uid() = user2_id or
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert conversations they belong to" on public.conversations;
create policy "Users can insert conversations they belong to"
  on public.conversations for insert
  with check (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations for update
  using (
    auth.uid() = user1_id or auth.uid() = user2_id or
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

-- Conversation Participants Policies
drop policy if exists "Participants can view conversation participants" on public.conversation_participants;
create policy "Participants can view conversation participants"
  on public.conversation_participants for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert participants for conversations they belong to" on public.conversation_participants;
create policy "Users can insert participants for conversations they belong to"
  on public.conversation_participants for insert
  with check (
    user_id = auth.uid() or
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

drop policy if exists "Users can update their own participant state" on public.conversation_participants;
create policy "Users can update their own participant state"
  on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Messages Policies
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can insert messages as themselves" on public.messages;
create policy "Participants can insert messages as themselves"
  on public.messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can update message read receipts" on public.messages;
create policy "Participants can update message read receipts"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- Attachments Policies
drop policy if exists "Participants can view attachments" on public.message_attachments;
create policy "Participants can view attachments"
  on public.message_attachments for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can insert attachments" on public.message_attachments;
create policy "Participants can insert attachments"
  on public.message_attachments for insert
  with check (
    uploader_id = auth.uid() and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- Idempotent Direct Conversation Helper Function
-- ==============================================================================
create or replace function public.get_or_create_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p_current_user uuid := auth.uid();
  p_u1 uuid;
  p_u2 uuid;
  v_convo_id uuid;
begin
  if p_current_user is null then
    raise exception 'Not authenticated';
  end if;

  if target_user_id is null or target_user_id = p_current_user then
    raise exception 'Invalid target user';
  end if;

  if p_current_user < target_user_id then
    p_u1 := p_current_user;
    p_u2 := target_user_id;
  else
    p_u1 := target_user_id;
    p_u2 := p_current_user;
  end if;

  -- 1. Check if conversation already exists between the two ordered IDs
  select id into v_convo_id
  from public.conversations
  where user1_id = p_u1 and user2_id = p_u2 and type = 'direct'
  limit 1;

  -- 2. If not found, insert new conversation and both participant records
  if v_convo_id is null then
    insert into public.conversations (type, user1_id, user2_id)
    values ('direct', p_u1, p_u2)
    returning id into v_convo_id;

    insert into public.conversation_participants (conversation_id, user_id)
    values (v_convo_id, p_u1), (v_convo_id, p_u2)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return v_convo_id;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- ==============================================================================
-- Storage Bucket & Policies for Attachments
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- ==============================================================================
-- Realtime Subscriptions
-- ==============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
end
$$;
