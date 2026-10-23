import React, { useState } from "react";
import {
  X,
  PackagePlus,
  MapPin,
  Truck,
  Sparkles,
  AlertCircle,
} from "lucide-react";
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
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
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
      setError("Please provide valid numeric coordinates for pickup and dropoff points.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        order_number: `ORD-${Date.now().toString().slice(-6)}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/10 dark:bg-black/20 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Delivery Order</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup route waypoints & optimal path computation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Fill Sample SF Bay Routes
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPresetRoute("sf_to_oakland")}
                className="px-2.5 py-1 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition"
              >
                SF Hub &rarr; Port Oakland
              </button>
              <button
                type="button"
                onClick={() => setPresetRoute("downtown_to_sfo")}
                className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-600/10 hover:bg-emerald-100 dark:hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 transition"
              >
                Financial District &rarr; SFO
              </button>
              <button
                type="button"
                onClick={() => setPresetRoute("mission_to_berkeley")}
                className="px-2.5 py-1 text-xs rounded-lg bg-purple-50 dark:bg-purple-600/10 hover:bg-purple-100 dark:hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 transition"
              >
                Mission &rarr; UC Berkeley
              </button>
            </div>
          </div>

          {/* Section: Origin Pickup */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Origin / Pickup Location</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Pickup Address *
              </label>
              <input
                type="text"
                required
                placeholder="Street address or depot name"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Latitude *
                </label>
                <input
                  type="text"
                  required
                  placeholder="37.7845"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Longitude *
                </label>
                <input
                  type="text"
                  required
                  placeholder="-122.4042"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Dropoff Destination */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Destination / Delivery Point</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Dropoff Address *
              </label>
              <input
                type="text"
                required
                placeholder="Recipient street address"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Latitude *
                </label>
                <input
                  type="text"
                  required
                  placeholder="37.8044"
                  value={dropoffLat}
                  onChange={(e) => setDropoffLat(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Longitude *
                </label>
                <input
                  type="text"
                  required
                  placeholder="-122.2712"
                  value={dropoffLng}
                  onChange={(e) => setDropoffLng(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Optional Immediate Vehicle Assignment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Pre-Assign Fleet Vehicle (Optional)</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Leave Unassigned (Dispatch Later) --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} ({v.type} &bull; {v.status})
                  {v.current_driver ? ` [Driver: ${v.current_driver.license_number}]` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer */}
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
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
            >
              {submitting ? "Computing Route..." : "Create & Dispatch Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
