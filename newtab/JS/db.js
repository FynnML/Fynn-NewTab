/**
 * db.js — IndexedDB connection + tiny promise helpers.
 * Wallpapers and Notes both go through these, so the transaction/request
 * boilerplate lives in one place.
 */

export const STORES = Object.freeze({
  wallpapers: "wallpapers",
  notes: "notes",
});

const DB_NAME = "FynnNewTabDB";
const DB_VERSION = 2;

let db = null;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      Object.values(STORES).forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = () => {
      db = request.result;

      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB version changed. Database connection closed.");
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
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