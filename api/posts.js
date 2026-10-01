import { createClient } from '@supabase/supabase-js';

// Supabase'te `posts` tablosu yoksa ya da erişilemezse kullanılan yedek liste.
const FALLBACK = [
  { slug: 'edge-network', title: 'Edge Network nasıl çalışır?', tag: 'altyapı', minutes: 4,
    summary: 'İçeriğin kullanıcıya en yakın noktadan sunulması ve önbellek katmanları.' },
  { slug: 'preview-deploys', title: 'Preview deployment ile güvenli yayın', tag: 'iş akışı', minutes: 3,
    summary: 'Her branch için ayrı URL: review, test ve geri dönüş süreçleri.' },
  { slug: 'serverless-basics', title: 'Serverless fonksiyonlara giriş', tag: 'backend', minutes: 6,
    summary: '/api klasörü, cold start, zaman aşımı ve ortam değişkenleri.' },
  { slug: 'caching', title: 'Cache-Control ile hız kazanmak', tag: 'performans', minutes: 5,
    summary: 'max-age, s-maxage ve stale-while-revalidate farkları.' },
  { slug: 'env-vars', title: 'Ortam değişkenleri ve gizli bilgiler', tag: 'güvenlik', minutes: 3,
    summary: 'Development, preview ve production için ayrı değerler.' },
];

let db;
async function loadPosts() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return FALLBACK;
  db ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await db.from('posts').select('slug,title,tag,minutes,summary').order('id');
  return error || !data.length ? FALLBACK : data;
}

export default async function handler(req, res) {
  const { tag, q } = req.query;
  const POSTS = await loadPosts();
  let list = POSTS;
  if (tag) list = list.filter((p) => p.tag === tag);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((p) => (p.title + p.summary).toLowerCase().includes(needle));
  }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).json({ count: list.length, tags: [...new Set(POSTS.map((p) => p.tag))], posts: list });
}
