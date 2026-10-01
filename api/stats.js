import { MongoClient } from 'mongodb';

const PATHS = ['/', '/blog', '/tools', '/dashboard', '/about'];
let client;
const collection = () => {
  client ??= new MongoClient(process.env.MONGODB_URI);
  return client.db('demo').collection('pageviews');
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.MONGODB_URI) return res.status(503).json({ error: 'MongoDB yapılandırılmamış' });

  try {
    const col = collection();

    if (req.method === 'POST') {
      const path = String(req.body?.path ?? '');
      if (!PATHS.includes(path)) return res.status(400).json({ error: 'geçersiz path' });
      await col.updateOne({ _id: path }, { $inc: { views: 1 }, $set: { lastAt: new Date() } }, { upsert: true });
      return res.status(204).end();
    }

    if (req.method === 'GET') {
      const key = process.env.ADMIN_KEY;
      if (!key) return res.status(503).json({ error: 'ADMIN_KEY yapılandırılmamış' });
      if (req.headers['x-admin-key'] !== key) return res.status(401).json({ error: 'yetkisiz' });
      const docs = await col.find({}).sort({ views: -1 }).toArray();
      return res.json({
        total: docs.reduce((n, d) => n + d.views, 0),
        pages: docs.map((d) => ({ path: d._id, views: d.views, lastAt: d.lastAt })),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
