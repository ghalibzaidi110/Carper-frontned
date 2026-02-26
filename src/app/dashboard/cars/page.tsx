"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useUserCars, useDeleteCar } from "@/hooks/use-api";
import { Plus, Eye, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import Link from "next/link";

export default function MyCarsPage() {
  const { data: cars, isLoading } = useUserCars();
  const deleteCar = useDeleteCar();
  const carList = Array.isArray(cars) ? cars : cars?.data || [];

  const handleDelete = (id: string) => {
    if (confirm("Are you sure? This will also remove all images and listings.")) {
      deleteCar.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">My Cars</h1>
            <p className="text-sm text-muted-foreground mt-1">{carList.length} registered vehicles</p>
          </div>
          <Link href="/dashboard/cars/register" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Register New Car
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : carList.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No cars registered yet. Register your first car to get started.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Car</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condition</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mileage</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carList.map((car: Record<string, unknown>) => (
                    <tr key={car.id as string} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {(car.manufacturer || (car.catalogCar as Record<string, unknown>)?.manufacturer) as string}{" "}
                            {(car.model || (car.catalogCar as Record<string, unknown>)?.modelName) as string}{" "}
                            {(car.year || (car.catalogCar as Record<string, unknown>)?.year) as string}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(car.variant || (car.catalogCar as Record<string, unknown>)?.variant || "") as string} • {car.color as string}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-mono text-foreground">{car.registrationNumber as string}</span>
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={car.condition as string} /></td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">{(car.mileage as number)?.toLocaleString()} km</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">{car.color as string}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/cars/${car.id}`} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Eye size={16} /></Link>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                          <Link href={`/dashboard/cars/${car.id}/periodic`} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Upload size={16} /></Link>
                          <button onClick={() => handleDelete(car.id as string)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
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
