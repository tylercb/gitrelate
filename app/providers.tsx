import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  ThemeContext,
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  type ResolvedTheme,
  type Theme,
} from "@/app/theme";

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    // Follow OS theme changes and keep other tabs in sync
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    const handleMediaChange = () => setSystemTheme(getSystemTheme());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setThemeState(getStoredTheme());
    };

    media.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      media.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (newTheme: Theme) => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch {
          // The preference just won't persist
        }
        setThemeState(newTheme);
      },
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
