import { STORES, dbGetAll, dbPut, dbDelete } from "./db.js";
import { get as getSetting } from "./settings.js";
import { showConfirmDialog, showAlertDialog, showToast } from "./dialog.js";
import { t, onLanguageChange } from "./i18n/i18n.js";

const DEFAULT_WALLPAPER_MP4 = "../assets/wallpapers/default.mp4";
const DEFAULT_WALLPAPER_WEBM = "../assets/wallpapers/default.webm";
const BUILTIN_WALLPAPER_ID = "__builtin-default__";
const SCHEDULE_INTERVAL_MS = 60 * 1000;

/**
 * Returns the best default wallpaper source supported by the current browser.
 * Uses MP4 (H.264) when supported; falls back to WebM (VP9) on systems without
 * proprietary H.264 codecs (e.g. Linux distributions without restricted codecs).
 */
function getDefaultWallpaperSrc() {
  const probe = backgroundVideo || document.createElement("video");
  const canPlayMp4 = probe?.canPlayType?.('video/mp4; codecs="avc1.42E01E"') !== "";
  return canPlayMp4 ? DEFAULT_WALLPAPER_MP4 : DEFAULT_WALLPAPER_WEBM;
}

const WALLPAPER_MODES = {
  DEFAULT: "default",
  PRIMARY: "primary",
  DAY: "day",
  NIGHT: "night",
};

const VALID_WALLPAPER_MODES = Object.values(WALLPAPER_MODES);

const MEDIA_VALIDATION_TIMEOUT_MS = 10 * 1000;
const THUMBNAIL_MAX_WIDTH = 640;
const THUMBNAIL_EXTRACT_TIMEOUT_MS = 5000;

// Set to false when only the built-in fallback wallpaper is shown because the
// database is unavailable, so DB-backed code paths stay untouched.
let databaseAvailable = true;

// Corrupt wallpaper ids are remembered across sessions/tabs (localStorage) so
// a broken wallpaper is skipped right away instead of failing — and warning —
// again on every New Tab.
const BROKEN_WALLPAPERS_KEY = "fynn-broken-wallpapers";

function loadBrokenWallpaperIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BROKEN_WALLPAPERS_KEY));
    if (!Array.isArray(parsed)) return;
    for (const id of parsed) {
      if (typeof id === "string") failedWallpaperIds.add(id);
    }
  } catch {
    localStorage.removeItem(BROKEN_WALLPAPERS_KEY);
  }
}

function persistBrokenWallpaperIds() {
  try {
    localStorage.setItem(
      BROKEN_WALLPAPERS_KEY,
      JSON.stringify([...failedWallpaperIds]),
    );
  } catch {
    /* Non-fatal: the in-memory set still guards this tab. */
  }
}

// File names end up inside generated aria-labels, so they must be escaped
// before being interpolated into innerHTML.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const wallpaperInput = document.querySelector("#wallpaperInput");
const wallpaperUploadButton = document.querySelector("#wallpaperUploadButton");
const wallpaperList = document.querySelector("#wallpaperList");
const backgroundVideo = document.querySelector("#backgroundVideo");
const backgroundImage = document.querySelector("#backgroundImage");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentWallpaperUrl = null;
let activeWallpaperId = null;
let wallpaperScheduleTimer = null;
let applyToken = 0;
const wallpaperPreviewUrls = new Set();
const failedWallpaperIds = new Set();
let wallpaperRecoveryInProgress = false;
let wallpaperFallbackNoticeShown = false;

const saveWallpaper = (wallpaper) => dbPut(STORES.wallpapers, wallpaper);
const getWallpapers = () => dbGetAll(STORES.wallpapers);
const deleteWallpaper = (id) => dbDelete(STORES.wallpapers, id);

// When the background source is "gradient", the gradient layer (rendered by
// background.js) owns the screen and every media path below is bypassed.
function backgroundSourceIsGradient() {
  return getSetting("background.source") === "gradient";
}

function getWallpaperMode(wallpaper) {
  if (wallpaper.mode && VALID_WALLPAPER_MODES.includes(wallpaper.mode)) {
    return wallpaper.mode;
  }

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

function validateImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const finish = (error) => {
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve();
    };

    const timeoutId = setTimeout(() => {
      finish(new Error("Image validation timed out."));
    }, MEDIA_VALIDATION_TIMEOUT_MS);

    if (typeof createImageBitmap === "function") {
      createImageBitmap(file)
        .then((bitmap) => {
          clearTimeout(timeoutId);
          bitmap.close();
          finish(null);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          finish(new Error("Image could not be decoded."));
        });
      return;
    }

    const image = new Image();
    image.onload = () => {
      clearTimeout(timeoutId);
      finish(null);
    };
    image.onerror = () => {
      clearTimeout(timeoutId);
      finish(new Error("Image could not be decoded."));
    };
    image.src = url;
  });
}

function validateVideoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Video validation timed out."));
    }, MEDIA_VALIDATION_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);

      const { duration, videoWidth, videoHeight } = video;
      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        !videoWidth ||
        !videoHeight
      ) {
        cleanup();
        reject(new Error("Video metadata is invalid."));
        return;
      }

      cleanup();
      resolve();
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Video could not be decoded."));
    };

    video.src = url;
  });
}

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

// Mirrors extractVideoThumbnail: downscale to a small JPEG so the dashboard
// list does not have to decode the full-size blob for previews.
function extractImageThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    let timeoutId;
    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      image.onload = null;
      image.onerror = null;
    };

    timeoutId = setTimeout(() => {
      console.warn("Image thumbnail extraction timed out.");
      cleanup();
      resolve(null);
    }, THUMBNAIL_EXTRACT_TIMEOUT_MS);

    image.onload = () => {
      const canvas = document.createElement("canvas");

      let width = image.naturalWidth;
      let height = image.naturalHeight;
      if (width > THUMBNAIL_MAX_WIDTH) {
        height = Math.floor(height * (THUMBNAIL_MAX_WIDTH / width));
        width = THUMBNAIL_MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve(blob);
        },
        "image/jpeg",
        0.7,
      );
    };

    image.onerror = () => {
      console.warn("Image thumbnail extraction failed.");
      cleanup();
      resolve(null);
    };

    image.src = url;
  });
}

/**
 * Resolves the MIME type of a file or wallpaper. Some OS/browser combinations
 * (e.g. Linux/Windows for .mkv, .mov, .webm, or .avif) report an empty file.type;
 * this falls back to inspecting the file extension before rejecting.
 */
function resolveFileType(file) {
  if (file?.type) return file.type;
  const name = file?.name || "";
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) return "";
  const ext = name.slice(dotIndex).toLowerCase();
  const videoExts = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
  };
  const imageExts = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
  };
  return videoExts[ext] || imageExts[ext] || "";
}

async function handleWallpaperUpload(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size === 0) {
      await showAlertDialog(
        t("wallpapers.errors.invalidFile"),
        t("wallpapers.dialogs.invalidFileTitle"),
      );
      wallpaperInput.value = "";
      return;
    }

    const resolvedType = resolveFileType(file);

    if (!resolvedType.startsWith("video/") && !resolvedType.startsWith("image/")) {
      await showAlertDialog(
        t("wallpapers.errors.invalidFileType"),
        t("wallpapers.dialogs.invalidFileTypeTitle"),
      );
      wallpaperInput.value = "";
      return;
    }

    const MAX_SIZE_MB = 500;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      await showAlertDialog(
        t("wallpapers.errors.fileTooLarge", { maxSize: MAX_SIZE_MB }),
        t("wallpapers.dialogs.fileTooLargeTitle"),
      );
      wallpaperInput.value = "";
      return;
    }

    try {
      if (resolvedType.startsWith("video/")) {
        await validateVideoFile(file);
      } else {
        await validateImageFile(file);
      }
    } catch (error) {
      console.error("Wallpaper file validation failed:", error);
      await showAlertDialog(
        t("wallpapers.errors.invalidFile"),
        t("wallpapers.dialogs.invalidFileTitle"),
      );
      wallpaperInput.value = "";
      return;
    }

    let thumbnailBlob = null;

    if (resolvedType.startsWith("video/")) {
      thumbnailBlob = await extractVideoThumbnail(file);
    } else {
      thumbnailBlob = await extractImageThumbnail(file);
    }

    if (navigator.storage && typeof navigator.storage.persist === "function") {
      try {
        await navigator.storage.persist();
      } catch (error) {
        console.warn(
          "Storage persistence request failed; continuing upload:",
          error,
        );
      }
    }

    const wallpaper = {
      id: crypto.randomUUID(),
      name: file.name,
      type: resolvedType,
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
    wallpaperInput.value = "";
  }
}

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
    const isActive = wallpaper.id === activeWallpaperId;
    const isBroken = failedWallpaperIds.has(wallpaper.id);
    const wallpaperType = resolveFileType(wallpaper);

    const url = URL.createObjectURL(wallpaper.blob);
    wallpaperPreviewUrls.add(url);

    const card = document.createElement("div");
    card.className = `wallpaper-card ${isPrimary ? "primary" : ""} ${isActive ? "active-wallpaper" : ""}`.trim();

    let previewUrl = url;

    if (wallpaper.thumbnailBlob) {
      previewUrl = URL.createObjectURL(wallpaper.thumbnailBlob);
      wallpaperPreviewUrls.add(previewUrl);
    }

    const preview =
      wallpaperType.startsWith("video/") && !wallpaper.thumbnailBlob
        ? `<video src="${url}" muted loop playsinline></video>`
        : `<img src="${previewUrl}" alt="">`;

    const modeOptions = VALID_WALLPAPER_MODES.map(
      (value) =>
        `<option value="${value}" ${currentMode === value ? "selected" : ""}>${t("wallpapers.modes." + value)}</option>`,
    ).join("");

    card.innerHTML = `
      <div class="wallpaper-preview">
        ${preview}
        ${isActive ? `<span class="wallpaper-active-badge">${t("wallpapers.active")}</span>` : ""}
        ${isBroken ? `<span class="wallpaper-broken-badge" title="${escapeHtml(t("wallpapers.errors.loadFailed"))}">⚠️ ${t("common.error")}</span>` : ""}
      </div>

      <div class="wallpaper-info">
        <span class="wallpaper-name"></span>
        <span class="wallpaper-size">${formatFileSize(wallpaper.size)}</span>
      </div>

      <div class="wallpaper-mode-row">
        <span class="wallpaper-mode-label">
          ${t("wallpapers.modes." + currentMode).toUpperCase()}
        </span>

        <select class="wallpaper-mode-select" data-mode="${escapeHtml(wallpaper.id)}" aria-label="${escapeHtml(t("accessibility.wallpaperModeFor", { name: wallpaper.name }))}">
          ${modeOptions}
        </select>
      </div>

      <div class="wallpaper-actions">
        <button class="wallpaper-action delete-button" data-delete="${escapeHtml(wallpaper.id)}" aria-label="${escapeHtml(t("accessibility.deleteWallpaperFor", { name: wallpaper.name }))}">
          ${t("common.delete")}
        </button>
      </div>
    `;

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

  // Clicking on a broken card's preview allows the user to retry playback
  wallpaperList.querySelectorAll(".wallpaper-card").forEach((card) => {
    const deleteBtn = card.querySelector("[data-delete]");
    const id = deleteBtn?.dataset.delete;
    if (!id || !failedWallpaperIds.has(id)) return;

    const previewEl = card.querySelector(".wallpaper-preview");
    if (previewEl) {
      previewEl.style.cursor = "pointer";
      previewEl.title = t("wallpapers.errors.loadFailed") + " (Click to retry)";
      previewEl.addEventListener("click", async () => {
        failedWallpaperIds.delete(id);
        persistBrokenWallpaperIds();
        const wallpapers = await getWallpapers();
        await applyActiveWallpaper(wallpapers);
        await renderWallpapers(wallpapers);
      });
    }
  });
}

