import type * as OrtTypes from "onnxruntime-web";

import { CLASS_NAMES, classMinConfidence, classNmsIou } from "./classes";
import type { Bbox } from "./iou";
import { iou, YOLO_PAD_COLOR } from "./iou";
import type { Detection } from "./tracks";

/**
 * Lazy-loaded ONNX Runtime module. Importing onnxruntime-web at the top
 * level would pull ~2 MB of WASM loader into the page bundle even for
 * users who never visit /live-detection. Instead we dynamic-import it
 * on first model load and cache the module reference.
 */
let ort: typeof OrtTypes | null = null;

async function ensureOrt(): Promise<typeof OrtTypes> {
  if (ort) return ort;
  ort = await import("onnxruntime-web");
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
  ort.env.wasm.numThreads = 1;
  return ort;
}

/**
 * Damage-detection model version. Bumping this triggers a fresh download
 * (Cache API key includes the version) and lets us roll back by pinning
 * an older URL when needed.
 */
export const DAMAGE_MODEL_VERSION = "v1";
const MODEL_URL = `/models/damage.${DAMAGE_MODEL_VERSION}.onnx`;
const MODEL_CACHE = `carper-damage-model-${DAMAGE_MODEL_VERSION}`;
const INPUT_SIZE = 640;
const TOTAL_PX = INPUT_SIZE * INPUT_SIZE;

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

/**
 * F-1: Delete any browser Cache API entries for the damage model under
 * older version names. Runs once on first model load, so users who had
 * `carper-damage-model-v0` (or any non-current version) cached don't
 * keep ~12 MB of dead model bytes around forever after a version bump.
 */
