-- Supabase SQL Editor'a bu kodu yapıştır ve çalıştır

-- ──────────────────────────────────────────────
-- 1. products tablosu (ilk kurulum)
-- ──────────────────────────────────────────────
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity integer not null default 0,
  critical_threshold integer not null default 0,
  unit text not null default 'adet',
  created_at timestamptz default now() not null
);

alter table products enable row level security;

create policy "Users can view own products"
  on products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on products for update
  using (auth.uid() = user_id);

create policy "Users can delete own products"
  on products for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 2. Yeni kolonlar (zaten tablo varsa çalıştır)
-- ──────────────────────────────────────────────
alter table products add column if not exists category text not null default 'Diğer';
alter table products add column if not exists subcategory text not null default 'Diğer';

-- ──────────────────────────────────────────────
-- 3. stock_movements tablosu
-- ──────────────────────────────────────────────
create table if not exists stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  quantity_change integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  note text not null default '',
  created_at timestamptz default now() not null
);

alter table stock_movements enable row level security;

create policy "Users can view own movements"
  on stock_movements for select
  using (auth.uid() = user_id);

create policy "Users can insert own movements"
  on stock_movements for insert
  with check (auth.uid() = user_id);
