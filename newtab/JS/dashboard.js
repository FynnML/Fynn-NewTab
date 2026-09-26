/**
 * dashboard.js — Everything inside the slide-out dashboard:
 *   1. Panel      open/close, tabs, click-outside, Escape
 *   2. Widgets    visibility toggles + widget layout (LocalStorage)
 *   3. Settings   language, search engine, time format, focus effect, overlay, reset
 *
 * (The Wallpapers tab content is rendered by wallpaper.js.)
 */

import { getTimeFormat, setTimeFormat, resetTimeFormat } from "./clock.js";
import {
  closeEngineMenu,
  getSearchEngine,
  setSearchEngine,
  isSearchFocusEffectEnabled,
  setSearchFocusEffect,
  getCustomEngineUrl,
  setCustomEngineUrl,
  resetSearchSettings,
} from "./search.js";
import {
  getOverlayStrength,
  setOverlayStrength,
  resetOverlayStrength,
} from "./wallpaper.js";
import { showConfirmDialog } from "./dialog.js";
import { t, onLanguageChange, getLanguage, setLanguage, resetLanguage } from "./i18n/i18n.js";
import { exportData, importData } from "./backup.js";

/* ==========================================================================
   1. PANEL
   ========================================================================== */

const dashboard = document.querySelector("#dashboard");
const dashboardToggle = document.querySelector("#dashboardToggle");
const dashboardTabs = document.querySelectorAll(".dashboard-tab");
const dashboardContents = document.querySelectorAll(".dashboard-content");
const appRoot = document.querySelector(".app");

function setDashboardOpen(isOpen) {
  const wasOpen = dashboard.classList.contains("open");

  dashboard.classList.toggle("open", isOpen);
  appRoot.classList.toggle("dashboard-open", isOpen);

  dashboardToggle.setAttribute("aria-expanded", String(isOpen));
  dashboardToggle.setAttribute(
    "aria-label",
    isOpen ? t("dashboard.close") : t("dashboard.open"),
  );

  if (isOpen) {
    dashboard.removeAttribute("inert");
    dashboard.setAttribute("aria-hidden", "false");
  } else {
    dashboard.setAttribute("inert", "");
    dashboard.setAttribute("aria-hidden", "true");

    if (
      wasOpen &&
      document.activeElement &&
      dashboard.contains(document.activeElement)
    ) {
      dashboardToggle.focus();
    }
  }
}

function selectTab(tab) {
  const target = tab.dataset.tab;

  dashboardTabs.forEach((item) => {
    item.classList.remove("active");
    item.setAttribute("aria-selected", "false");
  });

  tab.classList.add("active");
  tab.setAttribute("aria-selected", "true");

  dashboardContents.forEach((content) => {
    content.classList.remove("active");
  });

  document.querySelector(`#${target}`).classList.add("active");

  const tabsContainer = document.querySelector(".dashboard-tabs");
  if (tabsContainer) {
    tabsContainer.style.setProperty("--tab-left", tab.offsetLeft + "px");
    tabsContainer.style.setProperty("--tab-width", tab.offsetWidth + "px");
  }
}

function initPanel() {
  dashboard.setAttribute("inert", "");
  dashboard.setAttribute("aria-hidden", "true");

  dashboardToggle.addEventListener("click", () => {
    setDashboardOpen(!dashboard.classList.contains("open"));
  });

  dashboardTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab));
  });

  // Init sliding indicator position
  const activeTab = document.querySelector(".dashboard-tab.active");
  if (activeTab) {
    requestAnimationFrame(() => selectTab(activeTab));
  }

  onLanguageChange(() => {
    dashboardToggle.setAttribute(
      "aria-label",
      dashboard.classList.contains("open") ? t("dashboard.close") : t("dashboard.open")
    );
  });

  // Click outside the dashboard closes it
  document.addEventListener("click", (event) => {
    if (!dashboard.classList.contains("open")) return;
    if (document.querySelector(".custom-dialog-overlay.active")) return;

    const clickedInsideDashboard = dashboard.contains(event.target);
    const clickedToggle = dashboardToggle.contains(event.target);

    if (!clickedInsideDashboard && !clickedToggle) {
      setDashboardOpen(false);
    }
  });

  // Escape closes the innermost open layer first: engine dropdown, then dashboard.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.querySelector(".custom-dialog-overlay.active")) return;

    if (closeEngineMenu({ restoreFocus: true })) return;

    if (dashboard.classList.contains("open")) {
      setDashboardOpen(false);
      dashboardToggle.focus();
    }
  });
}

/* ==========================================================================
   2. WIDGETS TAB — visibility + layout
   ========================================================================== */

const WIDGET_SETTINGS_KEY = "fynn-widget-settings";

const widgetToggles = document.querySelectorAll(".widget-toggle");

// --- 2.1 Visibility ---

const defaultWidgetSettings = {
  clock: true,
  date: true,
  greeting: true,
  notes: false,
  search: true,
};

const WIDGET_SELECTORS = {
  clock: ".clock-container",
  date: ".date-widget",
  greeting: ".greeting",
  notes: ".notes-widget",
  search: ".search-container",
};

function setWidgetVisibility(widgetName, visible) {
  const selector = WIDGET_SELECTORS[widgetName];
  if (!selector) return;

  document.querySelector(selector)?.classList.toggle("hidden", !visible);
}

