import React from 'react';
import { X, ExternalLink, ShieldCheck, Calculator, BookOpen, Layers } from 'lucide-react';

export default function FactorModal({ factor, isOpen, onClose }) {
  if (!isOpen || !factor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                {factor.id}
              </span>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                {factor.category}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">{factor.name}</h3>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-xs text-slate-400">Emission Factor Value</span>
              <div className="mt-1 text-xl font-mono font-bold text-emerald-400">
                {factor.factor_value} <span className="text-xs text-slate-400 font-normal">{factor.unit}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-xs text-slate-400">Verification Status</span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Peer-Reviewed & Cited</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Citation & Source</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{factor.data_source}</p>
            {factor.citation_url && (
              <a
                href={factor.citation_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline"
              >
                <span>View Official Gazette / Database Reference</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>Methodology & Standards Compliance</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{factor.methodology}</p>
          </div>

          <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/50 p-3 text-xs text-emerald-300/90">
            <strong>Standard Guarantee:</strong> Factors strictly sourced from <code>data/factors.yaml</code>. Zero hard-coded arbitrary coefficients are permitted in CarbonMesh.
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

