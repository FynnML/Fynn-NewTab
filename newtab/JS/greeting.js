/**
 * greeting.js — Lời chào ngẫu nhiên theo buổi cho Fynn New Tab
 * Vanilla JS ES module, không cần thư viện, tương thích Manifest V3.
 *
 * Cách dùng:
 *   import { initGreeting } from './greeting.js';
 *   initGreeting({ el: document.getElementById('greeting') });
 */

import { tArray, onLanguageChange } from './i18n/i18n.js';

// Mốc giờ bắt đầu của từng buổi (theo giờ 24h)
export const PERIODS = [
  { id: 'night',     from: 0,  label: 'Khuya'  },
  { id: 'morning',   from: 5,  label: 'Sáng'   },
  { id: 'noon',      from: 11, label: 'Trưa'   },
  { id: 'afternoon', from: 13, label: 'Chiều'  },
  { id: 'evening',   from: 18, label: 'Tối'    },
  { id: 'late',      from: 22, label: 'Khuya'  },
];


/** Trả về buổi tương ứng với thời điểm `date`. */
export function getPeriod(date = new Date()) {
  const h = date.getHours();
  let current = PERIODS[0];

  for (const p of PERIODS) {
    if (h >= p.from) current = p;
  }

  return current;
}

// ---------------------------------------------------------------------------
// Chọn câu ngẫu nhiên (tránh lặp lại đúng câu của lần mở tab trước)
// ---------------------------------------------------------------------------

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
  } catch {
    /* localStorage không dùng được thì bỏ qua */
  }
}

/** Chọn ngẫu nhiên một câu chào trong buổi, khác câu lần trước. */
function getRandomGreeting(periodId) {
  let list = tArray(`greeting.${periodId}`);
  if (!list || list.length === 0) list = ['Hello'];
  const last = readLast()[periodId];
  const pool = list.length > 1 ? list.filter((t) => t !== last) : list;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  saveLast(periodId, pick);
  return pick;
}

/**
 * Tạo câu chào hoàn chỉnh.
 * `customText` cho phép truyền sẵn một câu (để giữ nguyên câu đã chọn).
 */
export function getGreetingText(date = new Date(), customText = null) {
  const period = getPeriod(date);
  return customText || getRandomGreeting(period.id);
}

/** Số ms còn lại đến mốc đổi buổi kế tiếp. */
function msUntilNextPeriod(now = new Date()) {
  const h = now.getHours();
  const next = PERIODS.find((p) => p.from > h);

  const target = new Date(now);
  target.setHours(next ? next.from : 24, 0, 0, 0); // 24 => 00:00 hôm sau

  return target - now + 1000;
}

/**
 * Gắn lời chào vào một phần tử và tự cập nhật khi đổi buổi.
 * `el` là section bọc ngoài (dùng để toggle class/data-period cho CSS);
 * chữ thật sự được ghi vào `#greetingText` bên trong nó.
 *
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
  let swapTimer = null;
  let lastId = null;
  let currentGreeting = null;

  /**
   * Câu mới chỉ được random khi:
   *  - New Tab được mở lần đầu
   *  - Buổi trong ngày thay đổi
   */
  const render = (animate = true, forceNew = false) => {
    const now = new Date();
    const period = getPeriod(now);

    if (!currentGreeting || lastId !== period.id || forceNew) {
      currentGreeting = getRandomGreeting(period.id);
    }

    const text = currentGreeting;

    const apply = () => {
      textEl.textContent = text;
      el.dataset.period = period.id;
      el.classList.remove('is-changing');
    };

    clearTimeout(swapTimer);

    // Chỉ chạy hiệu ứng khi đổi buổi.
    if (animate && lastId && lastId !== period.id) {
      el.classList.add('is-changing');
      swapTimer = setTimeout(apply, 250);
    } else {
      apply();
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

  // Tab bị ngủ / máy sleep thì timer có thể trễ.
  // Khi quay lại tab sẽ cập nhật lại.
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

  // Mở New Tab → chọn random một câu.
  render(false);
  schedule();

  return {
    destroy() {
      clearTimeout(timer);
      clearTimeout(swapTimer);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}