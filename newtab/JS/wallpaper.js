/**
 * wallpaper.js — Wallpaper system: IndexedDB storage, upload, dashboard
 * list, wallpaper modes (default/primary/day/night) and the active
 * wallpaper scheduler.
 */

import { STORES, dbGetAll, dbPut, dbDelete } from "./db.js";
import { showConfirmDialog, showAlertDialog } from "./dialog.js";

/*
 * Built-in fallback wallpaper, shown whenever no custom wallpaper applies:
 * first run, or after every custom wallpaper has been deleted.
 * It lives in assets/, not in IndexedDB, so it can't be deleted from the
 * dashboard and never competes with uploads when picking the active one.
 * If the file is missing, the plain dark background is used instead.
 */
const DEFAULT_WALLPAPER_SRC = "../assets/wallpapers/default.mp4";
const BUILTIN_WALLPAPER_ID = "__builtin-default__";
const SCHEDULE_INTERVAL_MS = 60 * 1000;

const WALLPAPER_MODES = {
  DEFAULT: "default",
  PRIMARY: "primary",
  DAY: "day",
  NIGHT: "night",
};

const VALID_WALLPAPER_MODES = Object.values(WALLPAPER_MODES);

const MODE_OPTIONS = [
  [WALLPAPER_MODES.DEFAULT, "Default"],
  [WALLPAPER_MODES.PRIMARY, "Primary"],
  [WALLPAPER_MODES.DAY, "Day"],
  [WALLPAPER_MODES.NIGHT, "Night"],
];

const wallpaperInput = document.querySelector("#wallpaperInput");
const wallpaperList = document.querySelector("#wallpaperList");
const backgroundVideo = document.querySelector("#backgroundVideo");
const backgroundImage = document.querySelector("#backgroundImage");

let currentWallpaperUrl = null;
let activeWallpaperId = null;
let wallpaperScheduleTimer = null;
const wallpaperPreviewUrls = new Set();

// --- DB Operations ---

const saveWallpaper = (wallpaper) => dbPut(STORES.wallpapers, wallpaper);
const getWallpapers = () => dbGetAll(STORES.wallpapers);
const deleteWallpaper = (id) => dbDelete(STORES.wallpapers, id);

// --- Mode helpers ---

function getWallpaperMode(wallpaper) {
  if (wallpaper.mode && VALID_WALLPAPER_MODES.includes(wallpaper.mode)) {
    return wallpaper.mode;
  }

  // Backward compatibility for old wallpaper records.
  return wallpaper.primary ? WALLPAPER_MODES.PRIMARY : WALLPAPER_MODES.DEFAULT;
}

function getScheduledWallpaperMode(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 6 && hour < 18) {
    return WALLPAPER_MODES.DAY;
  }

  return WALLPAPER_MODES.NIGHT;
}

function getActiveWallpaper(wallpapers) {
  const findByMode = (mode) => {
    const matches = wallpapers.filter((wallpaper) => getWallpaperMode(wallpaper) === mode);
    if (matches.length === 0) return null;
    matches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return matches[0];
  };

  return (
    findByMode(WALLPAPER_MODES.PRIMARY) ||
    findByMode(getScheduledWallpaperMode()) ||
    findByMode(WALLPAPER_MODES.DEFAULT) ||
    null
  );
}

// --- Upload & Processing ---

function extractVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let timeoutId;
    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(video.src);
      video.remove();
    };

    timeoutId = setTimeout(() => {
      console.warn("Video thumbnail extraction timed out.");
      cleanup();
      resolve(null);
    }, 5000);

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2 || 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      
      const MAX_WIDTH = 640;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > MAX_WIDTH) {
        height = Math.floor(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve(blob);
        },
        "image/jpeg",
        0.7,
      );
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = URL.createObjectURL(file);
  });
}

async function handleWallpaperUpload(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      await showAlertDialog("Please select a valid image or video.", "Invalid File Type");
      return;
    }

    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      await showAlertDialog(`File size exceeds ${MAX_SIZE_MB}MB limit. Please choose a smaller file.`, "File Too Large");
      wallpaperInput.value = "";
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
      thumbnailBlob,
      mode: WALLPAPER_MODES.DEFAULT,
      createdAt: Date.now(),
    };

    await saveWallpaper(wallpaper);
    await applyActiveWallpaper();
    await renderWallpapers();

    wallpaperInput.value = "";
  } catch (error) {
    console.error("Wallpaper upload failed:", error);
    await showAlertDialog("Failed to save wallpaper.", "Error");
  }
}

// --- UI Rendering ---

