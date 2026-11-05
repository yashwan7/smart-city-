export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json([
    {
      id: "REC-01",
      title: "Curtail Daylight Ambient Load",
      category: "electricity",
      action: "Trip load relay when ambient lux exceeds 400 lumens for 20s",
      saving_kwh_day: 0.44,
      saving_kg_day: 0.315,
      basis: "Measured 94.5W baseline load vs 42.1W optimized state over 8 daylight hours",
      text: "Automated daylight waste policy cuts 0.44 kWh daily, avoiding 0.315 kg CO2e based on CEA Southern Grid Baseline v19.0 (0.716 kg CO2e/kWh).",
      validated: true,
      priority: "high"
    },
    {
      id: "REC-02",
      title: "Shift Single-Occupancy Car Commute to Bus/Active",
      category: "transport",
      action: "Incentivize 2 BMTC transit or active commute trips per week (12 km)",
      saving_kwh_day: 0.0,
      saving_kg_day: 1.512,
      basis: "Car factor 0.174 kg/km vs BMTC Bus 0.048 kg/km across 12 km round-trip",
      text: "Swapping 12 km daily private car commute to public transit saves 1.512 kg CO2e per trip using ARAI/TERI factors.",
      validated: true,
      priority: "medium"
    },
    {
      id: "REC-03",
      title: "Optimize Secondary Solid Waste Disposal",
      category: "waste",
      action: "Trigger bin collection at 85% volumetric threshold before anaerobic compaction",
      saving_kwh_day: 0.0,
      saving_kg_day: 0.208,
      basis: "HC-SR04 ultrasonic bin level 63% fill; MoEFCC landfill methane factor 0.520 kg CO2e/kg",
      text: "Timely municipal clearance prevents anaerobic methane generation, saving ~0.208 kg CO2e per 50L bin cycle.",
      validated: true,
      priority: "low"
    }
  ]);
}

