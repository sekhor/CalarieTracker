import React, { useState } from 'react';
import {
  Camera, Upload, Sparkles, Flame, Dumbbell, Wheat, Droplet,
  CheckCircle2, AlertCircle, RefreshCw, Save
} from 'lucide-react';
import { analyzeMealPhoto, createMeal } from '../services/api';

export default function AIScannerView({ onSaveSuccess, onNavigate }) {
  const [selectedFile, setSelectedFile]   = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [isScanning, setIsScanning]       = useState(false);
  const [analysisResult, setAnalysis]     = useState(null);
  const [savedSuccess, setSavedSuccess]   = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');

  const [editForm, setEditForm] = useState({
    meal_name: '', meal_type: 'Lunch',
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: '',
  });

  const selectFile = (file) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    setAnalysis(null); setSavedSuccess(false); setErrorMsg('');
  };

  const handleFileChange = (e) => e.target.files[0] && selectFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); e.dataTransfer.files[0] && selectFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e) => e.preventDefault();

  const handleRunAnalysis = async () => {
    setIsScanning(true); setErrorMsg(''); setSavedSuccess(false);
    try {
      const fd = new FormData();
      if (selectedFile) fd.append('photo', selectedFile);
      else fd.append('image_base64', imagePreview);
      const res = await analyzeMealPhoto(fd);
      if (res.success && res.analysis) {
        setAnalysis(res);
        setEditForm({
          meal_name: res.analysis.meal_name || 'Uploaded Meal',
          meal_type: res.analysis.meal_type || 'Lunch',
          calories:  res.analysis.total_calories || 0,
          protein_g: res.analysis.protein_g || 0,
          carbs_g:   res.analysis.carbs_g   || 0,
          fat_g:     res.analysis.fat_g     || 0,
          notes:     res.analysis.notes     || '',
        });
      } else setErrorMsg('Failed to get AI analysis.');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Error running AI scanner.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    try {
      await createMeal({
        meal_name: editForm.meal_name, meal_type: editForm.meal_type,
        calories: Number(editForm.calories), protein_g: Number(editForm.protein_g),
        carbs_g:  Number(editForm.carbs_g),  fat_g:     Number(editForm.fat_g),
        image_base64: analysisResult?.image_base64 || null,
        image_mime_type: analysisResult?.image_mime_type || null,
        notes: editForm.notes, logged_at: new Date().toISOString(),
      });
      setSavedSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      setErrorMsg('Failed to save meal record to database.');
    }
  };

  return (
    <div className="page-space animate-fadeIn">

      {/* Header */}
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon"><Camera size={26} /></div>
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              AI Calorie Estimator
              <span className="badge badge-emerald">GPT-4o Vision</span>
            </h2>
            <p className="text-sm text-muted">
              Upload a meal photo to detect ingredients, estimate calories, and break down macronutrients.
            </p>
          </div>
        </div>
      </div>

      {/* Main Scanner Layout */}
      <div className="scanner-layout">

        {/* Left – Upload + Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            className={`upload-zone ${imagePreview ? 'upload-zone-active' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="upload-zone-preview">
                <img src={imagePreview} alt="Meal Preview" />
                {isScanning && <div className="laser-scanner" />}
                <button className="upload-change-btn" onClick={() => { setImagePreview(null); setSelectedFile(null); setAnalysis(null); }}>
                  Change Photo
                </button>
              </div>
            ) : (
              <label className="upload-zone-label">
                <div className="upload-icon-wrap"><Upload size={32} /></div>
                <span className="font-bold text-white">Drag & drop your meal photo here</span>
                <span className="text-sm text-muted">Supports JPG, PNG, WEBP — up to 10MB</span>
                <span className="btn btn-secondary btn-sm">Browse File</span>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {imagePreview && !analysisResult && (
            <button
              onClick={handleRunAnalysis}
              disabled={isScanning}
              className="btn btn-emerald btn-full"
              style={{ padding: '0.875rem', fontSize: '0.9rem' }}
            >
              {isScanning
                ? <><RefreshCw size={18} className="animate-spin" /> Analyzing with Azure OpenAI…</>
                : <><Sparkles size={18} /> Estimate Calories with Azure OpenAI</>
              }
            </button>
          )}

          {errorMsg && (
            <div className="info-box info-box-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right – Analysis Result / Placeholder */}
        <div>
          {analysisResult ? (
            <div className="glass-panel analysis-card animate-fadeIn">

              {/* Top Row */}
              <div className="analysis-top">
                <div>
                  <div className="analysis-badges">
                    <span className="badge badge-emerald">
                      <Sparkles size={10} /> {analysisResult.analysis.is_simulated ? 'AI Simulated' : 'AI Analysis'}
                    </span>
                    <span className="badge badge-blue">
                      {Math.round((analysisResult.analysis.confidence_score || 0.9) * 100)}% Confidence
                    </span>
                    <span className="badge badge-amber">{analysisResult.analysis.health_rating || 'Balanced'}</span>
                  </div>
                  <div className="analysis-title">{editForm.meal_name}</div>
                </div>

                {savedSuccess ? (
                  <div className="analysis-saved-chip">
                    <CheckCircle2 size={15} /> Saved to Database!
                  </div>
                ) : (
                  <button onClick={handleSave} className="btn btn-primary btn-sm">
                    <Save size={14} /> Save to Database
                  </button>
                )}
              </div>

              {/* Detected Items */}
              {analysisResult.analysis.detected_items?.length > 0 && (
                <div className="detected-items">
                  <span className="detected-items-label">Detected Food Items:</span>
                  <div className="detected-items-wrap">
                    {analysisResult.analysis.detected_items.map((item, i) => (
                      <span key={i} className="item-tag">✓ {item}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Macro Boxes */}
              <div className="macro-boxes">
                <div className="macro-box">
                  <span className="macro-box-label" style={{ color: 'var(--amber)' }}><Flame size={12} /> Calories</span>
                  <span className="macro-box-val">{editForm.calories}</span>
                  <span className="macro-box-unit">kcal</span>
                </div>
                <div className="macro-box">
                  <span className="macro-box-label" style={{ color: 'var(--emerald)' }}><Dumbbell size={12} /> Protein</span>
                  <span className="macro-box-val">{editForm.protein_g}</span>
                  <span className="macro-box-unit">g</span>
                </div>
                <div className="macro-box">
                  <span className="macro-box-label" style={{ color: 'var(--primary-light)' }}><Wheat size={12} /> Carbs</span>
                  <span className="macro-box-val">{editForm.carbs_g}</span>
                  <span className="macro-box-unit">g</span>
                </div>
                <div className="macro-box">
                  <span className="macro-box-label" style={{ color: 'var(--rose)' }}><Droplet size={12} /> Fats</span>
                  <span className="macro-box-val">{editForm.fat_g}</span>
                  <span className="macro-box-unit">g</span>
                </div>
              </div>

              {/* Edit Fields */}
              <div className="edit-fields">
                <span className="label-sm">Verify / Tweak Estimation Before Saving</span>
                <div className="edit-fields-row">
                  <div className="form-group">
                    <label className="form-label">Meal Name</label>
                    <input type="text" className="form-input" value={editForm.meal_name}
                      onChange={e => setEditForm({ ...editForm, meal_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={editForm.meal_type}
                      onChange={e => setEditForm({ ...editForm, meal_type: e.target.value })}>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">AI Notes & Insight</label>
                  <textarea rows="2" className="form-textarea" value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="analysis-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => { setAnalysis(null); setImagePreview(null); }}>
                  Scan Another Photo
                </button>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('dashboard')}>Dashboard</button>
                  {!savedSuccess && (
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>
                      <Save size={14} /> Confirm & Save
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel analysis-placeholder">
              <Sparkles size={48} style={{ color: 'var(--primary-light)', opacity: 0.25 }} />
              <h4 className="section-title">Ready for AI Analysis</h4>
              <p className="text-sm text-muted" style={{ maxWidth: 320 }}>
                Upload or drag a meal photo, then click "Estimate Calories" to see instant recognition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
