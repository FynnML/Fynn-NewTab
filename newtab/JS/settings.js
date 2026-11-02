const STORAGE_KEY = 'fynn-settings';
const LEGACY_OVERLAY_KEY = 'fynn-overlay-strength'; // pre-1.1.2 location
const VERSION = 2;

export const DEFAULTS = {
  version: VERSION,
  theme: { mode: 'dark', hue: 210, saturation: 85, lightness: 60 },
  header: { clockSize: 100 }, // clockSize: %
  wallpaper: { blur: 0, brightness: 100, grayscale: 0, overlay: 100 }, // overlay: %
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
};

export const ENUMS = {
  'theme.mode': ['dark', 'light', 'auto'],
};

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

function sanitize(path, value) {
  if (path in RANGES) {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const [min, max] = RANGES[path];
    return Math.round(Math.min(max, Math.max(min, n)));
  }
  if (path in ENUMS) return ENUMS[path].includes(value) ? value : undefined;
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
      out[key] = typeof s[key] === typeof base[key] ? s[key] : base[key];
    }
  }
  return out;
}

function normalize(s) {
  for (const path of [...Object.keys(RANGES), ...Object.keys(ENUMS)]) {
    const clean = sanitize(path, getIn(s, path));
    setIn(s, path, clean === undefined ? getIn(DEFAULTS, path) : clean);
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

  return normalize(merge(DEFAULTS, saved));
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

// Convert HSL to RGB so accent contrast can be computed (h: 0-360, s/l: 0-100).
function hslToRgb(h, s, l) {
  const hn = ((h % 360) + 360) % 360;
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => {
    const k = (n + hn / 30) % 12;
    return ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Pick black or white text so it stays readable on top of the accent color.
function accentContrastFor(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  const yiq = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return yiq > 0.55 ? '#0a0a0a' : '#ffffff';
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
  root.style.setProperty('--accent-contrast', accentContrastFor(hue, saturation, lightness));
}

function apply() {
  const root = document.documentElement;
  const { theme, header, wallpaper } = state;

  const resolved = theme.mode === 'auto' ? (mq.matches ? 'dark' : 'light') : theme.mode;
  root.dataset.theme = resolved;

  applyAccent(root, theme);

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