// color.js — pure color helpers shared by settings.js, background.js and
// theme.js. No DOM, no settings access: everything takes its inputs as
// arguments so every function here is trivially testable.
//
// Contents:
//   - hex <-> rgb <-> hsl conversions
//   - WCAG relative luminance + readable-text picking
//   - hex mixing
//   - gradient CSS composition (linear / radial / conic)
//   - position-weighted luminance of gradient stops (auto contrast)
//   - accent derivation from gradient stops
//   - time-of-day stop adjustment ("schedule" option)

// Strict 6-digit hex. 3-digit shorthand is intentionally rejected so saved
// settings and share codes stay unambiguous.
export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

// Convert HSL to RGB (h: 0-360, s/l: 0-100) -> [r, g, b] (0-255).
export function hslToRgb(h, s, l) {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => {
    const k = (n + hn / 30) % 12;
    return ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Convert RGB (0-255 each) -> [h, s, l] with h: 0-360, s/l: 0-100.
export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const ln = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(ln * 100)];

  const d = max - min;
  const sn = ln > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hn;
  if (max === rn) hn = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) hn = (bn - rn) / d + 2;
  else hn = (rn - gn) / d + 4;

  return [
    Math.round((((hn * 60) % 360) + 360) % 360),
    Math.round(sn * 100),
    Math.round(ln * 100),
  ];
}

// Returns [r, g, b] or null when the value is not a strict 6-digit hex.
export function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  const trimmed = hex.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return null;
  const n = parseInt(trimmed.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  return `#${[r, g, b]
    .map((v) => clamp(v).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// WCAG 2.x relative luminance: 0 = black, 1 = white.
export function relativeLuminance(r, g, b) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Pick black or white text so it stays readable on top of the given color.
// (Same yiq threshold the accent contrast always used in settings.js.)
export function contrastTextFor(r, g, b) {
  const yiq = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return yiq > 0.55 ? "#0a0a0a" : "#ffffff";
}

// Linear interpolation between two hex colors; t = 0 returns a, t = 1 b.
export function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return a ? hexA : b ? hexB : "#000000";
  const mixed = a.map((v, i) => v + (b[i] - v) * t);
  return rgbToHex(mixed[0], mixed[1], mixed[2]);
}

// ---------------------------------------------------------------------------
// Gradient composition
// ---------------------------------------------------------------------------

// position-weighted average WCAG luminance of gradient stops (0..1).
// Weight grows with the stop position so the bottom of the screen — where
// text and the overlay are strongest — counts a little more.
export function stopsLuminance(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return 0;
  let weighted = 0;
  let total = 0;
  for (const stop of stops) {
    if (!stop || typeof stop.color !== "string") continue;
    const rgb = hexToRgb(stop.color);
    if (!rgb) continue;
    const weight = 1 + (Number(stop.position) || 0) / 100;
    weighted += relativeLuminance(rgb[0], rgb[1], rgb[2]) * weight;
    total += weight;
  }
  return total > 0 ? weighted / total : 0;
}

// Build the CSS value for --bg-gradient from a background config.
export function buildGradientValue({ type, angle, stops }) {
  const parts = (Array.isArray(stops) ? stops : [])
    .filter((stop) => stop && hexToRgb(stop.color))
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((stop) => `${stop.color} ${Number(stop.position) || 0}%`)
    .join(", ");

  if (!parts) return "linear-gradient(135deg, #1e3a8a, #db2777)";

  if (type === "radial") {
    return `radial-gradient(circle at 50% 42%, ${parts})`;
  }
  if (type === "conic") {
    return `conic-gradient(from ${Number(angle) || 0}deg at 50% 50%, ${parts})`;
  }
  return `linear-gradient(${Number(angle) || 0}deg, ${parts})`;
}

// Derive an accent color ({hue, saturation, lightness}) from gradient stops:
// average the stop colors in RGB, then nudge saturation/lightness into the
// range the accent system was designed for (matches the manual presets).
export function deriveAccentFromStops(stops) {
  const valid = (Array.isArray(stops) ? stops : []).filter(
    (stop) => stop && hexToRgb(stop.color),
  );

  if (valid.length === 0) return { hue: 210, saturation: 85, lightness: 60 };

  let r = 0;
  let g = 0;
  let b = 0;
  for (const stop of valid) {
    const [sr, sg, sb] = hexToRgb(stop.color);
    r += sr;
    g += sg;
    b += sb;
  }
  const [h, s, l] = rgbToHsl(r / valid.length, g / valid.length, b / valid.length);

  return {
    hue: h,
    saturation: Math.min(85, Math.max(45, s)),
    lightness: Math.min(65, Math.max(40, l)),
  };
}

// ---------------------------------------------------------------------------
// Time-of-day schedule ("lịch theo giờ")
// ---------------------------------------------------------------------------

// Daypart buckets. Kept coarse (4 buckets) so the gradient visibly shifts a
// few times a day instead of crawling every minute.
export const SCHEDULE_BUCKETS = ["morning", "day", "evening", "night"];

export function scheduleBucketForHour(hour) {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const SCHEDULE_ADJUSTMENTS = {
  //          hue  sat  light
  morning: [-10, -5, 8],
  day: [0, 0, 0],
  evening: [18, -5, -4],
  night: [-12, -15, -12],
};

function adjustStopColor(hex, [dh, ds, dl]) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return hslToHex(h + dh, Math.min(100, Math.max(0, s + ds)), Math.min(100, Math.max(0, l + dl)));
}

// Shift the gradient stops for the given hour when the schedule is on.
export function adjustStopsForHour(stops, hour) {
  const adjustment = SCHEDULE_ADJUSTMENTS[scheduleBucketForHour(hour)];
  if (!adjustment || (adjustment[0] === 0 && adjustment[1] === 0 && adjustment[2] === 0)) {
    return Array.isArray(stops) ? stops.map((stop) => ({ ...stop })) : [];
  }
  return (Array.isArray(stops) ? stops : []).map((stop) => ({
    ...stop,
    color: adjustStopColor(stop.color, adjustment),
  }));
}

// The stops actually rendered right now: schedule-aware. settings.js (accent
// derivation) and background.js (gradient render) both use this so the accent
// always matches what is on screen.
export function effectiveStops(background, date = new Date()) {
  const stops = background?.stops;
  if (!Array.isArray(stops) || stops.length === 0) return [];
  if (!background.schedule) return stops.map((stop) => ({ ...stop }));
  return adjustStopsForHour(stops, date.getHours());
}
