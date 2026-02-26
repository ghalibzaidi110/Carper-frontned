"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useRentals, useCompleteRental, useCancelRental } from "@/hooks/use-api";
import { formatPKR, formatDate } from "@/lib/format";
import { Plus, Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RentalsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data: rentalData, isLoading } = useRentals(statusFilter ? { status: statusFilter } : {});
  const completeRental = useCompleteRental();
  const cancelRental = useCancelRental();

  const rawRentals = rentalData?.data || rentalData || [];
  const rentals = Array.isArray(rawRentals) ? rawRentals : rawRentals?.data || [];

  const handleComplete = (id: string) => {
    completeRental.mutate({ id, payload: {} });
  };

  const handleCancel = (id: string) => {
    if (confirm("Are you sure you want to cancel this rental?")) {
      cancelRental.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Rentals</h1>
            <p className="text-sm text-muted-foreground mt-1">{rentals.length} total rentals</p>
          </div>
          <Link href="/dashboard/rentals/create" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Create Rental
          </Link>
        </div>

        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No rentals found.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Car</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Renter</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rentals.map((r: Record<string, unknown>) => {
                    const car = r.car as Record<string, unknown> | undefined;
                    return (
                      <tr key={r.id as string} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-foreground">
                            {car ? `${car.manufacturer || (car.catalogCar as Record<string, unknown>)?.manufacturer} ${car.model || (car.catalogCar as Record<string, unknown>)?.modelName}` : "Car"}
                          </p>
                          <p className="text-xs text-muted-foreground">{car?.registrationNumber as string}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-foreground">{r.renterName as string}</p>
                          <p className="text-xs text-muted-foreground">{r.renterPhone as string}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">{formatDate(r.startDate as string)} – {formatDate(r.endDate as string)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-foreground">{formatPKR(r.rentalPrice as number)}</td>
                        <td className="px-4 py-4"><StatusBadge status={r.status as string} /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                            {(r.status as string) === "ACTIVE" && (
                              <>
                                <button onClick={() => handleComplete(r.id as string)} className="p-2 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success"><CheckCircle size={16} /></button>
                                <button onClick={() => handleCancel(r.id as string)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><XCircle size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
