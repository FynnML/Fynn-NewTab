/**
 * wallpaper.js — Wallpaper system: IndexedDB storage, upload, dashboard
 * list, wallpaper modes (default/primary/day/night) and the active
 * wallpaper scheduler.
 */

import { STORES, dbGetAll, dbPut, dbDelete } from "./db.js";
import { showConfirmDialog, showAlertDialog } from "./dialog.js";
import { t, onLanguageChange } from "./i18n/i18n.js";

const DEFAULT_WALLPAPER_SRC = "../assets/wallpapers/default.mp4";
const BUILTIN_WALLPAPER_ID = "__builtin-default__";
const SCHEDULE_INTERVAL_MS = 60 * 1000;

const OVERLAY_STRENGTH_KEY = "fynn-overlay-strength";
const DEFAULT_OVERLAY_STRENGTH = 100; // percent
const MIN_OVERLAY_STRENGTH = 50;
const MAX_OVERLAY_STRENGTH = 180;

const WALLPAPER_MODES = {
  DEFAULT: "default",
  PRIMARY: "primary",
  DAY: "day",
  NIGHT: "night",
};

const VALID_WALLPAPER_MODES = Object.values(WALLPAPER_MODES);

const wallpaperInput = document.querySelector("#wallpaperInput");
const wallpaperList = document.querySelector("#wallpaperList");
const backgroundVideo = document.querySelector("#backgroundVideo");
const backgroundImage = document.querySelector("#backgroundImage");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentWallpaperUrl = null;
let activeWallpaperId = null;
let wallpaperScheduleTimer = null;
let applyToken = 0;
const wallpaperPreviewUrls = new Set();

// --- Overlay strength ---

const clampOverlayStrength = (value) =>
  Math.min(MAX_OVERLAY_STRENGTH, Math.max(MIN_OVERLAY_STRENGTH, value));

export function getOverlayStrength() {
  const saved = Number(localStorage.getItem(OVERLAY_STRENGTH_KEY));
  return Number.isFinite(saved) && saved > 0
    ? clampOverlayStrength(saved)
    : DEFAULT_OVERLAY_STRENGTH;
}

function applyOverlayStrength(percent) {
  document.documentElement.style.setProperty(
    "--overlay-strength",
    String(percent / 100),
  );
}

/** Applies + saves the overlay strength. Used by the Settings tab. */
export function setOverlayStrength(percent) {
  const clamped = clampOverlayStrength(percent);

  applyOverlayStrength(clamped);
  localStorage.setItem(OVERLAY_STRENGTH_KEY, String(clamped));
}

export function resetOverlayStrength() {
  localStorage.removeItem(OVERLAY_STRENGTH_KEY);
  applyOverlayStrength(DEFAULT_OVERLAY_STRENGTH);
}

