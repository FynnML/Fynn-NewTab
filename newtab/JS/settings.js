// settings.js — nguồn dữ liệu duy nhất cho mọi tùy chỉnh giao diện.
// Lưu trong localStorage (key `fynn-settings`) và áp dụng bằng CSS variables / data-attribute,
// nên đổi giá trị là thấy ngay, không cần render lại DOM.

const STORAGE_KEY = 'fynn-settings';
const VERSION = 1;

export const DEFAULTS = {
  version: VERSION,
  theme: { mode: 'dark', hue: 210, saturation: 85, lightness: 60 },
  header: { align: 'center', clockSize: 100 }, // clockSize: %
  wallpaper: { blur: 0, brightness: 100, grayscale: 0 },
};

// Whitelist: chỉ những path này mới được ghi. Giá trị sai sẽ bị từ chối / về mặc định.
export const RANGES = {
  'theme.hue': [0, 360],
  'theme.saturation': [0, 100],
  'theme.lightness': [25, 80],
  'header.clockSize': [60, 160],
  'wallpaper.blur': [0, 20],
  'wallpaper.brightness': [40, 120],
  'wallpaper.grayscale': [0, 100],
};

export const ENUMS = {
  'theme.mode': ['dark', 'light', 'auto'],
  'header.align': ['left', 'center', 'right'],
};

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();
let state = load();
let saveTimer = 0;
let started = false;

/* ---------- helpers ---------- */

// Dùng function declaration (được hoist) vì `let state = load()` ở trên chạy trước dòng này.
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

// Gộp dữ liệu đã lưu với mặc định: khóa mới thêm ở bản sau sẽ tự có giá trị mặc định.
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
  return normalize(merge(DEFAULTS, saved));
}

function save() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* hết quota hoặc bị chặn: bỏ qua, giao diện vẫn hoạt động trong phiên này */
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 150);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

/* ---------- áp dụng lên giao diện ---------- */

function apply() {
  const root = document.documentElement;
  const { theme, header, wallpaper } = state;

  const resolved = theme.mode === 'auto' ? (mq.matches ? 'dark' : 'light') : theme.mode;
  root.dataset.theme = resolved;

  root.style.setProperty('--accent-h', String(theme.hue));
  root.style.setProperty('--accent-s', `${theme.saturation}%`);
  root.style.setProperty('--accent-l', `${theme.lightness}%`);
  root.style.setProperty('--accent', `hsl(${theme.hue} ${theme.saturation}% ${theme.lightness}%)`);

  root.dataset.headerAlign = header.align;
  root.style.setProperty('--clock-scale', String(header.clockSize / 100));

  root.style.setProperty(
    '--wallpaper-filter',
    `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness}%) grayscale(${wallpaper.grayscale}%)`
  );
  // Phóng nhẹ khi blur để viền ảnh không bị lộ nền trong suốt.
  root.style.setProperty('--wallpaper-scale', wallpaper.blur > 0 ? '1.06' : '1');
}

/* ---------- API công khai ---------- */

export const get = (path) => getIn(state, path);

// Ghi nhiều giá trị cùng lúc: { 'theme.hue': 18, 'theme.saturation': 90 }
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

// Gọi sớm nhất có thể trong app.js để tránh nháy giao diện lúc mở tab.
export function initSettings() {
  if (started) return;
  started = true;
  apply();

  mq.addEventListener('change', () => {
    if (state.theme.mode === 'auto') apply();
  });

  // Đồng bộ giữa các tab New Tab đang mở.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    apply();
    notify();
  });

  window.addEventListener('pagehide', save);
}