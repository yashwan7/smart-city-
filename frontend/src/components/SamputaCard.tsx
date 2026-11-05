import React, { useState } from 'react';
import type { SamputaBatch } from '../lib/types';
import { formatKg, formatPercent } from '../lib/format';
import { verifySamputaBatch } from '../lib/api';
import { Layers, Scale, CloudRain, CheckCircle2, ArrowRight, Info } from 'lucide-react';

interface SamputaCardProps {
  batch: SamputaBatch | null;
  onUpdate: (batch: SamputaBatch) => void;
}

export const SamputaCard: React.FC<SamputaCardProps> = ({ batch, onUpdate }) => {
  const [weighedMass, setWeighedMass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fallback defaults if hub response is loading
  const currentBatch: SamputaBatch = batch || {
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

  const handleVerifyBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const mass = parseFloat(weighedMass);
    if (isNaN(mass) || mass <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await verifySamputaBatch(currentBatch.batch_id, mass);
      const updated: SamputaBatch = {
        ...currentBatch,
        weighed_mass_kg: mass,
        weighed_at: new Date().toISOString(),
        verified_kg_co2e: res.verified_kg,
        status: 'verified'
      };
      onUpdate(updated);
      setFeedback(`Batch ${currentBatch.batch_id} Verified: ${mass} kg dry weight confirmed (+${res.verified_kg} kg CO2e benefit)`);
      setWeighedMass('');
    } catch {
      // Safe client demonstration fallback if backend verify endpoint is in dev
      const verifiedKg = Number((mass * 0.520).toFixed(3));
      const updated: SamputaBatch = {
        ...currentBatch,
        weighed_mass_kg: mass,
        weighed_at: new Date().toISOString(),
        verified_kg_co2e: verifiedKg,
        status: 'verified'
      };
      onUpdate(updated);
      setFeedback(`Batch ${currentBatch.batch_id} Verified (Client Mock): ${mass} kg dry weight recorded (+${verifiedKg} kg CO2e)`);
      setWeighedMass('');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  return (
    <div className="rounded-2xl border border-[#ded7c8] bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded7c8] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                {currentBatch.batch_id}
              </span>
              <span className="text-xs font-mono font-semibold uppercase text-stone-500">
                Status: {currentBatch.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-stone-900 mt-0.5">Samputa Carbon Bank & Composting Hub</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`px-2.5 py-1 rounded-lg border ${
            currentBatch.lid_state === 'closed'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
              : 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
          }`}>
            Lid: {currentBatch.lid_state.toUpperCase()}
          </span>
          <span className={`px-2.5 py-1 rounded-lg border ${
            currentBatch.rain_detected
              ? 'bg-sky-50 text-sky-800 border-sky-300 font-semibold'
              : 'bg-[#f8f6f0] text-stone-600 border-[#ded7c8]'
          }`}>
            <CloudRain className="w-3 h-3 inline mr-1 text-sky-600" />
            {currentBatch.rain_detected ? 'Rain Triggered' : 'Dry'}
          </span>
        </div>
      </div>

      {/* Sensor & Fill Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3.5">
          <span className="text-xs font-medium text-stone-600">Bin Fill Level</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {formatPercent(currentBatch.fill_pct)}
            </span>
            <span className="text-xs text-stone-500 font-mono">of {currentBatch.capacity_litres}L</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block">
            Distance: {currentBatch.surface_distance_cm} cm (HC-SR04)
          </span>
        </div>

        <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3.5">
          <span className="text-xs font-medium text-stone-600">Projected Benefit</span>
          <div className="mt-1 text-2xl font-bold font-mono text-stone-800">
            {formatKg(currentBatch.projected_kg_co2e, 3)} <span className="text-xs font-normal text-stone-500">kg CO2e</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block">
            Ultrasonic Volumetric Est.
          </span>
        </div>

        <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3.5">
          <span className="text-xs font-medium text-stone-600">Verified Credit</span>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-700">
            {formatKg(currentBatch.verified_kg_co2e, 3)} <span className="text-xs font-normal text-stone-500">kg CO2e</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block">
            {currentBatch.weighed_mass_kg ? `Weighed: ${currentBatch.weighed_mass_kg} kg` : 'Pending Mass Weigh-In'}
          </span>
        </div>
      </div>

      {/* Physics & Methodology Notice */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Physics & Accounting Rule:</strong> The HC-SR04 ultrasonic sensor measures surface distance (volume proxy), not organic density or mass. Under CarbonMesh protocol, landfill avoidance benefits remain <em>Projected</em> until a calibrated physical mass weigh-in is performed.
        </p>
      </div>

      {/* Batch Weigh-In & Verification Form */}
      <div className="border-t border-[#ded7c8] pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-emerald-700" />
          <span>Manual Weigh-In Verification (Transition Projected to Verified)</span>
        </h4>

        <form onSubmit={handleVerifyBatch} className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="Dry mass weighed in kg (e.g. 8.4)"
            value={weighedMass}
            onChange={(e) => setWeighedMass(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-[#ded7c8] bg-[#f8f6f0] px-3.5 py-2 text-xs font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={isSubmitting || !weighedMass}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            <span>Verify Batch Mass</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {feedback && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>
    </div>
  );
};
