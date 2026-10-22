export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface PlannedRouteData {
  encoded_polyline: string;
  distance_meters: number;
  duration_seconds: number;
  duration_formatted: string;
  polyline_points?: LatLngPoint[];
  is_fallback?: boolean;
}

export interface DeliveryVehicleSummary {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  status: string;
  last_lat?: number | null;
  last_lng?: number | null;
}

export interface DeliveryDriverSummary {
  id: string;
  user_id: string;
  license_number: string;
  phone: string;
  email?: string | null;
}

export interface Delivery {
  id: string;
  order_number: string;
  status: DeliveryStatus;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  vehicle_id?: string | null;
  driver_id?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  estimated_duration_mins?: number | null;
  planned_route?: PlannedRouteData | null;
  created_at: string;
  updated_at: string;
  vehicle?: DeliveryVehicleSummary | null;
  driver?: DeliveryDriverSummary | null;
}

export interface DeliveryCreatePayload {
  order_number: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  vehicle_id?: string | null;
  driver_id?: string | null;
}

export interface DeliveryUpdatePayload {
  order_number?: string;
  pickup_address?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_address?: string;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  status?: DeliveryStatus;
  vehicle_id?: string | null;
  driver_id?: string | null;
}

export interface DeliveryAssignPayload {
  vehicle_id: string;
  driver_id?: string | null;
}

export interface DriverStatusUpdatePayload {
  status: "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
}

export interface DeliveryListResponse {
  items: Delivery[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
