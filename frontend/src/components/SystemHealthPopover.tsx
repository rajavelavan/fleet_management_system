import React, { useEffect, useState, useRef } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Radio,
  MapPin,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { analyticsService } from "../services/analyticsService";
import { HealthCheckResponse } from "../types/analytics";

interface SystemHealthPopoverProps {
  placement?: "up" | "down";
}

export const SystemHealthPopover: React.FC<SystemHealthPopoverProps> = ({
  placement = "up",
}) => {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getSystemHealth();
      setHealth(data);
    } catch (e) {
      console.warn("Health check query failed:", e);
      setHealth({
        status: "DEGRADED",
        timestamp: new Date().toISOString(),
        version: "v1.0.0",
        services: {
          database: false,
          redis: false,
          telemetry_websocket: false,
          google_routes_api: false,
          report_generation: false,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const services = health?.services;
  const allOperational =
    health?.status === "OK" &&
    services &&
    Object.values(services).every(Boolean);

  const tools = [
    {
      id: "database",
      name: "PostgreSQL Database",
      status: services?.database ?? false,
      icon: Database,
      desc: "Neon PostgreSQL Cloud cluster",
    },
    {
      id: "redis",
      name: "Redis Pub/Sub & Cache",
      status: services?.redis ?? false,
      icon: Radio,
      desc: "Live stream caching & Pub/Sub",
    },
    {
      id: "telemetry_ws",
      name: "Telemetry WebSocket",
      status: services?.telemetry_websocket ?? false,
      icon: Activity,
      desc: "FastAPI /ws/telemetry streaming",
    },
    {
      id: "routes_api",
      name: "Google Routes & Matrix",
      status: services?.google_routes_api ?? false,
      icon: MapPin,
      desc: "Compute polyline and ETA matrix",
    },
    {
      id: "reports",
      name: "Excel Report Engine",
      status: services?.report_generation ?? false,
      icon: FileSpreadsheet,
      desc: "OpenPyXL spreadsheet export",
    },
  ];

  const lastUpdated = health?.timestamp
    ? new Date(health.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const popoverPosition =
    placement === "up"
      ? "bottom-full mb-3 right-0"
      : "top-full mt-3 right-0 sm:right-auto sm:left-0";

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-medium transition cursor-pointer"
        title="View Live Status of All System Services"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            allOperational ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`}
        />
        <Activity className="w-3 h-3 text-slate-500 dark:text-slate-400" />
        <span className="whitespace-nowrap">System Health</span>
      </button>

      {/* Popover showing all tools health status */}
      <div
        className={`absolute ${popoverPosition} w-72 sm:w-80 transition-all duration-200 z-50 ${
          isOpen
            ? "opacity-100 visible pointer-events-auto"
            : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto"
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/80 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                SYSTEM HEALTH
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  allOperational
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                }`}
              >
                {loading && !health
                  ? "CONNECTING"
                  : allOperational
                  ? "ALL OPERATIONAL"
                  : "DEGRADED"}
              </span>
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                {lastUpdated}
              </span>
            )}
          </div>

          {/* Individual Tool Health List */}
          <div className="space-y-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-md ${
                        tool.status
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {tool.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {tool.desc}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 pl-2">
                    {tool.status ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Live</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Offline</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>FastAPI Backend Telemetry</span>
            <span className="font-mono">{health?.version || "v1.0.0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
