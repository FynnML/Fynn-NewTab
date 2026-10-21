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
import { reset as resetTheme } from "./settings.js";

const dashboard = document.querySelector("#dashboard");
const dashboardToggle = document.querySelector("#dashboardToggle");
const dashboardTabs = document.querySelectorAll(".dashboard-tab");
const dashboardContents = document.querySelectorAll(".dashboard-content");
const appRoot = document.querySelector(".app");

function setDashboardOpen(isOpen) {
  if (!dashboard || !dashboardToggle || !appRoot) return;
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
  if (!tab) return;
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

  const targetContent = document.querySelector(`#${target}`);
  if (targetContent) {
    targetContent.classList.add("active");
  }

  const tabsContainer = document.querySelector(".dashboard-tabs");
  if (tabsContainer) {
    tabsContainer.style.setProperty("--tab-left", tab.offsetLeft + "px");
    tabsContainer.style.setProperty("--tab-width", tab.offsetWidth + "px");
  }
}

function initPanel() {
  if (!dashboard || !dashboardToggle) return;

  dashboard.setAttribute("inert", "");
  dashboard.setAttribute("aria-hidden", "true");

  dashboardToggle.addEventListener("click", () => {
    setDashboardOpen(!dashboard.classList.contains("open"));
  });

  dashboardTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));

    tab.addEventListener("keydown", (event) => {
      let targetIndex = -1;
      if (event.key === "ArrowRight") {
        targetIndex = (index + 1) % dashboardTabs.length;
      } else if (event.key === "ArrowLeft") {
        targetIndex = (index - 1 + dashboardTabs.length) % dashboardTabs.length;
      }
      if (targetIndex >= 0) {
        event.preventDefault();
        const nextTab = dashboardTabs[targetIndex];
        selectTab(nextTab);
        nextTab.focus();
      }
    });
  });

  const activeTab = document.querySelector(".dashboard-tab.active");
  if (activeTab) {
    requestAnimationFrame(() => selectTab(activeTab));
  }

  window.addEventListener("resize", () => {
    const currentActiveTab = document.querySelector(".dashboard-tab.active");
    if (currentActiveTab) {
      const tabsContainer = document.querySelector(".dashboard-tabs");
      if (tabsContainer) {
        tabsContainer.style.setProperty("--tab-left", currentActiveTab.offsetLeft + "px");
        tabsContainer.style.setProperty("--tab-width", currentActiveTab.offsetWidth + "px");
      }
    }
  });

  onLanguageChange(() => {
    if (!dashboard || !dashboardToggle) return;
    dashboardToggle.setAttribute(
      "aria-label",
      dashboard.classList.contains("open") ? t("dashboard.close") : t("dashboard.open")
    );
  });

  document.addEventListener("click", (event) => {
    if (!dashboard || !dashboardToggle) return;
    if (!dashboard.classList.contains("open")) return;
    if (document.querySelector(".custom-dialog-overlay.active")) return;

    const clickedInsideDashboard = dashboard.contains(event.target);
    const clickedToggle = dashboardToggle.contains(event.target);

    if (!clickedInsideDashboard && !clickedToggle) {
      setDashboardOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.querySelector(".custom-dialog-overlay.active")) return;

    if (closeEngineMenu({ restoreFocus: true })) return;

    if (dashboard && dashboard.classList.contains("open")) {
      setDashboardOpen(false);
      dashboardToggle?.focus();
    }
  });
}

const WIDGET_SETTINGS_KEY = "fynn-widget-settings";

const widgetToggles = document.querySelectorAll(".widget-toggle");

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

  const syncCustomEngineVisibility = () => {
    if (customEngineUrlItem && searchEngineSetting) {
      customEngineUrlItem.classList.toggle(
        "hidden",
        searchEngineSetting.value !== "custom",
      );
    }
  };

  const syncControls = () => {
    if (languageSetting) languageSetting.value = getLanguage();
    if (searchEngineSetting) searchEngineSetting.value = getSearchEngine();
    if (timeFormatSetting) timeFormatSetting.value = getTimeFormat();
    if (searchFocusEffectSetting) searchFocusEffectSetting.checked = isSearchFocusEffectEnabled();
    if (customEngineUrlSetting) customEngineUrlSetting.value = getCustomEngineUrl();

    if (overlayStrengthSetting && overlayStrengthValue) {
      const overlayStrength = getOverlayStrength();
      overlayStrengthSetting.value = overlayStrength;
      overlayStrengthValue.textContent = t("settings.appearance.overlayStrengthValue", { value: overlayStrength });
    }

    syncCustomEngineVisibility();
  };

  syncControls();

  languageSetting?.addEventListener("change", () => {
    setLanguage(languageSetting.value);
  });

  searchEngineSetting?.addEventListener("change", () => {
    setSearchEngine(searchEngineSetting.value);
    syncCustomEngineVisibility();
  });

  timeFormatSetting?.addEventListener("change", () => {
    setTimeFormat(timeFormatSetting.value);
  });

  searchFocusEffectSetting?.addEventListener("change", () => {
    setSearchFocusEffect(searchFocusEffectSetting.checked);
  });

  customEngineUrlSetting?.addEventListener("change", () => {
    setCustomEngineUrl(customEngineUrlSetting.value);
    customEngineUrlSetting.value = getCustomEngineUrl();
  });

  overlayStrengthSetting?.addEventListener("input", () => {
    const value = Number(overlayStrengthSetting.value);

    setOverlayStrength(value);
    if (overlayStrengthValue) {
      overlayStrengthValue.textContent = t("settings.appearance.overlayStrengthValue", { value });
    }
  });

  resetSettingsButton?.addEventListener("click", async () => {
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
    resetTheme();

    syncControls();
  });

  exportDataButton?.addEventListener("click", () => {
    exportData();
  });

  importDataButton?.addEventListener("click", () => {
    importDataInput?.click();
  });

  importDataInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importData(file);
    event.target.value = "";
  });
}

export function initDashboard() {
  initWidgetToggles();
  initSettings();
  initPanel();
}