function clearBackgroundMedia() {
  backgroundVideo.pause();
  backgroundVideo.removeAttribute("src");
  backgroundVideo.load();
  backgroundVideo.classList.remove("active");

  backgroundImage.removeAttribute("src");
  backgroundImage.classList.remove("active");

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
  const list = (wallpapers ?? (await getWallpapers())).filter(
    (wallpaper) => !failedWallpaperIds.has(wallpaper.id),
  );
  if (token !== applyToken) return;

  const gradientMode = backgroundSourceIsGradient();
  const activeWallpaper = gradientMode ? null : getActiveWallpaper(list);
  // In gradient mode the id resolves to null (media must re-apply when the
  // user switches back); media mode keeps the BUILTIN sentinel so the default
  // video is applied even when no user wallpaper exists yet.
  const nextWallpaperId = gradientMode
    ? null
    : activeWallpaper?.id || BUILTIN_WALLPAPER_ID;

  if (nextWallpaperId === activeWallpaperId) {
    updateVideoPlayback();
    return;
  }

  activeWallpaperId = nextWallpaperId;

  wallpaperList.querySelectorAll(".wallpaper-card").forEach((card) => {
    const isNowActive = Boolean(
      nextWallpaperId &&
        card.querySelector(`[data-delete="${CSS.escape(nextWallpaperId)}"]`),
    );
    card.classList.toggle("active-wallpaper", isNowActive);
    const existingBadge = card.querySelector(".wallpaper-active-badge");
    if (isNowActive && !existingBadge) {
      const previewEl = card.querySelector(".wallpaper-preview");
      if (previewEl) {
        const badge = document.createElement("span");
        badge.className = "wallpaper-active-badge";
        badge.textContent = t("wallpapers.active");
        previewEl.appendChild(badge);
      }
    } else if (!isNowActive && existingBadge) {
      existingBadge.remove();
    }
  });

  clearBackgroundMedia();

  // Gradient mode: media stays off; the gradient layer is already on screen.
  if (backgroundSourceIsGradient()) return;

  if (!activeWallpaper) {
    backgroundVideo.src = getDefaultWallpaperSrc();
    backgroundVideo.classList.add("active");
    updateVideoPlayback();
    return;
  }

  currentWallpaperUrl = URL.createObjectURL(activeWallpaper.blob);

  if (resolveFileType(activeWallpaper).startsWith("video/")) {
    backgroundVideo.src = currentWallpaperUrl;
    backgroundVideo.classList.add("active");
    updateVideoPlayback();
  } else {
    backgroundImage.src = currentWallpaperUrl;
    backgroundImage.classList.add("active");
  }
}

