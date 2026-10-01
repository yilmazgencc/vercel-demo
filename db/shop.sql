-- Mağaza şeması. Supabase SQL Editor'de bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

create table if not exists products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 600),
  price_cents int not null check (price_cents >= 0),
  emoji text not null default '📦',
  category text not null default 'genel',
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  code text primary key,
  percent int not null check (percent between 1 and 90),
  active boolean not null default true
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  address text not null,
  note text not null default '',
  items jsonb not null,
  subtotal_cents int not null,
  discount_cents int not null default 0,
  total_cents int not null,
  coupon text,
  status text not null default 'yeni' check (status in ('yeni', 'hazırlanıyor', 'kargoda', 'teslim edildi', 'iptal')),
  created_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on orders (user_id);

-- RLS açık, politika yok: yalnızca sunucu (service role) erişir.
alter table products enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;

-- Siparişi tek işlemde verir: fiyatı veritabanından hesaplar, stoğu kilitleyip düşer.
create or replace function place_order(
  p_name text, p_email text, p_address text, p_note text,
  p_user uuid, p_coupon text, p_items jsonb
) returns table (order_id uuid, total_cents int) as $$
declare
  v_id uuid := gen_random_uuid();
  v_item jsonb;
  v_prod products%rowtype;
  v_qty int;
  v_sub int := 0;
  v_disc int := 0;
  v_pct int;
  v_lines jsonb := '[]'::jsonb;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'Geçersiz adet'; end if;
    select * into v_prod from products where id = (v_item->>'id')::bigint and active for update;
    if not found then raise exception 'Ürün bulunamadı'; end if;
    if v_prod.stock < v_qty then raise exception 'Stok yetersiz: % (kalan %)', v_prod.name, v_prod.stock; end if;
    update products set stock = stock - v_qty where id = v_prod.id;
    v_sub := v_sub + v_prod.price_cents * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'id', v_prod.id, 'name', v_prod.name, 'emoji', v_prod.emoji, 'qty', v_qty, 'price_cents', v_prod.price_cents);
  end loop;

  if p_coupon is not null and p_coupon <> '' then
    select percent into v_pct from coupons where code = upper(p_coupon) and active;
    if not found then raise exception 'Geçersiz kupon'; end if;
    v_disc := v_sub * v_pct / 100;
  end if;

  insert into orders (id, user_id, name, email, address, note, items, subtotal_cents, discount_cents, total_cents, coupon)
  values (v_id, p_user, p_name, p_email, p_address, coalesce(p_note, ''), v_lines, v_sub, v_disc, v_sub - v_disc, nullif(upper(p_coupon), ''));

  return query select v_id, v_sub - v_disc;
end;
$$ language plpgsql;

-- Fonksiyonu yalnızca sunucu çağırabilsin.
revoke all on function place_order(text, text, text, text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function place_order(text, text, text, text, uuid, text, jsonb) to service_role;

-- Örnek veriler
insert into products (slug, name, description, price_cents, emoji, category, stock) values
  ('vercel-tisort', 'Vercel Tişört', 'Pamuklu, siyah, üçgen logolu unisex tişört.', 49900, '👕', 'giyim', 25),
  ('sapka', 'Üçgen Şapka', 'Ayarlanabilir, nakışlı logo.', 29900, '🧢', 'giyim', 40),
  ('kupa', 'Deploy Kupası', 'Seramik, 350 ml. "Ship it" yazılı.', 19900, '☕', 'ev', 60),
  ('sticker-seti', 'Sticker Seti', '12 adet suya dayanıklı sticker.', 7900, '✨', 'aksesuar', 200),
  ('defter', 'Geliştirici Defteri', 'Noktalı, 120 sayfa, sert kapak.', 24900, '📓', 'kirtasiye', 35),
  ('kulaklik', 'Kablosuz Kulaklık', 'Aktif gürültü engelleme, 30 saat pil.', 249900, '🎧', 'elektronik', 12),
  ('mouse-pad', 'Geniş Mouse Pad', '90x40 cm, kaymaz taban.', 34900, '🖱️', 'elektronik', 18),
  ('canta', 'Laptop Çantası', '15" laptop için su geçirmez çanta.', 89900, '🎒', 'aksesuar', 8)
on conflict (slug) do nothing;

insert into coupons (code, percent) values ('HOSGELDIN10', 10), ('YAZ20', 20)
on conflict (code) do nothing;

-- Sipariş durumunu değiştirir; iptalde stoğu iade eder. İptal edilen sipariş yeniden açılamaz (çift iade olmasın).
create or replace function set_order_status(p_id uuid, p_status text) returns orders as $$
declare
  v_o orders%rowtype;
  v_item jsonb;
begin
  select * into v_o from orders where id = p_id for update;
  if not found then raise exception 'Sipariş bulunamadı'; end if;
  if v_o.status = 'iptal' and p_status <> 'iptal' then raise exception 'İptal edilen sipariş yeniden açılamaz'; end if;
  if p_status = 'iptal' and v_o.status <> 'iptal' then
    for v_item in select * from jsonb_array_elements(v_o.items) loop
      update products set stock = stock + (v_item->>'qty')::int where id = (v_item->>'id')::bigint;
    end loop;
  end if;
  update orders set status = p_status where id = p_id returning * into v_o;
  return v_o;
end;
$$ language plpgsql;

revoke all on function set_order_status(uuid, text) from public, anon, authenticated;
grant execute on function set_order_status(uuid, text) to service_role;

-- Oran sınırı (sabit pencere). true = izin var, false = sınır aşıldı.
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);
alter table rate_limits enable row level security;

create or replace function rate_hit(p_key text, p_limit int, p_window_seconds int) returns boolean as $$
declare
  v_hits int;
begin
  insert into rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
  returning hits into v_hits;
  if random() < 0.01 then delete from rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_limit;
end;
$$ language plpgsql;

revoke all on function rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function rate_hit(text, int, int) to service_role;
