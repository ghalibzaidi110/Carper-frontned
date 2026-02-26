export type UserRole = "INDIVIDUAL" | "CAR_RENTAL" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type CarCondition = "NEW" | "USED" | "DAMAGED";
export type ListingStatus = "ACTIVE" | "SOLD" | "PENDING" | "INACTIVE";
export type RentalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type NotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "SYSTEM";

export interface User {
  id: string;
  email: string;
  fullName: string;
  accountType: UserRole;
  isVerified: boolean;
  accountStatus: AccountStatus;
  phoneNumber?: string;
  city?: string;
  address?: string;
  avatarUrl?: string;
  cnicImageUrl?: string;
  businessName?: string;
  businessLicense?: string;
  createdAt: string;
  lastLogin?: string;

  // Frontend convenience aliases (mapped from API fields)
  name: string;
  role: UserRole;
  status: AccountStatus;
  phone: string;
}

export interface Car {
  id: string;
  userId: string;
  catalogCarId: string;
  registrationNumber: string;
  vinNumber?: string;
  color: string;
  mileage: number;
  condition: CarCondition;
  purchaseDate?: string;
  purchasePrice?: number;
  createdAt: string;

  // From catalog join
  manufacturer: string;
  model: string;
  year: number;
  variant: string;
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  bodyType: string;

  hasRegistrationImages: boolean;
  hasPeriodicImages: boolean;
}

export interface CarImage {
  id: string;
  carId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
  inspectionVersion?: number;
  damageDetectionData?: Record<string, unknown>;
  createdAt: string;
}

export interface CarListing {
  id: string;
  carId: string;
  userId: string;
  title: string;
  askingPrice: number;
  isNegotiable: boolean;
  description: string;
  status: ListingStatus;
  viewCount: number;
  city?: string;
  createdAt: string;
  car?: Car;
  seller?: { fullName: string; avatarUrl?: string };
  images?: string[];

  // Frontend convenience aliases
  price: number;
  negotiable: boolean;
  views: number;
  listedDate: string;
  sellerName: string;
}

export interface DamageDetection {
  id: string;
  carId: string;
  imageId: string;
  imageUrl: string;
  category: string;
  hasDamage: boolean;
  confidence?: number;
  detections: Array<{
    label: string;
    confidence: number;
    bbox: number[];
  }>;
  processedImageUrl?: string;
  detectedAt: string;
}

export interface DamageDetectionCarResult {
  carId: string;
  totalImagesScanned: number;
  imagesWithDamage: number;
  results: DamageDetection[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;

  // Frontend alias
  read: boolean;
}

export interface Rental {
  id: string;
  carId: string;
  car?: Car;
  renterName: string;
  renterPhone: string;
  renterEmail?: string;
  renterCnic?: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  mileageAtStart?: number;
  mileageAtEnd?: number;
  rentalPrice: number;
  damageCharges?: number;
  totalCharges?: number;
  damageDescription?: string;
  preRentalNotes?: string;
  postRentalNotes?: string;
  status: RentalStatus;
  createdAt: string;

  // Frontend aliases
  mileageStart: number;
  mileageEnd?: number;
  notes?: string;
}

export interface CatalogEntry {
  id: string;
  manufacturer: string;
  modelName: string;
  year: number;
  variant?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  engineCapacity?: string;
  seatingCapacity?: number;
  basePrice?: number;
  description?: string;
  features?: string[];
  isActive: boolean;
  images?: Array<{ id: string; imageUrl: string; isPrimary: boolean; altText?: string }>;
}

export interface DashboardStats {
  totalCars: number;
  activeListings: number;
  totalDamageDetections: number;
  cnicVerificationStatus: string;
  // CAR_RENTAL extras
  activeRentalBookings?: number;
  totalRevenue?: number;
  fleetUtilization?: string;
}

export interface RentalStats {
  activeRentals: number;
  completedRentals: number;
  totalRentals: number;
  totalRevenue: number;
}

export interface AdminStats {
  users: {
    total: number;
    individuals: number;
    rentalBusinesses: number;
    suspended: number;
    pendingVerifications: number;
  };
  cars: { total: number };
  listings: { total: number; active: number };
  rentals: { total: number; active: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  message?: string;
}

export interface InspectionVersion {
  version: number;
  isCurrent: boolean;
  uploadedAt: string;
  images: CarImage[];
}
