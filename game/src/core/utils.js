// Small shared helpers.

/** Parse a number typed by the player ("3,14" and "3.14" both work). Returns null if not a number. */
export function parseNum(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Format a number to fixed decimals, or a dash when missing. */
export function fmt(n, d = 4) {
  return n === null || n === undefined || !Number.isFinite(n) ? '—' : Number(n).toFixed(d);
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Chebyshev distance: 1 means "next to, including diagonally". */
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Seeded random number generator (returns floats in [0, 1)). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stacked fraction as HTML, e.g. fracHtml(4, 5) */
export function fracHtml(num, den) {
  if (den === 1) return `${num}`;
  return `<span class="frac"><span class="n">${num}</span><span class="d">${den}</span></span>`;
}

/** Key cap HTML */
export const key = (label) => `<span class="key">${label}</span>`;
