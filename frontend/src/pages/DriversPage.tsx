import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  useCreateDriver,
  useDeleteDriver,
  useDrivers,
  useUpdateDriver,
} from "../hooks/useDrivers";
import { DriverCard } from "../components/DriverCard";
import { DriverForm } from "../components/DriverForm";
import { Driver, DriverCreatePayload } from "../types/fleet";

export const DriversPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isActiveParam =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const {
    data: driverData,
    isLoading: isLoadingDrivers,
    isFetching,
    refetch,
  } = useDrivers({
    page,
    size: 20,
    is_active: isActiveParam,
    search: searchTerm || undefined,
  });

  const createDriverMutation = useCreateDriver();
  const updateDriverMutation = useUpdateDriver();
  const deleteDriverMutation = useDeleteDriver();

  const handleOpenCreate = () => {
    setEditingDriver(null);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleFormSubmit = async (payload: DriverCreatePayload) => {
    setActionError(null);
    if (editingDriver) {
      await updateDriverMutation.mutateAsync({
        id: editingDriver.id,
        payload,
      });
    } else {
      await createDriverMutation.mutateAsync(payload);
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (
      window.confirm(
        `Are you sure you want to remove driver ${driver.license_number}? All active vehicle assignments will be unlinked.`
      )
    ) {
      try {
        await deleteDriverMutation.mutateAsync(driver.id);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axErr = err as { response?: { data?: { detail?: string } } };
          setActionError(axErr.response?.data?.detail || "Failed to delete driver");
        }
      }
    }
  };

  const drivers = driverData?.items || [];
  const totalCount = driverData?.total || 0;
  const totalPages = driverData?.pages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-400" />
            Certified Driver Roster
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Driver profiles, license verifications, contact numbers, and vehicle assignments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all"
            title="Refresh drivers roster"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-400" : ""}`}
            />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Driver</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search license, phone, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Driver Statuses</option>
            <option value="active">Active Certified</option>
            <option value="inactive">Inactive</option>
          </select>

          <span className="text-xs text-slate-500 font-mono">
            {totalCount} registered drivers
          </span>
        </div>
      </div>

      {/* Drivers Grid */}
      {isLoadingDrivers ? (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading driver profiles...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">No drivers found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            No driver profiles match your criteria. You can register a new driver using their user ID.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivers.map((d) => (
            <DriverCard
              key={d.id}
              driver={d}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} ({totalCount} total drivers)
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Driver Form Modal */}
      <DriverForm
        initialData={editingDriver}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={createDriverMutation.isPending || updateDriverMutation.isPending}
      />
    </div>
  );
};
