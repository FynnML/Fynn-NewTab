import { t, onLanguageChange } from "./i18n/i18n.js";

const SEARCH_ENGINE_KEY = "fynn-search-engine";
const SEARCH_FOCUS_EFFECT_KEY = "fynn-search-focus-effect";
const CUSTOM_ENGINE_URL_KEY = "fynn-custom-engine-url";
const DEFAULT_ENGINE = "brave";
const DEFAULT_FOCUS_EFFECT = true;
const DEFAULT_CUSTOM_ENGINE_URL = "https://www.bing.com/search?q=%s";

const PROTOCOL_PATTERN = /^https?:\/\//i;

const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

const CUSTOM_ENGINE_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.8 4 6.2 4 9s-1.5 6.2-4 9c-2.5-2.8-4-6.2-4-9s1.5-6.2 4-9z"/></svg>',
)}`;

export function getCustomEngineUrl() {
  return localStorage.getItem(CUSTOM_ENGINE_URL_KEY) || DEFAULT_CUSTOM_ENGINE_URL;
}

export function setCustomEngineUrl(url) {
  const trimmed = (url || "").trim();
  const finalUrl = PROTOCOL_PATTERN.test(trimmed) ? trimmed : DEFAULT_CUSTOM_ENGINE_URL;
  localStorage.setItem(CUSTOM_ENGINE_URL_KEY, finalUrl);
}

const buildCustomUrl = (query) => {
  let template = getCustomEngineUrl();
  if (!PROTOCOL_PATTERN.test(template)) {
    template = DEFAULT_CUSTOM_ENGINE_URL;
  }
  return template.includes("%s") ? template.replace("%s", query) : `${template}${query}`;
};

const ENGINES = {
  brave: {
    label: "Brave",
    icon: "../assets/icons/brave.png",
    buildUrl: (query) => `https://search.brave.com/search?q=${query}`,
  },
  google: {
    label: "Google",
    icon: "../assets/icons/google.png",
    buildUrl: (query) => `https://www.google.com/search?q=${query}`,
  },
  duckduckgo: {
    label: "DuckDuckGo",
    icon: "../assets/icons/duckduckgo.png",
    buildUrl: (query) => `https://duckduckgo.com/?q=${query}`,
  },
  custom: {
    label: "Custom",
    icon: CUSTOM_ENGINE_ICON,
    buildUrl: buildCustomUrl,
  },
};

const engineButton = document.querySelector("#engineButton");
const engineIcon = document.querySelector("#engineIcon");
const engineMenu = document.querySelector("#engineMenu");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const engineOptions = document.querySelectorAll(".engine-option");
const searchContainer = document.querySelector("#searchContainer");
const backgroundDim = document.querySelector("#backgroundDim");
const searchSuggestions = document.querySelector("#searchSuggestions");

let currentSuggestions = [];
let selectedSuggestionIndex = -1;

const isValidEngine = (engine) => Object.hasOwn(ENGINES, engine);

export function getSearchEngine() {
  const saved = localStorage.getItem(SEARCH_ENGINE_KEY);
  return isValidEngine(saved) ? saved : DEFAULT_ENGINE;
}

let currentEngine = getSearchEngine();

function applySearchEngine(engine) {
  if (!isValidEngine(engine)) return;

  const config = ENGINES[engine];

  currentEngine = engine;
  engineIcon.src = config.icon;
  engineIcon.alt = t(`search.engines.${engine}`);
  searchInput.placeholder = t("search.searchWith", { engine: t(`search.engines.${engine}`) });

  engineOptions.forEach((option) => {
    const isSelected = option.dataset.engine === engine;
    option.classList.toggle("selected", isSelected);
    option.setAttribute("aria-checked", String(isSelected));
  });
}

export function setSearchEngine(engine) {
  if (!isValidEngine(engine)) return;

  applySearchEngine(engine);
  localStorage.setItem(SEARCH_ENGINE_KEY, engine);
}

export function closeEngineMenu({ restoreFocus = false } = {}) {
  if (!engineMenu.classList.contains("active")) return false;

  engineMenu.classList.remove("active");
  engineButton.setAttribute("aria-expanded", "false");

  if (restoreFocus) engineButton.focus();
  return true;
}

export function isSearchFocusEffectEnabled() {
  const saved = localStorage.getItem(SEARCH_FOCUS_EFFECT_KEY);

  if (saved === "true" || saved === "false") {
    return saved === "true";
  }

  return DEFAULT_FOCUS_EFFECT;
}

