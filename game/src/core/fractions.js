// Reusable "carry fraction pieces to a target" mechanic, for any series level
// (Leibniz now; Nilakantha, Wallis, Basel... later).
//
// A term like  sign × num/den  is shown as unit discs cut into `den` wedges.
// Each piece on the floor is ONE wedge (worth 1/den of a disc), so its size
// shows its value. The player carries `num` wedges to the target to add the term.
// Negative terms use a different piece style (e.g. ice instead of fire).

export class DeliveryRound {
  /**
   * @param {object} o
   * @param {number} o.sign  +1 or -1
   * @param {number} o.num   wedges to deliver
   * @param {number} o.den   wedges per whole disc
   * @param {{x,y}[]} o.spawnPoints  free tiles pieces may appear on
   * @param {() => number} [o.rng]
   * @param {number} [o.extra] extra decoy wedges beyond the whole discs
   */
  constructor({ sign = 1, num, den, spawnPoints, rng = Math.random, extra = 0 }) {
    this.sign = sign;
    this.num = num;
    this.den = den;
    this.delivered = 0;
    const total = Math.ceil(num / den) * den + extra;
    const pts = [...spawnPoints];
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    this.pieces = pts.slice(0, total).map((p, id) => ({ id, x: p.x, y: p.y, rot: rng() * Math.PI * 2, sign, den, state: 'floor' }));
  }

  get done() { return this.delivered >= this.num; }
  get remaining() { return Math.max(0, this.num - this.delivered); }
  /** Full value of the term, e.g. -4/3 */
  termValue() { return (this.sign * this.num) / this.den; }
  /** Value delivered so far */
  partialValue() { return (this.sign * this.delivered) / this.den; }

  floorPieces() { return this.pieces.filter((p) => p.state === 'floor'); }
  pieceAt(x, y) { return this.pieces.find((p) => p.state === 'floor' && p.x === x && p.y === y) || null; }

  /** The piece the player is "most on top of": same square first, then the closest neighbour. */
  nearestPiece(x, y, maxCheb = 1) {
    let best = null, bd = Infinity;
    for (const p of this.floorPieces()) {
      if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) > maxCheb) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  pickUp(p) { p.state = 'carried'; }
  drop(p, x, y) { p.state = 'floor'; p.x = x; p.y = y; }
  deliver(p) { p.state = 'delivered'; this.delivered++; }
}

/** Text form: fracText(-1, 4, 3) -> "− 4/3" */
export function fracText(sign, num, den, { plus = true } = {}) {
  const s = sign < 0 ? '− ' : plus ? '+ ' : '';
  return den === 1 ? `${s}${num}` : `${s}${num}/${den}`;
}

/** Draw one wedge piece centred (by its centroid) at pixel (x, y). */
export function drawWedge(ctx, x, y, radius, den, rot, style, { glow = true } = {}) {
  const a = (Math.PI * 2) / den;
  const c = den === 1 ? 0 : (4 * radius * Math.sin(a / 2)) / (3 * a); // centroid distance from the tip
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.translate(-c, 0);
  ctx.beginPath();
  if (den === 1) ctx.arc(0, 0, radius, 0, Math.PI * 2);
  else {
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -a / 2, a / 2);
    ctx.closePath();
  }
  const g = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
  g.addColorStop(0, style.core);
  g.addColorStop(1, style.edge);
  ctx.fillStyle = g;
  if (glow) {
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = radius * 0.7;
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, radius * 0.07);
  ctx.strokeStyle = style.stroke;
  ctx.stroke();
  ctx.restore();
}

/** Lay out `count` discs inside a raw-grid area {x, y, w, h}. */
export function discLayout(count, area) {
  const cols = count <= 2 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const cw = area.w / cols, ch = area.h / rows;
  const rad = Math.min(cw, ch) * 0.42;
  return Array.from({ length: count }, (_, i) => ({
    cx: area.x + cw * ((i % cols) + 0.5),
    cy: area.y + ch * (Math.floor(i / cols) + 0.5),
    rad,
  }));
}

/**
 * Draw the "big shape on the floor": whole discs cut into den wedges.
 * Wedges needed for this term are outlined; delivered ones are filled in.
 */
export function drawDiscSet(r, { num, den, delivered }, style, area) {
  const ctx = r.ctx;
  const discs = discLayout(Math.ceil(num / den), area);
  let w = 0;
  for (const d of discs) {
    const cx = r.gx(d.cx), cy = r.gy(d.cy), rad = d.rad * r.T;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.restore();
    for (let k = 0; k < den; k++, w++) {
      const a0 = -Math.PI / 2 + (k * Math.PI * 2) / den;
      const a1 = a0 + (Math.PI * 2) / den;
      const needed = w < num, filled = w < delivered;
      ctx.save();
      ctx.beginPath();
      if (den === 1) ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      else {
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rad, a0, a1);
        ctx.closePath();
      }
      if (filled) {
        const g = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
        g.addColorStop(0, style.core);
        g.addColorStop(1, style.edge);
        ctx.fillStyle = g;
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = r.T * 0.4;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (needed) {
        ctx.fillStyle = style.ghost;
        ctx.fill();
      }
      ctx.lineWidth = needed ? 2 : 1;
      ctx.setLineDash(needed ? [] : [4, 4]);
      ctx.strokeStyle = needed ? style.stroke : 'rgba(255,255,255,0.18)';
      ctx.stroke();
      ctx.restore();
    }
  }
  return discs;
}
