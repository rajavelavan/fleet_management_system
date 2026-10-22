import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Users,
  CheckCircle2,
  Lock,
  RefreshCw,
  Server,
  BarChart3,
} from "lucide-react";
import authService, { RoleTestResponse } from "../services/authService";
import { analyticsService } from "../services/analyticsService";
import { useAuthStore } from "../store/authStore";
import {
  AlertsBreakdownResponse,
  DeliveriesTrendResponse,
  KPISummaryResponse,
} from "../types/analytics";
import { KPICards } from "../components/analytics/KPICards";
import { DeliveryTrendChart } from "../components/analytics/DeliveryTrendChart";
import { AlertBreakdownChart } from "../components/analytics/AlertBreakdownChart";
import { ReportExportsCard } from "../components/analytics/ReportExportsCard";

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const [adminData, setAdminData] = useState<RoleTestResponse | null>(null);
  const [loadingRBAC, setLoadingRBAC] = useState(false);
  const [rbacError, setRbacError] = useState<string | null>(null);

  // Analytics state
  const [kpi, setKpi] = useState<KPISummaryResponse | null>(null);
  const [trend, setTrend] = useState<DeliveriesTrendResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsBreakdownResponse | null>(null);
  const [trendDays, setTrendDays] = useState<number>(30);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchAdminEndpoint = async () => {
    setLoadingRBAC(true);
    setRbacError(null);
    try {
      const res = await authService.testAdminOnly();
      setAdminData(res);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to query admin endpoint";
      setRbacError(msg);
    } finally {
      setLoadingRBAC(false);
    }
  };

  const loadAnalytics = async (days: number = trendDays) => {
    setLoadingAnalytics(true);
    try {
      const [kpiRes, trendRes, alertsRes] = await Promise.all([
        analyticsService.getKPISummary(),
        analyticsService.getDeliveriesTrend(days),
        analyticsService.getAlertsBreakdown(),
      ]);
      setKpi(kpiRes);
      setTrend(trendRes);
      setAlerts(alertsRes);
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAdminEndpoint();
    loadAnalytics(trendDays);
  }, []);

  const handleTrendDaysChange = (newDays: number) => {
    setTrendDays(newDays);
    analyticsService
      .getDeliveriesTrend(newDays)
      .then((res) => setTrend(res))
      .catch((err) => console.error("Failed to update trend days", err));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                Executive Admin & Analytics
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                ADMIN ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational metrics, interactive Recharts visualizations, and Excel reports &bull; Logged in as:{" "}
              <strong className="text-purple-400">{user?.email}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadAnalytics(trendDays)}
            disabled={loadingAnalytics}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingAnalytics ? "animate-spin text-indigo-400" : ""
              }`}
            />
            Refresh Analytics
          </button>
        </div>
      </div>

      {/* Live KPI Summary Cards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Live Fleet Key Performance Indicators
          </h2>
        </div>
        <KPICards kpi={kpi} loading={loadingAnalytics} />
      </section>

      {/* Visualizations Grid: Recharts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeliveryTrendChart
          data={trend?.data || []}
          loading={loadingAnalytics}
          days={trendDays}
          onDaysChange={handleTrendDaysChange}
        />
        <AlertBreakdownChart
          data={alerts?.breakdown || []}
          loading={loadingAnalytics}
        />
      </section>

      {/* Excel Report Generation */}
      <section>
        <ReportExportsCard />
      </section>

      {/* RBAC Verification Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Backend RBAC Security Status
              </h2>
              <p className="text-xs text-slate-400">
                Verified via `/api/v1/auth/admin-only` (Dependency: `require_admin`)
              </p>
            </div>
          </div>

          <button
            onClick={fetchAdminEndpoint}
            disabled={loadingRBAC}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${loadingRBAC ? "animate-spin text-purple-400" : ""}`}
            />
            Re-verify RBAC
          </button>
        </div>

        {loadingRBAC ? (
          <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>Validating administrator claims with backend...</span>
          </div>
        ) : rbacError ? (
          <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-200 text-xs">
            <p className="font-semibold">Authorization Rejection:</p>
            <p className="mt-1 text-rose-300">{rbacError}</p>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{adminData?.message || "Administrator Privileges Confirmed"}</span>
            </div>
            <div className="text-xs text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 font-mono">
              <div>
                User ID: <span className="text-slate-200">{adminData?.user_id}</span>
              </div>
              <div>
                Account: <span className="text-slate-200">{adminData?.email}</span>
              </div>
              <div>
                Role Claim:{" "}
                <span className="text-purple-400 font-bold">{adminData?.role}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
              ACTIVE
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white">User Management</h3>
          <p className="text-xs text-slate-400">
            View, provision, and assign RBAC roles (ADMIN, DISPATCHER, DRIVER) to fleet personnel.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              SECURE
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white">Security Policies</h3>
          <p className="text-xs text-slate-400">
            Configure token expiry lifetimes, revoke refresh tokens, and inspect audit logs.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <Server className="w-5 h-5 text-purple-400" />
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              CELERY CRON
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white">Celery Beat Scheduler</h3>
          <p className="text-xs text-slate-400">
            Hourly offline vehicle watchdog (15m threshold) and midnight daily summary digests.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
