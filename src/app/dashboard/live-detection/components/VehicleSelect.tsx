"use client";

import { Car } from "lucide-react";
import { useMemo } from "react";

import {
  type Vehicle,
  type VehicleMake,
  VEHICLE_DATA,
  clampYear,
  getModelsForMake,
} from "@/lib/live-detection/vehicle";

interface VehicleSelectProps {
  value: Vehicle;
  onChange: (vehicle: Vehicle) => void;
}

const MAKES = Object.keys(VEHICLE_DATA) as VehicleMake[];

export function VehicleSelect({ value, onChange }: VehicleSelectProps) {
  const models = useMemo(() => getModelsForMake(value.make), [value.make]);
  const currentModel = useMemo(
    () => models.find((m) => m.model === value.model) ?? models[0],
    [models, value.model],
  );

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Car size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Vehicle</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Make */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Make</label>
          <select
            value={value.make}
            onChange={(e) => {
              const make = e.target.value as VehicleMake;
              const newModels = getModelsForMake(make);
              const newModel = newModels[0];
              onChange({
                make,
                model: newModel?.model ?? value.model,
                year: newModel ? clampYear(newModel, value.year) : value.year,
              });
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MAKES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
          <select
            value={value.model}
            onChange={(e) => {
              const model = e.target.value;
              const entry = models.find((m) => m.model === model) ?? currentModel;
              onChange({
                ...value,
                model,
                year: entry ? clampYear(entry, value.year) : value.year,
              });
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {models.map((m) => (
              <option key={m.model} value={m.model}>
                {m.model}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
          <input
            type="number"
            inputMode="numeric"
            value={value.year}
            min={1950}
            max={new Date().getFullYear()}
            maxLength={4}
            onInput={(e) => {
              const el = e.currentTarget;
              if (el.value.length > 4) el.value = el.value.slice(0, 4);
            }}
            onKeyDown={(e) => {
              if (
                e.currentTarget.value.length >= 4 &&
                /^\d$/.test(e.key) &&
                e.currentTarget.selectionStart === e.currentTarget.selectionEnd
              ) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const digits = e.target.value.slice(0, 4);
              onChange({
                ...value,
                year: parseInt(digits, 10) || value.year,
              });
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}
