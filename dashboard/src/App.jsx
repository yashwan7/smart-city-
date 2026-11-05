// ============================================================================
// [PREVIOUS / LEGACY DASHBOARD - PRESERVED FOR REFERENCE]
// Notice: This is the previous dashboard version.
// The active, final, and official ₹uta v2.0 gamified dashboard is at the root
// (running from /src and the root /package.json). Do not delete this file.
// ============================================================================

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import LiveKPIs from './components/LiveKPIs.jsx';
import CategoryBreakdown from './components/CategoryBreakdown.jsx';
import BeforeAfterRuns from './components/BeforeAfterRuns.jsx';
import CopilotAdvisor from './components/CopilotAdvisor.jsx';
import LedgerIntegrity from './components/LedgerIntegrity.jsx';
import DeviceFleet from './components/DeviceFleet.jsx';
import FactorModal from './components/FactorModal.jsx';

import {
  fetchSummary,
  fetchBreakdown,
  fetchRunsCompare,
  fetchRecommendations,
  fetchDevices,
  verifyLedger
} from './services/api.js';
import { getFactor } from './data/factors.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [runData, setRunData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [ledgerState, setLedgerState] = useState(null);
  const [activeFactor, setActiveFactor] = useState(null);
  const [isFactorModalOpen, setIsFactorModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [sum, bkd, runs, recs, devs, ledg] = await Promise.all([
        fetchSummary(),
        fetchBreakdown(),
        fetchRunsCompare(),
        fetchRecommendations(),
        fetchDevices(),
        verifyLedger()
      ]);
      setSummary(sum);
      setBreakdown(bkd);
      setRunData(runs);
      setRecommendations(recs);
      setDevices(devs);
      setLedgerState(ledg);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleOpenFactorInspector = (factorIdOrKey) => {
    const factor = getFactor(factorIdOrKey);
    if (factor) {
      setActiveFactor(factor);
      setIsFactorModalOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenFactorInspector={handleOpenFactorInspector}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                Green Tech & Sustainability Platform
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                {activeTab === 'live' && 'Real-Time Emission Telemetry'}
                {activeTab === 'breakdown' && 'GHG Scope & Emission Factors'}
                {activeTab === 'runs' && 'Closed-Loop Optimization & Curtailment'}
                {activeTab === 'advisor' && 'Carbon Copilot & Deterministic Advisor'}
                {activeTab === 'ledger' && 'Cryptographic Hash-Chain & Tamper Audit'}
                {activeTab === 'devices' && 'Hardware Fleet & Sensor Topology'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Hub: {summary?.provenance || 'OFFLINE READY'}
              </span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            </div>
          </div>

          {/* Active View Content */}
          {activeTab === 'live' && (
            <LiveKPIs
              summary={summary}
              onInspectFactor={handleOpenFactorInspector}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'breakdown' && (
            <CategoryBreakdown
              breakdown={breakdown}
              onInspectFactor={handleOpenFactorInspector}
            />
          )}

          {activeTab === 'runs' && (
            <BeforeAfterRuns
              runData={runData}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'advisor' && (
            <CopilotAdvisor
              recommendations={recommendations}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerIntegrity
              ledgerState={ledgerState}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'devices' && (
            <DeviceFleet
              devices={devices}
            />
          )}
        </div>
      </main>

      {/* Factor Inspector Modal */}
      <FactorModal
        factor={activeFactor}
        isOpen={isFactorModalOpen}
        onClose={() => setIsFactorModalOpen(false)}
      />
    </div>
  );
}
