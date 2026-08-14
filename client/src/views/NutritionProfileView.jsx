import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Save } from 'lucide-react';
import { fetchNutritionProfile, saveNutritionProfile } from '../services/api';

const DEFAULT_PROFILE = {
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
};

function listToText(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

export default function NutritionProfileView() {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetchNutritionProfile();
      const profile = response.profile || {};
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
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to load nutrition profile.' });
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
      await saveNutritionProfile(form);
      setFeedback({ type: 'success', message: 'Nutrition profile saved. Coaching and recommendations will now use these preferences.' });
      await loadProfile();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to save nutrition profile.' });
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
            <h2 className="page-title">Nutrition Profile</h2>
            <p className="text-sm text-muted">Personalize coaching with your goals, eating style, restrictions, and preferred cuisines.</p>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <section className="glass-panel profile-summary-card">
          <div className="section-title">Profile readiness</div>
          <div className="profile-completion-value">{profileCompleteness}%</div>
          <p className="text-sm text-muted">A fuller profile improves meal suggestions, restriction handling, and coaching relevance.</p>
          <div className="progress-bar"><div className="progress-fill progress-fill-emerald" style={{ width: `${profileCompleteness}%` }} /></div>
        </section>

        <section className="glass-panel profile-form-card">
          <form onSubmit={handleSubmit} className="profile-form-grid">
            <label className="form-group"><span>Age</span><input className="form-input" value={form.age} onChange={handleChange('age')} /></label>
            <label className="form-group"><span>Sex</span><select className="form-select" value={form.sex} onChange={handleChange('sex')}><option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
            <label className="form-group"><span>Height (cm)</span><input className="form-input" value={form.height_cm} onChange={handleChange('height_cm')} /></label>
            <label className="form-group"><span>Weight (kg)</span><input className="form-input" value={form.weight_kg} onChange={handleChange('weight_kg')} /></label>
            <label className="form-group"><span>Activity level</span><select className="form-select" value={form.activity_level} onChange={handleChange('activity_level')}><option value="">Select</option><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very active</option></select></label>
            <label className="form-group"><span>Goal type</span><select className="form-select" value={form.goal_type} onChange={handleChange('goal_type')}><option value="">Select</option><option value="fat_loss">Fat loss</option><option value="maintenance">Maintenance</option><option value="muscle_gain">Muscle gain</option><option value="general_health">General health</option></select></label>
            <label className="form-group"><span>Dietary style</span><input className="form-input" value={form.dietary_style} onChange={handleChange('dietary_style')} placeholder="e.g. high_protein, vegetarian" /></label>
            <label className="form-group"><span>Meals per day target</span><input className="form-input" value={form.meals_per_day_target} onChange={handleChange('meals_per_day_target')} /></label>
            <label className="form-group profile-form-full"><span>Allergies</span><input className="form-input" value={form.allergies} onChange={handleChange('allergies')} placeholder="Comma-separated" /></label>
            <label className="form-group profile-form-full"><span>Disliked foods</span><input className="form-input" value={form.disliked_foods} onChange={handleChange('disliked_foods')} placeholder="Comma-separated" /></label>
            <label className="form-group profile-form-full"><span>Preferred cuisines</span><input className="form-input" value={form.preferred_cuisines} onChange={handleChange('preferred_cuisines')} placeholder="Comma-separated" /></label>
            <label className="form-group profile-form-full"><span>Notes for the coach</span><textarea className="form-textarea" rows="4" value={form.notes} onChange={handleChange('notes')} placeholder="Anything the coach should know about your eating patterns or constraints" /></label>
            <label className="profile-checkbox profile-form-full"><input type="checkbox" checked={form.medical_disclaimer_ack} onChange={handleChange('medical_disclaimer_ack')} /><span>I understand this app provides general nutrition coaching, not medical diagnosis or treatment.</span></label>
            {feedback.message ? <div className={`info-box ${feedback.type === 'error' ? 'info-box-error' : 'info-box-success'} profile-form-full`}>{feedback.message}</div> : null}
            <div className="profile-actions profile-form-full"><button className="btn btn-primary" type="submit" disabled={isSaving || isLoading}><Save size={15} /> {isSaving ? 'Saving...' : 'Save Profile'}</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}