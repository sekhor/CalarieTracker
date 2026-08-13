import React, { useState, useEffect } from 'react';
import { X, Save, Utensils, Flame, Dumbbell, Wheat, Droplet } from 'lucide-react';
import { malaysiaDateTimeLocalToIso, toMalaysiaDateTimeLocalValue } from '../utils/datetime';

export default function AddMealModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    meal_name: '',
    meal_type: 'Lunch',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    notes: '',
    logged_at: toMalaysiaDateTimeLocalValue(),
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        meal_name: initialData.meal_name || '',
        meal_type: initialData.meal_type || 'Lunch',
        calories: initialData.calories || '',
        protein_g: initialData.protein_g || '',
        carbs_g: initialData.carbs_g || '',
        fat_g: initialData.fat_g || '',
        notes: initialData.notes || '',
        logged_at: initialData.logged_at
          ? toMalaysiaDateTimeLocalValue(initialData.logged_at)
          : toMalaysiaDateTimeLocalValue(),
      });
    } else {
      setFormData({
        meal_name: '',
        meal_type: 'Lunch',
        calories: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        notes: '',
        logged_at: toMalaysiaDateTimeLocalValue(),
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      calories: Number(formData.calories || 0),
      protein_g: Number(formData.protein_g || 0),
      carbs_g: Number(formData.carbs_g || 0),
      fat_g: Number(formData.fat_g || 0),
      logged_at: malaysiaDateTimeLocalToIso(formData.logged_at),
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-title-icon">
              <Utensils size={18} />
            </div>
            <h3 className="section-title">{initialData ? 'Edit Meal Record' : 'Log New Meal'}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">

          <div className="form-group">
            <label className="form-label">Meal Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Grilled Chicken Bowl"
              value={formData.meal_name}
              onChange={(e) => setFormData({ ...formData, meal_name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="modal-field-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={formData.meal_type}
                onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                className="form-select"
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.logged_at}
                onChange={(e) => setFormData({ ...formData, logged_at: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Macro Grid */}
          <div className="modal-macro-grid">
            <div>
              <div className="modal-macro-label" style={{ color: 'var(--amber)' }}>
                <Flame size={11} /> Calories
              </div>
              <input
                type="number" min="0" placeholder="kcal"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
              />
            </div>

            <div>
              <div className="modal-macro-label" style={{ color: 'var(--emerald)' }}>
                <Dumbbell size={11} /> Protein (g)
              </div>
              <input
                type="number" step="0.1" min="0" placeholder="g"
                value={formData.protein_g}
                onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
              />
            </div>

            <div>
              <div className="modal-macro-label" style={{ color: 'var(--primary-light)' }}>
                <Wheat size={11} /> Carbs (g)
              </div>
              <input
                type="number" step="0.1" min="0" placeholder="g"
                value={formData.carbs_g}
                onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
              />
            </div>

            <div>
              <div className="modal-macro-label" style={{ color: 'var(--rose)' }}>
                <Droplet size={11} /> Fat (g)
              </div>
              <input
                type="number" step="0.1" min="0" placeholder="g"
                value={formData.fat_g}
                onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Ingredients</label>
            <textarea
              rows="2"
              placeholder="Optional meal details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-textarea"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Save size={15} />
              {initialData ? 'Update Record' : 'Save Meal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
