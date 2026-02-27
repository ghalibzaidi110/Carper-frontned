"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useManufacturers, useModelsByManufacturer, useCatalog } from "@/hooks/use-api";
import { useRegisterCar, useUploadRegistrationImages } from "@/hooks/use-api";
import { formatPKR } from "@/lib/format";
import { ChevronLeft, ChevronRight, Upload, X, Loader2, Car, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SelectedCatalog {
  id: string;
  manufacturer: string;
  modelName: string;
  year: number;
  variant?: string;
  basePrice?: number;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
}

interface CarDetails {
  registrationNumber: string;
  vinNumber: string;
  color: string;
  mileage: number;
  condition: "NEW" | "USED" | "DAMAGED";
  purchaseDate: string;
  purchasePrice: number;
}

interface ImageFiles {
  front: File | null;
  back: File | null;
  left: File | null;
  right: File | null;
}

export default function RegisterCarPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState<SelectedCatalog | null>(null);
  const [carDetails, setCarDetails] = useState<CarDetails>({
    registrationNumber: "",
    vinNumber: "",
    color: "",
    mileage: 0,
    condition: "USED",
    purchaseDate: "",
    purchasePrice: 0,
  });
  const [imageFiles, setImageFiles] = useState<ImageFiles>({
    front: null,
    back: null,
    left: null,
    right: null,
  });
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [registeredCarId, setRegisteredCarId] = useState<string | null>(null);

  const { data: manufacturers = [] } = useManufacturers();
  const { data: models = [] } = useModelsByManufacturer(selectedManufacturer);
  const { data: catalogData } = useCatalog({
    manufacturer: selectedManufacturer || undefined,
    modelName: selectedModel || undefined,
    yearFrom: selectedYear ? Number(selectedYear) : undefined,
    yearTo: selectedYear ? Number(selectedYear) : undefined,
    limit: 10,
  });

  const registerCar = useRegisterCar();
  const uploadImages = useUploadRegistrationImages();

  // Get available years and variants from models
  const currentModel = models.find((m: Record<string, unknown>) => m.modelName === selectedModel);
  const availableYears = currentModel?.years || [];
  const availableVariants = currentModel?.variants || [];

  // When catalog entry is found, set it
  const catalogEntries = Array.isArray(catalogData?.data) ? catalogData.data : catalogData?.data?.data || [];
  const catalogEntry = catalogEntries.find(
    (c: Record<string, unknown>) =>
      c.manufacturer === selectedManufacturer &&
      c.modelName === selectedModel &&
      c.year === Number(selectedYear) &&
      (!selectedVariant || !c.variant || c.variant === selectedVariant)
  );

  const handleManufacturerChange = (mfr: string) => {
    setSelectedManufacturer(mfr);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedVariant("");
    setSelectedCatalog(null);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedYear("");
    setSelectedVariant("");
    setSelectedCatalog(null);
  };

  const handleYearChange = (year: number | "") => {
    setSelectedYear(year);
    setSelectedVariant("");
    setSelectedCatalog(null);
  };

  const handleVariantChange = (variant: string) => {
    setSelectedVariant(variant);
    if (catalogEntry) {
      setSelectedCatalog({
        id: catalogEntry.id as string,
        manufacturer: catalogEntry.manufacturer as string,
        modelName: catalogEntry.modelName as string,
        year: catalogEntry.year as number,
        variant: catalogEntry.variant as string,
        basePrice: catalogEntry.basePrice as number,
        bodyType: catalogEntry.bodyType as string,
        fuelType: catalogEntry.fuelType as string,
        transmission: catalogEntry.transmission as string,
      });
    }
  };

  const handleImageSelect = (position: keyof ImageFiles, file: File | null) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB");
        return;
      }
      setImageFiles((prev) => ({ ...prev, [position]: file }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => ({ ...prev, [position]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setImageFiles((prev) => ({ ...prev, [position]: null }));
      setImagePreviews((prev => {
        const next = { ...prev };
        delete next[position];
        return next;
      }));
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Validate step 1
      if (!selectedManufacturer || !selectedModel || !selectedYear) {
        toast.error("Please select manufacturer, model, and year");
        return;
      }
      if (catalogEntry) {
        setSelectedCatalog({
          id: catalogEntry.id as string,
          manufacturer: catalogEntry.manufacturer as string,
          modelName: catalogEntry.modelName as string,
          year: catalogEntry.year as number,
          variant: catalogEntry.variant as string,
          basePrice: catalogEntry.basePrice as number,
          bodyType: catalogEntry.bodyType as string,
          fuelType: catalogEntry.fuelType as string,
          transmission: catalogEntry.transmission as string,
        });
      } else {
        toast.error("Catalog entry not found. Please select a valid combination.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate step 2
      if (!carDetails.registrationNumber || !carDetails.color || !carDetails.mileage) {
        toast.error("Please fill in all required fields");
        return;
      }
      // Register the car
      try {
        const result = await registerCar.mutateAsync({
          catalogId: selectedCatalog!.id,
          registrationNumber: carDetails.registrationNumber,
          vinNumber: carDetails.vinNumber || undefined,
          color: carDetails.color,
          mileage: carDetails.mileage,
          condition: carDetails.condition,
          purchaseDate: carDetails.purchaseDate || undefined,
          purchasePrice: carDetails.purchasePrice || undefined,
        });
        setRegisteredCarId(result.id);
        setStep(3);
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!registeredCarId) {
      toast.error("Car registration failed. Please try again.");
      return;
    }

    // Validate all images are uploaded
    if (!imageFiles.front || !imageFiles.back || !imageFiles.left || !imageFiles.right) {
      toast.error("Please upload all 4 registration images");
      return;
    }

    try {
      await uploadImages.mutateAsync({
        carId: registeredCarId,
        files: {
          front: imageFiles.front!,
          back: imageFiles.back!,
          left: imageFiles.left!,
          right: imageFiles.right!,
        },
      });
      toast.success("Car registered successfully!");
      router.push(`/dashboard/cars/${registeredCarId}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  const canProceedStep1 = selectedManufacturer && selectedModel && selectedYear && catalogEntry;
  const canProceedStep2 = carDetails.registrationNumber && carDetails.color && carDetails.mileage > 0;
  const canProceedStep3 = imageFiles.front && imageFiles.back && imageFiles.left && imageFiles.right;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Register New Car</h1>
          <p className="text-sm text-muted-foreground mt-1">Step {step} of 3: {step === 1 ? "Select Car Model" : step === 2 ? "Enter Car Details" : "Upload Registration Images"}</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                <p className={`text-xs mt-2 text-center ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Select Model" : s === 2 ? "Car Details" : "Upload Images"}
                </p>
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select from Catalog */}
        {step === 1 && (
          <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
            <h2 className="text-xl font-display font-semibold text-foreground">Select Your Car Model</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Manufacturer *</label>
                <select
                  value={selectedManufacturer}
                  onChange={(e) => handleManufacturerChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map((m: string) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Model *</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={!selectedManufacturer}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select Model</option>
                  {models.map((m: Record<string, unknown>) => (
                    <option key={m.modelName as string} value={m.modelName as string}>
                      {m.modelName as string}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Year *</label>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value ? Number(e.target.value) : "")}
                  disabled={!selectedModel}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select Year</option>
                  {availableYears.map((y: number) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Variant</label>
                <select
                  value={selectedVariant}
                  onChange={(e) => handleVariantChange(e.target.value)}
                  disabled={!selectedYear}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select Variant (Optional)</option>
                  {availableVariants.map((v: string) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Catalog Entry Preview */}
            {selectedCatalog && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Car size={32} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-foreground">
                      {selectedCatalog.manufacturer} {selectedCatalog.modelName} {selectedCatalog.year}
                      {selectedCatalog.variant && ` ${selectedCatalog.variant}`}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCatalog.bodyType && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{selectedCatalog.bodyType}</span>
                      )}
                      {selectedCatalog.fuelType && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{selectedCatalog.fuelType}</span>
                      )}
                      {selectedCatalog.transmission && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{selectedCatalog.transmission}</span>
                      )}
                    </div>
                    {selectedCatalog.basePrice && (
                      <p className="text-sm font-semibold text-primary mt-2">Base Price: {formatPKR(selectedCatalog.basePrice)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => router.push("/dashboard/cars")}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceedStep1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Car Details */}
        {step === 2 && (
          <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
            <h2 className="text-xl font-display font-semibold text-foreground">Enter Your Car Details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Registration Number *</label>
                <input
                  type="text"
                  value={carDetails.registrationNumber}
                  onChange={(e) => setCarDetails({ ...carDetails, registrationNumber: e.target.value.toUpperCase() })}
                  placeholder="LEA-1234"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">VIN Number</label>
                <input
                  type="text"
                  value={carDetails.vinNumber}
                  onChange={(e) => setCarDetails({ ...carDetails, vinNumber: e.target.value.toUpperCase() })}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Color *</label>
                <input
                  type="text"
                  value={carDetails.color}
                  onChange={(e) => setCarDetails({ ...carDetails, color: e.target.value })}
                  placeholder="White"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Mileage (km) *</label>
                <input
                  type="number"
                  value={carDetails.mileage || ""}
                  onChange={(e) => setCarDetails({ ...carDetails, mileage: Number(e.target.value) || 0 })}
                  placeholder="45000"
                  min="0"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Condition *</label>
                <select
                  value={carDetails.condition}
                  onChange={(e) => setCarDetails({ ...carDetails, condition: e.target.value as "NEW" | "USED" | "DAMAGED" })}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="NEW">New</option>
                  <option value="USED">Used</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Purchase Date</label>
                <input
                  type="date"
                  value={carDetails.purchaseDate}
                  onChange={(e) => setCarDetails({ ...carDetails, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Purchase Price (PKR)</label>
                <input
                  type="number"
                  value={carDetails.purchasePrice || ""}
                  onChange={(e) => setCarDetails({ ...carDetails, purchasePrice: Number(e.target.value) || 0 })}
                  placeholder="4200000"
                  min="0"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceedStep2 || registerCar.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {registerCar.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    Register Car
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload Registration Images */}
        {step === 3 && (
          <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
            <h2 className="text-xl font-display font-semibold text-foreground">Upload Registration Images</h2>
            <p className="text-sm text-muted-foreground">Upload 4 images of your car from different angles. These images are permanent and will serve as your car's baseline record.</p>

            <div className="grid md:grid-cols-2 gap-4">
              {(["front", "back", "left", "right"] as const).map((position) => (
                <div key={position} className="space-y-2">
                  <label className="block text-sm font-medium text-foreground capitalize">{position} View *</label>
                  <div className="relative">
                    <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden group hover:border-primary transition-colors">
                      {imagePreviews[position] ? (
                        <>
                          <img src={imagePreviews[position]} alt={position} className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleImageSelect(position, null)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">Click to upload</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Max 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageSelect(position, e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  {imageFiles[position] && (
                    <p className="text-xs text-muted-foreground">
                      {(imageFiles[position]!.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <button
                onClick={handleBack}
                disabled={uploadImages.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={!canProceedStep3 || uploadImages.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadImages.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Complete Registration
                    <CheckCircle size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

