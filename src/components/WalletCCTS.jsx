import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Building,
  HeartHandshake,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';

export const WalletCCTS = () => {
  const { wallet, user, triggerConfetti, earnCredits } = useApp();
  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [upiId, setUpiId] = useState('yashwanth@okaxis');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const totalInr = wallet.totalCredits * wallet.inrExchangeRate;
  const userCredits = +(wallet.totalCredits * (wallet.userSharePct / 100)).toFixed(1);
  const userInr = Math.round(userCredits * wallet.inrExchangeRate);
  const ngoCredits = +(wallet.totalCredits * (wallet.ngoSharePct / 100)).toFixed(1);
  const ngoInr = Math.round(ngoCredits * wallet.inrExchangeRate);

  const handleWithdraw = (e) => {
    e.preventDefault();
    if (withdrawAmount > userCredits) {
      alert(`Max available for user withdrawal is ${userCredits} ₹-Credits.`);
      return;
    }
    triggerConfetti();
    setSuccessMsg(`Initiated withdrawal of ₹${withdrawAmount * 10} INR to UPI: ${upiId}!`);
    setTimeout(() => {
      setIsModalOpen(false);
      setSuccessMsg('');
    }, 2500);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 ambient-lavender pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-amber/10 border border-brand-amber/30 flex items-center justify-center text-brand-amber shadow-glow-amber">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">₹-Credit Wallet</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber border border-brand-amber/25 font-semibold">
                CCTS Compliant
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Indian Carbon Credit Trading Scheme (BEE / MoEFCC Standard • 1 ₹-Credit = ₹10 INR)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-amber to-brand-mint text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-amber transition-all flex items-center gap-2"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Redeem / Withdraw UPI</span>
        </button>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Pool */}
        <div className="p-5 rounded-2xl bg-canvas-dark/60 border border-white/10">
          <span className="text-xs text-slate-400 font-medium block mb-1">Total Earned Balance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-white">{wallet.totalCredits}</span>
            <span className="text-sm font-bold text-brand-amber">₹-Credits</span>
          </div>
          <span className="text-xs font-semibold text-slate-400 mt-1 block">
            Equivalent to: <span className="text-brand-mint font-bold">₹{totalInr} INR</span>
          </span>
        </div>

        {/* 70% User Share */}
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-400 font-medium">70% User Retainable</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              Direct Payout
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-emerald-400">{userCredits}</span>
            <span className="text-sm font-bold text-emerald-400">₹-Credits</span>
          </div>
          <span className="text-xs font-semibold text-slate-300 mt-1 block">
            Ready to withdraw: <strong className="text-white">₹{userInr} INR</strong>
          </span>
        </div>

        {/* 30% Green NGO Share */}
        <div className="p-5 rounded-2xl bg-brand-sky/10 border border-brand-sky/25">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-brand-sky font-medium">30% Green Tech Fund</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sky/20 text-brand-sky font-bold">
              Mandatory ESG
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-brand-sky">{ngoCredits}</span>
            <span className="text-sm font-bold text-brand-sky">₹-Credits</span>
          </div>
          <span className="text-xs font-semibold text-slate-300 mt-1 block">
            Auto-routed to NGOs: <strong className="text-white">₹{ngoInr} INR</strong>
          </span>
        </div>
      </div>

      {/* Automated Split Diagram */}
      <div className="p-4 rounded-2xl bg-canvas-dark/40 border border-white/5 mb-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-mint" />
            CCTS Statutory Payout Protocol
          </span>
          <span className="text-slate-400 font-mono text-[11px]">70% User / 30% NGO Split</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: '70%' }} />
          <div className="h-full bg-brand-sky rounded-r-full" style={{ width: '30%' }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            70% Direct User UPI Withdrawal
          </span>
          <span className="flex items-center gap-1.5 text-brand-sky font-medium">
            <span className="w-2 h-2 rounded-full bg-brand-sky" />
            30% Verified Western Ghats & Lakes Restoration
          </span>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
          Recent Blockchain-Hashed Ledger Transactions
        </span>
        <div className="space-y-2">
          {wallet.transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-xs flex-wrap gap-2"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    tx.type === 'EARN'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : tx.type === 'SPEND'
                      ? 'bg-brand-coral/15 text-brand-coral'
                      : 'bg-brand-sky/15 text-brand-sky'
                  }`}
                >
                  {tx.type === 'EARN' ? '+' : '-'}
                </div>
                <div>
                  <span className="font-bold text-white block">{tx.desc}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{tx.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`font-mono font-bold text-sm ${
                    tx.credits > 0 ? 'text-emerald-400' : 'text-brand-coral'
                  }`}
                >
                  {tx.credits > 0 ? `+${tx.credits}` : tx.credits} ₹-Cr
                </span>
                <span className="text-[10px] text-slate-500 min-w-[70px] text-right">
                  {tx.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/20 max-w-md w-full relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-white">Withdraw to Bank / UPI</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {successMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Withdrawal Amount (Max: {userCredits} ₹-Credits)
                  </label>
                  <input
                    type="number"
                    max={userCredits}
                    min="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
                    className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                  <span className="text-[11px] text-brand-mint mt-1 block">
                    Equivalent INR payout: ₹{withdrawAmount * 10} INR
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">VPA / UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-brand-mint text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-mint"
                >
                  Confirm Instant Transfer (₹{withdrawAmount * 10})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
