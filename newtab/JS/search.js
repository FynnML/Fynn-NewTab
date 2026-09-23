/**
 * search.js — Search widget: engine picker (Brave / Google), submit, and
 * the dim/blur wallpaper effect while the search box is hovered/focused.
 * Owns the search-engine and focus-effect settings (LocalStorage).
 */

const SEARCH_ENGINE_KEY = "fynn-search-engine";
const SEARCH_FOCUS_EFFECT_KEY = "fynn-search-focus-effect";
const CUSTOM_ENGINE_URL_KEY = "fynn-custom-engine-url";
const DEFAULT_ENGINE = "brave";
const DEFAULT_FOCUS_EFFECT = true;
const DEFAULT_CUSTOM_ENGINE_URL = "https://www.bing.com/search?q=%s";

const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

/* Inline icon for "Custom" — no local asset needed */
const CUSTOM_ENGINE_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.8 4 6.2 4 9s-1.5 6.2-4 9c-2.5-2.8-4-6.2-4-9s1.5-6.2 4-9z"/></svg>',
)}`;

// --- Custom engine URL ---

export function getCustomEngineUrl() {
  return localStorage.getItem(CUSTOM_ENGINE_URL_KEY) || DEFAULT_CUSTOM_ENGINE_URL;
}

/** Saves the custom engine URL template. Expects a %s placeholder for the query. */
export function setCustomEngineUrl(url) {
  const trimmed = url.trim();
  localStorage.setItem(CUSTOM_ENGINE_URL_KEY, trimmed || DEFAULT_CUSTOM_ENGINE_URL);
}

const buildCustomUrl = (query) => {
  const template = getCustomEngineUrl();
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
    // Add this file yourself (32x32 transparent PNG), same as brave.png / google.png
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

// --- Autocomplete State ---
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

// --- Engine ---

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
  engineIcon.alt = config.label;
  searchInput.placeholder = `Search with ${config.label}`;
}

/** Applies + saves the engine. Used by the dropdown and the Settings tab. */
export function setSearchEngine(engine) {
  if (!isValidEngine(engine)) return;

  applySearchEngine(engine);
  localStorage.setItem(SEARCH_ENGINE_KEY, engine);
}

/**
 * Closes the engine dropdown. Returns true if it was open, so the global
 * Escape handler knows whether the key press was consumed.
 */
export function closeEngineMenu({ restoreFocus = false } = {}) {
  if (!engineMenu.classList.contains("active")) return false;

  engineMenu.classList.remove("active");
  engineButton.setAttribute("aria-expanded", "false");

  if (restoreFocus) engineButton.focus();
  return true;
}

// --- Focus effect setting ---

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

/** Clears all search settings and re-applies the defaults. */
export function resetSearchSettings() {
  localStorage.removeItem(SEARCH_ENGINE_KEY);
  localStorage.removeItem(SEARCH_FOCUS_EFFECT_KEY);
  localStorage.removeItem(CUSTOM_ENGINE_URL_KEY);

  applySearchEngine(DEFAULT_ENGINE);
}

// --- URL detection ---
//
// If the query looks like a URL or a bare domain, navigate straight to it
// instead of searching. Only a curated TLD list is treated as a domain
// ending, so real search phrases with a dot (e.g. "node.js", "e.g. foo")
// aren't misfired into a broken navigation. Extend COMMON_TLDS if you hit
// a domain that isn't recognized.
const COMMON_TLDS = new Set([
  "com", "net", "org", "io", "dev", "app", "co", "ai", "me", "info",
  "biz", "xyz", "tv", "us", "uk", "de", "jp", "cn", "ca", "au",
  "vn", "edu", "gov", "gg", "sh", "to", "so", "ly", "im",
]);

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
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

// --- Submit ---

function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    searchInput.focus();
    return;
  }

  // Lưu từ khoá vào lịch sử tìm kiếm gần đây
  saveRecentSearch(query);

  const directUrl = resolveDirectUrl(query);

  if (directUrl) {
    window.location.href = directUrl;
    return;
  }

  window.location.href = ENGINES[currentEngine].buildUrl(
    encodeURIComponent(query),
  );
}

// --- Init ---

function initFocusEffect() {
  searchContainer.addEventListener("mouseenter", () => {
    if (!isSearchFocusEffectEnabled()) return;

    backgroundDim.classList.add("active");
  });

  searchContainer.addEventListener("mouseleave", () => {
    // Keep the dim effect while the search input is focused.
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

/**
 * Typing anywhere on the page (when nothing else is focused) jumps straight
 * into the search box, like Brave/Chrome's own New Tab.
 */
function initTypeToSearch() {
  const dashboard = document.querySelector("#dashboard");

  document.addEventListener("keydown", (event) => {
    // Modifier combos are browser/OS shortcuts (Ctrl+T, Cmd+L, ...) — leave them alone.
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Only single printable characters; ignores Tab, Escape, arrows, F-keys, etc.
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
    // Don't preventDefault: let this same keystroke land in the input.
  });
}

// --- Recent Searches ---

const RECENT_SEARCHES_KEY = "fynn-recent-searches";
const MAX_RECENT = 8;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  if (!query) return;

  let recent = getRecentSearches();

  // Xoá nếu đã tồn tại (tránh trùng), đẩy lên đầu
  recent = recent.filter((item) => item !== query);
  recent.unshift(query);

  // Giới hạn tối đa MAX_RECENT mục
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

function showRecentSearches() {
  const recent = getRecentSearches();

  if (recent.length === 0) {
    hideRecentSearches();
    return;
  }

  currentSuggestions = recent;
  selectedSuggestionIndex = -1;
  searchSuggestions.innerHTML = "";

  recent.forEach((text, index) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.dataset.index = index;

    // Icon đồng hồ (history) thay vì kính lúp
    const historyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    const label = document.createElement("span");
    label.className = "suggestion-label";
    label.textContent = text;

    const removeBtn = document.createElement("button");
    removeBtn.className = "suggestion-remove";
    removeBtn.innerHTML = "×";
    removeBtn.setAttribute("aria-label", `Remove "${text}"`);
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentSearch(text);
      showRecentSearches();
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

    searchSuggestions.appendChild(item);
  });

  searchSuggestions.classList.add("active");
}

function updateSuggestionHighlight() {
  const items = searchSuggestions.querySelectorAll(".suggestion-item");
  items.forEach((item, index) => {
    item.classList.toggle("selected", index === selectedSuggestionIndex);
  });
}

function initRecentSearches() {
  // Hiển thị khi ô search được focus VÀ đang trống
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim() === "") {
      showRecentSearches();
    }
  });

  // Ẩn khi người dùng bắt đầu gõ chữ
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() !== "") {
      hideRecentSearches();
    } else {
      showRecentSearches();
    }
  });

  // Điều hướng bằng bàn phím
  searchInput.addEventListener("keydown", (event) => {
    if (!searchSuggestions.classList.contains("active")) return;

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
    } else if (event.key === "Enter" && selectedSuggestionIndex >= 0) {
      event.preventDefault();
      searchInput.value = currentSuggestions[selectedSuggestionIndex];
      hideRecentSearches();
      performSearch();
    } else if (event.key === "Escape") {
      hideRecentSearches();
    }
  });

  // Ẩn khi click bên ngoài
  document.addEventListener("click", (e) => {
    if (!searchContainer.contains(e.target)) {
      hideRecentSearches();
    }
  });

  // Ẩn khi blur, nhưng cho phép click vào mục gợi ý trước
  searchInput.addEventListener("blur", (e) => {
    if (e.relatedTarget && searchContainer.contains(e.relatedTarget)) return;
    setTimeout(hideRecentSearches, 150);
  });
}

export function initSearch() {
  // Clean inline SVG icon instead of an emoji
  searchButton.innerHTML = SEARCH_ICON;
  searchButton.setAttribute("aria-label", "Search");

  applySearchEngine(currentEngine);

  engineButton.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen = engineMenu.classList.toggle("active");
    engineButton.setAttribute("aria-expanded", String(isOpen));
  });

  engineOptions.forEach((option) => {
    option.addEventListener("click", () => {
      setSearchEngine(option.dataset.engine);
      closeEngineMenu();
      searchInput.focus();
    });
  });

  searchButton.addEventListener("click", performSearch);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") performSearch();
  });

  // Click anywhere else closes the dropdown.
  document.addEventListener("click", () => {
    closeEngineMenu();
  });

  initFocusEffect();
  initTypeToSearch();
  initRecentSearches();
}
