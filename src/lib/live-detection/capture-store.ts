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
