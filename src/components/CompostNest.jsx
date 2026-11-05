import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Leaf,
  Flame,
  PlusCircle,
  Thermometer,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Clock,
  Droplets,
  Layers,
  Radio,
  Activity,
} from 'lucide-react';

export const CompostNest = () => {
  const { compostNest, depositWetWaste, setCompostMaturity, hardware } = useApp();
  const [wasteInput, setWasteInput] = useState(2.5);
  const [wasteType, setWasteType] = useState('Kitchen vegetable peels');

  const handleDeposit = (e) => {
    e.preventDefault();
    depositWetWaste(parseFloat(wasteInput), wasteType);
  };

  // SVG Circular Gauge calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (compostNest.compostMaturityPct / 100) * circumference;

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 ambient-mint pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-mint">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">Compost Nest</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Automated IoT Sensor Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Node-B ESP32 sensor stream • Weight, moisture, humidity, thermophilic digestion
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-brand-amber" />
          <span className="text-slate-300 font-medium">Chamber: {compostNest.internalTempC}°C</span>
        </div>
      </div>

      {/* Dedicated Automated IoT Sensor Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-canvas-dark/60">
          <Droplets className="w-4 h-4 text-brand-sky shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Chamber Humidity</span>
            <span className="text-sm font-mono font-bold text-brand-sky">{compostNest.humidityPct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-canvas-dark/60">
          <Thermometer className="w-4 h-4 text-brand-coral shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Thermophilic Temp</span>
            <span className="text-sm font-mono font-bold text-brand-coral">{compostNest.internalTempC}°C</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-canvas-dark/60">
          <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Soil Moisture</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{compostNest.soilMoisturePct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-canvas-dark/60">
          <Layers className="w-4 h-4 text-brand-amber shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Bin Fill Level</span>
            <span className="text-sm font-mono font-bold text-brand-amber">{compostNest.binFillPct}%</span>
          </div>
        </div>
      </div>

      {/* Primary Highlights: Circular Gauge + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-6">
        {/* Circular Compost Maturity Dial */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-canvas-dark/60 border border-white/5 relative">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-800"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-brand-mint transition-all duration-700 ease-out"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Dial Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-display font-extrabold text-white">
                {compostNest.compostMaturityPct}%
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-brand-mint">
                Matured
              </span>
            </div>
          </div>

          <div className="text-center mt-3">
            <span className="text-xs text-slate-300 font-medium block">
              Batch Ready in: <strong className="text-white">{compostNest.daysToReady} days</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              Optimal thermophilic microbial digestion active
            </span>
          </div>
        </div>

        {/* Sequestration Impact Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 font-medium block mb-1">Methane Suppressed</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-emerald-400">
                {compostNest.methaneOffsetKg}
              </span>
              <span className="text-xs font-semibold text-emerald-400">kg CO₂e</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Direct anaerobic diversion from landfill
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 font-medium block mb-1">Biogas Equivalent Energy</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-brand-amber">
                {compostNest.biogasEquivalentKwh}
              </span>
              <span className="text-xs font-semibold text-brand-amber">kWh thermal</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Displacing fossil LPG for cooking
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 font-medium block mb-1">Wet Waste Today</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-display font-extrabold text-white">
                {compostNest.wetWasteTodayKg}
              </span>
              <span className="text-xs font-semibold text-slate-400">kg</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Monthly total: {compostNest.wetWasteMonthKg} kg
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 font-medium block mb-1">Biochar Added</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-display font-extrabold text-brand-mint">
                {compostNest.biocharAddedKg}
              </span>
              <span className="text-xs font-semibold text-brand-mint">kg</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Permanent 100-year recalcitrant carbon sink
            </span>
          </div>
        </div>
      </div>

      {/* Manual Scrap Deposit Form */}
      <form
        onSubmit={handleDeposit}
        className="p-4 rounded-2xl bg-canvas-dark/60 border border-white/5 mb-6 flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 shrink-0">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Record Kitchen Scrap Deposit
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={wasteInput}
                onChange={(e) => setWasteInput(e.target.value)}
                className="w-24 bg-canvas-card border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-mint"
              />
              <span className="text-xs text-slate-400">kg</span>
              <input
                type="text"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                placeholder="Peels, grounds, trimmings..."
                className="flex-1 bg-canvas-card border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-mint"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-brand-mint text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-mint transition-all flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Add Waste & Earn ₹-Credits</span>
        </button>
      </form>

      {/* Recent Deposits Feed */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Recent Compost Batches & Deposits
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {compostNest.recentDeposits.map((dep) => (
            <div
              key={dep.id}
              className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-white block">{dep.weightKg} kg</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[140px] block">
                  {dep.type}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">{dep.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export const SamputaBox = CompostNest;

