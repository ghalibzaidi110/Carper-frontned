import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { DUMMY_RENTALS } from "@/data/dummy";
import { formatPKR, formatDate } from "@/lib/format";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";

const RentalsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Rentals</h1>
            <p className="text-sm text-muted-foreground mt-1">{DUMMY_RENTALS.length} total rentals</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Create Rental
          </button>
        </div>

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
                {DUMMY_RENTALS.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-foreground">{r.car.manufacturer} {r.car.model} {r.car.year}</p>
                      <p className="text-xs text-muted-foreground">{r.car.registrationNumber}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-foreground">{r.renterName}</p>
                      <p className="text-xs text-muted-foreground">{r.renterPhone}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-foreground">{formatPKR(r.rentalPrice)}</td>
                    <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                        {r.status === "ACTIVE" && (
                          <>
                            <button className="p-2 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success"><CheckCircle size={16} /></button>
                            <button className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><XCircle size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RentalsPage;
