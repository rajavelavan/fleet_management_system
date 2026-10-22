import React, { useState } from "react";
import { Plus, X, Shield, MapPin, Gauge } from "lucide-react";
import { Coordinate, GeofenceCreatePayload } from "../../types/geofence";

interface GeofenceDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: Coordinate[];
  onSave: (payload: GeofenceCreatePayload) => Promise<void>;
  onClearDrawing: () => void;
}

export const GeofenceDrawModal: React.FC<GeofenceDrawModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  onSave,
  onClearDrawing,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [speedLimit, setSpeedLimit] = useState<string>("50");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a geofence zone name");
      return;
    }
    if (coordinates.length < 3) {
      setError("At least 3 polygon boundary points are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        speed_limit: speedLimit ? parseFloat(speedLimit) : undefined,
        is_active: isActive,
        coordinates,
      });
      setName("");
      setDescription("");
      setSpeedLimit("50");
      onClearDrawing();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create geofence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Save Geofence Zone</h3>
              <p className="text-xs text-slate-400">
                Define zone boundary & speed restrictions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Geofence Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SF Downtown Hub, Depot North"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Zone purpose or special routing instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                Speed Limit (km/h)
              </label>
              <input
                type="number"
                min="0"
                max="200"
                step="1"
                placeholder="50"
                value={speedLimit}
                onChange={(e) => setSpeedLimit(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Drawn Vertices
              </label>
              <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-emerald-400">
                {coordinates.length} points
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-xs text-slate-300 font-medium">
              Activate monitoring immediately
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || coordinates.length < 3}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Creating..." : "Save Geofence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
