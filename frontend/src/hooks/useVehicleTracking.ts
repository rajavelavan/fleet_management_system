import { useEffect, useRef, useCallback } from "react";
import { useTrackingStore } from "../store/trackingStore";
import { useAlertStore } from "../store/alertStore";
import { useAuthStore } from "../store/authStore";
import { useToast } from "../components/ui/Toast";
import { fleetService } from "../services/fleetService";
import {
  LiveVehicleState,
  WsAlertMessage,
  WsLocationUpdateMessage,
  WsServerMessage,
} from "../types/tracking";

// Derive WebSocket URL from API Base URL or current window origin
const getWebSocketUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  let host = window.location.host;

  if (envApiUrl) {
    try {
      const url = new URL(envApiUrl);
      wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      host = url.host;
    } catch {
      // Fallback
    }
  }

  return `${wsProtocol}//${host}/api/v1/tracking/ws/tracking`;
};

interface UseVehicleTrackingOptions {
  autoSubscribeAll?: boolean;
  vehicleId?: string; // Optional single vehicle subscription (e.g. for Driver portal)
}

export const useVehicleTracking = (
  options: UseVehicleTrackingOptions = { autoSubscribeAll: true }
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { user } = useAuthStore();
  const { addAlert, fetchAlerts, fetchStats } = useAlertStore();

  const {
    vehicles,
    selectedVehicleId,
    routeTrails,
    isLoadingTrail,
    isConnected,
    connectionError,
    setConnected,
    setConnectionError,
    setSelectedVehicleId,
    setInitialVehicles,
    updateVehiclePosition,
    setRouteTrail,
    setIsLoadingTrail,
  } = useTrackingStore();

  // 1. Fetch initial vehicles snapshot via REST
  const fetchInitialData = useCallback(async () => {
    try {
      const response = await fleetService.getVehicles({ size: 100 });
      const liveVehicles: LiveVehicleState[] = response.items.map((v) => ({
        id: v.id,
        plate_number: v.plate_number,
        make: v.make,
        model: v.model,
        year: v.year,
        type: v.type,
        status: v.status,
        fuel_capacity: v.fuel_capacity,
        current_fuel: v.current_fuel,
        latitude: v.last_lat ?? 37.7749,
        longitude: v.last_lng ?? -122.4194,
        speed: v.last_speed ?? 0,
        heading: 0,
        last_seen_at: v.last_seen_at ?? new Date().toISOString(),
        driver_name: v.current_driver
          ? `Driver (${v.current_driver.license_number})`
          : null,
        driver_phone: v.current_driver?.phone || null,
      }));

      setInitialVehicles(liveVehicles);
    } catch (err: unknown) {
      console.warn("Could not fetch initial vehicles from REST endpoint:", err);
    }
  }, [setInitialVehicles]);

  // 2. Fetch 30-minute historical route trail for selected vehicle
  const fetchRouteHistory = useCallback(
    async (vId: string) => {
      setIsLoadingTrail(true);
      try {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const history = await fleetService.getVehicleRouteHistory(vId, {
          from: thirtyMinsAgo,
          limit: 300,
        });
        setRouteTrail(vId, history.coordinates || []);
      } catch (err) {
        console.warn(`Could not load route history for ${vId}:`, err);
      } finally {
        setIsLoadingTrail(false);
      }
    },
    [setIsLoadingTrail, setRouteTrail]
  );

  // Trigger route trail fetch whenever selectedVehicleId changes
  useEffect(() => {
    if (selectedVehicleId) {
      fetchRouteHistory(selectedVehicleId);
    }
  }, [selectedVehicleId, fetchRouteHistory]);

  // Initial load of alerts and alert stats
  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  // 3. Connect to WebSocket WS /api/v1/tracking/ws/tracking
  useEffect(() => {
    fetchInitialData();

    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;

      const wsUrl = getWebSocketUrl();
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setConnected(true);
          setConnectionError(null);

          // Subscribe to vehicles
          if (options.vehicleId) {
            ws.send(
              JSON.stringify({
                action: "subscribe",
                vehicle_id: options.vehicleId,
              })
            );
          } else if (options.autoSubscribeAll !== false) {
            // Subscribe to all vehicles using wildcard '*'
            ws.send(
              JSON.stringify({
                action: "subscribe",
                vehicle_id: "*",
              })
            );
          }

          // Subscribe to alerts channel
          if (user?.id) {
            ws.send(
              JSON.stringify({
                action: "subscribe_alerts",
                user_id: user.id,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                action: "subscribe_alerts",
              })
            );
          }

          // Start heartbeat ping every 25 seconds
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data: WsServerMessage = JSON.parse(event.data);

            if (data.type === "location_update") {
              const locUpdate = data as WsLocationUpdateMessage;
              updateVehiclePosition(locUpdate.vehicle_id, {
                latitude: locUpdate.latitude,
                longitude: locUpdate.longitude,
                speed: locUpdate.speed,
                heading: locUpdate.heading,
                altitude: locUpdate.altitude,
                accuracy: locUpdate.accuracy,
                recorded_at: locUpdate.recorded_at,
                plate_number: locUpdate.plate_number,
                status: locUpdate.status,
              });
            } else if (data.type === "alert") {
              const alertMsg = data as WsAlertMessage;
              const alert = alertMsg.alert;
              if (alert) {
                // Add alert to Zustand store
                addAlert(alert);

                // Trigger toast notification
                const toastType =
                  alert.severity === "CRITICAL"
                    ? "critical"
                    : alert.severity === "WARNING"
                    ? "warning"
                    : "info";

                const titleMap: Record<string, string> = {
                  GEOFENCE_ENTRY: "Geofence Entry Detected",
                  GEOFENCE_EXIT: "Geofence Exit Detected",
                  SPEEDING: "Speeding Alert",
                  IDLING: "Idling Detected",
                  OFFLINE: "Vehicle Offline",
                };

                toast({
                  title: titleMap[alert.alert_type] || "Fleet Alert",
                  message: alert.message,
                  type: toastType,
                  duration: alert.severity === "CRITICAL" ? 8000 : 5000,
                });
              }
            }
          } catch (e) {
            console.warn("Failed to parse WebSocket message:", e);
          }
        };

        ws.onerror = () => {
          if (isUnmounted) return;
          setConnectionError("WebSocket connection encountered an error");
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setConnected(false);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          // Attempt automatic reconnection after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWs();
          }, 3000);
        };
      } catch (err: unknown) {
        setConnectionError(
          err instanceof Error ? err.message : "Failed to open WebSocket"
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWs();
        }, 5000);
      }
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [
    fetchInitialData,
    options.autoSubscribeAll,
    options.vehicleId,
    setConnected,
    setConnectionError,
    updateVehiclePosition,
    addAlert,
    toast,
    user?.id,
  ]);

  return {
    vehicles,
    selectedVehicleId,
    routeTrails,
    isLoadingTrail,
    isConnected,
    connectionError,
    setSelectedVehicleId,
    refreshTrail: fetchRouteHistory,
  };
};
