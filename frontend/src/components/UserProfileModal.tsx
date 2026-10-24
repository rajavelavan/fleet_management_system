import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  X,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Key,
  Activity,
  Sliders,
} from "lucide-react";
import { User, UserRole } from "../types/auth";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  role: UserRole | null;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  role,
  onLogout,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const currentRole = role || user.role;

  const handleCopyId = () => {
    if (user.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case "ADMIN":
        return "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30";
      case "DISPATCHER":
        return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/30";
      case "DRIVER":
        return "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30";
      default:
        return "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600";
    }
  };

  const getRoleDescription = (r: UserRole) => {
    switch (r) {
      case "ADMIN":
        return "System Administrator with unrestricted access to live telemetry, vehicle and driver fleets, dispatching, and system analytics.";
      case "DISPATCHER":
        return "Fleet Operations Dispatcher authorized to assign deliveries, monitor telemetry routes, and coordinate driver assignments.";
      case "DRIVER":
        return "Certified Commercial Driver with access to personal delivery assignments, mobile telemetry logging, and status dispatching.";
      default:
        return "Standard Fleet Logistics authenticated user.";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/10 dark:bg-black/20 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration banner */}
        <div className="h-20 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Avatar & Header */}
        <div className="px-6 pb-6 pt-0 relative flex-1 overflow-y-auto max-h-[80vh]">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xl">
                <UserIcon className="w-10 h-10" />
              </div>
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm"
                title="Active Session"
              />
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${getRoleBadgeStyle(
                currentRole
              )}`}
            >
              {currentRole}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              {user.email.split("@")[0]}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user.email}</span>
            </p>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 mt-4 leading-relaxed">
            {getRoleDescription(currentRole)}
          </p>

          {/* Theme & Appearance Configuration */}
          <div className="mt-5 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-indigo-500" />
              Display & Theme Preference
            </h3>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Active Theme Mode</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose light, dark, or automatic system match</p>
              </div>
              <ThemeSwitcher variant="segmented" showLabels />
            </div>
          </div>

          {/* Detailed Info Cards */}
          <div className="mt-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Profile & Account Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Account ID */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    User ID
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-1"
                    title="Copy User ID"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate" title={user.id}>
                  {user.id}
                </div>
              </div>

              {/* Account Status */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Status
                </div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active & Verified
                </div>
              </div>

              {/* Role Access Level */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Permission Tier
                </div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {currentRole === "ADMIN"
                    ? "Full Administrative Control"
                    : currentRole === "DISPATCHER"
                    ? "Dispatch & Fleet Operations"
                    : "Assigned Delivery Tasks"}
                </div>
              </div>

              {/* Joined / Created Date */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Created At
                </div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Standard Account"}
                </div>
              </div>
            </div>

            {/* Quick Workspace Navigation */}
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Dedicated Workspace
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentRole === "ADMIN" && (
                  <Link
                    to="/admin"
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs font-medium transition"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Admin Analytics Console</span>
                    <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                  </Link>
                )}

                {currentRole === "DRIVER" && (
                  <Link
                    to="/driver"
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-medium transition"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Driver Workspace Console</span>
                    <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                  </Link>
                )}

                <Link
                  to="/map"
                  onClick={onClose}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 text-xs font-medium transition"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-Time Live Map</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
