import React from "react";
import { VehicleStatus } from "../../types/fleet";

interface TruckMarkerProps {
  plateNumber: string;
  status: VehicleStatus;
  heading?: number | null;
  speed?: number | null;
  isSelected?: boolean;
  onClick?: () => void;
}

export const TruckMarker: React.FC<TruckMarkerProps> = ({
  plateNumber,
  status,
  heading = 0,
  speed = 0,
  isSelected = false,
  onClick,
}) => {
  // Color configuration: Green = Active, Yellow = Idle, Red = Offline, Amber = Maintenance
  const getStatusColors = (st: VehicleStatus) => {
    switch (st) {
      case "ACTIVE":
        return {
          bg: "bg-emerald-500",
          border: "border-emerald-300",
          ring: "ring-emerald-400/40",
          text: "text-emerald-400",
          fill: "#10b981", // Tailwind emerald-500
          pulse: true,
        };
      case "IDLE":
        return {
          bg: "bg-amber-400",
          border: "border-amber-200",
          ring: "ring-amber-300/40",
          text: "text-amber-400",
          fill: "#f59e0b", // Tailwind amber-500
          pulse: false,
        };
      case "OFFLINE":
      default:
        return {
          bg: "bg-rose-500",
          border: "border-rose-300",
          ring: "ring-rose-400/40",
          text: "text-rose-400",
          fill: "#ef4444", // Tailwind red-500
          pulse: false,
        };
      case "MAINTENANCE":
        return {
          bg: "bg-orange-500",
          border: "border-orange-300",
          ring: "ring-orange-400/40",
          text: "text-orange-400",
          fill: "#f97316",
          pulse: false,
        };
    }
  };

  const colors = getStatusColors(status);
  const normalizedHeading = heading ?? 0;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center cursor-pointer transition-transform duration-300 select-none ${
        isSelected ? "scale-110 z-40" : "hover:scale-105 z-20"
      }`}
      style={{ transformOrigin: "center center" }}
    >
      {/* Plate Badge above marker */}
      <div
        className={`px-2 py-0.5 mb-1 rounded-md text-[11px] font-bold tracking-tight shadow-lg whitespace-nowrap transition-all border ${
          isSelected
            ? "bg-indigo-950 text-indigo-200 border-indigo-400 ring-2 ring-indigo-500/40"
            : "bg-slate-900/90 text-slate-100 border-slate-700 backdrop-blur-sm group-hover:border-slate-500"
        }`}
      >
        <span>{plateNumber}</span>
        {speed !== null && speed !== undefined && speed > 0 && (
          <span className="ml-1.5 text-[10px] text-emerald-400 font-mono">
            {Math.round(speed)} km/h
          </span>
        )}
      </div>

      {/* Outer Glow Halo for Active / Selected */}
      <div className="relative flex items-center justify-center">
        {colors.pulse && (
          <span
            className={`absolute inline-flex h-12 w-12 rounded-full ${colors.bg} opacity-20 animate-ping`}
          />
        )}

        {/* Circular Marker Body with Direction Needle */}
        <div
          className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all border-2 ${
            isSelected
              ? "bg-slate-900 border-indigo-400 ring-4 ring-indigo-500/50"
              : `bg-slate-900 ${colors.border} ring-2 ${colors.ring}`
          }`}
        >
          {/* Rotating Heading Pointer */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
            style={{ transform: `rotate(${normalizedHeading}deg)` }}
          >
            {/* Custom High-Quality SVG Truck Icon */}
            <svg
              className="w-6 h-6 drop-shadow"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.fill}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Truck Cabin & Bed */}
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
              {/* Wheels */}
              <circle cx="17" cy="18.5" r="2.5" fill={colors.fill} stroke="currentColor" />
              <circle cx="7" cy="18.5" r="2.5" fill={colors.fill} stroke="currentColor" />
            </svg>

            {/* Small directional triangle needle pointing forward (North/Heading) */}
            <div
              className="absolute -top-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px]"
              style={{ borderBottomColor: colors.fill }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
