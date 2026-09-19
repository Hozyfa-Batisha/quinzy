/**
 * Theme Manager – shared across all pages
 */
const ThemeManager = {
  STORAGE_KEY: 'qp-theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    this.apply(isDark, false);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const currentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.apply(!currentlyDark, true);
    });
  },

  apply(isDark, animate) {
    const root = document.documentElement;
    if (animate) {
      root.style.transition = 'background 0.45s, color 0.45s';
      setTimeout(() => { root.style.transition = ''; }, 500);
    }
    const knob = document.getElementById('theme-toggle-knob');
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem(this.STORAGE_KEY, 'dark');
      if (knob) knob.textContent = '☀️';
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem(this.STORAGE_KEY, 'light');
      if (knob) knob.textContent = '🌙';
    }
  },
};

window.ThemeManager = ThemeManager;

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
