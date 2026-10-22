export type AlertType =
  | "GEOFENCE_ENTRY"
  | "GEOFENCE_EXIT"
  | "SPEEDING"
  | "IDLING"
  | "OFFLINE";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  speed_limit?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  coordinates: Coordinate[];
  geojson?: {
    type: string;
    coordinates: number[][][];
  } | null;
}

export interface GeofenceCreatePayload {
  name: string;
  description?: string;
  is_active?: boolean;
  speed_limit?: number;
  coordinates: Coordinate[];
}

export interface Alert {
  id: string;
  vehicle_id: string;
  plate_number?: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: {
    geofence_id?: string;
    geofence_name?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
    speed_limit?: number;
    exceeded_by?: number;
    plate_number?: string;
    triggered_at?: string;
    [key: string]: unknown;
  };
  is_read: boolean;
  triggered_at: string;
}

export interface AlertStats {
  total_count: number;
  unread_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
}
