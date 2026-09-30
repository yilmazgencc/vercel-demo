const QUOTES = [
  { text: 'Basit olan, karmaşık olandan daha zordur.', author: 'Steve Jobs' },
  { text: 'Önce çalışsın, sonra güzel olsun, sonra hızlı olsun.', author: 'Kent Beck' },
  { text: 'Erken optimizasyon tüm kötülüklerin anasıdır.', author: 'Donald Knuth' },
  { text: 'Kod bir kez yazılır, defalarca okunur.', author: 'Anonim' },
  { text: 'Ölçemediğini yönetemezsin.', author: 'Peter Drucker' },
  { text: 'Hız, doğruluğun yerine geçmez.', author: 'Anonim' },
];

export default function handler(req, res) {
  const { id } = req.query;
  const index = id !== undefined ? Number(id) : Math.floor(Math.random() * QUOTES.length);
  if (!Number.isInteger(index) || index < 0 || index >= QUOTES.length) {
    return res.status(400).json({ error: `id 0-${QUOTES.length - 1} arasında olmalı` });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ id: index, total: QUOTES.length, ...QUOTES[index] });
}
