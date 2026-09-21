/**
 * dashboard.js — Everything inside the slide-out dashboard:
 *   1. Panel      open/close, tabs, click-outside, Escape
 *   2. Widgets    visibility toggles + widget layout (LocalStorage)
 *   3. Settings   search engine, time format, focus effect, reset
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
  resetSearchSettings,
} from "./search.js";

/* ==========================================================================
   1. PANEL
   ========================================================================== */

const dashboard = document.querySelector("#dashboard");
const dashboardToggle = document.querySelector("#dashboardToggle");
const dashboardTabs = document.querySelectorAll(".dashboard-tab");
const dashboardContents = document.querySelectorAll(".dashboard-content");
const appRoot = document.querySelector(".app");

function setDashboardOpen(isOpen) {
  dashboard.classList.toggle("open", isOpen);
  appRoot.classList.toggle("dashboard-open", isOpen);

  dashboardToggle.setAttribute("aria-expanded", String(isOpen));
  dashboardToggle.setAttribute(
    "aria-label",
    isOpen ? "Close dashboard" : "Open dashboard",
  );
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
}

function initPanel() {
  dashboardToggle.addEventListener("click", () => {
    setDashboardOpen(!dashboard.classList.contains("open"));
  });

  dashboardTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab));
  });

  // Click outside the dashboard closes it
  document.addEventListener("click", (event) => {
    if (!dashboard.classList.contains("open")) return;

    const clickedInsideDashboard = dashboard.contains(event.target);
    const clickedToggle = dashboardToggle.contains(event.target);

    if (!clickedInsideDashboard && !clickedToggle) {
      setDashboardOpen(false);
    }
  });

  // Escape closes the innermost open layer first: engine dropdown, then dashboard.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

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
const WIDGET_LAYOUT_KEY = "fynn-widget-layout";

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

// --- 2.2 Layout ---

/*
 * Only Greeting and Notes are movable.
 * Clock + Date live inside the hero flex column (see style.css),
 * so they intentionally ignore the position system.
 */
const VALID_WIDGET_POSITIONS = [
  "top-center",
  "top-left",
  "top-right",
  "bottom-center",
  "bottom-left",
  "bottom-right",
  "middle-left",
];

const defaultWidgetPositions = {
  greeting: "bottom-left",
  notes: "bottom-right",
};

function loadWidgetLayout() {
  const saved = localStorage.getItem(WIDGET_LAYOUT_KEY);

  if (!saved) {
    return { ...defaultWidgetPositions };
  }

  try {
    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return { ...defaultWidgetPositions };
    }

    const layout = { ...defaultWidgetPositions };

    Object.keys(defaultWidgetPositions).forEach((widgetName) => {
      const position = parsed[widgetName];

      if (VALID_WIDGET_POSITIONS.includes(position)) {
        layout[widgetName] = position;
      }
    });

    return layout;
  } catch (error) {
    console.error("Failed to load widget layout:", error);
    return { ...defaultWidgetPositions };
  }
}

function saveWidgetLayout(layout) {
  localStorage.setItem(WIDGET_LAYOUT_KEY, JSON.stringify(layout));
}

function applyWidgetLayout() {
  const layout = loadWidgetLayout();

  Object.entries(layout).forEach(([widgetName, position]) => {
    /*
     * ".widget" is required: the dashboard checkboxes also use
     * data-widget, and they must not receive data-position.
     */
    document
      .querySelectorAll(`.widget[data-widget="${widgetName}"]`)
      .forEach((widget) => {
        widget.dataset.position = position;
      });
  });
}

export function setWidgetPosition(widgetName, position) {
  if (!Object.prototype.hasOwnProperty.call(defaultWidgetPositions, widgetName)) {
    console.warn(`Invalid widget: ${widgetName}`);
    return;
  }

  if (!VALID_WIDGET_POSITIONS.includes(position)) {
    console.warn(`Invalid widget position: ${position}`);
    return;
  }

  const layout = loadWidgetLayout();
  layout[widgetName] = position;

  saveWidgetLayout(layout);
  applyWidgetLayout();
}

function resetWidgets() {
  localStorage.removeItem(WIDGET_SETTINGS_KEY);
  localStorage.removeItem(WIDGET_LAYOUT_KEY);

  widgetToggles.forEach((toggle) => {
    const widgetName = toggle.dataset.widget;
    const visible = defaultWidgetSettings[widgetName] ?? true;

    toggle.checked = visible;
    setWidgetVisibility(widgetName, visible);
  });

  applyWidgetLayout();
}

/* ==========================================================================
   3. SETTINGS TAB
   ========================================================================== */

function initSettings() {
  const searchEngineSetting = document.querySelector("#searchEngineSetting");
  const timeFormatSetting = document.querySelector("#timeFormatSetting");
  const searchFocusEffectSetting = document.querySelector(
    "#searchFocusEffectSetting",
  );
  const resetSettingsButton = document.querySelector("#resetSettingsButton");

  // Reflect the saved values in the form controls.
  const syncControls = () => {
    searchEngineSetting.value = getSearchEngine();
    timeFormatSetting.value = getTimeFormat();
    searchFocusEffectSetting.checked = isSearchFocusEffectEnabled();
  };

  syncControls();

  searchEngineSetting.addEventListener("change", () => {
    setSearchEngine(searchEngineSetting.value);
  });

  timeFormatSetting.addEventListener("change", () => {
    setTimeFormat(timeFormatSetting.value);
  });

  searchFocusEffectSetting.addEventListener("change", () => {
    setSearchFocusEffect(searchFocusEffectSetting.checked);
  });

  resetSettingsButton.addEventListener("click", () => {
    const confirmed = confirm("Reset Fynn NewTab settings?");

    if (!confirmed) return;

    resetSearchSettings();
    resetTimeFormat();
    resetWidgets();

    syncControls();
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
  applyWidgetLayout();
  initSettings();
  initPanel();
}