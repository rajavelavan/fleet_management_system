import React, { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  Layers,
  Lock,
  LogOut,
  Menu,
  Navigation as NavIcon,
  Package,
  Radio,
  Server,
  ShieldCheck,
  Truck,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { fetchHealthStatus, HealthCheckResponse, API_BASE_URL } from "./api/client";
import { AdminRoute } from "./components/guards/AdminRoute";
import { DriverRoute } from "./components/guards/DriverRoute";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { DriverPage } from "./pages/DriverPage";
import { LoginPage } from "./pages/LoginPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { DriversPage } from "./pages/DriversPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { TrackingDashboardPage } from "./pages/TrackingDashboardPage";
import { NotificationBell } from "./components/notifications/NotificationBell";
import { UserProfileMenu } from "./components/UserProfileMenu";
import { UserProfileModal } from "./components/UserProfileModal";
import authService, { RoleTestResponse } from "./services/authService";
import { useAuthStore } from "./store/authStore";

export const NavigationBar: React.FC = () => {
  const location = useLocation();
  const { user, role, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Auto-close mobile drawer on route transition
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors and proceed
    } finally {
      clearAuth();
      setIsMobileMenuOpen(false);
      navigate("/login");
    }
  };

  // When not signed in, center the Fleet Logistics CTA branding and omit navbar tabs and sign-in button
  if (!isAuthenticated) {
    return (
      <header className="pb-5 border-b border-slate-800">
        <div className="flex items-center justify-center">
          <Link to="/login" className="flex items-center space-x-3 group shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Fleet Logistics
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Real-Time Telemetry & Mobile Dispatch
              </p>
            </div>
          </Link>
        </div>
      </header>
    );
  }

  const navLinks = [
    { path: "/", label: "Overview", icon: Activity },
    { path: "/map", label: "Live Map", icon: Radio },
    { path: "/deliveries", label: "Deliveries", icon: Package },
    { path: "/vehicles", label: "Vehicles", icon: Truck },
    { path: "/drivers", label: "Drivers", icon: Users },
    ...(role === "DRIVER" || role === "ADMIN" || role === "DISPATCHER"
      ? [{ path: "/driver", label: "Driver Console", icon: NavIcon }]
      : []),
    ...(role === "ADMIN"
      ? [{ path: "/admin", label: "Admin Analytics", icon: BarChart3 }]
      : []),
  ];

  return (
    <header className="pb-5 border-b border-slate-800">
      <div className="flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center space-x-3 group shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Fleet Logistics
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Real-Time Telemetry & Mobile Dispatch
            </p>
          </div>
        </Link>

        {/* Desktop Nav Menu Tabs (lg+) */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900 border border-slate-800/80 p-1 rounded-xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Session & Header Actions (lg+) */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <NotificationBell />
          {user && (
            <UserProfileMenu
              user={user}
              role={role}
              onLogout={handleLogout}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          )}
        </div>

        {/* Mobile Header Controls (< lg) */}
        <div className="flex lg:hidden items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-indigo-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay / Menu (< lg) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Session Info inside Drawer */}
          {user && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.email}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Active Session &bull;{" "}
                      <span className="font-bold text-indigo-400">
                        {role || user.role}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-medium hover:bg-rose-500/20 transition shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-600/20 text-xs font-medium transition"
              >
                <span>Visit Full Profile Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Navigation Links with generous touch targets (>= 44px) */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {isAuthenticated && user && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          role={role}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
};

export const Dashboard: React.FC = () => {
  const { role, setAccessToken, setAuth } = useAuthStore();

  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  const [rbacLoading, setRbacLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    target: string;
    status: number;
    data: unknown;
    timestamp: string;
  } | null>(null);

  const checkHealth = async () => {
    try {
      const data = await fetchHealthStatus();
      setHealth(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTestProtectedEndpoint = async (
    endpoint: "me" | "admin-only" | "dispatcher-only"
  ) => {
    setRbacLoading(endpoint);
    setTestResult(null);
    try {
      let result: RoleTestResponse | unknown;
      if (endpoint === "admin-only") {
        result = await authService.testAdminOnly();
      } else if (endpoint === "dispatcher-only") {
        result = await authService.testDispatcherOnly();
      } else {
        result = await authService.getMe();
      }
      setTestResult({
        target: `/api/v1/auth/${endpoint}`,
        status: 200,
        data: result,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      let status = 500;
      let data: unknown = "Unknown error";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number; data?: unknown } }).response
      ) {
        const resp = (err as { response: { status: number; data: unknown } }).response;
        status = resp.status;
        data = resp.data;
      }
      setTestResult({
        target: `/api/v1/auth/${endpoint}`,
        status,
        data,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setRbacLoading(null);
    }
  };

  const handleSwitchPersona = async (email: string, pass: string) => {
    setRbacLoading("switch");
    setTestResult(null);
    try {
      const data = await authService.login({ email, password: pass });
      setAuth(data.user, data.access_token);
      setTestResult({
        target: "Persona Switch (login)",
        status: 200,
        data: {
          message: `Switched user to ${email} (${data.user.role})`,
          user: data.user,
        },
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      setTestResult({
        target: "Persona Switch (login)",
        status: 400,
        data: "Failed to switch persona",
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setRbacLoading(null);
    }
  };

  const handleTestTokenAutoRefresh = async () => {
    setRbacLoading("auto-refresh");
    setTestResult(null);
    try {
      setAccessToken("invalid.expired.mock_jwt_token");
      const userProfile = await authService.getMe();
      setTestResult({
        target: "/api/v1/auth/me (Intercepted 401 -> Auto-Refreshed via HttpOnly Cookie)",
        status: 200,
        data: {
          message: "Axios interceptor successfully refreshed token and fulfilled request transparently!",
          profile: userProfile,
        },
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      let status = 500;
      let data: unknown = "Unknown error";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number; data?: unknown } }).response
      ) {
        const resp = (err as { response: { status: number; data: unknown } }).response;
        status = resp.status;
        data = resp.data;
      }
      setTestResult({
        target: "/api/v1/auth/me",
        status,
        data,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setRbacLoading(null);
    }
  };

  return (
    <div className="space-y-8 flex-1">
      {/* Quick Launch Cards for Sprint 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          to="/vehicles"
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 shadow-xl transition-all group flex items-start space-x-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Vehicles Fleet
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                CRUD & Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage physical delivery vehicles (Trucks, Vans, Cars, Motorcycles), fuel levels, and quick-access live map coordinates.
            </p>
          </div>
        </Link>

        <Link
          to="/drivers"
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 shadow-xl transition-all group flex items-start space-x-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Driver Roster
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Assignment
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Certified driver profiles with license expiration tracking, contact numbers, and one-click vehicle assignments.
            </p>
          </div>
        </Link>
      </div>

      {/* RBAC Verification Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Interactive RBAC & Security Test Bench
              </h2>
              <p className="text-xs text-slate-400">
                Execute live requests to test FastAPI security dependencies, role guards, and 401 auto-refresh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Switch User:</span>
            <button
              onClick={() =>
                handleSwitchPersona("admin@fleet.local", "AdminPassword123!")
              }
              disabled={rbacLoading === "switch"}
              className={`px-2 py-1 rounded text-xs font-medium border transition ${
                role === "ADMIN"
                  ? "bg-purple-600 text-white border-purple-400"
                  : "bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/30"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() =>
                handleSwitchPersona(
                  "dispatcher@fleet.local",
                  "DispatcherPassword123!"
                )
              }
              disabled={rbacLoading === "switch"}
              className={`px-2 py-1 rounded text-xs font-medium border transition ${
                role === "DISPATCHER"
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-slate-800 hover:bg-slate-700 text-blue-300 border-blue-500/30"
              }`}
            >
              Dispatcher
            </button>
            <button
              onClick={() =>
                handleSwitchPersona("driver@fleet.local", "DriverPassword123!")
              }
              disabled={rbacLoading === "switch"}
              className={`px-2 py-1 rounded text-xs font-medium border transition ${
                role === "DRIVER"
                  ? "bg-emerald-600 text-white border-emerald-400"
                  : "bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/30"
              }`}
            >
              Driver
            </button>
          </div>
        </div>

        {/* 4 Interactive Test Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-purple-400">
                  Admin Only
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  Role: ADMIN
                </span>
              </div>
              <h4 className="text-sm font-medium text-white mt-1">Admin Access</h4>
              <p className="text-xs text-slate-400 mt-1">
                Calls <code>/api/v1/auth/admin-only</code>. Returns 200 for Admin, 403 Forbidden for others.
              </p>
            </div>
            <button
              onClick={() => handleTestProtectedEndpoint("admin-only")}
              disabled={Boolean(rbacLoading)}
              className="w-full py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              {rbacLoading === "admin-only" ? "Testing..." : "Test Admin Endpoint"}
            </button>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-blue-400">
                  Dispatcher & Admin
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  Roles: ADM, DISP
                </span>
              </div>
              <h4 className="text-sm font-medium text-white mt-1">Dispatcher Access</h4>
              <p className="text-xs text-slate-400 mt-1">
                Calls <code>/api/v1/auth/dispatcher-only</code>. Returns 403 for Driver.
              </p>
            </div>
            <button
              onClick={() => handleTestProtectedEndpoint("dispatcher-only")}
              disabled={Boolean(rbacLoading)}
              className="w-full py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-200 text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              {rbacLoading === "dispatcher-only" ? "Testing..." : "Test Dispatcher Endpoint"}
            </button>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-amber-400">
                  Axios Interceptor
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Auto-Refresh
                </span>
              </div>
              <h4 className="text-sm font-medium text-white mt-1">401 Token Recovery</h4>
              <p className="text-xs text-slate-400 mt-1">
                Corrupts access token, catches 401, invokes HttpOnly <code>/refresh</code>, and replays request.
              </p>
            </div>
            <button
              onClick={handleTestTokenAutoRefresh}
              disabled={Boolean(rbacLoading)}
              className="w-full py-2 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {rbacLoading === "auto-refresh" ? "Refreshing..." : "Simulate 401 & Auto-Refresh"}
            </button>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-emerald-400">
                  Route Guards
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  UI RBAC
                </span>
              </div>
              <h4 className="text-sm font-medium text-white mt-1">Guarded Pages</h4>
              <p className="text-xs text-slate-400 mt-1">
                Test client-side route guards <code>&lt;AdminRoute&gt;</code> and <code>&lt;DriverRoute&gt;</code>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/admin"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-center text-xs font-medium border border-purple-500/30 transition"
              >
                /admin
              </Link>
              <Link
                to="/driver"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-center text-xs font-medium border border-emerald-500/30 transition"
              >
                /driver
              </Link>
            </div>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-mono space-y-2 transition-all ${
              testResult.status === 200
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                : testResult.status === 403
                ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                : "bg-rose-950/40 border-rose-500/40 text-rose-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2">
                {testResult.status === 200 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                Target: {testResult.target}
              </span>
              <span>
                Status: <strong>{testResult.status}</strong> &bull; {testResult.timestamp}
              </span>
            </div>
            <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-[11px] text-slate-300">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Services Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                health?.status === "healthy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {health?.status?.toUpperCase() || "CONNECTING"}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">FastAPI Backend</h3>
          <p className="text-xs text-slate-400 mt-1">
            Async REST API serving vehicles, drivers, and authentication endpoints.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                health?.components?.database?.status === "healthy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {health?.components?.database?.status?.toUpperCase() || "UNKNOWN"}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">PostgreSQL + PostGIS</h3>
          <p className="text-xs text-slate-400 mt-1">
            Spatial geometry extensions, Alembic migrations, and vehicles / drivers tables.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                health?.components?.redis?.status === "healthy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {health?.components?.redis?.status?.toUpperCase() || "UNKNOWN"}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">Redis Cache & PubSub</h3>
          <p className="text-xs text-slate-400 mt-1">
            High-throughput in-memory caching and real-time fleet telemetry streaming.
          </p>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { setAccessToken, setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    const initSession = async () => {
      try {
        const refreshData = await authService.refresh();
        setAccessToken(refreshData.access_token);
        setUser(refreshData.user);
      } catch {
        // No active refresh cookie session
      } finally {
        setInitialized(true);
      }
    };

    initSession();
  }, [setAccessToken, setUser, setInitialized]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        <NavigationBar />
        <main className="mt-8 flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <TrackingDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute>
                  <DeliveriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <VehiclesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <ProtectedRoute>
                  <DriversPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <DriverRoute>
                  <DriverPage />
                </DriverRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800/80 pt-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="text-center sm:text-left">
            Fleet & Logistics Management System &bull; Real-Time Telemetry & Dispatch
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`${API_BASE_URL}/api/v1/health`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition"
            >
              System Health
            </a>
            <span>&bull;</span>
            <a
              href={`${API_BASE_URL}/api/v1/docs`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition"
            >
              API Docs
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
