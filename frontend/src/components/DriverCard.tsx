import React from "react";
import {
  User,
  Phone,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Truck,
  Mail,
} from "lucide-react";
import { Driver } from "../types/fleet";
import { useAuthStore } from "../store/authStore";

interface DriverCardProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onEdit,
  onDelete,
}) => {
  const { role } = useAuthStore();
  const isAdmin = role === "ADMIN";

  const isLicenseExpired = () => {
    if (!driver.license_expiry) return false;
    return new Date(driver.license_expiry) < new Date();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between">
      <div>
        {/* Header with avatar, status, and actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {driver.user?.email ? driver.user.email.split("@")[0] : "Driver"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-slate-400" />
                {driver.user?.email || "No email linked"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                driver.is_active
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
              }`}
            >
              {driver.is_active ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" /> Active
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" /> Inactive
                </>
              )}
            </span>

            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(driver)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit Driver Profile"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(driver)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete Driver"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Driver Details List */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs">
          {/* License */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Commercial License
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {driver.license_number}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Phone Dispatch
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{driver.phone}</span>
          </div>

          {/* Expiry */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              License Expiry
            </span>
            <span
              className={`font-medium ${
                isLicenseExpired()
                  ? "text-rose-600 dark:text-rose-400 font-bold"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {driver.license_expiry
                ? new Date(driver.license_expiry).toLocaleDateString()
                : "N/A"}
              {isLicenseExpired() && " (Expired)"}
            </span>
          </div>
        </div>
      </div>

      {/* Assigned Vehicle Footer Card */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
        {driver.current_vehicle ? (
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                  {driver.current_vehicle.plate_number}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {driver.current_vehicle.make} {driver.current_vehicle.model}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                driver.current_vehicle.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700"
              }`}
            >
              {driver.current_vehicle.status}
            </span>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-400 dark:text-slate-500 text-center italic">
            No vehicle assigned
          </div>
        )}
      </div>
    </div>
  );
};
