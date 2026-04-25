"use client";

import { DollarSign, FileText, Loader2, Trash2 } from "lucide-react";

import { displayName, getColor } from "@/lib/live-detection/classes";
import { PART_DISPLAY, type PartKey } from "@/lib/live-detection/part-segmenter";

import type { LogEntry } from "../hooks/useDamageLog";

interface DamageLogProps {
  entries: LogEntry[];
  onDelete: (id: number) => void;
  onClear: () => void;
  onEstimate: (id: number) => void;
  onEstimateAll: () => void;
  estimateAllLoading: boolean;
}

function panelLabel(panel: string | null): string {
  if (!panel || panel === "unknown") return "—";
  return (PART_DISPLAY as Record<string, string>)[panel] ?? panel;
}

export function DamageLog({
  entries,
  onDelete,
  onClear,
  onEstimate,
  onEstimateAll,
  estimateAllLoading,
}: DamageLogProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Damage log</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Tap a live detection to add it here.
        </p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((e) => {
            const conf = Math.round(e.confidence * 100);
            const color = getColor(e.classId);
            const cost = e.estimate?.cost;
            const fallback = e.vendors?.fallbackEstimate;
            const vendorMin = e.vendors?.vendors?.[0]?.price;
            return (
              <li
                key={e.id}
                className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">
                      {displayName(e.className)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {conf}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(e.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                  <span className="truncate">Panel: {panelLabel(e.panelLocation)}</span>
                  {cost !== undefined && (
                    <span className="font-mono tabular-nums text-foreground/90">
                      ≈ {cost.toLocaleString()} PKR
                    </span>
                  )}
                  {cost === undefined && vendorMin !== undefined && (
                    <span className="font-mono tabular-nums text-foreground/90">
                      from {vendorMin.toLocaleString()} PKR
                    </span>
                  )}
                  {cost === undefined && vendorMin === undefined && fallback && (
                    <span className="font-mono tabular-nums text-foreground/90">
                      {fallback.min.toLocaleString()}–{fallback.max.toLocaleString()} PKR
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onEstimate(e.id)}
                  disabled={e.estimateLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
                >
                  {e.estimateLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <DollarSign size={12} />
                  )}
                  {e.estimate || e.vendors ? "View / re-estimate" : "Estimate"}
                </button>
                {e.estimateError && (
                  <p className="text-[11px] text-destructive">{e.estimateError}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {entries.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onEstimateAll}
            disabled={estimateAllLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {estimateAllLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            Estimate all
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// Suppress unused-var for PartKey on production builds where the import was helpful for typing.
export type _Ignored = PartKey;
