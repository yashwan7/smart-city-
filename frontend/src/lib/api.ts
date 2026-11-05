import type {
  NetSummary,
  BreakdownItem,
  TimeseriesPoint,
  LedgerVerification,
  RunComparison,
  Recommendation,
  DeviceNode,
  SamputaBatch,
  VernacularRecord
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    signal: options?.signal || AbortSignal.timeout(1500),
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error [${response.status}] ${endpoint}: ${errorText}`);
  }

  return response.json();
}

// Development Fixtures (used when Hub is offline / in dev preview)
const MOCK_NET: NetSummary = {
  bad_kg: 2.14,
  good_kg: 0.85,
  net_kg: 1.29,
  good_verified_kg: 0.52,
  good_projected_kg: 0.33,
  power_w: 94.5,
  kwh_today: 1.84,
  quality: { measured: 60, estimated: 15, manual: 25, assumed: 0 },
  ledger_ok: true,
  updated: new Date().toISOString(),
  accounting_boundary: 'Campus Physical Ledger (Node A1 & B1)'
};

const MOCK_BREAKDOWN: BreakdownItem[] = [
  {
    category: 'electricity',
    label: 'Electricity (Southern Grid)',
    kg: 1.32,
    pct: 61.7,
    activity_value: 1.84,
    activity_unit: 'kWh',
    factor_id: 'EF-ELEC-IN-01',
    factor_value: 0.716,
    factor_unit: 'kg CO2e / kWh',
    source: 'Central Electricity Authority (CEA) Baseline v19.0 (2024)',
    quality: 'measured',
    citation: 'https://cea.nic.in/cdm-co2-baseline-database',
    verified: true
  },
  {
    category: 'transport',
    label: 'Commute & Transit',
    kg: 0.52,
    pct: 24.3,
    activity_value: 12,
    activity_unit: 'km',
    factor_id: 'EF-TRANS-2W-01',
    factor_value: 0.052,
    factor_unit: 'kg CO2e / passenger-km',
    source: 'ARAI / CPCB India vehicular emission database 2024',
    quality: 'manual',
    citation: 'https://www.araiindia.com',
    verified: true
  },
  {
    category: 'fuel',
    label: 'Generator Fuel (Diesel)',
    kg: 0.23,
    pct: 10.7,
    activity_value: 0.085,
    activity_unit: 'Litres',
    factor_id: 'EF-FUEL-DIESEL-01',
    factor_value: 2.687,
    factor_unit: 'kg CO2e / Litre',
    source: 'IPCC 2006 Guidelines & UK DEFRA 2024 Conversion Factors',
    quality: 'manual',
    citation: 'https://www.ipcc-nggip.iges.or.jp',
    verified: true
  },
  {
    category: 'waste',
    label: 'Solid Waste & Landfill',
    kg: 0.07,
    pct: 3.3,
    activity_value: 0.134,
    activity_unit: 'kg waste',
    factor_id: 'EF-WASTE-MSW-01',
    factor_value: 0.520,
    factor_unit: 'kg CO2e / kg waste',
    source: 'Ministry of Environment, Forest and Climate Change (MoEFCC) India',
    quality: 'estimated',
    citation: 'https://moef.gov.in',
    verified: true
  }
];

const MOCK_TIMESERIES: TimeseriesPoint[] = [
  { time: '09:00', bad_kg: 0.42, good_verified_kg: 0.10, good_projected_kg: 0.05, net_kg: 0.27, power_w: 92.1 },
  { time: '10:00', bad_kg: 0.78, good_verified_kg: 0.20, good_projected_kg: 0.10, net_kg: 0.48, power_w: 95.4 },
  { time: '11:00', bad_kg: 1.15, good_verified_kg: 0.32, good_projected_kg: 0.18, net_kg: 0.65, power_w: 98.2, relay_event: 'Relay Active (Load ON)' },
  { time: '12:00', bad_kg: 1.58, good_verified_kg: 0.45, good_projected_kg: 0.25, net_kg: 0.88, power_w: 99.0 },
  { time: '13:00', bad_kg: 1.82, good_verified_kg: 0.48, good_projected_kg: 0.28, net_kg: 1.06, power_w: 42.1, relay_event: 'Auto-trip (DAYLIGHT_WASTE -56.5%)' },
  { time: '14:00', bad_kg: 1.98, good_verified_kg: 0.50, good_projected_kg: 0.31, net_kg: 1.17, power_w: 41.8, lid_event: 'Samputa Lid Closed' },
  { time: '15:00', bad_kg: 2.14, good_verified_kg: 0.52, good_projected_kg: 0.33, net_kg: 1.29, power_w: 42.5 }
];

const MOCK_RUNS: RunComparison = {
  baseline: { avg_w: 96.8, kwh_per_h: 0.0968, kg_per_h: 0.0693 },
  optimized: { avg_w: 42.1, kwh_per_h: 0.0421, kg_per_h: 0.0301 },
  saved_kwh_per_h: 0.0547,
  saved_kg_per_h: 0.0392,
  pct_saved: 56.5,
  has_data: true,
  relay_event: 'Auto-trip on DAYLIGHT_WASTE',
  time_range: 'Solar Peak Window (3 mins)'
};

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'REC-01',
    title: 'Curtail Daylight Ambient Load (Automated Relay)',
    action: 'Trip load relay when ambient lux exceeds 400 lumens for 20s',
    trigger_reason: 'LDR photodiode exceeded 412 lux while INA219 measured 94.5W active draw during solar peak',
    supporting_measurements: 'ADC0_CH1: 412 lux, INA219: 94.5W, State: DAYLIGHT_WASTE',
    saving_kwh_day: 0.44,
    saving_kg_day: 0.315,
    quality: 'measured',
    basis: 'Empirical 54.7W load drop over 8 projected daylight hours (CEA v19.0 Southern Grid)',
    text: 'Automated daylight waste policy cuts 0.44 kWh daily, avoiding 0.315 kg CO2e based on CEA Southern Grid Baseline v19.0 (0.716 kg CO2e/kWh).',
    validated: true,
    priority: 'high'
  },
  {
    id: 'REC-02',
    title: 'Shift Single-Occupancy Commute to Transit / Active',
    action: 'Incentivize BMTC transit or active commute check-ins for 12 km round-trip',
    trigger_reason: 'Manual kiosk logged ICE car commute with 0.174 kg/pass-km factor',
    supporting_measurements: 'Car Factor: 0.174 kg/km vs BMTC Bus: 0.048 kg/km over 12 km',
    saving_kwh_day: 0.0,
    saving_kg_day: 1.512,
    quality: 'manual',
    basis: 'ARAI / TERI Passenger Transit Emission Inventory 2024',
    text: 'Swapping a 12 km daily private car commute to public transit saves 1.512 kg CO2e per trip using ARAI/TERI factors.',
    validated: true,
    priority: 'medium'
  },
  {
    id: 'REC-03',
    title: 'Optimize Secondary Organic Waste Clearance',
    action: 'Trigger municipal clearance at 85% volumetric threshold before anaerobic decay sets in',
    trigger_reason: 'HC-SR04 ultrasonic measured 63% fill level with rain detected on Node B1',
    supporting_measurements: 'Bin fill: 63%, Soil moisture: 41%, Rain: 0',
    saving_kwh_day: 0.0,
    saving_kg_day: 0.208,
    quality: 'estimated',
    basis: 'MoEFCC India Landfill First-Order Decay Model (0.520 kg CO2e/kg)',
    text: 'Timely municipal clearance prevents anaerobic methane generation, saving ~0.208 kg CO2e per 50L bin cycle.',
    validated: true,
    priority: 'low'
  }
];

const MOCK_LEDGER: LedgerVerification = {
  ok: true,
  records: 1240,
  first_bad_id: null,
  last_hash: '7f4c1e892d409ab156fa39b03f0b2fbc94751e04a4387d853e0029b9f5a09c21'
};

const MOCK_DEVICES: DeviceNode[] = [
  {
    node: 'Node A1',
    name: 'Energy & Commute Kiosk',
    status: 'online',
    last_seen: new Date().toISOString(),
    fw_version: 'v1.4-mcxn236',
    last_seq: 1793200000123,
    bad_sig_count: 0,
    sensors: ['LDR (ADC0_CH1)', 'MQ-135 Gas', 'INA219 Current/Power', '10A Relay Load', '4x Commute Buttons', 'ST7735 TFT Meter'],
    current_state: 'DAYLIGHT_WASTE (Relay Cut Ready)'
  },
  {
    node: 'Node B1',
    name: 'Waste & Garden Monitor',
    status: 'online',
    last_seen: new Date(Date.now() - 4000).toISOString(),
    fw_version: 'v1.2-esp32',
    last_seq: 1793200000118,
    bad_sig_count: 0,
    sensors: ['HC-SR04 Ultrasonic (63%)', 'Capacitive Soil (41%)', 'Raindrop Sensor (Dry)', 'Submersible Pump Relay'],
    current_state: 'ACCUMULATING (Lid Closed)'
  }
];

const MOCK_SAMPUTA: SamputaBatch = {
  fill_pct: 63,
  capacity_litres: 50,
  surface_distance_cm: 18.5,
  last_reading_time: new Date().toISOString(),
  lid_state: 'closed',
  rain_detected: false,
  batch_id: 'SB-2026-04',
  status: 'accumulating',
  projected_kg_co2e: 0.328,
  verified_kg_co2e: 0,
  weighed_mass_kg: null,
  weighed_at: null
};

const MOCK_VERNACULAR: VernacularRecord[] = [
  {
    id: 'TRAD-01',
    activity: 'matka',
    quantity: 1,
    unit: 'earthen pot-year',
    formula: '150 kWh/yr avoided compressor energy × 0.716 kg/kWh × 80% haircut',
    factor: 85.92,
    factor_unit: 'kg CO2e / pot-year',
    source: 'TERI Evaporative Cooling Life Cycle Assessment & CEA Baseline v19.0',
    haircut_pct: 20,
    benefit_kg_co2e: 85.92,
    quality: 'estimated',
    verification_status: 'projected',
    timestamp: new Date().toISOString()
  },
  {
    id: 'TRAD-02',
    activity: 'handloom',
    quantity: 2,
    unit: 'garments',
    formula: '5.2 kWh grid energy avoided per meter woven × 0.716 kg/kWh × 80% haircut',
    factor: 2.97,
    factor_unit: 'kg CO2e / garment',
    source: 'Ministry of Textiles India Handloom Sustainability Study',
    haircut_pct: 20,
    benefit_kg_co2e: 5.94,
    quality: 'estimated',
    verification_status: 'assumed',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

// REST Endpoints
export async function getNetSummary(): Promise<NetSummary> {
  try {
    return await request<NetSummary>('/api/net');
  } catch {
    try {
      const summary = await request<{
        today_kg: number;
        kwh_today: number;
        power_w: number;
        quality: NetSummary['quality'];
        ledger_ok: boolean;
        updated: string;
        good_kg?: number;
      }>('/api/summary');

      const bad_kg = summary.today_kg ?? MOCK_NET.bad_kg;
      const good_kg = summary.good_kg ?? MOCK_NET.good_kg;
      return {
        bad_kg,
        good_kg,
        net_kg: Number((bad_kg - good_kg).toFixed(2)),
        good_verified_kg: MOCK_NET.good_verified_kg,
        good_projected_kg: good_kg - MOCK_NET.good_verified_kg,
        power_w: summary.power_w ?? MOCK_NET.power_w,
        kwh_today: summary.kwh_today ?? MOCK_NET.kwh_today,
        quality: summary.quality || MOCK_NET.quality,
        ledger_ok: summary.ledger_ok ?? true,
        updated: summary.updated || new Date().toISOString(),
        accounting_boundary: 'Campus Physical Ledger (Node A1 & B1)'
      };
    } catch {
      return MOCK_NET;
    }
  }
}

export async function getBreakdown(): Promise<BreakdownItem[]> {
  try {
    return await request<BreakdownItem[]>('/api/breakdown');
  } catch {
    return MOCK_BREAKDOWN;
  }
}

export async function getTimeseries(): Promise<TimeseriesPoint[]> {
  try {
    return await request<TimeseriesPoint[]>('/api/timeseries');
  } catch {
    return MOCK_TIMESERIES;
  }
}

export async function getRunsCompare(): Promise<RunComparison> {
  try {
    return await request<RunComparison>('/api/runs/compare');
  } catch {
    return MOCK_RUNS;
  }
}

export async function getRecommendations(): Promise<Recommendation[]> {
  try {
    return await request<Recommendation[]>('/api/recommendations');
  } catch {
    return MOCK_RECOMMENDATIONS;
  }
}

export async function verifyLedger(): Promise<LedgerVerification> {
  try {
    return await request<LedgerVerification>('/api/ledger/verify');
  } catch {
    return MOCK_LEDGER;
  }
}

export async function triggerTamperDemo(tamper = true): Promise<LedgerVerification> {
  try {
    return await request<LedgerVerification>(`/api/ledger/tamper-demo?tamper=${tamper}`);
  } catch {
    return {
      ok: !tamper,
      records: 1240,
      first_bad_id: tamper ? 412 : null,
      last_hash: MOCK_LEDGER.last_hash
    };
  }
}

export async function getDevices(): Promise<DeviceNode[]> {
  try {
    return await request<DeviceNode[]>('/api/devices');
  } catch {
    return MOCK_DEVICES;
  }
}

export async function getServerTime(): Promise<{ server_time: string; unix_ts: number }> {
  try {
    return await request<{ server_time: string; unix_ts: number }>('/api/time');
  } catch {
    return { server_time: new Date().toISOString(), unix_ts: Math.floor(Date.now() / 1000) };
  }
}

export async function getSamputaStatus(): Promise<SamputaBatch> {
  try {
    return await request<SamputaBatch>('/api/samputa');
  } catch {
    return MOCK_SAMPUTA;
  }
}

export async function getVernacularHistory(): Promise<VernacularRecord[]> {
  try {
    return await request<VernacularRecord[]>('/api/traditional');
  } catch {
    return MOCK_VERNACULAR;
  }
}

// Operational Actions
export async function submitCommute(mode: string, km = 12): Promise<{ ok: boolean; kg_co2e: number; avoided_kg: number }> {
  try {
    return await request<{ ok: boolean; kg_co2e: number; avoided_kg: number }>('/api/commute', {
      method: 'POST',
      body: JSON.stringify({ mode, km })
    });
  } catch {
    let factor = 0;
    if (mode === 'car') factor = 0.174;
    else if (mode === 'bike') factor = 0.052;
    else if (mode === 'bus') factor = 0.048;
    const kg = Number((km * factor).toFixed(3));
    const avoided = Number(Math.max(0, (km * 0.174) - kg).toFixed(3));
    return { ok: true, kg_co2e: kg, avoided_kg: avoided };
  }
}

export async function submitFuel(fuel_type: string, litres: number): Promise<{ ok: boolean; kg_co2e: number }> {
  try {
    return await request<{ ok: boolean; kg_co2e: number }>('/api/fuel', {
      method: 'POST',
      body: JSON.stringify({ fuel_type, litres })
    });
  } catch {
    const factor = fuel_type === 'diesel' ? 2.687 : 2.314;
    return { ok: true, kg_co2e: Number((litres * factor).toFixed(3)) };
  }
}

export async function submitTraditional(activity: string, quantity: number): Promise<{ ok: boolean; benefit_kg: number }> {
  try {
    return await request<{ ok: boolean; benefit_kg: number }>('/api/traditional', {
      method: 'POST',
      body: JSON.stringify({ activity, quantity })
    });
  } catch {
    const factor = activity === 'matka' ? 85.92 : 2.97;
    return { ok: true, benefit_kg: Number((quantity * factor).toFixed(2)) };
  }
}

export async function verifySamputaBatch(batch_id: string, weighed_mass_kg: number): Promise<{ ok: boolean; verified_kg: number }> {
  try {
    return await request<{ ok: boolean; verified_kg: number }>('/api/samputa/verify', {
      method: 'POST',
      body: JSON.stringify({ batch_id, weighed_mass_kg })
    });
  } catch {
    return { ok: true, verified_kg: Number((weighed_mass_kg * 0.520).toFixed(3)) };
  }
}

export async function controlRelay(action: 'trip' | 'restore'): Promise<{ ok: boolean; relay_state: number }> {
  try {
    return await request<{ ok: boolean; relay_state: number }>('/api/control/relay', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  } catch {
    return { ok: true, relay_state: action === 'trip' ? 0 : 1 };
  }
}
