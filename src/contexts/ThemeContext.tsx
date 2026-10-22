import React, { createContext, useContext, useEffect } from 'react';
import type { Theme } from '../types';

interface ThemeContextValue {
  theme: Theme;
  effectiveTheme: 'light';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Enforce light theme globally
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  const setTheme = (_newTheme: Theme) => {
    // Light mode only
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', effectiveTheme: 'light', setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
