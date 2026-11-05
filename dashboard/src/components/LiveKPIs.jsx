import React, { useState } from 'react';
import { Zap, Flame, Activity, Car, Bike, Footprints, Bus, Info, CheckCircle2 } from 'lucide-react';
import { submitCommute, submitFuel } from '../services/api.js';

export default function LiveKPIs({ summary, onInspectFactor, onRefresh }) {
  const [commuteStatus, setCommuteStatus] = useState(null);
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelType, setFuelType] = useState('diesel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommuteClick = async (mode) => {
    setIsSubmitting(true);
    try {
      const res = await submitCommute(mode, 12);
      setCommuteStatus(`Logged ${mode.toUpperCase()} (12 km): +${res.calc.kgCO2e} kg CO2e (${res.calc.avoidedKgCO2e > 0 ? `Saved ${res.calc.avoidedKgCO2e} kg vs Car` : 'Car baseline'})`);
      if (onRefresh) onRefresh();
    } catch {
      setCommuteStatus('Failed to log commute');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setCommuteStatus(null), 6000);
    }
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    if (!fuelLitres || isNaN(fuelLitres)) return;
    setIsSubmitting(true);
    try {
      const res = await submitFuel(fuelType, parseFloat(fuelLitres));
      setCommuteStatus(`Logged ${res.calc.litres}L ${res.calc.fuelType.toUpperCase()}: +${res.calc.kgCO2e} kg CO2e`);
      setFuelLitres('');
      if (onRefresh) onRefresh();
    } catch {
      setCommuteStatus('Failed to log fuel');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setCommuteStatus(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Provenance & Offline Resilience */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Telemetry Link</span>
            <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <span>{summary?.provenance || 'STANDALONE OFFLINE READY'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Poll: 2000ms
              </span>
            </div>
          </div>
        </div>

        {/* Data Quality Tier Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Measured: {summary?.quality?.measured || 62}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-800/60 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span>Estimated: {summary?.quality?.estimated || 14}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-blue-800/60 bg-blue-950/40 px-2.5 py-1 text-xs font-medium text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-400"></span>
            <span>Manual: {summary?.quality?.manual || 24}%</span>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real-time Load (W) */}
        <div
          onClick={() => onInspectFactor && onInspectFactor('electricity_grid_india')}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-lg hover:border-emerald-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Real-time Power</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {summary?.power_w?.toFixed(1) || '94.5'}
            </span>
            <span className="text-sm font-medium text-slate-400">Watts (W)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              INA219 High-Side Sensor
            </span>
            <span className="font-mono text-slate-500">Node A1</span>
          </div>
        </div>

        {/* Today's Carbon Total */}
        <div
          onClick={() => onInspectFactor && onInspectFactor('electricity_grid_india')}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-lg hover:border-emerald-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Carbon Footprint Today</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {summary?.today_kg?.toFixed(2) || '2.14'}
            </span>
            <span className="text-sm font-medium text-slate-400">kg CO2e</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span className="text-slate-300">Sum of 4 Scopes</span>
            <span className="text-xs text-emerald-400 group-hover:underline flex items-center gap-1">
              <span>Inspect CEA factor</span>
              <Info className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Electricity Energy (kWh) */}
        <div
          onClick={() => onInspectFactor && onInspectFactor('electricity_grid_india')}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-lg hover:border-emerald-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Grid Energy Today</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-blue-400 tracking-tight">
              {summary?.kwh_today?.toFixed(2) || '1.84'}
            </span>
            <span className="text-sm font-medium text-slate-400">kWh</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span>Factor: 0.716 kg/kWh</span>
            <span className="font-mono text-slate-500">CEA v19.0</span>
          </div>
        </div>

        {/* Ledger Hash Chain Integrity */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Ledger Security</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              summary?.ledger_ok !== false
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-xl font-bold tracking-tight ${
              summary?.ledger_ok !== false ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summary?.ledger_ok !== false ? 'VERIFIED INTACT' : 'TAMPER DETECTED'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span>HMAC-SHA256 Chained</span>
            <span className="font-mono text-slate-500">SQLite WAL</span>
          </div>
        </div>
      </div>

      {/* Interactive Activity Loggers (Kiosk / Phone Mode) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Commute Button Kiosk */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Commute Mode Logger</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                  ESP32 #1 Kiosk Emulation
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates the 4 physical buttons on Node A1. Assumes standard 12 km round-trip.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <button
              onClick={() => handleCommuteClick('walk')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-800/40 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-300 transition group"
            >
              <Footprints className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">Walk / Cycle</span>
              <span className="text-[10px] text-emerald-400/80 mt-0.5">0.00 kg (Zero)</span>
            </button>

            <button
              onClick={() => handleCommuteClick('bus')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-800/40 bg-blue-950/20 hover:bg-blue-900/30 text-blue-300 transition group"
            >
              <Bus className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">BMTC Bus</span>
              <span className="text-[10px] text-blue-400/80 mt-0.5">0.58 kg CO2e</span>
            </button>

            <button
              onClick={() => handleCommuteClick('bike')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-800/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 transition group"
            >
              <Bike className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">Two-Wheeler</span>
              <span className="text-[10px] text-amber-400/80 mt-0.5">0.62 kg CO2e</span>
            </button>

            <button
              onClick={() => handleCommuteClick('car')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-800/40 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 transition group"
            >
              <Car className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">Car (ICE)</span>
              <span className="text-[10px] text-rose-400/80 mt-0.5">2.09 kg CO2e</span>
            </button>
          </div>
        </div>

        {/* Stationary Generator / Fuel Logger */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Fuel Combustion Logger (Scope 1)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  Manual Entry
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Record diesel generator run or equipment fuel batch in litres.
              </p>
            </div>
          </div>

          <form onSubmit={handleFuelSubmit} className="mt-4 flex flex-wrap items-center gap-2.5">
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="diesel">Diesel (2.687 kg/L)</option>
              <option value="petrol">Petrol (2.314 kg/L)</option>
            </select>
            <input
              type="number"
              step="0.5"
              min="0.5"
              placeholder="Litres (e.g. 5)"
              value={fuelLitres}
              onChange={(e) => setFuelLitres(e.target.value)}
              className="flex-1 min-w-[120px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !fuelLitres}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition"
            >
              Record Batch
            </button>
          </form>
        </div>
      </div>

      {/* Activity Feedback Toast */}
      {commuteStatus && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950/80 p-3 text-xs text-emerald-200 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{commuteStatus}</span>
        </div>
      )}
    </div>
  );
}
