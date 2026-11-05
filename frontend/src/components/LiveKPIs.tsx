import React, { useState } from 'react';
import type { NetSummary } from '../lib/types';
import { formatKg, formatWatts, formatKwh } from '../lib/format';
import { submitCommute, submitFuel } from '../lib/api';
import { Zap, Activity, ArrowDownRight, ArrowUpRight, Car, Bus, Bike, Footprints, CheckCircle2, Info } from 'lucide-react';

interface LiveKPIsProps {
  net: NetSummary | null;
  onRefresh: () => void;
}

export const LiveKPIs: React.FC<LiveKPIsProps> = ({ net, onRefresh }) => {
  const [commuteStatus, setCommuteStatus] = useState<string | null>(null);
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelType, setFuelType] = useState('diesel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const badKg = net?.bad_kg ?? 0;
  const goodKg = net?.good_kg ?? 0;
  const netKg = Number((badKg - goodKg).toFixed(2));
  const isNetNegative = netKg < 0;

  const quality = net?.quality || { measured: 60, estimated: 15, manual: 25, assumed: 0 };
  const verifiedGood = net?.good_verified_kg ?? 0;
  const projectedGood = net?.good_projected_kg ?? (goodKg - verifiedGood);

  const handleCommute = async (mode: string) => {
    setIsSubmitting(true);
    try {
      const res = await submitCommute(mode, 12);
      setCommuteStatus(`Logged ${mode.toUpperCase()} (12 km): +${res.kg_co2e} kg CO2e (${res.avoided_kg > 0 ? `Saved ${res.avoided_kg} kg vs Car` : 'Car baseline'})`);
      onRefresh();
    } catch (err: unknown) {
      setCommuteStatus(err instanceof Error ? err.message : 'Failed to log commute');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setCommuteStatus(null), 5000);
    }
  };

  const handleFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    const litres = parseFloat(fuelLitres);
    if (isNaN(litres) || litres <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await submitFuel(fuelType, litres);
      setCommuteStatus(`Logged ${litres}L ${fuelType.toUpperCase()}: +${res.kg_co2e} kg CO2e`);
      setFuelLitres('');
      onRefresh();
    } catch (err: unknown) {
      setCommuteStatus(err instanceof Error ? err.message : 'Failed to log fuel');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setCommuteStatus(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary NET Carbon Callout Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition ${
        isNetNegative
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-[#ffffff] to-[#faf8f5]'
          : 'border-[#ded7c8] bg-[#ffffff]'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600">
                Accounting Boundary:
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#f2ede2] text-stone-800 border border-[#ded7c8]">
                {net?.accounting_boundary || 'Campus Physical Ledger (Node A1 & B1)'}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">NET CARBON BALANCE:</span>
              <span className={`text-4xl lg:text-5xl font-black font-mono tracking-tight ${
                isNetNegative ? 'text-emerald-700' : 'text-stone-900'
              }`}>
                {isNetNegative ? '' : '+'}{formatKg(netKg)} <span className="text-xl font-medium text-stone-500">kg CO2e</span>
              </span>
            </div>
            <p className="text-xs text-stone-600 max-w-2xl">
              {isNetNegative ? (
                <span className="text-emerald-800 flex items-center gap-1.5 font-medium">
                  <Info className="w-4 h-4 shrink-0 text-emerald-700" />
                  <strong>Net-Carbon Negative:</strong> Benefit credits (GOOD) exceed recorded emissions (BAD) within this monitored boundary. Note: This represents local campus ledger balance, not an independently tradeable carbon certificate.
                </span>
              ) : (
                'NET = Emitted carbon (BAD) minus verified/projected benefits (GOOD). Automated edge controls act to drive this toward zero or negative.'
              )}
            </p>
          </div>

          {/* Data Quality Spectrum Pill */}
          <div className="rounded-xl border border-[#ded7c8] bg-[#fdfcf9] p-4 shrink-0 min-w-[280px] shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
              Data Quality Split
            </span>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-200">
              <div style={{ width: `${quality.measured}%` }} className="bg-emerald-600" title={`Measured: ${quality.measured}%`} />
              <div style={{ width: `${quality.estimated}%` }} className="bg-amber-500" title={`Estimated: ${quality.estimated}%`} />
              <div style={{ width: `${quality.manual}%` }} className="bg-sky-500" title={`Manual: ${quality.manual}%`} />
              <div style={{ width: `${quality.assumed}%` }} className="bg-stone-400" title={`Assumed: ${quality.assumed}%`} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-mono font-medium">
              <span className="text-emerald-800">● Measured: {quality.measured}%</span>
              <span className="text-amber-800">● Estimated: {quality.estimated}%</span>
              <span className="text-sky-800">● Manual: {quality.manual}%</span>
              <span className="text-stone-600">● Assumed: {quality.assumed}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Quad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BAD Carbon Card */}
        <div className="rounded-2xl border border-rose-200 bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold uppercase tracking-wider">BAD (Emitted Carbon)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-rose-700 tracking-tight">
              {formatKg(badKg)}
            </span>
            <span className="text-xs font-medium text-stone-500">kg CO2e</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 border-t border-stone-100 pt-2.5">
            <span>Electricity, Fuel & Landfill</span>
            <span className="font-mono text-rose-800 font-medium">Sum of Scopes</span>
          </div>
        </div>

        {/* GOOD Carbon Card */}
        <div className="rounded-2xl border border-emerald-200 bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">GOOD (Carbon Benefit)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
              {formatKg(goodKg)}
            </span>
            <span className="text-xs font-medium text-stone-500">kg CO2e</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 border-t border-stone-100 pt-2.5">
            <span className="text-[11px] text-emerald-800 font-medium">Verified: {formatKg(verifiedGood)} kg</span>
            <span className="text-[11px] text-stone-500">Projected: {formatKg(projectedGood)} kg</span>
          </div>
        </div>

        {/* Real-time Power (W) */}
        <div className="rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-700">
            <span className="text-xs font-bold uppercase tracking-wider">Current Power</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-stone-900 tracking-tight">
              {formatWatts(net?.power_w)}
            </span>
            <span className="text-xs font-medium text-stone-500">Watts (W)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 border-t border-stone-100 pt-2.5">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              INA219 High-Side
            </span>
            <span className="font-mono text-stone-500">Node A1</span>
          </div>
        </div>

        {/* Energy Today (kWh) */}
        <div className="rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-700">
            <span className="text-xs font-bold uppercase tracking-wider">Energy Today</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-sky-700 tracking-tight">
              {formatKwh(net?.kwh_today)}
            </span>
            <span className="text-xs font-medium text-stone-500">kWh</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 border-t border-stone-100 pt-2.5">
            <span>Factor: 0.716 kg/kWh</span>
            <span className="font-mono text-stone-500">CEA v19.0</span>
          </div>
        </div>
      </div>

      {/* Operational Actions Grid: Commute & Fuel Kiosks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Commute Button Kiosk */}
        <div className="rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>Commute Check-In</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                  ESP32 #1 Physical Kiosk
                </span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Emulates the 4 campus buttons. Standard 12 km round-trip commute.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <button
              onClick={() => handleCommute('walk')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition group disabled:opacity-50"
            >
              <Footprints className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-bold">Walk / Cycle</span>
              <span className="text-[10px] text-emerald-700 mt-0.5">0.00 kg (Zero)</span>
            </button>

            <button
              onClick={() => handleCommute('bus')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 transition group disabled:opacity-50"
            >
              <Bus className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-bold">BMTC Bus</span>
              <span className="text-[10px] text-sky-700 mt-0.5">0.58 kg CO2e</span>
            </button>

            <button
              onClick={() => handleCommute('bike')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition group disabled:opacity-50"
            >
              <Bike className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-bold">Two-Wheeler</span>
              <span className="text-[10px] text-amber-700 mt-0.5">0.62 kg CO2e</span>
            </button>

            <button
              onClick={() => handleCommute('car')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 transition group disabled:opacity-50"
            >
              <Car className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
              <span className="text-xs font-bold">Car (ICE)</span>
              <span className="text-[10px] text-rose-700 mt-0.5">2.09 kg CO2e</span>
            </button>
          </div>
        </div>

        {/* Stationary Generator / Fuel Logger */}
        <div className="rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>Fuel Combustion Entry</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  Manual Entry
                </span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Record diesel generator run or equipment fuel batch in litres.
              </p>
            </div>
          </div>

          <form onSubmit={handleFuel} className="mt-4 flex flex-wrap items-center gap-2.5">
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] px-3 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:border-emerald-600"
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
              className="flex-1 min-w-[120px] rounded-xl border border-[#ded7c8] bg-[#f8f6f0] px-3 py-2 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={isSubmitting || !fuelLitres}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
            >
              Record Fuel
            </button>
          </form>
        </div>
      </div>

      {/* Activity Feedback Toast */}
      {commuteStatus && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{commuteStatus}</span>
        </div>
      )}
    </div>
  );
};
