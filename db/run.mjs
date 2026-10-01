// Kullanım: node db/run.mjs db/shop.sql   (DATABASE_URL, .env.local'dan okunur)
import { readFileSync } from 'node:fs';
import pg from 'pg';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
    .filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
// Adresteki sslmode, aşağıdaki ssl ayarını ezer (Supabase sertifika zinciri doğrulanamıyor); çıkarıyoruz.
const url = (process.env.DATABASE_URL || env.DATABASE_URL || '').replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
const file = process.argv[2];
if (!url) { console.error('DATABASE_URL boş (.env.local).'); process.exit(1); }
if (!file) { console.error('Kullanım: node db/run.mjs <dosya.sql>'); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(readFileSync(file, 'utf8'));
  console.log('OK:', file);
} catch (e) {
  console.error('HATA:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
