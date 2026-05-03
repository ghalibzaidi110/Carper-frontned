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
// Instead of confidence-gating, F-11 mislabel reduction relies on three
// confidence-independent filters that survived rollout:
//   1. SKIP_PART_KEYS         — drop the "object" catch-all class
//   2. DAMAGE_COMPATIBLE_PANELS — only allow physically-possible pairings
//                                (e.g. tire_flat → wheel only)
//   3. MIN_PANEL_OVERLAP       — return "unknown" if best overlap < floor
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
    if (!resp.ok) throw new Error(`Part seg model fetch failed: ${resp.status}`);
    return resp.arrayBuffer();
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

/**
 * Identify the panel at the given damage bbox. Returns the panel key
 * (e.g. "hood") or "unknown" if nothing detected, plus the panel's
 * bounding box for downstream scale calibration.
 *
 * `damageClass` (optional) restricts candidate panels to those physically
 * compatible with the damage type — e.g. `tire_flat` only matches `wheel`.
 * Omitting it falls back to the original any-panel behaviour. See F-11.
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

    const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
    const nw = Math.round(vw * scale);
    const nh = Math.round(vh * scale);
    const dx = (INPUT_SIZE - nw) / 2;
    const dy = (INPUT_SIZE - nh) / 2;

    offCtx.fillStyle = YOLO_PAD_COLOR;
    offCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    offCtx.drawImage(videoEl, dx, dy, nw, nh);

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

    const partDets: { classId: number; conf: number; bbox: Bbox }[] = [];
    for (let i = 0; i < numDets; i++) {
      const base = i * rowSize;
      const conf = data[base + 4];
      if (conf < CONF_THRESHOLD) continue;

      const classId = Math.round(data[base + 5]);
      // Skip the generic "object" catch-all (F-11): when the model isn't
      // sure, it tends to pick this with low confidence and pollute the
      // overlap-score selection.
      const partKey = PART_CLASS_KEYS[classId];
      if (partKey && SKIP_PART_KEYS.has(partKey)) continue;

      const x1 = Math.max(0, (data[base + 0] - dx) / scale);
      const y1 = Math.max(0, (data[base + 1] - dy) / scale);
      const x2 = Math.min(vw, (data[base + 2] - dx) / scale);
      const y2 = Math.min(vh, (data[base + 3] - dy) / scale);
      if (x2 <= x1 || y2 <= y1) continue;

      partDets.push({ classId, conf, bbox: [x1, y1, x2 - x1, y2 - y1] as Bbox });
    }

    if (partDets.length === 0) {
      console.warn("[PartSeg] no part detections — returning unknown");
      return { panel: "unknown" };
    }

    // F-11: physical-compatibility filter. For damage classes that can
    // only land on a small set of panels (tire_flat → wheel, glass_shatter
    // → glass, lamp_broken → lights), restrict candidates to those panels
    // before picking the best by overlap. If the parts model didn't
    // detect any compatible panel this frame, return "unknown" rather
    // than fall back to an unconstrained guess — the user's panel
    // dropdown is a better answer than e.g. "tire_flat on hood".
    let candidates = partDets;
    const compatibleSet = damageClass ? DAMAGE_COMPATIBLE_PANELS[damageClass] : undefined;
    if (compatibleSet) {
      const filtered = partDets.filter((p) => {
        const key = PART_CLASS_KEYS[p.classId];
        return key !== undefined && compatibleSet.has(key);
      });
      if (filtered.length === 0) {
        console.warn(
          `[PartSeg] no compatible panel for damage="${damageClass}" — returning unknown`,
        );
        return { panel: "unknown" };
      }
      candidates = filtered;
    }

    let bestPart = candidates[0];
    let bestScore = -1;
    let bestOverlap = 0;
    for (const part of candidates) {
      const overlap = panelOverlapScore(damageBbox, part.bbox);
      const score = overlap * part.conf;
      if (score > bestScore) {
        bestScore = score;
        bestOverlap = overlap;
        bestPart = part;
      }
    }

    // F-11: spatial-sanity floor. If the winning panel barely overlaps
    // the damage at all, we're picking "best of bad options" — better
    // to surface unknown and let the user override.
    if (bestOverlap < MIN_PANEL_OVERLAP) {
      console.warn(
        `[PartSeg] best panel overlap ${bestOverlap.toFixed(3)} below floor ${MIN_PANEL_OVERLAP} — returning unknown`,
      );
      return { panel: "unknown" };
    }

    return {
      panel: getPartName(bestPart.classId),
      panelBbox: bestPart.bbox,
      frameSize: [vw, vh],
    };
  } catch (err) {
    console.error("[PartSeg] identifyPanel failed:", (err as Error).message);
    return { panel: "unknown" };
  }
}
