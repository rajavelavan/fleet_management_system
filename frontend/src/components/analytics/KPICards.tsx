import React from "react";
import {
  Truck,
  Package,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { KPISummaryResponse } from "../../types/analytics";

interface KPICardsProps {
  kpi: KPISummaryResponse | null;
  loading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpi, loading }) => {
  if (loading || !kpi) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-slate-900 border border-slate-800 rounded-2xl p-5"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Active Fleet Vehicles",
      value: `${kpi.fleet_status.active} / ${kpi.fleet_status.total}`,
      subtext: `${kpi.fleet_status.idle} idle, ${kpi.fleet_status.offline} offline`,
      icon: Truck,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "On-Time Delivery Rate",
      value: `${kpi.on_time_delivery_rate}%`,
      subtext: `${kpi.delivery_status.delivered} completed, ${kpi.delivery_status.failed} failed`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "In-Transit Deliveries",
      value: `${kpi.delivery_status.in_transit + kpi.delivery_status.picked_up}`,
      subtext: `${kpi.delivery_status.pending} pending assignment`,
      icon: Package,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
    {
      title: "Active Alerts",
      value: `${kpi.active_alerts_count}`,
      subtext: "Geofences, speeding, and offline",
      icon: AlertTriangle,
      color: kpi.active_alerts_count > 0 ? "text-amber-400" : "text-slate-400",
      bg: kpi.active_alerts_count > 0 ? "bg-amber-500/10" : "bg-slate-800/40",
      border: kpi.active_alerts_count > 0 ? "border-amber-500/30" : "border-slate-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex items-center justify-between transition-all"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">{card.title}</p>
              <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">
                {card.value}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{card.subtext}</p>
            </div>
            <div className={`p-3 rounded-xl border ${card.bg} ${card.border}`}>
              <Icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
