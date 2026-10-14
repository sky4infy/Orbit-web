-- ============================================================
-- ORBIT — Web Push Notifications (push_subscription)
-- Run this in your Supabase SQL Editor
-- ============================================================

create table if not exists public.push_subscription (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.push_subscription enable row level security;

-- Policies for Authenticated Users
drop policy if exists "Users can view their own push subscriptions" on public.push_subscription;
create policy "Users can view their own push subscriptions"
  on public.push_subscription for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscription;
create policy "Users can insert their own push subscriptions"
  on public.push_subscription for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscription;
create policy "Users can update their own push subscriptions"
  on public.push_subscription for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscription;
create policy "Users can delete their own push subscriptions"
  on public.push_subscription for delete
  using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_push_sub_user_id on public.push_subscription(user_id);
create index if not exists idx_push_sub_endpoint on public.push_subscription(endpoint);
