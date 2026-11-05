import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Globe2,
  TreeDeciduous,
  Droplets,
  Flame,
  CheckCircle2,
  Coins,
  ShieldCheck,
} from 'lucide-react';

export const ImpactHub = () => {
  const { impactProjects, donateCredits, wallet } = useApp();
  const [selectedAmount, setSelectedAmount] = useState(10);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 ambient-mint pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-glow-coral">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">Donation & Impact Hub</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 font-semibold">
                Verified Projects
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct micro-donations using earned ₹-Credits to verified ecological NGOs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Quick Micro-Donate Amount:</span>
          {[5, 10, 25].map((amt) => (
            <button
              key={amt}
              onClick={() => setSelectedAmount(amt)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedAmount === amt
                  ? 'bg-brand-mint text-canvas-dark shadow-glow-mint'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {amt} ₹-Cr
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {impactProjects.map((proj) => (
          <div
            key={proj.id}
            className="p-5 rounded-2xl bg-canvas-dark/60 border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-2xl bg-white/5 border border-white/5 block">
                  {proj.icon}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {proj.verifiedStandard.split(' ')[0]}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1">{proj.title}</h3>
              <span className="text-[11px] text-brand-mint font-semibold block mb-2">
                {proj.organization}
              </span>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {proj.impactSummary}
              </p>

              {/* Progress Bar */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Crowdfund Progress</span>
                  <span className="font-mono font-bold text-slate-200">
                    {proj.raisedCredits} / {proj.targetCredits} ₹-Credits ({proj.progressPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${proj.progressPct}%` }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-brand-mint rounded-full transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => donateCredits(selectedAmount, proj.id, proj.title)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-brand-amber/20 hover:from-rose-500/30 hover:to-brand-amber/30 border border-rose-500/30 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>Donate {selectedAmount} ₹-Credits (₹{selectedAmount * 10})</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
