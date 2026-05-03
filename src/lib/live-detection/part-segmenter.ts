/**
 * Identify car panel using YOLOv8-seg ONNX model.
 *
 * Runs the part segmentation model on the current video frame, finds which
 * detected part bbox overlaps most with the damage bbox, returns that part's
 * class name as the panel location.
 *
 * Only uses the detection head (output0) — mask prototypes not needed
 * for panel-location identification.
 */

import * as ort from "onnxruntime-web";

import type { Bbox } from "./iou";
import { panelOverlapScore, YOLO_PAD_COLOR } from "./iou";

/**
 * Parts-segmentation model version. See detector.ts:DAMAGE_MODEL_VERSION
 * for the rationale. Bumping invalidates the browser Cache API entry.
 */
export const PARTS_MODEL_VERSION = "v1";
const MODEL_URL = `/models/parts.${PARTS_MODEL_VERSION}.onnx`;
const MODEL_CACHE = `carper-parts-model-${PARTS_MODEL_VERSION}`;
const INPUT_SIZE = 640;
// Minimum confidence to even consider a part detection.
//
// The parts model has weak calibration — most legitimate predictions land
// at 0.10–0.25, with high-confidence (>0.4) predictions being the
// exception rather than the rule. We keep this at the original 0.10 so
// real panels aren't dropped.
//
// F-11 mislabel reduction relies on three filters, applied as a tiered
// preference ladder inside identifyPanel() rather than as hard gates:
//   1. SKIP_PART_KEYS         — drop the "object" catch-all class (hard)
//   2. DAMAGE_COMPATIBLE_PANELS — prefer physically-possible pairings
//                                (e.g. tire_flat → wheel) but accept any
//                                panel as a graceful fallback when the
//                                parts model misses the compatible one
//   3. MIN_PANEL_OVERLAP       — prefer panels meeting the spatial floor
//                                but accept lower-overlap matches if no
//                                higher-quality option exists
//
// The hard-gate version of (2) and (3) caused 100% "unknown" panels on
// real footage because the parts model is too unreliable to consistently
// land in the strict tier — see git history of identifyPanel(). The
// tiered version preserves quality when the model cooperates and avoids
// blocking the cost pipeline when it doesn't.
//
// Reaching real precision via thresholds requires retraining the parts
// model on labelled data. Tracked in
// docs/live-detection-analysis/07-yolo-detection-deep-dive.md.
const CONF_THRESHOLD = 0.10;

// Generic catch-all class. The parts model emits "object" when it isn't
// sure what's in front of it — accepting it as a real panel guess is the
// fastest way to label things as "Other". This filter alone removed most
// of the panel-mislabelling we used to see, without sacrificing recall.
const SKIP_PART_KEYS = new Set(["object"]);

// F-11: spatial-sanity floor. `panelOverlapScore` blends IoU and
// containment, both in [0,1]. Even the best panel sometimes only "wins"
// because it's the least-bad of bad options — its bbox barely brushes
// the damage. Below this floor we'd rather report "unknown" and let the
// user pick from the dropdown than guess and feed the wrong panel into
// the cost model.
const MIN_PANEL_OVERLAP = 0.05;

// Exact model class order (index = classId)
export const PART_CLASS_KEYS = [
  "back_bumper",
  "back_door",
  "back_glass",
  "back_left_door",
  "back_left_light",
  "back_light",
  "back_right_door",
  "back_right_light",
  "front_bumper",
  "front_door",
  "front_glass",
  "front_left_door",
  "front_left_light",
  "front_light",
  "front_right_door",
  "front_right_light",
  "hood",
  "left_mirror",
  "object",
  "right_mirror",
  "tailgate",
  "trunk",
  "wheel",
] as const;

export type PartKey = (typeof PART_CLASS_KEYS)[number];

