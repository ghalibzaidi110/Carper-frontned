/**
 * WebXR depth sensing — Tier 1 measurement source.
 *
 * Uses the device's AR depth sensor (ARCore on Android, ARKit via
 * WebXR on supported browsers) to get absolute distance measurements
 * in meters. This produces the most accurate damage dimensions and
 * dent depth because the values are real-world, not relative.
 *
 * WebXR is NOT available on:
 *  - iOS Safari (no WebXR support)
 *  - Desktop browsers (no AR hardware)
 *  - Older Android devices (no ARCore)
 *
 * When unavailable, the system falls through to Tier 2 (Depth-Anything)
 * or Tier 3 (panel-as-ruler).
 */

import type { Bbox } from "./iou";

// ── Feature detection ───────────────────────────────────────────────

/**
 * Check if WebXR immersive-ar with depth-sensing is available.
 * Returns false quickly on unsupported browsers/devices.
 */
export async function isWebXRDepthAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

// ── Types ───────────────────────────────────────────────────────────

export interface WebXRMeasurement {
  /** Damage width in centimetres */
  widthCm: number;
  /** Damage height in centimetres */
  heightCm: number;
  /** Damage area in cm² */
  areaCm2: number;
  /** Damage perimeter in cm */
  perimCm: number;
  /** Dent depth in millimetres (positive = concavity) */
  depthMm: number;
  /** Camera-to-surface distance in metres */
  cameraDistanceM: number;
}

interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}

// ── Session management ──────────────────────────────────────────────

export class WebXRDepthSession {
  private xrSession: XRSession | null = null;
  private refSpace: XRReferenceSpace | null = null;
  private latestFrame: XRFrame | null = null;
  private latestView: XRView | null = null;
  private animFrameId: number | null = null;
  private glContext: WebGLRenderingContext | null = null;

  /** Whether the XR session is currently active */
  get isActive(): boolean {
    return this.xrSession !== null;
  }

  /**
   * Start an immersive-ar session with depth sensing.
   * The canvas is used for the XR WebGL layer (camera passthrough).
   */
  async start(canvas: HTMLCanvasElement): Promise<void> {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) throw new Error("WebXR not available");

    const gl = canvas.getContext("webgl", { xrCompatible: true });
    if (!gl) throw new Error("WebGL context failed");
    this.glContext = gl;

    this.xrSession = await xr.requestSession("immersive-ar", {
      requiredFeatures: ["depth-sensing", "local"],
      depthSensing: {
        usagePreference: ["cpu-optimized"],
        dataFormatPreference: ["luminance-alpha"],
      },
    } as XRSessionInit);

    const xrLayer = new XRWebGLLayer(this.xrSession, gl);
    await this.xrSession.updateRenderState({ baseLayer: xrLayer });
    this.refSpace = await this.xrSession.requestReferenceSpace("local");

    // Start the XR frame loop — stores latest frame/view for on-demand sampling
    const onFrame = (_time: number, frame: XRFrame) => {
      this.latestFrame = frame;
      const pose = frame.getViewerPose(this.refSpace!);
      if (pose && pose.views.length > 0) {
        this.latestView = pose.views[0];
      }
      this.animFrameId = this.xrSession!.requestAnimationFrame(onFrame);
    };
    this.animFrameId = this.xrSession.requestAnimationFrame(onFrame);

