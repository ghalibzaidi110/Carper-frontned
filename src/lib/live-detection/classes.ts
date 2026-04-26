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

/**
 * Per-class minimum confidence (F-8). Acts as a FLOOR on top of the
 * user-controlled global threshold — if a class' value here is higher
 * than the user's slider, this wins; if lower, the slider wins.
 *
 * Reasoning:
 *  - dent / scratch are well-represented in YOLO training → trustworthy
 *    even at moderate confidence.
 *  - glass_shatter and tire_flat are noisier classes (more false positives
 *    from shadows, glare, dust) → require higher confidence to log.
 *  - lamp_broken sits between the two.
 *
 * Tune empirically when retraining the model and update model card.
 */
export const CLASS_CONF_THRESHOLDS: Record<DamageClassName, number> = {
  dent: 0.30,
  scratch: 0.35,
  crack: 0.40,
  glass_shatter: 0.55,
  lamp_broken: 0.45,
  tire_flat: 0.50,
};

/**
 * Look up the minimum confidence for a given class name. Falls back to a
 * conservative default when the class isn't in the table (shouldn't
 * happen with a well-trained model, but cheap insurance).
 */
export function classMinConfidence(className: string): number {
  return (CLASS_CONF_THRESHOLDS as Record<string, number>)[className] ?? 0.4;
}

/**
 * Per-class NMS IoU threshold (F-9). Two boxes of the same class with
 * IoU above this are considered the same detection — only the higher-
 * confidence one is kept.
 *
 * Reasoning:
 *  - Long, thin damages (scratch, crack) on one panel often emit several
 *    detections that don't overlap much. A LOOSE threshold (~0.30) merges
 *    them, preventing "one long scratch becomes 3 log entries."
 *  - Discrete, often-clustered classes (tire_flat, lamp_broken) need a
 *    TIGHTER threshold (~0.60) so two adjacent flat tires aren't merged.
 *  - dent and glass_shatter sit in the middle.
 */
export const CLASS_NMS_IOU: Record<DamageClassName, number> = {
  scratch: 0.30,
  crack: 0.40,
  dent: 0.50,
  glass_shatter: 0.55,
  lamp_broken: 0.55,
  tire_flat: 0.60,
};

/**
 * Look up the NMS IoU threshold for a given class name. Falls back to
 * the YOLO-default 0.5 when the class isn't in the table.
 */
export function classNmsIou(className: string): number {
  return (CLASS_NMS_IOU as Record<string, number>)[className] ?? 0.5;
}
