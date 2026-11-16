import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface MetricsChartProps {
  categoryDistribution: Array<{ category: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  resolutionRatePercent: number;
  avgResolutionTimeSeconds: number;
}

const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export const MetricsChart: React.FC<MetricsChartProps> = ({
  categoryDistribution,
  priorityDistribution,
  resolutionRatePercent,
  avgResolutionTimeSeconds,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Category Distribution Bar Chart */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Incident Category Volume</h3>
            <p className="text-[11px] text-slate-400">Distribution of employee support tickets by domain</p>
          </div>
          <span className="text-xs font-mono bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
            Real-time Aggregation
          </span>
        </div>

        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis
                dataKey="category"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {categoryDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SLA & MTTR Efficiency Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Autonomous Efficiency</h3>
          <p className="text-[11px] text-slate-400">Mean Time to Resolution (MTTR) vs Human SLA</p>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Resolution Rate</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{resolutionRatePercent}%</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                Zero Touch
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Average MTTR</div>
              <div className="text-xl font-extrabold text-blue-400 mt-0.5">
                {avgResolutionTimeSeconds.toFixed(1)}s
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono">
              Industry Avg: 4.2 hrs
            </div>
          </div>
        </div>

        {/* Priority distribution chips */}
        <div className="border-t border-slate-800 pt-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Priority Queue Breakdown</div>
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            {priorityDistribution.map((p) => (
              <div key={p.priority} className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <div className="font-bold text-slate-200">{p.priority}</div>
                <div className="text-[10px] font-mono text-blue-400">{p.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

