import type * as OrtTypes from "onnxruntime-web";

import type { Bbox } from "./iou";

/**
 * Depth-Anything-V2-Small ONNX — monocular depth estimation.
 *
 * Produces a relative depth map from a single RGB frame. Unlike WebXR
 * sensor depth, the values are ordinal (closer vs farther), not metric.
 * Used to classify dent depth ("shallow" / "moderate" / "deep") by
 * comparing the depth at the damage center vs the surrounding panel.
 *
 * The model is NOT preloaded — it's ~50 MB, so we only download it
 * when the user first requests a cost estimate. After that, the
 * Browser Cache API keeps it for instant reloads.
 */

// ── ONNX runtime (shared lazy-load pattern from detector.ts) ────────

let ort: typeof OrtTypes | null = null;

async function ensureOrt(): Promise<typeof OrtTypes> {
  if (ort) return ort;
  ort = await import("onnxruntime-web");
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
  ort.env.wasm.numThreads = 1;
  return ort;
}

// ── Model config ────────────────────────────────────────────────────

export const DEPTH_MODEL_VERSION = "v1";
const MODEL_URL = `/models/depth-anything-v2-small.${DEPTH_MODEL_VERSION}.onnx`;
const MODEL_CACHE = `carper-depth-model-${DEPTH_MODEL_VERSION}`;
const INPUT_SIZE = 518; // Depth-Anything-V2-Small native input
const TOTAL_PX = INPUT_SIZE * INPUT_SIZE;

// ImageNet normalization (standard for Depth-Anything family)
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

let session: OrtTypes.InferenceSession | null = null;
let f32Buffer: Float32Array | null = null;
let offscreen: OffscreenCanvas | null = null;
let offCtx: OffscreenCanvasRenderingContext2D | null = null;

function ensureBuffers() {
  if (!f32Buffer) f32Buffer = new Float32Array(3 * TOTAL_PX);
  if (!offscreen) {
    offscreen = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  }
}

// ── Cache management (F-1 pattern) ──────────────────────────────────

async function purgeOldDepthCaches(currentVersion: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    const stale = keys.filter(
      (k) =>
        k.startsWith("carper-depth-model-") &&
        !k.endsWith(`-${currentVersion}`),
    );
    await Promise.all(stale.map((k) => caches.delete(k)));
    if (stale.length) {
      // eslint-disable-next-line no-console
      console.log(`[F-1] Purged ${stale.length} stale depth-model cache(s):`, stale);
    }
  } catch (e) {
    console.warn("[F-1] purge old depth caches failed:", (e as Error).message);
  }
}

async function cachedFetch(url: string): Promise<ArrayBuffer> {
  try {
    const cache = await caches.open(MODEL_CACHE);
    const cached = await cache.match(url);
    if (cached) return cached.arrayBuffer();

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    cache.put(url, resp.clone());
    return resp.arrayBuffer();
  } catch {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    return resp.arrayBuffer();
  }
}

// ── Model lifecycle ─────────────────────────────────────────────────

