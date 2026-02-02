<script lang="ts">
  let isOpen = $state(false);
  let isSubmitting = $state(false);
  let isSuccess = $state(false);
  let error = $state('');
  let formData = $state({
    name: '',
    email: '',
  });

  function handleOpen() {
    isOpen = true;
    isSuccess = false;
    error = '';
    formData = { name: '', email: '' };
  }

  function handleClose() {
    if (!isSubmitting) {
      isOpen = false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    error = '';

    try {
      const response = await fetch('/api/request-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      isSuccess = true;
      setTimeout(() => {
        isOpen = false;
        isSuccess = false;
        formData = { name: '', email: '' };
      }, 2000);
    } catch (err) {
      error = 'Something went wrong. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen && !isSubmitting) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<button 
  class="resume-request-btn"
  onclick={handleOpen}
  aria-label="Request full resume"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
  Request Full Resume
</button>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay"
    onclick={handleClose}
    role="presentation"
  >
    <div 
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <button
        class="close-btn"
        onclick={handleClose}
        disabled={isSubmitting}
        aria-label="Close modal"
      >
        ×
      </button>

      {#if isSuccess}
        <div class="success-message">
          <div class="success-icon">✓</div>
          <h3 id="modal-title">Request Sent!</h3>
          <p>I'll send my resume to your email shortly.</p>
        </div>
      {:else}
        <h3 id="modal-title" class="modal-title">Request Full Resume</h3>
        <p class="modal-description">
          Enter your details and I'll send my resume to your inbox.
        </p>

        <form onsubmit={handleSubmit}>
          <div class="form-group">
            <label for="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              bind:value={formData.name}
              required
              disabled={isSubmitting}
              placeholder="Your name"
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              bind:value={formData.email}
              required
              disabled={isSubmitting}
              placeholder="your@email.com"
            />
          </div>

          {#if error}
            <p class="error-message">{error}</p>
          {/if}

          <button
            type="submit"
            class="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .resume-request-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-accent);
    color: white;
    border: 2px solid var(--color-stroke);
    border-radius: var(--radius-md);
    font-family: var(--font-hand);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    filter: url(#sketch-filter);
  }

  .resume-request-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background: var(--color-surface);
    border: 2px solid var(--color-stroke);
    border-radius: var(--radius-lg);
    padding: 2rem;
    max-width: 400px;
    width: 100%;
    position: relative;
    filter: url(#sketch-filter);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-muted);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .close-btn:hover:not(:disabled) {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-title {
    font-family: var(--font-hand);
    font-size: var(--text-xl);
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .modal-description {
    color: var(--color-text-muted);
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: var(--text-sm);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: var(--text-sm);
    font-weight: 600;
  }

  input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 2px solid var(--color-stroke-muted);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    font-family: var(--font-body);
    font-size: var(--text-base);
    outline: none;
    transition: border-color 0.2s ease;
  }

  input:focus {
    border-color: var(--color-accent);
  }

  input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error-message {
    color: #dc2626;
    margin-bottom: 1rem;
    font-size: var(--text-sm);
  }

  .submit-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: var(--color-accent);
    color: white;
    border: 2px solid var(--color-stroke);
    border-radius: var(--radius-md);
    font-family: var(--font-hand);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .submit-btn:disabled {
    background: var(--color-stroke-muted);
    cursor: not-allowed;
  }

  .success-message {
    text-align: center;
    padding: 2rem 0;
  }

  .success-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--color-accent);
  }

  .success-message h3 {
    font-family: var(--font-hand);
    margin-bottom: 0.5rem;
  }

  .success-message p {
    color: var(--color-text-muted);
  }
</style>
