import React, { useState } from "react";
import { X, Save, User, AlertCircle } from "lucide-react";
import { Driver, DriverCreatePayload } from "../types/fleet";

interface DriverFormProps {
  initialData?: Driver | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DriverCreatePayload) => Promise<void>;
  isLoading: boolean;
  candidateUsers?: Array<{ id: string; email: string }>;
}

export const DriverForm: React.FC<DriverFormProps> = ({
  initialData,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  candidateUsers = [],
}) => {
  const [formData, setFormData] = useState<DriverCreatePayload>({
    user_id: initialData?.user_id || (candidateUsers[0]?.id || ""),
    license_number: initialData?.license_number || "",
    license_expiry: initialData?.license_expiry || new Date().toISOString().split("T")[0],
    phone: initialData?.phone || "",
    is_active: initialData?.is_active ?? true,
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.user_id && !initialData) {
      setError("Please select a user account to associate with this driver");
      return;
    }
    if (!formData.license_number.trim()) {
      setError("License number is required");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!formData.license_expiry) {
      setError("License expiry date is required");
      return;
    }

    try {
      await onSubmit({
        ...formData,
        license_number: formData.license_number.trim().toUpperCase(),
        phone: formData.phone.trim(),
      });
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Failed to save driver profile");
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialData ? "Edit Driver Profile" : "Register Driver"}
              </h3>
              <p className="text-xs text-slate-400">
                {initialData
                  ? "Update driver credentials and license info"
                  : "Associate a user account with a certified driver profile"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2 text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {!initialData && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Linked User Account *
              </label>
              {candidateUsers.length > 0 ? (
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a user account...</option>
                  {candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.id.substring(0, 8)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Paste User UUID here"
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              License Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DL-9824-X"
              value={formData.license_number}
              onChange={(e) =>
                setFormData({ ...formData, license_number: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                License Expiration Date *
              </label>
              <input
                type="date"
                required
                value={formData.license_expiry}
                onChange={(e) =>
                  setFormData({ ...formData, license_expiry: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+1-555-0123"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-300 font-medium">
                Active & Certified for Dispatch
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-5 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors"
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
              <span>{initialData ? "Save Changes" : "Create Driver"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
