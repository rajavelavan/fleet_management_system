import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DeliveriesTrendItem } from "../../types/analytics";
import { useThemeStore } from "../../store/themeStore";

interface DeliveryTrendChartProps {
  data: DeliveriesTrendItem[];
  loading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
}

export const DeliveryTrendChart: React.FC<DeliveryTrendChartProps> = ({
  data,
  loading,
  days,
  onDaysChange,
}) => {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delivery Volume & Fulfillment Trend</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total dispatched vs completed orders across past timeframe
          </p>
        </div>

        {/* Days timeframe buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                days === d
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full pt-4">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
            Loading trend metrics...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
            No delivery records in this timeframe.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={isDark ? "#64748b" : "#94a3b8"}
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => {
                  try {
                    const parts = val.split("-");
                    return `${parts[1]}/${parts[2]}`;
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis stroke={isDark ? "#64748b" : "#94a3b8"} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#e2e8f0",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: isDark ? "#f8fafc" : "#0f172a",
                  boxShadow: isDark
                    ? "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                    : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: "12px", paddingTop: "0px" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Orders"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="delivered"
                name="Delivered"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDelivered)"
              />
              <Area
                type="monotone"
                dataKey="failed"
                name="Failed / Rejected"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorFailed)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
