/* ==========================================================================
   1. APP INITIALIZATION & DATABASE (IndexedDB)
   ========================================================================== */
const DB_NAME = "FynnNewTabDB";
const DB_VERSION = 2;
let db;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains("wallpapers")) {
        database.createObjectStore("wallpapers", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("notes")) {
        database.createObjectStore("notes", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function initApp() {
  try {
    await openDatabase();

    initializeWidgets();
    applyWidgetLayout();
    initializeSettings();

    await initializeWallpaperSystem();
    await initializeNotes();
  } catch (error) {
    console.error("Application initialization failed:", error);
  }
}

/* ==========================================================================
   2. WIDGETS SYSTEM
   ========================================================================== */

// --- 2.1 Settings & Visibility ---
const WIDGET_SETTINGS_KEY = "fynn-widget-settings";
const widgetToggles = document.querySelectorAll(".widget-toggle");

const defaultWidgetSettings = {
  clock: true,
  date: true,
  greeting: true,
  notes: false,
  search: true,
};

function getWidgetElements(widgetName) {
  const widgetTargets = {
    clock: document.querySelector(".clock-container"),
    date: document.querySelector(".date-widget"),
    greeting: document.querySelector(".greeting"),
    notes: document.querySelector(".notes-widget"),
    search: document.querySelector(".search-container"),
  };

  const element = widgetTargets[widgetName];

  return element ? [element] : [];
}

function setWidgetVisibility(widgetName, visible) {
  const widgets = getWidgetElements(widgetName);

  widgets.forEach((widget) => {
    widget.classList.toggle("hidden", !visible);
  });
}

function loadWidgetSettings() {
  const saved = localStorage.getItem(WIDGET_SETTINGS_KEY);

  if (!saved) {
    return { ...defaultWidgetSettings };
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      ...defaultWidgetSettings,
      ...parsed,
    };
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

function initializeWidgets() {
  const settings = loadWidgetSettings();

  widgetToggles.forEach((toggle) => {
    const widgetName = toggle.dataset.widget;

    toggle.checked =
      Object.prototype.hasOwnProperty.call(settings, widgetName)
        ? settings[widgetName]
        : true;

    setWidgetVisibility(widgetName, toggle.checked);

    toggle.addEventListener("change", () => {
      setWidgetVisibility(widgetName, toggle.checked);

      const currentSettings = loadWidgetSettings();
      currentSettings[widgetName] = toggle.checked;

      localStorage.setItem(
        WIDGET_SETTINGS_KEY,
        JSON.stringify(currentSettings),
      );
    });
  });
}

// --- 2.2 Clock Widget ---
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  document.querySelector("#clock").innerHTML = time
    .replace("AM", "<span>AM</span>")
    .replace("PM", "<span>PM</span>");

  document.querySelector("#date").textContent = date;
}

/* ==========================================================================
   2.3 SETTINGS SYSTEM
   (moved above the Search Widget section — it was previously declared
   further down the file, but the Search Widget code below needs these
   constants immediately, which caused:
   "Uncaught ReferenceError: Cannot access 'SEARCH_ENGINE_KEY' before initialization")
   ========================================================================== */

const SEARCH_ENGINE_KEY = "fynn-search-engine";
const TIME_FORMAT_KEY = "fynn-time-format";
const SEARCH_FOCUS_EFFECT_KEY = "fynn-search-focus-effect";

const defaultSettings = {
  searchEngine: "brave",
  timeFormat: "12h",
  searchFocusEffect: true,
};

function loadSetting(key, fallback) {
  const value = localStorage.getItem(key);
  return value ?? fallback;
}

function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

let timeFormat = loadSetting(
  TIME_FORMAT_KEY,
  defaultSettings.timeFormat,
);

// --- 2.4 Search Widget ---
const engineButton = document.querySelector("#engineButton");
const engineIcon = document.querySelector("#engineIcon");
const engineMenu = document.querySelector("#engineMenu");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const engineOptions = document.querySelectorAll(".engine-option");

let currentEngine = loadSetting(
  SEARCH_ENGINE_KEY,
  defaultSettings.searchEngine,
);

function applySearchEngine(engine) {
  currentEngine = engine;

  if (engine === "brave") {
    engineIcon.src = "../assets/icons/brave.png";
    engineIcon.alt = "Brave";
    searchInput.placeholder = "Search with Brave";
  }

  if (engine === "google") {
    engineIcon.src = "../assets/icons/google.png";
    engineIcon.alt = "Google";
    searchInput.placeholder = "Search with Google";
  }
}

engineButton.addEventListener("click", (event) => {
  event.stopPropagation();
  engineMenu.classList.toggle("active");
});

engineOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const engine = option.dataset.engine;

    applySearchEngine(engine);
    saveSetting(SEARCH_ENGINE_KEY, engine);

    engineMenu.classList.remove("active");
    searchInput.focus();
  });
});

