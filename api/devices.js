export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json([
    {
      node: "Node A1",
      name: "Energy & Kiosk (NXP FRDM-MCXN236 + ESP32 #1)",
      status: "online",
      last_seen: new Date().toISOString(),
      fw_version: "v1.4-mcxn236",
      bad_sig_count: 0,
      sensors: ["LDR (ADC0_CH1)", "MQ-135", "INA219 Current", "Relay Load", "TinyML INT8"]
    },
    {
      node: "Node B1",
      name: "Waste & Garden (ESP32 #2)",
      status: "online",
      last_seen: new Date().toISOString(),
      fw_version: "v1.2-esp32",
      bad_sig_count: 0,
      sensors: ["HC-SR04 Ultrasonic", "Soil Capacitive", "Raindrop", "Pump Relay"]
    }
  ]);
}

