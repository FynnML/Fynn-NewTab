import { STORES, dbGetAll, dbPut } from "./db.js";
import { showAlertDialog, showConfirmDialog } from "./dialog.js";
import { t } from "./i18n/i18n.js";
import { NOTE_CONTENT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from "./notes.js";
import { setCustomEngineUrl } from "./search.js";

const APP_ID = "fynn-new-tab";
const EXPORT_VERSION = 1;
const STORAGE_PREFIX_RE = /^fynn[-:]/;

// Only these keys are written back on import. Everything else found in a
// backup file is ignored, so a hand-edited export cannot inject arbitrary
// localStorage entries (runtime state and legacy keys stay out too).
const RESTORE_WHITELIST = new Set([
  "fynn-settings",
  "fynn-widget-settings",
  "fynn-time-format",
  "fynn-search-engine",
  "fynn-search-focus-effect",
  "fynn-custom-engine-url",
  "fynn-recent-searches",
  "fynn-language",
]);

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

async function restoreNotes(notes) {
  for (const note of notes) {
    if (!isPlainObject(note) || typeof note.id === "undefined") continue;

    const restored = { ...note };
    if (typeof restored.title === "string") {
      restored.title = restored.title.slice(0, NOTE_TITLE_MAX_LENGTH);
    }
    if (typeof restored.content === "string") {
      restored.content = restored.content.slice(0, NOTE_CONTENT_MAX_LENGTH);
    }

    await dbPut(STORES.notes, restored);
  }
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

  const confirmed = await showConfirmDialog(
    t("backup.dialogs.importConfirmation"),
    t("backup.dialogs.importTitle"),
    t("common.import"),
  );
  if (!confirmed) return;

  try {
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
