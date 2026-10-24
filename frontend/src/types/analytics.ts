export interface FleetStatusCounts {
  total: number;
  active: number;
  idle: number;
  offline: number;
  maintenance: number;
}

export interface DeliveryStatusCounts {
  total: number;
  pending: number;
  assigned: number;
  picked_up: number;
  in_transit: number;
  delivered: number;
  failed: number;
  cancelled: number;
}

export interface KPISummaryResponse {
  fleet_status: FleetStatusCounts;
  delivery_status: DeliveryStatusCounts;
  active_alerts_count: number;
  active_drivers_count: number;
  fuel_efficiency_avg: number;
  on_time_delivery_rate: number;
  total_trips_completed: number;
}

export interface DeliveryTrendPoint {
  date: string;
  delivered: number;
  failed: number;
  total: number;
}

export type DeliveriesTrendItem = DeliveryTrendPoint;

export interface SystemHealthServices {
  database: boolean;
  redis: boolean;
  telemetry_websocket: boolean;
  google_routes_api: boolean;
  report_generation: boolean;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  services: SystemHealthServices;
}

export interface DeliveriesTrendResponse {
  days: number;
  data: DeliveryTrendPoint[];
}

export interface AlertBreakdownItem {
  type: string;
  count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
}

export interface AlertsBreakdownResponse {
  total_alerts: number;
  breakdown: AlertBreakdownItem[];
}

export interface TripSummaryResponse {
  vehicle_id: string;
  plate_number: string;
  total_distance_km: number;
  total_duration_hours: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  trips_count: number;
  start_time?: string | null;
  end_time?: string | null;
}
