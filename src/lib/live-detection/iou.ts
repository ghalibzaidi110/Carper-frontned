/**
 * Bounding-box overlap utilities. All boxes are [x, y, w, h] in pixel coords.
 */

export type Bbox = [number, number, number, number];

/** Standard Intersection-over-Union of two boxes. */
export function iou(a: Bbox, b: Bbox): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  return inter / (a[2] * a[3] + b[2] * b[3] - inter + 1e-6);
}

/**
 * Containment: fraction of box `a` covered by box `b`.
 * High when small `a` (damage) lies inside large `b` (panel).
 */
export function containment(a: Bbox, b: Bbox): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  return inter / (a[2] * a[3] + 1e-6);
}

/**
 * Panel overlap score: blends IoU and containment.
 * Containment-weighted so small damage on large panel scores high.
 */
export function panelOverlapScore(damageBbox: Bbox, partBbox: Bbox): number {
  return 0.4 * iou(damageBbox, partBbox) + 0.6 * containment(damageBbox, partBbox);
}
