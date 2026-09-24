import React, { useState } from 'react';
import { LogIn, UserPlus, ShieldCheck, KeyRound, RotateCcw } from 'lucide-react';
import { loginUser, registerUser, setAuthSession, requestPasswordReset, resetPassword } from '../services/api';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [form, setForm] = useState({ name: '', email: '', password: '', token: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setResetToken('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login' || mode === 'register') {
        const payload = mode === 'register'
          ? await registerUser(form)
          : await loginUser({ email: form.email, password: form.password });
        setAuthSession(payload);
        onAuthenticated(payload.user);
      } else if (mode === 'forgot') {
        const data = await requestPasswordReset({ email: form.email });
        if (data.resetToken) {
          setResetToken(data.resetToken);
          setSuccessMessage('Token generated. Copy it below, then click "Enter Reset Token" to set a new password.');
        } else {
          setSuccessMessage(data.message || 'If that email exists, a reset token has been generated.');
        }
      } else if (mode === 'reset') {
        if (form.newPassword !== form.confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        if (form.newPassword.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        const data = await resetPassword({ token: form.token, password: form.newPassword });
        setSuccessMessage(data.message || 'Password reset successfully.');
        setTimeout(() => switchMode('login'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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

        {(mode === 'login' || mode === 'register') && (
          <div className="auth-toggle">
            <button type="button" className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => switchMode('login')}>
              <LogIn size={14} /> Login
            </button>
            <button type="button" className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => switchMode('register')}>
              <UserPlus size={14} /> Register
            </button>
          </div>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <div className="auth-reset-header">
            <KeyRound size={18} style={{ color: 'var(--primary-light)' }} />
            <span>{mode === 'forgot' ? 'Reset your password' : 'Set a new password'}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required />
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="form-group">
                <label className="form-label">Reset Token</label>
                <input className="form-input" type="text" placeholder="Paste your reset token here" value={form.token} onChange={(e) => handleChange('token', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={form.newPassword} onChange={(e) => handleChange('newPassword', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} required />
              </div>
            </>
          )}

          {error ? <div className="auth-error">{error}</div> : null}
          {successMessage ? <div className="auth-success">{successMessage}</div> : null}

          {resetToken && mode === 'forgot' && (
            <div className="auth-token-box">
              <p className="auth-token-label">Your Reset Token</p>
              <code className="auth-token-value">{resetToken}</code>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(resetToken)}>
                Copy
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
            {mode === 'login' && <><LogIn size={15} /> {isSubmitting ? 'Please wait...' : 'Log In'}</>}
            {mode === 'register' && <><UserPlus size={15} /> {isSubmitting ? 'Please wait...' : 'Create Account'}</>}
            {mode === 'forgot' && <><KeyRound size={15} /> {isSubmitting ? 'Please wait...' : 'Generate Reset Token'}</>}
            {mode === 'reset' && <><RotateCcw size={15} /> {isSubmitting ? 'Please wait...' : 'Reset Password'}</>}
          </button>
        </form>

        <div className="auth-footer-links">
          {mode === 'login' && (
            <button type="button" className="auth-text-link" onClick={() => switchMode('forgot')}>
              Forgot your password?
            </button>
          )}
          {mode === 'forgot' && (
            <>
              <button type="button" className="auth-text-link" onClick={() => switchMode('reset')}>
                Already have a token? Enter it here
              </button>
              <button type="button" className="auth-text-link" onClick={() => switchMode('login')}>
                Back to Login
              </button>
            </>
          )}
          {mode === 'reset' && (
            <>
              <button type="button" className="auth-text-link" onClick={() => switchMode('forgot')}>
                Request a new token
              </button>
              <button type="button" className="auth-text-link" onClick={() => switchMode('login')}>
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}