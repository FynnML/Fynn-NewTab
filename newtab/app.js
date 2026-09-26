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

async function start() {
  try {
    // LocalStorage-only features first (no waiting on IndexedDB).
    initI18n();

    initGreeting({
      el: document.getElementById("greeting"),
    });

    initClock();
    initSearch();
    initOverlayStrength();
    initDashboard();
  } catch (error) {
    console.error("Core UI initialization failed:", error);
  }

  try {
    // IndexedDB-backed features.
    await openDatabase();
  } catch (error) {
    console.error("IndexedDB initialization failed:", error);
    return;
  }

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

start();
