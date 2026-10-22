import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface RoutePolylineProps {
  path: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  path,
  strokeColor = "#6366f1", // Indigo 500
  strokeOpacity = 0.85,
  strokeWeight = 4,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || !window.google.maps || path.length === 0) {
      return;
    }

    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      icons: [
        {
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2.5,
            strokeColor,
            fillColor: strokeColor,
            fillOpacity: 0.9,
          },
          offset: "100%",
          repeat: "120px",
        },
      ],
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, strokeColor, strokeOpacity, strokeWeight]);

  return null;
};
