import React from "react";
import {
  User,
  Phone,
  CreditCard,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Mail,
} from "lucide-react";
import { Driver } from "../types/fleet";

interface DriverCardProps {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onSelectVehicle?: (driver: Driver) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onEdit,
  onDelete,
}) => {
  const isExpiringSoon = () => {
    if (!driver.license_expiry) return false;
    const expiry = new Date(driver.license_expiry);
    const now = new Date();
    const diffDays = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays < 60;
  };

  const isExpired = () => {
    if (!driver.license_expiry) return false;
    return new Date(driver.license_expiry) < new Date();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all group flex flex-col justify-between">
      <div>
        {/* Header with avatar, status, and actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base leading-tight">
                {driver.user?.email ? driver.user.email.split("@")[0] : "Driver"}
              </h4>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-slate-500" />
                {driver.user?.email || "No email linked"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                driver.is_active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
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

            <button
              onClick={() => onEdit(driver)}
              className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Edit Driver Profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(driver)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Delete Driver"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Driver Details List */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              License Number:
            </span>
            <span className="font-mono font-semibold text-slate-200">
              {driver.license_number}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              License Expiry:
            </span>
            <span
              className={`font-mono font-medium ${
                isExpired()
                  ? "text-rose-400 font-bold"
                  : isExpiringSoon()
                  ? "text-amber-400 font-bold"
                  : "text-slate-300"
              }`}
            >
              {driver.license_expiry}
              {isExpired() && " (Expired)"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              Phone:
            </span>
            <span className="font-mono text-slate-300">{driver.phone}</span>
          </div>
        </div>
      </div>

      {/* Assignment Status Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        {driver.current_vehicle ? (
          <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700/60">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white tracking-wide">
                  {driver.current_vehicle.plate_number}
                </div>
                <div className="text-[10px] text-slate-400">
                  {driver.current_vehicle.make} {driver.current_vehicle.model}
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
              Assigned
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-800/30 rounded-xl px-3 py-2 border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-500">
              <Truck className="w-4 h-4" />
              <span className="text-xs">No active vehicle</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
              Available
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
