import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Gauge,
  Compass,
  CheckCircle2,
  Clock,
  Flag,
  Fuel,
  Wifi,
  WifiOff,
  PackageCheck,
  Truck,
  RotateCw,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useVehicleTracking } from "../hooks/useVehicleTracking";
import { LiveGoogleMap } from "../components/map/LiveGoogleMap";
import { fleetService } from "../services/fleetService";
import { deliveryService } from "../services/deliveryService";
import { LiveVehicleState } from "../types/tracking";
import { Delivery } from "../types/delivery";
import { decodePolyline } from "../utils/polyline";

export const DriverPage: React.FC = () => {
  const { user } = useAuthStore();
  const [driverVehicleId, setDriverVehicleId] = useState<string | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch current driver's profile to find their assigned vehicle and delivery order
  const fetchDriverAndDelivery = async () => {
    try {
      const driversRes = await fleetService.getDrivers({ size: 100 });
      const currentDriver = driversRes.items.find(
        (d) => d.user_id === user?.id || d.user?.email === user?.email
      );

      if (currentDriver) {
        if (currentDriver.current_vehicle) {
          setDriverVehicleId(currentDriver.current_vehicle.id);
        }
      }

      // Fetch deliveries assigned to this driver
      const deliveriesRes = await deliveryService.getDeliveries({
        size: 50,
      });

      // Find first non-delivered/non-cancelled delivery
      const currentJob = deliveriesRes.items.find(
        (d) =>
          d.status === "ASSIGNED" ||
          d.status === "PICKED_UP" ||
          d.status === "IN_TRANSIT"
      );

      if (currentJob) {
        setActiveDelivery(currentJob);
        if (currentJob.vehicle_id && !driverVehicleId) {
          setDriverVehicleId(currentJob.vehicle_id);
        }
      } else if (deliveriesRes.items.length > 0) {
        setActiveDelivery(deliveriesRes.items[0]);
      }
    } catch (err) {
      console.warn("Could not load driver delivery data:", err);
    }
  };

  useEffect(() => {
    fetchDriverAndDelivery();
  }, [user]);

  // Hook vehicle tracking for this driver's vehicle
  const { vehicles, routeTrails, isConnected } = useVehicleTracking({
    autoSubscribeAll: false,
    vehicleId: driverVehicleId || undefined,
  });

  // Assigned vehicle live data
  const myVehicle: LiveVehicleState = useMemo(() => {
    if (driverVehicleId && vehicles.has(driverVehicleId)) {
      return vehicles.get(driverVehicleId)!;
    }
    // Fallback active vehicle state
    return {
      id: driverVehicleId || "driver-assigned-veh",
      plate_number: activeDelivery?.vehicle?.plate_number || "TRK-CA-4091",
      make: activeDelivery?.vehicle?.make || "Freightliner",
      model: activeDelivery?.vehicle?.model || "Cascadia EV",
      type: "TRUCK",
      status: "ACTIVE",
      fuel_capacity: 120,
      current_fuel: 92,
      latitude: activeDelivery?.pickup_latitude || 37.7845,
      longitude: activeDelivery?.pickup_longitude || -122.4042,
      speed: 48.4,
      heading: 65,
      last_seen_at: new Date().toISOString(),
    };
  }, [driverVehicleId, vehicles, activeDelivery]);

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

  // Vehicle trail
  const myTrail = useMemo(() => {
    if (driverVehicleId && routeTrails.has(driverVehicleId)) {
      return routeTrails.get(driverVehicleId)!;
    }
    return [
      {
        id: "p1",
        latitude: myVehicle.latitude - 0.01,
        longitude: myVehicle.longitude - 0.015,
        speed: 45,
        heading: 60,
        recorded_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: "p2",
        latitude: myVehicle.latitude,
        longitude: myVehicle.longitude,
        speed: myVehicle.speed,
        heading: myVehicle.heading,
        recorded_at: myVehicle.last_seen_at,
      },
    ];
  }, [driverVehicleId, routeTrails, myVehicle]);

  // Handle Driver Workflow Status Updates
  const handleUpdateStatus = async (
    nextStatus: "PICKED_UP" | "IN_TRANSIT" | "DELIVERED"
  ) => {
    if (!activeDelivery) return;
    try {
      setActionLoading(true);
      const updated = await deliveryService.updateDriverStatus(activeDelivery.id, {
        status: nextStatus,
      });
      setActiveDelivery(updated);
    } catch (err: any) {
      alert(
        err?.response?.data?.detail || `Failed to update status to ${nextStatus}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 flex-1 min-h-[500px]">
      {/* Mobile Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:px-4 sm:py-3 shadow-md gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/map"
            title="Return to Live Map"
            className="p-2 bg-slate-950 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white leading-tight">
                Driver Navigation & Workflow
              </h1>
              {activeDelivery && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeDelivery.status}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Vehicle:{" "}
              <strong className="text-white">
                {activeDelivery?.vehicle?.plate_number || myVehicle.plate_number}
              </strong>{" "}
              &bull; Order:{" "}
              <strong className="text-emerald-400 font-mono">
                {activeDelivery?.order_number || "No Active Order"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <button
            onClick={fetchDriverAndDelivery}
            title="Refresh order"
            className="p-2 bg-slate-950 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <div
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Telemetry Uplink</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Reconnecting</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Responsive Grid: Map + Driver Telemetry Dashboard */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4">
        {/* Dedicated Mobile / Driver Map View with Polyline */}
        <div className="relative w-full h-72 sm:h-96 lg:h-auto lg:flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl min-h-[280px]">
          <LiveGoogleMap
            vehicles={[myVehicle]}
            selectedVehicleId={myVehicle.id}
            routeTrail={myTrail}
            plannedPolyline={plannedPolylinePoints}
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
            onSelectVehicle={() => {}}
          />

          {/* Floating Trip Target Overlay Pill */}
          {activeDelivery && (
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Flag className="w-3.5 h-3.5 text-indigo-400" />
                  Destination
                </span>
                <span className="text-emerald-400 font-bold font-mono text-[11px]">
                  ETA ~{activeDelivery.estimated_duration_mins ?? "--"}m (
                  {Math.round(
                    (activeDelivery.planned_route?.distance_meters || 0) / 1000
                  )}{" "}
                  km)
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">
                {activeDelivery.dropoff_address}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                From: {activeDelivery.pickup_address}
              </p>
            </div>
          )}
        </div>

        {/* Mobile-Friendly Telemetry & Trip Controls Sheet */}
        <div className="w-full lg:w-96 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live Telemetry
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-0.5">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span>Speed</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {Math.round(myVehicle.speed ?? 0)}{" "}
                  <span className="text-xs font-normal text-slate-400">km/h</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-0.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Heading</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {Math.round(myVehicle.heading ?? 0)}°
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-0.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fuel Tank</span>
                </div>
                <div className="text-base font-bold text-white">
                  {myVehicle.current_fuel ?? 80} L
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>ETA</span>
                </div>
                <div className="text-base font-bold text-emerald-400">
                  {activeDelivery?.estimated_duration_mins ?? "--"}m
                </div>
              </div>
            </div>

            {/* Current Geo Location */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Current Vehicle Coordinates</span>
              </div>
              <p className="font-mono text-xs text-slate-300">
                {myVehicle.latitude.toFixed(5)}, {myVehicle.longitude.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Workflow Action Buttons with large touch targets */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-indigo-400" />
              <span>Driver Workflow Actions</span>
            </div>

            {activeDelivery ? (
              <div className="space-y-2">
                {/* Step 1: Mark Picked Up */}
                {activeDelivery.status === "ASSIGNED" && (
                  <button
                    onClick={() => handleUpdateStatus("PICKED_UP")}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Confirm Cargo Pickup</span>
                  </button>
                )}

                {/* Step 2: Mark In Transit */}
                {activeDelivery.status === "PICKED_UP" && (
                  <button
                    onClick={() => handleUpdateStatus("IN_TRANSIT")}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Start Transit (Depart)</span>
                  </button>
                )}

                {/* Step 3: Mark Delivered */}
                {(activeDelivery.status === "IN_TRANSIT" ||
                  activeDelivery.status === "PICKED_UP") && (
                  <button
                    onClick={() => handleUpdateStatus("DELIVERED")}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Successful Delivery</span>
                  </button>
                )}

                {activeDelivery.status === "DELIVERED" && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Delivery Completed Successfully!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No active delivery orders assigned to you yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverPage;
