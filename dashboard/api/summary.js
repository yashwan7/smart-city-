export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    today_kg: 2.14,
    kwh_today: 1.84,
    power_w: 94.5,
    by_category: {
      electricity: 1.32,
      transport: 0.52,
      fuel: 0.23,
      waste: 0.07
    },
    quality: {
      measured: 62,
      estimated: 14,
      manual: 24
    },
    ledger_ok: true,
    updated: new Date().toISOString(),
    provenance: "VERCEL MOCK API"
  });
}

