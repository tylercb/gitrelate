import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<Theme, "system">;

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

// Keep in sync with the inline script in index.html, which applies the theme
// before first paint
export const THEME_STORAGE_KEY = "theme";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within Providers");
  }
  return context;
}

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be unavailable (e.g. blocked by the browser)
  }
  return "system";
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function applyTheme(resolvedTheme: ResolvedTheme) {
  // Suppress CSS transitions during the swap so colors don't animate
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  // Force a style recalculation while transitions are off, then restore them
  window.getComputedStyle(document.body);
  setTimeout(() => style.remove(), 1);
}
