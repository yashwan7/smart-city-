import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Zap,
  Activity,
  Radio,
  Coins,
  ShieldCheck,
  User,
  Sparkles,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';

export const Header = () => {
  const {
    user,
    setIsAuthOpen,
    hardware,
    toggleHardwareConnection,
    generateSampleActivity,
    wallet,
    activeTab,
    setActiveTab,
    yagnaAnalytics,
    isChotuOpen,
    setIsChotuOpen,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        {/* Brand Logo & Name */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-mint via-brand-sky to-brand-lavender p-0.5 shadow-glow-mint flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-canvas-dark rounded-[14px] flex items-center justify-center">
              <span className="rupee-symbol text-xl text-brand-mint font-black">₹</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-black text-2xl tracking-tight text-white flex items-center">
                <span className="text-brand-mint rupee-symbol">₹</span>uta
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
                v2.0 • GreenTech
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Verifiable Net-Carbon Canvas & CCTS Token Mesh
            </p>
          </div>
        </div>

        {/* Center: Hardware IoT Status & Simulation Button */}
        <div className="flex items-center gap-2.5">
          {/* Hardware Connection Indicator: Connected [Green] / Disconnected [Amber] */}
          <button
            onClick={toggleHardwareConnection}
            title="Toggle live hardware IoT link simulation"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              hardware.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hardware.connected
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">
              {hardware.connected ? 'Connected [Green]' : 'Disconnected [Amber]'}
            </span>
            <span className="font-mono text-[11px] hidden md:inline text-slate-300">
              {hardware.connected ? `(${hardware.liveWatts}W)` : '(Offline)'}
            </span>
          </button>

          {/* Simulate Live Sensor Stream Button */}
          <button
            onClick={generateSampleActivity}
            className="group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-mint/20 via-brand-sky/20 to-brand-lavender/20 hover:from-brand-mint/30 hover:to-brand-lavender/30 border border-brand-mint/30 text-white text-xs font-bold transition-all transform active:scale-95 shadow-glow-mint"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-mint group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Simulate IoT Sensor Stream</span>
            <span className="sm:hidden">Simulate</span>
          </button>

          {/* Chotu-Eco AI Buddy Header Trigger */}
          <button
            onClick={() => setIsChotuOpen(!isChotuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-brand-mint transition-all"
            title="Chat with Chotu-Eco"
          >
            <span>🌱</span>
            <span className="hidden lg:inline">Chotu-Eco</span>
          </button>
        </div>

        {/* Right: Net Balance, Wallet, User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick Net Carbon Pill */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              yagnaAnalytics.isNetPositive
                ? 'bg-brand-mint/10 border-brand-mint/30 text-brand-mint'
                : 'bg-brand-coral/10 border-brand-coral/30 text-brand-coral'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Net Delta:</span>
            <span className="font-mono">
              {yagnaAnalytics.netCarbon > 0 ? `+${yagnaAnalytics.netCarbon}` : yagnaAnalytics.netCarbon} kg
            </span>
          </div>

          {/* Wallet ₹-Credits Pill */}
          <div
            onClick={() => setActiveTab('wallet')}
            className="cursor-pointer px-3 py-1.5 rounded-xl bg-brand-amber/10 border border-brand-amber/25 hover:border-brand-amber/50 text-brand-amber text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="font-mono font-black">{wallet.totalCredits}</span>
            <span className="text-[10px] text-brand-amber/80 hidden sm:inline">₹-Credits</span>
          </div>

          {/* User Profile Pill */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <span className="text-base">{user.avatar}</span>
            <div className="text-left hidden xl:block">
              <span className="text-[11px] font-bold text-white block leading-tight truncate max-w-[90px]">
                {user.fullName.split(' ')[0]}
              </span>
              <span className="text-[9px] text-brand-mint block leading-tight">
                {user.rankTier}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
