let isTampered = false;

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'POST') {
    const { tamper } = req.body || {};
    isTampered = !!tamper;
    return res.status(200).json({
      ok: !isTampered,
      records: 1240,
      first_bad_id: isTampered ? 412 : null,
      simulated: true
    });
  }
  res.status(200).json({
    ok: !isTampered,
    records: 1240,
    first_bad_id: isTampered ? 412 : null,
    last_hash: "7f4c1e892d409ab156fa39b03f0b2fbc94751e04a4387d853e0029b9f5a09c21"
  });
}

