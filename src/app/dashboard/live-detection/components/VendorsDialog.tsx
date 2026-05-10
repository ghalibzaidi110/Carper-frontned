"use client";

import { ExternalLink, Star } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { displayName } from "@/lib/live-detection/classes";

import type { LogEntry } from "../hooks/useDamageLog";

interface VendorsDialogProps {
  entry: LogEntry | null;
  onClose: () => void;
}

export function VendorsDialog({ entry, onClose }: VendorsDialogProps) {
  const open = entry !== null && entry.vendors !== null;
  const result = entry?.vendors;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replacement parts</DialogTitle>
        </DialogHeader>
        {entry && result && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Searched vendors for {displayName(entry.className)} on{" "}
              <span className="font-medium text-foreground">
                {entry.panelLocation && entry.panelLocation !== "unknown"
                  ? entry.panelLocation.replace(/_/g, " ")
                  : "the affected part"}
              </span>
              .
            </p>

            {result.vendors.length > 0 ? (
              <ul className="space-y-2">
                {result.vendors.map((v, i) => (
                  <li
                    key={`${v.name}-${i}`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail}
                        alt={v.partName}
                        className="w-16 h-16 object-cover rounded-md border border-border shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {v.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {v.partName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                        <span className="font-mono tabular-nums font-semibold text-foreground">
                          Rs {v.price.toLocaleString()}
                        </span>
                        {v.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                            <Star size={12} fill="currentColor" />
                            <span className="tabular-nums">{v.rating.toFixed(1)}</span>
                            {v.reviews > 0 && (
                              <span className="text-muted-foreground">
                                ({v.reviews})
                              </span>
                            )}
                          </span>
                        )}
                        {!v.inStock && (
                          <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] uppercase tracking-wider">
                            Out of stock
                          </span>
                        )}
                        {v.deliveryDays !== null && (
                          <span className="text-muted-foreground">
                            ~{v.deliveryDays}d delivery
                          </span>
                        )}
                      </div>
                    </div>
                    {v.url && (
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                        title="Open vendor page"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : result.fallbackEstimate ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  {result.fallbackEstimate.partName}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {result.fallbackEstimate.min.toLocaleString()}
                  <span className="text-muted-foreground"> – </span>
                  {result.fallbackEstimate.max.toLocaleString()}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    {result.fallbackEstimate.currency}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {result.fallbackEstimate.note}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No vendors found.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
