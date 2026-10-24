import apiClient from "../api/client";
import { useTrackingStore } from "../store/trackingStore";
import {
  AlertsBreakdownResponse,
  BackendHealthResponse,
  DeliveriesTrendResponse,
  HealthCheckResponse,
  KPISummaryResponse,
  TripSummaryResponse,
} from "../types/analytics";

export const analyticsService = {
  async getSystemHealth(): Promise<HealthCheckResponse> {
    try {
      const res = await apiClient.get<BackendHealthResponse>("/api/v1/health");
      const raw = res.data;

      const dbHealthy =
        raw?.components?.database?.status?.toLowerCase().includes("healthy") ?? false;
      const redisHealthy =
        raw?.components?.redis?.status?.toLowerCase().includes("healthy") ?? false;

      // Google Routes API key check
      const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const googleRoutesHealthy = Boolean(
        googleApiKey &&
          googleApiKey.trim().length > 0 &&
          !googleApiKey.includes("YOUR_GOOGLE_MAPS_API_KEY")
      );

      // WebSocket operational status
      const isTrackingWsConnected = useTrackingStore.getState().isConnected;
      const wsOperational = isTrackingWsConnected || (dbHealthy && redisHealthy);

      // Excel Report Engine is available when backend is responsive
      const reportsHealthy = dbHealthy;

      const isOverallOk =
        (raw?.status?.toLowerCase() === "ok" || (dbHealthy && redisHealthy)) &&
        dbHealthy &&
        redisHealthy;

      return {
        status: isOverallOk ? "OK" : "DEGRADED",
        timestamp: new Date().toISOString(),
        version: raw?.version || "0.1.0",
        services: {
          database: dbHealthy,
          redis: redisHealthy,
          telemetry_websocket: wsOperational,
          google_routes_api: googleRoutesHealthy,
          report_generation: reportsHealthy,
        },
        details: {
          databaseStatus: raw?.components?.database?.status,
          postgisVersion: raw?.components?.database?.postgis_version,
          redisStatus: raw?.components?.redis?.status,
          environment: raw?.environment,
        },
      };
    } catch (e) {
      console.warn("Health check query failed:", e);
      return {
        status: "DOWN",
        timestamp: new Date().toISOString(),
        version: "v0.1.0",
        services: {
          database: false,
          redis: false,
          telemetry_websocket: false,
          google_routes_api: false,
          report_generation: false,
        },
      };
    }
  },

  async getKPISummary(): Promise<KPISummaryResponse> {
    const res = await apiClient.get<KPISummaryResponse>("/api/v1/analytics/kpi-summary");
    return res.data;
  },

  async getDeliveriesTrend(days: number = 30): Promise<DeliveriesTrendResponse> {
    const res = await apiClient.get<DeliveriesTrendResponse>(
      `/api/v1/analytics/deliveries-trend?days=${days}`
    );
    return res.data;
  },

  async getAlertsBreakdown(): Promise<AlertsBreakdownResponse> {
    const res = await apiClient.get<AlertsBreakdownResponse>("/api/v1/analytics/alerts-breakdown");
    return res.data;
  },

  async getVehicleTripSummary(vehicleId: string): Promise<TripSummaryResponse> {
    const res = await apiClient.get<TripSummaryResponse>(
      `/api/v1/vehicles/${vehicleId}/trip-summary`
    );
    return res.data;
  },

  async downloadDeliveriesReport(): Promise<void> {
    const res = await apiClient.get("/api/v1/reports/deliveries/export?format=xlsx", {
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deliveries_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async downloadTripsReport(): Promise<void> {
    const res = await apiClient.get("/api/v1/reports/trips/export?format=xlsx", {
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trips_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
