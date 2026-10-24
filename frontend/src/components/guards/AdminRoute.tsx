import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, role, user, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated && isInitialized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If DISPATCHER navigates to /admin, seamlessly redirect to /map
  if (role === "DISPATCHER") {
    return <Navigate to="/map" replace />;
  }

  // If DRIVER navigates to /admin, seamlessly redirect to /driver
  if (role === "DRIVER") {
    return <Navigate to="/driver" replace />;
  }

  if (role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div>
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
              403 Forbidden
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">Access Denied</h2>
            <p className="text-sm text-slate-400 mt-2">
              This area requires <strong className="text-rose-400">ADMIN</strong> privileges. Your current role is{" "}
              <strong className="text-amber-400">{role || user?.role || "UNKNOWN"}</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Live Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};

export default AdminRoute;
