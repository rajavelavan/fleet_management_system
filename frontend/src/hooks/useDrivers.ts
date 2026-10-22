import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  DriverFilterParams,
  fleetService,
} from "../services/fleetService";
import {
  DriverCreatePayload,
  DriverListResponse,
  DriverUpdatePayload,
} from "../types/fleet";

export const DRIVERS_QUERY_KEY = ["drivers"];

export const useDrivers = (
  params?: DriverFilterParams,
  options?: Omit<UseQueryOptions<DriverListResponse, Error, DriverListResponse, unknown[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [...DRIVERS_QUERY_KEY, params],
    queryFn: () => fleetService.getDrivers(params),
    ...options,
  });
};

export const useDriver = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...DRIVERS_QUERY_KEY, id],
    queryFn: () => fleetService.getDriver(id),
    enabled: !!id && enabled,
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DriverCreatePayload) =>
      fleetService.createDriver(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: DriverUpdatePayload;
    }) => fleetService.updateDriver(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DRIVERS_QUERY_KEY, variables.id],
      });
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fleetService.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
    },
  });
};
