import React from "react";
import {
  X,
  Truck,
  User,
  Compass,
  Gauge,
  MapPin,
  Fuel,
  Activity,
  History,
  AlertTriangle,
} from "lucide-react";
import { LiveVehicleState, LocationPoint } from "../../types/tracking";

interface VehicleInfoPanelProps {
  vehicle: LiveVehicleState | null;
  routeTrail: LocationPoint[];
  isLoadingTrail: boolean;
  onClose: () => void;
}

export const VehicleInfoPanel: React.FC<VehicleInfoPanelProps> = ({
  vehicle,
  routeTrail,
  isLoadingTrail,
  onClose,
}) => {
  if (!vehicle) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case "IDLE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Idle
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            Maintenance
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Offline
          </span>
        );
    }
  };

  const formattedLastSeen = vehicle.last_seen_at
    ? new Date(vehicle.last_seen_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Just now";

  return (
    <div className="absolute top-4 right-4 z-30 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">
              {vehicle.plate_number}
            </h3>
            <p className="text-xs text-slate-400">
              {vehicle.make ? `${vehicle.make} ${vehicle.model || ""}` : vehicle.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(vehicle.status)}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Speed */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Current Speed</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {vehicle.speed !== null && vehicle.speed !== undefined
                ? `${Math.round(vehicle.speed)} km/h`
                : "0 km/h"}
            </div>
          </div>

          {/* Heading */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bearing / Heading</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {vehicle.heading !== null && vehicle.heading !== undefined
                ? `${Math.round(vehicle.heading)}°`
                : "0°"}
            </div>
          </div>

          {/* Fuel Level */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Fuel Tank</span>
            </div>
            <div className="text-base font-bold text-white flex items-center justify-between">
              <span>{vehicle.current_fuel ?? 75} L</span>
              <span className="text-xs text-slate-400 font-normal">
                / {vehicle.fuel_capacity ?? 100} L
              </span>
            </div>
          </div>

          {/* Telemetry Clock */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Last Ping</span>
            </div>
            <div className="text-sm font-semibold text-emerald-400 truncate">
              {formattedLastSeen}
            </div>
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>GPS WGS-84 Coordinates</span>
          </div>
          <div className="font-mono text-xs text-slate-200">
            Lat: <span className="text-white font-medium">{vehicle.latitude.toFixed(6)}</span>
            {"  "}&bull;{"  "}
            Lng: <span className="text-white font-medium">{vehicle.longitude.toFixed(6)}</span>
          </div>
        </div>

        {/* Driver Assignment Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Assigned Driver
            </span>
            <span className="text-[10px] text-indigo-400 uppercase font-semibold">
              Shift Active
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {vehicle.driver_name || "Unassigned"}
            </p>
            {vehicle.driver_phone && (
              <p className="text-xs text-slate-400 mt-0.5">{vehicle.driver_phone}</p>
            )}
          </div>
        </div>

        {/* 30-Minute Trail Status */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-xs font-semibold text-white">30-Minute Route Trail</p>
              <p className="text-[11px] text-slate-400">
                {isLoadingTrail
                  ? "Loading telemetry coordinates..."
                  : `${routeTrail.length} breadcrumb points drawn`}
              </p>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
