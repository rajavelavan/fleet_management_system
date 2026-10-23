import React, { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  LogOut,
  ChevronRight,
  Shield,
  Activity,
} from "lucide-react";
import { User, UserRole } from "../types/auth";

interface UserProfileMenuProps {
  user: User;
  role: UserRole | null;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  role,
  onLogout,
  onOpenProfile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentRole = role || user.role;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case "ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "DISPATCHER":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "DRIVER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Compact Person Icon Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl bg-slate-900 border text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          isOpen ? "border-indigo-500/60 text-white shadow-lg shadow-indigo-500/10" : "border-slate-800"
        }`}
        aria-label="User Profile"
        title={user.email}
      >
        <UserIcon className="w-5 h-5" />
        <span
          className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900"
          title="Active Session"
        />
      </button>

      {/* Hover Tooltip / Popover with Minimal Info & CTA */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          role="tooltip"
        >
          {/* Header minimal info */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate max-w-[140px]" title={user.email}>
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                      currentRole
                    )}`}
                  >
                    {currentRole}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Account ID / Status summary */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-400" />
                Access
              </span>
              <span className="text-slate-300 font-medium capitalize">
                {currentRole.toLowerCase()} Tier
              </span>
            </div>
          </div>

          {/* Body CTA & Actions */}
          <div className="p-2 space-y-1 bg-slate-950">
            {/* CTA to Visit Full Profile Details */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 hover:text-white transition group text-xs font-medium text-left"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Visit Full Profile Details</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Sign Out CTA */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
