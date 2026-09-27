/**
 * db.js — IndexedDB connection + tiny promise helpers.
 */

export const STORES = Object.freeze({
  wallpapers: "wallpapers",
  notes: "notes",
});

const DB_NAME = "FynnNewTabDB";
const DB_VERSION = 2;

const DB_OPEN_TIMEOUT_MS = 15 * 1000;

let db = null;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;

    const resolveOnce = (database) => {
      if (settled) {
        database.close();
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      db = database;

      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB version changed. Database connection closed.");
      };

      resolve(db);
    };

    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(error);
    };

    const timeoutId = setTimeout(() => {
      rejectOnce(new Error("Timed out while opening the local database."));
    }, DB_OPEN_TIMEOUT_MS);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      Object.values(STORES).forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = () => {
      resolveOnce(request.result);
    };

    request.onerror = () => {
      rejectOnce(request.error);
    };

    request.onblocked = () => {
      console.warn(
        "IndexedDB open is blocked: another New Tab tab is keeping the old " +
          "database connection open. Close the other tabs and reload this page.",
      );
      rejectOnce(new Error("IndexedDB upgrade is blocked by another open tab."));
    };
  });
}

function getStore(storeName, mode) {
  if (!db) {
    throw new Error("Database is not open. Call openDatabase() first.");
  }
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// `async` so a synchronous throw (e.g. DB not open) becomes a rejected promise.
export async function dbGetAll(storeName) {
  return promisify(getStore(storeName, "readonly").getAll());
}

export async function dbPut(storeName, value) {
  await promisify(getStore(storeName, "readwrite").put(value));
}

export async function dbDelete(storeName, id) {
  await promisify(getStore(storeName, "readwrite").delete(id));
}