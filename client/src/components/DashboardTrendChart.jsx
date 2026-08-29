import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 12,
};

export default function DashboardTrendChart({ weekly, calorieTarget }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" stroke="#6b7280" fontSize={11} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <ReferenceLine
          y={calorieTarget}
          stroke="#f59e0b"
          strokeDasharray="3 3"
          label={{ value: 'Goal', fill: '#f59e0b', fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="calories"
          stroke="#3b82f6"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#areaGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
