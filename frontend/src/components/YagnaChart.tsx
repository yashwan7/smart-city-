import React from 'react';
import type { TimeseriesPoint } from '../lib/types';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { Activity, Sparkles } from 'lucide-react';

interface YagnaChartProps {
  data: TimeseriesPoint[];
  isLoading?: boolean;
}

export const YagnaChart: React.FC<YagnaChartProps> = ({ data, isLoading }) => {
  if (isLoading && (!data || data.length === 0)) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-6 shadow-sm">
        <div className="flex items-center gap-2 text-stone-600 text-xs font-mono">
          <span className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
          <span>Loading Yagna dual-axis telemetry stream...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col h-80 items-center justify-center rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-6 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2ede2] text-stone-600 mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-stone-900">No Timeseries Telemetry Recorded Yet</h4>
        <p className="text-xs text-stone-600 max-w-sm mt-1">
          Historical emission readings will populate here once sensor packets or activity logs arrive at the hub.
        </p>
      </div>
    );
  }

  // Find relay or lid events for event indicators
  const eventPoints = data.filter((p) => p.relay_event || p.lid_event);

  return (
    <div className="rounded-2xl border border-[#ded7c8] bg-[#ffffff] p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
              Dual-Axis Ledger Dynamics
            </span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-0.5">Yagna Net-Carbon Trajectory</h3>
          <p className="text-xs text-stone-600">
            Left axis: BAD emissions (red). Right axis: GOOD benefits (verified green solid, projected green dashed). NET line crosses zero.
          </p>
        </div>

        {eventPoints.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono bg-[#fdfcf9] px-3 py-1.5 rounded-xl border border-[#ded7c8] text-stone-700 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span className="font-medium">{eventPoints.length} Edge Events Tagged</span>
          </div>
        )}
      </div>

      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
              {/* BAD Emissions Gradient */}
              <linearGradient id="badGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
              </linearGradient>

              {/* Verified GOOD Benefit Gradient */}
              <linearGradient id="goodVerifiedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>

              {/* Projected GOOD Pattern */}
              <linearGradient id="goodProjectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d5" />

            <XAxis
              dataKey="time"
              stroke="#78716c"
              fontSize={11}
              tickLine={false}
            />

            {/* Left Y Axis: BAD (Emissions) */}
            <YAxis
              yAxisId="bad"
              stroke="#e11d48"
              fontSize={11}
              tickLine={false}
              unit=" kg"
              label={{ value: 'BAD (kg CO2e)', angle: -90, position: 'insideLeft', fill: '#e11d48', fontSize: 10 }}
            />

            {/* Right Y Axis: GOOD (Benefits) */}
            <YAxis
              yAxisId="good"
              orientation="right"
              stroke="#059669"
              fontSize={11}
              tickLine={false}
              unit=" kg"
              label={{ value: 'GOOD (kg CO2e)', angle: 90, position: 'insideRight', fill: '#059669', fontSize: 10 }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#ded7c8',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                color: '#1c1917',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
              formatter={(value: any, name: any) => [`${Number(value).toFixed(3)} kg CO2e`, name]}
            />

            <Legend
              wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
            />

            {/* Zero Net Reference Line */}
            <ReferenceLine yAxisId="bad" y={0} stroke="#78716c" strokeDasharray="3 3" label={{ value: 'Net Zero', fill: '#78716c', fontSize: 10 }} />

            {/* BAD Emissions Area */}
            <Area
              yAxisId="bad"
              type="monotone"
              dataKey="bad_kg"
              name="BAD (Emitted)"
              stroke="#e11d48"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#badGradient)"
            />

            {/* Projected GOOD Area (Dashed) */}
            <Area
              yAxisId="good"
              type="monotone"
              dataKey="good_projected_kg"
              name="GOOD (Projected Benefit)"
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#goodProjectedGradient)"
            />

            {/* Verified GOOD Area (Solid) */}
            <Area
              yAxisId="good"
              type="monotone"
              dataKey="good_verified_kg"
              name="GOOD (Verified Benefit)"
              stroke="#059669"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#goodVerifiedGradient)"
            />

            {/* NET Line */}
            <Line
              yAxisId="bad"
              type="monotone"
              dataKey="net_kg"
              name="NET (BAD - GOOD)"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {eventPoints.length > 0 && (
        <div className="border-t border-stone-100 pt-3 flex flex-wrap gap-2 text-[11px] font-mono">
          {eventPoints.map((pt, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8f6f0] border border-[#ded7c8] text-stone-800 shadow-sm">
              <span className="text-amber-800 font-bold">[{pt.time}]</span>
              <span>{pt.relay_event || pt.lid_event}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
