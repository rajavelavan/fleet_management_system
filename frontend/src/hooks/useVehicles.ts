import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  fleetService,
  VehicleFilterParams,
} from "../services/fleetService";
import {
  VehicleCreatePayload,
  VehicleListResponse,
  VehicleUpdatePayload,
} from "../types/fleet";

export const VEHICLES_QUERY_KEY = ["vehicles"];

export const useVehicles = (
  params?: VehicleFilterParams,
  options?: Omit<UseQueryOptions<VehicleListResponse, Error, VehicleListResponse, unknown[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, params],
    queryFn: () => fleetService.getVehicles(params),
    ...options,
  });
};

export const useVehicle = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, id],
    queryFn: () => fleetService.getVehicle(id),
    enabled: !!id && enabled,
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehicleCreatePayload) =>
      fleetService.createVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: VehicleUpdatePayload;
    }) => fleetService.updateVehicle(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...VEHICLES_QUERY_KEY, variables.id],
      });
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fleetService.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    },
  });
};

export const useAssignDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleId,
      driverId,
    }: {
      vehicleId: string;
      driverId: string;
    }) => fleetService.assignDriver(vehicleId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
};

export const useUnassignDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => fleetService.unassignDriver(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
};
