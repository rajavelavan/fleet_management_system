import React, { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  LogOut,
  Menu,
  Navigation as NavIcon,
  Package,
  Radio,
  Truck,
  Users,
  X,
} from "lucide-react";
import { API_BASE_URL } from "./api/client";
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
import { SystemHealthPopover } from "./components/SystemHealthPopover";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import authService from "./services/authService";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";

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
      <header className="shrink-0 z-30 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="w-9 sm:w-10"></div>
          <Link to="/login" className="flex items-center space-x-3 group shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Fleet Logistics
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Real-Time Telemetry & Mobile Dispatch
              </p>
            </div>
          </Link>
          <div className="shrink-0">
            <ThemeSwitcher />
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
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
    <header className="shrink-0 z-30 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand / Logo */}
          <Link to="/map" className="flex items-center space-x-3 group shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Fleet Logistics
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Real-Time Telemetry & Mobile Dispatch
              </p>
            </div>
          </Link>

          {/* Desktop Nav Menu Tabs (lg+) */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 p-1 rounded-xl">
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
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800/60"
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
            <ThemeSwitcher />
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
            {/* System Health pill in header for small screens (< md) */}
            <div className="md:hidden">
              <SystemHealthPopover placement="down" />
            </div>
            <ThemeSwitcher />
            <NotificationBell />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Overlay / Menu (< lg) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* User Session Info inside Drawer */}
            {user && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {user.email}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Active Session &bull;{" "}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {role || user.role}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-medium hover:bg-rose-500/20 transition shrink-0"
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
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-xs font-medium transition"
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
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
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
      </div>

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

export const App: React.FC = () => {
  const { setAccessToken, setUser, setInitialized } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    const cleanup = initTheme();
    return cleanup;
  }, [initTheme]);

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
    <div className="h-screen h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Fixed Header on all screen sizes */}
      <NavigationBar />

      {/* Scrollable Main Content Area on all screen sizes */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col min-h-full">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/map" replace />}
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
        </div>
      </main>

      {/* Fixed Footer on all screen sizes */}
      <footer className="shrink-0 z-20 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="text-center sm:text-left">
            Fleet & Logistics Management System &bull; Real-Time Telemetry & Dispatch
          </div>
          <div className="flex items-center gap-4">
            {/* System Health in footer for mid and large screens (md+) */}
            <div className="hidden md:block">
              <SystemHealthPopover placement="up" />
            </div>
            <span className="hidden md:inline">&bull;</span>
            <a
              href={`${API_BASE_URL}/api/v1/docs`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-slate-200 transition"
            >
              API Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
