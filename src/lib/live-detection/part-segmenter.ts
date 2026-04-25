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
import { panelOverlapScore } from "./iou";

const MODEL_URL = "/models/parts.onnx";
const MODEL_CACHE = "carper-parts-model-v1";
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.1;

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

let loadingPromise: Promise<void> | null = null;

async function ensureModel(): Promise<void> {
  if (partSession) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
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

function getPartName(classId: number): string {
  return PART_CLASS_KEYS[classId] ?? "unknown";
}

/**
 * Identify the panel at the given damage bbox. Returns the panel key
 * (e.g. "hood") or "unknown" if nothing detected.
 */
export async function identifyPanel(
  videoEl: HTMLVideoElement,
  damageBbox: Bbox,
): Promise<string> {
  try {
    await ensureModel();
    ensureBuffers();
    if (!partSession || !offCtx || !f32Buf) return "unknown";

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return "unknown";

    const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
    const nw = Math.round(vw * scale);
    const nh = Math.round(vh * scale);
    const dx = (INPUT_SIZE - nw) / 2;
    const dy = (INPUT_SIZE - nh) / 2;

    offCtx.fillStyle = "#808080";
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
      const x1 = Math.max(0, (data[base + 0] - dx) / scale);
      const y1 = Math.max(0, (data[base + 1] - dy) / scale);
      const x2 = Math.min(vw, (data[base + 2] - dx) / scale);
      const y2 = Math.min(vh, (data[base + 3] - dy) / scale);
      if (x2 <= x1 || y2 <= y1) continue;

      partDets.push({ classId, conf, bbox: [x1, y1, x2 - x1, y2 - y1] as Bbox });
    }

    if (partDets.length === 0) {
      console.warn("[PartSeg] no part detections — returning unknown");
      return "unknown";
    }

    let bestPart = partDets[0];
    let bestScore = -1;
    for (const part of partDets) {
      const overlap = panelOverlapScore(damageBbox, part.bbox);
      const score = overlap * part.conf;
      if (score > bestScore) {
        bestScore = score;
        bestPart = part;
      }
    }

    return getPartName(bestPart.classId);
  } catch (err) {
    console.error("[PartSeg] identifyPanel failed:", (err as Error).message);
    return "unknown";
  }
}
