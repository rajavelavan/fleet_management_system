import React, { useState, useEffect } from "react";
import { X, Car, Save, AlertCircle } from "lucide-react";
import { Vehicle, VehicleCreatePayload, VehicleType, VehicleStatus } from "../types/fleet";

interface VehicleFormProps {
  initialData?: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: VehicleCreatePayload) => Promise<void>;
  isLoading: boolean;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<VehicleCreatePayload>({
    plate_number: "",
    type: "VAN",
    make: "",
    model: "",
    year: 2024,
    fuel_capacity: 70.0,
    current_fuel: 70.0,
    status: "ACTIVE",
    last_lat: 37.7749,
    last_lng: -122.4194,
    last_speed: 0,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        plate_number: initialData.plate_number,
        type: initialData.type,
        make: initialData.make,
        model: initialData.model,
        year: initialData.year,
        fuel_capacity: initialData.fuel_capacity,
        current_fuel: initialData.current_fuel,
        status: initialData.status,
        last_lat: initialData.last_lat,
        last_lng: initialData.last_lng,
        last_speed: initialData.last_speed,
      });
    } else {
      setFormData({
        plate_number: "",
        type: "VAN",
        make: "",
        model: "",
        year: 2024,
        fuel_capacity: 70.0,
        current_fuel: 70.0,
        status: "ACTIVE",
        last_lat: 37.7749,
        last_lng: -122.4194,
        last_speed: 0,
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate_number.trim()) {
      setError("License plate number is required");
      return;
    }
    if (!formData.make.trim()) {
      setError("Make is required");
      return;
    }
    if (!formData.model.trim()) {
      setError("Model is required");
      return;
    }

    try {
      await onSubmit({
        ...formData,
        plate_number: formData.plate_number.trim().toUpperCase(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: Number(formData.year),
        fuel_capacity: Number(formData.fuel_capacity),
        current_fuel: Number(formData.current_fuel),
        last_lat: formData.last_lat ? Number(formData.last_lat) : undefined,
        last_lng: formData.last_lng ? Number(formData.last_lng) : undefined,
        last_speed: formData.last_speed ? Number(formData.last_speed) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Failed to save vehicle");
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/10 dark:bg-black/20 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialData ? "Edit Vehicle" : "Add New Vehicle"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {initialData
                  ? "Update vehicle specs and telemetry settings"
                  : "Register a physical transport asset to the fleet"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                License Plate Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CA-894-TR"
                value={formData.plate_number}
                onChange={(e) =>
                  setFormData({ ...formData, plate_number: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Vehicle Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as VehicleType,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VAN">VAN</option>
                <option value="TRUCK">TRUCK</option>
                <option value="CAR">CAR</option>
                <option value="MOTORCYCLE">MOTORCYCLE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Make *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mercedes-Benz / Ford"
                value={formData.make}
                onChange={(e) =>
                  setFormData({ ...formData, make: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Model *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sprinter 2500"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Year
              </label>
              <input
                type="number"
                min="1980"
                max="2030"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) || 2024 })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fleet Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as VehicleStatus,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="IDLE">IDLE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fuel Capacity (Liters)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.fuel_capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fuel_capacity: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Fuel (Liters)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.current_fuel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_fuel: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Quick-Access Live GPS Telemetry Fields */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              Quick-Access Live Telemetry (Map Seed)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="37.7749"
                  value={formData.last_lat ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      last_lat: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="-122.4194"
                  value={formData.last_lng ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      last_lng: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Speed (km/h)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="55.0"
                  value={formData.last_speed ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      last_speed: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{initialData ? "Save Changes" : "Create Vehicle"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