function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }

  const encodedQuery = encodeURIComponent(query);
  let url =
    currentEngine === "brave"
      ? `https://search.brave.com/search?q=${encodedQuery}`
      : `https://www.google.com/search?q=${encodedQuery}`;

  window.location.href = url;
}

searchButton.addEventListener("click", performSearch);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") performSearch();
});
document.addEventListener("click", () => {
  engineMenu.classList.remove("active");
});

/* =========================
   Widget Layout
   ========================= */

const defaultWidgetPositions = {
    clock: "top-center",
    date: "top-center",
    greeting: "bottom-left",
    notes: "bottom-right"
};


const WIDGET_LAYOUT_KEY = "fynn-widget-layout";


function loadWidgetLayout() {
    const saved = localStorage.getItem(WIDGET_LAYOUT_KEY);

    if (!saved) {
        return defaultWidgetPositions;
    }


    try {
        return {
            ...defaultWidgetPositions,
            ...JSON.parse(saved)
        };

    } catch (error) {
        console.error("Failed to load widget layout:", error);
        return defaultWidgetPositions;
    }
}

function applyWidgetLayout() {
    const layout = loadWidgetLayout();

    Object.entries(layout).forEach(
        ([widgetName, position]) => {

            const widgets =
                document.querySelectorAll(
                    `[data-widget="${widgetName}"]`
                );


            widgets.forEach((widget) => {
                widget.dataset.position = position;
            });
        }
    );
}

function saveWidgetLayout(layout) {
    localStorage.setItem(WIDGET_LAYOUT_KEY, JSON.stringify(layout));
}


/* ==========================================================================
   3. DASHBOARD SYSTEM
   ========================================================================== */
const dashboard = document.querySelector("#dashboard");
const dashboardToggle = document.querySelector("#dashboardToggle");
const dashboardTabs = document.querySelectorAll(".dashboard-tab");
const dashboardContents = document.querySelectorAll(".dashboard-content");

dashboardToggle.addEventListener("click", () => {
  const isOpen = !dashboard.classList.contains("open");
  setDashboardOpen(isOpen);
});

dashboardTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    dashboardTabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    dashboardContents.forEach((content) => content.classList.remove("active"));
    document.querySelector(`#${target}`).classList.add("active");
  });
});

/* =========================
   Click Outside Dashboard
   ========================= */

document.addEventListener("click", (event) => {
  const isOpen = dashboard.classList.contains("open");
  if (!isOpen) return;

  const clickedInsideDashboard = dashboard.contains(event.target);
  const clickedToggle = dashboardToggle.contains(event.target);

  if (!clickedInsideDashboard && !clickedToggle) {
    setDashboardOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!dashboard.classList.contains("open")) return;

  setDashboardOpen(false);
});

function setDashboardOpen(isOpen) {
  dashboard.classList.toggle("open", isOpen);
  document.querySelector(".app").classList.toggle(
    "dashboard-open",
    isOpen,
  );
}

/* ==========================================================================
   4. WALLPAPER SYSTEM
   ========================================================================== */
const WALLPAPER_STORE = "wallpapers";

const WALLPAPER_MODES = {
  DEFAULT: "default",
  PRIMARY: "primary",
  DAY: "day",
  NIGHT: "night",
};

// --- Helpers ---
function getWallpaperMode(wallpaper) {
  if (wallpaper.mode) {
    return wallpaper.mode;
  }

  return wallpaper.primary
    ? WALLPAPER_MODES.PRIMARY
    : WALLPAPER_MODES.DEFAULT;
}

function getScheduledWallpaperMode(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 6 && hour < 18) {
    return WALLPAPER_MODES.DAY;
  }

  return WALLPAPER_MODES.NIGHT;
}

