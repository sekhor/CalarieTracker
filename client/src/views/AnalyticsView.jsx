import React from 'react';
import { BarChart3, PieChart as PieIcon, TrendingUp, Zap } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const tooltipStyle = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 12,
};

export default function AnalyticsView({ stats }) {
  const weekly   = stats?.weekly_trend     || [];
  const catData  = stats?.category_breakdown || [];
  const today    = stats?.today || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const goals    = stats?.goals || { daily_calorie_target: 2000 };

  const totalWeekly = weekly.reduce((s, d) => s + (d.calories || 0), 0);
  const avgDaily    = Math.round(totalWeekly / Math.max(1, weekly.length));

  return (
    <div className="page-space animate-fadeIn">

      {/* Header */}
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="page-title">Nutrition Analytics & Dashboards</h2>
            <p className="text-sm text-muted">
              Visual metrics tracking calorie intake trends, meal distributions, and macronutrient targets.
            </p>
          </div>
        </div>
      </div>

      {/* Highlight Metrics */}
      <div className="analytics-highlights">
        <div className="glass-panel highlight-card border-accent-blue">
          <span className="highlight-label">Weekly Total Calories</span>
          <div className="highlight-val">{totalWeekly} <span className="highlight-unit">kcal</span></div>
        </div>
        <div className="glass-panel highlight-card border-accent-emerald">
          <span className="highlight-label">7-Day Daily Average</span>
          <div className="highlight-val">{avgDaily} <span className="highlight-unit">kcal / day</span></div>
        </div>
        <div className="glass-panel highlight-card border-accent-amber">
          <span className="highlight-label">Daily Target Goal</span>
          <div className="highlight-val">{goals.daily_calorie_target} <span className="highlight-unit">kcal</span></div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">

        {/* Bar Chart */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <TrendingUp size={18} className="chart-icon" />
            <h3 className="section-title">7-Day Intake vs Daily Target</h3>
          </div>
          <div className="chart-area-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={goals.daily_calorie_target} stroke="#f59e0b" strokeDasharray="4 4"
                  label={{ value: 'Target', fill: '#f59e0b', fontSize: 11 }} />
                <Bar dataKey="calories" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-panel chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="chart-header">
            <PieIcon size={18} style={{ color: 'var(--emerald)' }} />
            <h3 className="section-title">Today's Meal Distribution</h3>
          </div>

          <div className="chart-area-md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {catData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pie-legend">
            {catData.map((cat, i) => (
              <div key={cat.name} className="pie-legend-item">
                <span className="pie-legend-dot" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{cat.name}:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.72rem' }}>{cat.value} kcal</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Macro Detail */}
      <div className="glass-panel macro-detail-card">
        <div className="chart-header">
          <Zap size={18} style={{ color: 'var(--amber)' }} />
          <h3 className="section-title">Today's Macronutrient Energy Distribution</h3>
        </div>

        <div className="macro-boxes-3">
          <div className="macro-detail-box">
            <span className="macro-detail-label" style={{ color: 'var(--emerald)' }}>Protein</span>
            <span className="macro-detail-val">{today.protein_g}g</span>
            <span className="macro-detail-sub">({Math.round(today.protein_g * 4)} kcal)</span>
          </div>
          <div className="macro-detail-box">
            <span className="macro-detail-label" style={{ color: 'var(--primary-light)' }}>Carbohydrates</span>
            <span className="macro-detail-val">{today.carbs_g}g</span>
            <span className="macro-detail-sub">({Math.round(today.carbs_g * 4)} kcal)</span>
          </div>
          <div className="macro-detail-box">
            <span className="macro-detail-label" style={{ color: 'var(--rose)' }}>Fats</span>
            <span className="macro-detail-val">{today.fat_g}g</span>
            <span className="macro-detail-sub">({Math.round(today.fat_g * 9)} kcal)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
