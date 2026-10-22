import { apiClient } from "../api/client";
import {
  Delivery,
  DeliveryAssignPayload,
  DeliveryCreatePayload,
  DeliveryListResponse,
  DeliveryStatus,
  DeliveryUpdatePayload,
  DriverStatusUpdatePayload,
} from "../types/delivery";

export interface DeliveryFilterParams {
  page?: number;
  size?: number;
  status?: DeliveryStatus;
  vehicle_id?: string;
  driver_id?: string;
  search?: string;
}

export const deliveryService = {
  async getDeliveries(params?: DeliveryFilterParams): Promise<DeliveryListResponse> {
    const response = await apiClient.get<DeliveryListResponse>("/api/v1/deliveries", {
      params,
    });
    return response.data;
  },

  async getDelivery(id: string): Promise<Delivery> {
    const response = await apiClient.get<Delivery>(`/api/v1/deliveries/${id}`);
    return response.data;
  },

  async createDelivery(payload: DeliveryCreatePayload): Promise<Delivery> {
    const response = await apiClient.post<Delivery>("/api/v1/deliveries", payload);
    return response.data;
  },

  async updateDelivery(id: string, payload: DeliveryUpdatePayload): Promise<Delivery> {
    const response = await apiClient.put<Delivery>(`/api/v1/deliveries/${id}`, payload);
    return response.data;
  },

  async deleteDelivery(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/deliveries/${id}`);
  },

  async assignDelivery(id: string, payload: DeliveryAssignPayload): Promise<Delivery> {
    const response = await apiClient.post<Delivery>(`/api/v1/deliveries/${id}/assign`, payload);
    return response.data;
  },

  async calculateRoute(id: string): Promise<Delivery> {
    const response = await apiClient.post<Delivery>(`/api/v1/deliveries/${id}/calculate-route`);
    return response.data;
  },

  async updateDriverStatus(id: string, payload: DriverStatusUpdatePayload): Promise<Delivery> {
    const response = await apiClient.post<Delivery>(`/api/v1/deliveries/${id}/status`, payload);
    return response.data;
  },
};
