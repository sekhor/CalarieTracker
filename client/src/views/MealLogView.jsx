import React, { useState } from 'react';
import { Utensils, Search, Trash2, Edit3, Plus } from 'lucide-react';

export default function MealLogView({ meals, onEditMeal, onDeleteMeal, onOpenAddModal }) {
  const [searchTerm, setSearchTerm]   = useState('');
  const [category, setCategory]       = useState('All');
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');

  const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const filtered = meals.filter(meal => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      (meal.meal_name && meal.meal_name.toLowerCase().includes(q)) ||
      (meal.notes && meal.notes.toLowerCase().includes(q));
    const matchCat  = category === 'All' || meal.meal_type === category;
    const matchFrom = !fromDate || new Date(meal.logged_at) >= new Date(`${fromDate}T00:00:00`);
    const matchTo   = !toDate   || new Date(meal.logged_at) <= new Date(`${toDate}T23:59:59`);
    return matchSearch && matchCat && matchFrom && matchTo;
  });

  const totalCal = filtered.reduce((s, m) => s + Number(m.calories || 0), 0);
  const avgCal   = filtered.length > 0 ? Math.round(totalCal / filtered.length) : 0;

  return (
    <div className="page-space animate-fadeIn">

      {/* Header + Filters */}
      <div className="glass-panel meal-log-header-card">
        <div className="log-header-top">
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Utensils size={22} style={{ color: 'var(--primary-light)' }} />
              Meal Log History
            </h2>
            <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
              Browse, search, and manage all meal records stored in the database.
            </p>
          </div>
          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
            <Plus size={15} /> Log Meal
          </button>
        </div>

        <div className="filters-row">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search meal name or notes…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input search-input"
            />
          </div>

          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`category-tab ${category === cat ? 'category-tab-active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="date-filters">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="form-input" title="From" />
            <input type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   className="form-input" title="To" />
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="log-summary-row">
        <span>Showing <strong style={{ color: 'var(--text-main)' }}>{filtered.length}</strong> meals</span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span>Total: <strong style={{ color: 'var(--amber)' }}>{totalCal} kcal</strong></span>
          <span>Avg: <strong style={{ color: 'var(--primary-light)' }}>{avgCal} kcal / meal</strong></span>
        </div>
      </div>

      {/* Meal Cards */}
      {filtered.length === 0 ? (
        <div className="glass-panel empty-state">
          <Utensils size={44} className="empty-state-icon" />
          <h4 className="section-title">No Meals Found</h4>
          <p className="text-sm text-muted">Try adjusting filters or log a new meal entry.</p>
        </div>
      ) : (
        <div className="meals-grid">
          {filtered.map(meal => (
            <div key={meal.id} className="glass-panel full-meal-card glass-card-interactive">
              <div className="full-meal-top">

                <div className="full-meal-header">
                  <span className="badge badge-blue">{meal.meal_type}</span>
                  <span className="full-meal-date">
                    {new Date(meal.logged_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="full-meal-body">
                  <div className="full-meal-thumb">
                    {meal.image_url
                      ? <img src={`http://localhost:5000${meal.image_url}`} alt={meal.meal_name} onError={e => { e.target.style.display = 'none'; }} />
                      : <Utensils size={22} />
                    }
                  </div>
                  <div>
                    <div className="full-meal-name">{meal.meal_name}</div>
                    <div className="full-meal-cal">{meal.calories}<span className="full-meal-cal-unit"> kcal</span></div>
                  </div>
                </div>

                <div className="macro-row">
                  <div className="macro-row-cell">
                    <span className="label-sm" style={{ color: 'var(--emerald)' }}>Protein</span>
                    <span className="macro-val">{meal.protein_g || 0}g</span>
                  </div>
                  <div className="macro-row-cell">
                    <span className="label-sm" style={{ color: 'var(--primary-light)' }}>Carbs</span>
                    <span className="macro-val">{meal.carbs_g || 0}g</span>
                  </div>
                  <div className="macro-row-cell">
                    <span className="label-sm" style={{ color: 'var(--rose)' }}>Fat</span>
                    <span className="macro-val">{meal.fat_g || 0}g</span>
                  </div>
                </div>

                {meal.notes && (
                  <p className="full-meal-notes">"{meal.notes}"</p>
                )}
              </div>

              <div className="full-meal-actions">
                <button className="btn-icon" onClick={() => onEditMeal(meal)}>
                  <Edit3 size={14} /> Edit
                </button>
                <button className="btn-icon btn-icon-danger" onClick={() => onDeleteMeal(meal.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
