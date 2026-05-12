/**
 * IndexedDB persistence for cropped damage captures (image data URLs + metadata).
 * No server round-trip; survives page reloads.
 */

import type { Bbox } from "./iou";

const DB_NAME = "carper-damage-captures";
// v2: added the `entryId` field + index so the Save-scan flow can look
// up a capture by its in-memory LogEntry id without scanning the whole
// store. Existing v1 records (without entryId) keep working — they
// just won't show up in entry-id queries, which is the correct outcome
// because they pre-date the current session's LogEntry ids anyway.
const DB_VERSION = 2;
const STORE = "captures";
const ENTRY_ID_INDEX = "by_entry_id";

export interface CaptureInput {
  className: string;
  classId: number;
  confidence: number;
  bbox: Bbox;
  dataUrl: string;
  /** Frontend-side LogEntry id, so save-scan can match images to entries. */
  entryId?: number;
}

export interface CaptureRecord extends CaptureInput {
  id: number;
  timestamp: string;
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const target = e.target as IDBOpenDBRequest;
      const d = target.result;
      let store: IDBObjectStore;
      if (!d.objectStoreNames.contains(STORE)) {
        store = d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      } else {
        // Existing store — pull it out of the version-change transaction
        // so we can add the index below.
        const tx = target.transaction;
        if (!tx) return;
        store = tx.objectStore(STORE);
      }
      // v2: add an index on entryId. `unique: false` because old records
      // have no entryId, and even within a session multiple captures of
      // the same entry id are theoretically possible if the user logs the
      // same detection twice (rare, but don't crash on it).
      if (!store.indexNames.contains(ENTRY_ID_INDEX)) {
        store.createIndex(ENTRY_ID_INDEX, "entryId", { unique: false });
      }
    };
    req.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

/** Save a capture; returns the auto-assigned id. */
export async function saveCapture(data: CaptureInput): Promise<number> {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add({
      ...data,
      timestamp: new Date().toISOString(),
    });
    req.onsuccess = (e) => resolve((e.target as IDBRequest<number>).result);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/** Fetch all stored captures (newest first). */
export async function getCaptures(): Promise<CaptureRecord[]> {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) => {
      const items = (e.target as IDBRequest<CaptureRecord[]>).result || [];
      resolve(items.reverse());
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/**
 * Find the most recent capture stored for a given LogEntry id. Returns
 * `null` if no capture is associated (entry not yet captured, capture
 * pruned, or pre-v2 record without entryId). Used by the Save-scan
 * flow to gather images for upload without scanning the whole store.
 */
export async function getCaptureForEntry(entryId: number): Promise<CaptureRecord | null> {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index(ENTRY_ID_INDEX);
    const req = idx.getAll(entryId);
    req.onsuccess = (e) => {
      const records = (e.target as IDBRequest<CaptureRecord[]>).result || [];
      // Prefer the newest record if duplicates exist.
      records.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      resolve(records[0] ?? null);
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/** Wipe all captures. */
export async function clearCaptures(): Promise<void> {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/**
 * F-4: Delete captures older than `maxAgeDays`. Default is 30 days, which
 * gives users a reasonable retention window without unbounded growth in
 * IndexedDB. Returns the number of records deleted.
 *
 * Called once on first model load (from `useDamageDetector`) so cleanup
 * happens automatically without UI surface area. Heavy users still hit
 * the limit eventually, but ~30 days of crops is well under typical
 * browser quotas (~1 GB).
 */
export async function pruneOldCaptures(maxAgeDays = 30): Promise<number> {
  const d = await openDB();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.openCursor();
    let deleted = 0;
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (!cursor) {
        if (deleted > 0) {
          // eslint-disable-next-line no-console
          console.log(`[F-4] Pruned ${deleted} capture(s) older than ${maxAgeDays} day(s)`);
        }
        resolve(deleted);
        return;
      }
      const record = cursor.value as CaptureRecord;
      const ts = record.timestamp ? Date.parse(record.timestamp) : 0;
      if (ts && ts < cutoff) {
        cursor.delete();
        deleted++;
      }
      cursor.continue();
    };
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/**
 * Get a quick storage summary — used by any future UI that wants to
 * surface "you have N captures using X MB" to the user.
 */
export async function getCaptureStats(): Promise<{ count: number; bytes: number }> {
  const captures = await getCaptures();
  // Each dataUrl is base64 — bytes ≈ length × 3/4. Cheap approximation.
  const bytes = captures.reduce(
    (sum, c) => sum + Math.round(((c.dataUrl?.length ?? 0) * 3) / 4),
    0,
  );
  return { count: captures.length, bytes };
}