function getActiveWallpaper(wallpapers) {
  const primary = wallpapers.find(
    (wallpaper) =>
      getWallpaperMode(wallpaper) === WALLPAPER_MODES.PRIMARY,
  );

  if (primary) {
    return primary;
  }

  const scheduledMode = getScheduledWallpaperMode();

  const scheduledWallpaper = wallpapers.find(
    (wallpaper) =>
      getWallpaperMode(wallpaper) === scheduledMode,
  );

  if (scheduledWallpaper) {
    return scheduledWallpaper;
  }

  const defaultWallpaper = wallpapers.find(
    (wallpaper) =>
      getWallpaperMode(wallpaper) === WALLPAPER_MODES.DEFAULT,
  );

  return defaultWallpaper || null;
}

const wallpaperInput = document.querySelector("#wallpaperInput");
const wallpaperList = document.querySelector("#wallpaperList");
const backgroundVideo = document.querySelector("#backgroundVideo");
const backgroundImage = document.querySelector("#backgroundImage");
const staticBackground = document.querySelector(".background");

let currentWallpaperUrl = null;
let activeWallpaperId = null;
let wallpaperScheduleTimer = null;
const wallpaperPreviewUrls = new Set();

function revokeWallpaperPreviewUrls() {
  for (const url of wallpaperPreviewUrls) {
    URL.revokeObjectURL(url);
  }

  wallpaperPreviewUrls.clear();
}

// --- DB Operations ---
function saveWallpaper(wallpaper) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WALLPAPER_STORE, "readwrite");
    const store = transaction.objectStore(WALLPAPER_STORE);
    const request = store.put(wallpaper);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getWallpapers() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WALLPAPER_STORE, "readonly");
    const store = transaction.objectStore(WALLPAPER_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteWallpaper(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WALLPAPER_STORE, "readwrite");
    const store = transaction.objectStore(WALLPAPER_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Upload & Processing ---
function extractVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2 || 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        },
        "image/jpeg",
        0.7,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(file);
  });
}

wallpaperInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
    alert("Please select a valid image or video.");
    return;
  }

  let thumbnailBlob = null;
  if (file.type.startsWith("video/")) {
    thumbnailBlob = await extractVideoThumbnail(file);
  }

  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }

  const wallpaper = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    thumbnailBlob: thumbnailBlob,

    mode: WALLPAPER_MODES.DEFAULT,

    createdAt: Date.now(),
  };

  await saveWallpaper(wallpaper);
  await renderWallpapers();
  wallpaperInput.value = "";
});

// --- UI Rendering ---
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function renderWallpapers() {
  const wallpapers = await getWallpapers();

  revokeWallpaperPreviewUrls();
  wallpaperList.innerHTML = "";

  if (wallpapers.length === 0) {
    wallpaperList.innerHTML = `
      <div class="empty-state">
        <p>No wallpapers yet.</p>
        <span>Upload an MP4 or image to get started.</span>
      </div>
    `;
    return;
  }

  wallpapers.forEach((wallpaper) => {
    const currentMode = getWallpaperMode(wallpaper);
    const isPrimary = currentMode === WALLPAPER_MODES.PRIMARY;

    const url = URL.createObjectURL(wallpaper.blob);
    wallpaperPreviewUrls.add(url);
    const card = document.createElement("div");
    card.className = `wallpaper-card ${
      isPrimary ? "primary" : ""
    }`;

    let previewUrl = url;
    if (wallpaper.thumbnailBlob) {
      previewUrl = URL.createObjectURL(wallpaper.thumbnailBlob);
      wallpaperPreviewUrls.add(previewUrl);
    }

    const preview =
      wallpaper.type.startsWith("video/") && !wallpaper.thumbnailBlob
        ? `<video src="${url}" muted loop autoplay playsinline></video>`
        : `<img src="${previewUrl}" alt="${wallpaper.name}">`;

    card.innerHTML = `
      <div class="wallpaper-preview">${preview}</div>

      <div class="wallpaper-info">
        <span class="wallpaper-name">${wallpaper.name}</span>
        <span class="wallpaper-size">${formatFileSize(wallpaper.size)}</span>
      </div>

      <div class="wallpaper-mode-row">
        <span class="wallpaper-mode-label">
          ${currentMode.toUpperCase()}
        </span>

        <select class="wallpaper-mode-select" data-mode="${wallpaper.id}" aria-label="Wallpaper mode" >
          <option value="${WALLPAPER_MODES.DEFAULT}"
            ${currentMode === WALLPAPER_MODES.DEFAULT ? "selected" : ""}>
            Default
          </option>

          <option value="${WALLPAPER_MODES.PRIMARY}"
            ${currentMode === WALLPAPER_MODES.PRIMARY ? "selected" : ""}>
            Primary
          </option>

          <option value="${WALLPAPER_MODES.DAY}"
            ${currentMode === WALLPAPER_MODES.DAY ? "selected" : ""}>
            Day
          </option>

          <option value="${WALLPAPER_MODES.NIGHT}"
            ${currentMode === WALLPAPER_MODES.NIGHT ? "selected" : ""}>
            Night
          </option>
        </select>
      </div>

      <div class="wallpaper-actions">
        <button class="wallpaper-action delete-button" data-delete="${wallpaper.id}">
          Delete
        </button>
      </div>
    `;
    wallpaperList.appendChild(card);
  });
  attachWallpaperActions();
}

