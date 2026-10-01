import { configured, supabase, isAdmin } from '../lib/shop.js';
import { limited } from '../lib/ratelimit.js';

const CODE = /^[A-Z0-9_-]{3,30}$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(503).json({ error: 'Supabase yapılandırılmamış' });
  const sb = supabase();
  const bad = (m) => res.status(400).json({ error: m });
  const fail = (e) => res.status(500).json({ error: e.message });

  // Herkese açık: tek kupon sorgula (sepette indirim önizlemesi; asıl indirim sipariş anında hesaplanır)
  if (req.method === 'GET' && req.query.all !== '1') {
    if (await limited(req, res, 'coupon', 30, 60)) return;
    const code = String(req.query.code ?? '').trim().toUpperCase().slice(0, 30);
    if (!code) return bad('code gerekli');
    const { data, error } = await sb.from('coupons').select('code,percent').eq('code', code).eq('active', true).maybeSingle();
    if (error) return fail(error);
    return data ? res.json(data) : res.status(404).json({ error: 'Geçersiz kupon' });
  }

  // Buradan sonrası yalnızca admin
  if (!isAdmin(req)) return res.status(401).json({ error: 'yetkisiz' });

  if (req.method === 'GET') {
    const { data, error } = await sb.from('coupons').select('code,percent,active').order('code');
    return error ? fail(error) : res.json(data);
  }

  const percentOf = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 90 ? n : null; };

  if (req.method === 'POST') {
    const code = String(req.body?.code ?? '').trim().toUpperCase(), percent = percentOf(req.body?.percent);
    if (!CODE.test(code)) return bad('kod 3-30 karakter (A-Z, 0-9, _ ve -) olmalı');
    if (!percent) return bad('yüzde 1-90 arasında olmalı');
    const { data, error } = await sb.from('coupons').insert({ code, percent }).select('code,percent,active').single();
    if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Bu kupon zaten var' : error.message });
    return res.status(201).json(data);
  }

  const code = String(req.query.code ?? '').trim().toUpperCase();
  if (!CODE.test(code)) return bad('geçersiz kod');

  if (req.method === 'PATCH') {
    const patch = {};
    if (req.body?.percent !== undefined) { patch.percent = percentOf(req.body.percent); if (!patch.percent) return bad('yüzde 1-90 arasında olmalı'); }
    if (req.body?.active !== undefined) { if (typeof req.body.active !== 'boolean') return bad('active boolean olmalı'); patch.active = req.body.active; }
    if (!Object.keys(patch).length) return bad('güncellenecek alan yok');
    const { data, error } = await sb.from('coupons').update(patch).eq('code', code).select('code,percent,active').single();
    return error ? fail(error) : res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await sb.from('coupons').delete().eq('code', code);
    return error ? fail(error) : res.status(204).end();
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  res.status(405).json({ error: 'method not allowed' });
}
