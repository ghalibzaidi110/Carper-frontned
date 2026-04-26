/**
 * Static vehicle catalog for the live-detection page (Pakistan market).
 * Used to populate make/model/year selectors and to inform the cost
 * estimation request.
 */

export interface VehicleModelEntry {
  model: string;
  min: number;
  max: number;
}

export type VehicleMake =
  | "Toyota"
  | "Honda"
  | "Suzuki"
  | "Hyundai"
  | "Kia"
  | "Nissan"
  | "Daihatsu";

export const VEHICLE_DATA: Record<VehicleMake, VehicleModelEntry[]> = {
  Toyota: [
    { model: "Corolla", min: 2000, max: 2024 },
    { model: "Camry", min: 2000, max: 2024 },
    { model: "Fortuner", min: 2005, max: 2024 },
    { model: "Hilux", min: 2000, max: 2024 },
  ],
  Honda: [
    { model: "Civic", min: 2000, max: 2024 },
    { model: "City", min: 2000, max: 2024 },
    { model: "Accord", min: 2000, max: 2024 },
    { model: "BR-V", min: 2015, max: 2024 },
  ],
  Suzuki: [
    { model: "Alto", min: 2000, max: 2024 },
    { model: "Swift", min: 2005, max: 2024 },
    { model: "Cultus", min: 2000, max: 2019 },
  ],
  Hyundai: [
    { model: "Elantra", min: 2000, max: 2024 },
    { model: "Sonata", min: 2000, max: 2024 },
    { model: "Stonic", min: 2017, max: 2024 },
  ],
  Kia: [
    { model: "Sportage", min: 2000, max: 2024 },
    { model: "Picanto", min: 2004, max: 2024 },
  ],
  Nissan: [
    { model: "Sunny", min: 2000, max: 2020 },
    { model: "Dayz", min: 2013, max: 2024 },
  ],
  Daihatsu: [
    { model: "Cuore", min: 2000, max: 2024 },
    { model: "Mira", min: 2000, max: 2024 },
  ],
};

export interface Vehicle {
  make: VehicleMake;
  model: string;
  year: number;
}

export const DEFAULT_VEHICLE: Vehicle = {
  make: "Toyota",
  model: "Corolla",
  year: 2020,
};

/** Body style → drives the panel-dimensions lookup on the backend. */
export type VehicleCategory = "sedan" | "hatchback" | "suv" | "pickup" | "minivan";

/**
 * Map (make, model) → body category. Must stay in sync with
 * c_python/app/panel_dimensions.py:VEHICLE_CATEGORIES.
 *
 * Backend defaults to "sedan" when unrecognized, so this list is a
 * convenience for the frontend (so we can show category badges, etc.)
 * rather than a hard requirement.
 */
const VEHICLE_CATEGORY_MAP: Record<string, VehicleCategory> = {
  "Toyota|Corolla":  "sedan",
  "Toyota|Camry":    "sedan",
  "Toyota|Fortuner": "suv",
  "Toyota|Hilux":    "pickup",
  "Honda|Civic":     "sedan",
  "Honda|City":      "sedan",
  "Honda|Accord":    "sedan",
  "Honda|BR-V":      "suv",
  "Suzuki|Alto":     "hatchback",
  "Suzuki|Swift":    "hatchback",
  "Suzuki|Cultus":   "hatchback",
  "Hyundai|Elantra": "sedan",
  "Hyundai|Sonata":  "sedan",
  "Hyundai|Stonic":  "suv",
  "Kia|Sportage":    "suv",
  "Kia|Picanto":     "hatchback",
  "Nissan|Sunny":    "sedan",
  "Nissan|Dayz":     "hatchback",
  "Daihatsu|Cuore":  "hatchback",
  "Daihatsu|Mira":   "hatchback",
};

export function resolveCategory(vehicle: Vehicle): VehicleCategory {
  return VEHICLE_CATEGORY_MAP[`${vehicle.make}|${vehicle.model}`] ?? "sedan";
}

export function getModelsForMake(make: VehicleMake): VehicleModelEntry[] {
  return VEHICLE_DATA[make] ?? [];
}

export function clampYear(modelEntry: VehicleModelEntry, year: number): number {
  if (year < modelEntry.min) return modelEntry.min;
  if (year > modelEntry.max) return modelEntry.max;
  return year;
}
