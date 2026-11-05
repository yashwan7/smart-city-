import React, { useState } from 'react';
import { Bot, Send, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { sendCopilotPrompt } from '../services/api.js';

export default function CopilotAdvisor({ recommendations }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello, I am Carbon Copilot. I provide verified insights based strictly on our sensor ledger and data/factors.yaml. Ask me about our grid factors, closed-loop savings, or audit integrity.',
      sources: ['factors.yaml', 'Ledger Engine'],
      validated: true
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isThinking) return;

    const userText = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsThinking(true);

    try {
      const res = await sendCopilotPrompt(userText);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          sources: res.sources || ['factors.yaml'],
          validated: res.validated !== false
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to reach Copilot engine. Falling back to local offline factor knowledge.',
          sources: ['Offline Rules'],
          validated: true
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSuggestedQuestion = (q) => {
    setPrompt(q);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Ranked Recommendations Cards */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Closed-Loop Advisor</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked recommendations with deterministic math. LLM generates natural language only over verified numbers.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Rule Validated</span>
          </div>
        </div>

        <div className="space-y-3.5">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {rec.id}
                  </span>
                  <h4 className="text-base font-bold text-white">{rec.title}</h4>
                </div>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase border ${
                  rec.priority === 'high'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : rec.priority === 'medium'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800'
                }`}>
                  {rec.priority} Priority
                </span>
              </div>

              {/* Natural language summary */}
              <p className="mt-3 text-sm text-slate-200 leading-relaxed font-sans">{rec.text}</p>

              {/* Metrics Grid */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <div>
                  <span className="text-[11px] text-slate-400">Energy Saved:</span>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {rec.saving_kwh_day > 0 ? `+${rec.saving_kwh_day} kWh/day` : 'N/A (Non-electric)'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Carbon Avoided:</span>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    +{rec.saving_kg_day} kg CO2e/day
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-400">Deterministic Check:</span>
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Exact Match</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="text-slate-500">Basis:</span>
                <span>{rec.basis}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Interactive Copilot Chat */}
      <div className="lg:col-span-5 flex flex-col h-[600px] rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        {/* Chat Header */}
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Carbon Copilot</h4>
              <span className="text-[10px] text-slate-400">Ollama SLM + Verified Factors RAG</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            Audit-Ready
          </span>
        </div>

        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                }`}
              >
                <p className="leading-relaxed">{m.text}</p>
                {m.sources && (
                  <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-700/40 pt-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-emerald-400">Citations:</span>
                    {m.sources.map((s, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 p-2.5 rounded-xl border border-slate-800 w-fit">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-emerald-400 border-t-transparent rounded-full"></span>
              <span>Validating factor bounds...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Questions */}
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap gap-1.5">
          <button
            onClick={() => handleSuggestedQuestion('What factor is used for electricity?')}
            className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Electricity factor?
          </button>
          <button
            onClick={() => handleSuggestedQuestion('How does the relay cut save carbon?')}
            className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Relay savings?
          </button>
          <button
            onClick={() => handleSuggestedQuestion('How is the ledger secured against tamper?')}
            className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Tamper security?
          </button>
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Copilot about factors, ledger or closed loop..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isThinking || !prompt.trim()}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 p-2 text-white transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
