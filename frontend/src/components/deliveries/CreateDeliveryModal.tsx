import React, { useState } from "react";
import { X, PackagePlus, MapPin, Truck, AlertCircle } from "lucide-react";
import { DeliveryCreatePayload } from "../../types/delivery";
import { Vehicle } from "../../types/fleet";

interface CreateDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: DeliveryCreatePayload) => Promise<any>;
  vehicles: Vehicle[];
}

export const CreateDeliveryModal: React.FC<CreateDeliveryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vehicles,
}) => {
  const [orderNumber, setOrderNumber] = useState(
    () => `ORD-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [pickupAddress, setPickupAddress] = useState(
    "789 Mission St, San Francisco, CA 94103"
  );
  const [pickupLat, setPickupLat] = useState("37.7845");
  const [pickupLng, setPickupLng] = useState("-122.4042");
  const [dropoffAddress, setDropoffAddress] = useState(
    "1400 Maritime St, Oakland, CA 94607"
  );
  const [dropoffLat, setDropoffLat] = useState("37.8044");
  const [dropoffLng, setDropoffLng] = useState("-122.2712");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropoffLat);
    const dLng = parseFloat(dropoffLng);

    if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
      setError("Please enter valid numerical latitude and longitude coordinates.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        order_number: orderNumber.trim(),
        pickup_address: pickupAddress.trim(),
        pickup_latitude: pLat,
        pickup_longitude: pLng,
        dropoff_address: dropoffAddress.trim(),
        dropoff_latitude: dLat,
        dropoff_longitude: dLng,
        vehicle_id: selectedVehicleId ? selectedVehicleId : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create delivery order.");
    } finally {
      setSubmitting(false);
    }
  };

  const setPresetRoute = (preset: "sf_to_oakland" | "downtown_to_sfo" | "mission_to_berkeley") => {
    if (preset === "sf_to_oakland") {
      setPickupAddress("789 Mission St, San Francisco, CA 94103");
      setPickupLat("37.7845");
      setPickupLng("-122.4042");
      setDropoffAddress("1400 Maritime St, Oakland, CA 94607");
      setDropoffLat("37.8044");
      setDropoffLng("-122.2712");
    } else if (preset === "downtown_to_sfo") {
      setPickupAddress("1 Market St, San Francisco, CA 94105");
      setPickupLat("37.7937");
      setPickupLng("-122.3956");
      setDropoffAddress("San Francisco International Airport (SFO), CA 94128");
      setDropoffLat("37.6213");
      setDropoffLng("-122.3790");
    } else if (preset === "mission_to_berkeley") {
      setPickupAddress("2450 Mission St, San Francisco, CA 94110");
      setPickupLat("37.7587");
      setPickupLng("-122.4191");
      setDropoffAddress("2120 Oxford St, Berkeley, CA 94720");
      setDropoffLat("37.8702");
      setDropoffLng("-122.2662");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Delivery Order</h3>
              <p className="text-xs text-slate-400">
                Setup route waypoints & optimal path computation
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Route Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Coordinate Presets
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPresetRoute("sf_to_oakland")}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/80 transition"
              >
                SF ➔ Oakland Port
              </button>
              <button
                type="button"
                onClick={() => setPresetRoute("downtown_to_sfo")}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/80 transition"
              >
                Market St ➔ SFO Airport
              </button>
              <button
                type="button"
                onClick={() => setPresetRoute("mission_to_berkeley")}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/80 transition"
              >
                Mission ➔ Berkeley Hub
              </button>
            </div>
          </div>

          {/* Order Number */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Order Reference Number *
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. ORD-982341"
            />
          </div>

          {/* Pickup Address & Coords */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>Pickup Origin Point</span>
            </div>
            <div>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Pickup address name / street"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Latitude</label>
                <input
                  type="text"
                  required
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Longitude</label>
                <input
                  type="text"
                  required
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Dropoff Address & Coords */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>Dropoff Destination Point</span>
            </div>
            <div>
              <input
                type="text"
                required
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="Dropoff address name / destination"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Latitude</label>
                <input
                  type="text"
                  required
                  value={dropoffLat}
                  onChange={(e) => setDropoffLat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Longitude</label>
                <input
                  type="text"
                  required
                  value={dropoffLng}
                  onChange={(e) => setDropoffLng(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Initial Vehicle Assignment (Optional) */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Assign to Vehicle (Optional)
            </label>
            <div className="relative">
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="">-- Unassigned (Pending Dispatch) --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} ({v.make} {v.model}) - {v.status}
                    {v.current_driver ? ` [Driver: ${v.current_driver.license_number}]` : ""}
                  </option>
                ))}
              </select>
              <Truck className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Form Actions */}
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>{submitting ? "Calculating Route..." : "Create & Calculate Route"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
