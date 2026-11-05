// ============================================================================
// [PREVIOUS / LEGACY WEBSITE - PRESERVED FOR REFERENCE]
// Notice: This is the previous TypeScript frontend.
// The active, final, and official ₹uta v2.0 gamified dashboard is at the root
// (running from /src and the root /package.json). Do not delete this file.
// ============================================================================

import React, { useState } from 'react';
import { useLive } from './hooks/useLive';
import { LiveKPIs } from './components/LiveKPIs';
import { YagnaChart } from './components/YagnaChart';
import { IntegrityBadge } from './components/IntegrityBadge';
import { Breakdown } from './components/Breakdown';
import { SamputaCard } from './components/SamputaCard';
import { VernacularCard } from './components/VernacularCard';
import { BeforeAfter } from './components/BeforeAfter';
import { Advisor } from './components/Advisor';
import { Devices } from './components/Devices';
import { formatTime } from './lib/format';

import {
  Activity,
  PieChart,
  Layers,
  Sparkles,
  ToggleLeft,
  Bot,
  Cpu,
  Leaf,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

type TabId = 'live' | 'breakdown' | 'samputa' | 'vernacular' | 'runs' | 'advisor' | 'devices';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'live', label: 'Live & Yagna', icon: Activity, badge: 'REALTIME' },
  { id: 'breakdown', label: 'Scope Breakdown', icon: PieChart },
  { id: 'samputa', label: 'Samputa Bank', icon: Layers, badge: 'VERIFIED' },
  { id: 'vernacular', label: 'Vernacular Wisdom', icon: Sparkles },
  { id: 'runs', label: 'Before / After', icon: ToggleLeft, badge: 'CLOSED LOOP' },
  { id: 'advisor', label: 'Advisor & SLM', icon: Bot },
  { id: 'devices', label: 'Device Fleet', icon: Cpu }
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('live');

  const {
    net,
    breakdown,
    timeseries,
    runs,
    recommendations,
    ledger,
    devices,
    samputa,
    vernacular,
    isLoading,
    isConnected,
    error,
    lastUpdateTime,
    refresh,
    setLedger,
    setSamputa
  } = useLive();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#fbf9f4] text-stone-900 antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 border-r border-[#e8e2d5] bg-[#f2ede2] p-4 flex flex-col justify-between shadow-sm">
        <div>
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-[#ded7c8]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-stone-900 flex items-center gap-1.5">
                <span>CarbonMesh</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">v2</span>
              </h1>
              <span className="text-[10px] font-mono font-bold text-emerald-800 tracking-wider uppercase block">
                Measured · Signed · Acting · Offline
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-stone-700 hover:bg-[#e8e2d5] hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-600'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-emerald-800 text-white' : 'bg-[#ded7c8] text-stone-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Hardware & Hackathon Meta */}
        <div className="mt-8 border-t border-[#ded7c8] pt-4 px-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>WebSocket Live:</span>
            <span className={`flex items-center gap-1 font-mono text-[11px] font-bold ${
              isConnected ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="rounded-xl bg-[#ffffff] p-3 border border-[#ded7c8] text-[11px] text-stone-600 shadow-sm">
            <div className="font-bold text-stone-900">Hack Fest 2026 S1</div>
            <div>Green Tech & Sustainability</div>
            <div className="mt-1 font-mono text-[10px] text-emerald-800 font-bold">Sai Vidya Inst. of Technology</div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e8e2d5] gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
                Verifiable Net-Carbon Platform
              </span>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight mt-0.5">
                {activeTab === 'live' && 'Real-Time Telemetry & Yagna Trajectory'}
                {activeTab === 'breakdown' && 'GHG Scope & Statutory Factors'}
                {activeTab === 'samputa' && 'Samputa Carbon Bank & Composting Hub'}
                {activeTab === 'vernacular' && 'Vernacular Wisdom & Avoidance Accounting'}
                {activeTab === 'runs' && 'Closed-Loop Optimization & Load Curtailment'}
                {activeTab === 'advisor' && 'Deterministic Closed-Loop Advisor'}
                {activeTab === 'devices' && 'Hardware Device Fleet & Node Topology'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#ffffff] text-stone-700 border border-[#ded7c8] shadow-sm">
                Updated: {formatTime(lastUpdateTime)}
              </span>
              <button
                onClick={refresh}
                className="p-2 rounded-xl bg-[#ffffff] border border-[#ded7c8] text-stone-700 hover:text-stone-900 hover:bg-[#f2ede2] transition shadow-sm"
                title="Refresh All Telemetry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection / Disconnected Status Alert */}
          {!isConnected && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Hub Connection Disconnected:</strong> Hub WebSocket unreachable on <code>/ws/live</code>. Displaying authoritative cached ledger state with automatic exponential backoff reconnection.
                </span>
              </div>
              <button
                onClick={refresh}
                className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-900 font-mono text-[11px] shrink-0 font-semibold"
              >
                Retry REST
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active View Rendering */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              <IntegrityBadge ledger={ledger} onUpdate={setLedger} />
              <LiveKPIs net={net} onRefresh={refresh} />
              <YagnaChart data={timeseries} isLoading={isLoading} />
            </div>
          )}

          {activeTab === 'breakdown' && (
            <Breakdown items={breakdown} />
          )}

          {activeTab === 'samputa' && (
            <SamputaCard batch={samputa} onUpdate={setSamputa} />
          )}

          {activeTab === 'vernacular' && (
            <VernacularCard records={vernacular} onRefresh={refresh} />
          )}

          {activeTab === 'runs' && (
            <BeforeAfter runs={runs} onRefresh={refresh} />
          )}

          {activeTab === 'advisor' && (
            <Advisor recommendations={recommendations} />
          )}

          {activeTab === 'devices' && (
            <Devices devices={devices} />
          )}
        </div>
      </main>
    </div>
  );
};
