import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { useAlertStore } from "../../store/alertStore";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { alerts, stats, markAsRead, markAllAsRead, fetchAlerts, fetchStats } =
    useAlertStore();

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = stats.unread_count;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
        title="Fleet Alerts"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Alerts</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No recent fleet alerts
              </div>
            ) : (
              alerts.map((alert) => {
                const isCrit = alert.severity === "CRITICAL";
                const isWarn = alert.severity === "WARNING";

                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (!alert.is_read) {
                        markAsRead(alert.id);
                      }
                    }}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-900/80 ${
                      !alert.is_read ? "bg-slate-900/40" : "opacity-75"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isCrit ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Info className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {alert.plate_number ? `${alert.plate_number} • ` : ""}
                          {alert.alert_type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(alert.triggered_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {alert.message}
                      </p>

                      {!alert.is_read && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="text-[10px] text-indigo-400 font-medium">
                            New
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
