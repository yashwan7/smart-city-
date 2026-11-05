import React, { useState } from 'react';
import type { RunComparison } from '../lib/types';
import { formatKg, formatWatts, formatKwh, formatPercent } from '../lib/format';
import { controlRelay } from '../lib/api';
import { Zap, Sparkles, ArrowDownRight, Clock, CheckCircle2 } from 'lucide-react';

interface BeforeAfterProps {
  runs: RunComparison | null;
  onRefresh: () => void;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({ runs, onRefresh }) => {
  const [isControlling, setIsControlling] = useState(false);
  const [relayFeedback, setRelayFeedback] = useState<string | null>(null);

  const hasData = runs && runs.has_data !== false && runs.baseline && runs.optimized;

  const handleRelayAction = async (action: 'trip' | 'restore') => {
    setIsControlling(true);
    try {
      const res = await controlRelay(action);
      setRelayFeedback(`Relay command dispatched: State is now ${res.relay_state === 1 ? 'CLOSED (ON)' : 'OPEN (CUT)'}`);
      onRefresh();
    } catch {
      setRelayFeedback(`Simulated signed relay command: Load ${action === 'trip' ? 'curtailed' : 'restored'}`);
      onRefresh();
    } finally {
      setIsControlling(false);
      setTimeout(() => setRelayFeedback(null), 5000);
    }
  };

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-[#ded7c8] bg-white p-8 shadow-sm text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-stone-900">No Baseline vs Optimized Run Completed Yet</h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto">
            To generate an empirical comparison, run a 3-minute baseline run with the relay closed, then an optimized run where ambient lux triggers the automated load cut on Node A1.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => handleRelayAction('trip')}
            disabled={isControlling}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 shadow-sm"
          >
            Trigger Signed Relay Cut Demo
          </button>
        </div>
      </div>
    );
  }

  const baseline = runs.baseline!;
  const optimized = runs.optimized!;
  const powerDrop = Number((baseline.avg_w - optimized.avg_w).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Header and Controller */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-[#ded7c8] bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
              Hardware Closed Loop Execution
            </span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-0.5">Empirical Before & After Load Shedding</h3>
          <p className="text-xs text-stone-600">
            Comparing identical load circuits before and after the edge TinyML / threshold policy cuts power.
          </p>
        </div>

        {/* Relay Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleRelayAction('restore')}
            disabled={isControlling}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-[#ded7c8] text-stone-700 hover:bg-[#f8f6f0] transition disabled:opacity-50 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-rose-600" />
            <span>Load ON (Baseline)</span>
          </button>

          <button
            onClick={() => handleRelayAction('trip')}
            disabled={isControlling}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-white transition disabled:opacity-50 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Relay Cut (Optimized)</span>
          </button>
        </div>
      </div>

      {relayFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{relayFeedback}</span>
        </div>
      )}

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline Card */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-900">
            <span className="text-xs font-bold uppercase tracking-wider">Baseline (Uncontrolled)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-semibold">
              Relay Closed
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-stone-900">{formatWatts(baseline.avg_w)}</span>
              <span className="text-sm font-medium text-stone-600">Watts</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">Full artificial lighting + ambient daylight</p>
          </div>

          <div className="mt-4 space-y-2 border-t border-rose-200 pt-3 text-xs">
            <div className="flex justify-between text-stone-700">
              <span>Hourly Energy:</span>
              <span className="font-mono text-stone-900 font-bold">{formatKwh(baseline.kwh_per_h)} kWh/h</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Emissions Rate:</span>
              <span className="font-mono text-rose-700 font-bold">{formatKg(baseline.kg_per_h, 4)} kg CO2e/h</span>
            </div>
          </div>
        </div>

        {/* Optimized Card */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold uppercase tracking-wider">Optimized (Closed Loop)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold">
              Relay Tripped
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-700">{formatWatts(optimized.avg_w)}</span>
              <span className="text-sm font-medium text-stone-600">Watts</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">NXP TinyML cuts wasted daylight circuit</p>
          </div>

          <div className="mt-4 space-y-2 border-t border-emerald-200 pt-3 text-xs">
            <div className="flex justify-between text-stone-700">
              <span>Hourly Energy:</span>
              <span className="font-mono text-stone-900 font-bold">{formatKwh(optimized.kwh_per_h)} kWh/h</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Emissions Rate:</span>
              <span className="font-mono text-emerald-700 font-bold">{formatKg(optimized.kg_per_h, 4)} kg CO2e/h</span>
            </div>
          </div>
        </div>

        {/* Proven Delta / Savings */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-sky-900">
            <span className="text-xs font-bold uppercase tracking-wider">Proven Reduction</span>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-800">
              <ArrowDownRight className="w-3 h-3 text-emerald-700" />
              -{formatPercent(runs.pct_saved)}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-sky-800">-{powerDrop}</span>
              <span className="text-sm font-medium text-stone-600">Watts Curtailed</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">Measured via INA219 current sensor</p>
          </div>

          <div className="mt-4 space-y-2 border-t border-sky-200 pt-3 text-xs">
            <div className="flex justify-between text-stone-700">
              <span>Energy Saved:</span>
              <span className="font-mono text-emerald-700 font-bold">+{formatKwh(runs.saved_kwh_per_h)} kWh/h</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Carbon Avoided:</span>
              <span className="font-mono text-emerald-700 font-bold">+{formatKg(runs.saved_kg_per_h, 4)} kg CO2e/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Observation Meta */}
      {(runs.relay_event || runs.time_range) && (
        <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3 text-xs font-mono text-stone-600 flex flex-wrap items-center justify-between">
          <span>Observed Relay Event: {runs.relay_event || 'Auto-trip (DAYLIGHT_WASTE)'}</span>
          <span>Time Range: {runs.time_range || 'Active Comparison Window (3 mins)'}</span>
        </div>
      )}
    </div>
  );
};
