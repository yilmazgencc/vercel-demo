import { configured, supabase } from '../lib/shop.js';

// Sepette indirim önizlemesi için; asıl indirim sipariş anında veritabanında hesaplanır.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(503).json({ error: 'Supabase yapılandırılmamış' });
  const code = String(req.query.code ?? '').trim().toUpperCase().slice(0, 30);
  if (!code) return res.status(400).json({ error: 'code gerekli' });
  const { data, error } = await supabase().from('coupons').select('code,percent').eq('code', code).eq('active', true).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Geçersiz kupon' });
  res.json(data);
}
