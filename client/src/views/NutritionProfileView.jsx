import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, Save, Flame, Dumbbell,
  Wheat, Droplet, SlidersHorizontal, User, HeartPulse,
  Sparkles
} from 'lucide-react';
import { fetchNutritionProfile, saveNutritionProfile } from '../services/api';

const DEFAULT_PROFILE = {
  // Physical Profile & Lifestyle
  age: '',
  sex: '',
  height_cm: '',
  weight_kg: '',
  activity_level: '',
  goal_type: '',
  dietary_style: '',
  allergies: '',
  disliked_foods: '',
  preferred_cuisines: '',
  meals_per_day_target: '',
  medical_disclaimer_ack: false,
  notes: '',
  // Daily Nutrition Goals
  daily_calorie_target: 2000,
  protein_target_g: 140,
  carbs_target_g: 225,
  fat_target_g: 65,
};

function listToText(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

export default function NutritionProfileView({ onProfileSaved }) {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetchNutritionProfile();
      const profile = response.profile || {};
      const goals = response.goals || {};

      setForm({
        age: profile.age ?? '',
        sex: profile.sex || '',
        height_cm: profile.height_cm ?? '',
        weight_kg: profile.weight_kg ?? '',
        activity_level: profile.activity_level || '',
        goal_type: profile.goal_type || '',
        dietary_style: profile.dietary_style || '',
        allergies: listToText(profile.allergies),
        disliked_foods: listToText(profile.disliked_foods),
        preferred_cuisines: listToText(profile.preferred_cuisines),
        meals_per_day_target: profile.meals_per_day_target ?? '',
        medical_disclaimer_ack: Boolean(profile.medical_disclaimer_ack),
        notes: profile.notes || '',
        daily_calorie_target: goals.daily_calorie_target ?? DEFAULT_PROFILE.daily_calorie_target,
        protein_target_g: goals.protein_target_g ?? DEFAULT_PROFILE.protein_target_g,
        carbs_target_g: goals.carbs_target_g ?? DEFAULT_PROFILE.carbs_target_g,
        fat_target_g: goals.fat_target_g ?? DEFAULT_PROFILE.fat_target_g,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to load profile and goals.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const profileCompleteness = useMemo(() => {
    const fields = ['goal_type', 'dietary_style', 'activity_level', 'meals_per_day_target'];
    const completed = fields.filter((field) => String(form[field] || '').trim()).length + (form.medical_disclaimer_ack ? 1 : 0);
    return Math.round((completed / 5) * 100);
  }, [form]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        ...form,
        daily_calorie_target: Number(form.daily_calorie_target || DEFAULT_PROFILE.daily_calorie_target),
        protein_target_g: Number(form.protein_target_g || DEFAULT_PROFILE.protein_target_g),
        carbs_target_g: Number(form.carbs_target_g || DEFAULT_PROFILE.carbs_target_g),
        fat_target_g: Number(form.fat_target_g || DEFAULT_PROFILE.fat_target_g),
      };

      await saveNutritionProfile(payload);
      setFeedback({ type: 'success', message: 'Personal profile & daily nutrition goals saved successfully!' });
      
      if (onProfileSaved) {
        await onProfileSaved();
      }
      await loadProfile();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to save profile and goals.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-space animate-fadeIn">
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="page-title">Personal Profile & Goals</h2>
            <p className="text-sm text-muted">
              Manage your personal physical attributes, dietary preferences, and daily calorie & macro targets in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        {/* Left summary / overview card */}
        <section className="glass-panel profile-summary-card">
          <div className="section-title">Profile Readiness</div>
          <div className="profile-completion-value">{profileCompleteness}%</div>
          <p className="text-sm text-muted">A fuller profile improves AI meal suggestions, coaching relevance, and health targets.</p>
          <div className="progress-bar" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="progress-fill progress-fill-emerald" style={{ width: `${profileCompleteness}%` }} />
          </div>

          <div className="section-title" style={{ marginTop: '1.5rem', marginBottom: '0.25rem' }}>Active Targets</div>
          <p className="text-xs text-muted">Dashboard rings and chart goal lines adapt to these targets.</p>
          
          <div className="profile-goals-preview">
            <div className="profile-goal-chip">
              <span className="profile-goal-chip-label" style={{ color: 'var(--amber)' }}>
                <Flame size={12} /> Calories
              </span>
              <span className="profile-goal-chip-val">{form.daily_calorie_target || 0} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>kcal</span></span>
            </div>

            <div className="profile-goal-chip">
              <span className="profile-goal-chip-label" style={{ color: 'var(--emerald)' }}>
                <Dumbbell size={12} /> Protein
              </span>
              <span className="profile-goal-chip-val">{form.protein_target_g || 0} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>g</span></span>
            </div>

            <div className="profile-goal-chip">
              <span className="profile-goal-chip-label" style={{ color: 'var(--primary-light)' }}>
                <Wheat size={12} /> Carbs
              </span>
              <span className="profile-goal-chip-val">{form.carbs_target_g || 0} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>g</span></span>
            </div>

            <div className="profile-goal-chip">
              <span className="profile-goal-chip-label" style={{ color: 'var(--rose)' }}>
                <Droplet size={12} /> Fats
              </span>
              <span className="profile-goal-chip-val">{form.fat_target_g || 0} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>g</span></span>
            </div>
          </div>
        </section>

        {/* Right unified form card */}
        <section className="glass-panel profile-form-card">
          <form onSubmit={handleSubmit} className="profile-form-grid">
            
            {/* Section 1: Daily Nutrition Goals */}
            <div className="profile-section-title">
              <SlidersHorizontal size={17} style={{ color: 'var(--primary-light)' }} />
              <span>Personal Nutrition Goals</span>
            </div>

            <label className="form-group">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--amber)' }}>
                <Flame size={13} /> Daily Calorie Target (kcal)
              </span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.daily_calorie_target}
                onChange={handleChange('daily_calorie_target')}
                placeholder="2000"
              />
            </label>

            <label className="form-group">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--emerald)' }}>
                <Dumbbell size={13} /> Protein Target (g)
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-input"
                value={form.protein_target_g}
                onChange={handleChange('protein_target_g')}
                placeholder="140"
              />
            </label>

            <label className="form-group">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-light)' }}>
                <Wheat size={13} /> Carbs Target (g)
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-input"
                value={form.carbs_target_g}
                onChange={handleChange('carbs_target_g')}
                placeholder="225"
              />
            </label>

            <label className="form-group">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--rose)' }}>
                <Droplet size={13} /> Fat Target (g)
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-input"
                value={form.fat_target_g}
                onChange={handleChange('fat_target_g')}
                placeholder="65"
              />
            </label>

            {/* Section 2: Physical Profile & Lifestyle */}
            <div className="profile-section-title">
              <User size={17} style={{ color: 'var(--emerald)' }} />
              <span>Personal Profile & Lifestyle</span>
            </div>

            <label className="form-group">
              <span>Age</span>
              <input type="number" min="1" max="120" className="form-input" value={form.age} onChange={handleChange('age')} placeholder="e.g. 28" />
            </label>

            <label className="form-group">
              <span>Sex</span>
              <select className="form-select" value={form.sex} onChange={handleChange('sex')}>
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="form-group">
              <span>Height (cm)</span>
              <input type="number" min="50" max="260" className="form-input" value={form.height_cm} onChange={handleChange('height_cm')} placeholder="e.g. 175" />
            </label>

            <label className="form-group">
              <span>Weight (kg)</span>
              <input type="number" min="20" max="300" step="0.1" className="form-input" value={form.weight_kg} onChange={handleChange('weight_kg')} placeholder="e.g. 70" />
            </label>

            <label className="form-group">
              <span>Activity Level</span>
              <select className="form-select" value={form.activity_level} onChange={handleChange('activity_level')}>
                <option value="">Select</option>
                <option value="sedentary">Sedentary (desk job, little exercise)</option>
                <option value="light">Light (1-3 days/week exercise)</option>
                <option value="moderate">Moderate (3-5 days/week exercise)</option>
                <option value="active">Active (6-7 days/week exercise)</option>
                <option value="very_active">Very active (intense training)</option>
              </select>
            </label>

            <label className="form-group">
              <span>Goal Type</span>
              <select className="form-select" value={form.goal_type} onChange={handleChange('goal_type')}>
                <option value="">Select</option>
                <option value="fat_loss">Fat loss (Calorie deficit)</option>
                <option value="maintenance">Maintenance</option>
                <option value="muscle_gain">Muscle gain (Calorie surplus)</option>
                <option value="general_health">General health & wellness</option>
              </select>
            </label>

            <label className="form-group">
              <span>Dietary Style</span>
              <input className="form-input" value={form.dietary_style} onChange={handleChange('dietary_style')} placeholder="e.g. high_protein, vegetarian, halal" />
            </label>

            <label className="form-group">
              <span>Meals per Day Target</span>
              <input type="number" min="1" max="8" className="form-input" value={form.meals_per_day_target} onChange={handleChange('meals_per_day_target')} placeholder="e.g. 3" />
            </label>

            {/* Section 3: Preferences & Constraints */}
            <div className="profile-section-title">
              <HeartPulse size={17} style={{ color: 'var(--amber)' }} />
              <span>Dietary Preferences & Constraints</span>
            </div>

            <label className="form-group profile-form-full">
              <span>Allergies</span>
              <input className="form-input" value={form.allergies} onChange={handleChange('allergies')} placeholder="e.g. Peanuts, Shellfish, Dairy (comma-separated)" />
            </label>

            <label className="form-group profile-form-full">
              <span>Disliked Foods</span>
              <input className="form-input" value={form.disliked_foods} onChange={handleChange('disliked_foods')} placeholder="e.g. Bitter gourd, Cilantro (comma-separated)" />
            </label>

            <label className="form-group profile-form-full">
              <span>Preferred Cuisines</span>
              <input className="form-input" value={form.preferred_cuisines} onChange={handleChange('preferred_cuisines')} placeholder="e.g. Malaysian, Japanese, Mediterranean" />
            </label>

            <label className="form-group profile-form-full">
              <span>Notes for the Coach</span>
              <textarea className="form-textarea" rows="3" value={form.notes} onChange={handleChange('notes')} placeholder="Anything the coach should know about your eating patterns, schedule, or health conditions" />
            </label>

            <label className="profile-checkbox profile-form-full">
              <input type="checkbox" checked={form.medical_disclaimer_ack} onChange={handleChange('medical_disclaimer_ack')} />
              <span>I understand this app provides general nutrition coaching, not medical diagnosis or treatment.</span>
            </label>

            {feedback.message ? (
              <div className={`info-box ${feedback.type === 'error' ? 'info-box-error' : 'info-box-success'} profile-form-full`}>
                {feedback.message}
              </div>
            ) : null}

            {/* Unified Save Action */}
            <div className="profile-actions profile-form-full">
              <button className="btn btn-primary" type="submit" disabled={isSaving || isLoading} style={{ minWidth: '180px' }}>
                <Save size={16} /> {isSaving ? 'Saving Profile & Goals...' : 'Save Profile & Goals'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}