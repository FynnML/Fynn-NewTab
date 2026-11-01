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

  const hour12 = timeFormat === "12h";
  const timeParts = new Intl.DateTimeFormat(getLanguage(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).formatToParts(now);

  const date = now.toLocaleDateString(getLanguage(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const fragment = document.createDocumentFragment();
  let textBuffer = "";

  const flushText = () => {
    if (!textBuffer) return;
    fragment.append(textBuffer);
    textBuffer = "";
  };

  for (const part of timeParts) {
    if (part.type === "dayPeriod") {
      flushText();
      const period = document.createElement("span");
      period.textContent = part.value;
      fragment.append(period);
    } else {
      textBuffer += part.value;
    }
  }
  flushText();

  clockElement.replaceChildren(fragment);
  dateElement.textContent = date;
}

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

export function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
  
  onLanguageChange(() => {
    updateClock();
  });
}