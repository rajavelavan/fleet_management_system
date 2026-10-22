import { useState, useEffect, useCallback } from "react";
import { deliveryService, DeliveryFilterParams } from "../services/deliveryService";
import { Delivery, DeliveryCreatePayload, DeliveryAssignPayload, DriverStatusUpdatePayload } from "../types/delivery";

export const useDeliveries = (initialParams?: DeliveryFilterParams) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page || 1);
  const [size] = useState(initialParams?.size || 20);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async (params?: DeliveryFilterParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryService.getDeliveries({
        page,
        size,
        ...params,
      });
      setDeliveries(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    fetchDeliveries(initialParams);
  }, [fetchDeliveries, initialParams]);

  const createDelivery = async (payload: DeliveryCreatePayload) => {
    const created = await deliveryService.createDelivery(payload);
    await fetchDeliveries();
    return created;
  };

  const assignDelivery = async (id: string, payload: DeliveryAssignPayload) => {
    const updated = await deliveryService.assignDelivery(id, payload);
    await fetchDeliveries();
    return updated;
  };

  const calculateRoute = async (id: string) => {
    const updated = await deliveryService.calculateRoute(id);
    await fetchDeliveries();
    return updated;
  };

  const updateDriverStatus = async (id: string, payload: DriverStatusUpdatePayload) => {
    const updated = await deliveryService.updateDriverStatus(id, payload);
    await fetchDeliveries();
    return updated;
  };

  const deleteDelivery = async (id: string) => {
    await deliveryService.deleteDelivery(id);
    await fetchDeliveries();
  };

  return {
    deliveries,
    total,
    page,
    setPage,
    pages,
    loading,
    error,
    refresh: fetchDeliveries,
    createDelivery,
    assignDelivery,
    calculateRoute,
    updateDriverStatus,
    deleteDelivery,
  };
};