async function purgeOldDamageCaches(currentVersion: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    const stale = keys.filter(
      (k) =>
        k.startsWith("carper-damage-model-") &&
        !k.endsWith(`-${currentVersion}`),
    );
    await Promise.all(stale.map((k) => caches.delete(k)));
    if (stale.length) {
      // eslint-disable-next-line no-console
      console.log(`[F-1] Purged ${stale.length} stale damage-model cache(s):`, stale);
    }
  } catch (e) {
    console.warn("[F-1] purge old damage caches failed:", (e as Error).message);
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

/** Load YOLOv8n damage-detection model (cached after first download). */
export async function loadDamageModel(url: string = MODEL_URL): Promise<OrtTypes.InferenceSession> {
  if (session) return session;
  const ortMod = await ensureOrt();
  // F-1: clean up cache entries for older model versions before we open
  // ours. Cheap (one Cache API listing) and runs only on first load.
  await purgeOldDamageCaches(DAMAGE_MODEL_VERSION);
  // One-time visibility into active config (F-8, F-9, F-10 verification).
  // Logs only on the first load; subsequent calls return the cached session.
  const { CLASS_CONF_THRESHOLDS, CLASS_NMS_IOU } = await import("./classes");
  console.log(
    "[live-detection] Active config:",
    {
      modelVersion: DAMAGE_MODEL_VERSION,
      letterboxPadColor: YOLO_PAD_COLOR,         // F-10
      perClassConfidenceFloors: CLASS_CONF_THRESHOLDS,  // F-8
      perClassNmsIou: CLASS_NMS_IOU,                    // F-9
    },
  );
  const buf = await cachedFetch(url);
  session = await ortMod.InferenceSession.create(buf, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  ensureBuffers();
  return session;
}

export function isDamageModelLoaded(): boolean {
  return session !== null;
}

/**
 * F-3: Free the ONNX session and inference buffers. ORT sessions hold
 * native WASM memory (~30–60 MB each); without an explicit release they
 * sit there until the tab is closed. We call this from the
 * `useDamageDetector` cleanup so navigating away from /live-detection
 * actually frees the memory.
 *
 * Safe to call when nothing's loaded (no-ops).
 */
export async function releaseDamageModel(): Promise<void> {
  if (!session) return;
  try {
    await session.release();
  } catch (e) {
    console.warn("[detector] release session failed:", (e as Error).message);
  }
  session = null;
  f32Buffer = null;
  offscreen = null;
  offCtx = null;
}

export type DetectionSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

/** Run YOLOv8 inference on a video / canvas / bitmap. */
export async function detectDamage(
  source: DetectionSource,
  threshold: number = 0.4,
): Promise<Detection[]> {
  if (!session) return [];
  ensureBuffers();
  if (!offCtx || !f32Buffer) return [];

  const vw =
    "videoWidth" in source ? source.videoWidth : (source as HTMLCanvasElement | ImageBitmap).width;
  const vh =
    "videoHeight" in source
      ? source.videoHeight
      : (source as HTMLCanvasElement | ImageBitmap).height;
  if (!vw || !vh) return [];

  const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
  const nw = Math.round(vw * scale);
  const nh = Math.round(vh * scale);
  const dx = (INPUT_SIZE - nw) / 2;
  const dy = (INPUT_SIZE - nh) / 2;

  offCtx.fillStyle = YOLO_PAD_COLOR;
  offCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  offCtx.drawImage(source as CanvasImageSource, dx, dy, nw, nh);

  const imgData = offCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const px = imgData.data;

  for (let i = 0; i < TOTAL_PX; i++) {
    const j = i << 2;
    f32Buffer[i] = px[j] * 0.00392156863;
    f32Buffer[TOTAL_PX + i] = px[j + 1] * 0.00392156863;
    f32Buffer[2 * TOTAL_PX + i] = px[j + 2] * 0.00392156863;
  }

  const ortMod = await ensureOrt();
  const tensor = new ortMod.Tensor("float32", f32Buffer, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds: Record<string, OrtTypes.Tensor> = { [session.inputNames[0]]: tensor };

  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  const data = output.data as Float32Array;
  const numBoxes = output.dims[2];
  const numOut = output.dims[1];
  const numCls = numOut - 4;

  const raw: Detection[] = [];

  for (let i = 0; i < numBoxes; i++) {
    // Pick the class with the highest score for this box. We start from
    // the user's global threshold; the per-class floor (F-8) is applied
    // AFTER we know which class won, so a high-conf detection of an
    // easy class isn't suppressed by a stricter class' rule.
    let maxScore = threshold;
    let maxCls = 0;
    for (let c = 0; c < numCls; c++) {
      const s = data[(c + 4) * numBoxes + i];
      if (s > maxScore) {
        maxScore = s;
        maxCls = c;
      }
    }
    if (maxScore <= threshold) continue;

    // Apply the per-class minimum (F-8). Some classes (glass_shatter,
    // tire_flat) need higher confidence than others to keep false-positive
    // rates manageable.
    const className = CLASS_NAMES[maxCls] ?? `class_${maxCls}`;
    const classFloor = classMinConfidence(className);

    // Optional debug: enable from DevTools console with
    //   localStorage.setItem("debugLiveDet", "1")
    // and the loop will log each per-class accept/reject. Disable with
    //   localStorage.removeItem("debugLiveDet")
    if (
      typeof window !== "undefined" &&
      window.localStorage?.getItem("debugLiveDet") === "1"
    ) {
      const verdict = maxScore < classFloor ? "REJECTED" : "kept";
      // eslint-disable-next-line no-console
      console.log(
        `[F-8] ${verdict.padEnd(8)} ${className.padEnd(14)} ` +
          `conf ${maxScore.toFixed(2)}  floor ${classFloor.toFixed(2)}`,
      );
    }

    if (maxScore < classFloor) continue;

    const cx = data[i];
    const cy = data[numBoxes + i];
    const bw = data[2 * numBoxes + i];
    const bh = data[3 * numBoxes + i];

    if (!(bw > 0 && bh > 0)) continue;

    let x1 = (cx - bw / 2 - dx) / scale;
    let y1 = (cy - bh / 2 - dy) / scale;
    let x2 = (cx + bw / 2 - dx) / scale;
    let y2 = (cy + bh / 2 - dy) / scale;

    x1 = Math.max(0, x1);
    y1 = Math.max(0, y1);
    x2 = Math.min(vw, x2);
    y2 = Math.min(vh, y2);

    if (x2 <= x1 || y2 <= y1) continue;

    raw.push({
      classId: maxCls,
      className,
      confidence: maxScore,
      bbox: [x1, y1, x2 - x1, y2 - y1] as Bbox,
    });
  }

  return nms(raw);
}

/**
 * Class-aware greedy NMS with per-class IoU thresholds (F-9).
 *
 * For each candidate (sorted by confidence desc), suppress it if a higher-
 * confidence box of the SAME class overlaps it more than the threshold
 * configured for that class. Cross-class boxes never compete — a dent
 * and a scratch overlapping is fine, both are real.
 *
 * Threshold per class is tuned so long, easily-fragmented damages
 * (scratches) are merged aggressively, while clustered discrete damages
 * (tire_flat) are kept separate.
 */
function nms(dets: Detection[]): Detection[] {
  dets.sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  for (const d of dets) {
    const thresh = classNmsIou(d.className);
    const suppressed = keep.some(
      (k) => k.classId === d.classId && iou(d.bbox, k.bbox) > thresh,
    );
    if (!suppressed) keep.push(d);
  }
  return keep;
}
