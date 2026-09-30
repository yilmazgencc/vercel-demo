import { MongoClient } from 'mongodb';

let client;
const collection = () => {
  client ??= new MongoClient(process.env.MONGODB_URI);
  return client.db('demo').collection('guestbook');
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.MONGODB_URI) return res.status(503).json({ error: 'MongoDB yapılandırılmamış' });

  try {
    const col = collection();

    if (req.method === 'GET') {
      const docs = await col.find({}, { projection: { name: 1, message: 1, createdAt: 1 } })
        .sort({ createdAt: -1 }).limit(30).toArray();
      return res.json(docs.map(({ _id, ...d }) => ({ id: String(_id), ...d })));
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name ?? '').trim().slice(0, 40) || 'Anonim';
      const message = String(req.body?.message ?? '').trim();
      if (!message || message.length > 280) return res.status(400).json({ error: 'message 1-280 karakter olmalı' });
      if ((await col.estimatedDocumentCount()) >= 500) return res.status(429).json({ error: 'Defter doldu' });
      const doc = { name, message, createdAt: new Date() };
      const { insertedId } = await col.insertOne(doc);
      return res.status(201).json({ id: String(insertedId), ...doc });
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
