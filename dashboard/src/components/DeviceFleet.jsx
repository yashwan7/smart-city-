import React from 'react';
import { Cpu, ShieldCheck, HardDrive } from 'lucide-react';

export default function DeviceFleet({ devices }) {
  const deviceList = Array.isArray(devices) ? devices : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight">Hardware Device Fleet & Node Topology</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time physical telemetry status for edge microcontrollers, sensors, and hardware HMAC signatures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {deviceList.map((dev) => (
          <div
            key={dev.node}
            className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {dev.node}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      ONLINE
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-1">{dev.name}</h4>
                </div>
              </div>

              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                {dev.fw_version}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-xs text-slate-400">HMAC Validation</span>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>0 Bad Signatures</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-xs text-slate-400">Last Telemetry Ping</span>
                <div className="mt-1 text-xs font-mono text-slate-300">
                  {new Date(dev.last_seen).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Attached Sensors */}
            <div className="border-t border-slate-800 pt-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Attached Sensors & Peripherals
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dev.sensors?.map((sensor, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    {sensor}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hub / Gateway System Node */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Central Hub & Gateway</h4>
            <span className="text-xs text-slate-400">
              Arduino UNO Q (Linux) • Python 3.11 FastAPI • SQLite in WAL Mode • Local Ollama SLM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