// F-11: damage-class → compatible-panel-set. A `tire_flat` overlapping the
// hood can only ever be a parts-model error. Same for `glass_shatter` on a
// bumper or `lamp_broken` on a wheel. By filtering candidates to panels
// physically capable of carrying that damage type before scoring overlap,
// we eliminate a whole class of "wrong panel wins by accident" mislabels
// that the rolled-back confidence-threshold experiment was trying (and
// failing) to address.
//
// `null` means no constraint — body damage (dent / scratch / crack) can
// land on any panel including glass, so we keep the unfiltered candidate
// pool for those.
const DAMAGE_COMPATIBLE_PANELS: Record<string, Set<PartKey> | null> = {
  tire_flat: new Set<PartKey>(["wheel"]),
  glass_shatter: new Set<PartKey>(["front_glass", "back_glass"]),
  lamp_broken: new Set<PartKey>([
    "back_left_light",
    "back_light",
    "back_right_light",
    "front_left_light",
    "front_light",
    "front_right_light",
  ]),
  dent: null,
  scratch: null,
  crack: null,
};

export const PART_DISPLAY: Record<PartKey, string> = {
  back_bumper: "Rear Bumper",
  back_door: "Rear Door",
  back_glass: "Rear Glass",
  back_left_door: "Rear Left Door",
  back_left_light: "Rear Left Light",
  back_light: "Rear Light",
  back_right_door: "Rear Right Door",
  back_right_light: "Rear Right Light",
  front_bumper: "Front Bumper",
  front_door: "Front Door",
  front_glass: "Windshield",
  front_left_door: "Front Left Door",
  front_left_light: "Front Left Light",
  front_light: "Front Light",
  front_right_door: "Front Right Door",
  front_right_light: "Front Right Light",
  hood: "Hood",
  left_mirror: "Left Mirror",
  object: "Other",
  right_mirror: "Right Mirror",
  tailgate: "Tailgate",
  trunk: "Trunk",
  wheel: "Wheel",
};

export interface PanelOption {
  key: PartKey;
  label: string;
}

/** [{key, label}] list for a panel-override dropdown. */
export function getPanelOptions(): PanelOption[] {
  return PART_CLASS_KEYS.map((k) => ({ key: k, label: PART_DISPLAY[k] ?? k }));
}

let partSession: ort.InferenceSession | null = null;
let f32Buf: Float32Array | null = null;
let offscreen: OffscreenCanvas | null = null;
let offCtx: OffscreenCanvasRenderingContext2D | null = null;

function ensureBuffers() {
  const total = INPUT_SIZE * INPUT_SIZE;
  if (!f32Buf) f32Buf = new Float32Array(3 * total);
  if (!offscreen) {
    offscreen = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  }
}

// D-6: see detector.ts for rationale. Same 30 s ceiling — keeps the two
// model fetches behaving consistently when the network is degraded.
const MODEL_FETCH_TIMEOUT_MS = 30_000;

