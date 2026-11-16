// Shaped, themed map boundary shared by every level.
//
// The walkable area is a rounded rectangle: `thickness` squares in from the board
// edge, with corners rounded to `radius` squares. Anything outside it is blocked,
// and the edge is decorated according to `kind`:
//   'nebula'    soft glowing gas clouds          (colors: puff colours)
//   'ring'      a band of drifting ice / dust     (colors: particle colours)
//   'asteroids' a belt of tumbling rocks          (colors: [light, mid, dark])
// The look (kind, colours, glow) lives in LEVEL_STYLES[...].boundary in assets/theme.js.
// A stage can tweak it with `boundary: { thickness, radius, clear: [{x, y}] }`
// (clear = squares to keep free of decoration, e.g. pick-up spots), or turn it off with `boundary: false`.
//
// The static decoration is painted once into the renderer's cached background;
// only the glowing edge line is animated each frame.
import { mulberry32 } from './utils.js';

const EPS = 0.01;

export function makeBoundary({ cols, rows, anchor = 'tile', spec, seed = 1 }) {
  const th = spec.thickness ?? 0;
  const rad = spec.radius ?? 3.5;
  const off = anchor === 'vertex' ? 0 : 0.5;
  const L = th, Tp = th, Rr = cols - th, B = rows - th; // inner shape edges (grid units)

  /** Is grid point (px, py) inside the walkable shape? */
  function inside(px, py) {
    if (px < L - EPS || px > Rr + EPS || py < Tp - EPS || py > B + EPS) return false;
    const cx = Math.min(Math.max(px, L + rad), Rr - rad);
    const cy = Math.min(Math.max(py, Tp + rad), B - rad);
    return Math.hypot(px - cx, py - cy) <= rad + EPS;
  }

  /** Points along the shape's outline, about `step` squares apart, with outward normals. */
  function outline(step) {
    const pts = [];
    const corners = [
      { cx: Rr - rad, cy: Tp + rad, a0: -Math.PI / 2 },
      { cx: Rr - rad, cy: B - rad, a0: 0 },
      { cx: L + rad, cy: B - rad, a0: Math.PI / 2 },
      { cx: L + rad, cy: Tp + rad, a0: Math.PI },
    ];
    const straight = [
      [L + rad, Tp, Rr - rad, Tp, 0, -1],
      [Rr, Tp + rad, Rr, B - rad, 1, 0],
      [Rr - rad, B, L + rad, B, 0, 1],
      [L, B - rad, L, Tp + rad, -1, 0],
    ];
    for (let i = 0; i < 4; i++) {
      const [x1, y1, x2, y2, nx, ny] = straight[i];
      const len = Math.hypot(x2 - x1, y2 - y1), k = Math.max(1, Math.round(len / step));
      for (let j = 0; j < k; j++) pts.push({ x: x1 + ((x2 - x1) * j) / k, y: y1 + ((y2 - y1) * j) / k, nx, ny });
      const c = corners[i], arcK = Math.max(2, Math.round((rad * Math.PI) / 2 / step));
      for (let j = 0; j < arcK; j++) {
        const a = c.a0 + ((Math.PI / 2) * j) / arcK;
        pts.push({ x: c.cx + Math.cos(a) * rad, y: c.cy + Math.sin(a) * rad, nx: Math.cos(a), ny: Math.sin(a) });
      }
    }
    return pts;
  }

  // ---- decoration particles (grid units), made once
  const rng = mulberry32(seed * 977 + 5);
  const clear = spec.clear || [];
  const isClear = (x, y) => clear.some((c) => Math.abs(x - (c.x + 0.5)) < 0.75 && Math.abs(y - (c.y + 0.5)) < 0.75);
  const parts = [];
  const add = (x, y, size) => {
    if (x < -0.45 || y < -0.45 || x > cols + 0.45 || y > rows + 0.45) return;
    if (isClear(x, y)) return;
    parts.push({ x, y, size, c: Math.floor(rng() * 1000), rot: rng() * 6.28, shape: Array.from({ length: 7 }, () => 0.7 + rng() * 0.3) });
  };
  const kind = spec.kind || 'nebula';
  const density = { nebula: 0.55, ring: 0.12, asteroids: 0.2 }[kind] || 0.3;
  const sizeOf = () =>
    kind === 'nebula' ? 0.5 + rng() * 0.5 : kind === 'ring' ? 0.03 + rng() * rng() * 0.09 : 0.14 + rng() * 0.26;
  for (const p of outline(density)) {
    const reps = kind === 'ring' ? 3 : 1;
    for (let k = 0; k < reps; k++) {
      // d = distance outwards from the edge: from inside the blocked strip (if any) to the board margin
      const d = 0.4 - rng() * (th + 0.4); // never spills onto walkable squares
      add(p.x + p.nx * d + (rng() - 0.5) * 0.25, p.y + p.ny * d + (rng() - 0.5) * 0.25, sizeOf());
    }
  }
  // fill the cut-off corners
  for (let i = 0; i < (rad + th) * (rad + th) * 4 * (kind === 'ring' ? 3 : 1.2); i++) {
    const x = rng() * cols, y = rng() * rows;
    const nearCorner = (x < L + rad || x > Rr - rad) && (y < Tp + rad || y > B - rad);
    if (nearCorner && !inside(x, y)) add(x, y, sizeOf());
  }

  // ---- drawing
  function shapePath(ctx, X, Y, T) {
    ctx.beginPath();
    ctx.roundRect(X(L), Y(Tp), (Rr - L) * T, (B - Tp) * T, rad * T);
  }

  function rock(ctx, px, py, r, rot, shape, colors) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.beginPath();
    shape.forEach((s, i) => {
      const a = (i / shape.length) * Math.PI * 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * s, Math.sin(a) * r * s);
    });
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.6, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /** Paint the static decoration into a background canvas. X(x)/Y(y) map grid units to pixels. */
  function paint(g, X, Y, T) {
    const colors = spec.colors || ['rgba(150,120,255,0.25)'];
    g.save();
    for (const p of parts) {
      const px = X(p.x), py = Y(p.y), r = p.size * T;
      if (kind === 'nebula') {
        const grd = g.createRadialGradient(px, py, 0, px, py, r);
        grd.addColorStop(0, colors[p.c % colors.length]);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      } else if (kind === 'ring') {
        g.fillStyle = colors[p.c % colors.length];
        g.globalAlpha = 0.5 + (p.c % 50) / 100;
        g.beginPath();
        g.arc(px, py, Math.max(0.8, r), 0, Math.PI * 2);
        g.fill();
      } else {
        rock(g, px, py, r, p.rot, p.shape, colors);
      }
    }
    g.restore();
  }

  /** The glowing edge line, drawn every frame (follows the scrolling camera). */
  function drawLive(r, t) {
    if (!spec.glow) return;
    const ctx = r.ctx;
    ctx.save();
    ctx.strokeStyle = spec.glow;
    ctx.shadowColor = spec.glow;
    ctx.shadowBlur = r.T * 0.35;
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t / 700);
    ctx.lineWidth = Math.max(1.5, r.T * 0.05);
    if (spec.dashed) {
      ctx.setLineDash([r.T * 0.3, r.T * 0.2]);
      ctx.lineDashOffset = -t / 90;
    }
    shapePath(ctx, (x) => r.gx(x), (y) => r.gy(y), r.T);
    ctx.stroke();
    ctx.restore();
  }

  return {
    spec,
    rock, // reusable rock painter, e.g. for pick-up piles
    /** Is the (anchored) square / grid point blocked by the boundary? */
    blocked: (x, y) => !inside(x + off, y + off),
    /** Clip a context to the walkable shape (used for the board and grid). */
    clip(g, X, Y, T) {
      shapePath(g, X, Y, T);
      g.clip();
    },
    paint,
    drawLive,
  };
}
