-- Supabase SQL Editor'de bir kez çalıştırın.
create table if not exists todos (
  id bigint generated always as identity primary key,
  text text not null check (char_length(text) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS açık, politika yok: anon anahtarı ile doğrudan erişim kapalı.
-- API, service role anahtarıyla (RLS'i atlar) sunucuda erişir.
alter table todos enable row level security;
