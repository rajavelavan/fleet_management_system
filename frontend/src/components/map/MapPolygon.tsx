import React, { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { Coordinate } from "../../types/geofence";

interface MapPolygonProps {
  paths: Coordinate[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  name?: string;
  onClick?: () => void;
}

export const MapPolygon: React.FC<MapPolygonProps> = ({
  paths,
  strokeColor = "#6366f1",
  strokeOpacity = 0.8,
  strokeWeight = 2,
  fillColor = "#6366f1",
  fillOpacity = 0.2,
  name,
  onClick,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google?.maps || paths.length < 3) return;

    const polygon = new window.google.maps.Polygon({
      paths: paths.map((p) => ({ lat: p.lat, lng: p.lng })),
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
      map,
    });

    if (onClick) {
      polygon.addListener("click", onClick);
    }

    if (name) {
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:#0f172a;font-weight:600;padding:2px 4px;font-size:12px;">${name}</div>`,
      });

      polygon.addListener("mouseover", (e: google.maps.PolyMouseEvent) => {
        if (e.latLng) {
          infoWindow.setPosition(e.latLng);
          infoWindow.open(map);
        }
      });

      polygon.addListener("mouseout", () => {
        infoWindow.close();
      });
    }

    return () => {
      polygon.setMap(null);
    };
  }, [map, paths, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity, name, onClick]);

  return null;
};
