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

interface AlertBreakdownChartProps {
  data: AlertBreakdownItem[];
  loading: boolean;
}

export const AlertBreakdownChart: React.FC<AlertBreakdownChartProps> = ({
  data,
  loading,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Alert Frequency Breakdown</h3>
        <p className="text-xs text-slate-400">
          Distribution across violations (speeding, geofence boundary, connectivity)
        </p>
      </div>

      <div className="h-72 w-full pt-4">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 animate-pulse">
            Loading alert distribution...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
            No safety or geofence alerts recorded.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="type"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => val.replace("_", " ")}
              />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "#f8fafc",
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
