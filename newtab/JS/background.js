// background.js — gradient background feature.
//
// Owns everything gradient:
//   1. Rendering the CSS variables the gradient layer consumes
//      (--bg-gradient, --bg-grain, --gradient-dim, data-bg-tone).
//   2. The time-of-day schedule ("lịch theo giờ"): re-renders when the
//      morning/day/evening/night bucket changes so the gradient (and the
//      derived accent, via settings.reapply) follows the clock.
//   3. The "Background" panel inside the Wallpapers tab: source toggle,
//      preset grid, editor (style, angle, colors, grain, switches) and the
//      share-code box.
//
// settings.js stays decoupled: it only maps state -> data-bg-source and the
// accent; this module subscribes for everything visual. Color math lives in
// color.js.

import { get, set, update, subscribe, reapply, RANGES } from "./settings.js";
import {
  buildGradientValue,
  effectiveStops,
  stopsLuminance,
  scheduleBucketForHour,
  mixHex,
} from "./color.js";
import { t, tArray, applyI18n } from "./i18n/i18n.js";
import { showAlertDialog, showToast } from "./dialog.js";

const SCHEDULE_TICK_MS = 60 * 1000;

// Auto contrast: map the stops' weighted luminance (0..1) to an overlay dim
// factor. Dark gradients get slightly less dimming, bright ones up to 1.3x
// so the hero text stays readable. Used only when autoContrast is on.
function contrastDimFor(luminance, autoContrast) {
  if (!autoContrast) return 1;
  const dim = 0.85 + (luminance - 0.25) * 0.9;
  return Math.min(1.3, Math.max(0.85, dim));
}

const LIGHT_TONE_LUMINANCE = 0.42;

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const GRADIENT_PRESETS = [
  { nameKey: 0, type: "linear", angle: 135, stops: [["#0b2545", 0], ["#133c6b", 55], ["#2a9d8f", 100]] },
  { nameKey: 1, type: "linear", angle: 150, stops: [["#012d36", 0], ["#0e7c7b", 55], ["#80ed99", 100]] },
  { nameKey: 2, type: "linear", angle: 120, stops: [["#ff9e00", 0], ["#ff0054", 55], ["#390099", 100]] },
  { nameKey: 3, type: "linear", angle: 135, stops: [["#10002b", 0], ["#5a189a", 55], ["#e0aaff", 100]] },
  { nameKey: 4, type: "radial", angle: 0, stops: [["#ff7b00", 0], ["#a4161a", 55], ["#161a1d", 100]] },
  { nameKey: 5, type: "linear", angle: 160, stops: [["#032b1f", 0], ["#14746f", 60], ["#95d5b2", 100]] },
  { nameKey: 6, type: "linear", angle: 200, stops: [["#0d1b2a", 0], ["#5b4b8a", 60], ["#e56b6f", 100]] },
  { nameKey: 7, type: "conic", angle: 45, stops: [["#ff5d8f", 0], ["#ff9770", 35], ["#ffd670", 70], ["#ff5d8f", 100]] },
];

// ---------------------------------------------------------------------------
// Share codes
// ---------------------------------------------------------------------------

const SHARE_PREFIX = "FYNNBG1-";
const GRADIENT_TYPES = ["linear", "radial", "conic"];

function toBase64Url(b64) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  let b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64;
}

function encodeShareCode(background) {
  const payload = {
    t: background.type,
    a: background.angle,
    s: background.stops.map((stop) => [stop.color, stop.position]),
    g: background.grain,
    d: background.drift,
    h: background.schedule,
    c: background.autoContrast,
  };
  return SHARE_PREFIX + toBase64Url(btoa(JSON.stringify(payload)));
}

const SHARE_CODE_MAX_LENGTH = 1024; // Reject inputs over 1 KB to prevent UI freezing before decoding

