/**
 * app.js — Entry point. Starts every system of Fynn New Tab.
 * All feature logic lives in its own module:
 *
 *   greeting.js   time-of-day greeting
 *   clock.js      clock + date
 *   search.js     Brave / Google search
 *   dashboard.js  dashboard panel + widget toggles + settings
 *   wallpaper.js  wallpapers (image / video)      ┐ both use db.js
 *   notes.js      notes                           ┘ (IndexedDB)
 */

import { initGreeting } from "./JS/greeting.js";
import { initClock } from "./JS/clock.js";
import { initSearch } from "./JS/search.js";
import { initDashboard } from "./JS/dashboard.js";
import { openDatabase } from "./JS/db.js";
import { initWallpaper, initOverlayStrength } from "./JS/wallpaper.js";
import { initNotes } from "./JS/notes.js";

async function start() {
  try {
    // LocalStorage-only features first (no waiting on IndexedDB).
    initGreeting({
      el: document.getElementById("greeting"),
    });

    initClock();
    initSearch();
    initOverlayStrength();
    initDashboard();

    // IndexedDB-backed features.
    await openDatabase();
    await initWallpaper();
    await initNotes();
  } catch (error) {
    console.error("Application initialization failed:", error);
  }
}

start();