function revokeWallpaperPreviewUrls() {
  for (const url of wallpaperPreviewUrls) {
    URL.revokeObjectURL(url);
  }

  wallpaperPreviewUrls.clear();
}

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
        <p>No custom wallpapers yet.</p>
        <span>Upload an MP4 or image to replace the default.</span>
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
    card.className = `wallpaper-card ${isPrimary ? "primary" : ""}`;

    let previewUrl = url;

    if (wallpaper.thumbnailBlob) {
      previewUrl = URL.createObjectURL(wallpaper.thumbnailBlob);
      wallpaperPreviewUrls.add(previewUrl);
    }

    const preview =
      wallpaper.type.startsWith("video/") && !wallpaper.thumbnailBlob
        ? `<video src="${url}" muted loop autoplay playsinline></video>`
        : `<img src="${previewUrl}" alt="">`;

    const modeOptions = MODE_OPTIONS.map(
      ([value, label]) =>
        `<option value="${value}" ${currentMode === value ? "selected" : ""}>${label}</option>`,
    ).join("");

    card.innerHTML = `
      <div class="wallpaper-preview">${preview}</div>

      <div class="wallpaper-info">
        <span class="wallpaper-name"></span>
        <span class="wallpaper-size">${formatFileSize(wallpaper.size)}</span>
      </div>

      <div class="wallpaper-mode-row">
        <span class="wallpaper-mode-label">
          ${currentMode.toUpperCase()}
        </span>

        <select class="wallpaper-mode-select" data-mode="${wallpaper.id}" aria-label="Wallpaper mode">
          ${modeOptions}
        </select>
      </div>

      <div class="wallpaper-actions">
        <button class="wallpaper-action delete-button" data-delete="${wallpaper.id}">
          Delete
        </button>
      </div>
    `;

    // User-provided text goes in via textContent (no HTML escaping needed).
    card.querySelector(".wallpaper-name").textContent = wallpaper.name;

    const previewImage = card.querySelector(".wallpaper-preview img");
    if (previewImage) previewImage.alt = wallpaper.name;

    wallpaperList.appendChild(card);
  });

  attachWallpaperActions();
}

function attachWallpaperActions() {
  wallpaperList.querySelectorAll("[data-mode]").forEach((select) => {
    select.addEventListener("change", () => {
      setWallpaperMode(select.dataset.mode, select.value).catch((error) => {
        console.error("Wallpaper mode update failed:", error);
      });
    });
  });

  wallpaperList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = await showConfirmDialog("Are you sure you want to delete this wallpaper?");
      if (!confirmed) return;
      removeWallpaper(button.dataset.delete).catch((error) => {
        console.error("Wallpaper deletion failed:", error);
      });
    });
  });
}

// --- State Management ---

function updateVideoPlayback() {
  if (!backgroundVideo.classList.contains("active")) return;
  
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.hidden || prefersReducedMotion) {
    backgroundVideo.pause();
  } else {
    backgroundVideo.play().catch(() => {});
  }
}

async function applyActiveWallpaper() {
  const wallpapers = await getWallpapers();
  const activeWallpaper = getActiveWallpaper(wallpapers);
  const nextWallpaperId = activeWallpaper?.id || BUILTIN_WALLPAPER_ID;

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
    backgroundVideo.src = DEFAULT_WALLPAPER_SRC;
    backgroundVideo.classList.add("active");
    updateVideoPlayback();
    return;
  }

  currentWallpaperUrl = URL.createObjectURL(activeWallpaper.blob);

  if (activeWallpaper.type.startsWith("video/")) {
    backgroundVideo.src = currentWallpaperUrl;
    backgroundVideo.classList.add("active");
    updateVideoPlayback();
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
  }, SCHEDULE_INTERVAL_MS);
}

async function setWallpaperMode(id, mode) {
  if (!VALID_WALLPAPER_MODES.includes(mode)) {
    console.warn(`Invalid wallpaper mode: ${mode}`);
    return;
  }

  const wallpapers = await getWallpapers();

  for (const wallpaper of wallpapers) {
    const currentMode = getWallpaperMode(wallpaper);

    if (wallpaper.id === id) {
      wallpaper.mode = mode;
      wallpaper.primary = mode === WALLPAPER_MODES.PRIMARY;
    } else if (
      currentMode === WALLPAPER_MODES.PRIMARY &&
      mode === WALLPAPER_MODES.PRIMARY
    ) {
      // Only one wallpaper can be primary at a time
      wallpaper.mode = WALLPAPER_MODES.DEFAULT;
      wallpaper.primary = false;
    }

    await saveWallpaper(wallpaper);
  }

  await applyActiveWallpaper();
  await renderWallpapers();
}

async function removeWallpaper(id) {
  await deleteWallpaper(id);

  if (activeWallpaperId === id) {
    activeWallpaperId = null;
  }

  await applyActiveWallpaper();
  await renderWallpapers();
}

// --- Init ---

function bindWallpaperEvents() {
  wallpaperInput.addEventListener("change", handleWallpaperUpload);

  document.addEventListener("visibilitychange", updateVideoPlayback);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", updateVideoPlayback);

  // Bundled default missing or unreadable → keep the plain dark background.
  backgroundVideo.addEventListener("error", () => {
    if (activeWallpaperId !== BUILTIN_WALLPAPER_ID) return;

    console.error(
      "Built-in wallpaper failed to load:",
      backgroundVideo.error,
    );

    backgroundVideo.classList.remove("active");
    backgroundVideo.removeAttribute("src");
  });
}

/** Requires openDatabase() to have resolved. */
export async function initWallpaper() {
  bindWallpaperEvents();

  await renderWallpapers();
  await applyActiveWallpaper();
  startWallpaperScheduler();

  console.log("Wallpaper system initialized.");
}