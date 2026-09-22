/**
 * greeting.js — Lời chào ngẫu nhiên theo buổi cho Fynn New Tab
 * Vanilla JS ES module, không cần thư viện, tương thích Manifest V3.
 *
 * Cách dùng:
 *   import { initGreeting } from './greeting.js';
 *   initGreeting({ el: document.getElementById('greeting') });
 */

// Mốc giờ bắt đầu của từng buổi (theo giờ 24h)
export const PERIODS = [
  { id: 'night',     from: 0,  label: 'Khuya'  },
  { id: 'morning',   from: 5,  label: 'Sáng'   },
  { id: 'noon',      from: 11, label: 'Trưa'   },
  { id: 'afternoon', from: 13, label: 'Chiều'  },
  { id: 'evening',   from: 18, label: 'Tối'    },
  { id: 'late',      from: 22, label: 'Khuya'  },
];

/**
 * Danh sách câu chào theo từng buổi.
 * Mỗi lần mở New Tab sẽ chọn ngẫu nhiên một câu.
 */
export const GREETINGS = {
  // 00:00 – 04:59 — khuya, đang thức rất muộn
  night: [
    'Still up?',
    'Burning the midnight oil?',
    'It’s the middle of the night.',
    'Sweet dreams.',
    'Sleep well and wake up refreshed.',
  ],

  // 05:00 – 10:59
  morning: [
    'Good morning',
    'Rise and shine.',
    'Ready for a new day?',
    'Hope today treats you well.',
    'What will you create today?',
  ],

  // 11:00 – 12:59
  noon: [
    'Good afternoon',
    'Time for a lunch break?',
    'Hope you enjoy your lunch.',
    'Halfway through the day.',
    'Take a moment to recharge.',
  ],

  // 13:00 – 17:59
  afternoon: [
    'Good afternoon',
    'How’s your day going?',
    'Hope you’re having a good one.',
    'Still going strong?',
    'A short break wouldn’t hurt.',
  ],

  // 18:00 – 21:59
  evening: [
    'Good evening',
    'How was your day?',
    'Time to unwind.',
    'Hope you’re having a lovely evening.',
    'You made it through the day.',
  ],

  // 22:00 – 23:59 — đêm muộn, nên đi ngủ
  late: [
    'Getting late.',
    'Time to call it a day?',
    'Don’t stay up too long.',
    'Rest well tonight.',
    'Sweet dreams.',
  ],
};

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
  const list = GREETINGS[periodId] || ['Xin chào'];
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
 *
 * @param {Object}      opts
 * @param {HTMLElement} opts.el
 * @param {boolean}     [opts.icon]
 *
 * @returns {{ destroy(): void }}
 */
export function initGreeting({ el, icon = true } = {}) {
  if (!el) {
    throw new Error('initGreeting: thiếu phần tử `el`');
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
  const render = (animate = true) => {
    const now = new Date();
    const period = getPeriod(now);

    if (!currentGreeting || lastId !== period.id) {
      currentGreeting = getRandomGreeting(period.id);
    }

    const text = currentGreeting;

    const apply = () => {
      el.textContent = '';

      if (icon) {
        const i = document.createElement('span');
        i.className = 'greeting__icon';
        i.setAttribute('aria-hidden', 'true');
        i.textContent = period.icon;

        el.append(i, ' ');
      }

      el.append(document.createTextNode(text));
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