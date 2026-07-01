-- Phase 6c: Profile / Settings tables

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  monthly_budget numeric,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

create table category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null,
  updated_at timestamptz default now(),
  unique (user_id, category)
);

alter table category_budgets enable row level security;

create policy "Users can view their own category budgets"
  on category_budgets for select
  using (user_id = auth.uid());

create policy "Users can insert their own category budgets"
  on category_budgets for insert
  with check (user_id = auth.uid());

create policy "Users can update their own category budgets"
  on category_budgets for update
  using (user_id = auth.uid());

create policy "Users can delete their own category budgets"
  on category_budgets for delete
  using (user_id = auth.uid());
