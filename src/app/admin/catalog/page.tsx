"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useCatalog, useDeleteCatalog, useCreateCatalog } from "@/hooks/use-api";
import { formatPKR } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

export default function AdminCatalogPage() {
  const { data: catalogData, isLoading } = useCatalog({ limit: 100 });
  const deleteCatalog = useDeleteCatalog();
  const createCatalog = useCreateCatalog();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    manufacturer: "", modelName: "", year: 2024, variant: "",
    bodyType: "", fuelType: "", transmission: "", engineCapacity: "",
    seatingCapacity: 5, basePrice: 0, description: "",
  });

  const rawCatalog = catalogData?.data || catalogData || [];
  const catalog = Array.isArray(rawCatalog) ? rawCatalog : rawCatalog?.data || [];

  const handleDelete = (id: string) => {
    if (confirm("Delete this catalog entry?")) {
      deleteCatalog.mutate(id);
    }
  };

  const handleCreate = async () => {
    await createCatalog.mutateAsync(form);
    setShowForm(false);
    setForm({ manufacturer: "", modelName: "", year: 2024, variant: "", bodyType: "", fuelType: "", transmission: "", engineCapacity: "", seatingCapacity: 5, basePrice: 0, description: "" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Car Catalog</h1>
            <p className="text-sm text-muted-foreground mt-1">{catalog.length} models</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add New Model"}
          </button>
        </div>

        {showForm && (
          <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">New Catalog Entry</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <input placeholder="Manufacturer *" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input placeholder="Model Name *" value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input type="number" placeholder="Year *" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input placeholder="Variant" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input placeholder="Body Type" value={form.bodyType} onChange={(e) => setForm({ ...form, bodyType: e.target.value })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input placeholder="Fuel Type" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input placeholder="Transmission" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
              <input type="number" placeholder="Base Price (PKR)" value={form.basePrice || ""} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
            </div>
            <button
              onClick={handleCreate}
              disabled={!form.manufacturer || !form.modelName || createCatalog.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {createCatalog.isPending && <Loader2 size={14} className="animate-spin" />}
              Create Entry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
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
                  {catalog.map((c: Record<string, unknown>) => (
                    <tr key={c.id as string} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-foreground">{c.manufacturer as string}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{c.modelName as string}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{c.year as number}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{(c.variant || "") as string}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{(c.bodyType || "") as string}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-foreground">{c.basePrice ? formatPKR(c.basePrice as number) : "N/A"}</td>
                      <td className="px-4 py-4">
                        <span className={c.isActive ? "text-success" : "text-destructive"}>
                          {c.isActive ? "✅" : "❌"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(c.id as string)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
