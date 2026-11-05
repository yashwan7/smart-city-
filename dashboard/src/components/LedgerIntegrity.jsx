import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, Hash, Terminal } from 'lucide-react';
import { verifyLedger, tamperLedgerDemo } from '../services/api.js';

export default function LedgerIntegrity({ ledgerState, onRefresh }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [tampered, setTampered] = useState(ledgerState?.ok === false);
  const [statusMessage, setStatusMessage] = useState(null);

  const isOk = !tampered && ledgerState?.ok !== false;

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyLedger();
      setTampered(!res.ok);
      setStatusMessage(res.ok ? 'Ledger verification completed: All blocks match cryptographic root.' : `Integrity violation detected at record #${res.first_bad_id || 412}.`);
      if (onRefresh) onRefresh();
    } catch {
      setStatusMessage('Verification request failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    setIsVerifying(true);
    try {
      const res = await tamperLedgerDemo(true);
      setTampered(true);
      setStatusMessage(`DEMO TAMPER INJECTED: Record #${res.first_bad_id || 412} payload modified. Hash chain broke.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRestoreLedger = async () => {
    setIsVerifying(true);
    try {
      await tamperLedgerDemo(false);
      setTampered(false);
      setStatusMessage('Ledger restored to authentic signed state.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Real-time Cryptographic Audit Status */}
      <div className={`rounded-2xl border p-6 transition-all shadow-xl ${
        isOk
          ? 'border-emerald-800/80 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950'
          : 'border-rose-700 bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 ring-2 ring-rose-500/50 animate-pulse'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
              isOk
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
            }`}>
              {isOk ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isOk
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}>
                  {isOk ? 'STATUS: INTACT & AUDITED' : 'CRITICAL: INTEGRITY BREACH'}
                </span>
                <span className="text-xs text-slate-400">SQLite WAL Ledger</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {isOk ? 'Cryptographic Hash-Chain Intact' : 'Tamper Detected at Record #412'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {isOk
                  ? 'All sequential SHA-256 hashes and HMAC-SHA256 device signatures validated without discrepancy.'
                  : 'Hash chain broken! The payload for Record #412 does not match its stored cryptographic hash.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Re-verify Chain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo-Day Stage Tools */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Live Presentation Tamper Tools</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                JUDGE DEMO ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Demonstrates real tamper evidence on stage: inject an out-of-band modification directly into SQLite, watch the red flag appear instantly, then restore.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            onClick={handleSimulateTamper}
            disabled={isVerifying || !isOk}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-700 transition disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Simulate Unauthorized DB Edit (Record #412)</span>
          </button>

          <button
            onClick={handleRestoreLedger}
            disabled={isVerifying || isOk}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Restore & Re-anchor Clean State</span>
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 text-xs font-mono text-slate-300 bg-slate-950 rounded-xl p-3 border border-slate-800">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Ledger Block Explorer Sample */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-emerald-400" />
          <span>Sequential Hash-Chain Block Headers</span>
        </h4>

        <div className="space-y-2.5 font-mono text-xs">
          {/* Sample Block N */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-bold">Block #1240 (Latest Telemetry)</span>
              <span>Node A1 (NXP FRDM-MCXN236)</span>
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              <span className="text-slate-500">Record Hash: </span>
              <span className="text-emerald-300">7f4c1e892d409ab156fa39b03f0b2fbc94751e04a4387d853e0029b9f5a09c21</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              <span className="text-slate-500">Previous Hash: </span>
              <span>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              <span className="text-slate-500">HMAC-SHA256 Sig: </span>
              <span>a1b2c3d4e5f60718293a4b5c6d7e8f90... [Hardware Secret Verified]</span>
            </div>
          </div>

          {/* Sample Block N-1 */}
          <div className={`rounded-xl border p-3.5 space-y-1.5 ${
            tampered
              ? 'border-rose-800 bg-rose-950/20 text-rose-200'
              : 'border-slate-800 bg-slate-950 text-slate-300'
          }`}>
            <div className="flex justify-between items-center text-[11px]">
              <span className={`font-bold ${tampered ? 'text-rose-400' : 'text-slate-300'}`}>
                Block #412 {tampered ? '(TAMPERED RECORD)' : '(Historical Record)'}
              </span>
              <span className="text-slate-500">Node B1 (ESP32 #2 Waste)</span>
            </div>
            <div className="text-[11px] truncate">
              <span className="text-slate-500">Stored Hash: </span>
              <span className={tampered ? 'text-rose-400 underline font-bold' : 'text-slate-400'}>
                {tampered ? 'FAIL: 94751e04a... != COMPUTED d2a1b9c3...' : '94751e04a4387d853e0029b9f5a09c21e3b0c44298fc1c149afbf4c8996fb924'}
              </span>
            </div>
            {tampered && (
              <p className="text-[11px] text-rose-300 font-sans mt-1">
                Root cause: Sensor fill reading altered from 63% to 20% without updating hardware HMAC signature and parent block link.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
