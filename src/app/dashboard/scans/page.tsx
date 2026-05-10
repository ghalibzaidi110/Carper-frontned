"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  ChevronRight,
  ImageIcon,
  Loader2,
  Plus,
  ScanSearch,
  Wrench,
} from "lucide-react";

import { displayName } from "@/lib/live-detection/classes";
import { formatPKR, getTimeAgo } from "@/lib/format";
import {
  liveDetectionScansService,
  type SavedScanSummary,
} from "@/services/live-detection.service";

type Tab = "date" | "car" | "damage";

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "date", label: "By Date", icon: Calendar },
  { id: "car", label: "By Car", icon: Car },
  { id: "damage", label: "By Damage", icon: Wrench },
];

const DAMAGE_TYPES: Array<{
  className: string;
  field: keyof SavedScanSummary;
  emoji: string;
}> = [
  { className: "dent", field: "dentCount", emoji: "🔴" },
  { className: "scratch", field: "scratchCount", emoji: "🟡" },
  { className: "crack", field: "crackCount", emoji: "🟠" },
  { className: "glass_shatter", field: "glassShatterCount", emoji: "⚫" },
  { className: "lamp_broken", field: "lampBrokenCount", emoji: "💡" },
  { className: "tire_flat", field: "tireFlatCount", emoji: "🔵" },
];

export default function MyScansPage() {
  const [scans, setScans] = useState<SavedScanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("date");

  useEffect(() => {
    void liveDetectionScansService
      .listMine({ take: 50 })
      .then((res) => setScans(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  // ── Loading ──
  if (scans === null && !error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Header />
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Header />
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Couldn&apos;t load scans</p>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!scans || scans.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Header />
        <div className="rounded-xl border border-border bg-muted/30 p-10 text-center">
          <ScanSearch size={32} className="mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No scans yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a live damage scan and click &quot;Save scan&quot; to keep a history.
          </p>
          <Link
            href="/dashboard/live-detection"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Start a live scan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Header />

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              "flex items-center gap-1.5 px-3 py-2 -mb-px text-sm border-b-2 transition-colors " +
              (tab === id
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "date" && <ByDateView scans={scans} />}
      {tab === "car" && <ByCarView scans={scans} />}
      {tab === "damage" && <ByDamageView scans={scans} />}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Scans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your saved damage scans, with cost estimates and photos.
        </p>
      </div>
      <Link
        href="/dashboard/live-detection"
        className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <Plus size={14} />
        New scan
      </Link>
    </div>
  );
}

// ── By Date ────────────────────────────────────────────────────────

function ByDateView({ scans }: { scans: SavedScanSummary[] }) {
  // Group by relative time bucket. Cheap pass — scans are already
  // ordered desc by createdAt.
  const buckets = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const groups: Record<string, SavedScanSummary[]> = {
      "This week": [],
      "This month": [],
      Older: [],
    };
    for (const s of scans) {
      const age = now - new Date(s.createdAt).getTime();
      if (age < 7 * day) groups["This week"].push(s);
      else if (age < 30 * day) groups["This month"].push(s);
      else groups.Older.push(s);
    }
    return groups;
  }, [scans]);

  return (
    <div className="space-y-6">
      {(["This week", "This month", "Older"] as const).map((bucket) =>
        buckets[bucket].length === 0 ? null : (
          <section key={bucket}>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              {bucket}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {buckets[bucket].map((s) => (
                <ScanCard key={s.id} scan={s} />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

// ── By Car ─────────────────────────────────────────────────────────

function ByCarView({ scans }: { scans: SavedScanSummary[] }) {
  const carGroups = useMemo(() => {
    const map = new Map<string, SavedScanSummary[]>();
    for (const s of scans) {
      const key = `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      b[1][0].createdAt.localeCompare(a[1][0].createdAt),
    );
  }, [scans]);

  return (
    <div className="space-y-6">
      {carGroups.map(([carLabel, carScans]) => {
        const totalCost = carScans.reduce((sum, s) => sum + s.totalCostPkr, 0);
        return (
          <section key={carLabel}>
            <header className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Car size={14} className="text-muted-foreground" />
                {carLabel}
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {carScans.length} scan{carScans.length === 1 ? "" : "s"} ·{" "}
                {formatPKR(totalCost)} total
              </span>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {carScans.map((s) => (
                <ScanCard key={s.id} scan={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── By Damage ──────────────────────────────────────────────────────

function ByDamageView({ scans }: { scans: SavedScanSummary[] }) {
  return (
    <div className="space-y-3">
      {DAMAGE_TYPES.map(({ className, field, emoji }) => {
        const matching = scans.filter((s) => (s[field] as number) > 0);
        const totalEntries = matching.reduce(
          (sum, s) => sum + (s[field] as number),
          0,
        );
        if (matching.length === 0) return null;
        return (
          <details
            key={className}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {displayName(className)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalEntries} entr{totalEntries === 1 ? "y" : "ies"} across{" "}
                    {matching.length} scan{matching.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </summary>
            <div className="border-t border-border p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/20">
              {matching.map((s) => (
                <ScanCard key={s.id} scan={s} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────

function ScanCard({ scan }: { scan: SavedScanSummary }) {
  return (
    <Link
      href={`/dashboard/scans/${scan.id}`}
      className="rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden flex"
    >
      {scan.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scan.coverImageUrl}
          alt=""
          className="w-24 h-24 object-cover shrink-0"
        />
      ) : (
        <div className="w-24 h-24 shrink-0 bg-muted/40 flex items-center justify-center">
          <ImageIcon size={20} className="text-muted-foreground" />
        </div>
      )}
      <div className="p-3 min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">
          {scan.vehicleYear} {scan.vehicleMake} {scan.vehicleModel}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {scan.entryCount} item{scan.entryCount === 1 ? "" : "s"} · {getTimeAgo(scan.createdAt)}
          {scan.failedCount > 0 && (
            <span className="text-destructive"> · {scan.failedCount} failed</span>
          )}
        </p>
        <p className="text-sm font-mono tabular-nums text-foreground mt-1">
          {formatPKR(scan.totalCostPkr)}
        </p>
      </div>
    </Link>
  );
}
