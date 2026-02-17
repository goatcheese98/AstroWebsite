<script lang="ts">
  // Default values
  const DEFAULT_BASE_FREQ = 0.01;
  const DEFAULT_SCALE = 0.5;
  const DEFAULT_RADIUS = 8;
  const DEFAULT_FONT = 'handwritten';

  type FontOption = {
    id: string;
    name: string;
    value: string;
  };

  const FONTS: FontOption[] = [
    {
      id: 'handwritten',
      name: 'Hand Drawn',
      value: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif'
    },
    {
      id: 'system',
      name: 'System',
      value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    {
      id: 'cascadia',
      name: 'Cascadia',
      value: '"Cascadia Code", "Fira Code", "SF Mono", monospace'
    },
    {
      id: 'inter',
      name: 'Clean (Inter)',
      value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
    }
  ];

  let baseFrequency = $state(DEFAULT_BASE_FREQ);
  let displacementScale = $state(DEFAULT_SCALE);
  let borderRadius = $state(DEFAULT_RADIUS);
  let selectedFont = $state(DEFAULT_FONT);
  let isExpanded = $state(false);

  // Update filter values
  $effect(() => {
    if (typeof document === 'undefined') return;
    const turbulence = document.getElementById('sketch-turbulence') as SVGFETurbulenceElement;
    const displacement = document.getElementById('sketch-displacement') as SVGFEDisplacementMapElement;
    
    if (turbulence) {
      turbulence.setAttribute('baseFrequency', baseFrequency.toString());
    }
    if (displacement) {
      displacement.setAttribute('scale', displacementScale.toString());
    }
  });

  // Update border radius CSS variable
  $effect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--radius-md', `${borderRadius}px`);
  });

  // Update font family on html element - affects entire viewport
  $effect(() => {
    if (typeof document === 'undefined') return;
    const font = FONTS.find(f => f.id === selectedFont);
    if (font) {
      document.documentElement.style.fontFamily = font.value;
    }
  });

  function reset() {
    baseFrequency = DEFAULT_BASE_FREQ;
    displacementScale = DEFAULT_SCALE;
    borderRadius = DEFAULT_RADIUS;
    selectedFont = DEFAULT_FONT;
  }
</script>

<div class="sketch-controls" class:expanded={isExpanded}>
  <button 
    class="sketch-controls__toggle" 
    onclick={() => isExpanded = !isExpanded}
    aria-label={isExpanded ? "Close sketch controls" : "Open sketch controls"}
    aria-expanded={isExpanded}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 6V4M12 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 14v-2m0-6v-2m-6 8H4m16 0h-2m-6-6H4m16 0h-2"/>
    </svg>
    <span>Style</span>
  </button>

  {#if isExpanded}
    <div class="sketch-controls__panel">
      <div class="sketch-controls__header">
        <h3>Style Settings</h3>
        <button class="sketch-controls__reset" onclick={reset} title="Reset to defaults">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>
            <path d="M3 3v9h9"/>
          </svg>
        </button>
      </div>

      <div class="sketch-controls__section">
        <h4 class="sketch-controls__section-title">Typography</h4>
        <div class="sketch-controls__font-select">
          {#each FONTS as font}
            <button 
              class="sketch-controls__font-option"
              class:active={selectedFont === font.id}
              onclick={() => selectedFont = font.id}
            >
              {font.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="sketch-controls__section">
        <h4 class="sketch-controls__section-title">Sketch Effect</h4>
        
        <div class="sketch-controls__control">
          <label for="roughness">Roughness</label>
          <input 
            id="roughness"
            type="range"
            min="0"
            max="0.1"
            step="0.005"
            bind:value={baseFrequency}
          />
          <span class="sketch-controls__value">{baseFrequency.toFixed(3)}</span>
        </div>

        <div class="sketch-controls__control">
          <label for="wobble">Wobble</label>
          <input 
            id="wobble"
            type="range"
            min="0"
            max="10"
            step="0.5"
            bind:value={displacementScale}
          />
          <span class="sketch-controls__value">{displacementScale}</span>
        </div>

        <div class="sketch-controls__control">
          <label for="roundness">Roundness</label>
          <input 
            id="roundness"
            type="range"
            min="0"
            max="24"
            step="1"
            bind:value={borderRadius}
          />
          <span class="sketch-controls__value">{borderRadius}px</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .sketch-controls {
    position: fixed;
    bottom: var(--space-lg);
    right: var(--space-lg);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-sm);
  }

  .sketch-controls__toggle {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-surface);
    border: 2px solid var(--color-stroke);
    border-radius: var(--radius-md);
    font-family: var(--font-hand);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s ease;
    filter: url(#sketch-filter);
  }

  .sketch-controls__toggle:hover {
    background: var(--color-surface-hover);
    transform: translateY(-2px);
  }

  .sketch-controls.expanded .sketch-controls__toggle {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }

  .sketch-controls__panel {
    background: var(--color-surface);
    border: 2px solid var(--color-stroke);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    width: 240px;
    max-height: 70vh;
    overflow-y: auto;
    filter: url(#sketch-filter);
    animation: slide-up 0.2s ease;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .sketch-controls__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-stroke-muted);
  }

  .sketch-controls__header h3 {
    font-family: var(--font-hand);
    font-size: var(--text-base);
    margin: 0;
  }

  .sketch-controls__reset {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;
  }

  .sketch-controls__reset:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .sketch-controls__section {
    margin-bottom: var(--space-md);
  }

  .sketch-controls__section:last-child {
    margin-bottom: 0;
  }

  .sketch-controls__section-title {
    font-family: var(--font-hand);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-sm) 0;
  }

  .sketch-controls__font-select {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .sketch-controls__font-option {
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg);
    border: 1px solid var(--color-stroke-muted);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .sketch-controls__font-option:hover {
    border-color: var(--color-accent);
    background: var(--color-surface-hover);
  }

  .sketch-controls__font-option.active {
    border-color: var(--color-accent);
    background: var(--color-accent-light);
    color: var(--color-accent);
    font-weight: 600;
  }

  .sketch-controls__control {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
  }

  .sketch-controls__control:last-child {
    margin-bottom: 0;
  }

  .sketch-controls__control label {
    font-family: var(--font-hand);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .sketch-controls__control input[type="range"] {
    width: 100%;
    height: 6px;
    background: var(--color-bg);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
    cursor: pointer;
  }

  .sketch-controls__control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-accent);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  .sketch-controls__control input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .sketch-controls__control input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--color-accent);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .sketch-controls__value {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: right;
  }

  /* Mobile: Position at bottom center */
  @media (max-width: 640px) {
    .sketch-controls {
      right: 50%;
      transform: translateX(50%);
    }

    .sketch-controls__panel {
      width: calc(100vw - var(--space-lg) * 2);
      max-width: 300px;
    }
  }
</style>
