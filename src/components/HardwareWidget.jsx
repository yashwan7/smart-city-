import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Radio,
  Power,
  Activity,
  Cpu,
  Shield,
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
  Zap,
} from 'lucide-react';

export const HardwareWidget = () => {
  const { hardware, toggleHardwareConnection, toggleRelayLoadShed, generateSampleActivity } = useApp();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full transition-all">
      <div className="glass-panel rounded-2xl border border-white/10 shadow-glass overflow-hidden backdrop-blur-2xl">
        {/* Header Bar */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                hardware.connected
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34D399] animate-pulse'
                  : 'bg-amber-400 shadow-[0_0_12px_#FBBF24]'
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">House Hardware Telemetry</span>
                <span className="text-[10px] font-mono text-slate-400">({hardware.nodeId})</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {hardware.connected ? `Live Streaming • ${hardware.liveWatts} Watts` : 'Sensor Link Disconnected'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                hardware.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {hardware.connected ? 'Connected' : 'Offline'}
            </span>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Expanded Telemetry & Control Panel */}
        {expanded && (
          <div className="p-4 pt-1 border-t border-white/5 space-y-3 bg-canvas-dark/40">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Voltage</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {hardware.connected ? `${hardware.voltage} V` : '--'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Grid Freq</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {hardware.connected ? `${hardware.frequencyHz} Hz` : '--'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Relay Mode</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    hardware.meshRelayStatus === 'SHED_ACTIVE' ? 'text-brand-coral' : 'text-brand-mint'
                  }`}
                >
                  {hardware.meshRelayStatus}
                </span>
              </div>
            </div>

            {/* Interactive Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {/* Connection Toggle */}
              <button
                onClick={toggleHardwareConnection}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  hardware.connected
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 shadow-glow-mint'
                }`}
              >
                {hardware.connected ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Link Sensors</span>
                  </>
                )}
              </button>

              {/* Relay Load Shed Toggle */}
              <button
                disabled={!hardware.connected}
                onClick={toggleRelayLoadShed}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  !hardware.connected
                    ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-500'
                    : hardware.meshRelayStatus === 'SHED_ACTIVE'
                    ? 'bg-brand-coral/20 border border-brand-coral/40 text-brand-coral hover:bg-brand-coral/30 shadow-glow-coral'
                    : 'bg-brand-mint/15 border border-brand-mint/30 text-brand-mint hover:bg-brand-mint/25 shadow-glow-mint'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {hardware.meshRelayStatus === 'SHED_ACTIVE' ? 'Restore Normal' : 'Shed Peak Load'}
                </span>
              </button>
            </div>

            {/* In-device info footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>Firmware: {hardware.firmwareVersion}</span>
              <span>Mesh RSSI: {hardware.signalStrengthDbm} dBm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
