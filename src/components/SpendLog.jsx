import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  PlusCircle,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Search,
  Sparkles,
} from 'lucide-react';

export const SpendLog = () => {
  const { spendLog, addPurchase } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [embodiedKg, setEmbodiedKg] = useState(1.5);
  const [isEco, setIsEco] = useState(true);
  const [priceInr, setPriceInr] = useState(450);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    addPurchase({
      item: itemName,
      category,
      embodiedKg: parseFloat(embodiedKg) || 1.0,
      isEco,
      priceInr: parseFloat(priceInr) || 100,
    });
    setItemName('');
    setIsAdding(false);
  };

  const totalEmbodied = spendLog.reduce((sum, item) => sum + item.embodiedKg, 0);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-sky/10 border border-brand-sky/30 flex items-center justify-center text-brand-sky shadow-glow-sky">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">Spend Log</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky border border-brand-sky/25 font-semibold">
                Consumer Purchases Log
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Supply-chain embodied carbon & life-cycle product accounting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400">Total Embodied: </span>
            <span className="font-bold font-mono text-brand-coral">{totalEmbodied.toFixed(1)} kg CO₂e</span>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-mint text-canvas-dark hover:brightness-110 transition-all shadow-glow-mint"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Cancel' : 'Log Purchase'}</span>
          </button>
        </div>
      </div>

      {/* Manual Entry Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-5 rounded-2xl bg-canvas-dark/90 border border-brand-mint/40 mb-6 space-y-4 shadow-glass"
        >
          <span className="text-xs font-bold text-brand-mint block">
            Register New Consumer Purchase
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] text-slate-400 mb-1 block">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Bamboo Fiber Towel"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint"
              >
                <option value="Apparel">Apparel & Textiles</option>
                <option value="Food">Food & Grocery</option>
                <option value="Home">Home & Kitchen</option>
                <option value="Electronics">Electronics</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Embodied Carbon (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={embodiedKg}
                onChange={(e) => setEmbodiedKg(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-mint"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isEco}
                onChange={(e) => setIsEco(e.target.checked)}
                className="rounded text-brand-mint focus:ring-0 w-4 h-4"
              />
              <span>Verified Eco / Regenerative Choice (Earns bonus ₹-Credits)</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-mint text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-mint transition-all"
            >
              Add to Ledger
            </button>
          </div>
        </form>
      )}

      {/* Purchase History Ledger */}
      <div className="space-y-2">
        {spendLog.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-xs flex-wrap gap-2"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  item.isEco
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-brand-coral/15 text-brand-coral'
                }`}
              >
                {item.isEco ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-bold text-white block">{item.item}</span>
                <span className="text-[10px] text-slate-400">
                  {item.category} • ₹{item.priceInr} INR
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  item.isEco
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : 'bg-brand-coral/10 border-brand-coral/25 text-brand-coral'
                }`}
              >
                {item.badge}
              </span>

              <span className="font-mono font-bold text-slate-200">
                +{item.embodiedKg} kg CO₂e
              </span>

              <span className="text-[10px] text-slate-500 min-w-[70px] text-right">
                {item.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export const KrayaLedger = SpendLog;

