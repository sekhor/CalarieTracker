import React, { useEffect, useState } from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { fetchInsights } from '../services/api';

export default function InsightsView() {
  const [insights, setInsights] = useState([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      try {
        const response = await fetchInsights();
        setInsights(response.insights || []);
        setGeneratedAt(response.generated_at || '');
      } catch (loadError) {
        setError(loadError.response?.data?.error || 'Failed to load insights.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInsights();
  }, []);

  return (
    <div className="page-space animate-fadeIn">
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="page-title">Weekly Nutrition Insights</h2>
            <p className="text-sm text-muted">Proactive coaching signals generated from your recent meal and macro patterns.</p>
          </div>
        </div>
      </div>
      {generatedAt ? <div className="text-sm text-muted">Generated {new Date(generatedAt).toLocaleString()}</div> : null}
      {error ? <div className="info-box info-box-error">{error}</div> : null}
      {isLoading ? <div className="glass-panel">Loading insights...</div> : null}
      <div className="insights-grid">
        {insights.map((insight) => (
          <article key={insight.id} className="glass-panel insight-card">
            <div className="insight-card-header">
              <div>
                <div className="section-title">{insight.title}</div>
                <div className="text-sm text-muted">{insight.summary}</div>
              </div>
              <span className={`badge badge-${insight.priority === 'high' ? 'rose' : insight.priority === 'medium' ? 'amber' : 'emerald'}`}>{insight.priority}</span>
            </div>
            <div className="insight-chip"><Sparkles size={14} /> {insight.type}</div>
            <ul className="insight-evidence-list">
              {(insight.evidence || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="insight-recommendation">{insight.recommendation}</div>
          </article>
        ))}
      </div>
    </div>
  );
}