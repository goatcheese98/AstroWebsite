export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

export function toggleTheme(): void {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

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
