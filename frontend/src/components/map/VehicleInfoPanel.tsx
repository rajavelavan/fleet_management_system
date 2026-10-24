import React from "react";
import {
  X,
  Gauge,
  Compass,
  Fuel,
  Clock,
  Navigation,
  Truck,
  MapPin,
} from "lucide-react";
import { LiveVehicleState, LocationPoint } from "../../types/tracking";
import { VehicleStatus } from "../../types/fleet";

interface VehicleInfoPanelProps {
  vehicle: LiveVehicleState | null;
  routeTrail?: LocationPoint[];
  isLoadingTrail?: boolean;
  onClose: () => void;
}

export const VehicleInfoPanel: React.FC<VehicleInfoPanelProps> = ({
  vehicle,
  routeTrail = [],
  isLoadingTrail = false,
  onClose,
}) => {
  if (!vehicle) return null;

  const getStatusBadge = (st: VehicleStatus) => {
    switch (st) {
      case "ACTIVE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ACTIVE
          </span>
        );
      case "IDLE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            IDLE
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            MAINTENANCE
          </span>
        );
      case "OFFLINE":
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            OFFLINE
          </span>
        );
    }
  };

  const fuelPct =
    vehicle.fuel_capacity && vehicle.fuel_capacity > 0 && vehicle.current_fuel !== undefined
      ? Math.min(
          100,
          Math.round((vehicle.current_fuel / vehicle.fuel_capacity) * 100)
        )
      : null;

  const lastSeenStr = vehicle.last_seen_at
    ? new Date(vehicle.last_seen_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Live";

  return (
    <>
      {/* Mobile Backdrop Overlay (< sm) */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-30 sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Card / Floating Panel */}
      <div className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-4 sm:right-4 sm:inset-x-auto z-40 w-full sm:w-96 max-w-full sm:max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-xl dark:shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-all duration-300 animate-in slide-in-from-bottom sm:slide-in-from-right">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {vehicle.plate_number}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {vehicle.make ? `${vehicle.make} ${vehicle.model || ""}` : vehicle.type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(vehicle.status)}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Close Details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-5 space-y-4 max-h-[55vh] sm:max-h-[70vh] overflow-y-auto">
        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Speed */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
              <Gauge className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Current Speed</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {vehicle.speed !== null && vehicle.speed !== undefined
                ? `${Math.round(vehicle.speed)} km/h`
                : "0 km/h"}
            </div>
          </div>

          {/* Heading */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
              <Compass className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Bearing / Heading</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {vehicle.heading !== null && vehicle.heading !== undefined
                ? `${Math.round(vehicle.heading)}°`
                : "0°"}
            </div>
          </div>

          {/* Fuel / Battery */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 col-span-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <div className="flex items-center gap-2">
                <Fuel className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Fuel / Energy Reservoir</span>
              </div>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {vehicle.current_fuel} / {vehicle.fuel_capacity} L
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{fuelPct !== null ? `${fuelPct}%` : "N/A"}</span>
              <div className="w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (fuelPct ?? 0) < 20
                      ? "bg-rose-500"
                      : (fuelPct ?? 0) < 50
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${fuelPct ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* GPS Coordinates & Heartbeat */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Latest GPS Fix
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              {lastSeenStr}
            </span>
          </div>

          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>
              Lat: <span className="text-slate-900 dark:text-white font-medium">{vehicle.latitude.toFixed(6)}</span>
            </span>
            <span>
              Lng: <span className="text-slate-900 dark:text-white font-medium">{vehicle.longitude.toFixed(6)}</span>
            </span>
          </div>
        </div>

        {/* Assigned Driver Profile Details */}
        {vehicle.driver_name ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Assigned Commercial Driver
            </span>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {vehicle.driver_name}
                </p>
                {vehicle.driver_phone && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phone: {vehicle.driver_phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 text-center">
            No driver currently assigned to this vehicle asset
          </div>
        )}

        {/* 30-Minute Route Trail Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <p className="text-xs font-semibold text-slate-900 dark:text-white">30-Minute Route Trail</p>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isLoadingTrail
                ? "Loading..."
                : `${routeTrail.length} waypoint${
                    routeTrail.length === 1 ? "" : "s"
                  }`}
            </span>
          </div>

          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (routeTrail.length / 30) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
            Real-time trail points streamed via Redis and rendered as high-contrast polylines on the map.
          </p>
        </div>
      </div>
      </div>
    </>
  );
};