async function cachedFetch(url: string): Promise<ArrayBuffer> {
  // Cache lookup is best-effort — failures shouldn't block fetch.
  let cache: Cache | null = null;
  if (typeof caches !== "undefined") {
    try {
      cache = await caches.open(MODEL_CACHE);
      const cached = await cache.match(url);
      if (cached) return cached.arrayBuffer();
    } catch (e) {
      console.warn("[part-segmenter] cache lookup failed:", (e as Error).message);
      cache = null;
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MODEL_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    if (!resp.ok) throw new Error(`Parts model fetch failed: ${resp.status}`);
    if (cache) {
      cache
        .put(url, resp.clone())
        .catch((e) =>
          console.warn("[part-segmenter] cache write failed:", (e as Error).message),
        );
    }
    return await resp.arrayBuffer();
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error(
        `Parts model fetch timed out after ${MODEL_FETCH_TIMEOUT_MS / 1000}s — check your network and refresh.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * F-1: Delete browser Cache API entries for parts model under any
 * non-current version. Mirrors the same logic in detector.ts so a single
 * version bump fully reclaims storage for both ONNX models.
 */
async function purgeOldPartCaches(currentVersion: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    const stale = keys.filter(
      (k) =>
        k.startsWith("carper-parts-model-") &&
        !k.endsWith(`-${currentVersion}`),
    );
    await Promise.all(stale.map((k) => caches.delete(k)));
    if (stale.length) {
      // eslint-disable-next-line no-console
      console.log(`[F-1] Purged ${stale.length} stale parts-model cache(s):`, stale);
    }
  } catch (e) {
    console.warn("[F-1] purge old parts caches failed:", (e as Error).message);
  }
}

let loadingPromise: Promise<void> | null = null;

async function ensureModel(): Promise<void> {
  if (partSession) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      // F-1: clean up cache entries for older parts-model versions before
      // we open ours.
      await purgeOldPartCaches(PARTS_MODEL_VERSION);
      const buf = await cachedFetch(MODEL_URL);
      partSession = await ort.InferenceSession.create(buf, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      ensureBuffers();
    })();
  }
  await loadingPromise;
}

/** Preload at startup so first identify call is fast. */
export async function preloadPartModel(): Promise<void> {
  try {
    await ensureModel();
  } catch (err) {
    console.warn("[PartSeg] preload failed:", (err as Error).message);
  }
}

export function isPartModelLoaded(): boolean {
  return partSession !== null;
}

/**
 * F-3: Free the parts-segmenter ONNX session and inference buffers.
 * Mirrors `releaseDamageModel()` in detector.ts. Called from the
 * `useDamageDetector` cleanup hook so leaving the live-detection page
 * gives the user back ~30–60 MB of WASM heap.
 */
export async function releasePartModel(): Promise<void> {
  if (!partSession) return;
  try {
    await partSession.release();
  } catch (e) {
    console.warn("[part-segmenter] release session failed:", (e as Error).message);
  }
  partSession = null;
  loadingPromise = null;
  f32Buf = null;
  offscreen = null;
  offCtx = null;
}

function getPartName(classId: number): string {
  return PART_CLASS_KEYS[classId] ?? "unknown";
}

/**
 * Result of identifying the panel at a given damage bbox.
 *
 * `panel` is the panel key (e.g. "hood") or "unknown" if nothing useful
 * was detected. When successful, `panelBbox` and `frameSize` are filled
 * in so callers can compute pixels-per-cm using the panel as a known
 * reference.
 */
export interface PanelIdentification {
  panel: string;
  panelBbox?: Bbox;
  frameSize?: [number, number]; // [width, height] of the source frame
}

/** Source-video rectangle to feed into the parts model (Pass 1 = whole frame, Pass 2 = zoom-in crop). */
interface SrcRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

type RawDetection = { classId: number; conf: number; bbox: Bbox };

/**
 * Run the parts-segmenter ONNX model on a specific rectangular region
 * of the source video, then translate detections back to FULL-FRAME
 * pixel coordinates. The 9-arg `drawImage` lets us crop+letterbox just
 * the source region into the 640×640 ONNX input — Pass 2 uses this to
 * give the model a higher-resolution view of the panel containing the
 * damage when Pass 1 missed at full-frame downscale.
 */
async function runPartsInference(
  videoEl: HTMLVideoElement,
  src: SrcRegion,
): Promise<RawDetection[]> {
  if (!partSession || !offCtx || !f32Buf) return [];
  if (src.w <= 0 || src.h <= 0) return [];

  const scale = Math.min(INPUT_SIZE / src.w, INPUT_SIZE / src.h);
  const nw = Math.round(src.w * scale);
  const nh = Math.round(src.h * scale);
  const dx = (INPUT_SIZE - nw) / 2;
  const dy = (INPUT_SIZE - nh) / 2;

  offCtx.fillStyle = YOLO_PAD_COLOR;
  offCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  // 9-arg drawImage: (image, sx, sy, sw, sh, dx, dy, dw, dh)
  offCtx.drawImage(videoEl, src.x, src.y, src.w, src.h, dx, dy, nw, nh);

  const imgData = offCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const px = imgData.data;
  const total = INPUT_SIZE * INPUT_SIZE;

  for (let i = 0; i < total; i++) {
    const j = i << 2;
    f32Buf[i] = px[j] * 0.00392156863;
    f32Buf[total + i] = px[j + 1] * 0.00392156863;
    f32Buf[2 * total + i] = px[j + 2] * 0.00392156863;
  }

  const tensor = new ort.Tensor("float32", f32Buf, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const results = await partSession.run({ [partSession.inputNames[0]]: tensor });

  // Post-NMS output: [1, 300, 38] — bbox(4) + conf(1) + cls(1) + mask_coefs(32)
  const out0 = results[partSession.outputNames[0]];
  const data = out0.data as Float32Array;
  const numDets = out0.dims[1];
  const rowSize = out0.dims[2];
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  const dets: RawDetection[] = [];
  for (let i = 0; i < numDets; i++) {
    const base = i * rowSize;
    const conf = data[base + 4];
    if (conf < CONF_THRESHOLD) continue;

    const classId = Math.round(data[base + 5]);
    // Skip the generic "object" catch-all (F-11).
    const partKey = PART_CLASS_KEYS[classId];
    if (partKey && SKIP_PART_KEYS.has(partKey)) continue;

    // Letterbox-undo → crop-pixel coords.
    const cx1 = (data[base + 0] - dx) / scale;
    const cy1 = (data[base + 1] - dy) / scale;
    const cx2 = (data[base + 2] - dx) / scale;
    const cy2 = (data[base + 3] - dy) / scale;
    // Translate crop coords → full-frame coords.
    const x1 = Math.max(0, src.x + cx1);
    const y1 = Math.max(0, src.y + cy1);
    const x2 = Math.min(vw, src.x + cx2);
    const y2 = Math.min(vh, src.y + cy2);
    if (x2 <= x1 || y2 <= y1) continue;

    dets.push({ classId, conf, bbox: [x1, y1, x2 - x1, y2 - y1] as Bbox });
  }
  return dets;
}

/**
 * Compute the Pass-2 zoom-in source-region around the damage bbox.
 * Square crop centered on the damage center, sized to comfortably
 * include enough context to identify the surrounding panel. Clamped
 * to frame edges so we never sample outside the video.
 */
function computeZoomCrop(damageBbox: Bbox, vw: number, vh: number): SrcRegion {
  const [bx, by, bw, bh] = damageBbox;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  // Keep at least 800 px on each side; if the damage itself is large
  // (>~530 px), use 1.5× its longer dimension instead so we always
  // include a generous panel margin around it.
  const size = Math.max(800, Math.ceil(1.5 * Math.max(bw, bh)));
  let cropX = Math.round(cx - size / 2);
  let cropY = Math.round(cy - size / 2);
  let cropW = size;
  let cropH = size;
  if (cropX < 0) {
    cropW += cropX;
    cropX = 0;
  }
  if (cropY < 0) {
    cropH += cropY;
    cropY = 0;
  }
  if (cropX + cropW > vw) cropW = vw - cropX;
  if (cropY + cropH > vh) cropH = vh - cropY;
  return { x: cropX, y: cropY, w: cropW, h: cropH };
}

/**
 * F-11 tiered fallback: score every detection, then walk a 4-tier
 * ladder picking the first non-empty tier. Returns null only when
 * given an empty input.
 */
function pickBestPanel(
  partDets: RawDetection[],
  damageBbox: Bbox,
  damageClass: string | undefined,
): (RawDetection & { overlap: number; score: number; tier: 1 | 2 | 3 | 4 }) | null {
  if (partDets.length === 0) return null;

  const scored = partDets.map((p) => {
    const overlap = panelOverlapScore(damageBbox, p.bbox);
    return { ...p, overlap, score: overlap * p.conf };
  });
  scored.sort((a, b) => b.score - a.score);

  const compatibleSet = damageClass ? DAMAGE_COMPATIBLE_PANELS[damageClass] : undefined;
  const inCompatibleSet = (p: { classId: number }) => {
    if (!compatibleSet) return true;
    const key = PART_CLASS_KEYS[p.classId];
    return key !== undefined && compatibleSet.has(key);
  };

  const tier1 = scored.find((p) => inCompatibleSet(p) && p.overlap >= MIN_PANEL_OVERLAP);
  if (tier1) return { ...tier1, tier: 1 };
  const tier2 = scored.find((p) => p.overlap >= MIN_PANEL_OVERLAP);
  if (tier2) return { ...tier2, tier: 2 };
  const tier3 = scored.find((p) => inCompatibleSet(p));
  if (tier3) return { ...tier3, tier: 3 };
  return { ...scored[0], tier: 4 };
}

/**
 * Identify the panel at the given damage bbox. Returns the panel key
 * (e.g. "hood") or "unknown" if nothing detected, plus the panel's
 * bounding box for downstream scale calibration.
 *
 * `damageClass` (optional) restricts candidate panels to those physically
 * compatible with the damage type — e.g. `tire_flat` only matches `wheel`.
 * Omitting it falls back to the original any-panel behaviour. See F-11.
 *
 * Two-pass strategy:
 *   - Pass 1: run the parts model on the whole frame.
 *   - Pass 2 (only if Pass 1 found zero panels): re-run on a zoom-in
 *     crop centered on the damage. Gives the model a higher-resolution
 *     view of the surrounding panel — meaningfully improves recall on
 *     tight camera shots without slowing down frames where Pass 1
 *     already works.
 */
export async function identifyPanel(
  videoEl: HTMLVideoElement,
  damageBbox: Bbox,
  damageClass?: string,
): Promise<PanelIdentification> {
  try {
    await ensureModel();
    ensureBuffers();
    if (!partSession || !offCtx || !f32Buf) return { panel: "unknown" };

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return { panel: "unknown" };

    // Pass 1 — whole frame.
    let detections = await runPartsInference(videoEl, { x: 0, y: 0, w: vw, h: vh });
    let pass: 1 | 2 = 1;

    // Pass 2 — zoom in around the damage and try again.
    if (detections.length === 0) {
      const crop = computeZoomCrop(damageBbox, vw, vh);
      console.warn(
        `[PartSeg] Pass 1: 0 panel detections — running Pass 2 zoom-in (crop ${crop.w}×${crop.h} at ${crop.x},${crop.y})`,
      );
      detections = await runPartsInference(videoEl, crop);
      pass = 2;
      console.warn(`[PartSeg] Pass 2: ${detections.length} panel detection(s)`);
    }

    if (detections.length === 0) {
      console.warn("[PartSeg] no panel detections after both passes — returning unknown");
      return { panel: "unknown" };
    }

    const winner = pickBestPanel(detections, damageBbox, damageClass);
    if (!winner) return { panel: "unknown" };

    // Optional debug: enable from DevTools console with
    //   localStorage.setItem("debugPartSeg", "1")
    if (
      typeof window !== "undefined" &&
      window.localStorage?.getItem("debugPartSeg") === "1"
    ) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        `[PartSeg] pass=${pass} damage="${damageClass ?? "?"}" — ${detections.length} parts, ` +
          `winning tier=${winner.tier}, panel="${getPartName(winner.classId)}" ` +
          `(overlap ${winner.overlap.toFixed(3)}, conf ${winner.conf.toFixed(2)})`,
      );
      for (const p of detections.slice(0, 10)) {
        const overlap = panelOverlapScore(damageBbox, p.bbox);
        // eslint-disable-next-line no-console
        console.log(
          `  ${getPartName(p.classId).padEnd(18)} conf ${p.conf.toFixed(2)}  overlap ${overlap.toFixed(3)}`,
        );
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    }

    if (winner.tier > 1) {
      console.warn(
        `[PartSeg] tier-1 panel ID failed for damage="${damageClass ?? "?"}" (pass=${pass}) — ` +
          `fell back to tier-${winner.tier}. Picked "${getPartName(winner.classId)}" (overlap ${winner.overlap.toFixed(3)}).`,
      );
    }

    return {
      panel: getPartName(winner.classId),
      panelBbox: winner.bbox,
      frameSize: [vw, vh],
    };
  } catch (err) {
    console.error("[PartSeg] identifyPanel failed:", (err as Error).message);
    return { panel: "unknown" };
  }
}