function attachWallpaperActions() {
  document.querySelectorAll("[data-mode]").forEach((select) => {
    select.addEventListener("change", () => {
      setWallpaperMode(
        select.dataset.mode,
        select.value,
      );
    });
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () =>
      removeWallpaper(button.dataset.delete),
    );
  });
}

// --- State Management ---
async function applyActiveWallpaper() {
  const wallpapers = await getWallpapers();
  const activeWallpaper = getActiveWallpaper(wallpapers);
  const nextWallpaperId = activeWallpaper?.id || null;

  if (nextWallpaperId === activeWallpaperId) {
    return;
  }

  activeWallpaperId = nextWallpaperId;

  if (currentWallpaperUrl) {
    URL.revokeObjectURL(currentWallpaperUrl);
    currentWallpaperUrl = null;
  }

  backgroundVideo.pause();
  backgroundVideo.removeAttribute("src");
  backgroundVideo.load();
  backgroundVideo.classList.remove("active");

  backgroundImage.removeAttribute("src");
  backgroundImage.classList.remove("active");

  if (!activeWallpaper) {
    if (staticBackground) {
      staticBackground.style.display = "block";
    }

    return;
  }

  if (staticBackground) {
    staticBackground.style.display = "none";
  }

  currentWallpaperUrl = URL.createObjectURL(
    activeWallpaper.blob,
  );

  if (activeWallpaper.type.startsWith("video/")) {
    backgroundVideo.src = currentWallpaperUrl;
    backgroundVideo.classList.add("active");
    backgroundVideo.play().catch(() => {});
  } else {
    backgroundImage.src = currentWallpaperUrl;
    backgroundImage.classList.add("active");
  }
}

function startWallpaperScheduler() {
  if (wallpaperScheduleTimer) {
    clearInterval(wallpaperScheduleTimer);
  }

  wallpaperScheduleTimer = setInterval(() => {
    applyActiveWallpaper().catch((error) => {
      console.error("Wallpaper scheduler failed:", error);
    });
  }, 60 * 1000);
}

async function setWallpaperMode(id, mode) {
  const wallpapers = await getWallpapers();

  for (const wallpaper of wallpapers) {
    const currentMode = getWallpaperMode(wallpaper);

    if (wallpaper.id === id) {
      wallpaper.mode = mode;
      wallpaper.primary = mode === WALLPAPER_MODES.PRIMARY;
    } else if (
      currentMode === WALLPAPER_MODES.PRIMARY &&
      mode !== WALLPAPER_MODES.PRIMARY
    ) {
      wallpaper.mode = WALLPAPER_MODES.DEFAULT;
      wallpaper.primary = false;
    }

    await saveWallpaper(wallpaper);
  }

  await applyActiveWallpaper();
  await renderWallpapers();
}

async function setPrimaryWallpaper(id) {
  const wallpapers = await getWallpapers();

  for (const wallpaper of wallpapers) {
    const currentMode = getWallpaperMode(wallpaper);

    if (wallpaper.id === id) {
      wallpaper.mode = WALLPAPER_MODES.PRIMARY;
      wallpaper.primary = true;
    } else {
      wallpaper.primary = false;

      if (currentMode === WALLPAPER_MODES.PRIMARY) {
        wallpaper.mode = WALLPAPER_MODES.DEFAULT;
      }
    }

    await saveWallpaper(wallpaper);
  }

  await applyActiveWallpaper();
  await renderWallpapers();
}

