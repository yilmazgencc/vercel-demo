import { createClient } from '@supabase/supabase-js';

let db;
const client = () => (db ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase yapılandırılmamış' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { action } = req.body ?? {};
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return res.status(400).json({ error: 'geçersiz e-posta' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'şifre 6-72 karakter olmalı' });

  const sb = client();
  if (action === 'signup') {
    // E-posta onayı atlanır (demo); gerçek projede onay e-postası kullanın.
    const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return res.status(400).json({ error: error.message });
  } else if (action !== 'login') {
    return res.status(400).json({ error: 'action signup veya login olmalı' });
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'e-posta veya şifre hatalı' });
  res.json({ token: data.session.access_token, email: data.user.email });
}
