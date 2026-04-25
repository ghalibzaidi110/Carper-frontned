"use client";

import { Plus } from "lucide-react";

import { displayName, getColor } from "@/lib/live-detection/classes";
import type { Detection } from "@/lib/live-detection/tracks";

interface DetectionsListProps {
  detections: Detection[];
  onLog: (det: Detection) => void;
}

export function DetectionsList({ detections, onLog }: DetectionsListProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Live detections</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{detections.length}</span>
      </div>
      {detections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active detections.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {detections.map((d, i) => {
            const conf = Math.round(d.confidence * 100);
            const color = getColor(d.classId);
            return (
              <li
                key={`${d.classId}-${i}-${d.bbox[0]}`}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-muted/40 border border-border/60"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">
                    {displayName(d.className)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {conf}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onLog(d)}
                  title="Log this detection"
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0"
                >
                  <Plus size={12} />
                  Log
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