async function removeWallpaper(id) {
  await deleteWallpaper(id);
  await applyActiveWallpaper();
  await renderWallpapers();
}

async function initializeWallpaperSystem() {
  await renderWallpapers();
  await applyActiveWallpaper();
  startWallpaperScheduler();

  console.log("Wallpaper system initialized.");
}

/* ==========================================================================
   5. NOTES SYSTEM
   ========================================================================== */
const NOTES_STORE = "notes";
const notesList = document.querySelector("#notesList");
const notesCount = document.querySelector("#notesCount");
const addNoteButton = document.querySelector("#addNoteButton");

// Note editor elements
const noteEditor = document.querySelector("#noteEditor");
const noteTitle = document.querySelector("#noteTitle");
const noteContent = document.querySelector("#noteContent");
const saveNoteButton = document.querySelector("#saveNoteButton");
const cancelNoteButton = document.querySelector("#cancelNoteButton");
let editingNoteId = null;

// --- DB Operations ---
function getNotes() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE, "readonly");
    const store = transaction.objectStore(NOTES_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveNote(note) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE, "readwrite");
    const store = transaction.objectStore(NOTES_STORE);
    const request = store.put(note);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteNote(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE, "readwrite");
    const store = transaction.objectStore(NOTES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- UI Rendering ---
function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

async function renderNotes() {
  const notes = await getNotes();
  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return b.updatedAt - a.updatedAt;
  });

  notesList.innerHTML = "";
  notesCount.textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;

  if (notes.length === 0) {
    notesList.innerHTML = `<div class="note-empty">No notes yet.</div>`;
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("div");
    item.className = "note-item";
    if (note.pinned) item.classList.add("pinned");

    item.innerHTML = `
  <div class="note-content">
    <input type="checkbox" class="note-check" data-complete="${note.id}" ${note.completed ? "checked" : ""}>
    <div class="note-title ${note.completed ? "completed" : ""}">${escapeHTML(note.title)}</div>
    <div class="note-text ${note.completed ? "completed" : ""}">${escapeHTML(note.content)}</div>
  </div>
  <div class="note-actions">
    <button class="note-action" data-pin="${note.id}">${note.pinned ? "Unpin" : "Pin"}</button>
    <button class="note-action" data-edit="${note.id}">Edit</button>
    <button class="note-action" data-delete-note="${note.id}">Delete</button>
  </div>
`;
    notesList.appendChild(item);
  });

  attachNoteActions();
}

function attachNoteActions() {
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editNote(button.dataset.edit));
  });
  document.querySelectorAll("[data-pin]").forEach((button) => {
    button.addEventListener("click", () => toggleNotePin(button.dataset.pin));
  });
  document.querySelectorAll("[data-complete]").forEach((checkbox) => {
    checkbox.addEventListener("change", () =>
      toggleNoteCompleted(checkbox.dataset.complete),
    );
  });
  document.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () =>
      removeNote(button.dataset.deleteNote),
    );
  });
}

// --- State Management ---
// Open editor to add new note
addNoteButton.addEventListener("click", () => {
  editingNoteId = null;
  noteTitle.value = "";
  noteContent.value = "";
  noteEditor.classList.add("active");
  noteTitle.focus();
});

