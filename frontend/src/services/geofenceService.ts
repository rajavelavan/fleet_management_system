import api from "../api/client";
import {
  Alert,
  AlertStats,
  Geofence,
  GeofenceCreatePayload,
} from "../types/geofence";

export const geofenceService = {
  // Geofence API
  async getGeofences(isActive?: boolean): Promise<Geofence[]> {
    const params = isActive !== undefined ? { is_active: isActive } : {};
    const res = await api.get<Geofence[]>("/api/v1/geofences", { params });
    return res.data;
  },

  async getGeofence(id: string): Promise<Geofence> {
    const res = await api.get<Geofence>(`/api/v1/geofences/${id}`);
    return res.data;
  },

  async createGeofence(payload: GeofenceCreatePayload): Promise<Geofence> {
    const res = await api.post<Geofence>("/api/v1/geofences", payload);
    return res.data;
  },

  async updateGeofence(
    id: string,
    payload: Partial<GeofenceCreatePayload>
  ): Promise<Geofence> {
    const res = await api.patch<Geofence>(`/api/v1/geofences/${id}`, payload);
    return res.data;
  },

  async deleteGeofence(id: string): Promise<void> {
    await api.delete(`/api/v1/geofences/${id}`);
  },

  // Alerts API
  async getAlerts(params?: {
    vehicle_id?: string;
    alert_type?: string;
    severity?: string;
    is_read?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Alert[]> {
    const res = await api.get<Alert[]>("/api/v1/alerts", { params });
    return res.data;
  },

  async getAlertStats(): Promise<AlertStats> {
    const res = await api.get<AlertStats>("/api/v1/alerts/stats");
    return res.data;
  },

  async markAlertAsRead(alertId: string): Promise<Alert> {
    const res = await api.patch<Alert>(`/api/v1/alerts/${alertId}/read`);
    return res.data;
  },

  async markAllAlertsAsRead(): Promise<void> {
    await api.post("/api/v1/alerts/mark-all-read");
  },
};
