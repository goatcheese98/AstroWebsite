export type Theme = 'light' | 'dark';

/**
 * Always returns 'light' - light mode is enforced application-wide
 */
export function getTheme(): Theme {
  return 'light';
}

/**
 * No-op: Theme is locked to light mode
 */
export function setTheme(_theme: Theme): void {
  // Theme is locked to light mode, no changes allowed
  document.documentElement.setAttribute('data-theme', 'light');
}

/**
 * No-op: Theme is locked to light mode
 */
export function toggleTheme(): void {
  // Theme is locked to light mode, no toggle allowed
}

/**
 * No-op: Theme is locked to light mode, no changes to listen for
 */
export function onThemeChange(_callback: (theme: Theme) => void): () => void {
  // Theme is locked to light mode, no changes to listen for
  return () => {};
}
