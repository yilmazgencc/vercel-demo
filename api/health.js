export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'local',
    node: process.version,
  });
}
