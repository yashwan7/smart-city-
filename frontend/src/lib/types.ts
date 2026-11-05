export type DataQuality = 'measured' | 'estimated' | 'manual' | 'assumed';

export interface QualitySplit {
  measured: number;
  estimated: number;
  manual: number;
  assumed: number;
}

export interface NetSummary {
  bad_kg: number;
  good_kg: number;
  net_kg: number;
  good_verified_kg: number;
  good_projected_kg: number;
  power_w: number;
  kwh_today: number;
  quality: QualitySplit;
  ledger_ok: boolean;
  updated: string;
  accounting_boundary: string;
}

export interface BreakdownItem {
  category: 'electricity' | 'transport' | 'fuel' | 'waste';
  label: string;
  kg: number;
  pct: number;
  activity_value: number;
  activity_unit: string;
  factor_id: string;
  factor_value: number;
  factor_unit: string;
  source: string;
  quality: DataQuality;
  citation?: string;
  verified: boolean;
}

export interface TimeseriesPoint {
  time: string;
  timestamp?: number;
  bad_kg: number;
  good_verified_kg: number;
  good_projected_kg: number;
  net_kg: number;
  power_w?: number;
  relay_event?: string | null;
  lid_event?: string | null;
}

export interface LedgerVerification {
  ok: boolean;
  records: number;
  first_bad_id: number | null;
  root_hash?: string;
  last_hash?: string;
  checked_at?: string;
}

export interface RunState {
  avg_w: number;
  kwh_per_h: number;
  kg_per_h: number;
  duration_s?: number;
}

export interface RunComparison {
  baseline: RunState | null;
  optimized: RunState | null;
  saved_kwh_per_h: number;
  saved_kg_per_h: number;
  pct_saved: number;
  relay_event?: string | null;
  time_range?: string | null;
  has_data: boolean;
}

export interface Recommendation {
  id: string;
  title: string;
  action: string;
  trigger_reason: string;
  supporting_measurements: string;
  saving_kwh_day: number;
  saving_kg_day: number;
  quality: DataQuality;
  basis: string;
  text: string;
  validated: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface DeviceNode {
  node: string;
  name: string;
  status: 'online' | 'offline' | 'unknown';
  last_seen: string;
  fw_version: string;
  last_seq?: number;
  bad_sig_count: number;
  sensors: string[];
  current_state?: string;
}

export interface SamputaBatch {
  fill_pct: number;
  capacity_litres: number;
  surface_distance_cm: number;
  last_reading_time: string;
  lid_state: 'closed' | 'open';
  rain_detected: boolean;
  batch_id: string;
  status: 'accumulating' | 'curing' | 'verified' | 'harvested';
  projected_kg_co2e: number;
  verified_kg_co2e: number;
  weighed_mass_kg?: number | null;
  weighed_at?: string | null;
}

export interface VernacularRecord {
  id: string;
  activity: 'matka' | 'handloom' | string;
  quantity: number;
  unit: string;
  formula: string;
  factor: number;
  factor_unit: string;
  source: string;
  haircut_pct: number;
  benefit_kg_co2e: number;
  quality: DataQuality;
  verification_status: 'projected' | 'verified' | 'assumed' | 'unverified';
  timestamp: string;
}

export interface LiveWebSocketMessage {
  type: 'telemetry' | 'relay' | 'lid' | 'ledger' | 'batch';
  node?: string;
  ts: number;
  data: Partial<NetSummary> & Record<string, unknown>;
}

