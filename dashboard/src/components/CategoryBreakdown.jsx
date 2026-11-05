import React from 'react';
import { Zap, Car, Flame, Trash2, ChevronRight, ShieldCheck } from 'lucide-react';

const CATEGORY_ICONS = {
  electricity: Zap,
  transport: Car,
  fuel: Flame,
  waste: Trash2
};

const CATEGORY_COLORS = {
  electricity: 'from-emerald-500 to-teal-600 border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  transport: 'from-blue-500 to-cyan-600 border-blue-500/30 text-blue-400 bg-blue-500/10',
  fuel: 'from-amber-500 to-orange-600 border-amber-500/30 text-amber-400 bg-amber-500/10',
  waste: 'from-purple-500 to-pink-600 border-purple-500/30 text-purple-400 bg-purple-500/10'
};

const QUALITY_TAGS = {
  measured: { label: 'MEASURED', bg: 'bg-emerald-950 text-emerald-400 border-emerald-800' },
  estimated: { label: 'ESTIMATED', bg: 'bg-amber-950 text-amber-400 border-amber-800' },
  manual: { label: 'MANUAL ENTRY', bg: 'bg-blue-950 text-blue-400 border-blue-800' }
};

export default function CategoryBreakdown({ breakdown, onInspectFactor }) {
  const items = Array.isArray(breakdown) ? breakdown : [];

  return (
    <div className="space-y-6">
      {/* Header and Guidelines */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Scope & Category Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full GHG protocol scope mapping. Click any item to inspect its authoritative emission factor formula and citation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strictly Verified via <code>data/factors.yaml</code></span>
        </div>
      </div>

      {/* Visual Stacked Progress Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Emissions Share Distribution
        </span>
        <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-slate-800/80 p-0.5">
          {items.map((item) => (
            <div
              key={item.category}
              style={{ width: `${Math.max(item.pct, 4)}%` }}
              title={`${item.label}: ${item.kg} kg (${item.pct}%)`}
              className={`h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full ${
                item.category === 'electricity' ? 'bg-emerald-500' :
                item.category === 'transport' ? 'bg-blue-500' :
                item.category === 'fuel' ? 'bg-amber-500' : 'bg-purple-500'
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          {items.map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                item.category === 'electricity' ? 'bg-emerald-500' :
                item.category === 'transport' ? 'bg-blue-500' :
                item.category === 'fuel' ? 'bg-amber-500' : 'bg-purple-500'
              }`} />
              <span className="text-slate-300 font-medium">{item.label}</span>
              <span className="font-mono text-slate-400">({item.pct}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = CATEGORY_ICONS[item.category] || Zap;
          const styling = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.electricity;
          const qualityTag = QUALITY_TAGS[item.quality] || QUALITY_TAGS.measured;

          return (
            <div
              key={item.category}
              onClick={() => onInspectFactor && onInspectFactor(item.factor_id)}
              className="group cursor-pointer rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 hover:border-slate-700 transition relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${styling}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                      {item.label}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                      {item.unit_rate}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${qualityTag.bg}`}>
                  {qualityTag.label}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-2xl font-extrabold font-mono text-white">
                    {item.kg?.toFixed(2)}
                  </span>
                  <span className="ml-1 text-xs text-slate-400">kg CO2e</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-slate-300">{item.pct}%</span>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Share</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/50">
                <span className="truncate pr-2 text-slate-400 font-sans text-[11px]">{item.source}</span>
                <span className="flex items-center gap-1 text-emerald-400 shrink-0 font-medium text-[11px] group-hover:underline">
                  <span>Methodology</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
