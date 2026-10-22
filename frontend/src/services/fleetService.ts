import { apiClient } from "../api/client";
import {
  Driver,
  DriverAssignmentResponse,
  DriverCreatePayload,
  DriverListResponse,
  DriverUpdatePayload,
  RouteHistoryResponse,
  Vehicle,
  VehicleCreatePayload,
  VehicleListResponse,
  VehicleUpdatePayload,
} from "../types/fleet";

export interface VehicleFilterParams {
  page?: number;
  size?: number;
  status?: string;
  type?: string;
  search?: string;
  include_deleted?: boolean;
}

export interface DriverFilterParams {
  page?: number;
  size?: number;
  is_active?: boolean;
  search?: string;
}

export interface RouteHistoryParams {
  from?: string; // ISO 8601
  to?: string; // ISO 8601
  limit?: number;
}

export const fleetService = {
  // Vehicle Endpoints
  async getVehicles(params?: VehicleFilterParams): Promise<VehicleListResponse> {
    const response = await apiClient.get<VehicleListResponse>("/api/v1/vehicles", {
      params,
    });
    return response.data;
  },

  async getVehicle(id: string): Promise<Vehicle> {
    const response = await apiClient.get<Vehicle>(`/api/v1/vehicles/${id}`);
    return response.data;
  },

  async createVehicle(payload: VehicleCreatePayload): Promise<Vehicle> {
    const response = await apiClient.post<Vehicle>("/api/v1/vehicles", payload);
    return response.data;
  },

  async updateVehicle(id: string, payload: VehicleUpdatePayload): Promise<Vehicle> {
    const response = await apiClient.put<Vehicle>(`/api/v1/vehicles/${id}`, payload);
    return response.data;
  },

  async deleteVehicle(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/vehicles/${id}`);
  },

  async assignDriver(vehicleId: string, driverId: string): Promise<DriverAssignmentResponse> {
    const response = await apiClient.post<DriverAssignmentResponse>(
      `/api/v1/vehicles/${vehicleId}/assign-driver`,
      { driver_id: driverId }
    );
    return response.data;
  },

  async unassignDriver(vehicleId: string): Promise<{ message: string; vehicle_id: string; unassigned_at: string }> {
    const response = await apiClient.delete<{ message: string; vehicle_id: string; unassigned_at: string }>(
      `/api/v1/vehicles/${vehicleId}/unassign-driver`
    );
    return response.data;
  },

  async getVehicleRouteHistory(
    vehicleId: string,
    params?: RouteHistoryParams
  ): Promise<RouteHistoryResponse> {
    const response = await apiClient.get<RouteHistoryResponse>(
      `/api/v1/vehicles/${vehicleId}/route-history`,
      { params }
    );
    return response.data;
  },

  // Driver Endpoints
  async getDrivers(params?: DriverFilterParams): Promise<DriverListResponse> {
    const response = await apiClient.get<DriverListResponse>("/api/v1/drivers", {
      params,
    });
    return response.data;
  },

  async getDriver(id: string): Promise<Driver> {
    const response = await apiClient.get<Driver>(`/api/v1/drivers/${id}`);
    return response.data;
  },

  async createDriver(payload: DriverCreatePayload): Promise<Driver> {
    const response = await apiClient.post<Driver>("/api/v1/drivers", payload);
    return response.data;
  },

  async updateDriver(id: string, payload: DriverUpdatePayload): Promise<Driver> {
    const response = await apiClient.put<Driver>(`/api/v1/drivers/${id}`, payload);
    return response.data;
  },

  async deleteDriver(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/drivers/${id}`);
  },
};
