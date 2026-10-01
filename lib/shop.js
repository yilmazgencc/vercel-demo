import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

let db;
export const configured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const supabase = () => (db ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}));

export function isAdmin(req) {
  const key = process.env.ADMIN_KEY;
  const given = String(req.headers['x-admin-key'] ?? '');
  if (!key || given.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(key));
}

export async function userFrom(req) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await supabase().auth.getUser(token);
  return data.user ?? null;
}
