import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { DUMMY_CATALOG } from "@/data/dummy";
import { formatPKR } from "@/lib/format";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

const AdminCatalogPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Car Catalog</h1>
            <p className="text-sm text-muted-foreground mt-1">{DUMMY_CATALOG.length} models</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Add New Model
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Manufacturer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DUMMY_CATALOG.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-foreground">{c.manufacturer}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{c.modelName}</td>
                    <td className="px-4 py-4 text-sm text-foreground">{c.year}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{c.variant}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{c.bodyType}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-foreground">{formatPKR(c.basePrice)}</td>
                    <td className="px-4 py-4"><span className={c.isActive ? "text-success" : "text-destructive"}>
                      {c.isActive ? "✅" : "❌"}
                    </span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
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

export default AdminCatalogPage;
