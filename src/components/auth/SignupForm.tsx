/**
 * Signup Form Component
 * Handles new user registration
 */

import { useState } from 'react';

interface SignupFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function SignupForm({ redirectTo = '/dashboard', onSuccess }: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        setSuccess(true);

        // If email verification is required, show message
        // Otherwise redirect
        const data = await response.json();

        if (data.user?.emailVerified === false) {
          setError('');
          // Show success message, user needs to verify email
          setTimeout(() => {
            window.location.href = '/verify-email';
          }, 2000);
        } else {
          // Auto-login successful, redirect
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = redirectTo;
          }
        }
      } else {
        const data = await response.json();
        setError(data.error || data.details || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-form">
        <div className="success-message">
          <h2>Account Created!</h2>
          <p>Please check your email to verify your account.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-header">
        <h2>Create Account</h2>
        <p>Join AstroWeb to save your canvases</p>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          autoComplete="name"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
          disabled={loading}
          minLength={8}
        />
        <small className="form-hint">
          Use 8 or more characters with a mix of letters, numbers & symbols
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          required
          autoComplete="new-password"
          disabled={loading}
          minLength={8}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <div className="form-footer">
        <p>
          Already have an account?{' '}
          <a href="/login" className="login-link">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}
