import { initGreeting } from "./JS/greeting.js";
import { initClock } from "./JS/clock.js";
import { initSearch } from "./JS/search.js";
import { initDashboard } from "./JS/dashboard.js";
import { openDatabase } from "./JS/db.js";
import { initWallpaper, initDefaultWallpaper } from "./JS/wallpaper.js";
import { initNotes } from "./JS/notes.js";
import { initI18n } from "./JS/i18n/i18n.js";
import { showAlertDialog } from "./JS/dialog.js";
import { t } from "./JS/i18n/i18n.js";
import { initSettings } from './JS/settings.js';
import { initThemePanel } from './JS/theme.js';


initSettings();

async function start() {
  const initFailures = [];

  const runInit = async (name, init) => {
    try {
      await init();
    } catch (error) {
      console.error(`${name} initialization failed:`, error);
      initFailures.push(name);
    }
  };

  await runInit("i18n", initI18n);
  await runInit("Greeting", () =>
    initGreeting({
      el: document.getElementById("greeting"),
    }),
  );
  await runInit("Clock", initClock);
  await runInit("Search", initSearch);
  await runInit("Dashboard", initDashboard);
  await runInit("Theme panel", () =>
    initThemePanel(document.getElementById("themePanel")),
  );

  let dbReady = false;
  await runInit("IndexedDB", async () => {
    await openDatabase();
    dbReady = true;
  });

  if (dbReady) {
    await runInit("Wallpaper", initWallpaper);
    await runInit("Notes", initNotes);
  } else {
    // The database could not be opened: user wallpapers and notes are
    // unavailable, but the built-in default wallpaper must still be shown
    // instead of leaving the page with an empty background.
    await runInit("Default wallpaper", initDefaultWallpaper);
  }

  if (initFailures.length === 0) return;
  if (initFailures.length === 1 && initFailures[0] === "IndexedDB") {
    showAlertDialog(t("db.errorMessage"), t("db.errorTitle"));
  } else {
    showAlertDialog(t("app.initErrorMessage"), t("app.initErrorTitle"));
  }
}

start();