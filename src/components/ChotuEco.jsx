import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  MessageCircle,
  X,
  Send,
  Zap,
  Leaf,
  Car,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingDown,
  Flame,
} from 'lucide-react';

export const ChotuEco = () => {
  const {
    powerPulse,
    ecoCommute,
    compostNest,
    spendLog,
    wallet,
    yagnaAnalytics,
    chotuMessages,
    isChotuOpen,
    setIsChotuOpen,
    sendUserChotuMessage,
    toggleEcoMode,
    toggleRelayLoadShed,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (isChotuOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chotuMessages, isChotuOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendUserChotuMessage(inputVal);
    setInputVal('');
  };

  const quickChips = [
    { label: '⚡ How to save 5 kWh today?', query: 'Bro, how do I save electricity today?' },
    { label: '🚗 Analyze my commute', query: 'Bro, analyze my commute and tell me what I am doing wrong' },
    { label: '🌿 Compost Nest check', query: 'Bro, how is my compost doing?' },
    { label: '💰 Check my ₹-Credits', query: 'Bro, what is my credit balance and how do I withdraw?' },
  ];

  // Latest high-priority tip from Chotu based on real-time data
  const getDynamicBroTip = () => {
    if (powerPulse.currentKwh > 3.0) {
      return "Bro, your AC is running too high today! Flip to Eco Mode to save 1.4 kW.";
    }
    if (ecoCommute.transportEmissionsKg > 3.0) {
      return "Bro, you logged 18 km in a petrol car — why not switch to Namma Metro tomorrow?";
    }
    if (compostNest.compostMaturityPct > 75) {
      return "Bro, awesome job on the compost today! Batch is at 78% maturity (+50 credits soon)!";
    }
    return "Bro, Yagna Engine is balancing nicely! Keep up the green choices!";
  };

  return (
    <>
      {/* Floating Avatar Trigger (Bottom Left or Docked) */}
      <div className="fixed bottom-6 left-6 z-50 flex items-end gap-3 pointer-events-auto">
        {/* Interactive Speech Bubble (when collapsed) */}
        {!isChotuOpen && (
          <div
            onClick={() => setIsChotuOpen(true)}
            className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-panel border border-brand-mint/40 shadow-glow-mint cursor-pointer hover:border-brand-mint transition-all animate-bounce duration-1000 max-w-xs"
          >
            <div className="w-2 h-2 rounded-full bg-brand-mint animate-ping" />
            <p className="text-xs text-white font-medium truncate">
              {getDynamicBroTip()}
            </p>
          </div>
        )}

        {/* Chotu-Eco Cute Character Avatar Button */}
        <button
          onClick={() => setIsChotuOpen(!isChotuOpen)}
          className="relative group p-1.5 rounded-full bg-gradient-to-tr from-brand-mint via-brand-sky to-brand-lavender shadow-glow-mint transition-all duration-300 transform hover:scale-105 active:scale-95"
          title="Chat with Chotu-Eco (Your AI Sustainability Companion)"
        >
          {/* Animated Cute Avatar Container */}
          <div className="w-14 h-14 rounded-full bg-[#0B0F19] border-2 border-[#2DD4BF] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Cute Leaf Antenna */}
            <div className="absolute top-1 inset-x-0 mx-auto w-2 h-2 text-emerald-400 animate-spin-slow">
              🌱
            </div>

            {/* Cute Kiddo Character Face */}
            <div className="flex items-center gap-1.5 mt-2.5">
              {/* Left Eye */}
              <div className="w-2 h-3 rounded-full bg-brand-mint group-hover:scale-y-75 transition-transform" />
              {/* Glowing Cheeks */}
              <div className="w-1 h-1 rounded-full bg-brand-coral opacity-80" />
              {/* Right Eye */}
              <div className="w-2 h-3 rounded-full bg-brand-mint group-hover:scale-y-75 transition-transform" />
            </div>

            {/* Cute Smile */}
            <div className="w-3.5 h-1.5 border-b-2 border-brand-mint rounded-full mt-1" />

            {/* Small status indicator */}
            <div className="absolute bottom-0 inset-x-0 bg-brand-mint/20 text-[7px] text-brand-mint font-bold text-center uppercase tracking-tighter">
              AI Buddy
            </div>
          </div>

          {/* Notification Ping Badge */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-mint opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-mint text-[9px] font-black text-canvas-dark items-center justify-center">
              !
            </span>
          </span>
        </button>
      </div>

      {/* Expanded Chotu-Eco AI Companion Dialog */}
      {isChotuOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-[360px] sm:w-[420px] max-h-[580px] h-[550px] flex flex-col rounded-3xl glass-panel border border-brand-mint/40 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Chotu Header */}
          <div className="p-4 bg-gradient-to-r from-canvas-card via-canvas-dark to-canvas-card border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-xl shadow-glow-mint">
                🌱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-display">
                    Chotu-Eco <span className="text-brand-mint font-normal text-xs">(AI Buddy)</span>
                  </h3>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Your informal, talkative sustainability wingman
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsChotuOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live At-a-Glance Telemetry Scanner */}
          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-3 h-3 text-brand-mint" />
              Power: <strong className="text-white">{powerPulse.currentKwh} kW</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Car className="w-3 h-3 text-brand-coral" />
              Transit: <strong className="text-white">{ecoCommute.todayKm} km</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Leaf className="w-3 h-3 text-emerald-400" />
              Compost: <strong className="text-white">{compostNest.compostMaturityPct}%</strong>
            </span>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {chotuMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'chotu' && (
                  <div className="w-7 h-7 rounded-xl bg-brand-mint/20 border border-brand-mint/30 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    🌱
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-brand-mint text-canvas-dark font-medium shadow-glow-mint'
                      : 'bg-white/5 border border-white/10 text-slate-200'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`text-[9px] block mt-1 ${
                      msg.sender === 'user' ? 'text-canvas-dark/70 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => sendUserChotuMessage(chip.query)}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-slate-300 hover:text-white whitespace-nowrap transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-canvas-card border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask Chotu anything... e.g. 'Bro, why is my bill high?'"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-mint"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-brand-mint text-canvas-dark hover:brightness-110 shadow-glow-mint transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

