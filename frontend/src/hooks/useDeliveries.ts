import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  deliveryService,
  DeliveryFilterParams,
} from "../services/deliveryService";
import {
  DeliveryAssignPayload,
  DeliveryCreatePayload,
  DeliveryListResponse,
  DeliveryUpdatePayload,
  DriverStatusUpdatePayload,
} from "../types/delivery";

export const DELIVERIES_QUERY_KEY = ["deliveries"];

export const useDeliveries = (
  params?: DeliveryFilterParams,
  options?: Omit<
    UseQueryOptions<DeliveryListResponse, Error, DeliveryListResponse, unknown[]>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: [...DELIVERIES_QUERY_KEY, params],
    queryFn: () => deliveryService.getDeliveries(params),
    ...options,
  });
};

export const useDelivery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...DELIVERIES_QUERY_KEY, id],
    queryFn: () => deliveryService.getDelivery(id),
    enabled: !!id && enabled,
  });
};

export const useCreateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeliveryCreatePayload) =>
      deliveryService.createDelivery(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEY });
    },
  });
};

export const useUpdateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: DeliveryUpdatePayload;
    }) => deliveryService.updateDelivery(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DELIVERIES_QUERY_KEY, variables.id],
      });
    },
  });
};

export const useAssignDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: DeliveryAssignPayload;
    }) => deliveryService.assignDelivery(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DELIVERIES_QUERY_KEY, variables.id],
      });
    },
  });
};

export const useCalculateRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deliveryService.calculateRoute(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DELIVERIES_QUERY_KEY, id],
      });
    },
  });
};

export const useUpdateDriverStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: DriverStatusUpdatePayload;
    }) => deliveryService.updateDriverStatus(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DELIVERIES_QUERY_KEY, variables.id],
      });
    },
  });
};

export const useDeleteDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deliveryService.deleteDelivery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERIES_QUERY_KEY });
    },
  });
};
