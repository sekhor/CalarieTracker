import React, { useState, useEffect } from 'react';
import { Settings, Database, Target, Save, CheckCircle2, AlertCircle, RefreshCw, Server, Sparkles } from 'lucide-react';
import { saveAzureSettings, saveMssqlSettings, saveGoalSettings } from '../services/api';

export default function SettingsView({ settingsData, onRefreshSettings }) {
  const [azureForm, setAzureForm] = useState({ endpoint: '', apiKey: '', deployment: 'gpt-4o', apiVersion: '2024-02-15-preview' });
  const [azureMsg, setAzureMsg]   = useState('');

  const [mssqlForm, setMssqlForm] = useState({ server: 'localhost', port: 1433, database: 'CalorieTrackerDB', user: 'sa', password: '', trustServerCertificate: true });
  const [mssqlLoading, setMssqlLoading] = useState(false);
  const [mssqlMsg, setMssqlMsg]         = useState(null);

  const [goalsForm, setGoalsForm] = useState({ daily_calorie_target: 2000, protein_target_g: 140, carbs_target_g: 225, fat_target_g: 65 });
  const [goalsMsg, setGoalsMsg]   = useState('');

  useEffect(() => {
    if (!settingsData) return;
    if (settingsData.azure) {
      setAzureForm(f => ({ ...f, endpoint: settingsData.azure.endpoint || '', deployment: settingsData.azure.deployment || 'gpt-4o', apiVersion: settingsData.azure.apiVersion || '2024-02-15-preview' }));
    }
    if (settingsData.database?.config) {
      setMssqlForm(f => ({ ...f, server: settingsData.database.config.server || 'localhost', port: settingsData.database.config.port || 1433, database: settingsData.database.config.database || 'CalorieTrackerDB', user: settingsData.database.config.user || 'sa' }));
    }
    if (settingsData.goals) {
      setGoalsForm({ daily_calorie_target: settingsData.goals.daily_calorie_target || 2000, protein_target_g: settingsData.goals.protein_target_g || 140, carbs_target_g: settingsData.goals.carbs_target_g || 225, fat_target_g: settingsData.goals.fat_target_g || 65 });
    }
  }, [settingsData]);

  const handleSaveAzure = async (e) => {
    e.preventDefault();
    try { await saveAzureSettings(azureForm); setAzureMsg('Azure OpenAI settings updated!'); if (onRefreshSettings) onRefreshSettings(); setTimeout(() => setAzureMsg(''), 4000); }
    catch { setAzureMsg('Failed to save Azure settings.'); }
  };

  const handleConnectMssql = async (e) => {
    e.preventDefault(); setMssqlLoading(true); setMssqlMsg(null);
    try { const res = await saveMssqlSettings(mssqlForm); setMssqlMsg({ success: res.success, message: res.message }); if (onRefreshSettings) onRefreshSettings(); }
    catch { setMssqlMsg({ success: false, message: 'Error connecting to MSSQL server.' }); }
    finally { setMssqlLoading(false); }
  };

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    try { await saveGoalSettings(goalsForm); setGoalsMsg('Goals saved!'); if (onRefreshSettings) onRefreshSettings(); setTimeout(() => setGoalsMsg(''), 4000); }
    catch { setGoalsMsg('Failed to save goals.'); }
  };

  const isMssql = settingsData?.database?.engine === 'mssql';

  return (
    <div className="page-space animate-fadeIn settings-layout">

      {/* Header */}
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
            <Settings size={24} />
          </div>
          <div>
            <h2 className="page-title">System & API Configurations</h2>
            <p className="text-sm text-muted">Configure Azure OpenAI credentials, MSSQL connection, and daily nutritional goals.</p>
          </div>
        </div>
      </div>

      {/* Config Cards Row */}
      <div className="settings-grid">

        {/* Azure OpenAI Card */}
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Sparkles size={18} style={{ color: 'var(--emerald)' }} />
              <h3 className="section-title">Azure OpenAI Vision</h3>
            </div>
            <span className={`badge ${settingsData?.azure?.hasApiKey ? 'badge-emerald' : 'badge-amber'}`}>
              {settingsData?.azure?.hasApiKey ? 'API Key Set' : 'Simulator Active'}
            </span>
          </div>

          <form onSubmit={handleSaveAzure} className="settings-form-fields">
            <div className="form-group">
              <label className="form-label">Azure Endpoint URL</label>
              <input type="text" className="form-input" placeholder="https://your-resource.openai.azure.com/"
                value={azureForm.endpoint} onChange={e => setAzureForm({ ...azureForm, endpoint: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Azure API Key</label>
              <input type="password" className="form-input" placeholder="Enter Azure OpenAI API Key"
                value={azureForm.apiKey} onChange={e => setAzureForm({ ...azureForm, apiKey: e.target.value })} />
            </div>
            <div className="settings-form-row-2">
              <div className="form-group">
                <label className="form-label">Deployment Name</label>
                <input type="text" className="form-input" placeholder="gpt-4o"
                  value={azureForm.deployment} onChange={e => setAzureForm({ ...azureForm, deployment: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">API Version</label>
                <input type="text" className="form-input" placeholder="2024-02-15-preview"
                  value={azureForm.apiVersion} onChange={e => setAzureForm({ ...azureForm, apiVersion: e.target.value })} />
              </div>
            </div>
            {azureMsg && (
              <div className="info-box info-box-success">
                <CheckCircle2 size={15} /> {azureMsg}
              </div>
            )}
            <button type="submit" className="btn btn-emerald btn-full">
              <Save size={15} /> Save Azure Settings
            </button>
          </form>
        </div>

        {/* MSSQL Card */}
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Database size={18} style={{ color: 'var(--primary-light)' }} />
              <h3 className="section-title">MSSQL Database</h3>
            </div>
            <span className={`badge ${isMssql ? 'badge-emerald' : 'badge-amber'}`}>
              {isMssql ? 'Connected' : 'Local Fallback'}
            </span>
          </div>

          <form onSubmit={handleConnectMssql} className="settings-form-fields">
            <div className="settings-form-row">
              <div className="form-group">
                <label className="form-label">Server / Host</label>
                <input type="text" className="form-input" placeholder="localhost"
                  value={mssqlForm.server} onChange={e => setMssqlForm({ ...mssqlForm, server: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input type="number" className="form-input" placeholder="1433"
                  value={mssqlForm.port} onChange={e => setMssqlForm({ ...mssqlForm, port: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Database Name</label>
              <input type="text" className="form-input" placeholder="CalorieTrackerDB"
                value={mssqlForm.database} onChange={e => setMssqlForm({ ...mssqlForm, database: e.target.value })} />
            </div>
            <div className="settings-form-row-2">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" className="form-input" placeholder="sa"
                  value={mssqlForm.user} onChange={e => setMssqlForm({ ...mssqlForm, user: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="Password"
                  value={mssqlForm.password} onChange={e => setMssqlForm({ ...mssqlForm, password: e.target.value })} />
              </div>
            </div>
            {mssqlMsg && (
              <div className={`info-box ${mssqlMsg.success ? 'info-box-success' : 'info-box-warning'}`}>
                {mssqlMsg.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{mssqlMsg.message}</span>
              </div>
            )}
            <button type="submit" disabled={mssqlLoading} className="btn btn-primary btn-full">
              {mssqlLoading ? <RefreshCw size={15} className="animate-spin" /> : <Server size={15} />}
              Connect & Initialize MSSQL
            </button>
          </form>
        </div>
      </div>

      {/* Goals Card */}
      <div className="glass-panel settings-goals-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <Target size={18} style={{ color: 'var(--amber)' }} />
            <h3 className="section-title">Daily Nutritional Target Goals</h3>
          </div>
        </div>

        <form onSubmit={handleSaveGoals}>
          <div className="settings-goals-grid">
            {[
              { label: 'Daily Calorie Target (kcal)', key: 'daily_calorie_target' },
              { label: 'Protein Target (g)',           key: 'protein_target_g' },
              { label: 'Carbs Target (g)',             key: 'carbs_target_g' },
              { label: 'Fat Target (g)',               key: 'fat_target_g' },
            ].map(({ label, key }) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input type="number" className="form-input" value={goalsForm[key]}
                  onChange={e => setGoalsForm({ ...goalsForm, [key]: e.target.value })}
                  style={{ fontWeight: 700, fontSize: '1rem' }} />
              </div>
            ))}
          </div>

          {goalsMsg && (
            <div className="info-box info-box-success" style={{ marginTop: '1rem' }}>
              <CheckCircle2 size={15} /> {goalsMsg}
            </div>
          )}

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save Target Goals
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
