/**
 * Signup Form — Google-first layout
 * Large Google button at top, email/password form below
 */

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface SignupFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function SignupForm({ redirectTo = '/dashboard', onSuccess }: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getPasswordStrength(pwd: string): { strength: number; label: string; color: string } {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: '#ef4444' };
    if (strength <= 3) return { strength, label: 'Fair', color: '#f59e0b' };
    if (strength <= 4) return { strength, label: 'Good', color: '#3b82f6' };
    return { strength, label: 'Strong', color: '#10b981' };
  }

  const passwordStrength = password ? getPasswordStrength(password) : null;

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordStrength && passwordStrength.strength < 3) {
      setError('Please choose a stronger password');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = redirectTo;
        }
      } else {
        const data = await response.json();
        setError(data.error || data.details || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: redirectTo,
      });
    } catch (error) {
      console.error('OAuth error:', error);
      setError('Failed to sign up. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-container">
      <div className="auth-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="auth-header">
        <h1>Create your account</h1>
        <p>Start creating beautiful diagrams with AI</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Google Sign Up — primary action */}
      <button
        onClick={handleGoogleSignup}
        className="google-btn-primary"
        disabled={loading}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="divider">
        <span>or continue with email</span>
      </div>

      <form onSubmit={handleEmailSignup} className="auth-form-modern">
        <div className="input-group">
          <div className="input-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required autoComplete="name" disabled={loading} className="input-with-icon" minLength={2} />
        </div>

        <div className="input-group">
          <div className="input-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required autoComplete="email" disabled={loading} className="input-with-icon" />
        </div>

        <div className="input-group">
          <div className="input-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required autoComplete="new-password" disabled={loading} className="input-with-icon" minLength={8} />
          <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.5 10.5a2 2 0 0 0 2.83 2.83M7.362 7.362A8.5 8.5 0 0 0 2 12c1.5 3.5 5.5 6 10 6 1.736 0 3.37-.434 4.738-1.262M12 6c4.5 0 8.5 2.5 10 6a13.3 13.3 0 0 1-1.67 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
            )}
          </button>
        </div>

        {password && passwordStrength && (
          <div className="password-strength">
            <div className="strength-bar-container">
              <div className="strength-bar" style={{ width: `${(passwordStrength.strength / 5) * 100}%`, backgroundColor: passwordStrength.color }}></div>
            </div>
            <span className="strength-label" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
          </div>
        )}

        <div className="input-group">
          <div className="input-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required autoComplete="new-password" disabled={loading} className="input-with-icon" minLength={8} />
        </div>

        <button type="submit" className="btn-modern btn-primary-modern" disabled={loading}>
          {loading ? (<><span className="spinner-small"></span>Creating account...</>) : ('Create account')}
        </button>
      </form>

      <div className="auth-footer-modern">
        <span>Already have an account?</span>
        <a href="/login" className="link-primary">Sign in</a>
      </div>

      <style>{`
        .google-btn-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 20px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        .google-btn-primary:hover:not(:disabled) {
          border-color: #4285F4;
          box-shadow: 0 2px 8px rgba(66,133,244,0.2);
        }
        .google-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
