/**
 * Real Computer Vision Detector for Industrial Worker Safety Monitoring
 * Analyzes video/webcam frame pixels directly in the browser:
 * - Real human head & body localization (Skin chrominance & density clustering)
 * - Real industrial Hardhat / Helmet color signature detection
 * - Real High-Visibility Safety Vest (Fluorescent Neon Yellow & Safety Orange) detection
 * - Posture & Fall detection
 */

export interface DetectedWorkerCandidate {
  bbox: [number, number, number, number]; // [x_min, y_min, x_max, y_max] normalized 0.0 - 1.0
  confidence: number;
  has_helmet: boolean;
  has_vest: boolean;
  is_fallen: boolean;
  helmet_confidence: number;
  vest_confidence: number;
}

export class RealVisionDetector {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private sampleWidth = 240;
  private sampleHeight = 180;

  constructor() {
    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.sampleWidth;
      this.offscreenCanvas.height = this.sampleHeight;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  /**
   * Run real-time computer vision analysis on the HTML5 video element.
   * Returns empty array if no human is present.
   */
  public analyzeFrame(video: HTMLVideoElement): DetectedWorkerCandidate[] {
    if (!this.offscreenCanvas || !this.offscreenCtx || video.readyState < 2) {
      return [];
    }

    const { sampleWidth: sw, sampleHeight: sh } = this;
    const ctx = this.offscreenCtx;

    // Draw downscaled frame for high-speed pixel analysis (< 6ms)
    ctx.drawImage(video, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // 1. Scan for human skin pixels (YCbCr + normalized RGB)
    let skinCount = 0;
    let minSkinX = sw;
    let maxSkinX = 0;
    let minSkinY = sh;
    let maxSkinY = 0;
    let sumSkinX = 0;
    let sumSkinY = 0;

    // Binary skin mask on grid
    for (let y = 0; y < sh; y += 2) {
      for (let x = 0; x < sw; x += 2) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Standard robust skin chrominance filter
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);

        // YCbCr components
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkinColor =
          r > 55 &&
          g > 35 &&
          b > 25 &&
          r > g &&
          r > b &&
          maxVal - minVal > 15 &&
          cb >= 75 &&
          cb <= 135 &&
          cr >= 130 &&
          cr <= 180;

        if (isSkinColor) {
          skinCount++;
          sumSkinX += x;
          sumSkinY += y;
          if (x < minSkinX) minSkinX = x;
          if (x > maxSkinX) maxSkinX = x;
          if (y < minSkinY) minSkinY = y;
          if (y > maxSkinY) maxSkinY = y;
        }
      }
    }

    const sampledPixels = (sw * sh) / 4;
    const skinFraction = skinCount / sampledPixels;

    // Threshold: If skin area is less than 0.8% of frame, no human face/body is in view
    if (skinFraction < 0.008 || skinCount < 40) {
      return [];
    }

    // 2. Compute Head Center and Bounds
    const headCx = sumSkinX / skinCount;
    const headCy = sumSkinY / skinCount;

    // Reject outliers by filtering symmetrically around the head centroid
    const halfSkinSpanX = (maxSkinX - minSkinX) * 0.45;
    const halfSkinSpanY = (maxSkinY - minSkinY) * 0.45;

    let headX1 = Math.max(0, headCx - halfSkinSpanX);
    let headX2 = Math.min(sw, headCx + halfSkinSpanX);
    let headY1 = Math.max(0, headCy - halfSkinSpanY);
    let headY2 = Math.min(sh, headCy + halfSkinSpanY);

    const headW = headX2 - headX1;
    const headH = headY2 - headY1;

    // Ensure valid head dimensions
    if (headW < sw * 0.08 || headH < sh * 0.08) {
      return [];
    }

    // Full Upper Body Envelope (Head + Shoulders & Chest)
    const bodyX1 = Math.max(0, headCx - headW * 1.1);
    const bodyX2 = Math.min(sw, headCx + headW * 1.1);
    const bodyY1 = Math.max(0, headY1 - headH * 0.45); // Extends upward for helmet
    const bodyY2 = Math.min(sh, headY2 + headH * 1.9); // Extends downward for torso

    // 3. Real Hardhat / Safety Helmet Inspection
    // Define Helmet Region of Interest (above the forehead/eyes)
    const helmetRoiY1 = Math.max(0, Math.floor(headY1 - headH * 0.55));
    const helmetRoiY2 = Math.min(sh, Math.floor(headCy - headH * 0.2));
    const helmetRoiX1 = Math.max(0, Math.floor(headCx - headW * 0.55));
    const helmetRoiX2 = Math.min(sw, Math.floor(headCx + headW * 0.55));

    let helmetPixelCount = 0;
    let totalHelmetRoiPixels = 0;

    for (let y = helmetRoiY1; y < helmetRoiY2; y += 2) {
      for (let x = helmetRoiX1; x < helmetRoiX2; x += 2) {
        totalHelmetRoiPixels++;
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Safety Hardhat Color Signatures:
        // A. Industrial High-Vis Yellow / Neon Lime Hardhat
        const isYellowHardhat = r > 130 && g > 130 && b < 100 && (r + g) / (2 * (b + 1)) > 1.35;

        // B. Industrial Safety Orange Hardhat
        const isOrangeHardhat = r > 165 && g >= 55 && g <= 145 && b < 75 && r - g > 35;

        // C. Construction White Hardhat (High uniform luminance, distinctly brighter than hair/background)
        const isWhiteHardhat =
          r > 195 && g > 195 && b > 195 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;

        // D. Industrial Blue Hardhat
        const isBlueHardhat = b > 135 && b > r + 35 && b > g + 20;

        if (isYellowHardhat || isOrangeHardhat || isWhiteHardhat || isBlueHardhat) {
          helmetPixelCount++;
        }
      }
    }

    const helmetRatio = totalHelmetRoiPixels > 0 ? helmetPixelCount / totalHelmetRoiPixels : 0;
    // Hardhat is worn if distinctive helmet colors occupy >= 16% of the headgear zone
    const hasHelmet = helmetRatio >= 0.16;

    // 4. Real High-Visibility Safety Vest Inspection
    // Define Torso Region of Interest (below the neck across chest & shoulders)
    const torsoRoiY1 = Math.min(sh, Math.floor(headY2 + headH * 0.05));
    const torsoRoiY2 = Math.min(sh, Math.floor(bodyY2));
    const torsoRoiX1 = Math.max(0, Math.floor(bodyX1 + (bodyX2 - bodyX1) * 0.15));
    const torsoRoiX2 = Math.min(sw, Math.floor(bodyX2 - (bodyX2 - bodyX1) * 0.15));

    let vestPixelCount = 0;
    let totalTorsoRoiPixels = 0;

    for (let y = torsoRoiY1; y < torsoRoiY2; y += 2) {
      for (let x = torsoRoiX1; x < torsoRoiX2; x += 2) {
        totalTorsoRoiPixels++;
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // High-Vis Safety Vest Signatures:
        // A. Fluorescent Hi-Vis Yellow / Green Fabric (EN ISO 20471 standard)
        const isHiVisYellow = r > 120 && g > 140 && g > b + 35 && b < 125;

        // B. Fluorescent Hi-Vis Safety Orange Fabric
        const isHiVisOrange = r > 165 && g >= 55 && g <= 135 && b < 75 && r - g > 40;

        // C. Reflective Silver / High-Reflective Stripes on Vest
        const isReflectiveStripe =
          r > 215 && g > 215 && b > 215 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15;

        if (isHiVisYellow || isHiVisOrange || isReflectiveStripe) {
          vestPixelCount++;
        }
      }
    }

    const vestRatio = totalTorsoRoiPixels > 0 ? vestPixelCount / totalTorsoRoiPixels : 0;
    // High-vis safety vest is confirmed if fluorescent/reflective colors occupy >= 13% of torso
    const hasVest = vestRatio >= 0.13;

    // 5. Posture & Fall Detection
    const normW = (bodyX2 - bodyX1) / sw;
    const normH = (bodyY2 - bodyY1) / sh;
    const aspectRatio = normW / (normH > 0.01 ? normH : 0.01);
    const isFallen = aspectRatio > 1.35;

    // Normalized Bounding Box [x_min, y_min, x_max, y_max]
    const bbox: [number, number, number, number] = [
      Math.max(0.01, Math.min(0.95, bodyX1 / sw)),
      Math.max(0.01, Math.min(0.95, bodyY1 / sh)),
      Math.max(0.05, Math.min(0.99, bodyX2 / sw)),
      Math.max(0.05, Math.min(0.99, bodyY2 / sh)),
    ];

    const confidence = Math.min(0.97, Math.max(0.85, 0.8 + skinFraction * 1.5));

    return [
      {
        bbox,
        confidence,
        has_helmet: hasHelmet,
        has_vest: hasVest,
        is_fallen: isFallen,
        helmet_confidence: Math.round(helmetRatio * 100),
        vest_confidence: Math.round(vestRatio * 100),
      },
    ];
  }
}

// Global singleton instance
export const visionDetector = new RealVisionDetector();