// Strictly validates the decoded payload: anything malformed means the whole
// code is rejected (null) instead of partially applied. update() sanitizes
// each path again, so even a valid-looking code cannot inject junk.
function decodeShareCode(code) {
  const raw = String(code ?? "").trim();
  if (!raw.startsWith(SHARE_PREFIX) || raw.length > SHARE_CODE_MAX_LENGTH) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(atob(fromBase64Url(raw.slice(SHARE_PREFIX.length))));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;

  if (!GRADIENT_TYPES.includes(payload.t)) return null;
  if (!Number.isFinite(payload.a)) return null;
  if (!Array.isArray(payload.s) || payload.s.length < 2 || payload.s.length > 4) {
    return null;
  }

  const stops = [];
  for (const entry of payload.s) {
    if (
      !Array.isArray(entry) ||
      typeof entry[0] !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(entry[0]) ||
      !Number.isFinite(entry[1])
    ) {
      return null;
    }
    stops.push({ color: entry[0].toLowerCase(), position: entry[1] });
  }

  for (const flag of [payload.d, payload.h, payload.c]) {
    if (typeof flag !== "boolean") return null;
  }
  if (!Number.isFinite(payload.g)) return null;

  return {
    "background.source": "gradient",
    "background.type": payload.t,
    "background.angle": payload.a,
    "background.stops": stops,
    "background.grain": payload.g,
    "background.drift": payload.d,
    "background.schedule": payload.h,
    "background.autoContrast": payload.c,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let lastScheduleBucket = null;

function renderBackgroundVisuals() {
  const root = document.documentElement;
  const background = get("background");
  const stops = effectiveStops(background);

  root.style.setProperty(
    "--bg-gradient",
    buildGradientValue({ type: background.type, angle: background.angle, stops }),
  );
  root.style.setProperty("--bg-grain", String((background.grain || 0) / 100));

  const luminance = stopsLuminance(stops);
  root.style.setProperty(
    "--gradient-dim",
    String(contrastDimFor(luminance, background.autoContrast)),
  );
  root.dataset.bgTone = luminance >= LIGHT_TONE_LUMINANCE ? "light" : "dark";

  lastScheduleBucket = scheduleBucketForHour(new Date().getHours());
}

function startScheduleTimer() {
  setInterval(() => {
    if (document.hidden) return;

    const background = get("background");
    if (background.source !== "gradient" || !background.schedule) {
      lastScheduleBucket = scheduleBucketForHour(new Date().getHours());
      return;
    }

    const bucket = scheduleBucketForHour(new Date().getHours());
    if (bucket === lastScheduleBucket) return;

    // New daypart: refresh the gradient vars and let settings.js re-derive
    // the accent from the adjusted stops.
    lastScheduleBucket = bucket;
    renderBackgroundVisuals();
    reapply();
  }, SCHEDULE_TICK_MS);
}

// ---------------------------------------------------------------------------
// Panel UI
// ---------------------------------------------------------------------------

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function initBackgroundPanel() {
  const sourceToggle = document.querySelector("#backgroundSourceToggle");
  const presetsGrid = document.querySelector("#backgroundPresets");
  const typeToggle = document.querySelector("#backgroundTypeToggle");
  const slidersHost = document.querySelector("#backgroundSliders");
  const stopList = document.querySelector("#backgroundStopList");
  const addStopButton = document.querySelector("#backgroundAddStop");
  const removeStopButton = document.querySelector("#backgroundRemoveStop");
  const switchesHost = document.querySelector("#backgroundSwitches");
  const shareInput = document.querySelector("#backgroundShareInput");
  const shareApply = document.querySelector("#backgroundShareApply");
  const shareCopy = document.querySelector("#backgroundShareCopy");

  if (!sourceToggle || !presetsGrid) return () => {};

  const refreshers = [];

  // --- Source toggle (gradient | media) ---
  const sourceButtons = [...sourceToggle.querySelectorAll("[data-source]")];
  sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      set("background.source", button.dataset.source);
    });
  });
  refreshers.push(() => {
    const current = get("background.source");
    sourceButtons.forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.source === current));
    });
  });

  // --- Preset grid ---
  const presetButtons = GRADIENT_PRESETS.map((preset) => {
    const stops = preset.stops.map(([color, position]) => ({ color, position }));
    const button = el("button", "bg-preset", { type: "button" });
    button.style.setProperty(
      "--swatch",
      buildGradientValue({ type: preset.type, angle: preset.angle, stops }),
    );
    button.addEventListener("click", () => {
      update({
        "background.source": "gradient",
        "background.type": preset.type,
        "background.angle": preset.angle,
        "background.stops": stops,
      });
    });
    presetsGrid.appendChild(button);
    return { button, preset };
  });

  refreshers.push(() => {
    const names = tArray("background.presetNames");
    const current = get("background");
    const currentKey = JSON.stringify({
      t: current.type,
      a: current.angle,
      s: current.stops,
    });

    presetButtons.forEach(({ button, preset }, index) => {
      const presetKey = JSON.stringify({
        t: preset.type,
        a: preset.angle,
        s: preset.stops.map(([color, position]) => ({ color, position })),
      });
      button.setAttribute("aria-pressed", String(presetKey === currentKey));
      const name = names[preset.nameKey] ?? `#${index + 1}`;
      button.setAttribute("aria-label", name);
      button.title = name;
    });
  });

  // --- Style toggle (linear | radial | conic) ---
  const typeButtons = [...typeToggle.querySelectorAll("[data-type]")];
  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      set("background.type", button.dataset.type);
    });
  });
  refreshers.push(() => {
    const current = get("background.type");
    typeButtons.forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.type === current));
    });
  });

  // --- Sliders (angle + grain), range synced with a number input ---
  function addSlider({ path, labelKey }) {
    const [min, max] = RANGES[path];
    const row = el("div", "bg-row");
    const label = el("label", "bg-editor-label", { "data-i18n": labelKey });
    const range = el("input", "tp-range", { type: "range", min, max, step: 1 });
    const number = el("input", "tp-number", {
      type: "number",
      min,
      max,
      step: 1,
      "data-i18n-attr": `aria-label:${labelKey}`,
      "aria-label": t(labelKey),
    });
    const id = `bg-${path.replace(".", "-")}`;
    range.id = id;
    number.id = `${id}-number`;
    label.setAttribute("for", id);

    range.addEventListener("input", () => set(path, range.value));
    number.addEventListener("change", () => set(path, number.value));

    row.append(label, range, number);
    slidersHost.appendChild(row);

    refreshers.push(() => {
      const current = get(path);
      range.value = current;
      number.value = current;
    });
  }

  addSlider({ path: "background.angle", labelKey: "background.angle" });
  addSlider({ path: "background.grain", labelKey: "background.grain" });

  // --- Color stops editor ---
  function commitStops(mutator) {
    const stops = get("background.stops").map((stop) => ({ ...stop }));
    mutator(stops);
    set("background.stops", stops);
  }

  function makeStopRow() {
    const row = el("div", "bg-stop-row");
    const color = el("input", "bg-stop-color", {
      type: "color",
      "aria-label": t("background.stops"),
      "data-i18n-attr": "aria-label:background.stops",
    });
    const position = el("input", "tp-number", {
      type: "number",
      min: 0,
      max: 100,
      step: 1,
      "aria-label": t("background.stopPosition"),
      "data-i18n-attr": "aria-label:background.stopPosition",
    });
    const remove = el("button", "bg-stop-remove", {
      type: "button",
      "aria-label": t("common.delete"),
      "data-i18n-attr": "aria-label:common.delete",
    });
    remove.textContent = "×";

    color.addEventListener("change", () => {
      const index = [...stopList.children].indexOf(row);
      commitStops((stops) => {
        if (stops[index]) stops[index].color = color.value.toLowerCase();
      });
    });
    position.addEventListener("change", () => {
      const index = [...stopList.children].indexOf(row);
      commitStops((stops) => {
        if (stops[index]) stops[index].position = Number(position.value);
      });
    });
    remove.addEventListener("click", () => {
      const index = [...stopList.children].indexOf(row);
      const stops = get("background.stops");
      if (stops.length <= 2) return;
      commitStops((next) => next.splice(index, 1));
    });

    row.append(color, position, remove);
    return row;
  }

  // Reconcile rows with the saved stops (variable 2-4) without rebuilding
  // everything, so a native color picker stays open while other rows update.
  function syncStopRows() {
    const stops = get("background.stops");

    while (stopList.children.length > stops.length) {
      stopList.lastElementChild.remove();
    }
    while (stopList.children.length < stops.length) {
      stopList.appendChild(makeStopRow());
    }

    stops.forEach((stop, index) => {
      const row = stopList.children[index];
      const color = row.querySelector(".bg-stop-color");
      const position = row.querySelector(".tp-number");
      if (document.activeElement !== color) color.value = stop.color;
      if (document.activeElement !== position) position.value = stop.position;
    });

    addStopButton.disabled = stops.length >= 4;
    removeStopButton.disabled = stops.length <= 2;
  }
  refreshers.push(syncStopRows);

  addStopButton.addEventListener("click", () => {
    commitStops((stops) => {
      if (stops.length >= 4) return;
      const last = stops[stops.length - 1];
      const first = stops[0];
      stops.push({
        color: mixHex(first.color, last.color, 0.5),
        position: Math.min(100, Math.round(last.position) + 25),
      });
    });
  });

  removeStopButton.addEventListener("click", () => {
    const stops = get("background.stops");
    if (stops.length <= 2) return;
    commitStops((next) => next.pop());
  });

  // --- Switches (drift / schedule / auto contrast) ---
  function addSwitch({ path, labelKey, descKey }) {
    const row = el("div", "bg-switch-row");
    const text = el("div", "bg-switch-text");
    text.appendChild(el("strong", "", { "data-i18n": labelKey }));
    if (descKey) text.appendChild(el("span", "", { "data-i18n": descKey }));

    const switchLabel = el("label", "switch");
    const checkbox = el("input", "", {
      type: "checkbox",
      "data-i18n-attr": `aria-label:${labelKey}`,
    });
    checkbox.addEventListener("change", () => {
      set(path, checkbox.checked);
    });
    switchLabel.append(checkbox, el("span", "slider"));

    row.append(text, switchLabel);
    switchesHost.appendChild(row);

    refreshers.push(() => {
      checkbox.checked = get(path) === true;
    });
  }

  addSwitch({
    path: "background.drift",
    labelKey: "background.drift",
    descKey: "background.driftDescription",
  });
  addSwitch({
    path: "background.schedule",
    labelKey: "background.schedule",
    descKey: "background.scheduleDescription",
  });
  addSwitch({
    path: "background.autoContrast",
    labelKey: "background.autoContrast",
    descKey: "background.autoContrastDescription",
  });

  // --- Share code ---
  shareApply?.addEventListener("click", () => {
    const patch = decodeShareCode(shareInput.value);
    if (!patch) {
      showAlertDialog(t("background.share.invalid"), t("common.notice"));
      return;
    }
    update(patch);
    shareInput.value = "";
    showToast(t("background.share.applied"), { variant: "success" });
  });

  shareCopy?.addEventListener("click", async () => {
    const code = encodeShareCode(get("background"));
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error("clipboard unavailable");
      }
      showToast(t("background.share.copied"), { variant: "success" });
    } catch {
      // Fallback for contexts where the async clipboard API is blocked.
      try {
        const helper = el("textarea", "");
        helper.value = code;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
        showToast(t("background.share.copied"), { variant: "success" });
      } catch {
        showToast(t("background.share.copyFailed"), { variant: "error" });
      }
    }
  });

  // The panel controls are created after the document-wide applyI18n pass in
  // initI18n, so their data-i18n labels must be resolved here (theme.js does
  // the same for the theme panel).
  applyI18n(document.querySelector(".background-group") ?? document);
  refreshers.forEach((fn) => fn());

  // Re-run every refresher on settings changes / language changes.
  return () => refreshers.forEach((fn) => fn());
}

// RANGES is imported from settings.js for the slider ranges; nothing else
// needs mirroring here.

export function initBackground() {
  renderBackgroundVisuals();
  startScheduleTimer();
  const syncPanel = initBackgroundPanel();

  // Any settings change (panel, reset, another tab) re-renders the visuals
  // and syncs the panel controls.
  subscribe(() => {
    renderBackgroundVisuals();
    syncPanel();
  });
}
