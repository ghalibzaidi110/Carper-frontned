import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { carsService, RegisterCarPayload, UpdateCarPayload } from "@/services/cars.service";
import { carImagesService } from "@/services/car-images.service";
import { catalogService, CatalogFilters, CreateCatalogPayload } from "@/services/catalog.service";
import { listingsService, ListingFilters, CreateListingPayload, UpdateListingPayload, ContactSellerPayload } from "@/services/listings.service";
import { rentalsService, RentalFilters, CreateRentalPayload, CompleteRentalPayload } from "@/services/rentals.service";
import { damageDetectionService } from "@/services/damage-detection.service";
import { notificationsService, NotificationFilters } from "@/services/notifications.service";
import { adminService, AdminUsersParams, AdminUpdateUserPayload, SendNotificationPayload } from "@/services/admin.service";
import { toast } from "sonner";

// ─── User ────────────────────────────────────────────────────

export const useDashboardStats = () =>
  useQuery({ queryKey: ["dashboard-stats"], queryFn: usersService.getDashboard });

export const useUserProfile = () =>
  useQuery({ queryKey: ["user-profile"], queryFn: usersService.getProfile });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("Profile updated successfully");
    },
    onError: () => toast.error("Failed to update profile"),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      usersService.changePassword(payload),
    onSuccess: () => toast.success("Password changed successfully"),
    onError: () => toast.error("Failed to change password"),
  });

export const useUploadCnic = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => usersService.uploadCnic(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("CNIC uploaded. Awaiting admin verification.");
    },
    onError: () => toast.error("Failed to upload CNIC"),
  });
};

export const useUploadAvatar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => usersService.uploadAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("Avatar uploaded successfully");
    },
    onError: () => toast.error("Failed to upload avatar"),
  });
};

// ─── Cars ────────────────────────────────────────────────────

export const useUserCars = () =>
  useQuery({ queryKey: ["user-cars"], queryFn: carsService.getAll });

export const useCarById = (id: string) =>
  useQuery({ queryKey: ["user-car", id], queryFn: () => carsService.getById(id), enabled: !!id });

export const useRegisterCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterCarPayload) => carsService.register(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-cars"] });
      toast.success("Car registered successfully");
    },
    onError: () => toast.error("Failed to register car"),
  });
};

export const useUpdateCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCarPayload }) =>
      carsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-cars"] });
      toast.success("Car updated successfully");
    },
    onError: () => toast.error("Failed to update car"),
  });
};

export const useDeleteCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => carsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-cars"] });
      toast.success("Car deleted successfully");
    },
    onError: () => toast.error("Failed to delete car. It may have active listings or rentals."),
  });
};

// ─── Car Images ──────────────────────────────────────────────

export const useCarImages = (carId: string) =>
  useQuery({ queryKey: ["car-images", carId], queryFn: () => carImagesService.getAll(carId), enabled: !!carId });

export const useRegistrationImages = (carId: string) =>
  useQuery({ queryKey: ["registration-images", carId], queryFn: () => carImagesService.getRegistration(carId), enabled: !!carId });

export const useInspectionHistory = (carId: string) =>
  useQuery({ queryKey: ["inspection-history", carId], queryFn: () => carImagesService.getInspectionHistory(carId), enabled: !!carId });

export const useUploadRegistrationImages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, files }: { carId: string; files: { front: File; back: File; left: File; right: File } }) =>
      carImagesService.uploadRegistration(carId, files),
    onSuccess: (_, { carId }) => {
      qc.invalidateQueries({ queryKey: ["car-images", carId] });
      qc.invalidateQueries({ queryKey: ["registration-images", carId] });
      qc.invalidateQueries({ queryKey: ["user-cars"] });
      toast.success("Registration images uploaded");
    },
    onError: () => toast.error("Failed to upload registration images"),
  });
};

export const useUploadPeriodicImages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, files }: { carId: string; files: { front: File; back: File; left: File; right: File } }) =>
      carImagesService.uploadPeriodic(carId, files),
    onSuccess: (_, { carId }) => {
      qc.invalidateQueries({ queryKey: ["car-images", carId] });
      qc.invalidateQueries({ queryKey: ["inspection-history", carId] });
      toast.success("Periodic images uploaded — new inspection version created");
    },
    onError: () => toast.error("Failed to upload periodic images"),
  });
};

// ─── Catalog ─────────────────────────────────────────────────

export const useCatalog = (params: CatalogFilters = {}) =>
  useQuery({ queryKey: ["catalog", params], queryFn: () => catalogService.browse(params) });

export const useCatalogById = (id: string) =>
  useQuery({ queryKey: ["catalog-entry", id], queryFn: () => catalogService.getById(id), enabled: !!id });

export const useManufacturers = () =>
  useQuery({ queryKey: ["manufacturers"], queryFn: catalogService.getManufacturers });

export const useModelsByManufacturer = (manufacturer: string) =>
  useQuery({
    queryKey: ["models", manufacturer],
    queryFn: () => catalogService.getModelsByManufacturer(manufacturer),
    enabled: !!manufacturer,
  });

export const useCreateCatalog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogPayload) => catalogService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Catalog entry created");
    },
    onError: () => toast.error("Failed to create catalog entry"),
  });
};

export const useUpdateCatalog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCatalogPayload> }) =>
      catalogService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Catalog entry updated");
    },
    onError: () => toast.error("Failed to update catalog entry"),
  });
};

