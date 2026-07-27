import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(this.loadInitial());

  constructor() {
    this.applyTheme(this.isDark());
  }

  toggle(): void {
    this.isDark.update(v => !v);
    this.applyTheme(this.isDark());
    localStorage.setItem(THEME_KEY, this.isDark() ? 'dark' : 'light');
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  private loadInitial(): boolean {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
