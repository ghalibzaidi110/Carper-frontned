"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useCarById, useUploadPeriodicImages } from "@/hooks/use-api";
import { Upload, X, Loader2, ChevronLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ImageFiles {
  front: File | null;
  back: File | null;
  left: File | null;
  right: File | null;
}

export default function UploadPeriodicImagesPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  
  const { data: car, isLoading } = useCarById(carId);
  const uploadImages = useUploadPeriodicImages();

  const [imageFiles, setImageFiles] = useState<ImageFiles>({
    front: null,
    back: null,
    left: null,
    right: null,
  });
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

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
  const regNumber = car.registrationNumber || "";

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

  const handleSubmit = async () => {
    // Validate all images are uploaded
    if (!imageFiles.front || !imageFiles.back || !imageFiles.left || !imageFiles.right) {
      toast.error("Please upload all 4 periodic images");
      return;
    }

    try {
      await uploadImages.mutateAsync({
        carId,
        files: {
          front: imageFiles.front!,
          back: imageFiles.back!,
          left: imageFiles.left!,
          right: imageFiles.right!,
        },
      });
      toast.success("Periodic images uploaded successfully! A new inspection version has been created.");
      router.push(`/dashboard/cars/${carId}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  const allImagesUploaded = imageFiles.front && imageFiles.back && imageFiles.left && imageFiles.right;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/cars/${carId}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Upload Periodic Images</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {manufacturer} {model} {year} ({regNumber})
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-info/10 border border-info/20 rounded-xl p-4">
          <p className="text-sm text-foreground">
            <strong>Note:</strong> This will create a new inspection version. Previous versions are preserved and can be viewed in the inspection history.
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
          <h2 className="text-xl font-display font-semibold text-foreground">
            Upload 4 Periodic Inspection Images
          </p>
          <p className="text-sm text-muted-foreground">
            Upload images from the same angles as your registration images: front, back, left, and right.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {(["front", "back", "left", "right"] as const).map((position) => (
              <div key={position} className="space-y-2">
                <label className="block text-sm font-medium text-foreground capitalize">
                  {position} View *
                </label>
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

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Link
              href={`/dashboard/cars/${carId}`}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={!allImagesUploaded || uploadImages.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploadImages.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Upload Images
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