export function setSearchFocusEffect(enabled) {
  localStorage.setItem(SEARCH_FOCUS_EFFECT_KEY, String(enabled));
}

export function resetSearchSettings() {
  localStorage.removeItem(SEARCH_ENGINE_KEY);
  localStorage.removeItem(SEARCH_FOCUS_EFFECT_KEY);
  localStorage.removeItem(CUSTOM_ENGINE_URL_KEY);

  applySearchEngine(DEFAULT_ENGINE);
}

// --- URL detection ---
const COMMON_TLDS = new Set([
  "com", "net", "org", "io", "dev", "app", "co", "ai", "me", "info",
  "biz", "xyz", "tv", "us", "uk", "de", "jp", "cn", "ca", "au",
  "vn", "edu", "gov", "gg", "sh", "to", "so", "ly", "im",
]);

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/\S*)?$/;
const LOCALHOST_PATTERN = /^localhost(:\d+)?(\/\S*)?$/i;
const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+([a-z]{2,})(:\d+)?(\/\S*)?$/i;

function resolveDirectUrl(input) {
  if (/\s/.test(input)) return null;

  if (PROTOCOL_PATTERN.test(input)) return input;
  if (input.startsWith("www.")) return `https://${input}`;
  if (LOCALHOST_PATTERN.test(input)) return `http://${input}`;
  if (IPV4_PATTERN.test(input)) return `http://${input}`;

  const match = input.match(DOMAIN_PATTERN);
  if (match && COMMON_TLDS.has(match[3].toLowerCase())) {
    return `https://${input}`;
  }

  return null;
}

function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    searchInput.focus();
    return;
  }

  const directUrl = resolveDirectUrl(query);

  if (directUrl) {
    window.location.href = directUrl;
    return;
  }

  saveRecentSearch(query);

  window.location.href = ENGINES[currentEngine].buildUrl(
    encodeURIComponent(query),
  );
}

function initFocusEffect() {
  searchContainer.addEventListener("mouseenter", () => {
    if (!isSearchFocusEffectEnabled()) return;

    backgroundDim.classList.add("active");
  });

  searchContainer.addEventListener("mouseleave", () => {
    if (document.activeElement !== searchInput) {
      backgroundDim.classList.remove("active");
    }
  });

  searchInput.addEventListener("focus", () => {
    if (!isSearchFocusEffectEnabled()) return;

    backgroundDim.classList.add("active");
  });

  searchInput.addEventListener("blur", () => {
    backgroundDim.classList.remove("active");
  });
}

function initTypeToSearch() {
  const dashboard = document.querySelector("#dashboard");

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key.length !== 1) return;

    const active = document.activeElement;
    const isEditable =
      active?.tagName === "INPUT" ||
      active?.tagName === "TEXTAREA" ||
      active?.tagName === "SELECT" ||
      active?.isContentEditable;

    if (isEditable) return;
    if (dashboard?.classList.contains("open")) return;
    if (document.querySelector(".custom-dialog-overlay.active")) return;

    searchInput.focus();
  });
}

const RECENT_SEARCHES_KEY = "fynn-recent-searches";
const MAX_RECENT = 8;

function getRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY));
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  if (!query) return;

  let recent = getRecentSearches();

  recent = recent.filter((item) => item !== query);
  recent.unshift(query);

  if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);

  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function removeRecentSearch(query) {
  let recent = getRecentSearches();
  recent = recent.filter((item) => item !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function hideRecentSearches() {
  searchSuggestions.classList.remove("active");
  selectedSuggestionIndex = -1;
  currentSuggestions = [];
}

function showRecentSearches(filterQuery = "") {
  let recent = getRecentSearches();

  if (filterQuery && filterQuery.trim() !== "") {
    const q = filterQuery.trim().toLowerCase();
    recent = recent.filter((text) => text.toLowerCase().includes(q));
  }

  if (recent.length === 0) {
    hideRecentSearches();
    return;
  }

  currentSuggestions = recent;
  selectedSuggestionIndex = -1;
  searchSuggestions.innerHTML = "";

  const header = document.createElement("div");
  header.className = "suggestions-header";
  header.innerHTML = `<span>${t("search.recentTitle")}</span>`;
  searchSuggestions.appendChild(header);

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "suggestions-list";

  recent.forEach((text, index) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.dataset.index = index;

    const historyIcon = `<span class="suggestion-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>`;

    const label = document.createElement("span");
    label.className = "suggestion-label";
    label.textContent = text;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "suggestion-remove";
    removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    removeBtn.setAttribute("aria-label", t("search.removeRecentSearch", { query: text }));
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentSearch(text);
      showRecentSearches(searchInput.value);
      searchInput.focus();
    });

    item.innerHTML = historyIcon;
    item.appendChild(label);
    item.appendChild(removeBtn);

    item.addEventListener("click", () => {
      searchInput.value = text;
      hideRecentSearches();
      performSearch();
    });

    itemsContainer.appendChild(item);
  });

  searchSuggestions.appendChild(itemsContainer);

  const footer = document.createElement("div");
  footer.className = "suggestions-footer";
  footer.innerHTML = `
    <span class="shortcut-hint"><kbd>↑↓</kbd>${t("search.hints.navigate")}</span>
    <span class="shortcut-hint"><kbd>↵</kbd>${t("search.hints.select")}</span>
    <span class="shortcut-hint"><kbd>esc</kbd>${t("search.hints.close")}</span>
  `;
  searchSuggestions.appendChild(footer);

  searchSuggestions.classList.add("active");
}

