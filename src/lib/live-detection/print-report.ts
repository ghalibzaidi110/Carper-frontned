/**
 * Build a printable HTML damage report. Used by:
 *   - The live-detection ReportDialog (entries from in-memory LogEntry[],
 *     images sourced from IndexedDB and embedded as data: URLs)
 *   - The saved-scan detail page (entries from the persisted
 *     detectionsJson, images already at Cloudinary URLs)
 *
 * Self-contained: returns an HTML string that opens cleanly in a new
 * tab or as a Blob download, with print-friendly CSS and the same
 * visual polish for both flows.
 */

import { displayName } from "./classes";
import { PART_DISPLAY } from "./part-segmenter";

/**
 * Per-entry shape consumed by the printable. Both the live dialog
 * (LogEntry-shaped) and the saved scan (detectionsJson-shaped) can
 * map cleanly into this. `imageUrl` is whatever the caller has on
 * hand: Cloudinary `https://...` URL OR `data:image/jpeg;base64,...`
 * dataURL — the printable doesn't care which.
 */
export interface PrintEntry {
  id: number | string;
  className: string;
  panelLocation?: string | null;
  imageUrl?: string | null;
  estimate?: {
    cost?: number;
    costLow?: number;
    costHigh?: number;
    severity?: string;
    decision?: string;
    unknownFeatures?: string[] | null;
    breakdown?: { repairMethod?: string };
  } | null;
  vendors?: {
    vendors?: Array<{ price: number; currency: string }> | null;
    fallbackEstimate?: { min: number; max: number; currency?: string } | null;
  } | null;
  estimateError?: string | null;
}

export interface PrintVehicle {
  make: string;
  model: string;
  year: number;
  /** Optional body type (sedan / suv / hatchback / pickup / minivan). */
  category?: string | null;
}

export interface PrintTotals {
  total: number;
  low: number;
  high: number;
}

const USD_TO_PKR = 278;

/**
 * Sum the costs across entries, treating USD vendors as PKR via the
 * (loosely-)current FX rate. Mirrors the Report Dialog's `summarize`.
 */
export function summarizeForPrint(entries: PrintEntry[]): PrintTotals {
  let total = 0;
  let low = 0;
  let high = 0;
  for (const e of entries) {
    if (e.estimate?.cost !== undefined) {
      total += e.estimate.cost;
      low += e.estimate.costLow ?? e.estimate.cost;
      high += e.estimate.costHigh ?? e.estimate.cost;
    } else if (e.vendors?.vendors?.length) {
      const cheapest = e.vendors.vendors[0];
      const priced = cheapest.currency === "USD" ? cheapest.price * USD_TO_PKR : cheapest.price;
      total += priced;
      low += priced;
      high += priced * 1.15;
    } else if (e.vendors?.fallbackEstimate) {
      const f = e.vendors.fallbackEstimate;
      total += (f.min + f.max) / 2;
      low += f.min;
      high += f.max;
    }
  }
  return { total: Math.round(total), low: Math.round(low), high: Math.round(high) };
}

