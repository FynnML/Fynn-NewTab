import { tArray, onLanguageChange } from './i18n/i18n.js';

export const PERIODS = [
  { id: 'night',     from: 0,  label: 'Khuya'  },
  { id: 'morning',   from: 5,  label: 'Sáng'   },
  { id: 'noon',      from: 11, label: 'Trưa'   },
  { id: 'afternoon', from: 13, label: 'Chiều'  },
  { id: 'evening',   from: 18, label: 'Tối'    },
  { id: 'late',      from: 22, label: 'Khuya'  },
];

export function getPeriod(date = new Date()) {
  const h = date.getHours();
  let current = PERIODS[0];

  for (const p of PERIODS) {
    if (h >= p.from) current = p;
  }

  return current;
}

const LAST_KEY = 'fynn:greeting:last';

function readLast() {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLast(periodId, text) {
  try {
    const all = readLast();
    all[periodId] = text;
    localStorage.setItem(LAST_KEY, JSON.stringify(all));
  } catch {}
}

function getRandomGreeting(periodId) {
  let list = tArray(`greeting.${periodId}`);
  if (!list || list.length === 0) list = ['Hello'];
  const last = readLast()[periodId];
  const pool = list.length > 1 ? list.filter((t) => t !== last) : list;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  saveLast(periodId, pick);
  return pick;
}

export function getGreetingText(date = new Date(), customText = null) {
  const period = getPeriod(date);
  return customText || getRandomGreeting(period.id);
}

function msUntilNextPeriod(now = new Date()) {
  const h = now.getHours();
  const next = PERIODS.find((p) => p.from > h);

  const target = new Date(now);
  target.setHours(next ? next.from : 24, 0, 0, 0);

  return target - now + 1000;
}

/**
 * @param {Object}      opts
 * @param {HTMLElement} opts.el
 *
 * @returns {{ destroy(): void }}
 */
export function initGreeting({ el } = {}) {
  if (!el) {
    throw new Error('initGreeting: thiếu phần tử `el`');
  }

  const textEl = el.querySelector('#greetingText');

  if (!textEl) {
    throw new Error('initGreeting: không tìm thấy `#greetingText` bên trong `el`');
  }

  let timer = null;
  let typeTimer = null;
  let lastId = null;
  let currentGreeting = null;
  let shownText = null;

  const prefersReducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const splitChars = (text) =>
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
      : Array.from(text);

  const typeText = (text, startDelay = 0) => {
    clearTimeout(typeTimer);

    if (prefersReducedMotion()) {
      textEl.textContent = text;
      textEl.classList.remove('is-typing');
      textEl.removeAttribute('aria-label');
      return;
    }

    const chars = splitChars(text);
    const step = Math.min(70, Math.max(30, 1800 / chars.length));
    let i = 0;

    textEl.textContent = '';
    textEl.classList.add('is-typing');
    textEl.setAttribute('aria-label', text);

    const tick = () => {
      i += 1;
      textEl.textContent = chars.slice(0, i).join('');
      if (i < chars.length) {
        typeTimer = setTimeout(tick, step);
      } else {
        typeTimer = setTimeout(() => {
          textEl.classList.remove('is-typing');
          textEl.removeAttribute('aria-label');
        }, 1400);
      }
    };

    typeTimer = setTimeout(tick, startDelay);
  };

  const render = (animate = true, forceNew = false) => {
    const now = new Date();
    const period = getPeriod(now);

    if (!currentGreeting || lastId !== period.id || forceNew) {
      currentGreeting = getRandomGreeting(period.id);
    }

    const text = currentGreeting;

    el.dataset.period = period.id;

    if (text !== shownText) {
      typeText(text, animate ? 0 : 350);
      shownText = text;
    }

    lastId = period.id;
  };

  const schedule = () => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      render();
      schedule();
    }, msUntilNextPeriod());
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      render();
      schedule();
    }
  };

  document.addEventListener('visibilitychange', onVisible);

  if (!el.dataset.hasI18nListener) {
    onLanguageChange(() => {
      render(true, true);
    });
    el.dataset.hasI18nListener = 'true';
  }

  render(false);
  schedule();

  return {
    destroy() {
      clearTimeout(timer);
      clearTimeout(typeTimer);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}