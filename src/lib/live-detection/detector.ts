import * as ort from "onnxruntime-web";

import { CLASS_NAMES } from "./classes";
import type { Bbox } from "./iou";
import { iou } from "./iou";
import type { Detection } from "./tracks";

// Match the version installed locally (see package.json -> onnxruntime-web)
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
ort.env.wasm.numThreads = 1;

const MODEL_URL = "/models/damage.onnx";
const MODEL_CACHE = "carper-damage-model-v1";
const INPUT_SIZE = 640;
const TOTAL_PX = INPUT_SIZE * INPUT_SIZE;

let session: ort.InferenceSession | null = null;
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
export async function loadDamageModel(url: string = MODEL_URL): Promise<ort.InferenceSession> {
  if (session) return session;
  const buf = await cachedFetch(url);
  session = await ort.InferenceSession.create(buf, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  ensureBuffers();
  return session;
}

export function isDamageModelLoaded(): boolean {
  return session !== null;
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

  offCtx.fillStyle = "#808080";
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

  const tensor = new ort.Tensor("float32", f32Buffer, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: tensor };

  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  const data = output.data as Float32Array;
  const numBoxes = output.dims[2];
  const numOut = output.dims[1];
  const numCls = numOut - 4;

  const raw: Detection[] = [];

  for (let i = 0; i < numBoxes; i++) {
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
      className: CLASS_NAMES[maxCls] ?? `class_${maxCls}`,
      confidence: maxScore,
      bbox: [x1, y1, x2 - x1, y2 - y1] as Bbox,
    });
  }

  return nms(raw, 0.5);
}

/** Class-aware greedy NMS — only suppress boxes of the same class. */
function nms(dets: Detection[], iouThresh: number): Detection[] {
  dets.sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  for (const d of dets) {
    const suppressed = keep.some(
      (k) => k.classId === d.classId && iou(d.bbox, k.bbox) > iouThresh,
    );
    if (!suppressed) keep.push(d);
  }
  return keep;
}
