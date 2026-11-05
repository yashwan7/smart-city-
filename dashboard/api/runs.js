export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'POST') {
    const { label } = req.body || {};
    return res.status(200).json({ ok: true, active: true, label: label || 'optimized' });
  }
  res.status(200).json({
    active: false,
    label: "baseline",
    baseline: {
      avg_w: 96.8,
      kwh_per_h: 0.0968,
      kg_per_h: 0.0693
    },
    optimized: {
      avg_w: 42.1,
      kwh_per_h: 0.0421,
      kg_per_h: 0.0301
    },
    saved_kwh_per_h: 0.0547,
    saved_kg_per_h: 0.0392,
    pct_saved: 56.5
  });
}

