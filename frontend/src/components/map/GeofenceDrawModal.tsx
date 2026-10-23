import React, { useState } from "react";
import { Shield, X, Check, Trash2, MapPin } from "lucide-react";
import { Coordinate } from "../../types/geofence";

interface GeofenceDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: Coordinate[];
  onSave: (name: string, description: string, speedLimit?: number) => Promise<void>;
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
  const [speedLimit, setSpeedLimit] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please specify a geofence name");
      return;
    }
    if (coordinates.length < 3) {
      setError("At least 3 polygon boundary coordinates are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(
        name.trim(),
        description.trim(),
        speedLimit ? Number(speedLimit) : undefined
      );
      setName("");
      setDescription("");
      setSpeedLimit("");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to persist geofence zone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/10 dark:bg-black/20 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Save Geofence Zone</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define zone boundary & speed restrictions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Geofence Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SF Downtown Hub, Depot North"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Safety policies or operational guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Speed Limit (km/h, Optional)
            </label>
            <input
              type="number"
              min="0"
              max="200"
              placeholder="e.g. 45"
              value={speedLimit}
              onChange={(e) => setSpeedLimit(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Polygon Vertex Points Summary */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              {coordinates.length} Boundary Vertices
            </span>
            <button
              type="button"
              onClick={onClearDrawing}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" />
              Clear Points
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || coordinates.length < 3}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Saving Zone..." : "Save Geofence"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
