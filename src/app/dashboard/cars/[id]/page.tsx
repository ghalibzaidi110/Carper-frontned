"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import {
  useCarById,
  useRegistrationImages,
  useInspectionHistory,
  useDamageHistory,
  useUpdateCar,
} from "@/hooks/use-api";
import { formatPKR, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Car,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Gauge,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const [activeTab, setActiveTab] = useState<"overview" | "registration" | "inspection" | "damage" | "listing">("overview");
  const [editMode, setEditMode] = useState(false);

  const { data: car, isLoading } = useCarById(carId);
  const { data: regImages } = useRegistrationImages(carId);
  const { data: inspectionHistory } = useInspectionHistory(carId);
  const { data: damageHistory } = useDamageHistory(carId);
  const updateCar = useUpdateCar();

  const [editForm, setEditForm] = useState({
    color: "",
    mileage: 0,
    condition: "USED" as "NEW" | "USED" | "DAMAGED",
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!car) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Car not found</p>
          <Link href="/dashboard/cars" className="text-primary hover:underline">
            Back to My Cars
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const catalogCar = (car as Record<string, unknown>).catalogCar as Record<string, unknown> | undefined;
  const manufacturer = catalogCar?.manufacturer || car.manufacturer || "";
  const model = catalogCar?.modelName || car.model || "";
  const year = catalogCar?.year || car.year || "";
  const variant = catalogCar?.variant || car.variant || "";
  const regNumber = car.registrationNumber || "";

  // Initialize edit form when entering edit mode
  if (editMode && !editForm.color) {
    setEditForm({
      color: (car.color as string) || "",
      mileage: (car.mileage as number) || 0,
      condition: (car.condition as "NEW" | "USED" | "DAMAGED") || "USED",
    });
  }

  const handleSave = async () => {
    try {
      await updateCar.mutateAsync({
        id: carId,
        payload: editForm,
      });
      setEditMode(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const regImagesList = Array.isArray(regImages) ? regImages : regImages?.data || [];
  const inspectionVersions = inspectionHistory?.versions || [];
  const damageList = Array.isArray(damageHistory) ? damageHistory : [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "registration", label: "Registration Images" },
    { id: "inspection", label: "Inspection History" },
    { id: "damage", label: "Damage Detection" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/cars"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {manufacturer} {model} {year}
                {variant && ` ${variant}`}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Registration: {regNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/cars/${carId}/periodic`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Upload size={16} />
              Upload Periodic Images
            </Link>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Pencil size={16} />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateCar.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {updateCar.isPending && <Loader2 size={16} className="animate-spin" />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-xl font-display font-semibold text-foreground">Car Overview</h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Car Specifications */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Specifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Car size={18} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Manufacturer & Model</p>
                        <p className="text-sm font-medium text-foreground">
                          {manufacturer} {model}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Year & Variant</p>
                        <p className="text-sm font-medium text-foreground">
                          {year} {variant || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Palette size={18} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Color</p>
                        {editMode ? (
                          <input
                            type="text"
                            value={editForm.color}
                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                            className="px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground">{car.color as string}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Gauge size={18} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Mileage</p>
                        {editMode ? (
                          <input
                            type="number"
                            value={editForm.mileage}
                            onChange={(e) => setEditForm({ ...editForm, mileage: Number(e.target.value) || 0 })}
                            className="px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground">
                            {(car.mileage as number)?.toLocaleString()} km
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Condition</p>
                      {editMode ? (
                        <select
                          value={editForm.condition}
                          onChange={(e) => setEditForm({ ...editForm, condition: e.target.value as "NEW" | "USED" | "DAMAGED" })}
                          className="px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                        >
                          <option value="NEW">New</option>
                          <option value="USED">Used</option>
                          <option value="DAMAGED">Damaged</option>
                        </select>
                      ) : (
                        <StatusBadge status={car.condition as string} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Registration Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Registration Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Registration Number</p>
                      <p className="text-sm font-mono font-medium text-foreground">{regNumber}</p>
                    </div>
                    {car.vinNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground">VIN Number</p>
                        <p className="text-sm font-mono font-medium text-foreground">{car.vinNumber as string}</p>
                      </div>
                    )}
                    {car.purchaseDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Purchase Date</p>
                        <p className="text-sm font-medium text-foreground">{formatDate(car.purchaseDate as string)}</p>
                      </div>
                    )}
                    {car.purchasePrice && (
                      <div>
                        <p className="text-xs text-muted-foreground">Purchase Price</p>
                        <p className="text-sm font-medium text-foreground">{formatPKR(car.purchasePrice as number)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Status */}
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3">Image Status</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    {car.hasRegistrationImages ? (
                      <CheckCircle size={16} className="text-success" />
                    ) : (
                      <AlertTriangle size={16} className="text-warning" />
                    )}
                    <span className="text-sm text-foreground">
                      Registration Images: {car.hasRegistrationImages ? "Uploaded" : "Not Uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {car.hasPeriodicImages ? (
                      <CheckCircle size={16} className="text-success" />
                    ) : (
                      <AlertTriangle size={16} className="text-warning" />
                    )}
                    <span className="text-sm text-foreground">
                      Periodic Images: {car.hasPeriodicImages ? "Available" : "Not Available"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Images Tab */}
          {activeTab === "registration" && (
            <div className="space-y-6">
              <h2 className="text-xl font-display font-semibold text-foreground">Registration Images</h2>
              {regImagesList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No registration images uploaded</p>
                  <p className="text-sm text-muted-foreground">
                    Registration images are permanent and cannot be changed after upload.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {regImagesList.map((img: Record<string, unknown>, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {img.category as string}
                      </p>
                      <div className="aspect-[4/3] rounded-lg border border-border overflow-hidden bg-muted">
                        <img
                          src={(img.imageUrl || img.url) as string}
                          alt={img.category as string}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inspection History Tab */}
          {activeTab === "inspection" && (
            <div className="space-y-6">
              <h2 className="text-xl font-display font-semibold text-foreground">Inspection History</h2>
              {inspectionVersions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No inspection history</p>
                  <Link
                    href={`/dashboard/cars/${carId}/periodic`}
                    className="text-primary hover:underline"
                  >
                    Upload periodic images to create your first inspection →
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {inspectionVersions.map((version: Record<string, unknown>) => (
                    <div key={version.version as number} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Version {version.version as number}
                            {version.isCurrent && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                                Current
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded: {formatDate(version.uploadedAt as string)}
                          </p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-3">
                        {(version.images as Array<Record<string, unknown>> || []).map((img: Record<string, unknown>, idx: number) => (
                          <div key={idx} className="aspect-[4/3] rounded-lg border border-border overflow-hidden bg-muted">
                            <img
                              src={(img.imageUrl || img.url) as string}
                              alt={`Version ${version.version} - ${img.category}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Damage Detection Tab */}
          {activeTab === "damage" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold text-foreground">Damage Detection</h2>
                <Link
                  href="/dashboard/detection"
                  className="text-sm text-primary hover:underline"
                >
                  Go to Detection Page →
                </Link>
              </div>
              {damageList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No damage detection history</p>
                  <p className="text-sm text-muted-foreground">
                    Run damage detection on your car images to see results here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {damageList.map((detection: Record<string, unknown>) => (
                    <div key={detection.id as string} className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {detection.hasDamage ? (
                          <AlertTriangle size={20} className="text-warning" />
                        ) : (
                          <CheckCircle size={20} className="text-success" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {detection.hasDamage ? "Damage Detected" : "No Damage"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(detection.detectedAt as string)}
                          </p>
                        </div>
                      </div>
                      {detection.processedImageUrl && (
                        <div className="aspect-[4/3] rounded-lg border border-border overflow-hidden bg-muted">
                          <img
                            src={detection.processedImageUrl as string}
                            alt="Damage detection result"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

