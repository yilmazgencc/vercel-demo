import { configured, supabase } from './shop.js';

// İstek sınırını aşarsa 429 döner ve true verir; çağıran hemen çıkmalı.
// Sayaç Postgres'te (rate_hit), çünkü serverless örnekler arasında bellek paylaşılmaz.
// Veritabanına ulaşılamazsa siteyi kilitlememek için istek geçirilir.
export async function limited(req, res, name, limit, windowSeconds) {
  if (!configured()) return false;
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const { data, error } = await supabase().rpc('rate_hit', { p_key: `${name}:${ip}`, p_limit: limit, p_window_seconds: windowSeconds });
  if (error || data !== false) return false;
  res.setHeader('Retry-After', String(windowSeconds));
  res.status(429).json({ error: 'Çok fazla istek, lütfen biraz sonra tekrar deneyin' });
  return true;
}
