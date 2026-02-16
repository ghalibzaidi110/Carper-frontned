export type UserRole = "INDIVIDUAL" | "CAR_RENTAL" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: UserRole;
  isVerified: boolean;
  status: "ACTIVE" | "SUSPENDED";
  avatar?: string;
  businessName?: string;
  businessLicense?: string;
  createdAt: string;
  lastLogin: string;
}

export interface Car {
  id: string;
  userId: string;
  manufacturer: string;
  model: string;
  year: number;
  variant: string;
  registrationNumber: string;
  vin?: string;
  color: string;
  mileage: number;
  condition: "NEW" | "USED" | "DAMAGED";
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  bodyType: string;
  purchaseDate: string;
  purchasePrice: number;
  hasRegistrationImages: boolean;
  hasPeriodicImages: boolean;
}

export interface CarListing {
  id: string;
  carId: string;
  userId: string;
  title: string;
  price: number;
  negotiable: boolean;
  description: string;
  status: "ACTIVE" | "SOLD" | "INACTIVE";
  views: number;
  city: string;
  listedDate: string;
  car: Car;
  sellerName: string;
  images: string[];
}

export interface DamageDetection {
  id: string;
  carId: string;
  imageUrl: string;
  position: "FRONT" | "BACK" | "LEFT" | "RIGHT";
  hasDamage: boolean;
  damageType?: string;
  confidence?: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
  detectedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "SUCCESS" | "INFO" | "WARNING" | "SYSTEM";
  read: boolean;
  createdAt: string;
}

export interface Rental {
  id: string;
  carId: string;
  car: Car;
  renterName: string;
  renterPhone: string;
  renterEmail: string;
  startDate: string;
  endDate: string;
  mileageStart: number;
  mileageEnd?: number;
  rentalPrice: number;
  damageCharges?: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes?: string;
}

export interface CatalogEntry {
  id: string;
  manufacturer: string;
  modelName: string;
  year: number;
  variant: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  seatingCapacity: number;
  basePrice: number;
  isActive: boolean;
}

export interface DashboardStats {
  totalCars: number;
  activeListings: number;
  damageScans: number;
  unreadNotifications: number;
}

export interface AdminStats {
  totalUsers: number;
  individuals: number;
  carRentalBusinesses: number;
  pendingVerifications: number;
  activeListings: number;
  activeRentals: number;
  suspendedUsers: number;
  totalCars: number;
}