function updateSuggestionHighlight() {
  const items = searchSuggestions.querySelectorAll(".suggestion-item");
  items.forEach((item, index) => {
    item.classList.toggle("selected", index === selectedSuggestionIndex);
  });
}

function initRecentSearches() {
  searchInput.addEventListener("focus", () => {
    showRecentSearches(searchInput.value);
  });

  searchInput.addEventListener("input", () => {
    showRecentSearches(searchInput.value);
  });

  // Keyboard handling for the search input (Enter, ArrowUp/Down, Escape) is
  // done by the single keydown listener attached in initSearch() below.

  document.addEventListener("click", (e) => {
    if (!searchContainer.contains(e.target)) {
      hideRecentSearches();
    }
  });

  searchInput.addEventListener("blur", (e) => {
    if (e.relatedTarget && searchContainer.contains(e.relatedTarget)) return;
    setTimeout(hideRecentSearches, 150);
  });
}

export function initSearch() {
  searchButton.innerHTML = SEARCH_ICON;
  searchButton.setAttribute("aria-label", t("search.search"));

  const customOptionIcon = document.querySelector(".engine-custom-icon");
  if (customOptionIcon) {
    customOptionIcon.src = CUSTOM_ENGINE_ICON;
  }

  applySearchEngine(currentEngine);

  onLanguageChange(() => {
    searchButton.setAttribute("aria-label", t("search.search"));
    applySearchEngine(currentEngine);
    if (searchSuggestions.classList.contains("active")) showRecentSearches(searchInput.value);
  });

  engineButton.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen = engineMenu.classList.toggle("active");
    engineButton.setAttribute("aria-expanded", String(isOpen));
  });

  engineButton.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      if (!engineMenu.classList.contains("active")) {
        event.preventDefault();
        engineMenu.classList.add("active");
        engineButton.setAttribute("aria-expanded", "true");
        const selected = engineMenu.querySelector(".engine-option.selected") || engineOptions[0];
        selected?.focus();
      }
    }
  });

  engineOptions.forEach((option, index) => {
    option.addEventListener("click", () => {
      setSearchEngine(option.dataset.engine);
      closeEngineMenu();
      searchInput.focus();
    });

    option.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = engineOptions[(index + 1) % engineOptions.length];
        next?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = engineOptions[(index - 1 + engineOptions.length) % engineOptions.length];
        prev?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeEngineMenu({ restoreFocus: true });
      }
    });
  });

  searchButton.addEventListener("click", performSearch);

  // The one and only Enter/keyboard handler for the search input. It must be
  // a single listener: previously a second Enter listener ran BEFORE this one
  // (this function runs after initRecentSearches attached the other one), so
  // pressing Enter with a highlighted suggestion fired performSearch() twice
  // and "event.defaultPrevented" could not help.
  searchInput.addEventListener("keydown", (event) => {
    if (event.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();

      if (selectedSuggestionIndex >= 0) {
        searchInput.value = currentSuggestions[selectedSuggestionIndex];
        hideRecentSearches();
      }

      performSearch();
      return;
    }

    if (!searchSuggestions.classList.contains("active")) {
      if (event.key === "Escape" && searchInput.value) {
        searchInput.value = "";
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedSuggestionIndex = Math.min(
        selectedSuggestionIndex + 1,
        currentSuggestions.length - 1,
      );
      updateSuggestionHighlight();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSuggestionHighlight();
    } else if (event.key === "Escape") {
      event.preventDefault();
      hideRecentSearches();
    }
  });

  document.addEventListener("click", () => {
    closeEngineMenu();
  });

  initFocusEffect();
  initTypeToSearch();
  initRecentSearches();
}
