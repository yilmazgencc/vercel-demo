import { createClient } from '@supabase/supabase-js';

const MAX_TODOS = 100;
let db;
const client = () => (db ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase yapılandırılmamış' });
  }
  const sb = client();
  const fail = (error) => res.status(500).json({ error: error.message });

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = token ? await sb.auth.getUser(token) : { data: {} };
  const uid = auth.user?.id;
  if (!uid) return res.status(401).json({ error: 'giriş gerekli' });

  if (req.method === 'GET') {
    const { data, error } = await sb.from('todos').select('id,text,done').eq('user_id', uid).order('id', { ascending: false }).limit(MAX_TODOS);
    return error ? fail(error) : res.json(data);
  }

  if (req.method === 'POST') {
    const text = String(req.body?.text ?? '').trim();
    if (!text || text.length > 200) return res.status(400).json({ error: 'text 1-200 karakter olmalı' });
    const { count } = await sb.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    if (count >= MAX_TODOS) return res.status(429).json({ error: 'Görev sınırına ulaşıldı' });
    const { data, error } = await sb.from('todos').insert({ text, user_id: uid }).select('id,text,done').single();
    return error ? fail(error) : res.status(201).json(data);
  }

  const id = Number(req.query.id ?? req.body?.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'geçersiz id' });

  if (req.method === 'PATCH') {
    if (typeof req.body?.done !== 'boolean') return res.status(400).json({ error: 'done boolean olmalı' });
    const { data, error } = await sb.from('todos').update({ done: req.body.done }).eq('id', id).eq('user_id', uid).select('id,text,done').single();
    return error ? fail(error) : res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await sb.from('todos').delete().eq('id', id).eq('user_id', uid);
    return error ? fail(error) : res.status(204).end();
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  res.status(405).json({ error: 'method not allowed' });
}
