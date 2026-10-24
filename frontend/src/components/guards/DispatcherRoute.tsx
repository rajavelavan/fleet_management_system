import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface DispatcherRouteProps {
  children?: React.ReactNode;
}

export const DispatcherRoute: React.FC<DispatcherRouteProps> = ({ children }) => {
  const { isAuthenticated, role, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a DRIVER attempts to access any dispatcher/admin route, automatically redirect to /driver
  if (role === "DRIVER") {
    return <Navigate to="/driver" replace />;
  }

  // Only DISPATCHER and ADMIN are authorized
  if (role !== "DISPATCHER" && role !== "ADMIN") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};

export default DispatcherRoute;
