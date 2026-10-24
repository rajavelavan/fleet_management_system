import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useThemeStore, ThemeMode } from "../store/themeStore";

interface ThemeSwitcherProps {
  variant?: "dropdown" | "segmented";
  className?: string;
  showLabels?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = "dropdown",
  className = "",
  showLabels = false,
}) => {
  const { mode, resolvedTheme, setMode } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const options: {
    id: ThemeMode;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "light",
      label: "Light Mode",
      description: "Clean bright theme for daytime and well-lit environments",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      description: "Low-light theme that minimizes eye fatigue",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Default",
      description: `Follows your OS appearance (currently ${resolvedTheme})`,
      icon: Monitor,
    },
  ];

  // Active Icon for Trigger
  const CurrentIcon =
    mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`}
        role="radiogroup"
        aria-label="Theme mode selector"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setMode(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={opt.description}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {(showLabels || isSelected) && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Theme: ${mode} mode (resolved to ${resolvedTheme}). Click to change.`}
        title={`Theme: ${mode.toUpperCase()} (resolved to ${resolvedTheme})`}
        className={`relative p-2 rounded-xl transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          isOpen
            ? "bg-white dark:bg-slate-800 border-indigo-500/60 text-indigo-600 dark:text-indigo-400 shadow-md"
            : "bg-white/80 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        } border`}
      >
        <CurrentIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform group-hover:scale-105" />
        {/* Subtle indicator dot for active mode */}
        <span
          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-950 ${
            mode === "system"
              ? "bg-cyan-500"
              : mode === "light"
              ? "bg-amber-400"
              : "bg-indigo-500"
          }`}
        />
      </button>

      {/* Floating Theme Selection Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 p-1.5 space-y-1"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Color Theme
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Mode: <span className="text-indigo-600 dark:text-indigo-400 capitalize">{mode}</span>
              {mode === "system" && (
                <span className="text-[10px] text-slate-400 ml-1">
                  ({resolvedTheme})
                </span>
              )}
            </p>
          </div>

          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setMode(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition group ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-500/20"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 p-1 rounded-lg ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <span>{opt.label}</span>
                      {opt.id === "system" && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
