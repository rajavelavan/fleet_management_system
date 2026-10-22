import React, { useState } from "react";
import { X, UserCheck, Truck, AlertCircle } from "lucide-react";
import { Delivery, DeliveryAssignPayload } from "../../types/delivery";
import { Driver, Vehicle } from "../../types/fleet";

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
  const [vehicleId, setVehicleId] = useState(delivery?.vehicle_id || "");
  const [driverId, setDriverId] = useState(delivery?.driver_id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !delivery) return null;

  const handleVehicleChange = (newVehicleId: string) => {
    setVehicleId(newVehicleId);
    // Auto-select linked driver if available
    const veh = vehicles.find((v) => v.id === newVehicleId);
    if (veh?.current_driver?.id) {
      setDriverId(veh.current_driver.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setError("Please select a vehicle for this delivery assignment.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAssign(delivery.id, {
        vehicle_id: vehicleId,
        driver_id: driverId ? driverId : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to assign delivery.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Assign Delivery</h3>
              <p className="text-xs text-slate-400 font-mono">
                Order: {delivery.order_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Destination Brief */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Dropoff</div>
            <div className="text-xs text-white truncate font-medium">
              {delivery.dropoff_address}
            </div>
          </div>

          {/* Select Vehicle */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Select Fleet Vehicle *
            </label>
            <div className="relative">
              <select
                required
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} ({v.make} {v.model}) [{v.status}]
                  </option>
                ))}
              </select>
              <Truck className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Select Driver */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Designate Driver (Optional)
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Auto from Vehicle Assignment or None --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.license_number} ({d.user?.email || d.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{submitting ? "Assigning..." : "Confirm Assignment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
