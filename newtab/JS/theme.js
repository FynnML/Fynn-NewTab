import { get, update, reset, subscribe, RANGES } from "./settings.js";
import { t, tArray, applyI18n, onLanguageChange } from "./i18n/i18n.js";

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

  // Range slider synced with a small number input: the slider is for
  // sweeping, the number field for exact values. Both write through
  // settings.update, which clamps to RANGES, and both are refreshed
  // together so they can never drift apart.
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
    const numberWrap = el("div", "tp-number-wrap");
    const number = el("input", "tp-number", {
      type: "number",
      min,
      max,
      step: 1,
      "data-i18n-attr": `aria-label:${labelKey}`,
      "aria-label": t(labelKey),
    });
    numberWrap.append(number);
    if (unit) {
      const unitSpan = el("span", "tp-number-unit");
      unitSpan.textContent = unit;
      numberWrap.append(unitSpan);
    }
    const id = `tp-${path.replace(".", "-")}`;
    input.id = id;
    number.id = `${id}-number`;
    label.setAttribute("for", id);

    input.addEventListener("input", () => update({ [path]: input.value }));
    number.addEventListener("change", () => update({ [path]: number.value }));

    row.append(label, input, numberWrap);
    parent.appendChild(row);

    refreshers.push(() => {
      const current = get(path);
      input.value = current;
      number.value = current;
    });

    return { row, input, number };
  }

  function addSegmented(parent, { path, labelKey, options }) {
    const row = el("div", "tp-row tp-row--stack");
    const label = el("span", "tp-label", { "data-i18n": labelKey });
    // The visible label is removed for the mode row below, so the group must
    // carry its own accessible name (kept in sync with language changes by
    // the document-wide applyI18n pass).
    const group = el("div", "tp-segmented", {
      role: "radiogroup",
      "data-i18n-attr": `aria-label:${labelKey}`,
    });
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

  // Switch row bound to a two-value enum path (used for the accent source).
  function addToggle(parent, { path, labelKey, descKey, onValue, offValue }) {
    const row = el("div", "tp-row tp-row--toggle");
    const text = el("div", "tp-toggle-text");
    text.appendChild(el("strong", "tp-label", { "data-i18n": labelKey }));
    if (descKey) text.appendChild(el("span", "tp-toggle-desc", { "data-i18n": descKey }));

    const switchLabel = el("label", "switch");
    const checkbox = el("input", "", {
      type: "checkbox",
      "data-i18n-attr": `aria-label:${labelKey}`,
      "aria-label": t(labelKey),
    });
    checkbox.addEventListener("change", () => {
      update({ [path]: checkbox.checked ? onValue : offValue });
    });
    switchLabel.append(checkbox, el("span", "slider"));

    row.append(text, switchLabel);
    parent.appendChild(row);

    refreshers.push(() => {
      checkbox.checked = get(path) === onValue;
    });

    return checkbox;
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

  // Explain what the mode affects so the Light option is not mistaken for
  // a full-page theme (the wallpaper screen keeps its cinematic look).
  modeSection.appendChild(el("p", "tp-desc", { "data-i18n": "theme.mode.description" }));

  const accentSection = section("theme.accent.title");

  // "Accent follows gradient": when on, the accent color is derived from the
  // background gradient (see settings.js apply) and the manual sliders are
  // dimmed/disabled. Clicking a preset swatch switches back to manual.
  addToggle(accentSection, {
    path: "theme.accentSource",
    labelKey: "theme.accentSource.title",
    descKey: "theme.accentSource.description",
    onValue: "gradient",
    offValue: "manual",
  });

  const presets = el("div", "tp-presets", {
    role: "group",
    "data-i18n-attr": "aria-label:theme.accent.presets",
  });
  const presetButtons = ACCENT_PRESETS.map(([h, s, l], index) => {
    const button = el("button", "tp-preset", { type: "button" });
    button.style.setProperty("--swatch", `hsl(${h} ${s}% ${l}%)`);
    button.addEventListener("click", () =>
      update({
        "theme.accentSource": "manual",
        "theme.hue": h,
        "theme.saturation": s,
        "theme.lightness": l,
      }),
    );
    presets.appendChild(button);
    return { button, h, s, l, index };
  });
  accentSection.appendChild(presets);

  const hueSlider = addSlider(accentSection, {
    path: "theme.hue",
    labelKey: "theme.accent.hue",
    unit: "°",
    extraClass: "tp-range--hue",
  });
  const saturationSlider = addSlider(accentSection, {
    path: "theme.saturation",
    labelKey: "theme.accent.saturation",
    unit: "%",
  });
  const lightnessSlider = addSlider(accentSection, {
    path: "theme.lightness",
    labelKey: "theme.accent.lightness",
    unit: "%",
  });

  const accentSliders = [hueSlider, saturationSlider, lightnessSlider];

  refreshers.push(() => {
    const names = tArray("theme.accent.names");
    presetButtons.forEach(({ button, h, s, l, index }) => {
      const active =
        get("theme.hue") === h && get("theme.saturation") === s && get("theme.lightness") === l;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", names[index] ?? `#${index + 1}`);
      button.title = names[index] ?? "";
    });

    // Dim + disable the manual sliders while the accent follows the gradient.
    const gradientAccent = get("theme.accentSource") === "gradient";
    accentSliders.forEach(({ row, input, number }) => {
      input.disabled = gradientAccent;
      number.disabled = gradientAccent;
      row.classList.toggle("tp-row--disabled", gradientAccent);
    });
    presets.classList.toggle("tp-presets--active", !gradientAccent);
  });

  const headerSection = section("theme.header.title");
  addSlider(headerSection, { path: "header.clockSize", labelKey: "theme.header.clockSize", unit: "%" });

  const wallpaperSection = section("theme.wallpaper.title");
  addSlider(wallpaperSection, { path: "wallpaper.blur", labelKey: "theme.wallpaper.blur", unit: "px" });
  addSlider(wallpaperSection, { path: "wallpaper.brightness", labelKey: "theme.wallpaper.brightness", unit: "%" });
  addSlider(wallpaperSection, { path: "wallpaper.grayscale", labelKey: "theme.wallpaper.grayscale", unit: "%" });
  addSlider(wallpaperSection, { path: "wallpaper.overlay", labelKey: "theme.wallpaper.overlay", unit: "%" });

  const resetButton = el("button", "tp-reset", { type: "button", "data-i18n": "theme.reset" });
  resetButton.addEventListener("click", () => reset());

  container.append(modeSection, accentSection, headerSection, wallpaperSection, resetButton);

  const sync = () => refreshers.forEach((fn) => fn());

  applyI18n(container);
  sync();

  subscribe(sync);
  onLanguageChange(sync);
}
