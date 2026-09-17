

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

function setWidgetVisibility(widgetName, visible) {
  const widgets = document.querySelectorAll(
    `[data-widget="${widgetName}"].widget`,
  );
  widgets.forEach((widget) => {
    widget.classList.toggle("hidden", !visible);
  });
}

function loadWidgetSettings() {
  const saved = localStorage.getItem(WIDGET_SETTINGS_KEY);
  if (!saved) return;

  try {
    const settings = JSON.parse(saved);
    widgetToggles.forEach((toggle) => {
      const widgetName = toggle.dataset.widget;
      if (Object.prototype.hasOwnProperty.call(settings, widgetName)) {
        toggle.checked = settings[widgetName];
      }
    });
  } catch (error) {
    console.error("Failed to load widget settings:", error);
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
  loadWidgetSettings();

  widgetToggles.forEach((toggle) => {
    setWidgetVisibility(toggle.dataset.widget, toggle.checked);

    toggle.addEventListener("change", () => {
      setWidgetVisibility(toggle.dataset.widget, toggle.checked);
      saveWidgetSettings();
    });
  });
}

// --- 2.2 Clock Widget ---
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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

// --- 2.3 Search Widget ---
const engineButton = document.querySelector("#engineButton");
const engineIcon = document.querySelector("#engineIcon");
const engineMenu = document.querySelector("#engineMenu");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const engineOptions = document.querySelectorAll(".engine-option");

let currentEngine = "brave";

engineButton.addEventListener("click", (event) => {
  event.stopPropagation();
  engineMenu.classList.toggle("active");
});

engineOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const engine = option.dataset.engine;
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
  const isOpen = dashboard.classList.toggle("open");
  document.querySelector(".app").classList.toggle("dashboard-open", isOpen);
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
    dashboard.classList.remove("open");
    document.querySelector(".app").classList.remove("dashboard-open");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (!dashboard.classList.contains("open")) {
    return;
  }

  dashboard.classList.remove("open");
  document.querySelector(".app").classList.remove("dashboard-open");
});

/* ==========================================================================
   4. WALLPAPER SYSTEM
   ========================================================================== */
const WALLPAPER_STORE = "wallpapers";
const wallpaperInput = document.querySelector("#wallpaperInput");
const wallpaperList = document.querySelector("#wallpaperList");
const backgroundVideo = document.querySelector("#backgroundVideo");
const backgroundImage = document.querySelector("#backgroundImage");
const staticBackground = document.querySelector(".background");

let currentWallpaperUrl = null;

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
    primary: false,
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
    const url = URL.createObjectURL(wallpaper.blob);
    const card = document.createElement("div");
    card.className = `wallpaper-card ${wallpaper.primary ? "primary" : ""}`;

    let previewUrl = url;
    if (wallpaper.thumbnailBlob) {
      previewUrl = URL.createObjectURL(wallpaper.thumbnailBlob);
    }

    const preview =
      wallpaper.type.startsWith("video/") && !wallpaper.thumbnailBlob
        ? `<video src="${url}" muted loop autoplay playsinline></video>`
        : `<img src="${previewUrl}" alt="${wallpaper.name}">`;

    card.innerHTML = `
      <div class="wallpaper-preview">${preview}</div>
      <div class="wallpaper-info">
        <span class="wallpaper-name">${wallpaper.primary ? "Primary" : wallpaper.name}</span>
        <span class="wallpaper-size">${formatFileSize(wallpaper.size)}</span>
      </div>
      <div class="wallpaper-actions">
        <button class="wallpaper-action primary-button" data-primary="${wallpaper.id}">
          ${wallpaper.primary ? "Active" : "Set Primary"}
        </button>
        <button class="wallpaper-action delete-button" data-delete="${wallpaper.id}">Delete</button>
      </div>
    `;
    wallpaperList.appendChild(card);
  });
  attachWallpaperActions();
}

function attachWallpaperActions() {
  document.querySelectorAll("[data-primary]").forEach((button) => {
    button.addEventListener("click", () =>
      setPrimaryWallpaper(button.dataset.primary),
    );
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () =>
      removeWallpaper(button.dataset.delete),
    );
  });
}

// --- State Management ---
async function applyPrimaryWallpaper() {
  const wallpapers = await getWallpapers();
  const primary = wallpapers.find((wallpaper) => wallpaper.primary);

  if (currentWallpaperUrl) {
    URL.revokeObjectURL(currentWallpaperUrl);
    currentWallpaperUrl = null;
  }

  backgroundVideo.pause();
  backgroundVideo.removeAttribute("src");
  backgroundVideo.load();
  backgroundVideo.classList.remove("active");
  backgroundImage.classList.remove("active");

  if (!primary) {
    if (staticBackground) staticBackground.style.display = "block";
    return;
  }

  if (staticBackground) staticBackground.style.display = "none";
  currentWallpaperUrl = URL.createObjectURL(primary.blob);

  if (primary.type.startsWith("video/")) {
    backgroundVideo.src = currentWallpaperUrl;
    backgroundVideo.classList.add("active");
    backgroundVideo.play().catch(() => {});
  } else {
    backgroundImage.src = currentWallpaperUrl;
    backgroundImage.classList.add("active");
  }
}

async function setPrimaryWallpaper(id) {
  const wallpapers = await getWallpapers();
  for (const wallpaper of wallpapers) {
    wallpaper.primary = wallpaper.id === id;
    await saveWallpaper(wallpaper);
  }
  await applyPrimaryWallpaper();
  await renderWallpapers();
}

async function removeWallpaper(id) {
  await deleteWallpaper(id);
  await applyPrimaryWallpaper();
  await renderWallpapers();
}

async function initializeWallpaperSystem() {
  await renderWallpapers();
  await applyPrimaryWallpaper();
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
initializeWidgets();
initApp();
applyWidgetLayout();

/* --- Replace emoji search icon with clean inline SVG --- */
searchButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
searchButton.setAttribute("aria-label", "Search");

const searchContainer = document.querySelector("#searchContainer");

const backgroundDim = document.querySelector("#backgroundDim");

/* =========================
   Search Hover Background
   ========================= */

searchContainer.addEventListener("mouseenter", () => {
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