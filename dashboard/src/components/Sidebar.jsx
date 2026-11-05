import React from 'react';
import { Activity, PieChart, Sparkles, Bot, Shield, Cpu, Leaf, ExternalLink } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'live', label: 'Live Command', icon: Activity, badge: 'REALTIME' },
  { id: 'breakdown', label: 'Scope Breakdown', icon: PieChart },
  { id: 'runs', label: 'Before / After Runs', icon: Sparkles, badge: 'CLOSED LOOP' },
  { id: 'advisor', label: 'Carbon Copilot', icon: Bot },
  { id: 'ledger', label: 'Ledger Integrity', icon: Shield, badge: 'TAMPER-EVIDENT' },
  { id: 'devices', label: 'Device Fleet', icon: Cpu }
];

export default function Sidebar({ activeTab, onSelectTab, onOpenFactorInspector }) {
  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>CarbonMesh</span>
            </h1>
            <span className="text-[10px] font-mono font-medium text-emerald-400 tracking-wider uppercase block">
              Offline-First Ledger
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="mt-8 border-t border-slate-800 pt-4 px-2 space-y-3">
        <button
          onClick={() => onOpenFactorInspector && onOpenFactorInspector('electricity_grid_india')}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-emerald-400 transition"
        >
          <span className="font-mono">factors.yaml Inspector</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300">Hack Fest 2026 Season 1</div>
          <div>Green Tech & Sustainability</div>
          <div className="mt-1 font-mono text-[10px] text-emerald-400">Sai Vidya Inst. of Technology</div>
        </div>
      </div>
    </aside>
  );
}

