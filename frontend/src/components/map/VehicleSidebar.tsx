import React, { useState, useMemo } from "react";
import {
  Search,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { LiveVehicleState } from "../../types/tracking";
import { VehicleStatus } from "../../types/fleet";

interface VehicleSidebarProps {
  vehicles: LiveVehicleState[];
  selectedVehicleId: string | null;
  isConnected: boolean;
  onSelectVehicle: (id: string) => void;
}

export const VehicleSidebar: React.FC<VehicleSidebarProps> = ({
  vehicles,
  selectedVehicleId,
  isConnected,
  onSelectVehicle,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.make && v.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.model && v.model.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const counts = useMemo(() => {
    const total = vehicles.length;
    let active = 0;
    let idle = 0;
    let offline = 0;

    for (const v of vehicles) {
      if (v.status === "ACTIVE") active++;
      else if (v.status === "IDLE") idle++;
      else offline++;
    }

    return { total, active, idle, offline };
  }, [vehicles]);

  const getStatusDot = (st: VehicleStatus) => {
    switch (st) {
      case "ACTIVE":
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />;
      case "IDLE":
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />;
      case "OFFLINE":
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />;
      case "MAINTENANCE":
        return <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />;
    }
  };

  return (
    <div className="w-full lg:w-80 xl:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none transition-colors">
      {/* Header & Connection status */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Fleet Radar</h2>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Live WS</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Filter Counts */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              statusFilter === "ALL"
                ? "bg-indigo-600 text-white font-bold shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            All ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white font-bold shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/70 text-emerald-700 dark:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            Act ({counts.active})
          </button>
          <button
            onClick={() => setStatusFilter("IDLE")}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              statusFilter === "IDLE"
                ? "bg-amber-600 text-white font-bold shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/70 text-amber-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            Idl ({counts.idle})
          </button>
          <button
            onClick={() => setStatusFilter("OFFLINE")}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              statusFilter === "OFFLINE"
                ? "bg-rose-600 text-white font-bold shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/70 text-rose-700 dark:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            Off ({counts.offline})
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plate, model, brand..."
            className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No vehicles match your search filter
          </div>
        ) : (
          filteredVehicles.map((vehicle) => {
            const isSelected = selectedVehicleId === vehicle.id;
            return (
              <div
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle.id)}
                className={`p-3.5 cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-l-4 border-indigo-600 dark:border-indigo-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <Truck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {vehicle.plate_number}
                      </span>
                      {getStatusDot(vehicle.status)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {vehicle.make ? `${vehicle.make} ${vehicle.model || ""}` : vehicle.type}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {vehicle.speed !== null && vehicle.speed !== undefined
                      ? `${Math.round(vehicle.speed)} km/h`
                      : "0 km/h"}
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {vehicle.heading !== null && vehicle.heading !== undefined
                      ? `${Math.round(vehicle.heading)}°`
                      : "0°"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
