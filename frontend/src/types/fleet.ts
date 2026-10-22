import { LocationPoint } from "./tracking";

export type VehicleType = "TRUCK" | "VAN" | "MOTORCYCLE" | "CAR";
export type VehicleStatus = "ACTIVE" | "IDLE" | "OFFLINE" | "MAINTENANCE";

export interface AssignedDriverInfo {
  id: string;
  user_id: string;
  email?: string | null;
  license_number: string;
  phone: string;
  assigned_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  status: VehicleStatus;
  fuel_capacity: number;
  current_fuel: number;
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed?: number | null;
  last_seen_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  current_driver?: AssignedDriverInfo | null;
}

export interface VehicleCreatePayload {
  plate_number: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  status: VehicleStatus;
  fuel_capacity: number;
  current_fuel: number;
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed?: number | null;
  last_seen_at?: string | null;
}

export interface VehicleUpdatePayload {
  plate_number?: string;
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  status?: VehicleStatus;
  fuel_capacity?: number;
  current_fuel?: number;
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed?: number | null;
  last_seen_at?: string | null;
}

export interface VehicleListResponse {
  items: Vehicle[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AssignedVehicleInfo {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  type: string;
  status: string;
  assigned_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
  } | null;
  current_vehicle?: AssignedVehicleInfo | null;
}

export interface DriverCreatePayload {
  user_id: string;
  license_number: string;
  license_expiry: string;
  phone: string;
  is_active?: boolean;
}

export interface DriverUpdatePayload {
  user_id?: string;
  license_number?: string;
  license_expiry?: string;
  phone?: string;
  is_active?: boolean;
}

export interface DriverListResponse {
  items: Driver[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DriverAssignmentResponse {
  id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_at: string;
  unassigned_at?: string | null;
  is_active: boolean;
}

export interface RouteHistoryResponse {
  vehicle_id: string;
  from_time: string;
  to_time: string;
  total_points: number;
  coordinates: LocationPoint[];
}
