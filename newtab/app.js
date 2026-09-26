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
  // LocalStorage-only features first (no waiting on IndexedDB).
  // Each module gets its own try/catch so one throwing can't block the rest.
  try {
    initI18n();
  } catch (error) {
    console.error("i18n initialization failed:", error);
  }

  try {
    initGreeting({
      el: document.getElementById("greeting"),
    });
  } catch (error) {
    console.error("Greeting initialization failed:", error);
  }

  try {
    initClock();
  } catch (error) {
    console.error("Clock initialization failed:", error);
  }

  try {
    initSearch();
  } catch (error) {
    console.error("Search initialization failed:", error);
  }

  try {
    initOverlayStrength();
  } catch (error) {
    console.error("Overlay strength initialization failed:", error);
  }

  try {
    initDashboard();
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
  }

  // IndexedDB-backed features.
  let dbReady = false;
  try {
    await openDatabase();
    dbReady = true;
  } catch (error) {
    console.error("IndexedDB initialization failed:", error);
    showAlertDialog(t("db.errorMessage"), t("db.errorTitle"));
  }

  if (dbReady) {
    try {
      await initWallpaper();
    } catch (error) {
      console.error("Wallpaper initialization failed:", error);
    }

    try {
      await initNotes();
    } catch (error) {
      console.error("Notes initialization failed:", error);
    }
  }
}

start();

