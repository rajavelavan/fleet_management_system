import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AlertBreakdownItem } from "../../types/analytics";
import { useThemeStore } from "../../store/themeStore";

interface AlertBreakdownChartProps {
  data: AlertBreakdownItem[];
  loading: boolean;
}

export const AlertBreakdownChart: React.FC<AlertBreakdownChartProps> = ({
  data,
  loading,
}) => {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Alert Frequency Breakdown</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Distribution across violations (speeding, geofence boundary, connectivity)
        </p>
      </div>

      <div className="h-72 w-full pt-4">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
            Loading alert distribution...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
            No safety or geofence alerts recorded.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
              <XAxis
                dataKey="type"
                stroke={isDark ? "#64748b" : "#94a3b8"}
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => val.replace("_", " ")}
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
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar dataKey="critical_count" name="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="warning_count" name="Warning" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="info_count" name="Info" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
