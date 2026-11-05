export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const metric = req.query?.metric || "watts";
  const points = [];
  const now = Date.now();
  const count = 30;
  const stepMs = (6 * 3600 * 1000) / count;
  for (let i = count; i >= 0; i--) {
    const ts = new Date(now - i * stepMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let val = 0;
    if (metric === "watts") {
      val = 80 + Math.sin(i / 3) * 18 + (i % 5 === 0 ? 12 : -8);
      if (i < 6) val = 41.5 + (i % 2 === 0 ? 2 : -2);
    } else {
      val = Number((0.02 + Math.abs(Math.sin(i / 4) * 0.05)).toFixed(3));
    }
    points.push({ time: ts, value: Number(val.toFixed(1)) });
  }
  res.status(200).json(points);
}

