import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export type ToastType = "info" | "warning" | "critical" | "success";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message, type = "info", duration = 6000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [{ id, title, message, type, duration }, ...prev.slice(0, 5)]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toast, removeToast }), [toast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Notification Container (Top-Right fixed) */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const isCritical = t.type === "critical";
          const isWarning = t.type === "warning";
          const isSuccess = t.type === "success";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
                isCritical
                  ? "bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50"
                  : isWarning
                  ? "bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-amber-950/50"
                  : isSuccess
                  ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50"
                  : "bg-slate-900/95 border-indigo-500/40 text-slate-100 shadow-indigo-950/50"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isCritical && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {!isCritical && !isWarning && !isSuccess && (
                  <Info className="w-5 h-5 text-indigo-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold tracking-tight">{t.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">
                  {t.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
