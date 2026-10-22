import React from "react";
import {
  Car,
  Fuel,
  Gauge,
  MapPin,
  Trash2,
  UserCheck,
  UserMinus,
  Edit2,
} from "lucide-react";
import { Vehicle } from "../types/fleet";

interface VehicleTableProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onAssignDriver: (vehicle: Vehicle) => void;
  onUnassignDriver: (vehicle: Vehicle) => void;
}

export const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  isLoading,
  onEdit,
  onDelete,
  onAssignDriver,
  onUnassignDriver,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "IDLE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "MAINTENANCE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "OFFLINE":
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "TRUCK":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "VAN":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "MOTORCYCLE":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "CAR":
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Loading vehicles roster...</p>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-300 mb-1">No vehicles found</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          No vehicles match the selected criteria or none have been added yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">Vehicle</th>
              <th scope="col" className="px-6 py-4 font-semibold">Type</th>
              <th scope="col" className="px-6 py-4 font-semibold">Status</th>
              <th scope="col" className="px-6 py-4 font-semibold">Assigned Driver</th>
              <th scope="col" className="px-6 py-4 font-semibold">Fuel Level</th>
              <th scope="col" className="px-6 py-4 font-semibold">Live Telemetry</th>
              <th scope="col" className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {vehicles.map((v) => {
              const fuelPct = v.fuel_capacity > 0
                ? Math.min(100, Math.round((v.current_fuel / v.fuel_capacity) * 100))
                : 0;

              return (
                <tr
                  key={v.id}
                  className="hover:bg-slate-800/40 transition-colors duration-150"
                >
                  {/* Vehicle details */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold text-xs">
                        <Car className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-white tracking-wide">
                          {v.plate_number}
                        </div>
                        <div className="text-xs text-slate-400">
                          {v.year} {v.make} {v.model}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(
                        v.type
                      )}`}
                    >
                      {v.type}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                        v.status
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
                      {v.status}
                    </span>
                  </td>

                  {/* Driver Assignment */}
                  <td className="px-6 py-4">
                    {v.current_driver ? (
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{v.current_driver.license_number}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {v.current_driver.phone}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Fuel */}
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          {v.current_fuel}L
                        </span>
                        <span className="text-slate-400">{fuelPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            fuelPct < 20
                              ? "bg-rose-500"
                              : fuelPct < 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${fuelPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>

                  {/* Live Telemetry Fields */}
                  <td className="px-6 py-4">
                    {v.last_lat !== undefined && v.last_lat !== null && v.last_lng !== undefined && v.last_lng !== null ? (
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>
                            {v.last_lat.toFixed(4)}, {v.last_lng.toFixed(4)}
                          </span>
                        </div>
                        {v.last_speed !== undefined && v.last_speed !== null && (
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                            <Gauge className="w-3 h-3" />
                            <span>{v.last_speed.toFixed(1)} km/h</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">No GPS signal</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <div className="flex items-center justify-end space-x-1">
                        {v.current_driver ? (
                          <button
                            onClick={() => onUnassignDriver(v)}
                            title="Unassign Driver"
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onAssignDriver(v)}
                            title="Assign Driver"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(v)}
                          title="Edit Vehicle"
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(v)}
                          title="Delete Vehicle"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
