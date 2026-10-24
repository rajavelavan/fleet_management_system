import React from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../store/themeStore";

interface ThemeSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-2 p-2 rounded-xl border transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        isDark
          ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 hover:bg-slate-850 shadow-sm"
          : "bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
      } ${className}`}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={
        isDark
          ? "Dark mode active — click to switch to Light mode"
          : "Light mode active — click to switch to Dark mode"
      }
    >
      {/* Icon displaying the current mode with smooth hover reaction */}
      {isDark ? (
        <Moon className="w-5 h-5 text-indigo-400 group-hover:text-amber-300 transition-all duration-300 group-hover:-rotate-12" />
      ) : (
        <Sun className="w-5 h-5 text-amber-500 group-hover:text-amber-600 transition-all duration-300 group-hover:rotate-45" />
      )}

      {showLabel && (
        <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      )}
    </button>
  );
};
