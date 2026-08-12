import React, { useState } from 'react';
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser, setAuthSession } from '../services/api';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = mode === 'register'
        ? await registerUser(form)
        : await loginUser({ email: form.email, password: form.password });

      setAuthSession(payload);
      onAuthenticated(payload.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <div className="scanner-icon" style={{ marginBottom: '1rem' }}>
            <ShieldCheck size={28} />
          </div>
          <h1 className="page-title">Welcome to CalorieAI</h1>
          <p className="text-muted">Sign in to keep meals, goals, and analytics tied to your account.</p>
        </div>

        <div className="auth-toggle">
          <button type="button" className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('login')}>
            <LogIn size={14} /> Login
          </button>
          <button type="button" className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('register')}>
            <UserPlus size={14} /> Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required />
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
            {mode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}