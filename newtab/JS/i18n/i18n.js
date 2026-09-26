/**
 * i18n.js — Hệ thống đa ngôn ngữ cho Fynn New Tab.
 */

import { en } from "./locales/en.js";
import { vi } from "./locales/vi.js";
import { zh } from "./locales/zh.js";

const LANGUAGE_KEY = "fynn-language";
const DEFAULT_LANGUAGE = "en";
const FALLBACK_LANGUAGE = "en";

const LOCALES = { en, vi, zh };
const VALID_LANGUAGES = Object.keys(LOCALES);

const isValidLanguage = (lang) => VALID_LANGUAGES.includes(lang);

// --- Storage adapter (fix #4: localStorage có thể throw) ---
const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* bỏ qua */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
  },
};

function detectBrowserLanguage() {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const code = String(raw || "").toLowerCase().split("-")[0];
    if (isValidLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

export function getLanguage() {
  const saved = storage.get(LANGUAGE_KEY);
  return isValidLanguage(saved) ? saved : detectBrowserLanguage();
}

let currentLanguage = getLanguage();

// --- Lookup helpers ---
function resolve(locale, key) {
  return key
    .split(".")
    .reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), locale);
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

export function t(key, params) {
  const hasCount = params && typeof params.count === "number";
  let candidates = [key];

  if (hasCount) {
    const rule = new Intl.PluralRules(currentLanguage).select(params.count);
    const fbRule = new Intl.PluralRules(FALLBACK_LANGUAGE).select(params.count);
    candidates = [
      `${key}.${rule}`,
      `${key}.other`,
      `${key}.${fbRule}`,
      `${key}`,
    ];
  }

  const localesToTry =
    currentLanguage === FALLBACK_LANGUAGE
      ? [LOCALES[currentLanguage]]
      : [LOCALES[currentLanguage], LOCALES[FALLBACK_LANGUAGE]];

  let value;
  for (const locale of localesToTry) {
    for (const k of candidates) {
      const v = resolve(locale, k);
      if (typeof v === "string") { value = v; break; }
    }
    if (value !== undefined) break;
  }

  if (value === undefined) {
    console.warn(`i18n: thiếu bản dịch cho key "${key}"`);
    return key;
  }

  return interpolate(value, params);
}

/** Fix #2: tArray luôn trả array; t() không còn lộ mảng/object ra ngoài. */
export function tArray(key) {
  const v = resolve(LOCALES[currentLanguage], key) ?? resolve(LOCALES[FALLBACK_LANGUAGE], key);
  if (Array.isArray(v)) return v;
  console.warn(`i18n: key "${key}" không phải mảng`);
  return [];
}

/** Nếu sau này cần object (vd. search.engines cho dropdown động). */
export function tObject(key) {
  const v = resolve(LOCALES[currentLanguage], key) ?? resolve(LOCALES[FALLBACK_LANGUAGE], key);
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

// --- Settings API ---
export function setLanguage(lang) {
  if (!isValidLanguage(lang) || lang === currentLanguage) return;
  currentLanguage = lang;
  storage.set(LANGUAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent("fynn-language-change", { detail: { language: lang } }));
}

export function resetLanguage() {
  storage.remove(LANGUAGE_KEY);
  const next = detectBrowserLanguage();
  if (next === currentLanguage) return;
  currentLanguage = next;
  window.dispatchEvent(new CustomEvent("fynn-language-change", { detail: { language: next } }));
}

export function onLanguageChange(fn) {
  window.addEventListener("fynn-language-change", fn);
  return () => window.removeEventListener("fynn-language-change", fn);
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    // định dạng: "placeholder:settings.search.customEngineUrlPlaceholder"
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

// --- Init ---
export function initI18n() {
  document.documentElement.lang = currentLanguage;
  applyI18n(); // re-render toàn bộ phần static

  onLanguageChange((event) => {
    document.documentElement.lang = event.detail.language;
    applyI18n(); // re-render toàn bộ phần static
  });

  window.addEventListener("storage", (e) => {
    if (e.key !== LANGUAGE_KEY) return;
    const next = isValidLanguage(e.newValue) ? e.newValue : detectBrowserLanguage();
    if (next === currentLanguage) return;
    currentLanguage = next;
    window.dispatchEvent(new CustomEvent("fynn-language-change", { detail: { language: next } }));
  });
}