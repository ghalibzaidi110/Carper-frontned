"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserCars, useCreateRental } from "@/hooks/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { formatPKR } from "@/lib/format";
import { ArrowLeft, Shield, Loader2, CheckCircle, Car } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateRentalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cars, isLoading: carsLoading } = useUserCars();
  const createRental = useCreateRental();

  const [form, setForm] = useState({
    carId: "",
    renterName: "",
    renterPhone: "",
    renterEmail: "",
    renterCnic: "",
    startDate: "",
    endDate: "",
    mileageAtStart: "",
    rentalPrice: "",
    preRentalNotes: "",
  });

  const carList = Array.isArray(cars) ? cars : cars?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!user?.isVerified) {
      toast.error("Please verify your CNIC before creating a rental");
      router.push("/dashboard/profile");
      return;
    }

    if (!form.carId || !form.renterName || !form.startDate || !form.endDate || !form.rentalPrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    const price = Number(form.rentalPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid rental price");
      return;
    }

    const mileage = form.mileageAtStart ? Number(form.mileageAtStart) : undefined;
    if (mileage !== undefined && (isNaN(mileage) || mileage < 0)) {
      toast.error("Please enter a valid mileage");
      return;
    }

    try {
      await createRental.mutateAsync({
        carId: form.carId,
        renterName: form.renterName,
        renterPhone: form.renterPhone || undefined,
        renterEmail: form.renterEmail || undefined,
        renterCnic: form.renterCnic || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        mileageAtStart: mileage,
        rentalPrice: price,
        preRentalNotes: form.preRentalNotes || undefined,
      });
      toast.success("Rental created successfully!");
      router.push("/dashboard/rentals");
    } catch (error) {
      // Error handled by hook
    }
  };

  const selectedCar = carList.find((c: Record<string, unknown>) => c.id === form.carId);
  const catalogCar = selectedCar?.catalogCar as Record<string, unknown> | undefined;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/rentals"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Create New Rental</h1>
            <p className="text-sm text-muted-foreground mt-1">Record a new car rental</p>
          </div>
        </div>

        {/* CNIC Verification Warning */}
        {!user?.isVerified && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
            <Shield size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">CNIC Verification Required</p>
              <p className="text-sm text-muted-foreground mb-2">
                Please verify your CNIC before creating rentals.
              </p>
              <Link href="/dashboard/profile" className="text-sm text-primary hover:underline">
                Go to Profile →
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
          {/* Vehicle Selection */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Vehicle</h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Car *
              </label>
              {carsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : carList.length === 0 ? (
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    No cars registered. Please register a car first.
                  </p>
                  <Link
                    href="/dashboard/cars/register"
                    className="text-sm text-primary hover:underline"
                  >
                    Register a new car →
                  </Link>
                </div>
              ) : (
                <select
                  value={form.carId}
                  onChange={(e) => setForm({ ...form, carId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a car</option>
                  {carList.map((car: Record<string, unknown>) => {
                    const catalog = car.catalogCar as Record<string, unknown> | undefined;
                    const manufacturer = catalog?.manufacturer || car.manufacturer || "";
                    const model = catalog?.modelName || car.model || "";
                    const year = catalog?.year || car.year || "";
                    const regNumber = car.registrationNumber || "";
                    return (
                      <option key={car.id as string} value={car.id as string}>
                        {manufacturer} {model} {year} ({regNumber})
                      </option>
                    );
                  })}
                </select>
              )}

              {selectedCar && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Car size={32} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {catalogCar?.manufacturer || selectedCar.manufacturer}{" "}
                        {catalogCar?.modelName || selectedCar.model}{" "}
                        {catalogCar?.year || selectedCar.year}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Registration: {selectedCar.registrationNumber as string}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Renter Information */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Renter Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Renter Name *
                </label>
                <input
                  type="text"
                  value={form.renterName}
                  onChange={(e) => setForm({ ...form, renterName: e.target.value })}
                  required
                  placeholder="Hassan Ali"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Renter Phone
                </label>
                <input
                  type="tel"
                  value={form.renterPhone}
                  onChange={(e) => setForm({ ...form, renterPhone: e.target.value })}
                  placeholder="+923009876543"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Renter Email
                </label>
                <input
                  type="email"
                  value={form.renterEmail}
                  onChange={(e) => setForm({ ...form, renterEmail: e.target.value })}
                  placeholder="hassan@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Renter CNIC
                </label>
                <input
                  type="text"
                  value={form.renterCnic}
                  onChange={(e) => setForm({ ...form, renterCnic: e.target.value })}
                  placeholder="35201-1234567-8"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Rental Period */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Rental Period</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                  min={form.startDate || new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Rental Details */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Rental Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mileage at Start (km)
                </label>
                <input
                  type="number"
                  value={form.mileageAtStart}
                  onChange={(e) => setForm({ ...form, mileageAtStart: e.target.value })}
                  placeholder="45000"
                  min="0"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Rental Price (PKR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₨</span>
                  <input
                    type="number"
                    value={form.rentalPrice}
                    onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })}
                    required
                    placeholder="15000"
                    min="0"
                    step="1000"
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {form.rentalPrice && !isNaN(Number(form.rentalPrice)) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatPKR(Number(form.rentalPrice))}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Pre-Rental Notes
              </label>
              <textarea
                value={form.preRentalNotes}
                onChange={(e) => setForm({ ...form, preRentalNotes: e.target.value })}
                rows={3}
                placeholder="Note any existing damage, scratches, or special conditions..."
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/dashboard/rentals"
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!user?.isVerified || createRental.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createRental.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Create Rental
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

