/**
 * Image compression for the Save-scan flow.
 *
 * IndexedDB stores the cropped damage image as a base64 dataURL at
 * native resolution + JPEG q≈0.85. That's ~200–500 KB per image. Sending
 * 10 of those raw to Cloudinary is ~3–5 MB per save — slow on mobile,
 * costs Cloudinary bandwidth, slow detail-page render.
 *
 * We compress before upload: cap at 1024 px on the long edge,
 * re-encode JPEG at 0.8. Brings each image down to ~50–100 KB without
 * visibly hurting quality for damage-report use.
 *
 * Pure browser API — no dependencies.
 */

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

/**
 * Decode a dataURL through an HTMLImageElement. Resolves with the loaded
 * image so a caller can inspect dimensions before drawing.
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = dataUrl;
  });
}

/**
 * Compress a base64 dataURL into a JPEG Blob at most `MAX_DIMENSION`
 * pixels on the long edge. Returns `null` if the source can't be decoded
 * (corrupted IndexedDB record, etc.) — caller should treat that as
 * "no image for this entry" and proceed.
 */
export async function compressDataUrlToJpegBlob(dataUrl: string): Promise<Blob | null> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return null;
  }

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
  });
}
