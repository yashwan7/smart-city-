import React from 'react';
import type { DeviceNode } from '../lib/types';
import { formatTime } from '../lib/format';
import { Cpu, ShieldCheck, HardDrive, WifiOff } from 'lucide-react';

interface DevicesProps {
  devices: DeviceNode[];
}

export const Devices: React.FC<DevicesProps> = ({ devices }) => {
  const deviceList = devices && devices.length > 0 ? devices : [
    {
      node: 'Node A1',
      name: 'Energy & Commute Kiosk',
      status: 'online' as const,
      last_seen: new Date().toISOString(),
      fw_version: 'v1.4-mcxn236',
      last_seq: 1793200000123,
      bad_sig_count: 0,
      sensors: ['LDR (ADC0_CH1)', 'MQ-135 Gas', 'INA219 Current/Power', '10A Relay Load', '4x Commute Buttons', 'ST7735 TFT Meter'],
      current_state: 'DAYLIGHT_WASTE (Relay Cut Ready)'
    },
    {
      node: 'Node B1',
      name: 'Waste & Garden Monitor',
      status: 'online' as const,
      last_seen: new Date(Date.now() - 4000).toISOString(),
      fw_version: 'v1.2-esp32',
      last_seq: 1793200000118,
      bad_sig_count: 0,
      sensors: ['HC-SR04 Ultrasonic (63%)', 'Capacitive Soil (41%)', 'Raindrop Sensor (Dry)', 'Submersible Pump Relay'],
      current_state: 'ACCUMULATING (Lid Closed)'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#ded7c8] pb-4">
        <h3 className="text-xl font-bold text-stone-900 tracking-tight">Hardware Device Fleet & Node Topology</h3>
        <p className="text-xs text-stone-600 mt-0.5">
          Real-time physical telemetry status for microcontrollers, edge sensors, and hardware HMAC-SHA256 signatures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {deviceList.map((dev) => {
          const isOnline = dev.status === 'online';
          const isOffline = dev.status === 'offline';

          return (
            <div
              key={dev.node}
              className="rounded-2xl border border-[#ded7c8] bg-white p-6 shadow-sm space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-[#ded7c8] pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {isOnline ? <Cpu className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                        {dev.node}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] font-semibold ${
                        isOnline ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${
                          isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                        }`} />
                        {isOnline ? 'ONLINE' : isOffline ? 'DISCONNECTED' : 'STATUS UNKNOWN'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900 mt-1">{dev.name}</h4>
                  </div>
                </div>

                <span className="text-xs font-mono text-stone-600 bg-[#f8f6f0] px-2 py-1 rounded-lg border border-[#ded7c8]">
                  {dev.fw_version}
                </span>
              </div>

              {/* State & Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3">
                  <span className="text-xs text-stone-500">HMAC-SHA256 Signature</span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{dev.bad_sig_count} Signature Failures</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3">
                  <span className="text-xs text-stone-500">Last Telemetry Ping</span>
                  <div className="mt-1 text-xs font-mono text-stone-800 font-semibold">
                    {formatTime(dev.last_seen)}
                  </div>
                </div>
              </div>

              {dev.current_state && (
                <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3 text-xs font-mono text-stone-700">
                  <span className="text-stone-500">Current Edge State: </span>
                  <span className="text-emerald-800 font-semibold">{dev.current_state}</span>
                </div>
              )}

              {/* Attached Sensor Components */}
              <div className="border-t border-[#ded7c8] pt-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-2">
                  Attached Sensors & Peripherals
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dev.sensors?.map((sensor, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#f8f6f0] text-stone-700 border border-[#ded7c8]"
                    >
                      {sensor}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Central Hub System Card */}
      <div className="rounded-2xl border border-[#ded7c8] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-900">Central Hub & Cryptographic Anchor</h4>
            <span className="text-xs text-stone-600">
              Arduino UNO Q (Linux OS) • Python 3.11 FastAPI • SQLite in WAL Mode • Local Ollama SLM (RAG)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
