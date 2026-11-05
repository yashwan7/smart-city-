import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HardwareWidget } from './components/HardwareWidget';
import { AuthModal } from './components/AuthModal';
import { NotificationToast } from './components/NotificationToast';
import { PowerPulse } from './components/PowerPulse';
import { EcoCommute } from './components/EcoCommute';
import { CompostNest } from './components/CompostNest';
import { SpendLog } from './components/SpendLog';
import { GreenMart } from './components/GreenMart';
import { EcoTribe } from './components/EcoTribe';
import { ChotuEco } from './components/ChotuEco';
import { YagnaCycleEngine } from './components/YagnaCycleEngine';
import { WalletCCTS } from './components/WalletCCTS';
import { ImpactHub } from './components/ImpactHub';
import {
  Zap,
  Car,
  Leaf,
  Coins,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const App = () => {
  const {
    activeTab,
    setActiveTab,
    powerPulse,
    ecoCommute,
    compostNest,
    wallet,
    yagnaAnalytics,
  } = useApp();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans relative selection:bg-brand-mint/30 selection:text-brand-mint">
      {/* Background radial glow gradients for modern game canvas aesthetic */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] ambient-mint pointer-events-none rounded-full blur-3xl opacity-20 -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] ambient-coral pointer-events-none rounded-full blur-3xl opacity-15 -z-10" />

      {/* Header */}
      <Header />

      {/* Persistent Clean Navigation */}
      <Navigation />

      {/* Toast Notification */}
      <NotificationToast />

      {/* Auth Modal */}
      <AuthModal />

      {/* Floating Hardware Widget */}
      <HardwareWidget />

      {/* AI Sustainability Companion ("Chotu-Eco / Ru-Bot") */}
      <ChotuEco />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* VIEW 1: Main Dashboard (Default Canvas) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick At-a-Glance Telemetry Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Power Pulse Quick Box */}
              <div
                onClick={() => setActiveTab('power-pulse')}
                className="glass-panel p-3.5 rounded-2xl border border-white/5 hover:border-brand-mint/40 cursor-pointer transition-all group shadow-glass"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">Power Pulse</span>
                  <Zap className="w-3.5 h-3.5 text-brand-mint" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-display font-extrabold text-white">
                    {powerPulse.currentKwh}
                  </span>
                  <span className="text-xs text-brand-mint font-semibold">kW live</span>
                </div>
                <span className="text-[10px] text-slate-400">Today: {powerPulse.todayTotalKwh} kWh</span>
              </div>

              {/* Eco Commute Quick Box */}
              <div
                onClick={() => setActiveTab('eco-commute')}
                className="glass-panel p-3.5 rounded-2xl border border-white/5 hover:border-brand-coral/40 cursor-pointer transition-all group shadow-glass"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">Eco Commute</span>
                  <Car className="w-3.5 h-3.5 text-brand-coral" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-display font-extrabold text-white">
                    {ecoCommute.todayKm}
                  </span>
                  <span className="text-xs text-brand-coral font-semibold">km commute</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  +{ecoCommute.transportEmissionsKg} kg CO₂e
                </span>
              </div>

              {/* Compost Nest Quick Box */}
              <div
                onClick={() => setActiveTab('compost-nest')}
                className="glass-panel p-3.5 rounded-2xl border border-white/5 hover:border-emerald-500/40 cursor-pointer transition-all group shadow-glass"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">Compost Nest</span>
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-display font-extrabold text-white">
                    {compostNest.compostMaturityPct}%
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">matured</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  -{compostNest.methaneOffsetKg} kg methane trapped
                </span>
              </div>

              {/* Wallet Quick Box */}
              <div
                onClick={() => setActiveTab('wallet')}
                className="glass-panel p-3.5 rounded-2xl border border-white/5 hover:border-brand-amber/40 cursor-pointer transition-all group shadow-glass"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">₹-Credit Pool</span>
                  <Coins className="w-3.5 h-3.5 text-brand-amber" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-display font-extrabold text-brand-amber">
                    {wallet.totalCredits}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">₹-Cr</span>
                </div>
                <span className="text-[10px] text-brand-mint font-semibold">
                  ≈ ₹{wallet.totalCredits * 10} INR (70% Payout)
                </span>
              </div>
            </div>

            {/* Central Yagna Cycle Engine */}
            <YagnaCycleEngine />

            {/* Core Modules Side by Side: Power Pulse & Compost Nest */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PowerPulse />
              <CompostNest />
            </div>

            {/* Eco Commute & Spend Log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EcoCommute />
              <SpendLog />
            </div>

            {/* Green Mart & Eco Tribe */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GreenMart />
              <EcoTribe />
            </div>
          </div>
        )}

        {/* VIEW 2: Power Pulse (Electricity) */}
        {activeTab === 'power-pulse' && (
          <div className="space-y-6">
            <PowerPulse />
          </div>
        )}

        {/* VIEW 3: Eco Commute (Transit) */}
        {activeTab === 'eco-commute' && (
          <div className="space-y-6">
            <EcoCommute />
          </div>
        )}

        {/* VIEW 4: Compost Nest (Organic & Wet Waste / Biogas) */}
        {activeTab === 'compost-nest' && (
          <div className="space-y-6">
            <CompostNest />
          </div>
        )}

        {/* VIEW 5: Spend Log (Consumer Purchases) */}
        {activeTab === 'spend-log' && (
          <div className="space-y-6">
            <SpendLog />
          </div>
        )}

        {/* VIEW 6: Green Mart (Eco-Shopping Hub) */}
        {activeTab === 'green-mart' && (
          <div className="space-y-6">
            <GreenMart />
          </div>
        )}

        {/* VIEW 7: Eco Tribe (Locality Leaderboard) */}
        {activeTab === 'eco-tribe' && (
          <div className="space-y-6">
            <EcoTribe />
          </div>
        )}

        {/* VIEW 8: Wallet & CCTS + Impact Hub */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <WalletCCTS />
            <ImpactHub />
          </div>
        )}
      </main>

      {/* Minimal Sleek Footer */}
      <footer className="w-full border-t border-white/5 py-6 px-4 text-center text-xs text-slate-500">
        <p>
          <span className="text-brand-mint font-bold rupee-symbol">₹</span>uta • Verifiable Net-Carbon Platform & CCTS Token Mesh • Hack Fest 2026 Season 1 (Sai Vidya Institute of Technology, Bengaluru)
        </p>
      </footer>
    </div>
  );
};
