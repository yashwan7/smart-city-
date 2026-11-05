import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Fingerprint,
} from 'lucide-react';

export const AuthModal = () => {
  const { isAuthOpen, setIsAuthOpen, user, setUser, triggerConfetti } = useApp();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Register form state
  const [regFullName, setRegFullName] = useState('Yashwanth Gowda');
  const [regDob, setRegDob] = useState('2003-08-14');
  const [regPhone, setRegPhone] = useState('+91 98451 23049');
  const [regEmail, setRegEmail] = useState('yashwanth@izanagi.eco');
  const [regAadhaar, setRegAadhaar] = useState('5412 8901 8914');
  const [regPassword, setRegPassword] = useState('••••••••');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('yashwanth@izanagi.eco');
  const [loginPassword, setLoginPassword] = useState('••••••••');

  if (!isAuthOpen) return null;

  const handleRegister = (e) => {
    e.preventDefault();
    const masked = regAadhaar.length >= 4
      ? `•••• •••• ${regAadhaar.replace(/\s+/g, '').slice(-4)}`
      : '•••• •••• 8914';

    setUser({
      ...user,
      fullName: regFullName,
      email: regEmail,
      phone: regPhone,
      dob: regDob,
      maskedAadhaar: masked,
      avatar: '🌱',
      rankTier: 'Eco-Yodha',
    });

    triggerConfetti();
    setIsAuthOpen(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setUser({
      ...user,
      email: loginIdentifier,
      fullName: loginIdentifier.includes('medha') ? 'Medha Umesh' : 'Yashwanth Gowda',
      avatar: loginIdentifier.includes('medha') ? '👩‍💻' : '🌱',
      rankTier: loginIdentifier.includes('medha') ? 'Mesh Architect' : 'Eco-Yodha',
    });
    setIsAuthOpen(false);
  };

  const fillDemoYashwanth = () => {
    setLoginIdentifier('yashwanth@izanagi.eco');
    setLoginPassword('DemoPassword2026!');
  };

  const fillDemoMedha = () => {
    setLoginIdentifier('medha@izanagi.eco');
    setLoginPassword('DemoPassword2026!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel max-w-md w-full rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => setIsAuthOpen(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Banner */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-mint to-brand-lavender p-0.5 flex items-center justify-center shadow-glow-mint">
            <span className="rupee-symbol font-black text-canvas-dark text-sm">₹</span>
          </div>
          <span className="font-display font-extrabold text-lg text-white">
            <span className="text-brand-mint rupee-symbol">₹</span>uta Access Portal
          </span>
        </div>

        {/* Auth Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-canvas-dark/80 border border-white/5 mb-6 text-xs">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              tab === 'login'
                ? 'bg-brand-mint text-canvas-dark shadow-glow-mint'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              tab === 'register'
                ? 'bg-brand-mint text-canvas-dark shadow-glow-mint'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Aadhaar Account
          </button>
        </div>

        {/* Login Flow */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Identifier (Email or Phone Number)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-canvas-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint"
                  required
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-canvas-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-mint to-brand-sky text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-mint transition-all"
            >
              Sign In to ₹uta
            </button>

            {/* Quick Demo Login Preset Buttons */}
            <div className="pt-3 border-t border-white/10 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">
                Quick Demo Resident Credentials
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fillDemoYashwanth}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 font-semibold"
                >
                  🌱 Yashwanth (Lead)
                </button>
                <button
                  type="button"
                  onClick={fillDemoMedha}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 font-semibold"
                >
                  👩‍💻 Medha (Mesh)
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Register Flow */
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-canvas-card border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-mint"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Date of Birth</label>
                <input
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  className="w-full bg-canvas-card border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-mint"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Phone Number</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-canvas-card border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-mint"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Email Address</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-mint"
                required
              />
            </div>

            {/* Crucial Aadhaar Masked Field */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Fingerprint className="w-3.5 h-3.5 text-brand-mint" />
                  <span>Aadhaar Number [Masked]</span>
                </label>
                <span className="text-[10px] text-brand-mint font-semibold">UIDAI Verified</span>
              </div>
              <input
                type="text"
                placeholder="XXXX XXXX 8914"
                value={regAadhaar}
                onChange={(e) => setRegAadhaar(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-mint tracking-wider"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Security Password</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-mint"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-brand-mint text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-mint transition-all mt-2"
            >
              Complete Registration & Claim 50 ₹-Credits
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
