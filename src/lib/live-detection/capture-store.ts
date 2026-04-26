/**
 * IndexedDB persistence for cropped damage captures (image data URLs + metadata).
 * No server round-trip; survives page reloads.
 */

import type { Bbox } from "./iou";

const DB_NAME = "carper-damage-captures";
const DB_VERSION = 1;
const STORE = "captures";

export interface CaptureInput {
  className: string;
  classId: number;
  confidence: number;
  bbox: Bbox;
  dataUrl: string;
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
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
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
