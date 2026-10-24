import { create } from "zustand";

export type ThemeMode = "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "fleet_theme_mode";

const getSystemTheme = (): ThemeMode => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Storage access unavailable
  }
  return getSystemTheme();
};

export const applyThemeToDom = (theme: ThemeMode) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }
};

interface ThemeState {
  theme: ThemeMode;
  mode: ThemeMode; // Alias for backward compatibility
  resolvedTheme: ResolvedTheme; // Alias for backward compatibility
  setTheme: (theme: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void; // Alias
  toggleTheme: () => void;
  initTheme: () => () => void;
}

const initialTheme = getInitialTheme();
if (typeof window !== "undefined") {
  applyThemeToDom(initialTheme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  mode: initialTheme,
  resolvedTheme: initialTheme,

  setTheme: (nextTheme: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage write error
    }
    applyThemeToDom(nextTheme);
    set({
      theme: nextTheme,
      mode: nextTheme,
      resolvedTheme: nextTheme,
    });
  },

  setMode: (mode: ThemeMode) => {
    get().setTheme(mode);
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },

  initTheme: () => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => {};
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // If user has not explicitly set a manual preference in localStorage, follow system preference
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (!stored) {
          const sysTheme: ThemeMode = e.matches ? "dark" : "light";
          applyThemeToDom(sysTheme);
          set({
            theme: sysTheme,
            mode: sysTheme,
            resolvedTheme: sysTheme,
          });
        }
      } catch {
        // Storage access error
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    applyThemeToDom(get().theme);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  },
}));
