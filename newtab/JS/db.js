export const STORES = Object.freeze({
  wallpapers: "wallpapers",
  notes: "notes",
});

const DB_NAME = "FynnNewTabDB";
const DB_VERSION = 2;

const DB_OPEN_TIMEOUT_MS = 15 * 1000;

let db = null;

// Opens the database at the version this build expects. Call with
// { latest: true } to open at whatever version is currently live — used when
// another tab running newer code has already upgraded the schema.
export function openDatabase({ latest = false } = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, latest ? undefined : DB_VERSION);
    let settled = false;

    const resolveOnce = (database) => {
      if (settled) {
        database.close();
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      db = database;

      // Another tab has requested a version upgrade (typical right after an
      // extension update with several New Tab tabs open). Close this
      // connection AND clear the cached handle: leaving `db` pointing at a
      // closed connection would make every later db.transaction(...) throw
      // InvalidStateError until the page was reloaded.
      database.onversionchange = () => {
        database.close();
        if (db === database) {
          db = null;
        }
        console.warn("IndexedDB version changed. Database connection closed.");
      };

      resolve(database);
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

// Reopens the database if the cached connection is gone. Returns the live
// IDBDatabase instance.
async function ensureOpen() {
  if (!db) {
    // The cached connection is gone (closed by onversionchange, or never
    // opened). Reopen lazily so wallpapers and notes keep working instead of
    // failing until the next reload.
    try {
      await openDatabase();
    } catch (error) {
      if (error?.name !== "VersionError") throw error;

      // A tab running newer code has already upgraded the database beyond
      // the version this build knows about. Retry without an explicit
      // version so this tab can still talk to the live database.
      await openDatabase({ latest: true });
    }
  }
  return db;
}

async function getStore(storeName, mode) {
  const database = await ensureOpen();
  return database.transaction(storeName, mode).objectStore(storeName);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetAll(storeName) {
  const store = await getStore(storeName, "readonly");
  return promisify(store.getAll());
}

export async function dbGet(storeName, key) {
  const store = await getStore(storeName, "readonly");
  return promisify(store.get(key));
}

// Resolves only when the surrounding transaction has actually committed, so
// callers never report success for a write that was later lost (e.g. aborted
// by a quota error while saving a large video).
function awaitTransaction(transaction) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const once = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    transaction.oncomplete = () => once();
    transaction.onerror = () =>
      once(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      once(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

export async function dbPut(storeName, value) {
  const store = await getStore(storeName, "readwrite");
  const transaction = store.transaction;
  store.put(value);
  await awaitTransaction(transaction);
}

export async function dbDelete(storeName, id) {
  const store = await getStore(storeName, "readwrite");
  const transaction = store.transaction;
  store.delete(id);
  await awaitTransaction(transaction);
}

// Writes across several object stores in ONE transaction — all operations
// commit together or none do. Used by backup import so a mid-way failure
// cannot leave half the backup on disk. Operations: [{ storeName, value }].
export async function dbWriteBatch(operations) {
  if (!Array.isArray(operations) || operations.length === 0) return;

  const database = await ensureOpen();
  const storeNames = [...new Set(operations.map((op) => op.storeName))];
  const transaction = database.transaction(storeNames, "readwrite");

  const objectStores = new Map(
    storeNames.map((name) => [name, transaction.objectStore(name)]),
  );

  for (const operation of operations) {
    objectStores.get(operation.storeName).put(operation.value);
  }

  await awaitTransaction(transaction);
}