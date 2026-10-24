import React, { useState, useEffect } from "react";
import { X, UserCheck, Truck, AlertCircle } from "lucide-react";
import { Delivery, DeliveryAssignPayload } from "../../types/delivery";
import { Vehicle, Driver } from "../../types/fleet";

interface AssignDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  onAssign: (deliveryId: string, payload: DeliveryAssignPayload) => Promise<any>;
}

export const AssignDeliveryModal: React.FC<AssignDeliveryModalProps> = ({
  isOpen,
  onClose,
  delivery,
  vehicles,
  drivers,
  onAssign,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (delivery) {
      setSelectedVehicleId(delivery.vehicle_id || "");
      setSelectedDriverId(delivery.driver_id || "");
    } else {
      setSelectedVehicleId("");
      setSelectedDriverId("");
    }
    setError(null);
  }, [delivery, isOpen]);

  // When a vehicle is chosen, if it already has an assigned driver, automatically select that driver
  const handleVehicleChange = (vId: string) => {
    setSelectedVehicleId(vId);
    if (vId) {
      const v = vehicles.find((item) => item.id === vId);
      if (v?.current_driver) {
        setSelectedDriverId(v.current_driver.id);
      }
    }
  };

  if (!isOpen || !delivery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setError("Please select a vehicle to assign this delivery.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAssign(delivery.id, {
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to assign delivery.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/10 dark:bg-black/20 !m-0 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Delivery Dispatch</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Order: {delivery.order_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Select Fleet Vehicle</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- No vehicle change / Unassigned --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} ({v.type} &bull; {v.status})
                  {v.current_driver ? ` [Driver: ${v.current_driver.license_number}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Select Driver</span>
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- No driver change / Unassigned --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user?.email || "Driver"} &bull; {d.license_number}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
            >
              {submitting ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