    this.xrSession.addEventListener("end", () => this.cleanup());
  }

  /** Stop the XR session and clean up. */
  stop(): void {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {});
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animFrameId !== null && this.xrSession) {
      this.xrSession.cancelAnimationFrame(this.animFrameId);
    }
    this.xrSession = null;
    this.refSpace = null;
    this.latestFrame = null;
    this.latestView = null;
    this.animFrameId = null;
    this.glContext = null;
  }

  /**
   * Extract camera intrinsics from the XR projection matrix.
   * The projection matrix P maps camera-space coords to clip space:
   *   P[0][0] = 2*fx/width,  P[1][1] = 2*fy/height
   * We need the actual focal length in pixels.
   */
  getCameraIntrinsics(view: XRView, viewportWidth: number, viewportHeight: number): CameraIntrinsics {
    const p = view.projectionMatrix;
    // projectionMatrix is column-major: p[0]=P00, p[5]=P11, p[8]=P02, p[9]=P12
    const fx = (p[0] * viewportWidth) / 2;
    const fy = (p[5] * viewportHeight) / 2;
    const cx = ((1 - p[8]) * viewportWidth) / 2;
    const cy = ((1 + p[9]) * viewportHeight) / 2;
    return { fx, fy, cx, cy };
  }

  /**
   * Get depth in metres at a normalized viewport coordinate.
   * Returns null if depth data is unavailable.
   */
  private getDepthAtNormalized(
    depthInfo: XRCPUDepthInformation,
    normX: number,
    normY: number,
  ): number | null {
    try {
      const x = Math.max(0, Math.min(1, normX));
      const y = Math.max(0, Math.min(1, normY));
      return depthInfo.getDepthInMeters(x, y);
    } catch {
      return null;
    }
  }

  /**
   * Measure damage dimensions and dent depth using the current XR frame.
   *
   * @param damageBbox - [x, y, w, h] in original video/canvas pixel coords
   * @param frameWidth - Width of the source frame
   * @param frameHeight - Height of the source frame
   */
  measureDamage(
    damageBbox: Bbox,
    frameWidth: number,
    frameHeight: number,
  ): WebXRMeasurement | null {
    if (!this.latestFrame || !this.latestView || !this.refSpace) return null;

    // Get depth information from the current frame
    let depthInfo: XRCPUDepthInformation;
    try {
      depthInfo = this.latestFrame.getDepthInformation(this.latestView) as XRCPUDepthInformation;
    } catch {
      return null;
    }
    if (!depthInfo) return null;

    const [dx, dy, dw, dh] = damageBbox;

    // Convert bbox corners to normalized viewport coords (0-1)
    const normLeft = dx / frameWidth;
    const normRight = (dx + dw) / frameWidth;
    const normTop = dy / frameHeight;
    const normBottom = (dy + dh) / frameHeight;
    const normCenterX = (dx + dw / 2) / frameWidth;
    const normCenterY = (dy + dh / 2) / frameHeight;

    // Sample depth at key points
    const centerDepth = this.getDepthAtNormalized(depthInfo, normCenterX, normCenterY);
    const leftDepth = this.getDepthAtNormalized(depthInfo, normLeft, normCenterY);
    const rightDepth = this.getDepthAtNormalized(depthInfo, normRight, normCenterY);
    const topDepth = this.getDepthAtNormalized(depthInfo, normCenterX, normTop);
    const bottomDepth = this.getDepthAtNormalized(depthInfo, normCenterX, normBottom);

    if (centerDepth === null) return null;

    // Average edge depth as the panel surface reference
    const edgeDepths = [leftDepth, rightDepth, topDepth, bottomDepth].filter(
      (d): d is number => d !== null,
    );
    const surfaceDepth = edgeDepths.length > 0
      ? edgeDepths.reduce((a, b) => a + b, 0) / edgeDepths.length
      : centerDepth;

    // Dent depth: how much deeper the center is vs the surrounding surface
    // Positive = dent (recessed), negative = protrusion
    const depthDeltaM = centerDepth - surfaceDepth;
    const depthMm = Math.max(0, depthDeltaM * 1000);

    // Convert pixel dimensions to real-world cm using depth + camera intrinsics
    const baseLayer = this.xrSession!.renderState.baseLayer;
    const vpWidth = baseLayer?.getViewport(this.latestView)?.width ?? frameWidth;
    const vpHeight = baseLayer?.getViewport(this.latestView)?.height ?? frameHeight;
    const { fx, fy } = this.getCameraIntrinsics(this.latestView, vpWidth, vpHeight);

    // Real-world size: size_m = (pixel_size / focal_length_px) * depth_m
    // Scale bbox pixel dimensions from frameWidth/Height to viewport
    const scaleX = vpWidth / frameWidth;
    const scaleY = vpHeight / frameHeight;
    const widthM = ((dw * scaleX) / fx) * surfaceDepth;
    const heightM = ((dh * scaleY) / fy) * surfaceDepth;

    const widthCm = Math.round(widthM * 100 * 10) / 10;
    const heightCm = Math.round(heightM * 100 * 10) / 10;

    return {
      widthCm,
      heightCm,
      areaCm2: Math.round(widthCm * heightCm * 100) / 100,
      perimCm: Math.round(2 * (widthCm + heightCm) * 100) / 100,
      depthMm: Math.round(depthMm * 10) / 10,
      cameraDistanceM: Math.round(surfaceDepth * 100) / 100,
    };
  }
}
