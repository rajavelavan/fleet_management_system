import React, { useState } from "react";
import { Download, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { analyticsService } from "../../services/analyticsService";

export const ReportExportsCard: React.FC = () => {
  const [downloadingDeliveries, setDownloadingDeliveries] = useState(false);
  const [downloadingTrips, setDownloadingTrips] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleDownloadDeliveries = async () => {
    setDownloadingDeliveries(true);
    setLastAction(null);
    try {
      await analyticsService.downloadDeliveriesReport();
      setLastAction("Deliveries report (.xlsx) exported successfully!");
    } catch {
      setLastAction("Failed to export deliveries report.");
    } finally {
      setDownloadingDeliveries(false);
    }
  };

  const handleDownloadTrips = async () => {
    setDownloadingTrips(true);
    setLastAction(null);
    try {
      await analyticsService.downloadTripsReport();
      setLastAction("Vehicle trips report (.xlsx) exported successfully!");
    } catch {
      setLastAction("Failed to export trips report.");
    } finally {
      setDownloadingTrips(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Excel Report Generation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download styled spreadsheet audits generated via backend <code className="text-indigo-600 dark:text-indigo-400">openpyxl</code>
            </p>
          </div>
        </div>

        {lastAction && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{lastAction}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deliveries Export Card */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Shipments Export</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono">
                .XLSX STREAM
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Deliveries Operational Report</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Complete register of all shipments, origin/destination coordinates, assigned driver phone contacts, and delivery transit timelines.
            </p>
          </div>

          <button
            onClick={handleDownloadDeliveries}
            disabled={downloadingDeliveries}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
          >
            {downloadingDeliveries ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Styled XLSX...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Deliveries (XLSX)</span>
              </>
            )}
          </button>
        </div>

        {/* Vehicle Trips Export Card */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Telemetry Export</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                .XLSX STREAM
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Vehicle Trips & Telemetry Report</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Aggregated PostGIS distance calculations, operating duration hours, recorded average and peak speeds per fleet vehicle.
            </p>
          </div>

          <button
            onClick={handleDownloadTrips}
            disabled={downloadingTrips}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            {downloadingTrips ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Computing Geometrics & XLSX...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Vehicle Trips (XLSX)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
