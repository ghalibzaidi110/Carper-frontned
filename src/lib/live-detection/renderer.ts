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
