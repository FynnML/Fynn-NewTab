import {
  HEX_COLOR_RE,
  hslToRgb,
  hslToHex,
  contrastTextFor,
  deriveAccentFromStops,
  effectiveStops,
} from "./color.js";

const STORAGE_KEY = 'fynn-settings';
const LEGACY_OVERLAY_KEY = 'fynn-overlay-strength'; // pre-1.1.2 location
const VERSION = 3;

export const DEFAULTS = {
  version: VERSION,
  theme: {
    mode: 'dark',
    hue: 210,
    saturation: 85,
    lightness: 60,
    // 'manual' = the HSL sliders below; 'gradient' = derived from the
    // background gradient so the UI matches the configured background.
    accentSource: 'manual',
  },
  header: { clockSize: 100 }, // clockSize: %
  wallpaper: { blur: 0, brightness: 100, grayscale: 0, overlay: 100 }, // overlay: %
  // Gradient background. Lives in settings (localStorage, NOT IndexedDB) so
  // backup/export carries it automatically, and switching source to 'media'
  // keeps the whole existing wallpaper system untouched.
  background: {
    source: 'media', // 'gradient' | 'media'
    type: 'linear', // 'linear' | 'radial' | 'conic'
    angle: 135, // deg, used by linear (direction) and conic (start)
    stops: [
      { color: '#1e3a8a', position: 0 },
      { color: '#7c3aed', position: 55 },
      { color: '#db2777', position: 100 },
    ],
    grain: 0, // 0-100 noise overlay strength
    drift: false, // slow pan animation
    schedule: false, // time-of-day color shifts (morning/day/evening/night)
    autoContrast: true, // scale the overlay so text stays readable
  },
};

export const RANGES = {
  'theme.hue': [0, 360],
  'theme.saturation': [0, 100],
  'theme.lightness': [25, 80],
  'header.clockSize': [60, 160],
  'wallpaper.blur': [0, 20],
  'wallpaper.brightness': [40, 120],
  'wallpaper.grayscale': [0, 100],
  'wallpaper.overlay': [75, 180],
  'background.angle': [0, 360],
  'background.grain': [0, 100],
};

export const ENUMS = {
  'theme.mode': ['dark', 'light', 'auto'],
  'theme.accentSource': ['manual', 'gradient'],
  'background.source': ['gradient', 'media'],
  'background.type': ['linear', 'radial', 'conic'],
};

export const BOOLEANS = new Set([
  'background.drift',
  'background.schedule',
  'background.autoContrast',
]);

const STOPS_PATH = 'background.stops';
const STOPS_MIN = 2;
const STOPS_MAX = 4;

