/* =========================
   Clock
   ========================= */

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

updateClock();

setInterval(updateClock, 1000);

/* =========================
   Search
   ========================= */

const engineButton = document.querySelector("#engineButton");
const engineIcon = document.querySelector("#engineIcon");
const engineMenu = document.querySelector("#engineMenu");

const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const engineOptions = document.querySelectorAll(".engine-option");

let currentEngine = "brave";

/* Open / close engine menu */

engineButton.addEventListener("click", (event) => {
  event.stopPropagation();

  engineMenu.classList.toggle("active");
});

/* Select search engine */

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

/* Search */

function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    searchInput.focus();
    return;
  }

  const encodedQuery = encodeURIComponent(query);

  let url;

  if (currentEngine === "brave") {
    url = `https://search.brave.com/search?q=${encodedQuery}`;
  }

  if (currentEngine === "google") {
    url = `https://www.google.com/search?q=${encodedQuery}`;
  }

  window.location.href = url;
}

/* Search button */

searchButton.addEventListener("click", performSearch);

/* Enter key */

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    performSearch();
  }
});

/* Close menu when clicking outside */

document.addEventListener("click", () => {
  engineMenu.classList.remove("active");
});

/* =========================
   Dashboard
   ========================= */

const dashboard = document.querySelector("#dashboard");
const dashboardToggle = document.querySelector("#dashboardToggle");

const dashboardTabs = document.querySelectorAll(".dashboard-tab");

const dashboardContents = document.querySelectorAll(".dashboard-content");

/* Open / close dashboard */

dashboardToggle.addEventListener("click", () => {
  const isOpen = dashboard.classList.toggle("open");

  document.querySelector(".app").classList.toggle("dashboard-open", isOpen);
});

/* Dashboard tabs */

dashboardTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    // Remove active tab
    dashboardTabs.forEach((item) => {
      item.classList.remove("active");
    });

    // Activate clicked tab
    tab.classList.add("active");

    // Hide all content
    dashboardContents.forEach((content) => {
      content.classList.remove("active");
    });

    // Show selected content
    document.querySelector(`#${target}`).classList.add("active");
  });
});

/* =========================
   Wallpaper Database
   ========================= */

const DB_NAME = "FynnNewTabDB";
const DB_VERSION = 1;
const STORE_NAME = "wallpapers";

let db;

/**
 * Open IndexedDB database.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
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

/**
 * Save a wallpaper to IndexedDB.
 */
function saveWallpaper(wallpaper) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(wallpaper);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get all wallpapers.
 */
function getWallpapers() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Delete wallpaper.
 */
function deleteWallpaper(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================
   Wallpaper Upload
   ========================= */

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

const wallpaperInput = document.querySelector("#wallpaperInput");

wallpaperInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

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

/* =========================
   Render Wallpapers
   ========================= */

const wallpaperList = document.querySelector("#wallpaperList");

async function renderWallpapers() {
  const wallpapers = await getWallpapers();

  wallpaperList.innerHTML = "";

  if (wallpapers.length === 0) {
    wallpaperList.innerHTML = `
            <div class="empty-state">
                <p>No wallpapers yet.</p>
                <span>
                    Upload an MP4 or image to get started.
                </span>
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
        ? `
                    <video
                        src="${url}"
                        muted
                        loop
                        autoplay
                        playsinline
                    ></video>
                `
        : `
                    <img
                        src="${previewUrl}"
                        alt="${wallpaper.name}"
                    >
                `;

    card.innerHTML = `

            <div class="wallpaper-preview">
                ${preview}
            </div>

            <div class="wallpaper-info">

                <span class="wallpaper-name">
                    ${wallpaper.primary ? "Primary" : wallpaper.name}
                </span>

                <span class="wallpaper-size">
                    ${formatFileSize(wallpaper.size)}
                </span>

            </div>

            <div class="wallpaper-actions">

                <button
                    class="wallpaper-action primary-button"
                    data-primary="${wallpaper.id}"
                >
                    ${wallpaper.primary ? "Active" : "Set Primary"}
                </button>

                <button
                    class="wallpaper-action delete-button"
                    data-delete="${wallpaper.id}"
                >
                    Delete
                </button>

            </div>

        `;

    wallpaperList.appendChild(card);
  });

  attachWallpaperActions();
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
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

function attachWallpaperActions() {
  document.querySelectorAll("[data-primary]").forEach((button) => {
    button.addEventListener("click", () => {
      setPrimaryWallpaper(button.dataset.primary);
    });
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      removeWallpaper(button.dataset.delete);
    });
  });
}

/* =========================
   Apply Primary Wallpaper
   ========================= */

const backgroundVideo = document.querySelector("#backgroundVideo");

const staticBackground = document.querySelector(".background");

async function applyPrimaryWallpaper() {
  const wallpapers = await getWallpapers();

  const primary = wallpapers.find((wallpaper) => wallpaper.primary);

  if (!primary) {
    backgroundVideo.classList.remove("active");

    staticBackground.style.display = "block";

    return;
  }

  if (primary.type.startsWith("video/")) {
    const url = URL.createObjectURL(primary.blob);

    backgroundVideo.src = url;

    backgroundVideo.classList.add("active");

    staticBackground.style.display = "none";

    backgroundVideo.play().catch(() => {});
  }
}

/* =========================
   Initialize Wallpaper System
   ========================= */

async function initializeWallpaperSystem() {
  try {
    await openDatabase();

    await renderWallpapers();

    await applyPrimaryWallpaper();

    console.log("Wallpaper system initialized.");
  } catch (error) {
    console.error("Failed to initialize wallpaper system:", error);
  }
}

/* =========================
   Widget System
   ========================= */

const widgetToggles = document.querySelectorAll(".widget-toggle");

function setWidgetVisibility(widgetName, visible) {
  const widgets = document.querySelectorAll(
    `[data-widget="${widgetName}"].widget`,
  );

  widgets.forEach((widget) => {
    widget.classList.toggle("hidden", !visible);
  });
}

widgetToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const widgetName = toggle.dataset.widget;
    const visible = toggle.checked;

    setWidgetVisibility(widgetName, visible);
    saveWidgetSettings();
  });
});

/* =========================
   Widget Settings Storage
   ========================= */

const WIDGET_SETTINGS_KEY = "fynn-widget-settings";

function loadWidgetSettings() {
  const saved = localStorage.getItem(WIDGET_SETTINGS_KEY);

  if (!saved) {
    return;
  }

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
  });
}

initializeWidgets();

initializeWallpaperSystem();
