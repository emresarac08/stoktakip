-- Supabase SQL Editor'a bu kodu yapıştır ve çalıştır

-- products tablosu
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity integer not null default 0,
  critical_threshold integer not null default 0,
  unit text not null default 'adet',
  created_at timestamptz default now() not null
);

-- Her kullanıcı sadece kendi ürünlerini görebilir (Row Level Security)
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
