import { useState, useCallback } from 'react';

export default function ResumeRequestForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsSuccess(false);
    setError('');
    setFormData({ name: '', email: '' });
  }, []);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setIsOpen(false);
    }
  }, [isSubmitting]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/request-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setFormData({ name: '', email: '' });
      }, 2000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  return (
    <>
      <button 
        onClick={handleOpen}
        className="resume-request-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: 'var(--color-accent)',
          color: 'white',
          border: '2px solid var(--color-stroke)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-hand)',
          fontSize: 'var(--text-base)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          filter: 'url(#sketch-filter)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Request Full Resume
      </button>

      {isOpen && (
        <div 
          className="modal-overlay"
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-stroke)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              position: 'relative',
              filter: 'url(#sketch-filter)',
            }}
          >
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                color: 'var(--color-text-muted)',
                opacity: isSubmitting ? 0.5 : 1,
              }}
            >
              ×
            </button>

            {isSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                <h3 style={{ fontFamily: 'var(--font-hand)', marginBottom: '0.5rem' }}>
                  Request Sent!
                </h3>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  I'll send my resume to your email shortly.
                </p>
              </div>
            ) : (
              <>
                <h3 
                  style={{ 
                    fontFamily: 'var(--font-hand)', 
                    fontSize: 'var(--text-xl)',
                    marginBottom: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  Request Full Resume
                </h3>
                <p 
                  style={{ 
                    color: 'var(--color-text-muted)', 
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  Enter your details and I'll send my resume to your inbox.
                </p>

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label 
                      htmlFor="name"
                      style={{ 
                        display: 'block', 
                        marginBottom: '0.25rem',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                      }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        border: '2px solid var(--color-stroke-muted)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-base)',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-stroke-muted)';
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label 
                      htmlFor="email"
                      style={{ 
                        display: 'block', 
                        marginBottom: '0.25rem',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        border: '2px solid var(--color-stroke-muted)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-base)',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-stroke-muted)';
                      }}
                    />
                  </div>

                  {error && (
                    <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: 'var(--text-sm)' }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.5rem',
                      background: isSubmitting ? 'var(--color-stroke-muted)' : 'var(--color-accent)',
                      color: 'white',
                      border: '2px solid var(--color-stroke)',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'var(--font-hand)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 600,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
