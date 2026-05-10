/**
 * Canvas2D drawing for detection bounding boxes (overlay on top of video).
 * Stateless — caller passes ctx + canvas + detections.
 */

import { getColor } from "./classes";
import type { Detection } from "./tracks";

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  videoEl: HTMLVideoElement,
  detections: Detection[],
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = canvas.width / (videoEl.videoWidth || 1);
  const sy = canvas.height / (videoEl.videoHeight || 1);

  for (const det of detections) {
    const [x, y, w, h] = det.bbox;
    const dx = x * sx;
    const dy = y * sy;
    const dw = w * sx;
    const dh = h * sy;
    const color = getColor(det.classId);

    // Main box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(dx, dy, dw, dh);

    // Corner accents
    const cl = Math.min(18, dw * 0.25, dh * 0.25);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = color;
    drawCorner(ctx, dx, dy, cl, 1, 1);
    drawCorner(ctx, dx + dw, dy, cl, -1, 1);
    drawCorner(ctx, dx, dy + dh, cl, 1, -1);
    drawCorner(ctx, dx + dw, dy + dh, cl, -1, -1);

    // Label
    const label = `${det.className} ${(det.confidence * 100).toFixed(0)}%`;
    ctx.font = '600 12px "JetBrains Mono", monospace';
    const tm = ctx.measureText(label);
    const tw = tm.width + 10;
    const th = 20;

    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(dx, dy - th - 2, tw, th, [4, 4, 0, 0]);
    } else {
      ctx.rect(dx, dy - th - 2, tw, th);
    }
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    ctx.fillText(label, dx + 5, dy - th / 2 - 2);

    // Soft fill
    ctx.fillStyle = color + "0d";
    ctx.fillRect(dx, dy, dw, dh);
  }
}

function drawCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  dirX: number,
  dirY: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y + len * dirY);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len * dirX, y);
  ctx.stroke();
}

export function clearOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── Depth overlay (Turbo colormap) ─────────────────────────────────

/** Turbo colormap — 256 RGB entries for perceptually-uniform depth viz. */
const TURBO_SRGB_FLOATS: [number, number, number][] = [];
{
  // Compact polynomial approximation of the Google Turbo colormap.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const r = clamp(0.13572138 + x * (4.6153926 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943)))));
    const g = clamp(0.09140261 + x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604)))));
    const b = clamp(0.10667330 + x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973)))));
    TURBO_SRGB_FLOATS.push([r, g, b]);
  }
}

/** Shared ImageData for depth overlay — avoids allocation per frame. */
let _depthImgData: ImageData | null = null;
let _depthImgW = 0;
let _depthImgH = 0;

/**
 * Render a depth map as a semi-transparent turbo-colormap overlay.
 *
 * @param depthMap  Float32Array of relative depth values (H×W)
 * @param mapW     Depth map width
 * @param mapH     Depth map height
 * @param opacity  0-1 alpha for the overlay (default 0.55)
 */
export function drawDepthOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  depthMap: Float32Array,
  mapW: number,
  mapH: number,
  opacity = 0.55,
): void {
  // Allocate (or reallocate) ImageData buffer when dimensions change
  if (!_depthImgData || _depthImgW !== mapW || _depthImgH !== mapH) {
    _depthImgData = new ImageData(mapW, mapH);
    _depthImgW = mapW;
    _depthImgH = mapH;
  }

  // Find min/max for normalization
  let dMin = Infinity;
  let dMax = -Infinity;
  for (let i = 0; i < depthMap.length; i++) {
    const v = depthMap[i];
    if (v < dMin) dMin = v;
    if (v > dMax) dMax = v;
  }
  const range = dMax - dMin || 1;
  const alpha = Math.round(opacity * 255);

  const pixels = _depthImgData.data;
  for (let i = 0; i < depthMap.length; i++) {
    // Normalize to 0-255 and invert so closer = warm (red), farther = cool (blue)
    const norm = 1 - (depthMap[i] - dMin) / range;
    const idx = Math.round(norm * 255);
    const [r, g, b] = TURBO_SRGB_FLOATS[idx];
    const j = i << 2;
    pixels[j] = (r * 255) | 0;
    pixels[j + 1] = (g * 255) | 0;
    pixels[j + 2] = (b * 255) | 0;
    pixels[j + 3] = alpha;
  }

  // Draw at depth-map resolution, then let CSS object-contain scale it
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Use a temp canvas to putImageData at native resolution, then drawImage
  // scaled to the overlay canvas size
  const tmp = new OffscreenCanvas(mapW, mapH);
  const tmpCtx = tmp.getContext("2d")!;
  tmpCtx.putImageData(_depthImgData, 0, 0);
  ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
}
