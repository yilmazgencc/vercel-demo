import { configured, supabase, isAdmin, userFrom } from '../lib/shop.js';
import { limited } from '../lib/ratelimit.js';

const STATUSES = ['yeni', 'hazırlanıyor', 'kargoda', 'teslim edildi', 'iptal'];
const COLS = 'id,name,email,address,note,items,subtotal_cents,discount_cents,total_cents,coupon,status,created_at';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(503).json({ error: 'Supabase yapılandırılmamış' });
  const sb = supabase();
  const bad = (m) => res.status(400).json({ error: m });

  try {
    // Sipariş ver (herkes; giriş yapmışsa hesaba bağlanır)
    if (req.method === 'POST') {
      if (await limited(req, res, 'order', 5, 600)) return;
      const b = req.body ?? {};
      const name = String(b.name ?? '').trim(), email = String(b.email ?? '').trim().toLowerCase();
      const address = String(b.address ?? '').trim(), note = String(b.note ?? '').trim();
      const coupon = String(b.coupon ?? '').trim().slice(0, 30);
      if (!name || name.length > 80) return bad('ad 1-80 karakter olmalı');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return bad('geçersiz e-posta');
      if (address.length < 10 || address.length > 300) return bad('adres 10-300 karakter olmalı');
      if (note.length > 300) return bad('not en fazla 300 karakter');
      if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) return bad('sepet boş ya da çok büyük');
      const items = b.items.map((i) => ({ id: Number(i?.id), qty: Number(i?.qty) }));
      if (items.some((i) => !Number.isInteger(i.id) || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20)) return bad('geçersiz sepet');

      const user = await userFrom(req);
      const { data, error } = await sb.rpc('place_order', {
        p_name: name, p_email: email, p_address: address, p_note: note,
        p_user: user?.id ?? null, p_coupon: coupon, p_items: items,
      });
      // plpgsql `raise exception` mesajları kullanıcıya gösterilebilir (P0001)
      if (error) return res.status(error.code === 'P0001' ? 400 : 500).json({ error: error.message });
      return res.status(201).json({ id: data[0].order_id, total_cents: data[0].total_cents });
    }

    if (req.method === 'GET') {
      if (isAdmin(req)) {
        const { data, error } = await sb.from('orders').select(COLS).order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        return res.json(data);
      }
      const user = await userFrom(req);
      if (!user) return res.status(401).json({ error: 'giriş gerekli' });
      const { data, error } = await sb.from('orders').select(COLS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'yetkisiz' });
      const id = String(req.query.id ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('geçersiz id');
      if (!STATUSES.includes(req.body?.status)) return bad('geçersiz durum');
      // Veritabanı fonksiyonu: iptalde stoğu iade eder, iptal edilmiş siparişi yeniden açmaz.
      const { data, error } = await sb.rpc('set_order_status', { p_id: id, p_status: req.body.status });
      if (error) return res.status(error.code === 'P0001' ? 400 : 500).json({ error: error.message });
      return res.json(Array.isArray(data) ? data[0] : data);
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