function loadWidgetSettings() {
  const saved = localStorage.getItem(WIDGET_SETTINGS_KEY);

  if (!saved) {
    return { ...defaultWidgetSettings };
  }

  try {
    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return { ...defaultWidgetSettings };
    }

    const settings = { ...defaultWidgetSettings };

    Object.keys(defaultWidgetSettings).forEach((widgetName) => {
      if (typeof parsed[widgetName] === "boolean") {
        settings[widgetName] = parsed[widgetName];
      }
    });

    return settings;
  } catch (error) {
    console.error("Failed to load widget settings:", error);
    return { ...defaultWidgetSettings };
  }
}

function saveWidgetSettings() {
  const settings = {};

  widgetToggles.forEach((toggle) => {
    settings[toggle.dataset.widget] = toggle.checked;
  });

  localStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));
}

function initWidgetToggles() {
  const settings = loadWidgetSettings();

  widgetToggles.forEach((toggle) => {
    const widgetName = toggle.dataset.widget;

    toggle.checked = Object.prototype.hasOwnProperty.call(settings, widgetName)
      ? settings[widgetName]
      : (defaultWidgetSettings[widgetName] ?? true);

    setWidgetVisibility(widgetName, toggle.checked);

    toggle.addEventListener("change", () => {
      setWidgetVisibility(widgetName, toggle.checked);
      saveWidgetSettings();
    });
  });
}

function resetWidgets() {
  localStorage.removeItem(WIDGET_SETTINGS_KEY);

  widgetToggles.forEach((toggle) => {
    const widgetName = toggle.dataset.widget;
    const visible = defaultWidgetSettings[widgetName] ?? true;

    toggle.checked = visible;
    setWidgetVisibility(widgetName, visible);
  });
}

/* ==========================================================================
   3. SETTINGS TAB
   ========================================================================== */

function initSettings() {
  const languageSetting = document.querySelector("#languageSetting");
  const searchEngineSetting = document.querySelector("#searchEngineSetting");
  const timeFormatSetting = document.querySelector("#timeFormatSetting");
  const searchFocusEffectSetting = document.querySelector(
    "#searchFocusEffectSetting",
  );
  const customEngineUrlItem = document.querySelector("#customEngineUrlItem");
  const customEngineUrlSetting = document.querySelector(
    "#customEngineUrlSetting",
  );
  const overlayStrengthSetting = document.querySelector(
    "#overlayStrengthSetting",
  );
  const overlayStrengthValue = document.querySelector("#overlayStrengthValue");
  const resetSettingsButton = document.querySelector("#resetSettingsButton");
  const exportDataButton = document.querySelector("#exportDataButton");
  const importDataButton = document.querySelector("#importDataButton");
  const importDataInput = document.querySelector("#importDataInput");

  // Custom engine URL only matters once "Custom" is picked.
  const syncCustomEngineVisibility = () => {
    customEngineUrlItem.classList.toggle(
      "hidden",
      searchEngineSetting.value !== "custom",
    );
  };

  // Reflect the saved values in the form controls.
  const syncControls = () => {
    languageSetting.value = getLanguage();
    searchEngineSetting.value = getSearchEngine();
    timeFormatSetting.value = getTimeFormat();
    searchFocusEffectSetting.checked = isSearchFocusEffectEnabled();
    customEngineUrlSetting.value = getCustomEngineUrl();

    const overlayStrength = getOverlayStrength();
    overlayStrengthSetting.value = overlayStrength;
    overlayStrengthValue.textContent = t("settings.appearance.overlayStrengthValue", { value: overlayStrength });

    syncCustomEngineVisibility();
  };

  syncControls();

  languageSetting.addEventListener("change", () => {
    setLanguage(languageSetting.value);
  });

  searchEngineSetting.addEventListener("change", () => {
    setSearchEngine(searchEngineSetting.value);
    syncCustomEngineVisibility();
  });

  timeFormatSetting.addEventListener("change", () => {
    setTimeFormat(timeFormatSetting.value);
  });

  searchFocusEffectSetting.addEventListener("change", () => {
    setSearchFocusEffect(searchFocusEffectSetting.checked);
  });

  customEngineUrlSetting.addEventListener("change", () => {
    setCustomEngineUrl(customEngineUrlSetting.value);
    customEngineUrlSetting.value = getCustomEngineUrl();
  });

  overlayStrengthSetting.addEventListener("input", () => {
    const value = Number(overlayStrengthSetting.value);

    setOverlayStrength(value);
    overlayStrengthValue.textContent = t("settings.appearance.overlayStrengthValue", { value });
  });

  resetSettingsButton.addEventListener("click", async () => {
    const confirmed = await showConfirmDialog(
      t("settings.reset.confirmation"),
      t("settings.reset.title"),
      t("common.reset"),
    );

    if (!confirmed) return;

    resetLanguage();
    resetSearchSettings();
    resetTimeFormat();
    resetOverlayStrength();
    resetWidgets();

    syncControls();
  });

  exportDataButton.addEventListener("click", () => {
    exportData();
  });

  importDataButton.addEventListener("click", () => {
    importDataInput.click();
  });

  importDataInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    importData(file);
    // Reset value so the same file can be selected again
    event.target.value = "";
  });
}

/* ==========================================================================
   INIT
   ========================================================================== */

/*
 * Everything here only needs LocalStorage / the DOM, so it runs BEFORE
 * IndexedDB opens. This prevents hidden widgets from flashing on screen
 * while the database is still opening.
 */
export function initDashboard() {
  initWidgetToggles();
  initSettings();
  initPanel();
}
