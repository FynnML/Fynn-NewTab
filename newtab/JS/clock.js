/**
 * clock.js — Clock + Date widget.
 * Owns the 12h/24h setting (saved in LocalStorage).
 */

import { getLanguage, onLanguageChange } from "./i18n/i18n.js";

const TIME_FORMAT_KEY = "fynn-time-format";
const DEFAULT_TIME_FORMAT = "12h";
const VALID_TIME_FORMATS = ["12h", "24h"];

const clockElement = document.querySelector("#clock");
const dateElement = document.querySelector("#date");

function loadTimeFormat() {
  const saved = localStorage.getItem(TIME_FORMAT_KEY);
  return VALID_TIME_FORMATS.includes(saved) ? saved : DEFAULT_TIME_FORMAT;
}

let timeFormat = loadTimeFormat();

function updateClock() {
  const now = new Date();

  const time = now.toLocaleTimeString(getLanguage(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });

  const date = now.toLocaleDateString(getLanguage(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  clockElement.innerHTML = time
    .replace("AM", "<span>AM</span>")
    .replace("PM", "<span>PM</span>");

  dateElement.textContent = date;
}

// --- Settings API (used by the dashboard's Settings tab) ---

export function getTimeFormat() {
  return timeFormat;
}

export function setTimeFormat(format) {
  if (!VALID_TIME_FORMATS.includes(format)) return;

  timeFormat = format;
  localStorage.setItem(TIME_FORMAT_KEY, format);
  updateClock();
}

export function resetTimeFormat() {
  localStorage.removeItem(TIME_FORMAT_KEY);

  timeFormat = DEFAULT_TIME_FORMAT;
  updateClock();
}

// --- Init ---

export function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
  
  onLanguageChange(() => {
    updateClock();
  });
}