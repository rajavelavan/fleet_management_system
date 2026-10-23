import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "fleet_theme_mode";

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
};

const getStoredMode = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // LocalStorage unavailable
  }
  return "system";
};

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
};

export const applyThemeToDom = (resolvedTheme: ResolvedTheme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolvedTheme === "dark") {
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
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => () => void;
}

const initialMode = getStoredMode();
const initialResolved = resolveTheme(initialMode);
if (typeof window !== "undefined") {
  applyThemeToDom(initialResolved);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolvedTheme: initialResolved,

  setMode: (mode: ThemeMode) => {
    const resolved = resolveTheme(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage write error
    }
    applyThemeToDom(resolved);
    set({ mode, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const { mode, resolvedTheme } = get();
    let nextMode: ThemeMode;
    if (mode === "system") {
      // If currently system, switch to opposite of resolved
      nextMode = resolvedTheme === "dark" ? "light" : "dark";
    } else if (mode === "dark") {
      nextMode = "light";
    } else {
      nextMode = "system";
    }
    get().setMode(nextMode);
  },

  initTheme: () => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => {};
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const currentMode = get().mode;
      if (currentMode === "system") {
        const nextResolved = getSystemTheme();
        applyThemeToDom(nextResolved);
        set({ resolvedTheme: nextResolved });
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    // Apply initially
    applyThemeToDom(get().resolvedTheme);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  },
}));
