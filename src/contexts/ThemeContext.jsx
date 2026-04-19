import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { profile } = useAuth();
  const [theme, setThemeState] = useState('system');
  const [accentColor, setAccentColorState] = useState('#F59E0B');
  const [fontSize, setFontSizeState] = useState('medium');

  // Sync from user preferences when profile loads
  useEffect(() => {
    if (profile?.preferences) {
      setThemeState(profile.preferences.theme || 'system');
      setAccentColorState(profile.preferences.accentColor || '#F59E0B');
      setFontSizeState(profile.preferences.fontSize || 'medium');
    }
  }, [profile]);

  // Apply theme to document
  useEffect(() => {
    const apply = (t) => {
      document.documentElement.setAttribute('data-theme', t);
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      apply(theme);
    }
  }, [theme]);

  // Apply accent color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
  }, [accentColor]);

  // Apply font size scaling
  useEffect(() => {
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
  }, [fontSize]);

  const resolvedTheme = (() => {
    if (theme !== 'system') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })();

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolvedTheme, accentColor, setAccentColor: setAccentColorState, fontSize, setFontSize: setFontSizeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
};
