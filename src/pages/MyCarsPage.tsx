import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { DUMMY_CARS } from "@/data/dummy";
import { formatPKR, formatDate } from "@/lib/format";
import { Plus, Eye, Pencil, Trash2, Upload } from "lucide-react";

const MyCarsPage = () => {
  const { user } = useAuth();
  const cars = DUMMY_CARS.filter((c) => c.userId === user?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">My Cars</h1>
            <p className="text-sm text-muted-foreground mt-1">{cars.length} registered vehicles</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Register New Car
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Car</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condition</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mileage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Images</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cars.map((car) => (
                  <tr key={car.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{car.manufacturer} {car.model} {car.year}</p>
                        <p className="text-xs text-muted-foreground">{car.variant} • {car.color}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-foreground">{car.registrationNumber}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={car.condition} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-foreground">{car.mileage.toLocaleString()} km</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${car.hasRegistrationImages ? "text-success" : "text-destructive"}`}>
                          {car.hasRegistrationImages ? "✅ Reg" : "❌ Reg"}
                        </span>
                        <span className={`text-xs ${car.hasPeriodicImages ? "text-success" : "text-warning"}`}>
                          {car.hasPeriodicImages ? "✅ Periodic" : "⏳ Periodic"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Upload size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
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

export default MyCarsPage;
