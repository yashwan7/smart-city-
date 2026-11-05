import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Sparkles,
  Tag,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Package,
  Leaf,
  ExternalLink,
  Flame,
  Shirt,
  Coffee,
  Sun,
} from 'lucide-react';

export const GreenMart = () => {
  const { greenMartItems, buyGreenMartItem, wallet } = useApp();
  const [imgErrors, setImgErrors] = useState({});

  const handleImgError = (id) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const getFallbackIcon = (category) => {
    switch (category) {
      case 'Wearable':
        return '👕';
      case 'Cooling':
        return '🏺';
      case 'Zero Waste':
        return '🎋';
      case 'Soil Health':
        return '🌱';
      case 'Clean Energy':
        return '☀️';
      case 'Personal Care':
        return '🌿';
      default:
        return '🛍️';
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 ambient-mint pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-lavender/10 border border-brand-lavender/30 flex items-center justify-center text-brand-lavender shadow-glow-lavender">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">Green Mart</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-lavender/15 text-brand-lavender border border-brand-lavender/25 font-semibold">
                Eco-Shopping Hub
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authentic regenerative goods, indigenous crafts & zero-carbon hardware (Redeem ₹-Credits)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-amber/10 border border-brand-amber/25 text-brand-amber text-xs font-bold">
          <Coins className="w-4 h-4" />
          <span>Available: {wallet.totalCredits} ₹-Credits (₹{wallet.totalCredits * 10} INR)</span>
        </div>
      </div>

      {/* Product Grid with High-Res Photography & Graceful Fallbacks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {greenMartItems.map((item) => {
          const canAfford = wallet.totalCredits >= item.priceCredits;
          const hasError = imgErrors[item.id];

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-canvas-dark/70 border border-white/10 hover:border-brand-mint/40 transition-all flex flex-col justify-between overflow-hidden group shadow-glass"
            >
              <div>
                {/* Authentic Product Photography / Card Hero */}
                <div className="relative w-full h-44 overflow-hidden bg-slate-900 flex items-center justify-center">
                  {!hasError ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={() => handleImgError(item.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-brand-mint/20 via-canvas-card to-brand-lavender/20 flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-4xl mb-2">{getFallbackIcon(item.category)}</span>
                      <span className="text-xs font-bold text-slate-200">{item.name}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-canvas-dark via-transparent to-transparent opacity-80" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-canvas-dark/80 backdrop-blur-md text-brand-mint border border-brand-mint/30 shadow-glass">
                      {item.tag || item.category}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-canvas-dark/80 text-slate-300">
                      {item.stock} left
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-brand-mint transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Carbon Offset Benefit */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-3 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 w-fit">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Saves {item.carbonOffsetKg} kg CO₂e</span>
                  </div>
                </div>
              </div>

              {/* Price & Buy Button */}
              <div className="p-4 pt-0 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-display font-black text-brand-amber">
                      {item.priceCredits}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">₹-Credits</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">≈ ₹{item.priceInrEquivalent} INR</span>
                </div>

                <button
                  onClick={() => buyGreenMartItem(item.id)}
                  disabled={!canAfford || item.stock <= 0}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    item.stock <= 0
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                      : canAfford
                      ? 'bg-brand-mint text-canvas-dark hover:brightness-110 shadow-glow-mint active:scale-95'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{item.stock <= 0 ? 'Claimed' : canAfford ? 'Redeem Item' : 'Need Credits'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export const HaatBazaar = GreenMart;
