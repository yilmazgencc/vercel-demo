import { configured, supabase, isAdmin } from '../lib/shop.js';

const COLS = 'id,slug,name,description,price_cents,emoji,category,stock,active';
const slugify = (s) => s.toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o')
  .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// Gövdeden gelen alanları doğrular; kısmi güncelleme için yalnızca verilenleri döndürür.
function parse(body, partial) {
  const out = {}, bad = (m) => { throw Object.assign(new Error(m), { status: 400 }); };
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) { const v = String(body.name ?? '').trim(); if (!v || v.length > 100) bad('name 1-100 karakter olmalı'); out.name = v; }
  if (has('description')) { const v = String(body.description).trim(); if (v.length > 600) bad('description en fazla 600 karakter'); out.description = v; }
  if (!partial || has('price_cents')) { const v = Number(body.price_cents); if (!Number.isInteger(v) || v < 0 || v > 100_000_000) bad('price_cents geçersiz'); out.price_cents = v; }
  if (has('stock')) { const v = Number(body.stock); if (!Number.isInteger(v) || v < 0 || v > 100_000) bad('stock geçersiz'); out.stock = v; }
  if (has('emoji')) { const v = String(body.emoji).trim(); if (!v || v.length > 8) bad('emoji 1-8 karakter olmalı'); out.emoji = v; }
  if (has('category')) { const v = String(body.category).trim().toLowerCase(); if (!v || v.length > 30) bad('category 1-30 karakter olmalı'); out.category = v; }
  if (has('active')) { if (typeof body.active !== 'boolean') bad('active boolean olmalı'); out.active = body.active; }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(503).json({ error: 'Supabase yapılandırılmamış' });
  const sb = supabase();
  const fail = (e) => res.status(e.status ?? 500).json({ error: e.message });

  try {
    if (req.method === 'GET') {
      const admin = isAdmin(req) && req.query.all === '1';
      let q = sb.from('products').select(COLS).order('id', { ascending: false }).limit(200);
      if (!admin) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      if (!admin) res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      return res.json({ products: data, categories: [...new Set(data.map((p) => p.category))].sort() });
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'yetkisiz' });

    if (req.method === 'POST') {
      const row = { stock: 0, emoji: '📦', category: 'genel', description: '', ...parse(req.body ?? {}, false) };
      row.slug = `${slugify(row.name) || 'urun'}-${Date.now().toString(36)}`;
      const { data, error } = await sb.from('products').insert(row).select(COLS).single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'geçersiz id' });

    if (req.method === 'PATCH') {
      const patch = parse(req.body ?? {}, true);
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'güncellenecek alan yok' });
      const { data, error } = await sb.from('products').update(patch).eq('id', id).select(COLS).single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) { fail(e); }
}
