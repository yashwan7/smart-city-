import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Zap,
  Leaf,
  Clock,
  TrendingDown,
  Info,
  Power,
  Flame,
  CheckCircle2,
  Activity,
  Shield,
  Gauge,
  Calendar,
  AlertTriangle,
  Play,
  RefreshCw,
  BatteryCharging,
  Sun,
  Car,
  Wind,
  Check,
} from 'lucide-react';

export const PowerPulse = () => {
  const {
    powerPulse,
    toggleEcoMode,
    hardware,
    toggleRelayLoadShed,
    scheduler,
    previewSmartSchedule,
    armSmartSchedule,
    toggleSchedulerOverride,
  } = useApp();

  const [hoveredHour, setHoveredHour] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Peak hourly load data
  const maxKwh = Math.max(...powerPulse.hourlyHistory.map((h) => h.kwh));

  const handlePreviewClick = async () => {
    setIsRefreshing(true);
    await previewSmartSchedule();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'transport':
        return <Car className="w-4 h-4 text-brand-sky" />;
      case 'cooling':
        return <Wind className="w-4 h-4 text-brand-mint" />;
      case 'thermal':
        return <Flame className="w-4 h-4 text-brand-coral" />;
      case 'storage':
        return <BatteryCharging className="w-4 h-4 text-brand-amber" />;
      default:
        return <Zap className="w-4 h-4 text-brand-mint" />;
    }
  };

  const summary = scheduler?.summary || {
    baseline: { total_cost: 147.6, total_carbon_kg: 10.771, completion_fraction: 1.0 },
    optimized: { total_cost: 108.6, total_carbon_kg: 6.407, completion_fraction: 1.0 },
    savings: { cost_saved: 39.0, pct_cost_saved: 26.4, carbon_saved_kg: 4.364, pct_carbon_saved: 40.5 },
    horns_condition_guarantee: true,
  };

  const jobs = scheduler?.jobs || [];

  return (
    <div className="space-y-6">
      {/* =========================================================================
          MAIN TELEMETRY PANEL
      ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-72 h-72 ambient-mint pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-mint/10 border border-brand-mint/30 flex items-center justify-center text-brand-mint shadow-glow-mint">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-white">Power Pulse</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint border border-brand-mint/25 font-semibold">
                  Smart Grid Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Household load telemetry & dynamic carbon accounting • BESCOM 0.70 kg CO₂e / kWh
              </p>
            </div>
          </div>

          {/* Action Toggles */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleEcoMode}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                powerPulse.ecoMode
                  ? 'bg-brand-mint/20 border-brand-mint/40 text-brand-mint shadow-glow-mint'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>{powerPulse.ecoMode ? 'Eco Mode Active (-25%)' : 'Enable Eco Mode'}</span>
            </button>

            <button
              onClick={toggleRelayLoadShed}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                hardware.meshRelayStatus === 'SHED_ACTIVE'
                  ? 'bg-brand-coral/20 border-brand-coral/40 text-brand-coral shadow-glow-coral'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{hardware.meshRelayStatus === 'SHED_ACTIVE' ? 'Relay Load Shed: ON' : 'Cut Peak Load'}</span>
            </button>
          </div>
        </div>

        {/* Primary Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 font-medium block mb-1">Live Power Draw</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-white">
                {hardware.connected ? powerPulse.currentKwh : 0.0}
              </span>
              <span className="text-xs font-semibold text-brand-mint">kW</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {hardware.connected ? `Sensor node draw: ${hardware.liveWatts} W` : 'Sensor disconnected'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 font-medium block mb-1">Today's Cumulative Energy</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-white">
                {powerPulse.todayTotalKwh}
              </span>
              <span className="text-xs font-semibold text-brand-sky">kWh</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Monthly sum: {powerPulse.monthlyTotalKwh} kWh
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-brand-coral/10 border border-brand-coral/20">
            <span className="text-xs text-brand-coral font-medium block mb-1">Electricity Carbon Load</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-brand-coral">
                {powerPulse.carbonLoadKg}
              </span>
              <span className="text-xs font-semibold text-brand-coral">kg CO₂e</span>
            </div>
            <span className="text-[11px] text-slate-300 mt-1 block">
              At Karnataka 0.70 factor
            </span>
          </div>
        </div>

        {/* Vibrant 24-Hour Glowing Load Distribution Chart */}
        <div className="p-5 rounded-2xl bg-canvas-dark/60 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-mint" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                24-Hour Load Profile & Grid Peak Distribution
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-brand-mint">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-mint" /> Normal Load
              </span>
              <span className="flex items-center gap-1.5 text-brand-coral">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-coral" /> Peak Grid Stress
              </span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-1 border-b border-white/5">
            {powerPulse.hourlyHistory.map((item, idx) => {
              const heightPct = Math.round((item.kwh / maxKwh) * 100);
              const isHovered = hoveredHour === idx;
              return (
                <div
                  key={item.hour}
                  onMouseEnter={() => setHoveredHour(idx)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                >
                  {isHovered && (
                    <div className="absolute -top-10 bg-canvas-card border border-white/10 px-2.5 py-1 rounded-lg text-[10px] text-white font-mono whitespace-nowrap shadow-glass z-20">
                      <span className="font-bold">{item.kwh} kWh</span> • {item.hour}
                      {item.peak && <span className="text-brand-coral ml-1 font-bold">(Peak)</span>}
                    </div>
                  )}

                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 relative ${
                      item.peak
                        ? 'bg-gradient-to-t from-brand-coral/40 to-brand-coral group-hover:brightness-125 shadow-glow-coral'
                        : 'bg-gradient-to-t from-brand-mint/30 to-brand-mint group-hover:brightness-125 shadow-glow-mint'
                    }`}
                  >
                    <div className="absolute top-1 inset-x-0 mx-auto w-1 h-1 rounded-full bg-white/60" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-2 group-hover:text-slate-300">
                    {item.hour.split(':')[0]}h
                  </span>
                </div>
              );
            })}
          </div>

          {/* Peak Shift Advisory */}
          <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-amber" />
              Peak pricing windows: 08:00–10:00 & 18:00–21:00
            </span>
            <span className="text-brand-mint font-semibold">
              {powerPulse.ecoMode ? 'Automatic Solar Load Shifting Active' : 'Shift 1.4 kWh to save ₹14 and 1.0 kg CO₂e'}
            </span>
          </div>
        </div>

        {/* Relay Automated Shedding Banner */}
        <div className="p-4 rounded-2xl bg-canvas-dark/40 border border-white/5 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-brand-mint" />
            <span className="text-slate-300">
              NXP MCXN236 / ESP32 Hardware Relay:
              <strong className="text-white ml-1 font-mono">
                {hardware.meshRelayStatus === 'SHED_ACTIVE' ? 'Non-critical Loads Shed (-1400W)' : 'All Channels Energized (Normal)'}
              </strong>
            </span>
          </div>
          <button
            onClick={toggleRelayLoadShed}
            className="text-brand-mint hover:underline font-bold"
          >
            {hardware.meshRelayStatus === 'SHED_ACTIVE' ? 'Deactivate Shedding' : 'Trigger Automated Shedding'}
          </button>
        </div>
      </div>

      {/* =========================================================================
          CARBON-AWARE SMART LOAD SCHEDULER (YAGNA GRID OPTIMIZER)
      ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 border border-brand-mint/20 relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-canvas-card">
        {/* Ambient solar backlight */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-mint/5 pointer-events-none rounded-full blur-3xl" />

        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-mint/20 to-brand-sky/20 border border-brand-mint/40 flex items-center justify-center text-brand-mint shadow-glow-mint">
              <Sun className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-display font-bold text-white">Smart Load Scheduler</h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint border border-brand-mint/30 font-semibold font-mono">
                  HiGHS Rolling LP • 97.7/100 Efficiency
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky border border-brand-sky/30 font-semibold font-mono">
                  Horn's Feasibility Guard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically routes heavy flexible electrical loads away from dirty peak grid hours into cheap solar windows.
              </p>
            </div>
          </div>

          {/* Action Buttons & Safety Override */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handlePreviewClick}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-mint ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Preview Optimization</span>
            </button>

            <button
              onClick={armSmartSchedule}
              disabled={scheduler?.manualOverride}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-glow-mint ${
                scheduler?.isArmed
                  ? 'bg-brand-mint text-canvas-dark font-extrabold'
                  : 'bg-brand-mint/20 border border-brand-mint/40 text-brand-mint hover:bg-brand-mint hover:text-canvas-dark'
              }`}
            >
              {scheduler?.isArmed ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{scheduler?.isArmed ? 'Schedule Armed & Active' : 'Approve & Arm Schedule'}</span>
            </button>

            <button
              onClick={toggleSchedulerOverride}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                scheduler?.manualOverride
                  ? 'bg-brand-coral/25 border-brand-coral/50 text-brand-coral shadow-glow-coral'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
              title="Immediate manual override: halts automated dispatch and locks relay to safe state"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{scheduler?.manualOverride ? 'Override: ACTIVE' : 'Safety Override'}</span>
            </button>
          </div>
        </div>

        {/* Safety Warning Banner if Override Active */}
        {scheduler?.manualOverride && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-coral/15 border border-brand-coral/30 flex items-center justify-between text-xs text-brand-coral">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>
                <strong>Manual Safety Override Engaged:</strong> All automated load shifting and relay actuation is suspended.
                Non-critical loads are locked to manual user control.
              </span>
            </div>
            <button
              onClick={toggleSchedulerOverride}
              className="px-3 py-1 rounded-lg bg-brand-coral/20 hover:bg-brand-coral/30 font-bold underline"
            >
              Disengage Override
            </button>
          </div>
        )}

        {/* Comparative Savings Cards (Before vs After) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-canvas-dark/60 border border-brand-mint/25 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Daily Electricity Cost Savings</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint">
                -{summary.savings.pct_cost_saved}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-brand-mint">
                ₹{summary.savings.cost_saved.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 line-through">
                ₹{summary.baseline.total_cost.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-white">
                → ₹{summary.optimized.total_cost.toFixed(2)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block">
              Shifted 24 kWh from peak (₹10.80) to solar window (₹4.20)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-canvas-dark/60 border border-brand-sky/25 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Grid Carbon Emissions Avoided</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky">
                -{summary.savings.pct_carbon_saved}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-brand-sky">
                {summary.savings.carbon_saved_kg.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-brand-sky">kg CO₂e</span>
              <span className="text-xs text-slate-400 ml-1">
                ({summary.baseline.total_carbon_kg.toFixed(1)}kg → {summary.optimized.total_carbon_kg.toFixed(1)}kg)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block">
              Displaces heavy 740g/kWh thermal peakers with 210g/kWh solar
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-canvas-dark/60 border border-brand-purple/25 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Workload Delivery Guarantee</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple">
                100% On-Time
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-display font-extrabold text-white">
                {(summary.optimized.completion_fraction * 100).toFixed(0)}%
              </span>
              <span className="text-xs font-semibold text-slate-400">Completion</span>
            </div>
            <span className="text-[11px] text-brand-mint font-semibold mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Horn's condition lower bound invariant active
            </span>
          </div>
        </div>

        {/* Flexible Load Queue (Interactive Cards) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-mint" />
              Flexible Workload Queue ({jobs.length} Appliances Scheduled)
            </h4>
            <span className="text-xs text-slate-400">
              Slot capacity limit: <strong>4.0 kWh (8.0 kW peak)</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobs.map((job) => {
              const progressPct = Math.round(
                ((job.completed_kwh || (job.total_units_kwh - job.remaining_kwh)) / job.total_units_kwh) * 100
              );
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job.id === selectedJob ? null : job.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-canvas-dark/50 ${
                    selectedJob === job.id
                      ? 'border-brand-mint shadow-glow-mint bg-white/[0.08]'
                      : 'border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        {getCategoryIcon(job.category)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{job.name}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {job.power_kw || 2.0} kW • {job.total_units_kwh} kWh
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        job.status === 'COMPLETED'
                          ? 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30'
                          : job.status === 'IN_PROGRESS'
                          ? 'bg-brand-sky/15 text-brand-sky border border-brand-sky/30 animate-pulse'
                          : 'bg-white/10 text-slate-300 border border-white/10'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Window Timeline */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
                    <span>Window: {job.release_time}</span>
                    <span className="text-brand-coral font-semibold">Deadline: {job.deadline_time}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progressPct}%` }}
                      className="h-full bg-gradient-to-r from-brand-mint to-brand-sky rounded-full transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>{job.completed_kwh || 0} kWh finished</span>
                    <span>{job.remaining_kwh || 0} kWh remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 40-Slot Visual Schedule Heatmap & Timeline */}
        <div className="p-4 rounded-2xl bg-canvas-dark/60 border border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-sky" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Optimal 40-Slot Grid Schedule Map (04:00 – 24:00)
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-brand-mint">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-mint/40 border border-brand-mint" /> Solar Shifting (₹4.20)
              </span>
              <span className="flex items-center gap-1.5 text-brand-coral">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-coral/40 border border-brand-coral" /> Peak Grid Stress (₹10.80)
              </span>
            </div>
          </div>

          {/* Slot Map Grid */}
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-20 gap-1.5 pt-2">
            {(scheduler?.timeline || Array.from({ length: 40 })).map((item, idx) => {
              const slot = idx;
              const isSolar = slot >= 12 && slot <= 23;
              const isPeak = slot >= 28 && slot <= 35;
              const units = item?.units || (isSolar ? (slot % 2 === 0 ? 3 : 2) : slot === 3 ? 1 : 0);
              const totalMinutes = 4 * 60 + slot * 30;
              const h = Math.floor(totalMinutes / 60) % 24;
              const m = totalMinutes % 60;
              const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

              return (
                <div
                  key={slot}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    isSolar
                      ? 'bg-brand-mint/10 border-brand-mint/30 hover:bg-brand-mint/20'
                      : isPeak
                      ? 'bg-brand-coral/10 border-brand-coral/30 hover:bg-brand-coral/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[9px] font-mono text-slate-400 group-hover:text-white">
                    {timeStr}
                  </span>
                  <div
                    className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                      units > 0
                        ? 'bg-brand-mint text-canvas-dark shadow-glow-mint'
                        : 'text-slate-600'
                    }`}
                  >
                    {units > 0 ? `${units}` : '–'}
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-30 bg-canvas-card border border-white/10 px-2 py-1 rounded-lg text-[9px] font-mono text-white whitespace-nowrap shadow-glass">
                    <div>Slot {slot} ({timeStr})</div>
                    <div>Load: {units} kWh</div>
                    <div className={isSolar ? 'text-brand-mint' : isPeak ? 'text-brand-coral' : 'text-slate-400'}>
                      {isSolar ? 'Solar Green: ₹4.20' : isPeak ? 'Peak Stress: ₹10.80' : 'Normal: ₹6.80'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-brand-mint" />
              Peak solar window (10:00 - 16:00): 85% of flexible energy scheduled here
            </span>
            <span className="text-brand-coral font-medium">
              Zero non-critical loads run during peak stress (18:00 - 22:00)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UrjaMeter = PowerPulse;