function panelLabel(panel?: string | null): string {
  if (!panel || panel === "unknown") return "Unknown";
  return (PART_DISPLAY as Record<string, string>)[panel] ?? panel;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface CostInfo {
  /** Display string with PKR/USD label. */
  value: string;
  /** Whether the cost ran without a known panel (less precise). */
  defaulted: boolean;
  /** True when the entry has an estimate or vendor result. */
  succeeded: boolean;
}

function entryCost(e: PrintEntry): CostInfo {
  if (e.estimate?.cost !== undefined) {
    return {
      value: `${e.estimate.cost.toLocaleString()} PKR`,
      defaulted:
        Array.isArray(e.estimate.unknownFeatures) &&
        e.estimate.unknownFeatures.includes("panelLocation"),
      succeeded: true,
    };
  }
  if (e.vendors?.vendors?.[0]) {
    const v = e.vendors.vendors[0];
    return {
      value: `${v.price.toLocaleString()} ${v.currency}`,
      defaulted: false,
      succeeded: true,
    };
  }
  if (e.vendors?.fallbackEstimate) {
    const f = e.vendors.fallbackEstimate;
    return {
      value: `${f.min.toLocaleString()}–${f.max.toLocaleString()} PKR`,
      defaulted: false,
      succeeded: true,
    };
  }
  return { value: "—", defaulted: false, succeeded: false };
}

/** Severity → color-coded chip class. Falls back to neutral. */
function severityClass(sev?: string): string {
  switch ((sev ?? "").toLowerCase()) {
    case "minor":
      return "chip chip-sev chip-sev-minor";
    case "moderate":
      return "chip chip-sev chip-sev-moderate";
    case "significant":
      return "chip chip-sev chip-sev-significant";
    case "severe":
      return "chip chip-sev chip-sev-severe";
    default:
      return "chip chip-neutral";
  }
}

function decisionClass(decision?: string): string {
  switch ((decision ?? "").toLowerCase()) {
    case "repair":
      return "chip chip-decision-repair";
    case "replace":
      return "chip chip-decision-replace";
    default:
      return "chip chip-neutral";
  }
}

/**
 * Build the printable HTML. Synchronous — the caller is responsible
 * for ensuring `imageUrl` on each entry is whatever they want
 * (Cloudinary URL, base64 dataURL, or null/undefined to render the
 * card with a placeholder).
 */
export function buildPrintHtml(
  entries: PrintEntry[],
  vehicle: PrintVehicle,
  opts: { date?: Date; title?: string; reportId?: string } = {},
): string {
  const summary = summarizeForPrint(entries);
  const reportDate = opts.date ?? new Date();
  const dateLong = reportDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateTime = reportDate.toLocaleString();
  const title = opts.title ?? "Damage Assessment Report";
  const reportId =
    opts.reportId ??
    `RPT-${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, "0")}${String(
      reportDate.getDate(),
    ).padStart(2, "0")}-${String(reportDate.getHours()).padStart(2, "0")}${String(
      reportDate.getMinutes(),
    ).padStart(2, "0")}`;

  const succeeded = entries.filter((e) => entryCost(e).succeeded).length;
  const failed = entries.length - succeeded;

  // ── Summary table rows ──
  const tableRows = entries
    .map((e, i) => {
      const cost = entryCost(e);
      const failedRow = e.estimateError && !cost.succeeded;
      if (failedRow) {
        return `
        <tr class="${i % 2 === 1 ? "tr-zebra" : ""}">
          <td class="cell-num">${i + 1}</td>
          <td><strong>${escapeHtml(displayName(e.className))}</strong></td>
          <td>${escapeHtml(panelLabel(e.panelLocation))}</td>
          <td colspan="3" class="small note-error">⚠ ${escapeHtml(e.estimateError ?? "Estimate unavailable")}</td>
          <td class="num">—</td>
        </tr>`;
      }
      return `
        <tr class="${i % 2 === 1 ? "tr-zebra" : ""}">
          <td class="cell-num">${i + 1}</td>
          <td><strong>${escapeHtml(displayName(e.className))}</strong></td>
          <td>${escapeHtml(panelLabel(e.panelLocation))}</td>
          <td>${
            e.estimate?.severity
              ? `<span class="${severityClass(e.estimate.severity)}">${escapeHtml(e.estimate.severity)}</span>`
              : "—"
          }</td>
          <td>${
            e.estimate?.decision || e.vendors
              ? `<span class="${decisionClass(e.estimate?.decision ?? (e.vendors ? "replace" : ""))}">${escapeHtml(e.estimate?.decision ?? (e.vendors ? "replace" : ""))}</span>`
              : "—"
          }</td>
          <td class="muted">${escapeHtml(
            e.estimate?.breakdown?.repairMethod?.replace(/_/g, " ") ?? "—",
          )}</td>
          <td class="num">${cost.value}${cost.defaulted ? '<div class="note-defaulted">(panel auto-defaulted)</div>' : ""}</td>
        </tr>`;
    })
    .join("");

  // ── Gallery cards (horizontal layout: photo left, info right) ──
  const galleryCards = entries
    .map((e, i) => {
      const cost = entryCost(e);
      const damage = escapeHtml(displayName(e.className));
      const panel = escapeHtml(panelLabel(e.panelLocation));
      const imageHtml = e.imageUrl
        ? `<img src="${escapeHtml(e.imageUrl)}" alt="${damage}" loading="eager" />`
        : `<div class="img-placeholder">📷<br/>No photo</div>`;
      const errorBadge = e.estimateError
        ? `<div class="card-error">⚠ ${escapeHtml(e.estimateError)}</div>`
        : "";
      const defaultedBadge = cost.defaulted
        ? `<div class="card-defaulted">Panel auto-defaulted (±7% margin)</div>`
        : "";
      const method = e.estimate?.breakdown?.repairMethod;
      return `
        <div class="card">
          <div class="card-img">
            ${imageHtml}
            <span class="card-num">#${i + 1}</span>
          </div>
          <div class="card-meta">
            <div class="card-title-row">
              <div>
                <div class="card-title">${damage}</div>
                <div class="card-panel">${panel}</div>
              </div>
              <div class="card-cost">${cost.value}</div>
            </div>
            <div class="card-chips">
              ${
                e.estimate?.severity
                  ? `<span class="${severityClass(e.estimate.severity)}">${escapeHtml(e.estimate.severity)}</span>`
                  : ""
              }
              ${
                e.estimate?.decision || e.vendors
                  ? `<span class="${decisionClass(e.estimate?.decision ?? (e.vendors ? "replace" : ""))}">${escapeHtml(e.estimate?.decision ?? (e.vendors ? "replace" : ""))}</span>`
                  : ""
              }
              ${
                method
                  ? `<span class="chip chip-neutral">${escapeHtml(method.replace(/_/g, " "))}</span>`
                  : ""
              }
            </div>
            ${
              e.estimate?.costLow !== undefined && e.estimate?.costHigh !== undefined
                ? `<div class="card-range">Range ${e.estimate.costLow.toLocaleString()} – ${e.estimate.costHigh.toLocaleString()} PKR</div>`
                : ""
            }
            ${defaultedBadge}
            ${errorBadge}
          </div>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} · ${escapeHtml(`${vehicle.year} ${vehicle.make} ${vehicle.model}`)}</title>
<style>
  /* ─── Reset & base ─── */
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    max-width: 880px;
    margin: 0 auto;
    padding: 0 0 32px 0;
  }

  /* ─── Brand header band ─── */
  .header {
    background: linear-gradient(135deg, #1a4fb8 0%, #2858bf 100%);
    color: #fff;
    padding: 28px 36px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 4px solid #0f3a8a;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-mark {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #fff;
    color: #1a4fb8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 18px;
    letter-spacing: -0.02em;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  .brand-text { font-weight: 700; font-size: 18px; letter-spacing: -0.01em; }
  .brand-text .tag { font-weight: 400; opacity: 0.85; font-size: 11px; display: block; margin-top: 1px; }
  .header-meta { text-align: right; font-size: 11px; opacity: 0.92; }
  .header-meta .report-id { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 600; }

  /* ─── Title area ─── */
  .title-block { padding: 0 36px; margin-bottom: 24px; }
  h1 {
    font-size: 28px;
    margin: 0 0 4px 0;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f1729;
  }
  .subtitle { color: #4a5568; font-size: 14px; margin: 0; }

  /* ─── Section heading ─── */
  h2 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #1a4fb8;
    margin: 0 0 12px 0;
    padding: 0 36px;
  }

  /* ─── Cards row (vehicle info + total) ─── */
  .info-row {
    padding: 0 36px;
    margin-bottom: 28px;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 14px;
  }
  .vehicle-card, .total-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px 18px;
    background: #fafbfc;
  }
  .total-card {
    background: linear-gradient(135deg, #f0f6ff 0%, #e8f1ff 100%);
    border-color: #bdd4fb;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .info-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
  }
  .info-grid div span {
    display: block;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    font-weight: 600;
  }
  .info-grid div strong {
    font-weight: 600;
    font-size: 13px;
    color: #1a1a1a;
    display: block;
    margin-top: 1px;
  }
  .total-amount {
    font-size: 28px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #0f3a8a;
    line-height: 1;
    margin: 4px 0 6px 0;
  }
  .total-amount-currency { font-size: 14px; font-weight: 500; color: #4a5b8a; margin-left: 2px; }
  .total-range {
    font-size: 11.5px;
    color: #4a5568;
    font-variant-numeric: tabular-nums;
  }
  .total-meta {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #cdd9eb;
    font-size: 10.5px;
    color: #4a5568;
    display: flex;
    justify-content: space-between;
  }
  .total-meta .pill {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid #cdd9eb;
    font-weight: 600;
    font-size: 10px;
    color: #1a4fb8;
  }
  .total-meta .pill.fail { color: #b91c1c; border-color: #fecaca; background: #fff; }

  /* ─── Summary table ─── */
  .table-wrap { padding: 0 36px; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  thead tr { background: #f3f4f6; }
  th {
    text-align: left;
    padding: 9px 10px;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9.5px;
    letter-spacing: 0.06em;
    color: #4a5568;
    border-bottom: 2px solid #d1d5db;
  }
  td {
    text-align: left;
    padding: 9px 10px;
    border-bottom: 1px solid #ececec;
    vertical-align: middle;
  }
  .tr-zebra td { background: #fafafa; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .cell-num {
    font-variant-numeric: tabular-nums;
    color: #6b7280;
    font-weight: 600;
    width: 28px;
    text-align: center;
  }
  .small { font-size: 11px; color: #4a5568; }
  .muted { color: #4a5568; text-transform: capitalize; }
  .note-error { color: #b91c1c; font-style: italic; }
  .note-defaulted {
    color: #6b7280;
    font-style: italic;
    font-size: 9.5px;
    margin-top: 2px;
    font-weight: 400;
  }

  /* ─── Chips ─── */
  .chip {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.01em;
  }
  .chip-neutral { background: #f0f0f0; color: #444; border: 1px solid #e0e0e0; }
  .chip-sev-minor       { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .chip-sev-moderate    { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .chip-sev-significant { background: #fed7aa; color: #9a3412; border: 1px solid #fdba74; }
  .chip-sev-severe      { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .chip-decision-repair  { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
  .chip-decision-replace { background: #fce7f3; color: #9d174d; border: 1px solid #fbcfe8; }

  /* ─── Photo gallery ─── horizontal cards, 1 per row */
  .gallery-wrap { padding: 0 36px; }
  .gallery {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card {
    display: grid;
    grid-template-columns: 240px 1fr;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .card-img {
    width: 100%;
    height: 100%;
    min-height: 180px;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    border-right: 1px solid #e5e7eb;
  }
  .card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .card-num {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(15, 23, 42, 0.85);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    letter-spacing: 0.02em;
  }
  .img-placeholder {
    color: #9ca3af;
    font-size: 11px;
    text-align: center;
    line-height: 1.6;
  }
  .card-meta {
    padding: 14px 18px 14px 18px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .card-title { font-weight: 700; font-size: 16px; color: #0f1729; letter-spacing: -0.005em; }
  .card-panel { font-size: 12px; color: #4a5568; margin-top: 2px; }
  .card-cost {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 17px;
    font-weight: 700;
    color: #0f3a8a;
    text-align: right;
    white-space: nowrap;
  }
  .card-chips { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
  .card-range {
    margin-top: 8px;
    font-size: 11px;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
  }
  .card-error {
    margin-top: 8px;
    padding: 5px 9px;
    background: #fef2f2;
    border-left: 3px solid #fca5a5;
    border-radius: 0 4px 4px 0;
    font-size: 10.5px;
    color: #991b1b;
    font-style: italic;
  }
  .card-defaulted {
    margin-top: 6px;
    font-size: 10px;
    color: #6b7280;
    font-style: italic;
  }

  /* ─── Footer ─── */
  .footer {
    margin-top: 36px;
    padding: 16px 36px;
    border-top: 1px solid #e5e7eb;
    font-size: 10px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer .footer-id { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }

  /* ─── Print rules ─── */
  @page { margin: 10mm; size: A4; }
  @media print {
    body { background: #fff; }
    .page { padding: 0; max-width: none; }
    .header { margin-bottom: 18px; padding: 18px 24px; }
    .title-block, h2, .info-row, .table-wrap, .gallery-wrap, .footer { padding-left: 24px; padding-right: 24px; }
    .info-row { margin-bottom: 18px; }
    h2 { page-break-after: avoid; break-after: avoid; }
    .total-card, .vehicle-card { page-break-inside: avoid; break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .card { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">
  <header class="header">
    <div class="brand">
      <div class="brand-mark">C</div>
      <div class="brand-text">
        Carper
        <span class="tag">Damage Detection &amp; Cost Estimation</span>
      </div>
    </div>
    <div class="header-meta">
      <div class="report-id">${escapeHtml(reportId)}</div>
      <div>${escapeHtml(dateLong)}</div>
    </div>
  </header>

  <div class="title-block">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${entries.length} damage${entries.length === 1 ? "" : "s"} assessed${
      failed > 0 ? ` · ${succeeded} estimated, ${failed} failed` : ""
    }</p>
  </div>

  <div class="info-row">
    <div class="vehicle-card">
      <div class="info-label">Vehicle</div>
      <div class="info-grid">
        <div><span>Make</span><strong>${escapeHtml(vehicle.make)}</strong></div>
        <div><span>Model</span><strong>${escapeHtml(vehicle.model)}</strong></div>
        <div><span>Year</span><strong>${vehicle.year}</strong></div>
        <div><span>Body type</span><strong>${escapeHtml(
          vehicle.category ? vehicle.category : "—",
        )}</strong></div>
      </div>
    </div>
    <div class="total-card">
      <div>
        <div class="info-label">Total estimate</div>
        <div class="total-amount">${summary.total.toLocaleString()}<span class="total-amount-currency">PKR</span></div>
        <div class="total-range">Range ${summary.low.toLocaleString()} – ${summary.high.toLocaleString()} PKR</div>
      </div>
      <div class="total-meta">
        <span class="pill">${succeeded} estimated</span>
        ${failed > 0 ? `<span class="pill fail">${failed} failed</span>` : ""}
      </div>
    </div>
  </div>

  <h2>Damage Summary</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="cell-num">#</th>
          <th>Damage</th>
          <th>Panel</th>
          <th>Severity</th>
          <th>Decision</th>
          <th>Method</th>
          <th class="num">Cost</th>
        </tr>
      </thead>
      <tbody>${tableRows || `<tr><td colspan="7" class="small" style="text-align:center;padding:18px;">No damages logged.</td></tr>`}</tbody>
    </table>
  </div>

  ${
    entries.length > 0
      ? `<h2>Damage Photos</h2>
  <div class="gallery-wrap">
    <div class="gallery">${galleryCards}</div>
  </div>`
      : ""
  }

  <footer class="footer">
    <div>
      Generated <strong>${escapeHtml(dateTime)}</strong> · Carper Live Detection
    </div>
    <div class="footer-id">${escapeHtml(reportId)}</div>
  </footer>
</div>
</body>
</html>`;
}
