import React, { useState } from 'react';
import type { BreakdownItem } from '../lib/types';
import { formatKg, formatPercent, getQualityBadge } from '../lib/format';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Zap, Car, Flame, Trash2, ShieldCheck, ChevronRight, BookOpen, ExternalLink, X } from 'lucide-react';

interface BreakdownProps {
  items: BreakdownItem[];
}

const CATEGORY_ICONS = {
  electricity: Zap,
  transport: Car,
  fuel: Flame,
  waste: Trash2
};

const CATEGORY_COLORS: Record<string, string> = {
  electricity: '#059669', // Emerald
  transport: '#0284c7',   // Sky Blue
  fuel: '#d97706',        // Amber
  waste: '#9333ea'        // Purple
};

export const Breakdown: React.FC<BreakdownProps> = ({ items }) => {
  const [selectedItem, setSelectedItem] = useState<BreakdownItem | null>(null);

  const breakdownList = items && items.length > 0 ? items : [];

  const chartData = breakdownList.map((item) => ({
    name: item.label,
    value: item.kg,
    category: item.category,
    item
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-4">
        <div>
          <h3 className="text-xl font-bold text-stone-900 tracking-tight">Scope & Category Breakdown</h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Full GHG accounting scopes. Click any category card or slice to inspect statutory emission factors and peer citations.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Statutory Factor Governance</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl border border-[#ded7c8] bg-[#ffffff] shadow-sm">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(entry: any) => setSelectedItem(entry?.item || entry?.payload?.item || null)}
                  cursor="pointer"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] || '#059669'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#ded7c8',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#1c1917',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}
                  formatter={(val: any) => [`${formatKg(Number(val))} kg CO2e`, 'Emissions']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <span className="text-[11px] text-stone-500 font-mono mt-1">
            Click donut segment to inspect factor
          </span>
        </div>

        {/* Categories List Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {breakdownList.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] || Zap;
            const qBadge = getQualityBadge(item.quality);
            const isSelected = selectedItem?.category === item.category;

            return (
              <div
                key={item.category}
                onClick={() => setSelectedItem(item)}
                className={`cursor-pointer rounded-2xl border p-4.5 transition relative overflow-hidden group shadow-sm ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-300'
                    : 'border-[#ded7c8] bg-[#ffffff] hover:border-stone-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ color: CATEGORY_COLORS[item.category] || '#059669' }}
                      className="p-2 rounded-xl bg-[#f8f6f0] border border-[#ded7c8]"
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition">
                        {item.label}
                      </h4>
                      <span className="text-[11px] font-mono text-stone-600 font-medium">
                        {item.factor_value} {item.factor_unit}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${qBadge.bg} ${qBadge.text} ${qBadge.border}`}>
                    {qBadge.label}
                  </span>
                </div>

                <div className="mt-3.5 flex items-baseline justify-between border-t border-stone-100 pt-2.5">
                  <div>
                    <span className="text-xl font-extrabold font-mono text-stone-900">
                      {formatKg(item.kg)}
                    </span>
                    <span className="ml-1 text-[11px] text-stone-500">kg CO2e</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-600">{formatPercent(item.pct)}</span>
                </div>

                <div className="mt-2 text-[10px] text-stone-500 truncate flex items-center justify-between">
                  <span className="truncate">{item.source}</span>
                  <ChevronRight className="w-3 h-3 text-stone-400 shrink-0 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Factor Detail Modal / Popover */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-6 text-stone-900 shadow-xl space-y-4">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-stone-500 hover:bg-[#f2ede2] hover:text-stone-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#ded7c8] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {selectedItem.factor_id}
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-1">{selectedItem.label}</h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3">
                  <span className="text-stone-500 block mb-0.5">Emission Factor Value</span>
                  <span className="text-base font-mono font-bold text-emerald-800">
                    {selectedItem.factor_value} <span className="text-xs text-stone-600 font-normal">{selectedItem.factor_unit}</span>
                  </span>
                </div>
                <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3">
                  <span className="text-stone-500 block mb-0.5">Quality Tier</span>
                  <span className="text-xs font-mono font-bold text-stone-900 uppercase">
                    {selectedItem.quality} ({selectedItem.verified ? 'Peer Cited' : 'Unverified'})
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3">
                <span className="text-stone-600 block mb-1 uppercase font-bold text-[10px]">Statutory Source</span>
                <p className="text-stone-800 font-sans leading-relaxed">{selectedItem.source}</p>
                {selectedItem.citation && (
                  <a
                    href={selectedItem.citation}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline mt-2 font-mono text-[11px] font-semibold"
                  >
                    <span>View Gazette Reference</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="rounded-xl border border-[#ded7c8] bg-[#f8f6f0] p-3">
                <span className="text-stone-600 block mb-1 uppercase font-bold text-[10px]">Calculation Formula</span>
                <div className="font-mono text-emerald-900 bg-[#ffffff] p-2 rounded-lg border border-[#ded7c8]">
                  {selectedItem.activity_value} {selectedItem.activity_unit} × {selectedItem.factor_value} {selectedItem.factor_unit} = {formatKg(selectedItem.kg)} kg CO2e
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-[#f2ede2] hover:bg-[#ded7c8] text-xs font-bold text-stone-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
