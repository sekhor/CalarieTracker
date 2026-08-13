import React, { useEffect, useMemo, useState } from 'react';
import {
  Flame, Dumbbell, Wheat, Droplet,
  Camera, Plus, TrendingUp, Calendar,
  ChevronRight, Utensils, Save, SlidersHorizontal
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import MealPhoto from '../components/MealPhoto';
import { formatMalaysiaTime, getCurrentMalaysiaDateLabel } from '../utils/datetime';

const DEFAULT_GOALS = {
  daily_calorie_target: 2000,
  protein_target_g: 140,
  carbs_target_g: 225,
  fat_target_g: 65,
};

export default function DashboardView({ stats, onNavigate, onOpenAddModal, onSaveGoals }) {
  const today  = stats?.today  || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meal_count: 0 };
  const goals  = stats?.goals  || DEFAULT_GOALS;
  const weekly = stats?.weekly_trend   || [];
  const recent = stats?.recent_meals   || [];
  const [goalForm, setGoalForm] = useState(DEFAULT_GOALS);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [goalFeedback, setGoalFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    setGoalForm({
      daily_calorie_target: goals.daily_calorie_target ?? DEFAULT_GOALS.daily_calorie_target,
      protein_target_g: goals.protein_target_g ?? DEFAULT_GOALS.protein_target_g,
      carbs_target_g: goals.carbs_target_g ?? DEFAULT_GOALS.carbs_target_g,
      fat_target_g: goals.fat_target_g ?? DEFAULT_GOALS.fat_target_g,
    });
  }, [goals]);

  const isGoalFormDirty = useMemo(() => (
    Number(goalForm.daily_calorie_target) !== Number(goals.daily_calorie_target)
    || Number(goalForm.protein_target_g) !== Number(goals.protein_target_g)
    || Number(goalForm.carbs_target_g) !== Number(goals.carbs_target_g)
    || Number(goalForm.fat_target_g) !== Number(goals.fat_target_g)
  ), [goalForm, goals]);

  const calPct    = Math.min(100, Math.round((today.calories  / goals.daily_calorie_target) * 100));
  const remCal    = Math.max(0, goals.daily_calorie_target - today.calories);
  const proteinPct = Math.min(100, Math.round((today.protein_g / goals.protein_target_g) * 100));
  const carbsPct   = Math.min(100, Math.round((today.carbs_g   / goals.carbs_target_g)   * 100));
  const fatPct     = Math.min(100, Math.round((today.fat_g     / goals.fat_target_g)     * 100));

  const CIRC = 2 * Math.PI * 40;

  const tooltipStyle = {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 12,
  };

  const handleGoalChange = (field) => (event) => {
    const { value } = event.target;
    setGoalForm((current) => ({ ...current, [field]: value }));
  };

  const handleGoalSubmit = async (event) => {
    event.preventDefault();
    if (!onSaveGoals) return;

    setIsSavingGoals(true);
    setGoalFeedback({ type: '', message: '' });

    try {
      await onSaveGoals({
        daily_calorie_target: Number(goalForm.daily_calorie_target || DEFAULT_GOALS.daily_calorie_target),
        protein_target_g: Number(goalForm.protein_target_g || DEFAULT_GOALS.protein_target_g),
        carbs_target_g: Number(goalForm.carbs_target_g || DEFAULT_GOALS.carbs_target_g),
        fat_target_g: Number(goalForm.fat_target_g || DEFAULT_GOALS.fat_target_g),
      });
      setGoalFeedback({ type: 'success', message: 'Personal nutrition goals updated.' });
    } catch (error) {
      setGoalFeedback({ type: 'error', message: error?.response?.data?.error || 'Unable to save your goals right now.' });
    } finally {
      setIsSavingGoals(false);
    }
  };

  return (
    <div className="page-space animate-fadeIn">

      {/* Hero Banner */}
      <div className="glass-panel hero-banner">
        <div className="hero-banner-glow" />
        <div className="hero-banner-inner">
          <div>
            <div className="hero-date">
              <Calendar size={13} />
              {getCurrentMalaysiaDateLabel()}
            </div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Daily Calorie Dashboard</h1>
            <p className="text-sm text-muted">
              Track daily nutrition, scan meals instantly, and monitor health targets.
            </p>
          </div>
          <div className="hero-actions">
            <button onClick={() => onNavigate('scanner')} className="btn btn-emerald">
              <Camera size={16} /> Scan Meal Photo
            </button>
            <button onClick={onOpenAddModal} className="btn btn-primary">
              <Plus size={16} /> Manual Entry
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">

        {/* Calorie Ring */}
        <div className="glass-panel calorie-ring-card">
          <div className="calorie-ring-header">
            <span className="label-sm">Calories Today</span>
            <div className="calorie-ring-icon"><Flame size={18} /></div>
          </div>

          <div className="calorie-ring-center">
            <div className="calorie-ring-svg-wrap">
              <svg className="calorie-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.07)" strokeWidth="9" fill="transparent" />
                <circle
                  cx="50" cy="50" r="40"
                  stroke="url(#calGrad)"
                  strokeWidth="9"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC - (CIRC * calPct) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <defs>
                  <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="calorie-ring-text">
                <span className="calorie-ring-val">{today.calories}</span>
                <span className="calorie-ring-sub">/ {goals.daily_calorie_target} kcal</span>
              </div>
            </div>
          </div>

          <div className="calorie-ring-footer">
            <span className="text-muted text-xs">Remaining</span>
            <span className="font-bold text-amber" style={{ color: 'var(--amber)' }}>{remCal} kcal</span>
          </div>
        </div>

        {/* Right Section – Macros + Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Macro Cards */}
          <div className="macro-subgrid">
            {/* Protein */}
            <div className="glass-panel macro-card border-accent-emerald">
              <div className="macro-card-header">
                <span className="macro-label"><Dumbbell size={13} style={{ color: 'var(--emerald)' }} /> Protein</span>
                <span className="badge badge-emerald">{proteinPct}%</span>
              </div>
              <div className="macro-value">
                {today.protein_g}<span className="macro-value-unit"> / {goals.protein_target_g}g</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill progress-fill-emerald" style={{ width: `${proteinPct}%` }} />
              </div>
            </div>

            {/* Carbs */}
            <div className="glass-panel macro-card border-accent-blue">
              <div className="macro-card-header">
                <span className="macro-label"><Wheat size={13} style={{ color: 'var(--primary-light)' }} /> Carbs</span>
                <span className="badge badge-blue">{carbsPct}%</span>
              </div>
              <div className="macro-value">
                {today.carbs_g}<span className="macro-value-unit"> / {goals.carbs_target_g}g</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill progress-fill-blue" style={{ width: `${carbsPct}%` }} />
              </div>
            </div>

            {/* Fat */}
            <div className="glass-panel macro-card border-accent-rose">
              <div className="macro-card-header">
                <span className="macro-label"><Droplet size={13} style={{ color: 'var(--rose)' }} /> Fats</span>
                <span className="badge badge-amber">{fatPct}%</span>
              </div>
              <div className="macro-value">
                {today.fat_g}<span className="macro-value-unit"> / {goals.fat_target_g}g</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill progress-fill-rose" style={{ width: `${fatPct}%` }} />
              </div>
            </div>
          </div>

          {/* 7-Day Trend Chart */}
          <div className="glass-panel trend-card">
            <div className="trend-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} style={{ color: 'var(--primary-light)' }} />
                <span className="card-title">7-Day Calorie Intake Trend</span>
              </div>
              <button className="text-link" onClick={() => onNavigate('analytics')}>
                Analytics <ChevronRight size={14} />
              </button>
            </div>

            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={goals.daily_calorie_target} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Goal', fill: '#f59e0b', fontSize: 10 }} />
                  <Area type="monotone" dataKey="calories" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel settings-goals-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <SlidersHorizontal size={18} style={{ color: 'var(--primary-light)' }} />
            <div>
              <div className="section-title">Personal Goals</div>
              <div className="text-sm text-muted">Set your own daily calories and macro targets.</div>
            </div>
          </div>
          <span className="count-chip">Daily targets</span>
        </div>

        <form onSubmit={handleGoalSubmit} className="settings-form-fields">
          <div className="settings-goals-grid">
            <div>
              <div className="modal-macro-label" style={{ color: 'var(--amber)' }}>
                <Flame size={11} /> Calories
              </div>
              <input
                type="number"
                min="0"
                value={goalForm.daily_calorie_target}
                onChange={handleGoalChange('daily_calorie_target')}
                className="form-input"
              />
            </div>

            <div>
              <div className="modal-macro-label" style={{ color: 'var(--emerald)' }}>
                <Dumbbell size={11} /> Protein (g)
              </div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={goalForm.protein_target_g}
                onChange={handleGoalChange('protein_target_g')}
                className="form-input"
              />
            </div>

            <div>
              <div className="modal-macro-label" style={{ color: 'var(--primary-light)' }}>
                <Wheat size={11} /> Carbs (g)
              </div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={goalForm.carbs_target_g}
                onChange={handleGoalChange('carbs_target_g')}
                className="form-input"
              />
            </div>

            <div>
              <div className="modal-macro-label" style={{ color: 'var(--rose)' }}>
                <Droplet size={11} /> Fat (g)
              </div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={goalForm.fat_target_g}
                onChange={handleGoalChange('fat_target_g')}
                className="form-input"
              />
            </div>
          </div>

          <div className="settings-goals-footer">
            <div className={`settings-feedback ${goalFeedback.type ? `is-${goalFeedback.type}` : ''}`}>
              {goalFeedback.message || 'Your dashboard progress rings and chart goal line will use these values.'}
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSavingGoals || !isGoalFormDirty}>
              <Save size={15} />
              {isSavingGoals ? 'Saving...' : 'Save Goals'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Meals */}
      <div className="glass-panel recent-meals-card">
        <div className="card-header-row">
          <div className="card-header-left">
            <Utensils size={18} style={{ color: 'var(--emerald)' }} />
            <span className="section-title">Recent Meals</span>
            <span className="count-chip">{recent.length} records</span>
          </div>
          <button className="text-link" onClick={() => onNavigate('log')}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <Utensils size={40} className="empty-state-icon" />
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>No meals logged yet today</p>
            <button onClick={() => onNavigate('scanner')} className="btn btn-emerald btn-sm">
              <Camera size={14} /> Scan First Meal
            </button>
          </div>
        ) : (
          <div className="meals-grid">
            {recent.map(meal => (
              <div key={meal.id} className="meal-card glass-card-interactive">
                <div className="meal-card-thumb">
                  <MealPhoto imageUrl={meal.image_url} alt={meal.meal_name} />
                </div>
                <div className="meal-card-info">
                  <div className="meal-card-top">
                    <span className="badge badge-blue">{meal.meal_type}</span>
                    <span className="meal-card-time">
                      {formatMalaysiaTime(meal.logged_at)}
                    </span>
                  </div>
                  <div className="meal-card-name">{meal.meal_name}</div>
                  <div className="meal-card-macros">
                    <span className="meal-cal">{meal.calories} kcal</span>
                    <span style={{ color: 'var(--text-dim)' }}>P:{meal.protein_g}g</span>
                    <span style={{ color: 'var(--text-dim)' }}>C:{meal.carbs_g}g</span>
                    <span style={{ color: 'var(--text-dim)' }}>F:{meal.fat_g}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
