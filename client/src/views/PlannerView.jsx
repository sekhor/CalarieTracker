import React, { useState } from 'react';
import { ClipboardPenLine, Sparkles, ShoppingBasket } from 'lucide-react';
import { generateMealPlan } from '../services/api';

export default function PlannerView() {
  const [message, setMessage] = useState('Generate a guided meal plan for the rest of today.');
  const [plan, setPlan] = useState(null);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await generateMealPlan({ message });
      setPlan(response.plan || null);
      setInsights(response.insights || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Failed to generate meal plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-space animate-fadeIn">
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
            <ClipboardPenLine size={24} />
          </div>
          <div>
            <h2 className="page-title">Meal Planning & Guided Actions</h2>
            <p className="text-sm text-muted">Generate a simple meal structure, action steps, and shopping list based on your current goals and intake.</p>
          </div>
        </div>
      </div>

      <div className="planner-layout">
        <section className="glass-panel planner-input-card">
          <label className="form-group profile-form-full">
            <span>Planning request</span>
            <textarea className="form-textarea" rows="4" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isLoading || !message.trim()}>
            <Sparkles size={15} /> {isLoading ? 'Generating...' : 'Generate Plan'}
          </button>
          {error ? <div className="info-box info-box-error">{error}</div> : null}
        </section>

        {plan ? (
          <section className="glass-panel planner-results-card">
            <div className="section-title">{plan.title}</div>
            <p className="text-sm text-muted">{plan.summary}</p>
            <div className="planner-targets-row">
              <div className="insight-chip">Remaining calories: {plan.targets.remaining_calories}</div>
              <div className="insight-chip">Remaining protein: {plan.targets.remaining_protein_g}g</div>
            </div>

            <div className="planner-meal-list">
              {plan.meals.map((meal) => (
                <article key={meal.name} className="planner-meal-card">
                  <strong>{meal.name}</strong>
                  <div className="text-sm text-muted">{meal.description}</div>
                  <div className="text-sm text-muted">Target: {meal.calories_target} kcal • {meal.protein_target_g}g protein</div>
                </article>
              ))}
            </div>

            <div className="planner-actions-block">
              <div className="section-title">Guided actions</div>
              <ul className="insight-evidence-list">
                {plan.guided_actions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </div>

            <div className="planner-shopping-block">
              <div className="section-title"><ShoppingBasket size={16} /> Shopping list</div>
              <div className="coach-source-list">
                {plan.shopping_list.map((item) => <span key={item} className="item-tag">{item}</span>)}
              </div>
            </div>

            {insights.length ? (
              <div className="planner-actions-block">
                <div className="section-title">Related insights</div>
                <div className="coach-inline-insights">
                  {insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className="coach-inline-insight-card">
                      <strong>{insight.title}</strong>
                      <span>{insight.recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}