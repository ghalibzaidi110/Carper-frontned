// Damage class names — must match best.onnx training order exactly.
export const CLASS_NAMES = [
  "dent",
  "scratch",
  "crack",
  "glass_shatter",
  "lamp_broken",
  "tire_flat",
] as const;

export type DamageClassName = (typeof CLASS_NAMES)[number];

export const DISPLAY_NAMES: Record<DamageClassName, string> = {
  dent: "Dent",
  scratch: "Scratch",
  crack: "Crack",
  glass_shatter: "Shattered Glass",
  lamp_broken: "Broken Lamp",
  tire_flat: "Flat Tire",
};

export function displayName(className: string): string {
  return (DISPLAY_NAMES as Record<string, string>)[className] ?? className;
}

export const BOX_COLORS = [
  "#00ff0d",
  "#fbff00",
  "#ffa502",
  "#3742fa",
  "#ff0026",
  "#000000",
] as const;

export function getColor(classId: number): string {
  return BOX_COLORS[classId % BOX_COLORS.length];
}
