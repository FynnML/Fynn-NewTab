/**
 * search.js — Search widget: engine picker (Brave / Google), submit, and
 * the dim/blur wallpaper effect while the search box is hovered/focused.
 * Owns the search-engine and focus-effect settings (LocalStorage).
 */

const SEARCH_ENGINE_KEY = "fynn-search-engine";
const SEARCH_FOCUS_EFFECT_KEY = "fynn-search-focus-effect";
const DEFAULT_ENGINE = "brave";
const DEFAULT_FOCUS_EFFECT = true;

const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

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
};

const engineButton = document.querySelector("#engineButton");
const engineIcon = document.querySelector("#engineIcon");
const engineMenu = document.querySelector("#engineMenu");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const engineOptions = document.querySelectorAll(".engine-option");
const searchContainer = document.querySelector("#searchContainer");
const backgroundDim = document.querySelector("#backgroundDim");

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

/** Clears both search settings and re-applies the defaults. */
export function resetSearchSettings() {
  localStorage.removeItem(SEARCH_ENGINE_KEY);
  localStorage.removeItem(SEARCH_FOCUS_EFFECT_KEY);

  applySearchEngine(DEFAULT_ENGINE);
}

// --- Submit ---

function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    searchInput.focus();
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
}