/** Load Depth-Anything-V2-Small model (~50 MB, cached after first download). */
export async function loadDepthModel(url: string = MODEL_URL): Promise<OrtTypes.InferenceSession> {
  if (session) return session;
  const ortMod = await ensureOrt();
  await purgeOldDepthCaches(DEPTH_MODEL_VERSION);
  // eslint-disable-next-line no-console
  console.log("[depth-estimator] Loading Depth-Anything-V2-Small...");
  const buf = await cachedFetch(url);
  session = await ortMod.InferenceSession.create(buf, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  ensureBuffers();
  // eslint-disable-next-line no-console
  console.log("[depth-estimator] Model loaded. Input:", session.inputNames, "Output:", session.outputNames);
  return session;
}

export function isDepthModelLoaded(): boolean {
  return session !== null;
}

/** Free the ONNX session and inference buffers (F-3 pattern). */
export async function releaseDepthModel(): Promise<void> {
  if (!session) return;
  try {
    await session.release();
  } catch (e) {
    console.warn("[depth-estimator] release session failed:", (e as Error).message);
  }
  session = null;
  f32Buffer = null;
  offscreen = null;
  offCtx = null;
}

// ── Inference ───────────────────────────────────────────────────────

export type DepthSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

/**
 * Run Depth-Anything-V2-Small on a single frame.
 * Returns a Float32Array of relative depth values (H×W), where higher
 * values = farther from camera. The values are NOT in meters — they're
 * ordinal only.
 */
export async function estimateDepthMap(
  source: DepthSource,
): Promise<{ map: Float32Array; width: number; height: number } | null> {
  if (!session) return null;
  ensureBuffers();
  if (!offCtx || !f32Buffer) return null;

  // Resize source to model input (stretch, not letterbox —
  // Depth-Anything expects the full frame without padding)
  offCtx.drawImage(source as CanvasImageSource, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const imgData = offCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const px = imgData.data;

  // CHW layout with ImageNet normalization
  for (let i = 0; i < TOTAL_PX; i++) {
    const j = i << 2;
    f32Buffer[i] = (px[j] / 255 - MEAN[0]) / STD[0];
    f32Buffer[TOTAL_PX + i] = (px[j + 1] / 255 - MEAN[1]) / STD[1];
    f32Buffer[2 * TOTAL_PX + i] = (px[j + 2] / 255 - MEAN[2]) / STD[2];
  }

  const ortMod = await ensureOrt();
  const tensor = new ortMod.Tensor("float32", f32Buffer, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds: Record<string, OrtTypes.Tensor> = { [session.inputNames[0]]: tensor };

  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  const depthData = output.data as Float32Array;

  // Output shape: [1, H, W] — extract H and W from dims
  const outH = output.dims.length >= 3 ? output.dims[1] : INPUT_SIZE;
  const outW = output.dims.length >= 3 ? output.dims[2] : INPUT_SIZE;

  return { map: depthData, width: outW, height: outH };
}

// ── Depth sampling ──────────────────────────────────────────────────

/**
 * Sample the depth map at the damage bbox center and surrounding panel
 * points. Returns the relative depth delta (positive = dent/concavity,
 * negative = protrusion).
 *
 * @param depthMap  - The raw depth map from estimateDepthMap()
 * @param mapWidth  - Depth map width
 * @param mapHeight - Depth map height
 * @param damageBbox - Damage [x, y, w, h] in original video coords
 * @param panelBbox  - Panel [x, y, w, h] in original video coords (optional)
 * @param frameWidth - Original video frame width
 * @param frameHeight - Original video frame height
 */
export function sampleDepthAtBbox(
  depthMap: Float32Array,
  mapWidth: number,
  mapHeight: number,
  damageBbox: Bbox,
  frameWidth: number,
  frameHeight: number,
  panelBbox?: Bbox | null,
): { centerDepth: number; surroundingDepth: number; relativeDepthDelta: number } {
  const scaleX = mapWidth / frameWidth;
  const scaleY = mapHeight / frameHeight;

  // Sample damage center (5-point average for robustness)
  const [dx, dy, dw, dh] = damageBbox;
  const dcx = (dx + dw / 2) * scaleX;
  const dcy = (dy + dh / 2) * scaleY;
  const sampleRadius = Math.min(dw * scaleX, dh * scaleY) * 0.15;

  const centerPoints = [
    [dcx, dcy],
    [dcx - sampleRadius, dcy],
    [dcx + sampleRadius, dcy],
    [dcx, dcy - sampleRadius],
    [dcx, dcy + sampleRadius],
  ];
  const centerDepth = avgDepthAtPoints(depthMap, mapWidth, mapHeight, centerPoints);

  // Sample surrounding panel surface (8 points around damage perimeter)
  let surroundingPoints: number[][];

  if (panelBbox) {
    // Sample on panel surface outside the damage bbox
    const [px, py, pw, ph] = panelBbox;
    const margin = 0.15; // 15% inward from panel edges
    surroundingPoints = [
      [(px + pw * margin) * scaleX, (py + ph * margin) * scaleY],
      [(px + pw * 0.5) * scaleX, (py + ph * margin) * scaleY],
      [(px + pw * (1 - margin)) * scaleX, (py + ph * margin) * scaleY],
      [(px + pw * margin) * scaleX, (py + ph * 0.5) * scaleY],
      [(px + pw * (1 - margin)) * scaleX, (py + ph * 0.5) * scaleY],
      [(px + pw * margin) * scaleX, (py + ph * (1 - margin)) * scaleY],
      [(px + pw * 0.5) * scaleX, (py + ph * (1 - margin)) * scaleY],
      [(px + pw * (1 - margin)) * scaleX, (py + ph * (1 - margin)) * scaleY],
    ];
    // Exclude points that fall inside the damage bbox
    surroundingPoints = surroundingPoints.filter(([sx, sy]) => {
      const ox = sx / scaleX;
      const oy = sy / scaleY;
      return ox < dx || ox > dx + dw || oy < dy || oy > dy + dh;
    });
  } else {
    // No panel bbox: sample just outside damage bbox edges
    const pad = Math.max(dw, dh) * scaleX * 0.3;
    surroundingPoints = [
      [dcx - dw * scaleX / 2 - pad, dcy],
      [dcx + dw * scaleX / 2 + pad, dcy],
      [dcx, dcy - dh * scaleY / 2 - pad],
      [dcx, dcy + dh * scaleY / 2 + pad],
    ];
  }

  const surroundingDepth =
    surroundingPoints.length > 0
      ? avgDepthAtPoints(depthMap, mapWidth, mapHeight, surroundingPoints)
      : centerDepth;

  // Positive delta = damage center is farther from camera than surrounding
  // = a dent/concavity (the surface goes away from the camera at the damage)
  const relativeDepthDelta = centerDepth - surroundingDepth;

  return { centerDepth, surroundingDepth, relativeDepthDelta };
}

function avgDepthAtPoints(
  depthMap: Float32Array,
  width: number,
  height: number,
  points: number[][],
): number {
  let sum = 0;
  let count = 0;
  for (const [x, y] of points) {
    const ix = Math.round(Math.max(0, Math.min(width - 1, x)));
    const iy = Math.round(Math.max(0, Math.min(height - 1, y)));
    const idx = iy * width + ix;
    if (idx >= 0 && idx < depthMap.length) {
      sum += depthMap[idx];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ── Depth classification ────────────────────────────────────────────

export interface DepthEstimation {
  depthCategory: "shallow" | "moderate" | "deep";
  relativeDepthDelta: number;
  depthConfidence: number;
}

/**
 * Classify dent depth from the relative depth delta.
 *
 * Thresholds are empirical — tune against real labelled dent data when
 * available. The absolute magnitude depends on the scene (lighting,
 * distance, surface), so these are conservative starting points.
 *
 * A positive delta means the center is farther (recessed = dent).
 * A negative or near-zero delta means flat or protruding.
 */
export function classifyDentDepth(relativeDepthDelta: number): DepthEstimation {
  const absDelta = Math.abs(relativeDepthDelta);

  let depthCategory: DepthEstimation["depthCategory"];
  let depthConfidence: number;

  if (relativeDepthDelta <= 0.005) {
    // Flat or protruding — classify as shallow
    depthCategory = "shallow";
    depthConfidence = 0.7;
  } else if (absDelta < 0.02) {
    depthCategory = "shallow";
    depthConfidence = 0.6;
  } else if (absDelta < 0.06) {
    depthCategory = "moderate";
    depthConfidence = 0.5;
  } else {
    depthCategory = "deep";
    depthConfidence = 0.5;
  }

  return { depthCategory, relativeDepthDelta, depthConfidence };
}
