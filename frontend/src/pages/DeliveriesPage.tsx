import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  MapPin,
  Truck,
  UserCheck,
  Route as RouteIcon,
  RefreshCw,
  Clock,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useDeliveries } from "../hooks/useDeliveries";
import { useVehicles } from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import { useAuthStore } from "../store/authStore";
import { Delivery, DeliveryStatus } from "../types/delivery";
import { CreateDeliveryModal } from "../components/deliveries/CreateDeliveryModal";
import { AssignDeliveryModal } from "../components/deliveries/AssignDeliveryModal";

export const DeliveriesPage: React.FC = () => {
  const { role } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "">("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningDelivery, setAssigningDelivery] = useState<Delivery | null>(null);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  const {
    deliveries,
    total,
    page,
    setPage,
    pages,
    loading,
    refresh,
    createDelivery,
    assignDelivery,
    calculateRoute,
    deleteDelivery,
  } = useDeliveries({
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  });

  const { data: vehiclesData } = useVehicles({ size: 100 });
  const { data: driversData } = useDrivers({ size: 100 });
  const vehicles = vehiclesData?.items || [];
  const drivers = driversData?.items || [];

  const isDispatcherOrAdmin = role === "ADMIN" || role === "DISPATCHER";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refresh({
      search: searchTerm.trim() || undefined,
      status: statusFilter || undefined,
      page: 1,
    });
  };

  const handleStatusFilter = (status: DeliveryStatus | "") => {
    setStatusFilter(status);
    refresh({
      search: searchTerm.trim() || undefined,
      status: status || undefined,
      page: 1,
    });
  };

  const handleCalculateRoute = async (deliveryId: string) => {
    try {
      setCalculatingId(deliveryId);
      await calculateRoute(deliveryId);
    } finally {
      setCalculatingId(null);
    }
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            PENDING
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            ASSIGNED
          </span>
        );
      case "PICKED_UP":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            PICKED UP
          </span>
        );
      case "IN_TRANSIT":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
            IN TRANSIT
          </span>
        );
      case "DELIVERED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            DELIVERED
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Delivery & Route Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create orders, compute Google Routes API paths, and dispatch fleet deliveries
          </p>
        </div>

        {isDispatcherOrAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Create Delivery Order
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search order number or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        {/* Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(
            [
              ["", "ALL"],
              ["PENDING", "Pending"],
              ["ASSIGNED", "Assigned"],
              ["PICKED_UP", "Picked Up"],
              ["IN_TRANSIT", "In Transit"],
              ["DELIVERED", "Delivered"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleStatusFilter(val as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === val
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => refresh()}
            title="Refresh"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Deliveries Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Order</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Origin / Pickup</th>
                <th className="px-4 py-3.5">Destination / Dropoff</th>
                <th className="px-4 py-3.5">Assigned Fleet</th>
                <th className="px-4 py-3.5">ETA & Polyline</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No delivery orders found. Click &quot;Create Delivery Order&quot; to get started.
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Order Reference */}
                    <td className="px-4 py-3.5 font-bold font-mono text-white">
                      {delivery.order_number}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      {getStatusBadge(delivery.status)}
                    </td>

                    {/* Pickup Address */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="truncate" title={delivery.pickup_address}>
                          {delivery.pickup_address}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 pl-5">
                        {delivery.pickup_latitude.toFixed(4)}, {delivery.pickup_longitude.toFixed(4)}
                      </div>
                    </td>

                    {/* Dropoff Address */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="truncate text-white font-medium" title={delivery.dropoff_address}>
                          {delivery.dropoff_address}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 pl-5">
                        {delivery.dropoff_latitude.toFixed(4)}, {delivery.dropoff_longitude.toFixed(4)}
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="px-4 py-3.5">
                      {delivery.vehicle ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-white">
                            <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{delivery.vehicle.plate_number}</span>
                          </div>
                          {delivery.driver && (
                            <div className="text-[10px] text-slate-400 pl-5">
                              {delivery.driver.license_number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* ETA & Route Details */}
                    <td className="px-4 py-3.5">
                      {delivery.planned_route ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>~{delivery.estimated_duration_mins ?? "--"}m</span>
                            <span className="text-slate-500 font-normal text-[10px]">
                              ({Math.round((delivery.planned_route.distance_meters || 0) / 1000)} km)
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <RouteIcon className="w-3 h-3 text-indigo-400" />
                            <span className="truncate max-w-[100px]" title={delivery.planned_route.encoded_polyline}>
                              {delivery.planned_route.encoded_polyline.slice(0, 14)}...
                            </span>
                            {delivery.planned_route.is_fallback && (
                              <span
                                title="Synthesized fallback route (Google key absent or error)"
                                className="text-amber-400"
                              >
                                [fallback]
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No route</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isDispatcherOrAdmin && (
                          <>
                            <button
                              onClick={() => setAssigningDelivery(delivery)}
                              title="Assign Vehicle & Driver"
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 border border-slate-800 transition"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCalculateRoute(delivery.id)}
                              disabled={calculatingId === delivery.id}
                              title="Recalculate Route via Google Routes API"
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 border border-slate-800 transition disabled:opacity-50"
                            >
                              <RouteIcon
                                className={`w-3.5 h-3.5 ${
                                  calculatingId === delivery.id ? "animate-spin" : ""
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete delivery order ${delivery.order_number}?`
                                  )
                                ) {
                                  deleteDelivery(delivery.id);
                                }
                              }}
                              title="Delete Order"
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{deliveries.length}</strong> of{" "}
            <strong className="text-white">{total}</strong> deliveries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="text-slate-400">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Dispatcher Create Delivery Modal */}
      <CreateDeliveryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={createDelivery}
        vehicles={vehicles}
      />

      {/* Dispatcher Assign Delivery Modal */}
      <AssignDeliveryModal
        isOpen={Boolean(assigningDelivery)}
        onClose={() => setAssigningDelivery(null)}
        delivery={assigningDelivery}
        vehicles={vehicles}
        drivers={drivers}
        onAssign={assignDelivery}
      />
    </div>
  );
};

export default DeliveriesPage;