const SANITIZED_PATHS = [
  ...Object.keys(RANGES),
  ...Object.keys(ENUMS),
  ...BOOLEANS,
  STOPS_PATH,
];

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();
let state = load();
let saveTimer = 0;
let started = false;

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function getIn(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setIn(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

// Color stops: an array of {color: '#rrggbb', position: 0-100}. Entries that
// are not valid are dropped, positions are clamped, and the result is sorted
// by position so the rendered gradient is always well-formed. Fewer than 2
// valid stops means the whole value is rejected (the default is kept).
function sanitizeStops(value) {
  if (!Array.isArray(value)) return undefined;
  const cleaned = [];
  for (const entry of value) {
    if (cleaned.length >= STOPS_MAX) break;
    const color =
      isObject(entry) &&
      typeof entry.color === 'string' &&
      HEX_COLOR_RE.test(entry.color.trim())
        ? entry.color.trim().toLowerCase()
        : null;
    const position = Number(isObject(entry) ? entry.position : NaN);
    if (!color || !Number.isFinite(position)) continue;
    cleaned.push({
      color,
      position: Math.round(Math.min(100, Math.max(0, position))),
    });
  }
  if (cleaned.length < STOPS_MIN) return undefined;
  cleaned.sort((a, b) => a.position - b.position);
  return cleaned;
}

function sanitize(path, value) {
  if (path in RANGES) {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const [min, max] = RANGES[path];
    return Math.round(Math.min(max, Math.max(min, n)));
  }
  if (path in ENUMS) return ENUMS[path].includes(value) ? value : undefined;
  if (BOOLEANS.has(path)) return typeof value === 'boolean' ? value : undefined;
  if (path === STOPS_PATH) return sanitizeStops(value);
  return undefined; // path không có trong whitelist
}

function merge(base, saved) {
  if (!isObject(base)) return base;
  const s = isObject(saved) ? saved : {};
  const out = {};
  for (const key of Object.keys(base)) {
    if (isObject(base[key])) {
      out[key] = merge(base[key], isObject(s[key]) ? s[key] : {});
    } else {
      // NOTE: arrays (background.stops) pass through here unchecked because
      // typeof array === typeof array. They are re-validated in normalize().
      out[key] = typeof s[key] === typeof base[key] ? s[key] : base[key];
    }
  }
  return out;
}

// Deep-ish copy of a default value: stops need a fresh array of fresh objects
// so state mutations can never corrupt DEFAULTS.
function cloneDefault(path) {
  const value = getIn(DEFAULTS, path);
  return Array.isArray(value) ? value.map((entry) => ({ ...entry })) : value;
}

function normalize(s) {
  for (const path of SANITIZED_PATHS) {
    const clean = sanitize(path, getIn(s, path));
    setIn(s, path, clean === undefined ? cloneDefault(path) : clean);
  }
  s.version = VERSION;
  return s;
}

function load() {
  let saved = {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isObject(raw)) saved = raw;
  } catch {
    saved = {};
  }

  // One-time migration: overlay strength used to live in its own key (<= 1.1.1).
  if (!isObject(saved.wallpaper) || typeof saved.wallpaper.overlay !== 'number') {
    const legacy = Number(localStorage.getItem(LEGACY_OVERLAY_KEY));
    if (Number.isFinite(legacy) && legacy > 0) {
      saved.wallpaper = isObject(saved.wallpaper) ? saved.wallpaper : {};
      saved.wallpaper.overlay = legacy;
    }
  }
  localStorage.removeItem(LEGACY_OVERLAY_KEY);

  // Migration v2 -> v3 (1.1.5 -> 1.2.0): the background group is new and has
  // nothing to convert. Seed a starter gradient derived from the user's
  // accent hue so flipping the source to "gradient" already looks personal.
  // New users (no saved settings at all) simply get DEFAULTS.
  if ((Number(saved.version) || 2) < VERSION && !isObject(saved.background)) {
    const hue = isObject(saved.theme) ? Number(saved.theme.hue) : NaN;
    if (Number.isFinite(hue)) {
      saved.background = {
        stops: [
          { color: hslToHex(hue, 68, 58), position: 0 },
          { color: hslToHex((hue + 45) % 360, 72, 30), position: 100 },
        ],
      };
    }
  }

  const normalized = normalize(merge(DEFAULTS, saved));

  // Persist immediately when normalization changed something (migrations,
  // hand-edited/garbage values): otherwise the fixed state would only be
  // written on the next settings change or pagehide. Compare-then-write keeps
  // this a no-op for already-clean states so multi-tab storage events stay quiet.
  try {
    const serialized = JSON.stringify(normalized);
    if (serialized !== localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
  }

  return normalized;
}

function save() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 150);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

function applyAccent(root, { hue, saturation, lightness }) {
  // The whole accent family is derived from a single source so Active,
  // Selected, Focus and Slider states always follow the chosen color.
  root.style.setProperty('--accent-h', String(hue));
  root.style.setProperty('--accent-s', `${saturation}%`);
  root.style.setProperty('--accent-l', `${lightness}%`);
  root.style.setProperty('--accent', `hsl(${hue} ${saturation}% ${lightness}%)`);
  root.style.setProperty('--accent-subtle', `hsl(${hue} ${saturation}% ${lightness}% / 0.16)`);
  root.style.setProperty('--accent-border', `hsl(${hue} ${saturation}% ${lightness}% / 0.45)`);
  root.style.setProperty('--accent-contrast', contrastTextFor(...hslToRgb(hue, saturation, lightness)));
}

function apply() {
  const root = document.documentElement;
  const { theme, header, wallpaper, background } = state;

  const resolved = theme.mode === 'auto' ? (mq.matches ? 'dark' : 'light') : theme.mode;
  root.dataset.theme = resolved;

  // Which background layer owns the screen. The gradient visuals themselves
  // (--bg-gradient, grain, auto contrast) are rendered by background.js.
  root.dataset.bgSource = background.source;
  root.dataset.bgDrift =
    background.source === 'gradient' && background.drift ? 'on' : 'off';

  // Accent: manual HSL, or derived from the (schedule-aware) gradient stops
  // so the UI always matches the background the user configured.
  const accent =
    theme.accentSource === 'gradient'
      ? deriveAccentFromStops(effectiveStops(background))
      : theme;
  applyAccent(root, accent);

  root.style.setProperty('--clock-scale', String(header.clockSize / 100));

  root.style.setProperty(
    '--wallpaper-filter',
    `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness}%) grayscale(${wallpaper.grayscale}%)`
  );
  root.style.setProperty('--wallpaper-scale', wallpaper.blur > 0 ? '1.06' : '1');

  root.style.setProperty('--overlay-strength', String(wallpaper.overlay / 100));
}

export const get = (path) => getIn(state, path);

export function update(patch) {
  let changed = false;
  for (const [path, raw] of Object.entries(patch)) {
    const value = sanitize(path, raw);
    if (value === undefined || getIn(state, path) === value) continue;
    setIn(state, path, value);
    changed = true;
  }
  if (!changed) return;
  apply();
  scheduleSave();
  notify();
}

export const set = (path, value) => update({ [path]: value });

export function reset() {
  state = normalize(merge(DEFAULTS, {}));
  apply();
  save();
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Re-run apply() without saving/notifying. Used by background.js when the
// time-of-day schedule bucket changes so the derived accent follows along.
export function reapply() {
  apply();
}

export function initSettings() {
  if (started) return;
  started = true;
  apply();

  mq.addEventListener('change', () => {
    if (state.theme.mode === 'auto') apply();
  });

  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    apply();
    notify();
  });

  window.addEventListener('pagehide', save);
}
