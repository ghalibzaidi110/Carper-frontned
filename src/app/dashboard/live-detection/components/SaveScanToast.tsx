"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, X, AlertCircle, ExternalLink } from "lucide-react";

import type { SaveScanState } from "../hooks/useSaveScan";

interface SaveScanToastProps {
  state: SaveScanState;
  onDismiss: () => void;
  onRetry?: () => void;
}

/**
 * Bottom-right floating toast that survives the Report Dialog being
 * closed mid-save. Shows progress while uploading, success with a link
 * to the saved scan, or an error with a Retry button. Only renders when
 * `state.status !== "idle"`.
 */
export function SaveScanToast({ state, onDismiss, onRetry }: SaveScanToastProps) {
  if (state.status === "idle") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="rounded-lg border border-border bg-card shadow-lg p-3 flex items-start gap-3">
        {state.status === "preparing" || state.status === "uploading" ? (
          <Loader2 size={18} className="text-primary animate-spin shrink-0 mt-0.5" />
        ) : state.status === "saved" ? (
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
        )}

        <div className="min-w-0 flex-1">
          {state.status === "preparing" && (
            <>
              <p className="text-sm font-medium text-foreground">Preparing scan…</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compressing {state.current} image{state.current === 1 ? "" : "s"}
              </p>
            </>
          )}
          {state.status === "uploading" && (
            <>
              <p className="text-sm font-medium text-foreground">Saving scan…</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uploading {state.total} image{state.total === 1 ? "" : "s"} & metadata
              </p>
            </>
          )}
          {state.status === "saved" && state.savedScanId && (
            <>
              <p className="text-sm font-medium text-foreground">Scan saved</p>
              <Link
                href={`/dashboard/scans/${state.savedScanId}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
              >
                View saved scan <ExternalLink size={11} />
              </Link>
            </>
          )}
          {state.status === "error" && (
            <>
              <p className="text-sm font-medium text-foreground">Save failed</p>
              <p className="text-xs text-muted-foreground mt-0.5 break-words">
                {state.error ?? "Unknown error"}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Retry
                </button>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
