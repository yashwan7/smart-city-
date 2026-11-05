import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Users,
  Search,
  Sparkles,
  MapPin,
  TrendingUp,
} from 'lucide-react';

export const EcoTribe = () => {
  const { activeCluster, setActiveCluster, clustersData, user } = useApp();

  const currentList = clustersData[activeCluster] || clustersData.saividya;

  const clusterLabels = [
    { id: 'saividya', label: 'Sai Vidya Cluster', icon: '🏛️' },
    { id: 'bangalore', label: 'Bangalore Cluster', icon: '🏙️' },
    { id: 'allindia', label: 'All India', icon: '🇮🇳' },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 ambient-amber pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-amber/10 border border-brand-amber/30 flex items-center justify-center text-brand-amber shadow-glow-amber">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">Eco Tribe</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber border border-brand-amber/25 font-semibold">
                Locality Leaderboard
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Locality carbon offsets, regenerative rank tiers, and community micro-grid karma
            </p>
          </div>
        </div>

        {/* Cluster Switcher: [ Sai Vidya Cluster ] [ Bangalore Cluster ] [ All India ] */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-canvas-dark/80 border border-white/10 text-xs shadow-glass">
          {clusterLabels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCluster(c.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
                activeCluster === c.id
                  ? 'bg-brand-amber text-canvas-dark shadow-glow-amber'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Podium Cards for Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        {currentList.slice(0, 3).map((player, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={player.rank}
              className={`p-4 rounded-2xl border text-center transition-all ${
                isFirst
                  ? 'bg-gradient-to-b from-brand-amber/20 via-brand-amber/5 to-canvas-dark/60 border-brand-amber/40 shadow-glow-amber'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="relative w-12 h-12 mx-auto mb-2 flex items-center justify-center text-2xl">
                <span>{player.avatar}</span>
                {isFirst && (
                  <Crown className="w-5 h-5 text-brand-amber absolute -top-3.5 right-0 animate-bounce" />
                )}
              </div>
              <span className="text-xs font-bold text-white block mb-0.5 truncate">
                {player.name}
              </span>
              <span className="text-[10px] text-brand-amber font-semibold block mb-2">
                {player.badge}
              </span>
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="font-mono font-bold text-brand-mint">{player.points} XP</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-300">-{player.offsetKg} kg</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard Rankings Table */}
      <div className="space-y-2">
        {currentList.map((player) => (
          <div
            key={player.rank}
            className={`flex items-center justify-between p-3.5 rounded-2xl transition-all text-xs flex-wrap gap-2 ${
              player.isCurrentUser
                ? 'bg-brand-mint/10 border border-brand-mint/30 shadow-glow-mint'
                : 'bg-white/5 hover:bg-white/10 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 text-center font-display font-extrabold text-sm ${
                  player.rank === 1
                    ? 'text-brand-amber'
                    : player.rank === 2
                    ? 'text-slate-300'
                    : player.rank === 3
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              >
                #{player.rank}
              </span>

              <span className="text-xl p-1 rounded-lg bg-white/5">{player.avatar}</span>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{player.name}</span>
                  {player.isCurrentUser && (
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-brand-mint/20 text-brand-mint border border-brand-mint/30">
                      You
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-brand-amber">{player.badge}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="font-mono font-bold text-brand-mint block">
                  {player.points} XP
                </span>
                <span className="text-[10px] text-slate-400">
                  {player.credits} ₹-Credits
                </span>
              </div>

              <div className="text-right min-w-[70px]">
                <span className="font-mono font-bold text-emerald-400 block">
                  -{player.offsetKg} kg
                </span>
                <span className="text-[9px] text-slate-500 uppercase">Offset</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export const PinnacleTribe = EcoTribe;

