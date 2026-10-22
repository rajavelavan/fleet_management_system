import { create } from "zustand";
import { LiveVehicleState, LocationPoint } from "../types/tracking";
import { VehicleStatus } from "../types/fleet";

interface TrackingState {
  // Map of vehicleId -> LiveVehicleState
  vehicles: Map<string, LiveVehicleState>;
  // Currently selected vehicle for route trail and inspection panel
  selectedVehicleId: string | null;
  // History trail points for selected vehicle (e.g. 30-min window)
  routeTrails: Map<string, LocationPoint[]>;
  // Route trail loading status
  isLoadingTrail: boolean;
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setSelectedVehicleId: (vehicleId: string | null) => void;
  setInitialVehicles: (vehicles: LiveVehicleState[]) => void;
  updateVehiclePosition: (
    vehicleId: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number | null;
      heading?: number | null;
      altitude?: number | null;
      accuracy?: number | null;
      recorded_at: string;
      plate_number?: string;
      status?: VehicleStatus;
    }
  ) => void;
  setRouteTrail: (vehicleId: string, points: LocationPoint[]) => void;
  appendRoutePoint: (vehicleId: string, point: LocationPoint) => void;
  setIsLoadingTrail: (loading: boolean) => void;
  clearStore: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  vehicles: new Map<string, LiveVehicleState>(),
  selectedVehicleId: null,
  routeTrails: new Map<string, LocationPoint[]>(),
  isLoadingTrail: false,
  isConnected: false,
  connectionError: null,

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  setConnectionError: (error: string | null) => set({ connectionError: error }),

  setSelectedVehicleId: (vehicleId: string | null) =>
    set({ selectedVehicleId: vehicleId }),

  setInitialVehicles: (vehicleList: LiveVehicleState[]) =>
    set((state) => {
      const nextMap = new Map(state.vehicles);
      for (const v of vehicleList) {
        const existing = nextMap.get(v.id);
        nextMap.set(v.id, {
          ...v,
          ...(existing || {}),
          // Keep freshest position
          latitude: v.latitude ?? existing?.latitude ?? 0,
          longitude: v.longitude ?? existing?.longitude ?? 0,
          speed: v.speed ?? existing?.speed ?? 0,
          heading: v.heading ?? existing?.heading ?? 0,
          status: v.status || existing?.status || "ACTIVE",
          last_seen_at: v.last_seen_at || existing?.last_seen_at || new Date().toISOString(),
        });
      }
      return { vehicles: nextMap };
    }),

  updateVehiclePosition: (vehicleId, data) =>
    set((state) => {
      const nextMap = new Map(state.vehicles);
      const existing = nextMap.get(vehicleId);

      // Determine updated status
      let calculatedStatus: VehicleStatus = data.status || existing?.status || "ACTIVE";
      if (!data.status && typeof data.speed === "number") {
        if (data.speed > 1) {
          calculatedStatus = "ACTIVE";
        } else if (data.speed <= 1 && calculatedStatus !== "OFFLINE" && calculatedStatus !== "MAINTENANCE") {
          calculatedStatus = "IDLE";
        }
      }

      const updatedVehicle: LiveVehicleState = {
        id: vehicleId,
        plate_number: data.plate_number || existing?.plate_number || `V-${vehicleId.slice(0, 5)}`,
        make: existing?.make,
        model: existing?.model,
        year: existing?.year,
        type: existing?.type || "TRUCK",
        status: calculatedStatus,
        fuel_capacity: existing?.fuel_capacity ?? 100,
        current_fuel: existing?.current_fuel ?? 80,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed !== undefined ? data.speed : (existing?.speed ?? null),
        heading: data.heading !== undefined ? data.heading : (existing?.heading ?? null),
        altitude: data.altitude !== undefined ? data.altitude : (existing?.altitude ?? null),
        accuracy: data.accuracy !== undefined ? data.accuracy : (existing?.accuracy ?? null),
        last_seen_at: data.recorded_at,
        driver_name: existing?.driver_name,
        driver_phone: existing?.driver_phone,
      };

      nextMap.set(vehicleId, updatedVehicle);

      // If selected vehicle updated, also append point to route trail
      const nextTrails = new Map(state.routeTrails);
      const existingTrail = nextTrails.get(vehicleId) || [];
      const newPoint: LocationPoint = {
        id: `point-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        altitude: data.altitude ?? null,
        accuracy: data.accuracy ?? null,
        recorded_at: data.recorded_at,
      };

      // Cap trail at last 500 points to keep DOM / canvas high-performance
      const updatedPoints = [...existingTrail, newPoint].slice(-500);
      nextTrails.set(vehicleId, updatedPoints);

      return {
        vehicles: nextMap,
        routeTrails: nextTrails,
      };
    }),

  setRouteTrail: (vehicleId: string, points: LocationPoint[]) =>
    set((state) => {
      const nextTrails = new Map(state.routeTrails);
      nextTrails.set(vehicleId, points);
      return { routeTrails: nextTrails };
    }),

  appendRoutePoint: (vehicleId: string, point: LocationPoint) =>
    set((state) => {
      const nextTrails = new Map(state.routeTrails);
      const existing = nextTrails.get(vehicleId) || [];
      nextTrails.set(vehicleId, [...existing, point].slice(-500));
      return { routeTrails: nextTrails };
    }),

  setIsLoadingTrail: (loading: boolean) => set({ isLoadingTrail: loading }),

  clearStore: () =>
    set({
      vehicles: new Map<string, LiveVehicleState>(),
      selectedVehicleId: null,
      routeTrails: new Map<string, LocationPoint[]>(),
      isLoadingTrail: false,
      isConnected: false,
      connectionError: null,
    }),
}));
