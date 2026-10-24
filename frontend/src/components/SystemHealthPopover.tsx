import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useTrackingStore } from "../store/trackingStore";

interface SystemHealthPopoverProps {
  placement?: "up" | "down";
}

export const SystemHealthPopover: React.FC<SystemHealthPopoverProps> = ({
  placement = "up",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isWsConnected = useTrackingStore((state) => state.isConnected);

  // TanStack Query for optimized background auto-refresh & window focus revalidation
  const {
    data: health,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: () => analyticsService.getSystemHealth(),
    refetchInterval: 10000, // 10s live polling
    refetchIntervalInBackground: false, // pause when tab is in background to save battery/network
    refetchOnWindowFocus: true, // immediately refetch when user returns to this tab
    staleTime: 5000,
  });

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
  const isDbLive = Boolean(services?.database);
  const isRedisLive = Boolean(services?.redis);
  const isWsLive = Boolean(isWsConnected || services?.telemetry_websocket);
  const isRoutesLive = Boolean(services?.google_routes_api);
  const isReportsLive = Boolean(services?.report_generation);

  const allOperational =
    health?.status === "OK" &&
    isDbLive &&
    isRedisLive &&
    isWsLive &&
    isRoutesLive &&
    isReportsLive;

  const tools = [
    {
      id: "database",
      name: "PostgreSQL Database",
      status: isDbLive,
      icon: Database,
      desc: health?.details?.postgisVersion
        ? `Neon PostgreSQL (${health.details.postgisVersion.split(" ")[0]})`
        : "Neon PostgreSQL Cloud cluster",
    },
    {
      id: "redis",
      name: "Redis Pub/Sub & Cache",
      status: isRedisLive,
      icon: Radio,
      desc: "Live stream caching & Pub/Sub",
    },
    {
      id: "telemetry_ws",
      name: "Telemetry WebSocket",
      status: isWsLive,
      icon: Activity,
      desc: isWsConnected
        ? "Live telemetry connected"
        : "FastAPI /ws/tracking ready",
    },
    {
      id: "routes_api",
      name: "Google Routes & Matrix",
      status: isRoutesLive,
      icon: MapPin,
      desc: "Compute polyline and ETA matrix",
    },
    {
      id: "reports",
      name: "Excel Report Engine",
      status: isReportsLive,
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
      onMouseEnter={() => {
        setIsOpen(true);
        refetch();
      }}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger Pill */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refetch();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-medium transition cursor-pointer"
        title="View Live Status of All System Services"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isLoading && !health
              ? "bg-amber-500 animate-pulse"
              : allOperational
              ? "bg-emerald-500 animate-pulse"
              : "bg-rose-500"
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
                  isLoading && !health
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : allOperational
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                }`}
              >
                {isLoading && !health
                  ? "CONNECTING"
                  : allOperational
                  ? "ALL OPERATIONAL"
                  : "DEGRADED"}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              disabled={isFetching}
              className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
              title="Click to check health now"
            >
              <RefreshCw
                className={`w-2.5 h-2.5 ${isFetching ? "animate-spin text-indigo-500" : ""}`}
              />
              <span>{isFetching ? "Checking..." : lastUpdated || "Live"}</span>
            </button>
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
            <span className="font-mono">{health?.version || "0.1.0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
