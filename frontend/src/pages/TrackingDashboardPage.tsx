import React, { useMemo, useState, useEffect } from "react";
import { useVehicleTracking } from "../hooks/useVehicleTracking";
import { VehicleSidebar } from "../components/map/VehicleSidebar";
import { LiveGoogleMap } from "../components/map/LiveGoogleMap";
import { VehicleInfoPanel } from "../components/map/VehicleInfoPanel";
import { GeofenceDrawModal } from "../components/map/GeofenceDrawModal";
import { deliveryService } from "../services/deliveryService";
import { geofenceService } from "../services/geofenceService";
import { Delivery } from "../types/delivery";
import { Coordinate, Geofence, GeofenceCreatePayload } from "../types/geofence";
import { decodePolyline } from "../utils/polyline";
import { useToast } from "../components/ui/Toast";
import { useAuthStore } from "../store/authStore";
import {
  Package,
  MapPin,
  Clock,
  Shield,
  PenTool,
  Check,
  RotateCcw,
  Layers,
  Trash2,
  Truck,
  Radio,
} from "lucide-react";

export const TrackingDashboardPage: React.FC = () => {
  const {
    vehicles,
    selectedVehicleId,
    routeTrails,
    isLoadingTrail,
    isConnected,
    setSelectedVehicleId,
  } = useVehicleTracking({ autoSubscribeAll: true });

  const { role } = useAuthStore();
  const { toast } = useToast();

  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");

  // Geofencing states
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Coordinate[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showGeofencesList, setShowGeofencesList] = useState(false);

  const canManageGeofences = role === "ADMIN" || role === "DISPATCHER";

  // Load geofences
  const loadGeofences = async () => {
    try {
      const data = await geofenceService.getGeofences();
      setGeofences(data);
    } catch (e) {
      console.warn("Could not load geofences:", e);
    }
  };

  useEffect(() => {
    loadGeofences();
  }, []);

  // Load in-transit/assigned deliveries to overlay on map
  useEffect(() => {
    const fetchActiveDeliveries = async () => {
      try {
        const res = await deliveryService.getDeliveries({ size: 50 });
        const filtered = res.items.filter(
          (d) =>
            d.status === "ASSIGNED" ||
            d.status === "PICKED_UP" ||
            d.status === "IN_TRANSIT"
        );
        setActiveDeliveries(filtered);
      } catch (e) {
        console.warn("Could not load active deliveries for map overlay:", e);
      }
    };

    fetchActiveDeliveries();
  }, []);

  const vehicleList = useMemo(() => Array.from(vehicles.values()), [vehicles]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.get(selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const selectedTrail = useMemo(() => {
    if (!selectedVehicleId) return [];
    return routeTrails.get(selectedVehicleId) || [];
  }, [routeTrails, selectedVehicleId]);

  // Delivery associated with selected vehicle (or explicitly selected delivery)
  const activeDelivery = useMemo(() => {
    if (selectedDeliveryId) {
      return activeDeliveries.find((d) => d.id === selectedDeliveryId) || null;
    }
    if (selectedVehicleId) {
      return (
        activeDeliveries.find((d) => d.vehicle_id === selectedVehicleId) || null
      );
    }
    return activeDeliveries.length > 0 ? activeDeliveries[0] : null;
  }, [activeDeliveries, selectedDeliveryId, selectedVehicleId]);

  // Decoded planned polyline coordinates
  const plannedPolylinePoints = useMemo(() => {
    if (
      activeDelivery?.planned_route?.polyline_points &&
      activeDelivery.planned_route.polyline_points.length > 0
    ) {
      return activeDelivery.planned_route.polyline_points;
    }
    if (activeDelivery?.planned_route?.encoded_polyline) {
      return decodePolyline(activeDelivery.planned_route.encoded_polyline);
    }
    return [];
  }, [activeDelivery]);

  // Geofence drawing handlers
  const handleMapClick = (coord: Coordinate) => {
    if (!isDrawingMode) return;
    setDrawingPoints((prev) => [...prev, coord]);
  };

  const handleSaveGeofence = async (payload: GeofenceCreatePayload) => {
    const created = await geofenceService.createGeofence(payload);
    setGeofences((prev) => [created, ...prev]);
    setIsDrawingMode(false);
    setDrawingPoints([]);
    toast({
      title: "Geofence Created",
      message: `Zone '${created.name}' is now active and monitoring vehicles in real time.`,
      type: "success",
    });
  };

  const handleDeleteGeofence = async (id: string, name: string) => {
    try {
      await geofenceService.deleteGeofence(id);
      setGeofences((prev) => prev.filter((g) => g.id !== id));
      toast({
        title: "Geofence Deleted",
        message: `Zone '${name}' removed.`,
        type: "info",
      });
    } catch (e: unknown) {
      toast({
        title: "Error",
        message: e instanceof Error ? e.message : "Failed to delete geofence",
        type: "critical",
      });
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-8.5rem)] sm:h-[calc(100vh-10rem)] min-h-[480px] flex overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Left Sidebar: Vehicle Status List */}
      <div
        className={`${
          mobileTab === "list" ? "block w-full h-full" : "hidden"
        } lg:block lg:w-80 xl:w-96 shrink-0 h-full`}
      >
        <VehicleSidebar
          vehicles={vehicleList}
          selectedVehicleId={selectedVehicleId}
          isConnected={isConnected}
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            setMobileTab("map");
            const relatedDelivery = activeDeliveries.find((d) => d.vehicle_id === id);
            if (relatedDelivery) {
              setSelectedDeliveryId(relatedDelivery.id);
            }
          }}
        />
      </div>

      {/* Main Center Area: Full-screen Live Google Map with Planned Delivery Route Overlay */}
      <div
        className={`relative flex-1 h-full ${
          mobileTab === "map" ? "block" : "hidden lg:block"
        }`}
      >
        <LiveGoogleMap
          vehicles={vehicleList}
          selectedVehicleId={selectedVehicleId}
          routeTrail={selectedTrail}
          plannedPolyline={plannedPolylinePoints}
          geofences={geofences}
          drawingCoordinates={drawingPoints}
          isDrawingMode={isDrawingMode}
          onMapClick={handleMapClick}
          pickupMarker={
            activeDelivery
              ? {
                  lat: activeDelivery.pickup_latitude,
                  lng: activeDelivery.pickup_longitude,
                  label: activeDelivery.pickup_address,
                }
              : undefined
          }
          destinationMarker={
            activeDelivery
              ? {
                  lat: activeDelivery.dropoff_latitude,
                  lng: activeDelivery.dropoff_longitude,
                  label: activeDelivery.dropoff_address,
                }
              : undefined
          }
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            const relatedDelivery = activeDeliveries.find(
              (d) => d.vehicle_id === id
            );
            if (relatedDelivery) {
              setSelectedDeliveryId(relatedDelivery.id);
            }
          }}
        />

        {/* Floating Top-Right Map Controls: Geofence Drawing Tools */}
        {canManageGeofences && (
          <div
            className={`absolute ${
              activeDelivery ? "top-24 sm:top-3.5" : "top-3.5"
            } right-3 z-20 flex items-center gap-2`}
          >
            {!isDrawingMode ? (
              <>
                <button
                  onClick={() => setIsDrawingMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-indigo-400 hover:text-white border border-indigo-500/30 text-xs font-semibold shadow-xl backdrop-blur-md transition"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Draw Geofence</span>
                </button>

                <button
                  onClick={() => setShowGeofencesList(!showGeofencesList)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold shadow-xl backdrop-blur-md transition"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Zones ({geofences.length})</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900/95 border border-indigo-500/50 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in">
                <span className="text-[11px] font-medium text-slate-300 px-2">
                  Click on map ({drawingPoints.length} points)
                </span>

                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  disabled={drawingPoints.length < 3}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>

                <button
                  onClick={() => setDrawingPoints([])}
                  disabled={drawingPoints.length === 0}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-40"
                  title="Reset points"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setIsDrawingMode(false);
                    setDrawingPoints([]);
                  }}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Zones List Flyout */}
        {showGeofencesList && (
          <div className="absolute top-14 right-3 z-20 w-72 sm:w-80 rounded-2xl bg-slate-900/95 border border-slate-800 p-3 shadow-2xl backdrop-blur-md max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Active Geofence Zones
              </span>
              <button
                onClick={() => setShowGeofencesList(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            {geofences.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No geofences created yet. Click "Draw Geofence" to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {geofences.map((gf) => (
                  <div
                    key={gf.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-semibold text-white">{gf.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {gf.speed_limit
                          ? `Limit: ${gf.speed_limit} km/h`
                          : "No speed restriction"}
                      </p>
                    </div>
                    {canManageGeofences && (
                      <button
                        onClick={() => handleDeleteGeofence(gf.id, gf.name)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete geofence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Floating Active Delivery Route Overlay Card */}
        {activeDelivery && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 font-bold text-white min-w-0">
                <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Active Delivery: {activeDelivery.order_number}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 ml-2">
                {activeDelivery.status}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 truncate">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-400">To:</span>
                <span className="font-medium text-white truncate">
                  {activeDelivery.dropoff_address}
                </span>
              </div>
              {activeDelivery.planned_route && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ETA ~{activeDelivery.estimated_duration_mins ?? "--"}m
                  </span>
                  <span className="text-slate-400">
                    Dist:{" "}
                    {Math.round(
                      (activeDelivery.planned_route.distance_meters || 0) / 1000
                    )}{" "}
                    km
                  </span>
                  {activeDelivery.planned_route.is_fallback && (
                    <span className="text-amber-400 font-sans text-[10px]">
                      [Fallback]
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile View Switcher Pill (< lg) */}
        <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center bg-slate-900/95 border border-slate-700/90 p-1 rounded-2xl shadow-2xl backdrop-blur-md">
          <button
            onClick={() => setMobileTab("map")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              mobileTab === "map"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setMobileTab("list")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              mobileTab === "list"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet ({vehicleList.length})</span>
          </button>
        </div>

        {/* Click-to-Open Vehicle Info Panel and 30-min route status */}
        <VehicleInfoPanel
          vehicle={selectedVehicle}
          routeTrail={selectedTrail}
          isLoadingTrail={isLoadingTrail}
          onClose={() => setSelectedVehicleId(null)}
        />
      </div>

      {/* Geofence Save Dialog */}
      <GeofenceDrawModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        coordinates={drawingPoints}
        onSave={handleSaveGeofence}
        onClearDrawing={() => setDrawingPoints([])}
      />
    </div>
  );
};

export default TrackingDashboardPage;
