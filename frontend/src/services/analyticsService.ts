import apiClient from "../api/client";
import {
  AlertsBreakdownResponse,
  DeliveriesTrendResponse,
  HealthCheckResponse,
  KPISummaryResponse,
  TripSummaryResponse,
} from "../types/analytics";

export const analyticsService = {
  async getSystemHealth(): Promise<HealthCheckResponse> {
    const res = await apiClient.get<HealthCheckResponse>("/api/v1/health");
    return res.data;
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
