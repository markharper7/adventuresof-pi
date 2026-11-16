// Canvas renderer shared by every level: fits the grid to the window, draws the
// starfield + grid backdrop (cached), sprites, text and speech bubbles.
//
// Coordinates: levels work in grid units.
//   gx/gy(x)  -> raw grid coordinates (0 = left/top edge of the board)
//   ax/ay(x)  -> "anchored" coordinates for things that stand on the grid:
//                 anchor 'tile'   = centre of tile x
//                 anchor 'vertex' = grid-line intersection x (for walking along edges)
import { LEVEL_STYLES } from '../../assets/theme.js';
import { sprite } from './assets.js';
import { mulberry32 } from './utils.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = 20;
    this.rows = 14;
    this.anchor = 'tile';
    this.style = Object.values(LEVEL_STYLES)[0];
    this.seed = 1;
    this.T = 32;
    this.margin = 16;
    this.dpr = 1;
    this.bg = null;
    this.camX = 0;     // camera offset in CSS pixels (scrolling maps)
    this.camY = 0;
    this.viewCols = 20;
    this.viewRows = 14;
    this.paintExtra = null;
  }

  /**
   * viewCols < cols / viewRows < rows makes a scrolling map: the camera follows π.
   * paint(g, X, Y, T) optionally paints a stage's static scenery into the cached background.
   */
  configure({ cols, rows, viewCols, viewRows, anchor = 'tile', style, seed = 1, boundary = null, paint = null }) {
    this.boundary = boundary; // shaped edge from core/boundary.js (or null for a plain rectangle)
    this.paintExtra = paint;
    this.cols = cols;
    this.rows = rows;
    this.viewCols = Math.min(cols, viewCols || cols);
    this.viewRows = Math.min(rows, viewRows || rows);
    this.anchor = anchor;
    this.seed = seed;
    this.style = LEVEL_STYLES[style] || Object.values(LEVEL_STYLES)[0];
    this.camX = 0;
    this.camY = 0;
    this.focusX = this.focusY = undefined;
    this.resize();
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const W = Math.max(200, wrap.clientWidth - 12);
    const H = Math.max(150, wrap.clientHeight - 12);
    const T = Math.max(10, Math.floor(Math.min(W / (this.viewCols + 1), H / (this.viewRows + 1))));
    this.T = T;
    this.margin = Math.round(T / 2);
    this.width = T * this.viewCols + this.margin * 2;   // visible canvas
    this.worldWidth = T * this.cols + this.margin * 2;  // whole map
    this.height = T * this.viewRows + this.margin * 2;  // visible canvas
    this.worldHeight = T * this.rows + this.margin * 2; // whole map
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    if (this.focusX !== undefined) this.follow(this.focusX, this.focusY, true);
    this.buildBackground();
  }

  get off() {
    return this.anchor === 'vertex' ? 0 : 0.5;
  }
  gx(x) { return this.margin + x * this.T - this.camX; }
  gy(y) { return this.margin + y * this.T - this.camY; }
  ax(x) { return this.gx(x + this.off); }
  ay(y) { return this.gy(y + this.off); }

  /** Move the camera towards anchored grid position (focusX, focusY) (snap = jump straight there). */
  follow(focusX, focusY = 0, snap = false) {
    this.focusX = focusX;
    this.focusY = focusY;
    const axis = (cam, focus, n, view) => {
      const max = (n - view) * this.T;
      if (max <= 0) return 0;
      const target = Math.max(0, Math.min(max, (focus + this.off) * this.T - (view * this.T) / 2));
      const next = snap ? target : cam + (target - cam) * 0.15;
      return Math.abs(target - next) < 0.5 ? target : next;
    };
    this.camX = axis(this.camX, focusX, this.cols, this.viewCols);
    this.camY = axis(this.camY, focusY, this.rows, this.viewRows);
  }

  buildBackground() {
    const c = document.createElement('canvas');
    c.width = Math.round(this.worldWidth * this.dpr);
    c.height = Math.round(this.worldHeight * this.dpr);
    const g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const s = this.style, w = this.worldWidth, h = this.worldHeight, T = this.T;

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, s.bgTop);
    grad.addColorStop(1, s.bgBottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    for (const n of s.nebulae || []) {
      const rad = n.r * Math.max(w, h);
      const rg = g.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, rad);
      rg.addColorStop(0, n.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    }

    const rng = mulberry32(this.seed * 7919 + 13);
    const starCount = Math.round((s.stars || 0) * (this.cols / this.viewCols) * (this.rows / this.viewRows));
    for (let i = 0; i < starCount; i++) {
      const x = rng() * w, y = rng() * h;
      const r = rng() < 0.92 ? rng() * 1.1 + 0.3 : rng() * 1.6 + 1.2;
      g.globalAlpha = 0.35 + rng() * 0.65;
      g.fillStyle = s.starColors[Math.floor(rng() * s.starColors.length)];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    const x0 = this.margin, y0 = this.margin, bw = this.cols * T, bh = this.rows * T;
    const X = (x) => x0 + x * T, Y = (y) => y0 + y * T;
    const bd = this.boundary;
    g.save();
    if (bd) bd.clip(g, X, Y, T); // board + grid only inside the boundary's shape
    if (s.board) {
      g.fillStyle = s.board;
      g.fillRect(x0, y0, bw, bh);
    }
    if (s.tileA || s.tileB) {
      for (let i = 0; i < this.cols; i++)
        for (let j = 0; j < this.rows; j++) {
          const f = (i + j) % 2 === 0 ? s.tileA : s.tileB;
          if (!f) continue;
          g.fillStyle = f;
          g.fillRect(x0 + i * T, y0 + j * T, T, T);
        }
    }
    g.strokeStyle = s.grid;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= this.cols; i++) {
      const x = Math.round(x0 + i * T) + 0.5;
      g.moveTo(x, y0);
      g.lineTo(x, y0 + bh);
    }
    for (let j = 0; j <= this.rows; j++) {
      const y = Math.round(y0 + j * T) + 0.5;
      g.moveTo(x0, y);
      g.lineTo(x0 + bw, y);
    }
    g.stroke();
    if (s.gridDot) {
      g.fillStyle = s.gridDot;
      const r = Math.max(1.2, T * 0.05);
      for (let i = 0; i <= this.cols; i++)
        for (let j = 0; j <= this.rows; j++) {
          g.beginPath();
          g.arc(x0 + i * T, y0 + j * T, r, 0, Math.PI * 2);
          g.fill();
        }
    }
    g.restore();
    if (bd) bd.paint(g, X, Y, T);
    if (this.paintExtra) this.paintExtra(g, X, Y, T); // the stage's static scenery
    // glowing edge of the map, so the boundary is always visible (shaped boundaries draw their own)
    if (s.border && !bd) {
      g.save();
      g.strokeStyle = s.border;
      g.lineWidth = Math.max(2, T * 0.08);
      g.shadowColor = s.border;
      g.shadowBlur = T * 0.4;
      g.strokeRect(x0, y0, bw, bh);
      g.restore();
    }
    this.bg = c;
  }

  clear() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.bg) {
      const sx = Math.round(this.camX * this.dpr), sy = Math.round(this.camY * this.dpr);
      ctx.drawImage(this.bg, sx, sy, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Draw a named sprite centred at anchored grid position (x, y). size is in tiles. */
  drawSprite(name, x, y, size = 1, { flip = false, alpha = 1, rot = 0, raw = false } = {}) {
    const ctx = this.ctx;
    const px = raw ? this.gx(x) : this.ax(x);
    const py = raw ? this.gy(y) : this.ay(y);
    const s = size * this.T;
    const img = sprite(name);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, py);
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    if (img) ctx.drawImage(img, -s / 2, -s / 2, s, s);
    else {
      ctx.fillStyle = '#f0f';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Text at raw pixel position. */
  text(str, px, py, { size = 0.4, color, align = 'center', baseline = 'middle', weight = 600, alpha = 1 } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${Math.max(9, Math.round(this.T * size))}px "Segoe UI", "Trebuchet MS", sans-serif`;
    ctx.fillStyle = color || this.style.text;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(str, px, py);
    ctx.restore();
  }

  /** Small speech-bubble label above an anchored grid position. */
  bubble(x, y, label) {
    const ctx = this.ctx, T = this.T;
    const px = this.ax(x), py = this.ay(y);
    ctx.save();
    ctx.font = `700 ${Math.max(9, Math.round(T * 0.32))}px "Segoe UI", sans-serif`;
    const w = ctx.measureText(label).width + T * 0.4, h = T * 0.48;
    ctx.fillStyle = this.style.bubble;
    ctx.strokeStyle = this.style.bubbleBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px - w / 2, py - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, py + 1);
    ctx.restore();
  }
}
