import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Flame,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Zap,
  Car,
  Receipt,
  Leaf,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const YagnaCycleEngine = () => {
  const {
    yagnaAnalytics,
    powerPulse,
    ecoCommute,
    spendLog,
    compostNest,
    setActiveTab,
    generateSampleActivity,
  } = useApp();

  const {
    badCarbon,
    goodCarbon,
    netCarbon,
    isNetPositive,
    netPercentage,
    aiInsight,
    breakdown,
    liveSecondTick,
  } = yagnaAnalytics;

  // Donut chart calculations
  const totalFlow = badCarbon + goodCarbon;
  const goodRatio = totalFlow > 0 ? goodCarbon / totalFlow : 0.5;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-white/10 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute -top-12 -left-12 w-80 h-80 ambient-coral pointer-events-none rounded-full" />
      <div className="absolute -bottom-12 -right-12 w-80 h-80 ambient-mint pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-coral via-brand-amber to-brand-mint p-0.5 shadow-glow-mint flex items-center justify-center">
            <div className="w-full h-full bg-canvas-dark rounded-[14px] flex items-center justify-center">
              <Flame className="w-7 h-7 text-brand-mint" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-display font-black text-white tracking-tight">
                Yagna Cycle Engine
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isNetPositive
                    ? 'bg-brand-mint/20 text-brand-mint border border-brand-mint/40 shadow-glow-mint'
                    : 'bg-brand-coral/20 text-brand-coral border border-brand-coral/40 shadow-glow-coral'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isNetPositive ? 'bg-brand-mint animate-ping' : 'bg-brand-coral animate-ping'
                  }`}
                />
                {isNetPositive ? 'Net-Negative / Regenerative' : 'Net Carbon Deficit'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Net-Carbon Balance: NET = BAD (Emissions) - GOOD (Sequestration) • Live 1s Heartbeat
            </p>
          </div>
        </div>

        {/* Live Net Offset Badge with 1-Sec Tick Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2.5 rounded-2xl border text-center transition-all ${
              isNetPositive
                ? 'bg-brand-mint/10 border-brand-mint/30 shadow-glow-mint'
                : 'bg-brand-coral/10 border-brand-coral/30 shadow-glow-coral'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Clock className="w-3 h-3 text-brand-mint animate-spin-slow" />
              <span>Net Yagna Balance (1s Live)</span>
            </div>
            <span
              className={`text-xl lg:text-2xl font-display font-black ${
                isNetPositive ? 'text-brand-mint' : 'text-brand-coral'
              }`}
            >
              {isNetPositive ? `+${netPercentage}% Net Offset` : `${netPercentage}% Deficit`}
            </span>
          </div>
        </div>
      </div>

      {/* Centerpiece Comparison: BAD vs GOOD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8">
        {/* Left: BAD CARBON Card */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-brand-coral/5 border border-brand-coral/20 relative group hover:border-brand-coral/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-brand-coral uppercase tracking-wider">
              Bad Carbon (Emissions)
            </span>
            <TrendingUp className="w-4 h-4 text-brand-coral" />
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-display font-black text-brand-coral">{badCarbon}</span>
            <span className="text-sm font-bold text-brand-coral/80">kg CO₂e</span>
          </div>

          {/* Breakdown Pills */}
          <div className="space-y-2 pt-2 border-t border-brand-coral/10 text-xs">
            <div
              onClick={() => setActiveTab('power-pulse')}
              className="flex items-center justify-between p-2 rounded-xl bg-canvas-dark/60 hover:bg-canvas-dark transition-colors cursor-pointer"
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-mint" /> Power Pulse:
              </span>
              <span className="font-mono font-bold text-slate-200">+{breakdown.powerPulse} kg</span>
            </div>
            <div
              onClick={() => setActiveTab('eco-commute')}
              className="flex items-center justify-between p-2 rounded-xl bg-canvas-dark/60 hover:bg-canvas-dark transition-colors cursor-pointer"
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-brand-coral" /> Eco Commute:
              </span>
              <span className="font-mono font-bold text-slate-200">+{breakdown.ecoCommute} kg</span>
            </div>
            <div
              onClick={() => setActiveTab('spend-log')}
              className="flex items-center justify-between p-2 rounded-xl bg-canvas-dark/60 hover:bg-canvas-dark transition-colors cursor-pointer"
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-brand-sky" /> Spend Log:
              </span>
              <span className="font-mono font-bold text-slate-200">+{breakdown.spendLog} kg</span>
            </div>
          </div>
        </div>

        {/* Center: Donut Flow Visualizer */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer SVG Dual Arc */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="72"
                strokeWidth="16"
                stroke="rgba(251, 113, 133, 0.3)"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="72"
                strokeWidth="16"
                stroke="#2DD4BF"
                strokeDasharray={2 * Math.PI * 72}
                strokeDashoffset={2 * Math.PI * 72 * (1 - goodRatio)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700"
              />
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400">NET DELTA</span>
              <span
                className={`text-2xl font-display font-black ${
                  netCarbon <= 0 ? 'text-brand-mint' : 'text-brand-coral'
                }`}
              >
                {netCarbon > 0 ? `+${netCarbon}` : netCarbon}
              </span>
              <span className="text-[10px] text-slate-400">kg CO₂e</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold mt-2">
            <span className="flex items-center gap-1.5 text-brand-coral">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-coral" /> BAD {badCarbon} kg
            </span>
            <span className="flex items-center gap-1.5 text-brand-mint">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-mint" /> GOOD {goodCarbon} kg
            </span>
          </div>
        </div>

        {/* Right: GOOD CARBON Card */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-brand-mint/5 border border-brand-mint/20 relative group hover:border-brand-mint/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-brand-mint uppercase tracking-wider">
              Good Carbon (Sequestration)
            </span>
            <TrendingDown className="w-4 h-4 text-brand-mint" />
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-display font-black text-brand-mint">{goodCarbon}</span>
            <span className="text-sm font-bold text-brand-mint/80">kg CO₂e</span>
          </div>

          {/* Breakdown Pills */}
          <div className="space-y-2 pt-2 border-t border-brand-mint/10 text-xs">
            <div
              onClick={() => setActiveTab('compost-nest')}
              className="flex items-center justify-between p-2 rounded-xl bg-canvas-dark/60 hover:bg-canvas-dark transition-colors cursor-pointer"
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Compost Nest:
              </span>
              <span className="font-mono font-bold text-brand-mint">-{breakdown.compostNest} kg</span>
            </div>
            <div
              onClick={() => setActiveTab('compost-nest')}
              className="flex items-center justify-between p-2 rounded-xl bg-canvas-dark/60 hover:bg-canvas-dark transition-colors cursor-pointer"
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-brand-amber" /> Biogas Thermal:
              </span>
              <span className="font-mono font-bold text-brand-mint">-{breakdown.biogas} kg</span>
            </div>
            <div
              onClick={() => setActiveTab('green-mart')}
              className="flex items-center justify-between p-2 rounded-xl bg-canvas-dark/60 hover:bg-canvas-dark transition-colors cursor-pointer"
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-lavender" /> Eco Choices:
              </span>
              <span className="font-mono font-bold text-brand-mint">-{breakdown.ecoPurchases} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Automated AI Recommendation Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-mint/10 via-brand-sky/10 to-brand-lavender/10 border border-brand-mint/20 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0 shadow-glow-mint">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-brand-mint uppercase tracking-wider block">
              Automated Yagna Recommendation
            </span>
            <p className="text-xs font-medium text-slate-200 mt-0.5">{aiInsight}</p>
          </div>
        </div>

        <button
          onClick={generateSampleActivity}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-2"
        >
          <span>Run IoT Simulation Jitter</span>
          <ArrowRight className="w-3.5 h-3.5 text-brand-mint" />
        </button>
      </div>
    </div>
  );
};
