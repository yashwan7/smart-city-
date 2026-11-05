export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json([
    {
      category: "electricity",
      label: "Electricity (Southern Grid)",
      kg: 1.32,
      pct: 61.7,
      factor_id: "EF-ELEC-IN-01",
      source: "Central Electricity Authority (CEA) CO2 Baseline Database v19.0 (2024)",
      quality: "measured",
      unit_rate: "0.716 kg CO2e / kWh"
    },
    {
      category: "transport",
      label: "Commute & Transit",
      kg: 0.52,
      pct: 24.3,
      factor_id: "EF-TRANS-2W-01",
      source: "ARAI / CPCB India vehicular emission inventory database 2024",
      quality: "manual",
      unit_rate: "0.052 kg CO2e / passenger-km"
    },
    {
      category: "fuel",
      label: "Generator & Heating Fuel",
      kg: 0.23,
      pct: 10.7,
      factor_id: "EF-FUEL-DIESEL-01",
      source: "IPCC 2006 Guidelines for National Greenhouse Gas Inventories & DEFRA 2024",
      quality: "manual",
      unit_rate: "2.687 kg CO2e / L"
    },
    {
      category: "waste",
      label: "Solid Waste & Landfill",
      kg: 0.07,
      pct: 3.3,
      factor_id: "EF-WASTE-MSW-01",
      source: "Ministry of Environment, Forest and Climate Change (MoEFCC) India",
      quality: "estimated",
      unit_rate: "0.520 kg CO2e / kg"
    }
  ]);
}