// Save note (new or edit)
saveNoteButton.addEventListener("click", async () => {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  if (!title && !content) return;

  const now = Date.now();

  if (editingNoteId) {
    const notes = await getNotes();
    const note = notes.find((item) => item.id === editingNoteId);
    if (!note) return;
    note.title = title;
    note.content = content;
    note.updatedAt = now;
    await saveNote(note);
  } else {
    const note = {
      id: crypto.randomUUID(),
      title,
      content,
      completed: false,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveNote(note);
  }

  closeNoteEditor();
  await renderNotes();
});

// Cancel editor
cancelNoteButton.addEventListener("click", () => {
  closeNoteEditor();
});

function closeNoteEditor() {
  editingNoteId = null;
  noteTitle.value = "";
  noteContent.value = "";
  noteEditor.classList.remove("active");
}

async function editNote(id) {
  const notes = await getNotes();
  const note = notes.find((item) => item.id === id);
  if (!note) return;

  editingNoteId = id;
  noteTitle.value = note.title || "";
  noteContent.value = note.content || "";
  noteEditor.classList.add("active");
  noteTitle.focus();
}

async function toggleNotePin(id) {
  const notes = await getNotes();
  const note = notes.find((item) => item.id === id);
  if (!note) return;

  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  await saveNote(note);
  await renderNotes();
}

async function toggleNoteCompleted(id) {
  const notes = await getNotes();
  const note = notes.find((item) => item.id === id);
  if (!note) return;

  note.completed = !note.completed;
  note.updatedAt = Date.now();
  await saveNote(note);
  await renderNotes();
}

async function removeNote(id) {
  const confirmed = confirm("Delete this note?");
  if (!confirmed) return;

  await deleteNote(id);
  await renderNotes();
}

async function initializeNotes() {
  await renderNotes();
  console.log("Notes system initialized.");
}

/* ==========================================================================
   6. START APPLICATION
   ========================================================================== */
updateClock();
setInterval(updateClock, 1000);
initApp();

/* --- Replace emoji search icon with clean inline SVG --- */
searchButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
searchButton.setAttribute("aria-label", "Search");

const searchContainer = document.querySelector("#searchContainer");

const backgroundDim = document.querySelector("#backgroundDim");

/* =========================
   Search Hover Background
   ========================= */

searchContainer.addEventListener("mouseenter", () => {
  if (!isSearchFocusEffectEnabled()) return;

  backgroundDim.classList.add("active");
});

searchContainer.addEventListener("mouseleave", () => {
  /*
   * Keep the dim effect while
   * the search input is focused.
   */
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


function setWidgetPosition(
    widgetName,
    position
) {

    const layout =
        loadWidgetLayout();


    layout[widgetName] =
        position;


    localStorage.setItem(
        WIDGET_LAYOUT_KEY,
        JSON.stringify(layout)
    );


    applyWidgetLayout();

}

function initializeSettings() {
  const searchEngineSetting = document.querySelector(
    "#searchEngineSetting",
  );

  const timeFormatSetting = document.querySelector(
    "#timeFormatSetting",
  );

  const searchFocusEffectSetting = document.querySelector(
    "#searchFocusEffectSetting",
  );

  const resetSettingsButton = document.querySelector(
    "#resetSettingsButton",
  );

  searchEngineSetting.value = loadSetting(
    SEARCH_ENGINE_KEY,
    defaultSettings.searchEngine,
  );

  timeFormatSetting.value = loadSetting(
    TIME_FORMAT_KEY,
    defaultSettings.timeFormat,
  );

  searchFocusEffectSetting.checked =
    loadSetting(
      SEARCH_FOCUS_EFFECT_KEY,
      String(defaultSettings.searchFocusEffect),
    ) === "true";

  searchEngineSetting.addEventListener("change", () => {
    const engine = searchEngineSetting.value;

    saveSetting(SEARCH_ENGINE_KEY, engine);
    applySearchEngine(engine);
  });

  timeFormatSetting.addEventListener("change", () => {
    timeFormat = timeFormatSetting.value;

    saveSetting(TIME_FORMAT_KEY, timeFormat);

    updateClock();
  });

  searchFocusEffectSetting.addEventListener("change", () => {
    saveSetting(
      SEARCH_FOCUS_EFFECT_KEY,
      String(searchFocusEffectSetting.checked),
    );
  });

  resetSettingsButton.addEventListener("click", () => {
    const confirmed = confirm(
      "Reset Fynn NewTab settings?",
    );

    if (!confirmed) return;

    localStorage.removeItem(SEARCH_ENGINE_KEY);
    localStorage.removeItem(TIME_FORMAT_KEY);
    localStorage.removeItem(SEARCH_FOCUS_EFFECT_KEY);

    applySearchEngine(defaultSettings.searchEngine);

    timeFormat = defaultSettings.timeFormat;
    updateClock();

    searchEngineSetting.value = defaultSettings.searchEngine;
    timeFormatSetting.value = defaultSettings.timeFormat;
    searchFocusEffectSetting.checked =
      defaultSettings.searchFocusEffect;
  });

  applySearchEngine(
    loadSetting(
      SEARCH_ENGINE_KEY,
      defaultSettings.searchEngine,
    ),
  );
}

function isSearchFocusEffectEnabled() {
  return (
    loadSetting(
      SEARCH_FOCUS_EFFECT_KEY,
      String(defaultSettings.searchFocusEffect),
    ) === "true"
  );
}