import { get, update, reset, subscribe, RANGES } from "./settings.js";
import { tArray, applyI18n, onLanguageChange } from "./i18n/i18n.js";

const ACCENT_PRESETS = [
  [210, 85, 60],
  [265, 70, 65],
  [330, 75, 65],
  [0, 75, 60],
  [28, 90, 58],
  [145, 60, 50],
  [175, 65, 45],
];

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function section(titleKey) {
  const wrap = el("div", "tp-section");
  const title = el("h3", "tp-title", { "data-i18n": titleKey });
  wrap.appendChild(title);
  return wrap;
}

export function initThemePanel(container) {
  if (!container) return;
  container.textContent = "";

  const refreshers = [];

  function addSlider(parent, { path, labelKey, unit = "", extraClass = "" }) {
    const [min, max] = RANGES[path];
    const row = el("div", "tp-row");
    const label = el("label", "tp-label", { "data-i18n": labelKey });
    const input = el("input", `tp-range ${extraClass}`.trim(), {
      type: "range",
      min,
      max,
      step: 1,
    });
    const value = el("span", "tp-value");
    const id = `tp-${path.replace(".", "-")}`;
    input.id = id;
    label.setAttribute("for", id);

    input.addEventListener("input", () => update({ [path]: input.value }));

    row.append(label, input, value);
    parent.appendChild(row);

    refreshers.push(() => {
      const current = get(path);
      input.value = current;
      value.textContent = `${current}${unit}`;
    });
  }

  function addSegmented(parent, { path, labelKey, options }) {
    const row = el("div", "tp-row tp-row--stack");
    const label = el("span", "tp-label", { "data-i18n": labelKey });
    const group = el("div", "tp-segmented", { role: "radiogroup" });
    const buttons = options.map(({ value, key }) => {
      const button = el("button", "tp-seg", {
        type: "button",
        role: "radio",
        "data-i18n": key,
      });
      button.addEventListener("click", () => update({ [path]: value }));
      group.appendChild(button);
      return { button, value };
    });
    row.append(label, group);
    parent.appendChild(row);

    refreshers.push(() => {
      const current = get(path);
      buttons.forEach(({ button, value }) => {
        button.setAttribute("aria-checked", String(value === current));
      });
    });
  }

  const modeSection = section("theme.mode.title");
  addSegmented(modeSection, {
    path: "theme.mode",
    labelKey: "theme.mode.title",
    options: [
      { value: "dark", key: "theme.mode.dark" },
      { value: "light", key: "theme.mode.light" },
      { value: "auto", key: "theme.mode.auto" },
    ],
  });
  modeSection.querySelector(".tp-row .tp-label").remove();

  const accentSection = section("theme.accent.title");

  const presets = el("div", "tp-presets", {
    role: "group",
    "data-i18n-attr": "aria-label:theme.accent.presets",
  });
  const presetButtons = ACCENT_PRESETS.map(([h, s, l], index) => {
    const button = el("button", "tp-preset", { type: "button" });
    button.style.setProperty("--swatch", `hsl(${h} ${s}% ${l}%)`);
    button.addEventListener("click", () =>
      update({ "theme.hue": h, "theme.saturation": s, "theme.lightness": l }),
    );
    presets.appendChild(button);
    return { button, h, s, l, index };
  });
  accentSection.appendChild(presets);

  addSlider(accentSection, {
    path: "theme.hue",
    labelKey: "theme.accent.hue",
    unit: "°",
    extraClass: "tp-range--hue",
  });
  addSlider(accentSection, { path: "theme.saturation", labelKey: "theme.accent.saturation", unit: "%" });
  addSlider(accentSection, { path: "theme.lightness", labelKey: "theme.accent.lightness", unit: "%" });

  refreshers.push(() => {
    const names = tArray("theme.accent.names");
    presetButtons.forEach(({ button, h, s, l, index }) => {
      const active =
        get("theme.hue") === h && get("theme.saturation") === s && get("theme.lightness") === l;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", names[index] ?? `#${index + 1}`);
      button.title = names[index] ?? "";
    });
  });

  const headerSection = section("theme.header.title");
  addSlider(headerSection, { path: "header.clockSize", labelKey: "theme.header.clockSize", unit: "%" });

  const wallpaperSection = section("theme.wallpaper.title");
  addSlider(wallpaperSection, { path: "wallpaper.blur", labelKey: "theme.wallpaper.blur", unit: "px" });
  addSlider(wallpaperSection, { path: "wallpaper.brightness", labelKey: "theme.wallpaper.brightness", unit: "%" });
  addSlider(wallpaperSection, { path: "wallpaper.grayscale", labelKey: "theme.wallpaper.grayscale", unit: "%" });

  const resetButton = el("button", "tp-reset", { type: "button", "data-i18n": "theme.reset" });
  resetButton.addEventListener("click", () => reset());

  container.append(modeSection, accentSection, headerSection, wallpaperSection, resetButton);

  const sync = () => refreshers.forEach((fn) => fn());

  applyI18n(container);
  sync();

  subscribe(sync);
  onLanguageChange(sync);
}
