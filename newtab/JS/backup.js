/**
 * backup.js — Export / import notes and settings as a JSON file.
 */

import { STORES, dbGetAll, dbPut } from "./db.js";
import { showAlertDialog, showConfirmDialog } from "./dialog.js";
import { t } from "./i18n/i18n.js";
import { setCustomEngineUrl } from "./search.js";

const APP_ID = "fynn-new-tab";
const EXPORT_VERSION = 1;
const STORAGE_PREFIX_RE = /^fynn[-:]/;

function collectSettings() {
  const settings = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && STORAGE_PREFIX_RE.test(key)) {
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

/** Triggered directly by the Export button — no confirmation needed, it only reads data. */
export async function exportData() {
  let notes;
  try {
    notes = await dbGetAll(STORES.notes);
  } catch (error) {
    console.error("Backup export failed:", error);
    await showAlertDialog(t("backup.errors.readFailed"), t("common.error"));
    return;
  }

  try {
    downloadJson({
      app: APP_ID,
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: collectSettings(),
      notes,
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    await showAlertDialog(t("backup.errors.readFailed"), t("common.error"));
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
    if (!STORAGE_PREFIX_RE.test(key) || typeof value !== "string") continue;
    try {
      if (key === "fynn-custom-engine-url") {
        setCustomEngineUrl(value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      /* quota or private-mode error — skip this key, keep going */
    }
  }
}

async function restoreNotes(notes) {
  for (const note of notes) {
    if (!isPlainObject(note) || typeof note.id === "undefined") continue;
    await dbPut(STORES.notes, note);
  }
}

/** Triggered from the Import button's hidden file input's `change` event. */
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

  const confirmed = await showConfirmDialog(
    t("backup.dialogs.importConfirmation"),
    t("backup.dialogs.importTitle"),
    t("common.import"),
  );
  if (!confirmed) return;

  try {
    // Notes go through IndexedDB first: if the database isn't ready yet,
    // fail before touching localStorage so nothing is left half-restored.
    await restoreNotes(payload.notes);
  } catch (error) {
    console.error("Backup import failed:", error);
    await showAlertDialog(t("backup.errors.readFailed"), t("common.error"));
    return;
  }

  await restoreSettings(payload.settings);

  await showAlertDialog(t("backup.dialogs.importSuccess"), t("backup.dialogs.importSuccessTitle"));
  location.reload();
}
