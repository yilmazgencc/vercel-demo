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

-- Blog yazıları (api/posts.js buradan okur; tablo boşsa koddaki yedek liste kullanılır).
create table if not exists posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  tag text not null,
  minutes int not null default 3,
  summary text not null,
  created_at timestamptz not null default now()
);
alter table posts enable row level security;

insert into posts (slug, title, tag, minutes, summary) values
  ('edge-network', 'Edge Network nasıl çalışır?', 'altyapı', 4, 'İçeriğin kullanıcıya en yakın noktadan sunulması ve önbellek katmanları.'),
  ('preview-deploys', 'Preview deployment ile güvenli yayın', 'iş akışı', 3, 'Her branch için ayrı URL: review, test ve geri dönüş süreçleri.'),
  ('serverless-basics', 'Serverless fonksiyonlara giriş', 'backend', 6, '/api klasörü, cold start, zaman aşımı ve ortam değişkenleri.'),
  ('caching', 'Cache-Control ile hız kazanmak', 'performans', 5, 'max-age, s-maxage ve stale-while-revalidate farkları.'),
  ('env-vars', 'Ortam değişkenleri ve gizli bilgiler', 'güvenlik', 3, 'Development, preview ve production için ayrı değerler.')
on conflict (slug) do nothing;
