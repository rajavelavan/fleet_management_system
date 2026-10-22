import { create } from "zustand";
import { Alert, AlertStats } from "../types/geofence";
import { geofenceService } from "../services/geofenceService";

interface AlertStoreState {
  alerts: Alert[];
  stats: AlertStats;
  isLoading: boolean;
  addAlert: (alert: Alert) => void;
  fetchAlerts: () => void;
  fetchStats: () => void;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  alerts: [],
  stats: {
    total_count: 0,
    unread_count: 0,
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
  },
  isLoading: false,

  addAlert: (alert: Alert) => {
    set((state) => {
      // Deduplicate if already present
      if (state.alerts.some((a) => a.id === alert.id)) {
        return state;
      }
      const newAlerts = [alert, ...state.alerts.slice(0, 49)];
      const isUnread = !alert.is_read;
      return {
        alerts: newAlerts,
        stats: {
          ...state.stats,
          total_count: state.stats.total_count + 1,
          unread_count: state.stats.unread_count + (isUnread ? 1 : 0),
          critical_count:
            state.stats.critical_count +
            (isUnread && alert.severity === "CRITICAL" ? 1 : 0),
          warning_count:
            state.stats.warning_count +
            (isUnread && alert.severity === "WARNING" ? 1 : 0),
          info_count:
            state.stats.info_count +
            (isUnread && alert.severity === "INFO" ? 1 : 0),
        },
      };
    });
  },

  fetchAlerts: async () => {
    try {
      set({ isLoading: true });
      const alerts = await geofenceService.getAlerts({ limit: 50 });
      set({ alerts, isLoading: false });
    } catch (e) {
      console.warn("Failed to fetch alerts:", e);
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await geofenceService.getAlertStats();
      set({ stats });
    } catch (e) {
      console.warn("Failed to fetch alert stats:", e);
    }
  },

  markAsRead: async (alertId: string) => {
    try {
      await geofenceService.markAlertAsRead(alertId);
      set((state) => {
        const updatedAlerts = state.alerts.map((a) =>
          a.id === alertId ? { ...a, is_read: true } : a
        );
        return {
          alerts: updatedAlerts,
          stats: {
            ...state.stats,
            unread_count: Math.max(0, state.stats.unread_count - 1),
          },
        };
      });
    } catch (e) {
      console.warn("Failed to mark alert as read:", e);
    }
  },

  markAllAsRead: async () => {
    try {
      await geofenceService.markAllAlertsAsRead();
      set((state) => ({
        alerts: state.alerts.map((a) => ({ ...a, is_read: true })),
        stats: {
          ...state.stats,
          unread_count: 0,
          critical_count: 0,
          warning_count: 0,
          info_count: 0,
        },
      }));
    } catch (e) {
      console.warn("Failed to mark all alerts as read:", e);
    }
  },
}));
