import React, { useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Truck,
} from "lucide-react";
import {
  useAssignDriver,
  useCreateVehicle,
  useDeleteVehicle,
  useUnassignDriver,
  useUpdateVehicle,
  useVehicles,
} from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import { VehicleTable } from "../components/VehicleTable";
import { VehicleForm } from "../components/VehicleForm";
import { AssignDriverModal } from "../components/AssignDriverModal";
import { Vehicle, VehicleCreatePayload } from "../types/fleet";
import { useAuthStore } from "../store/authStore";

export const VehiclesPage: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === "ADMIN";
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // TanStack Query hooks
  const {
    data: vehicleData,
    isLoading: isLoadingVehicles,
    isFetching,
    refetch,
  } = useVehicles({
    page,
    size: 15,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    search: searchTerm || undefined,
  });

  const { data: driverData } = useDrivers({ is_active: true, size: 100 });

  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();
  const assignDriverMutation = useAssignDriver();
  const unassignDriverMutation = useUnassignDriver();

  // Handlers
  const handleOpenCreate = () => {
    setEditingVehicle(null);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleFormSubmit = async (payload: VehicleCreatePayload) => {
    setActionError(null);
    if (editingVehicle) {
      await updateVehicleMutation.mutateAsync({
        id: editingVehicle.id,
        payload,
      });
    } else {
      await createVehicleMutation.mutateAsync(payload);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (
      window.confirm(
        `Are you sure you want to soft-delete vehicle ${vehicle.plate_number}? Any active assignments will be released.`
      )
    ) {
      try {
        await deleteVehicleMutation.mutateAsync(vehicle.id);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axErr = err as { response?: { data?: { detail?: string } } };
          setActionError(axErr.response?.data?.detail || "Failed to delete vehicle");
        }
      }
    }
  };

  const handleAssignDriver = (vehicle: Vehicle) => {
    setAssigningVehicle(vehicle);
    setActionError(null);
  };

  const handleConfirmAssignment = async (vehicleId: string, driverId: string) => {
    await assignDriverMutation.mutateAsync({ vehicleId, driverId });
  };

  const handleUnassignDriver = async (vehicle: Vehicle) => {
    if (
      window.confirm(
        `Unassign driver ${vehicle.current_driver?.license_number} from vehicle ${vehicle.plate_number}?`
      )
    ) {
      try {
        await unassignDriverMutation.mutateAsync(vehicle.id);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axErr = err as { response?: { data?: { detail?: string } } };
          setActionError(axErr.response?.data?.detail || "Failed to unassign driver");
        }
      }
    }
  };

  const vehicles = vehicleData?.items || [];
  const totalCount = vehicleData?.total || 0;
  const totalPages = vehicleData?.pages || 1;

  return (
    <>
      <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Fleet Vehicles Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Physical vehicle assets, live telemetry coordinates, and real-time operational status.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-sm"
            title="Refresh fleet"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-500 dark:text-indigo-400" : ""}`}
            />
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center space-x-3 text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-72 lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search plate, make, or model..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="IDLE">IDLE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="TRUCK">TRUCK</option>
            <option value="VAN">VAN</option>
            <option value="CAR">CAR</option>
            <option value="MOTORCYCLE">MOTORCYCLE</option>
          </select>

          <span className="col-span-2 text-center sm:text-left text-xs text-slate-500 font-mono sm:inline-block">
            {totalCount} total
          </span>
        </div>
      </div>

      {/* Main Vehicles Table */}
      <VehicleTable
        vehicles={vehicles}
        isLoading={isLoadingVehicles}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onAssignDriver={handleAssignDriver}
        onUnassignDriver={handleUnassignDriver}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} ({totalCount} total vehicles)
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Vehicle Create / Edit Modal */}
      <VehicleForm
        initialData={editingVehicle}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createVehicleMutation.isPending || updateVehicleMutation.isPending}
      />

      {/* Driver Assignment Modal */}
      <AssignDriverModal
        vehicle={assigningVehicle}
        isOpen={!!assigningVehicle}
        onClose={() => setAssigningVehicle(null)}
        onAssign={handleConfirmAssignment}
        drivers={driverData?.items || []}
        isLoading={assignDriverMutation.isPending}
      />
    </>
  );
};
