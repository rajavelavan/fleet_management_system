import React, { useState, useEffect } from "react";
import { X, User, Save, AlertCircle } from "lucide-react";
import { Driver, DriverCreatePayload } from "../types/fleet";

interface DriverFormProps {
  initialData?: Driver | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: DriverCreatePayload) => Promise<void>;
  isLoading: boolean;
}

export const DriverForm: React.FC<DriverFormProps> = ({
  initialData,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<DriverCreatePayload>({
    user_id: "",
    license_number: "",
    phone: "",
    license_expiry: "",
    is_active: true,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        user_id: initialData.user_id,
        license_number: initialData.license_number,
        phone: initialData.phone,
        license_expiry: initialData.license_expiry
          ? initialData.license_expiry.split("T")[0]
          : "",
        is_active: initialData.is_active,
      });
    } else {
      setFormData({
        user_id: "",
        license_number: "",
        phone: "",
        license_expiry: "",
        is_active: true,
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id.trim()) {
      setError("User ID is required to link an existing user account");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/10 dark:bg-black/20 !m-0 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialData ? "Edit Driver Profile" : "Register Driver"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {initialData
                  ? "Update driver credentials and license info"
                  : "Associate a user account with a certified driver profile"}
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Associated User UUID *
            </label>
            <input
              type="text"
              required
              disabled={!!initialData}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={formData.user_id}
              onChange={(e) =>
                setFormData({ ...formData, user_id: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50"
            />
            {!initialData && (
              <p className="text-[11px] text-slate-400 mt-1">
                Must be an existing User with DRIVER role created in Auth database.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Commercial Driver License (CDL) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DL-CA-998822"
              value={formData.license_number}
              onChange={(e) =>
                setFormData({ ...formData, license_number: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number (Dispatch Contact) *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +1-555-0199"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              License Expiration Date *
            </label>
            <input
              type="date"
              required
              value={formData.license_expiry}
              onChange={(e) =>
                setFormData({ ...formData, license_expiry: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2.5 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <label
              htmlFor="is_active"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              Driver is active and available for dispatch assignments
            </label>
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
              <span>{initialData ? "Save Changes" : "Register Driver"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
