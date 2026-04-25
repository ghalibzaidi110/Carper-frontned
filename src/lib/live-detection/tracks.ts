import type { Bbox } from "./iou";
import { iou } from "./iou";

export const SMOOTH = 0.35; // EMA alpha: 0=full smooth, 1=no smooth
export const IOU_MATCH = 0.3; // IoU threshold for track matching
export const MIN_HITS = 2; // frames before track becomes visible
export const LIVE_TTL = 3000; // ms before unmatched track expires

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  bbox: Bbox;
}

export interface Track extends Detection {
  id: number;
  smoothBbox: Bbox;
  hits: number;
  lastSeen: number;
  firstSeen: number;
}

let _trackId = 0;

export function smoothBox(prev: Bbox, curr: Bbox, alpha: number): Bbox {
  return [
    prev[0] + alpha * (curr[0] - prev[0]),
    prev[1] + alpha * (curr[1] - prev[1]),
    prev[2] + alpha * (curr[2] - prev[2]),
    prev[3] + alpha * (curr[3] - prev[3]),
  ];
}

/**
 * Greedy IoU tracker. Mutates `tracks` in place, returns pruned array
 * (stale entries removed).
 */
export function updateTracks(tracks: Track[], dets: Detection[], now: number): Track[] {
  const used = new Set<number>();
  const usedDet = new Set<number>();

  const pairs: { ti: number; di: number; score: number }[] = [];
  for (let ti = 0; ti < tracks.length; ti++) {
    for (let di = 0; di < dets.length; di++) {
      if (tracks[ti].classId !== dets[di].classId) continue;
      const score = iou(tracks[ti].smoothBbox, dets[di].bbox);
      if (score > IOU_MATCH) pairs.push({ ti, di, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  for (const { ti, di } of pairs) {
    if (used.has(ti) || usedDet.has(di)) continue;
    used.add(ti);
    usedDet.add(di);
    const t = tracks[ti];
    const d = dets[di];
    t.bbox = d.bbox;
    t.smoothBbox = smoothBox(t.smoothBbox, d.bbox, SMOOTH);
    t.confidence = t.confidence + SMOOTH * (d.confidence - t.confidence);
    t.hits++;
    t.lastSeen = now;
  }

  for (let di = 0; di < dets.length; di++) {
    if (usedDet.has(di)) continue;
    const d = dets[di];
    tracks.push({
      id: _trackId++,
      classId: d.classId,
      className: d.className,
      confidence: d.confidence,
      bbox: d.bbox,
      smoothBbox: [...d.bbox] as Bbox,
      hits: 1,
      lastSeen: now,
      firstSeen: now,
    });
  }

  return tracks.filter((t) => now - t.lastSeen < LIVE_TTL);
}