export const useDeleteCatalog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Catalog entry deleted");
    },
    onError: () => toast.error("Failed to delete catalog entry"),
  });
};

// ─── Listings ────────────────────────────────────────────────

export const useListings = (params: ListingFilters = {}) =>
  useQuery({ queryKey: ["listings", params], queryFn: () => listingsService.browse(params) });

export const useListingById = (id: string) =>
  useQuery({ queryKey: ["listing", id], queryFn: () => listingsService.getById(id), enabled: !!id });

export const useMyListings = () =>
  useQuery({ queryKey: ["my-listings"], queryFn: listingsService.getMyListings });

export const useCreateListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateListingPayload) => listingsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing created successfully");
    },
    onError: () => toast.error("Failed to create listing"),
  });
};

export const useUpdateListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateListingPayload }) =>
      listingsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Listing updated");
    },
    onError: () => toast.error("Failed to update listing"),
  });
};

export const useUpdateListingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      listingsService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing status updated");
    },
    onError: () => toast.error("Failed to update listing status"),
  });
};

export const useContactSeller = () =>
  useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ContactSellerPayload }) =>
      listingsService.contactSeller(id, payload),
    onSuccess: () => toast.success("Message sent to seller!"),
    onError: () => toast.error("Failed to send message. Make sure your CNIC is verified."),
  });

// ─── Rentals ─────────────────────────────────────────────────

export const useRentals = (params: RentalFilters = {}) =>
  useQuery({ queryKey: ["rentals", params], queryFn: () => rentalsService.getAll(params) });

export const useRentalById = (id: string) =>
  useQuery({ queryKey: ["rental", id], queryFn: () => rentalsService.getById(id), enabled: !!id });

export const useRentalStats = () =>
  useQuery({ queryKey: ["rental-stats"], queryFn: rentalsService.getStats });

export const useCreateRental = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRentalPayload) => rentalsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["rental-stats"] });
      toast.success("Rental created successfully");
    },
    onError: () => toast.error("Failed to create rental"),
  });
};

export const useCompleteRental = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompleteRentalPayload }) =>
      rentalsService.complete(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["rental-stats"] });
      toast.success("Rental completed successfully");
    },
    onError: () => toast.error("Failed to complete rental"),
  });
};

export const useCancelRental = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rentalsService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["rental-stats"] });
      toast.success("Rental cancelled");
    },
    onError: () => toast.error("Failed to cancel rental"),
  });
};

// ─── Damage Detection ────────────────────────────────────────

export const useDamageHistory = (carId: string) =>
  useQuery({
    queryKey: ["damage-history", carId],
    queryFn: () => damageDetectionService.getHistory(carId),
    enabled: !!carId,
  });

export const useDetectCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (carId: string) => damageDetectionService.detectCar(carId),
    onSuccess: (_, carId) => {
      qc.invalidateQueries({ queryKey: ["damage-history", carId] });
      toast.success("Damage detection completed");
    },
    onError: () => toast.error("Damage detection failed. The service may be unavailable."),
  });
};

export const useDetectImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => damageDetectionService.detectImage(imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["damage-history"] });
      toast.success("Detection completed for image");
    },
    onError: () => toast.error("Detection failed for this image"),
  });
};

export const useDamageScan = () =>
  useMutation({
    mutationFn: (files: File | File[]) => damageDetectionService.scanImages(files),
    onSuccess: (data) => {
      const { summary } = data;
      if (summary.isDemoMode) {
        toast.success(`Scan complete (demo mode). ${summary.imagesWithDamage} of ${summary.totalImages} image(s) processed.`);
      } else {
        toast.success(`Scan complete. ${summary.imagesWithDamage} of ${summary.totalImages} image(s) had damage.`);
      }
    },
    onError: () => toast.error("Scan failed. Check file format (JPG, PNG, WEBP) and size (max 10MB)."),
  });

// ─── Notifications ───────────────────────────────────────────

export const useNotifications = (params: NotificationFilters = {}) =>
  useQuery({ queryKey: ["notifications", params], queryFn: () => notificationsService.getAll(params) });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ["unread-count"],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 30000,
  });

export const useMarkAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
      toast.success("All notifications marked as read");
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
};

// ─── Admin ───────────────────────────────────────────────────

export const useAdminUsers = (params: AdminUsersParams = {}) =>
  useQuery({ queryKey: ["admin-users", params], queryFn: () => adminService.getUsers(params) });

export const useAdminUserById = (id: string) =>
  useQuery({ queryKey: ["admin-user", id], queryFn: () => adminService.getUserById(id), enabled: !!id });

export const useAdminUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUpdateUserPayload }) =>
      adminService.updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("User updated successfully");
    },
    onError: () => toast.error("Failed to update user"),
  });
};

export const useAdminVerifications = (params: { page?: number; limit?: number } = {}) =>
  useQuery({ queryKey: ["admin-verifications", params], queryFn: () => adminService.getVerifications(params) });

export const useAdminSendNotification = () =>
  useMutation({
    mutationFn: (payload: SendNotificationPayload) => adminService.sendNotification(payload),
    onSuccess: () => toast.success("Notification sent successfully"),
    onError: () => toast.error("Failed to send notification"),
  });

export const useAdminStats = () =>
  useQuery({ queryKey: ["admin-stats"], queryFn: adminService.getStats });
