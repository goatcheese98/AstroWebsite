export type Theme = 'light' | 'dark';

/**
 * Get current theme from document attribute
 */
export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'light';
}

/**
 * Set theme and save to localStorage
 */
export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme(): void {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Listen for theme changes
 */
export function onThemeChange(callback: (theme: Theme) => void): () => void {
  const observer = new MutationObserver(() => {
    callback(getTheme());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

/**
 * Check if current page is a canvas-only page
 * Canvas pages should always be in light mode
 */
export function isCanvasPage(): boolean {
  // Check if we're on a canvas subdomain
  const isCanvasDomain = window.location.hostname.includes('canvas.');
  // Check if we're on the /ai-canvas path
  const isCanvasPath = window.location.pathname === '/ai-canvas';
  return isCanvasDomain || isCanvasPath;
}

/**
 * Initialize theme - respects user preference on main site,
 * forces light mode on canvas pages
 */
export function initTheme(): void {
  if (isCanvasPage()) {
    // Force light mode on canvas pages
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    // Use saved preference or system preference on main site
    const saved = localStorage.getItem('theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  }
}
