import type { User } from "@/types";

/**
 * Maps the backend user object to a frontend-friendly shape with convenience aliases.
 */
export function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as string,
    email: raw.email as string,
    fullName: (raw.fullName as string) || "",
    accountType: raw.accountType as User["accountType"],
    isVerified: (raw.isVerified as boolean) || false,
    accountStatus: (raw.accountStatus as User["accountStatus"]) || "ACTIVE",
    phoneNumber: raw.phoneNumber as string | undefined,
    city: raw.city as string | undefined,
    address: raw.address as string | undefined,
    avatarUrl: raw.avatarUrl as string | undefined,
    cnicImageUrl: raw.cnicImageUrl as string | undefined,
    businessName: raw.businessName as string | undefined,
    businessLicense: raw.businessLicense as string | undefined,
    createdAt: (raw.createdAt as string) || "",
    lastLogin: raw.lastLogin as string | undefined,

    // Convenience aliases used throughout the existing UI
    name: (raw.fullName as string) || "",
    role: raw.accountType as User["role"],
    status: (raw.accountStatus as User["status"]) || "ACTIVE",
    phone: (raw.phoneNumber as string) || "",
  };
}
