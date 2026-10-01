// Kullanım: node db/mongo.mjs   → veritabanındaki koleksiyonları ve kayıt sayılarını listeler.
// MONGODB_URI, .env.local'dan okunur. Başka işlemler için bu dosyayı örnek alın.
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const line = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').find((l) => l.startsWith('MONGODB_URI='));
const uri = process.env.MONGODB_URI || line?.slice(12).trim().replace(/^["']|["']$/g, '');
if (!uri) { console.error('MONGODB_URI boş (.env.local).'); process.exit(1); }

const client = new MongoClient(uri);
try {
  const db = client.db('demo');
  for (const { name } of await db.listCollections().toArray()) {
    console.log(name.padEnd(14), await db.collection(name).estimatedDocumentCount());
  }
} catch (e) {
  console.error('HATA:', e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
