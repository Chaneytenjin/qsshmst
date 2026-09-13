import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
type ThemeMode = Theme | "system";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme?: () => void;
  setThemeMode?: (mode: ThemeMode) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
  forceSystemTheme?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
  forceSystemTheme = false,
}: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme;
    }
    return defaultTheme;
  });
  const [systemTheme, setSystemTheme] = useState<Theme>(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const activeThemeMode: ThemeMode = forceSystemTheme ? "system" : themeMode;
  const theme = useMemo<Theme>(() => activeThemeMode === "system" ? systemTheme : activeThemeMode, [activeThemeMode, systemTheme]);
  const canSwitchTheme = switchable && !forceSystemTheme;

  useEffect(() => {
    if (activeThemeMode !== "system" || typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");
    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [activeThemeMode]);

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.appliedTheme;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable && !forceSystemTheme) {
      localStorage.setItem("theme", themeMode);
    }

    if (previousTheme && previousTheme !== theme) {
      root.dataset.publicThemeTransition = "true";
      const transitionTimer = window.setTimeout(() => {
        delete root.dataset.publicThemeTransition;
      }, 280);
      root.dataset.appliedTheme = theme;
      return () => {
        window.clearTimeout(transitionTimer);
        delete root.dataset.publicThemeTransition;
      };
    }

    root.dataset.appliedTheme = theme;
  }, [forceSystemTheme, theme, themeMode, switchable]);

  const toggleTheme = canSwitchTheme
    ? () => {
        setThemeMode(theme === "light" ? "dark" : "light");
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, themeMode: activeThemeMode, toggleTheme, setThemeMode: canSwitchTheme ? setThemeMode : undefined, switchable: canSwitchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "dark" as const, themeMode: "dark" as const, toggleTheme: undefined, setThemeMode: undefined, switchable: false };
  }
  return context;
}