async function handleBackgroundMediaError(mediaElement, mediaKind) {
  // Ignore stale errors from media that was already replaced or detached.
  if (!mediaElement.classList.contains("active") || !mediaElement.getAttribute("src")) {
    return;
  }

  if (activeWallpaperId === BUILTIN_WALLPAPER_ID) {
    console.error(
      "Built-in wallpaper failed to load:",
      mediaElement.error ?? null,
    );

    // If MP4 failed at runtime, try WebM fallback once before giving up
    if (
      mediaKind === "video" &&
      !mediaElement.src.endsWith("default.webm")
    ) {
      console.warn("Retrying built-in wallpaper with WebM format...");
      mediaElement.src = DEFAULT_WALLPAPER_WEBM;
      mediaElement.load();
      updateVideoPlayback();
      return;
    }

    mediaElement.classList.remove("active");
    mediaElement.removeAttribute("src");
    if (mediaKind === "video") mediaElement.load();
    return;
  }

  const failedId = activeWallpaperId;

  clearBackgroundMedia();
  if (!failedId || wallpaperRecoveryInProgress) return;

  wallpaperRecoveryInProgress = true;
  failedWallpaperIds.add(failedId);
  persistBrokenWallpaperIds();

  try {
    await applyActiveWallpaper();
  } catch (error) {
    console.error("Wallpaper fallback failed:", error);
  } finally {
    wallpaperRecoveryInProgress = false;
  }

  if (!wallpaperFallbackNoticeShown) {
    wallpaperFallbackNoticeShown = true;
    // A non-blocking notice instead of a modal alert: the fallback wallpaper
    // is already on screen, so the user does not have to acknowledge a dialog
    // (which would otherwise pop up in every new tab).
    showToast(t("wallpapers.errors.loadFailed"), { variant: "error" });
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

  // Clear broken flag if user actively updates mode, giving it another chance
  if (failedWallpaperIds.has(id)) {
    failedWallpaperIds.delete(id);
    persistBrokenWallpaperIds();
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
      wallpaper.mode = WALLPAPER_MODES.DEFAULT;
      wallpaper.primary = false;
      changed.push(wallpaper);
    }
  }

  await Promise.all(changed.map((wallpaper) => saveWallpaper(wallpaper)));

  await applyActiveWallpaper(wallpapers);
  await renderWallpapers(wallpapers);
}

async function removeWallpaper(id) {
  await deleteWallpaper(id);
  failedWallpaperIds.delete(id);
  persistBrokenWallpaperIds();

  if (activeWallpaperId === id) {
    activeWallpaperId = null;
  }

  const wallpapers = await getWallpapers();
  await applyActiveWallpaper(wallpapers);
  await renderWallpapers(wallpapers);
}

function bindWallpaperEvents() {
  // The upload control is a real <button> (not a <label> wrapping the hidden
  // input) so it is reachable and activatable with the keyboard, mirroring the
  // Import button in the settings tab.
  wallpaperUploadButton?.addEventListener("click", () => {
    wallpaperInput?.click();
  });

  wallpaperInput.addEventListener("change", handleWallpaperUpload);

  backgroundVideo.muted = true;
  backgroundVideo.loop = true;
  backgroundVideo.playsInline = true;
  backgroundVideo.disablePictureInPicture = true;

  document.addEventListener("visibilitychange", () => {
    const isVisible = document.visibilityState === "visible";

    updateVideoPlayback({ recover: isVisible });

    if (isVisible && databaseAvailable) {
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

  backgroundVideo.addEventListener("error", () => {
    handleBackgroundMediaError(backgroundVideo, "video");
  });

  backgroundImage.addEventListener("error", () => {
    handleBackgroundMediaError(backgroundImage, "image");
  });
}

export async function initWallpaper() {
  loadBrokenWallpaperIds();
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

// Fallback for when the database cannot be opened: user wallpapers are
// unavailable. The built-in default wallpaper is shown UNLESS the user has
// chosen the gradient source — the gradient is plain CSS driven by settings,
// so it works fine without the database.
export function initDefaultWallpaper() {
  databaseAvailable = false;
  bindWallpaperEvents();

  if (backgroundSourceIsGradient()) {
    activeWallpaperId = null;
    renderWallpapers([]);
    return;
  }

  activeWallpaperId = BUILTIN_WALLPAPER_ID;

  backgroundVideo.src = getDefaultWallpaperSrc();
  backgroundVideo.classList.add("active");
  updateVideoPlayback();

  renderWallpapers([]);
}