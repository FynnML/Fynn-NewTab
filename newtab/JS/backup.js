import { STORES, dbGetAll, dbWriteBatch } from "./db.js";
import { showAlertDialog, showConfirmDialog, showToast } from "./dialog.js";
import { t } from "./i18n/i18n.js";
import { NOTE_CONTENT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from "./notes.js";
import { setCustomEngineUrl } from "./search.js";

const APP_ID = "fynn-new-tab";
// Version 1 stays: the optional "wallpapers" field below is ignored (not
// rejected) by older builds, so new backup files remain importable there.
const EXPORT_VERSION = 1;
const STORAGE_PREFIX_RE = /^fynn[-:]/;

// Wallpapers above this size are left out of the export: converting them to
// base64 would create strings beyond what JSON/strings can handle in the
// browser. Matches the spirit of the 500MB upload limit while keeping the
// backup file manageable.
const MAX_EXPORT_WALLPAPER_BYTES = 256 * 1024 * 1024; // 256 MB

// Keep in sync with VALID_WALLPAPER_MODES in wallpaper.js (kept local so this
// module stays decoupled from wallpaper.js DOM side effects).
const VALID_WALLPAPER_MODES = ["default", "primary", "day", "night"];

// Whitelist for imported IDs (notes and wallpapers): only letters, digits,
// dashes, and underscores up to 64 chars. Disallows quotes or HTML entities.
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

// Keys that must never leave the device: they are left out of export files
// and are not part of the import whitelist either.
const EXCLUDED_SETTINGS = new Set([
  "fynn-recent-searches", // search history stays on this device
  "fynn-broken-wallpapers", // runtime state: wallpapers known to be corrupt
]);

// Only these keys are written back on import. Everything else found in a
// backup file is ignored, so a hand-edited export cannot inject arbitrary
// localStorage entries (runtime state and legacy keys stay out too).
//
// The gradient background needs no special handling here: it lives inside
// "fynn-settings" (localStorage), so it is exported/imported with the rest of
// the settings tree. On the next load settings.js runs every value through
// normalize()/sanitize(): unknown paths are dropped, booleans/enums checked,
// hex colors re-validated and the stops array clamped to 2-4 entries with
// positions in 0-100. A hand-edited backup therefore cannot inject a bad
// background config.
const RESTORE_WHITELIST = new Set([
  "fynn-settings",
  "fynn-widget-settings",
  "fynn-time-format",
  "fynn-search-engine",
  "fynn-search-focus-effect",
  "fynn-custom-engine-url",
  "fynn-language",
]);

function collectSettings() {
  const settings = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && STORAGE_PREFIX_RE.test(key) && !EXCLUDED_SETTINGS.has(key)) {
      settings[key] = localStorage.getItem(key);
    }
  }
  return settings;
}

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `fynn-newtab-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("Blob could not be read."));
    reader.readAsDataURL(blob);
  });
}

// Inverse of blobToDataUrl for the "data:...;base64,..." URLs this module
// writes. Throws on anything else so a hand-edited backup cannot smuggle in
// unexpected content.
function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Not a data URL.");
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) throw new Error("Malformed data URL.");

  const header = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);

  if (!/;base64$/i.test(header)) {
    throw new Error("Unsupported data URL encoding.");
  }

  const type = /^data:([^;,]*)/i.exec(header)?.[1] ?? "";

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type });
}

async function serializeWallpaper(wallpaper) {
  if (!isPlainObject(wallpaper) || !(wallpaper.blob instanceof Blob)) return null;
  if (wallpaper.blob.size > MAX_EXPORT_WALLPAPER_BYTES) return null;

  const mode = VALID_WALLPAPER_MODES.includes(wallpaper.mode)
    ? wallpaper.mode
    : (wallpaper.primary ? "primary" : "default");

  return {
    id: String(wallpaper.id),
    name: typeof wallpaper.name === "string" ? wallpaper.name.slice(0, 200) : "",
    type: String(wallpaper.type || wallpaper.blob.type || ""),
    size: wallpaper.blob.size,
    mode,
    createdAt: Number(wallpaper.createdAt) || 0,
    data: await blobToDataUrl(wallpaper.blob),
    thumbnail:
      wallpaper.thumbnailBlob instanceof Blob
        ? await blobToDataUrl(wallpaper.thumbnailBlob)
        : null,
  };
}

export async function exportData({ includeWallpapers = false } = {}) {
  let notes;
  try {
    notes = await dbGetAll(STORES.notes);
  } catch (error) {
    console.error("Backup export failed:", error);
    await showAlertDialog(t("backup.errors.readFailed"), t("common.error"));
    return;
  }

  let wallpapers = [];
  let skippedWallpapers = 0;

  if (includeWallpapers) {
    try {
      const stored = await dbGetAll(STORES.wallpapers);

      for (const wallpaper of stored) {
        try {
          const serialized = await serializeWallpaper(wallpaper);
          if (serialized) {
            wallpapers.push(serialized);
          } else {
            skippedWallpapers++;
          }
        } catch (error) {
          console.warn("A wallpaper could not be added to the backup:", error);
          skippedWallpapers++;
        }
      }
    } catch (error) {
      console.error("Backup export failed:", error);
      await showAlertDialog(t("backup.errors.readFailed"), t("common.error"));
      return;
    }
  }

  try {
    const payload = {
      app: APP_ID,
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: collectSettings(),
      notes,
    };

    if (includeWallpapers) {
      payload.wallpapers = wallpapers;
    }

    downloadJson(payload);
  } catch (error) {
    console.error("Backup export failed:", error);
    await showAlertDialog(t("backup.errors.exportFailed"), t("common.error"));
    return;
  }

  if (skippedWallpapers > 0) {
    showToast(
      t("backup.notices.wallpapersSkipped", {
        count: skippedWallpapers,
        maxSize: Math.round(MAX_EXPORT_WALLPAPER_BYTES / (1024 * 1024)),
      }),
      { variant: "warning" },
    );
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidBackup(payload) {
  return (
    isPlainObject(payload) &&
    payload.app === APP_ID &&
    isPlainObject(payload.settings) &&
    Array.isArray(payload.notes)
  );
}

async function restoreSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    if (!RESTORE_WHITELIST.has(key) || typeof value !== "string") continue;
    try {
      if (key === "fynn-custom-engine-url") {
        setCustomEngineUrl(value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
    }
  }
}

// Validates and prepares every note from the backup file, but does not write
// anything yet — the caller puts all notes (and wallpapers) into a single
// transaction so an error halfway through cannot import "half a backup".
async function collectNoteOperations(notes) {
  const operations = [];

  const existingIds = new Set(
    (await dbGetAll(STORES.notes)).map((note) => String(note.id)),
  );
  const batchIds = new Set();
  let renamed = 0;

  for (const note of notes) {
    if (!isPlainObject(note) || typeof note.id === "undefined") continue;

    const restored = { ...note };
    if (typeof restored.title === "string") {
      restored.title = restored.title.slice(0, NOTE_TITLE_MAX_LENGTH);
    }
    if (typeof restored.content === "string") {
      restored.content = restored.content.slice(0, NOTE_CONTENT_MAX_LENGTH);
    }

    // Merge mode: an id that already exists on this device (or twice in the
    // same file), or that violates the safe ID pattern, becomes a NEW note
    // instead of silently overwriting or injecting unsafe characters.
    const id = String(restored.id);
    if (!SAFE_ID_PATTERN.test(id) || existingIds.has(id) || batchIds.has(id)) {
      restored.id = crypto.randomUUID();
      renamed++;
    }
    batchIds.add(String(restored.id));

    operations.push({ storeName: STORES.notes, value: restored });
  }

  return { operations, imported: operations.length, renamed };
}

async function collectWallpaperOperations(wallpapers) {
  const operations = [];
  let skipped = 0;

  if (!Array.isArray(wallpapers)) {
    return { operations, imported: 0, skipped };
  }

  for (const wallpaper of wallpapers) {
    if (
      !isPlainObject(wallpaper) ||
      typeof wallpaper.id !== "string" ||
      !SAFE_ID_PATTERN.test(wallpaper.id) ||
      typeof wallpaper.type !== "string" ||
      !(wallpaper.type.startsWith("image/") || wallpaper.type.startsWith("video/")) ||
      typeof wallpaper.data !== "string"
    ) {
      skipped++;
      continue;
    }

    let blob;
    let thumbnailBlob = null;

    try {
      blob = dataUrlToBlob(wallpaper.data);
      if (typeof wallpaper.thumbnail === "string") {
        thumbnailBlob = dataUrlToBlob(wallpaper.thumbnail);
      }
    } catch (error) {
      console.warn("Skipping an invalid wallpaper entry from the backup:", error);
      skipped++;
      continue;
    }

    const mode = VALID_WALLPAPER_MODES.includes(wallpaper.mode)
      ? wallpaper.mode
      : "default";

    operations.push({
      storeName: STORES.wallpapers,
      value: {
        id: wallpaper.id,
        name: typeof wallpaper.name === "string" ? wallpaper.name.slice(0, 200) : "",
        type: wallpaper.type,
        size: blob.size,
        blob,
        thumbnailBlob,
        mode,
        primary: mode === "primary",
        createdAt: Number.isFinite(wallpaper.createdAt) ? wallpaper.createdAt : Date.now(),
      },
    });
  }

  return { operations, imported: operations.length, skipped };
}

export async function importData(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (error) {
    console.error("Backup file could not be parsed:", error);
    await showAlertDialog(t("backup.errors.invalidFile"), t("common.error"));
    return;
  }

  if (!isValidBackup(payload)) {
    await showAlertDialog(t("backup.errors.invalidFile"), t("common.error"));
    return;
  }

  const hasWallpapers = Array.isArray(payload.wallpapers) && payload.wallpapers.length > 0;
  const confirmationMessage = hasWallpapers
    ? `${t("backup.dialogs.importConfirmation")} ${t("backup.dialogs.importConfirmationWallpapers", { count: payload.wallpapers.length })}`
    : t("backup.dialogs.importConfirmation");

  const confirmed = await showConfirmDialog(
    confirmationMessage,
    t("backup.dialogs.importTitle"),
    t("common.import"),
    { isDestructive: false },
  );
  if (!confirmed) return;

  try {
    const noteResult = await collectNoteOperations(payload.notes);
    const wallpaperResult = await collectWallpaperOperations(payload.wallpapers);

    // One transaction for notes AND wallpapers: everything commits, or
    // nothing does. Settings are only touched once the database write has
    // really committed (dbWriteBatch resolves on transaction.oncomplete).
    await dbWriteBatch([...noteResult.operations, ...wallpaperResult.operations]);

    await restoreSettings(payload.settings);

    const lines = [
      t("backup.dialogs.importSuccessNotes", { count: noteResult.imported }),
    ];

    if (noteResult.renamed > 0) {
      lines.push(
        t("backup.dialogs.importSuccessRenamed", { count: noteResult.renamed }),
      );
    }

    if (wallpaperResult.imported > 0) {
      lines.push(
        t("backup.dialogs.importSuccessWallpapers", {
          count: wallpaperResult.imported,
        }),
      );
    }

    if (wallpaperResult.skipped > 0) {
      lines.push(
        t("backup.dialogs.importWallpapersSkipped", {
          count: wallpaperResult.skipped,
        }),
      );
    }

    lines.push(t("backup.dialogs.importSuccess"));

    await showAlertDialog(
      lines.join(" "),
      t("backup.dialogs.importSuccessTitle"),
    );
  } catch (error) {
    console.error("Backup import failed:", error);
    await showAlertDialog(t("backup.errors.readFailed"), t("common.error"));
    return;
  }

  location.reload();
}
