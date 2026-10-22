import React, { useMemo, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { LiveVehicleState, LocationPoint } from "../../types/tracking";
import { Coordinate, Geofence } from "../../types/geofence";
import { TruckMarker } from "./TruckMarker";
import { RoutePolyline } from "./RoutePolyline";
import { MapPolygon } from "./MapPolygon";
import { MapPin, Shield } from "lucide-react";

// Google Maps Night / Dark Mode Style configuration
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0f382c" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#091325" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
];

// Helper to auto-center map when a vehicle is selected
const MapPanController: React.FC<{
  selectedVehicle: LiveVehicleState | null;
  plannedPolyline?: Array<{ lat: number; lng: number }>;
}> = ({ selectedVehicle, plannedPolyline }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedVehicle) {
      map.panTo({
        lat: selectedVehicle.latitude,
        lng: selectedVehicle.longitude,
      });
      return;
    }
    if (plannedPolyline && plannedPolyline.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      plannedPolyline.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 50);
    }
  }, [map, selectedVehicle, plannedPolyline]);

  return null;
};

// Interactive Canvas Map Fallback
interface FallbackCanvasMapProps {
  vehicles: LiveVehicleState[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  routeTrail: LocationPoint[];
  plannedPolyline?: Array<{ lat: number; lng: number }>;
  destinationMarker?: { lat: number; lng: number; label: string };
  pickupMarker?: { lat: number; lng: number; label: string };
  geofences?: Geofence[];
  drawingCoordinates?: Coordinate[];
  isDrawingMode?: boolean;
  onMapClick?: (coord: Coordinate) => void;
}

const FallbackCanvasMap: React.FC<FallbackCanvasMapProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  routeTrail,
  plannedPolyline = [],
  destinationMarker,
  pickupMarker,
  geofences = [],
  drawingCoordinates = [],
  isDrawingMode = false,
  onMapClick,
}) => {
  // Compute spatial bounding box
  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    const allLats = vehicles.map((v) => v.latitude);
    const allLngs = vehicles.map((v) => v.longitude);
    routeTrail.forEach((p) => {
      allLats.push(p.latitude);
      allLngs.push(p.longitude);
    });
    plannedPolyline.forEach((p) => {
      allLats.push(p.lat);
      allLngs.push(p.lng);
    });
    if (destinationMarker) {
      allLats.push(destinationMarker.lat);
      allLngs.push(destinationMarker.lng);
    }
    if (pickupMarker) {
      allLats.push(pickupMarker.lat);
      allLngs.push(pickupMarker.lng);
    }
    geofences.forEach((gf) => {
      gf.coordinates.forEach((c) => {
        allLats.push(c.lat);
        allLngs.push(c.lng);
      });
    });
    drawingCoordinates.forEach((c) => {
      allLats.push(c.lat);
      allLngs.push(c.lng);
    });

    if (allLats.length === 0) {
      return { minLat: 37.7, maxLat: 37.85, minLng: -122.5, maxLng: -122.3 };
    }

    const minLa = Math.min(...allLats);
    const maxLa = Math.max(...allLats);
    const minLn = Math.min(...allLngs);
    const maxLn = Math.max(...allLngs);
    const latPadding = Math.max((maxLa - minLa) * 0.2, 0.02);
    const lngPadding = Math.max((maxLn - minLn) * 0.2, 0.02);

    return {
      minLat: minLa - latPadding,
      maxLat: maxLa + latPadding,
      minLng: minLn - lngPadding,
      maxLng: maxLn + lngPadding,
    };
  }, [vehicles, routeTrail, plannedPolyline, destinationMarker, pickupMarker, geofences, drawingCoordinates]);

  const toPercent = (lat: number, lng: number) => {
    const top = ((maxLat - lat) / (maxLat - minLat)) * 100;
    const left = ((lng - minLng) / (maxLng - minLng)) * 100;
    return {
      top: `${Math.min(Math.max(top, 5), 95)}%`,
      left: `${Math.min(Math.max(left, 5), 95)}%`,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !onMapClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = x / rect.width;
    const yPercent = y / rect.height;

    // Convert screen percent to lat / lng
    const lng = minLng + xPercent * (maxLng - minLng);
    const lat = maxLat - yPercent * (maxLat - minLat);
    onMapClick({ lat, lng });
  };

  return (
    <div
      onClick={handleCanvasClick}
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${
        isDrawingMode ? "cursor-crosshair" : ""
      }`}
    >
      {/* Background Cartography Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#6366f1 1px, #020617 1px)",
          backgroundSize: "40px 40px",
          backgroundPosition: "0 0, 20px 20px",
        }}
      />

      {/* Render Saved Geofences (Polygons) */}
      {geofences.map((gf) => {
        if (!gf.coordinates || gf.coordinates.length < 3) return null;
        const pointsStr = gf.coordinates
          .map((c) => {
            const pos = toPercent(c.lat, c.lng);
            return `${pos.left},${pos.top}`;
          })
          .join(" ");

        // Compute centroid for label
        const avgLat =
          gf.coordinates.reduce((sum, c) => sum + c.lat, 0) /
          gf.coordinates.length;
        const avgLng =
          gf.coordinates.reduce((sum, c) => sum + c.lng, 0) /
          gf.coordinates.length;
        const centerPos = toPercent(avgLat, avgLng);

        return (
          <React.Fragment key={gf.id}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <polygon
                points={pointsStr}
                fill="#6366f1"
                fillOpacity="0.15"
                stroke="#818cf8"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
            </svg>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none"
              style={{ top: centerPos.top, left: centerPos.left }}
            >
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-sm flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                {gf.name}
                {gf.speed_limit ? ` (${gf.speed_limit} km/h)` : ""}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* Render In-Progress Geofence Drawing Polygon */}
      {drawingCoordinates.length > 0 && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
            <polyline
              points={drawingCoordinates
                .map((c) => {
                  const pos = toPercent(c.lat, c.lng);
                  return `${pos.left},${pos.top}`;
                })
                .join(" ")}
              fill="rgba(244, 63, 94, 0.15)"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeDasharray="5,3"
            />
          </svg>
          {drawingCoordinates.map((c, i) => {
            const pos = toPercent(c.lat, c.lng);
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-md pointer-events-none"
                style={{ top: pos.top, left: pos.left }}
              />
            );
          })}
        </>
      )}

      {/* Planned Delivery Route (Solid Emerald Polyline) */}
      {plannedPolyline.length > 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={plannedPolyline
              .map((p) => {
                const y = ((maxLat - p.lat) / (maxLat - minLat)) * 100;
                const x = ((p.lng - minLng) / (maxLng - minLng)) * 100;
                return `${x}%,${y}%`;
              })
              .join(" ")}
          />
        </svg>
      )}

      {/* SVG Breadcrumb trail polyline */}
      {routeTrail.length > 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeDasharray="6,4"
            points={routeTrail
              .map((p) => {
                const y = ((maxLat - p.latitude) / (maxLat - minLat)) * 100;
                const x = ((p.longitude - minLng) / (maxLng - minLng)) * 100;
                return `${x}%,${y}%`;
              })
              .join(" ")}
          />
        </svg>
      )}

      {/* Pickup Marker */}
      {pickupMarker && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
          style={toPercent(pickupMarker.lat, pickupMarker.lng)}
        >
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold bg-slate-900/90 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 mt-1 whitespace-nowrap">
            Pickup
          </span>
        </div>
      )}

      {/* Destination Marker */}
      {destinationMarker && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
          style={toPercent(destinationMarker.lat, destinationMarker.lng)}
        >
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold bg-slate-900/90 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 mt-1 whitespace-nowrap">
            {destinationMarker.label}
          </span>
        </div>
      )}

      {/* Render Markers on Canvas */}
      {vehicles.map((v) => {
        const isSelected = selectedVehicleId === v.id;
        const pos = toPercent(v.latitude, v.longitude);
        return (
          <div
            key={v.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-700 ease-linear"
            style={{ top: pos.top, left: pos.left }}
          >
            <TruckMarker
              plateNumber={v.plate_number}
              status={v.status}
              heading={v.heading}
              speed={v.speed}
              isSelected={isSelected}
              onClick={() => onSelectVehicle(v.id)}
            />
          </div>
        );
      })}
    </div>
  );
};

export interface LiveGoogleMapProps {
  vehicles: LiveVehicleState[];
  selectedVehicleId: string | null;
  routeTrail?: LocationPoint[];
  plannedPolyline?: Array<{ lat: number; lng: number }>;
  destinationMarker?: { lat: number; lng: number; label: string };
  pickupMarker?: { lat: number; lng: number; label: string };
  geofences?: Geofence[];
  drawingCoordinates?: Coordinate[];
  isDrawingMode?: boolean;
  onMapClick?: (coord: Coordinate) => void;
  onSelectVehicle: (id: string) => void;
}

export const LiveGoogleMap: React.FC<LiveGoogleMapProps> = ({
  vehicles,
  selectedVehicleId,
  routeTrail = [],
  plannedPolyline = [],
  destinationMarker,
  pickupMarker,
  geofences = [],
  drawingCoordinates = [],
  isDrawingMode = false,
  onMapClick,
  onSelectVehicle,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Center on selected vehicle, planned destination, or default San Francisco coordinates
  const center = useMemo(() => {
    if (selectedVehicle) {
      return { lat: selectedVehicle.latitude, lng: selectedVehicle.longitude };
    }
    if (destinationMarker) {
      return { lat: destinationMarker.lat, lng: destinationMarker.lng };
    }
    if (plannedPolyline.length > 0) {
      return plannedPolyline[0];
    }
    if (vehicles.length > 0 && vehicles[0].latitude && vehicles[0].longitude) {
      return { lat: vehicles[0].latitude, lng: vehicles[0].longitude };
    }
    return { lat: 37.7749, lng: -122.4194 };
  }, [selectedVehicle, destinationMarker, plannedPolyline, vehicles]);

  // Transform route trail to Google Maps LatLng format
  const polylinePath = useMemo(() => {
    return routeTrail.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
    }));
  }, [routeTrail]);

  // Fallback interactive canvas if no key
  if (!apiKey || apiKey === "mock_key" || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
    return (
      <FallbackCanvasMap
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={onSelectVehicle}
        routeTrail={routeTrail}
        plannedPolyline={plannedPolyline}
        destinationMarker={destinationMarker}
        pickupMarker={pickupMarker}
        geofences={geofences}
        drawingCoordinates={drawingCoordinates}
        isDrawingMode={isDrawingMode}
        onMapClick={onMapClick}
      />
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full bg-slate-950">
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={false}
          styles={DARK_MAP_STYLES}
          className="w-full h-full"
          onClick={(e) => {
            if (isDrawingMode && onMapClick && e.detail.latLng) {
              onMapClick({
                lat: e.detail.latLng.lat,
                lng: e.detail.latLng.lng,
              });
            }
          }}
        >
          <MapPanController
            selectedVehicle={selectedVehicle}
            plannedPolyline={plannedPolyline}
          />

          {/* Render Geofences */}
          {geofences.map((gf) => (
            <MapPolygon
              key={gf.id}
              paths={gf.coordinates}
              name={gf.name}
              strokeColor="#6366f1"
              fillColor="#6366f1"
              fillOpacity={0.2}
            />
          ))}

          {/* Render drawing polygon */}
          {drawingCoordinates.length >= 3 && (
            <MapPolygon
              paths={drawingCoordinates}
              strokeColor="#f43f5e"
              fillColor="#f43f5e"
              fillOpacity={0.25}
            />
          )}

          {/* 30-Minute GPS Breadcrumb History Polyline (Purple/Indigo) */}
          {polylinePath.length > 0 && (
            <RoutePolyline
              path={polylinePath}
              strokeColor="#6366f1"
              strokeWeight={3}
              strokeOpacity={0.7}
            />
          )}

          {/* Planned Google Routes Optimal Polyline (Emerald Green) */}
          {plannedPolyline.length > 0 && (
            <RoutePolyline
              path={plannedPolyline}
              strokeColor="#10b981"
              strokeWeight={5}
              strokeOpacity={0.9}
            />
          )}

          {/* Pickup Marker */}
          {pickupMarker && (
            <AdvancedMarker
              position={{ lat: pickupMarker.lat, lng: pickupMarker.lng }}
              title={`Pickup: ${pickupMarker.label}`}
            >
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold bg-slate-900/90 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 mt-1 whitespace-nowrap shadow-md">
                  Pickup
                </span>
              </div>
            </AdvancedMarker>
          )}

          {/* Destination Marker */}
          {destinationMarker && (
            <AdvancedMarker
              position={{ lat: destinationMarker.lat, lng: destinationMarker.lng }}
              title={`Destination: ${destinationMarker.label}`}
            >
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold bg-slate-900/90 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 mt-1 whitespace-nowrap shadow-md">
                  {destinationMarker.label}
                </span>
              </div>
            </AdvancedMarker>
          )}

          {/* Live Vehicle Markers */}
          {vehicles.map((v) => (
            <AdvancedMarker
              key={v.id}
              position={{ lat: v.latitude, lng: v.longitude }}
              title={v.plate_number}
              onClick={() => onSelectVehicle(v.id)}
            >
              <TruckMarker
                plateNumber={v.plate_number}
                status={v.status}
                heading={v.heading}
                speed={v.speed}
                isSelected={selectedVehicleId === v.id}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
};
