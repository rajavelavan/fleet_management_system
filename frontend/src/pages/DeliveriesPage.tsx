import React, { useState } from "react";
import { Link } from "react-router-dom";
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
  Radio,
} from "lucide-react";
import {
  useDeliveries,
  useCreateDelivery,
  useAssignDelivery,
  useCalculateRoute,
  useDeleteDelivery,
} from "../hooks/useDeliveries";
import { useVehicles } from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import { useAuthStore } from "../store/authStore";
import { Delivery, DeliveryStatus } from "../types/delivery";
import { CreateDeliveryModal } from "../components/deliveries/CreateDeliveryModal";
import { AssignDeliveryModal } from "../components/deliveries/AssignDeliveryModal";

export const DeliveriesPage: React.FC = () => {
  const { role } = useAuthStore();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "">("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningDelivery, setAssigningDelivery] = useState<Delivery | null>(null);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  const {
    data: deliveriesData,
    isLoading,
    isFetching,
    refetch,
  } = useDeliveries({
    page,
    size: 20,
    search: searchTerm.trim() || undefined,
    status: statusFilter || undefined,
  });

  const createDeliveryMutation = useCreateDelivery();
  const assignDeliveryMutation = useAssignDelivery();
  const calculateRouteMutation = useCalculateRoute();
  const deleteDeliveryMutation = useDeleteDelivery();

  const deliveries = deliveriesData?.items || [];
  const total = deliveriesData?.total || 0;
  const pages = deliveriesData?.pages || 1;
  const loading = isLoading;

  const { data: vehicleData } = useVehicles({ size: 100 });
  const { data: driverData } = useDrivers({ is_active: true, size: 100 });

  const vehicles = vehicleData?.items || [];
  const drivers = driverData?.items || [];

  const isDispatcherOrAdmin = role === "ADMIN" || role === "DISPATCHER";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleStatusFilter = (st: DeliveryStatus | "") => {
    setStatusFilter(st);
    setPage(1);
  };

  const handleCalculateRoute = async (deliveryId: string) => {
    try {
      setCalculatingId(deliveryId);
      await calculateRouteMutation.mutateAsync(deliveryId);
      refetch();
    } catch {
      // Ignored - mutation shows error
    } finally {
      setCalculatingId(null);
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    try {
      await deleteDeliveryMutation.mutateAsync(deliveryId);
      refetch();
    } catch {
      // Error handled
    }
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            PENDING
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            ASSIGNED
          </span>
        );
      case "PICKED_UP":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
            PICKED UP
          </span>
        );
      case "IN_TRANSIT":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            IN TRANSIT
          </span>
        );
      case "DELIVERED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            DELIVERED
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col space-y-4">
      {/* Header and Controls */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Delivery & Route Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create orders, compute Google Routes API paths, and dispatch fleet deliveries
          </p>
        </div>

        {isDispatcherOrAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delivery Order</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-sm">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search order number or address..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === val
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-500 dark:text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Deliveries Table Card */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
        {/* Mobile Card List View (< lg) */}
        <div className="block lg:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {loading && deliveries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500 dark:text-indigo-400" />
              Loading deliveries...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs p-4">
              No delivery orders found. Click &quot;Create Delivery Order&quot; to get started.
            </div>
          ) : (
            deliveries.map((delivery) => (
              <div key={delivery.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                {/* Header: Order & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-white text-sm">
                    <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{delivery.order_number}</span>
                  </div>
                  <div>{getStatusBadge(delivery.status)}</div>
                </div>

                {/* Waypoints Grid */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs">
                  {/* Pickup */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                        Pickup
                      </span>
                      <p className="text-slate-800 dark:text-white truncate" title={delivery.pickup_address}>
                        {delivery.pickup_address}
                      </p>
                    </div>
                  </div>

                  {/* Dropoff */}
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                        Destination
                      </span>
                      <p className="text-slate-900 dark:text-white font-medium truncate" title={delivery.dropoff_address}>
                        {delivery.dropoff_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Fleet & Route ETA */}
                <div className="flex items-center justify-between text-xs pt-1 px-1 flex-wrap gap-2">
                  {/* Fleet details */}
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Truck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    {delivery.vehicle ? (
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {delivery.vehicle.plate_number}{" "}
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          ({delivery.driver?.license_number || "Driver Assigned"})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  {/* ETA & Distance */}
                  {delivery.planned_route && (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>~{delivery.estimated_duration_mins ?? "--"}m</span>
                      <span className="text-slate-400">
                        ({Math.round((delivery.planned_route.distance_meters || 0) / 1000)} km)
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    to="/map"
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Track on Map</span>
                  </Link>

                  {isDispatcherOrAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAssigningDelivery(delivery)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign</span>
                      </button>

                      {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleCalculateRoute(delivery.id)}
                          disabled={calculatingId === delivery.id}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition disabled:opacity-50"
                          title="Recalculate Route"
                        >
                          <RouteIcon
                            className={`w-3.5 h-3.5 ${
                              calculatingId === delivery.id ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete delivery order ${delivery.order_number}?`
                            )
                          ) {
                            handleDeleteDelivery(delivery.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        title="Delete Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (lg+) */}
        <div className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] shadow-sm">
              <tr>
                <th className="px-4 py-3.5">Order</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Origin / Pickup</th>
                <th className="px-4 py-3.5">Destination / Dropoff</th>
                <th className="px-4 py-3.5">Assigned Fleet</th>
                <th className="px-4 py-3.5">ETA & Distance</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500 dark:text-indigo-400" />
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
                  <tr key={delivery.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Order Reference */}
                    <td className="px-4 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                      {delivery.order_number}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      {getStatusBadge(delivery.status)}
                    </td>

                    {/* Pickup Address */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span className="truncate text-slate-700 dark:text-slate-200" title={delivery.pickup_address}>
                          {delivery.pickup_address}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pl-5">
                        {delivery.pickup_latitude.toFixed(4)}, {delivery.pickup_longitude.toFixed(4)}
                      </div>
                    </td>

                    {/* Dropoff Address */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="truncate text-slate-900 dark:text-white font-medium" title={delivery.dropoff_address}>
                          {delivery.dropoff_address}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pl-5">
                        {delivery.dropoff_latitude.toFixed(4)}, {delivery.dropoff_longitude.toFixed(4)}
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="px-4 py-3.5">
                      {delivery.vehicle ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                            <Truck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                            <span>{delivery.vehicle.plate_number}</span>
                          </div>
                          {delivery.driver && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                              {delivery.driver.license_number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* ETA & Distance Details */}
                    <td className="px-4 py-3.5">
                      {delivery.planned_route ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>~{delivery.estimated_duration_mins ?? "--"}m</span>
                            <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">
                              ({Math.round((delivery.planned_route.distance_meters || 0) / 1000)} km)
                            </span>
                          </div>
                          {delivery.planned_route.is_fallback && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              [Fallback route]
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No route</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to="/map"
                          title="Track Delivery on Map"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-cyan-50 dark:hover:bg-cyan-600/20 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-800 transition"
                        >
                          <Radio className="w-3.5 h-3.5" />
                        </Link>
                        {isDispatcherOrAdmin && (
                          <>
                            <button
                              onClick={() => setAssigningDelivery(delivery)}
                              title="Assign Vehicle & Driver"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-600/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 transition"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                            {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
                              <button
                                onClick={() => handleCalculateRoute(delivery.id)}
                                disabled={calculatingId === delivery.id}
                                title="Recalculate Route via Google Routes API"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 transition disabled:opacity-50"
                              >
                                <RouteIcon
                                  className={`w-3.5 h-3.5 ${
                                    calculatingId === delivery.id ? "animate-spin" : ""
                                  }`}
                                />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete delivery order ${delivery.order_number}?`
                                  )
                                ) {
                                  handleDeleteDelivery(delivery.id);
                                }
                              }}
                              title="Delete Order"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-600/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 transition"
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
        </div>

        {/* Fixed Table Footer (Pagination & Summary) */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-900 dark:text-white">{deliveries.length}</strong> of{" "}
            <strong className="text-slate-900 dark:text-white">{total}</strong> deliveries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="text-slate-500 dark:text-slate-400">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Dispatcher Create Delivery Modal */}
      <CreateDeliveryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(payload) => createDeliveryMutation.mutateAsync(payload)}
        vehicles={vehicles}
      />

      {/* Dispatcher Assign Delivery Modal */}
      <AssignDeliveryModal
        isOpen={Boolean(assigningDelivery)}
        onClose={() => setAssigningDelivery(null)}
        delivery={assigningDelivery}
        vehicles={vehicles}
        drivers={drivers}
        onAssign={(deliveryId, payload) =>
          assignDeliveryMutation.mutateAsync({ id: deliveryId, payload })
        }
      />
    </>
  );
};

export default DeliveriesPage;
