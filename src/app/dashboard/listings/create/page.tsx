"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserCars, useCreateListing } from "@/hooks/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { formatPKR } from "@/lib/format";
import { ArrowLeft, CheckCircle, AlertCircle, Shield, Loader2, Car } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cars, isLoading: carsLoading } = useUserCars();
  const createListing = useCreateListing();

  const [form, setForm] = useState({
    carId: "",
    askingPrice: "",
    title: "",
    description: "",
    isNegotiable: false,
  });

  const carList = Array.isArray(cars) ? cars : cars?.data || [];
  
  // Filter cars that are eligible for listing
  const eligibleCars = carList.filter((car: Record<string, unknown>) => {
    const hasRegImages = car.hasRegistrationImages || 
      (car as Record<string, Record<string, unknown>>).catalogCar?.hasRegistrationImages;
    return hasRegImages;
  });

  const selectedCar = carList.find((c: Record<string, unknown>) => c.id === form.carId);
  const catalogCar = selectedCar?.catalogCar as Record<string, unknown> | undefined;

  // Auto-generate title if car is selected
  useEffect(() => {
    if (selectedCar && !form.title) {
      const manufacturer = catalogCar?.manufacturer || selectedCar.manufacturer || "";
      const model = catalogCar?.modelName || selectedCar.model || "";
      const year = catalogCar?.year || selectedCar.year || "";
      const variant = catalogCar?.variant || selectedCar.variant || "";
      const regNumber = selectedCar.registrationNumber || "";
      
      const title = `${manufacturer} ${model} ${year}${variant ? ` ${variant}` : ""} - ${regNumber}`;
      setForm((prev) => ({ ...prev, title }));
    }
  }, [selectedCar, catalogCar, form.title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!user?.isVerified) {
      toast.error("Please verify your CNIC before creating a listing");
      router.push("/dashboard/profile");
      return;
    }

    if (!form.carId) {
      toast.error("Please select a car");
      return;
    }

    if (!form.title || !form.askingPrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    const price = Number(form.askingPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await createListing.mutateAsync({
        carId: form.carId,
        askingPrice: price,
        title: form.title,
        description: form.description || undefined,
        isNegotiable: form.isNegotiable,
      });
      toast.success("Listing created successfully!");
      router.push("/dashboard/listings");
    } catch (error) {
      // Error handled by hook
    }
  };

  const requirements = [
    {
      met: user?.isVerified || false,
      label: "CNIC verified",
      icon: Shield,
    },
    {
      met: selectedCar ? (selectedCar.hasRegistrationImages || false) : false,
      label: "Registration images uploaded",
      icon: Car,
    },
    {
      met: !selectedCar || !carList.some((c: Record<string, unknown>) => {
        const listings = c.listings as Array<Record<string, unknown>> | undefined;
        return listings?.some((l: Record<string, unknown>) => 
          l.carId === form.carId && l.status === "ACTIVE"
        );
      }),
      label: "No active listing for this car",
      icon: CheckCircle,
    },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/listings"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Create New Listing</h1>
            <p className="text-sm text-muted-foreground mt-1">List your car on the marketplace</p>
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Requirements</h3>
          <div className="space-y-3">
            {requirements.map((req, idx) => {
              const Icon = req.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    req.met ? "bg-success/10 border border-success/20" : "bg-warning/10 border border-warning/20"
                  }`}
                >
                  {req.met ? (
                    <CheckCircle size={20} className="text-success" />
                  ) : (
                    <AlertCircle size={20} className="text-warning" />
                  )}
                  <Icon size={18} className={req.met ? "text-success" : "text-warning"} />
                  <span className={`text-sm font-medium ${req.met ? "text-success" : "text-warning"}`}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
          {!allRequirementsMet && (
            <p className="mt-4 text-sm text-muted-foreground">
              Please complete all requirements before creating a listing.
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
          {/* Select Car */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Car *
            </label>
            {carsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : eligibleCars.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  No eligible cars found. Please register a car with registration images first.
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
                {eligibleCars.map((car: Record<string, unknown>) => {
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

            {/* Selected Car Preview */}
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
                    <p className="text-sm text-muted-foreground">
                      {selectedCar.color as string} • {(selectedCar.mileage as number)?.toLocaleString()} km
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Listing Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g., Toyota Corolla 2022 - Excellent Condition"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              A clear, descriptive title helps buyers find your car
            </p>
          </div>

          {/* Asking Price */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Asking Price (PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₨</span>
              <input
                type="number"
                value={form.askingPrice}
                onChange={(e) => setForm({ ...form, askingPrice: e.target.value })}
                required
                min="0"
                step="1000"
                placeholder="4500000"
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {form.askingPrice && !isNaN(Number(form.askingPrice)) && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatPKR(Number(form.askingPrice))}
              </p>
            )}
          </div>

          {/* Negotiable */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="negotiable"
              checked={form.isNegotiable}
              onChange={(e) => setForm({ ...form, isNegotiable: e.target.checked })}
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="negotiable" className="text-sm font-medium text-foreground cursor-pointer">
              Price is negotiable
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              placeholder="Describe your car's condition, features, history, and any other relevant information..."
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.description.length} characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/dashboard/listings"
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!allRequirementsMet || createListing.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createListing.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Publish Listing
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

