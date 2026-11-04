import { getLanguage, onLanguageChange } from "./i18n/i18n.js";

const TIME_FORMAT_KEY = "fynn-time-format";
const DEFAULT_TIME_FORMAT = "12h";
const VALID_TIME_FORMATS = ["12h", "24h"];

// The clock only shows hours and minutes, so instead of ticking every second
// it is re-aligned to fire just after each minute boundary. 25ms of buffer
// keeps the first tick of a new minute from resolving a millisecond early.
const MINUTE_MS = 60 * 1000;
const TICK_BUFFER_MS = 25;

const clockElement = document.querySelector("#clock");
const dateElement = document.querySelector("#date");

function loadTimeFormat() {
  const saved = localStorage.getItem(TIME_FORMAT_KEY);
  return VALID_TIME_FORMATS.includes(saved) ? saved : DEFAULT_TIME_FORMAT;
}

let timeFormat = loadTimeFormat();

// Intl formatters are expensive to construct, so build them once and rebuild
// only when the language or the time format actually changes.
let timeFormatter = null;
let dateFormatter = null;

function buildFormatters() {
  const locale = getLanguage();

  timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });

  dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function updateClock() {
  if (!timeFormatter || !dateFormatter) buildFormatters();

  const now = new Date();
  const timeParts = timeFormatter.formatToParts(now);
  const date = dateFormatter.format(now);

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

let tickTimer = null;

function stopTicking() {
  if (tickTimer === null) return;
  clearTimeout(tickTimer);
  tickTimer = null;
}

// One self-realigning timer instead of a 1s interval: the next tick is always
// scheduled relative to the current time, so the clock never drifts. Ticks
// that land while the page is hidden are skipped (nothing to repaint); the
// clock catches up on visibilitychange below.
function startTicking() {
  stopTicking();

  const delay = MINUTE_MS - (Date.now() % MINUTE_MS) + TICK_BUFFER_MS;
  tickTimer = setTimeout(() => {
    tickTimer = null;
    if (!document.hidden) updateClock();
    startTicking();
  }, delay);
}

export function getTimeFormat() {
  return timeFormat;
}

export function setTimeFormat(format) {
  if (!VALID_TIME_FORMATS.includes(format)) return;

  timeFormat = format;
  localStorage.setItem(TIME_FORMAT_KEY, format);
  buildFormatters();
  updateClock();
}

export function resetTimeFormat() {
  localStorage.removeItem(TIME_FORMAT_KEY);

  timeFormat = DEFAULT_TIME_FORMAT;
  buildFormatters();
  updateClock();
}

export function initClock() {
  buildFormatters();
  updateClock();
  startTicking();

  onLanguageChange(() => {
    buildFormatters();
    updateClock();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      updateClock();
    }
  });
}
