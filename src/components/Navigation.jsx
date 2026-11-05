import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Flame,
  Zap,
  Leaf,
  ShoppingBag,
  Trophy,
  Coins,
  ReceiptText,
  Car,
} from 'lucide-react';

export const Navigation = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Yagna Engine',
      badge: 'Core',
      icon: Flame,
      color: 'text-brand-coral',
    },
    {
      id: 'power-pulse',
      label: 'Power Pulse',
      badge: 'Electricity',
      icon: Zap,
      color: 'text-brand-mint',
    },
    {
      id: 'eco-commute',
      label: 'Eco Commute',
      badge: 'Transit',
      icon: Car,
      color: 'text-brand-coral',
    },
    {
      id: 'compost-nest',
      label: 'Compost Nest',
      badge: 'IoT Waste',
      icon: Leaf,
      color: 'text-emerald-400',
    },
    {
      id: 'spend-log',
      label: 'Spend Log',
      badge: 'Purchases',
      icon: ReceiptText,
      color: 'text-brand-sky',
    },
    {
      id: 'green-mart',
      label: 'Green Mart',
      badge: 'Eco Hub',
      icon: ShoppingBag,
      color: 'text-brand-lavender',
    },
    {
      id: 'eco-tribe',
      label: 'Eco Tribe',
      badge: 'Leaderboard',
      icon: Trophy,
      color: 'text-brand-amber',
    },
    {
      id: 'wallet',
      label: '₹-Wallet & CCTS',
      badge: 'Credits',
      icon: Coins,
      color: 'text-brand-amber',
    },
  ];

  return (
    <nav className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-4 pb-2">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-b border-white/5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-canvas-card border border-white/15 text-white shadow-glass'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-mint shadow-[0_0_6px_#2DD4BF]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
