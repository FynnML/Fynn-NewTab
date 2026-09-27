/**
 * app.js — Entry point. Starts every system of Fynn New Tab.
 */

import { initGreeting } from "./JS/greeting.js";
import { initClock } from "./JS/clock.js";
import { initSearch } from "./JS/search.js";
import { initDashboard } from "./JS/dashboard.js";
import { openDatabase } from "./JS/db.js";
import { initWallpaper, initOverlayStrength } from "./JS/wallpaper.js";
import { initNotes } from "./JS/notes.js";
import { initI18n } from "./JS/i18n/i18n.js";
import { showAlertDialog } from "./JS/dialog.js";
import { t } from "./JS/i18n/i18n.js";

async function start() {
  // Failed modules are collected and reported together so the user gets
  // exactly one dialog, while each try/catch still keeps one broken module
  // from blocking the others.
  const initFailures = [];

  const runInit = async (name, init) => {
    try {
      await init();
    } catch (error) {
      console.error(`${name} initialization failed:`, error);
      initFailures.push(name);
    }
  };

  // LocalStorage-only features first (no waiting on IndexedDB).
  await runInit("i18n", initI18n);
  await runInit("Greeting", () =>
    initGreeting({
      el: document.getElementById("greeting"),
    }),
  );
  await runInit("Clock", initClock);
  await runInit("Search", initSearch);
  await runInit("Overlay strength", initOverlayStrength);
  await runInit("Dashboard", initDashboard);

  // IndexedDB-backed features.
  let dbReady = false;
  await runInit("IndexedDB", async () => {
    await openDatabase();
    dbReady = true;
  });

  if (dbReady) {
    await runInit("Wallpaper", initWallpaper);
    await runInit("Notes", initNotes);
  }

  if (initFailures.length === 0) return;

  // ONE user-facing dialog for all initialization failures. Technical
  // details stay in the console above; the database keeps its specific
  // message when it is the only failure.
  if (initFailures.length === 1 && initFailures[0] === "IndexedDB") {
    showAlertDialog(t("db.errorMessage"), t("db.errorTitle"));
  } else {
    showAlertDialog(t("app.initErrorMessage"), t("app.initErrorTitle"));
  }
}

start();