/** LocalStorage-only — call this early, before openDatabase(). */
export function initOverlayStrength() {
  applyOverlayStrength(getOverlayStrength());
}

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
    const matches = wallpapers.filter(
      (wallpaper) => getWallpaperMode(wallpaper) === mode,
    );
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
      video.removeAttribute("src");
      video.load();
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
      await showAlertDialog(
        t("wallpapers.errors.invalidFileType"),
        t("wallpapers.dialogs.invalidFileTypeTitle"),
      );
      return;
    }

    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      await showAlertDialog(
        t("wallpapers.errors.fileTooLarge", { maxSize: MAX_SIZE_MB }),
        t("wallpapers.dialogs.fileTooLargeTitle"),
      );
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

    const wallpapers = await getWallpapers();
    await applyActiveWallpaper(wallpapers);
    await renderWallpapers(wallpapers);

    wallpaperInput.value = "";
  } catch (error) {
    console.error("Wallpaper upload failed:", error);
    await showAlertDialog(t("wallpapers.errors.uploadFailed"), t("common.error"));
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

async function renderWallpapers(wallpapers) {
  const list = wallpapers ?? (await getWallpapers());

  revokeWallpaperPreviewUrls();
  wallpaperList.innerHTML = "";

  if (list.length === 0) {
    wallpaperList.innerHTML = `
      <div class="empty-state">
        <p>${t("wallpapers.empty.title")}</p>
        <span>${t("wallpapers.empty.description")}</span>
      </div>
    `;
    return;
  }

  list.forEach((wallpaper) => {
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
        ? `<video src="${url}" muted loop playsinline></video>`
        : `<img src="${previewUrl}" alt="">`;

    const modeOptions = VALID_WALLPAPER_MODES.map(
      (value) =>
        `<option value="${value}" ${currentMode === value ? "selected" : ""}>${t("wallpapers.modes." + value)}</option>`,
    ).join("");

    card.innerHTML = `
      <div class="wallpaper-preview">${preview}</div>

      <div class="wallpaper-info">
        <span class="wallpaper-name"></span>
        <span class="wallpaper-size">${formatFileSize(wallpaper.size)}</span>
      </div>

      <div class="wallpaper-mode-row">
        <span class="wallpaper-mode-label">
          ${t("wallpapers.modes." + currentMode).toUpperCase()}
        </span>

        <select class="wallpaper-mode-select" data-mode="${wallpaper.id}" aria-label="${t("accessibility.wallpaperMode")}">
          ${modeOptions}
        </select>
      </div>

      <div class="wallpaper-actions">
        <button class="wallpaper-action delete-button" data-delete="${wallpaper.id}">
          ${t("common.delete")}
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
      const confirmed = await showConfirmDialog(
        t("wallpapers.dialogs.deleteConfirmation"),
        t("common.confirm"),
        t("common.delete"),
      );
      if (!confirmed) return;
      removeWallpaper(button.dataset.delete).catch((error) => {
        console.error("Wallpaper deletion failed:", error);
      });
    });
  });
}

// --- Playback ---

function clearBackgroundMedia() {
  backgroundVideo.pause();
  backgroundVideo.removeAttribute("src");
  backgroundVideo.load();
  backgroundVideo.classList.remove("active");

  backgroundImage.removeAttribute("src");
  backgroundImage.classList.remove("active");

  // Revoke after detaching src so the element never holds a dead blob URL.
  if (currentWallpaperUrl) {
    URL.revokeObjectURL(currentWallpaperUrl);
    currentWallpaperUrl = null;
  }
}

function updateVideoPlayback({ recover = false } = {}) {
  if (!backgroundVideo.classList.contains("active")) return;

  if (document.hidden || reducedMotionQuery.matches) {
    backgroundVideo.pause();
    return;
  }

  const attempt = backgroundVideo.play();
  if (!attempt) return;

  attempt.catch(() => {
    // Chromium may discard the decoder after a long time in the background.
    // Reload once, then give up silently — a looping wallpaper can restart.
    if (!recover) return;
    if (document.hidden || reducedMotionQuery.matches) return;
    if (!backgroundVideo.classList.contains("active")) return;
    if (!backgroundVideo.src) return;

    backgroundVideo.load();
    backgroundVideo.play().catch(() => {});
  });
}

async function applyActiveWallpaper(wallpapers) {
  const token = ++applyToken;
  const list = wallpapers ?? (await getWallpapers());
  if (token !== applyToken) return;

  const activeWallpaper = getActiveWallpaper(list);
  const nextWallpaperId = activeWallpaper?.id || BUILTIN_WALLPAPER_ID;

  // Same wallpaper: still resume/pause to match current visibility.
  if (nextWallpaperId === activeWallpaperId) {
    updateVideoPlayback();
    return;
  }

  activeWallpaperId = nextWallpaperId;
  clearBackgroundMedia();

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
    if (document.hidden) return;

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
  const changed = [];

  for (const wallpaper of wallpapers) {
    const currentMode = getWallpaperMode(wallpaper);

    if (wallpaper.id === id) {
      if (currentMode === mode) continue;

      wallpaper.mode = mode;
      wallpaper.primary = mode === WALLPAPER_MODES.PRIMARY;
      changed.push(wallpaper);
    } else if (
      currentMode === WALLPAPER_MODES.PRIMARY &&
      mode === WALLPAPER_MODES.PRIMARY
    ) {
      // Only one wallpaper can be primary at a time
      wallpaper.mode = WALLPAPER_MODES.DEFAULT;
      wallpaper.primary = false;
      changed.push(wallpaper);
    }
  }

  // Only write the records that actually changed, instead of rewriting
  // every wallpaper on every mode change.
  await Promise.all(changed.map((wallpaper) => saveWallpaper(wallpaper)));

  // In-memory records are already updated; reuse them instead of re-reading.
  await applyActiveWallpaper(wallpapers);
  await renderWallpapers(wallpapers);
}

async function removeWallpaper(id) {
  await deleteWallpaper(id);

  if (activeWallpaperId === id) {
    activeWallpaperId = null;
  }

  const wallpapers = await getWallpapers();
  await applyActiveWallpaper(wallpapers);
  await renderWallpapers(wallpapers);
}

// --- Init ---

function bindWallpaperEvents() {
  wallpaperInput.addEventListener("change", handleWallpaperUpload);

  backgroundVideo.muted = true;
  backgroundVideo.loop = true;
  backgroundVideo.playsInline = true;
  backgroundVideo.disablePictureInPicture = true;

  document.addEventListener("visibilitychange", () => {
    const isVisible = document.visibilityState === "visible";

    // Resume/pause immediately — do not wait on IndexedDB.
    updateVideoPlayback({ recover: isVisible });

    if (isVisible) {
      applyActiveWallpaper().catch((error) => {
        console.error("Wallpaper re-check failed:", error);
      });
    }
  });

  document.addEventListener("freeze", () => {
    backgroundVideo.pause();
  });

  document.addEventListener("resume", () => {
    updateVideoPlayback({ recover: true });
  });

  reducedMotionQuery.addEventListener("change", () => {
    updateVideoPlayback();
  });

  // Bundled default missing or unreadable → keep the plain dark background.
  backgroundVideo.addEventListener("error", () => {
    if (activeWallpaperId !== BUILTIN_WALLPAPER_ID) return;

    console.error(
      "Built-in wallpaper failed to load:",
      backgroundVideo.error,
    );

    backgroundVideo.classList.remove("active");
    backgroundVideo.removeAttribute("src");
    backgroundVideo.load();
  });
}

/** Requires openDatabase() to have resolved. */
export async function initWallpaper() {
  bindWallpaperEvents();

  const wallpapers = await getWallpapers();
  await renderWallpapers(wallpapers);
  await applyActiveWallpaper(wallpapers);
  startWallpaperScheduler();

  onLanguageChange(() => {
    renderWallpapers().catch((error) => {
      console.error("Wallpaper re-render failed:", error);
    });
  });
}