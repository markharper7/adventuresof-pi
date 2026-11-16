// LEVEL 2 — The Star Forge: the Leibniz series.
//
//   π/4 = 1 − 1/3 + 1/5 − 1/7 + …   so   π = 4 − 4/3 + 4/5 − 4/7 + …
//
// Each "part" is one term ± 4/(2k+1). Wedge-shaped pieces are scattered around
// the deck; each is 1/(2k+1) of a disc (so its size shows its value). The player
// carries 4 of them, one at a time, into the Star Forge. Fire crystals add (+)
// and make the star burn hotter; ice crystals subtract (−) and cool it.
// The current π value is shown all the time, plus a chart of it zig-zagging in.
// The warp gate opens after UNLOCK terms; the player may carry on up to PARTS terms,
// then 2 runs out of crystals. (Dialogue: npc_dialogue.js → level2.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { fmt, key, fracHtml, clamp } from '../core/utils.js';
import { DeliveryRound, drawWedge, drawDiscSet, fracText } from '../core/fractions.js';
import { PIECE_STYLES, FORGE_STYLE } from '../../assets/theme.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';

const ID = 'forge';
const PARTS = 20;  // most terms 2 has crystals for
const UNLOCK = 6;  // terms needed to open the warp gate
const COLS = 26, ROWS = 17;
const PLAYER_START = { x: 8, y: 14 };
const FORGE = { x: 12, y: 7, w: 2, h: 2 };             // tiles the forge occupies
const FORGE_C = { x: FORGE.x + FORGE.w / 2, y: FORGE.y + FORGE.h / 2 }; // raw grid centre
const DISC_AREA = { x: 0.6, y: 4.2, w: 7.8, h: 8 };    // where the "big shape" is drawn
const CHART = { x0: 4, x1: 25.4, y0: 0.25, y1: 3.4, lo: 2.8, hi: 4.1 };
const D = DIALOGUE.level2;
const TWO = CHARACTERS.two;

const term = (k) => ({ sign: k % 2 === 0 ? 1 : -1, num: 4, den: 2 * k + 1 });
const leibniz = (n) => {
  let s = 0;
  for (let k = 0; k < n; k++) s += (k % 2 ? -1 : 1) / (2 * k + 1);
  return s;
};
const styleFor = (sign) => (sign > 0 ? PIECE_STYLES.positive : PIECE_STYLES.negative);
const wedgeName = (den) => (den === 1 ? 'a whole disc' : `1/${den} of a disc`);

/** "1 − 1/3 + 1/5 …" for the first n terms of π/4 */
function seriesText(n) {
  if (n === 0) return '0';
  const ks = n <= 6 ? [...Array(n).keys()] : [0, 1, 2, 3, '…', n - 1];
  return ks
    .map((k, i) => {
      if (k === '…') return ' …';
      const t = term(k);
      const f = t.den === 1 ? '1' : `1/${t.den}`;
      return i === 0 ? f : ` ${t.sign < 0 ? '−' : '+'} ${f}`;
    })
    .join('');
}

function spawnPoints() {
  const pts = [];
  for (let x = 10; x <= 24; x++)
    for (let y = 4; y <= 15; y++) {
      const nearForge = x >= FORGE.x - 2 && x <= FORGE.x + FORGE.w + 1 && y >= FORGE.y - 2 && y <= FORGE.y + FORGE.h + 1;
      if (!nearForge) pts.push({ x, y });
    }
  return pts;
}

function createStage(game, si, opts = {}) {
  const startPart = clamp(opts.part ?? 0, 0, PARTS);
  const st = {
    briefed: startPart > 0, // debug jumps into a later part skip the first conversation
    part: startPart,
    sum: leibniz(startPart), // Leibniz sum of completed terms (= π/4)
    history: Array.from({ length: startPart }, (_, k) => 4 * leibniz(k + 1)),
    round: null,
    carrying: null,
    flash: null,
    finished: startPart >= PARTS,
  };
  const unlocked = () => st.part >= UNLOCK;
  if (unlocked()) markStageDone(ID, si);

  const livePi = () => 4 * st.sum + (st.round ? st.round.partialValue() : 0);
  const inForge = (x, y) => x >= FORGE.x && x < FORGE.x + FORGE.w && y >= FORGE.y && y < FORGE.y + FORGE.h;
  const nearForge = (p) => p.x >= FORGE.x - 1 && p.x <= FORGE.x + FORGE.w && p.y >= FORGE.y - 1 && p.y <= FORGE.y + FORGE.h;

  function spawnRound(p = game.player) {
    st.round = new DeliveryRound({ ...term(st.part), spawnPoints: spawnPoints().filter((q) => q.x !== p.x || q.y !== p.y) });
    st.carrying = null;
  }

  if (st.briefed && !st.finished) spawnRound(PLAYER_START);

  function restart() {
    st.part = 0;
    st.sum = 0;
    st.history = [];
    st.finished = false;
    spawnRound();
    ui.toast('The Star Forge is reset to term 1.');
  }

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      await play(D.intro);
      if (!st.finished) spawnRound();
      return;
    }
    if (st.finished) return play(D.outOfCrystals);
    if (!unlocked()) return play(D.howAreYouGettingOn, { n: UNLOCK - st.part });
    return play(D.sixTermsDone, { value: fmt(4 * st.sum, 5) });
  }

  // ------------------------------------------------------------ actions
  async function onAction() {
    const p = game.player;
    if (st.carrying) {
      if (nearForge(p)) return deliver();
      if (!st.round.pieceAt(p.x, p.y) && !(game.stage.gate.x === p.x && game.stage.gate.y === p.y)) {
        st.round.drop(st.carrying, p.x, p.y);
        st.carrying = null;
        ui.toast('Dropped. Carry wedges to the forge to use them.');
      } else ui.toast('There’s already something here — find an empty spot, or take it to the forge.');
      return true;
    }
    if (st.round) {
      const piece = st.round.pieceAt(p.x, p.y) || st.round.nearestPiece(p.x, p.y, 1);
      if (piece) {
        st.round.pickUp(piece);
        st.carrying = piece;
        ui.toast(`Picked up a ${styleFor(piece.sign).name} wedge: <b>${fracText(piece.sign, 1, piece.den)}</b>`);
        return true;
      }
    }
    if (nearForge(p)) {
      ui.toast(st.round ? 'Bring crystals here and press Enter to feed the forge.' : st.finished ? 'There are no crystals left.' : `Talk to ${TWO.name} to fire up the forge.`);
      return true;
    }
    return false;
  }

  async function deliver() {
    const piece = st.carrying;
    st.carrying = null;
    st.round.deliver(piece);
    st.flash = { t: performance.now(), sign: piece.sign };
    game.refreshHud();
    if (st.round.done) await completePart();
    else ui.toast(`${fracText(piece.sign, 1, piece.den)} → π ≈ <b>${fmt(livePi(), 4)}</b> (${st.round.remaining} more to go)`);
    return true;
  }

  async function completePart() {
    const k = st.part, t = term(k);
    st.sum += t.sign / t.den;
    const pi = 4 * st.sum;
    st.history.push(pi);
    st.round = null; // left-over wedges vanish
    st.part++;
    game.refreshHud();
    tracker.addFound(pi, `Leibniz series — ${k + 1} term${k ? 's' : ''}`);
    ui.toast(`Term ${k + 1} done: <b>${fracText(t.sign, 4, t.den)}</b> → π ≈ <b>${fmt(pi, 5)}</b>. Added to your tracker.`, 3500);

    if (st.part >= PARTS) {
      st.finished = true;
      ui.toast(`That was the last of the crystals: ${PARTS} terms, π ≈ <b>${fmt(pi, 5)}</b>.`, 5000);
    } else {
      spawnRound();
    }
    if (st.part === UNLOCK) {
      markStageDone(ID, si);
      await play(D.sixTermsDone, { value: fmt(pi, 5) });
    }
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${TWO.name} first.`);
    const ok = await ui.choice({
      title: 'Restart the Star Forge?',
      text: 'The series goes back to term 1 (your π tracker keeps its values).',
      options: [
        { label: 'Yes, restart', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (ok) restart();
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const pi = livePi();
    const partial = st.round && st.round.delivered
      ? `<div class="muted">includes ${st.round.delivered} of 4 wedges of this term (${fracText(st.round.sign, st.round.delivered, st.round.den)})</div>`
      : '';
    const piBlock = `<h3>Leibniz sum so far (π/4)</h3><div class="series">${seriesText(st.part)}</div>
      <div class="value">= ${fmt(st.sum, 5)}</div>
      <h3>Current π</h3><div class="pi-now">π ≈ ${fmt(pi, 5)}</div>${partial}`;
    if (!st.briefed) return `<h3>Mission</h3><p>Talk to <b>${TWO.name}</b> — walk next to them and press Enter.</p>${piBlock}`;
    if (st.finished || !st.round) {
      return `<h3>Mission</h3><p>All ${PARTS} terms done — no crystals left. Take the warp gate, or press ${key('R')} to restart the forge.</p>${piBlock}`;
    }
    const mission = unlocked()
      ? `<p class="muted">The warp gate is open. Keep going for a better estimate (up to ${PARTS} terms), or take the gate.</p>`
      : `<p class="muted">Feed at least ${UNLOCK} terms to open the warp gate (${st.part} / ${UNLOCK}).</p>`;
    const t = term(st.part);
    const cls = t.sign < 0 ? 'neg' : 'pos';
    const dots = Array.from({ length: t.num }, (_, i) => `<span class="dot ${i < st.round.delivered ? 'on' : ''}"></span>`).join('');
    const carrying = st.carrying ? `Carrying: <b class="${cls}">${styleFor(t.sign).name} (${fracText(t.sign, 1, t.den)})</b>` : 'Carrying: nothing';
    return `${mission}<h3>Term ${st.part + 1} of ${PARTS}</h3>
      <div class="big-frac ${cls}">${t.sign < 0 ? '−' : '+'} ${fracHtml(4, t.den)}</div>
      <p>= 4 ${styleFor(t.sign).name} wedges, each ${wedgeName(t.den)}</p>
      <div class="dots ${cls}">${dots}</div>
      <p>${carrying}</p>
      ${piBlock}`;
  }

  // ------------------------------------------------------------ drawing
  function drawChart(r) {
    const ctx = r.ctx, s = r.style, T = r.T;
    const X = (i) => r.gx(CHART.x0 + 0.8 + (i / PARTS) * (CHART.x1 - CHART.x0 - 1.2));
    const Y = (v) => r.gy(CHART.y1 - ((clamp(v, CHART.lo, CHART.hi) - CHART.lo) / (CHART.hi - CHART.lo)) * (CHART.y1 - CHART.y0));
    ctx.save();
    ctx.fillStyle = s.chartBg;
    ctx.beginPath();
    ctx.roundRect(r.gx(CHART.x0), r.gy(CHART.y0) - T * 0.15, r.gx(CHART.x1) - r.gx(CHART.x0), r.gy(CHART.y1) - r.gy(CHART.y0) + T * 0.3, T * 0.25);
    ctx.fill();
    ctx.restore();
    // No "true π" line: the player must never be shown the real value — only what they work out.
    for (const v of [3, 3.5, 4]) r.text(v.toFixed(1), r.gx(CHART.x0 + 0.35), Y(v), { size: 0.24, color: s.muted });

    const pts = st.history.map((v, i) => ({ x: X(i + 1), y: Y(v) }));
    const live = st.round && st.round.delivered ? { x: X(st.part + 1), y: Y(livePi()) } : null;
    ctx.save();
    ctx.strokeStyle = s.chartLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    if (live && pts.length) {
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(live.x, live.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = s.chartLine;
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === pts.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    if (live) {
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(live.x, live.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    r.text('π after each term →', r.gx(CHART.x1 - 0.3), r.gy(CHART.y1 - 0.05), { size: 0.24, color: s.muted, align: 'right' });
  }

  function drawForge(r, t) {
    const ctx = r.ctx, T = r.T;
    const cx = r.gx(FORGE_C.x), cy = r.gy(FORGE_C.y);
    const pi = livePi();
    const heat = st.briefed ? clamp((pi - 2.4) / 1.8, 0.15, 1) : 0.1;
    const base = T * (0.55 + 0.55 * heat) * (1 + Math.sin(t / 300) * 0.04);
    ctx.save();
    // rim of the forge
    ctx.strokeStyle = FORGE_STYLE.rim;
    ctx.lineWidth = 2;
    ctx.setLineDash([T * 0.2, T * 0.15]);
    ctx.lineDashOffset = t / 80;
    ctx.beginPath();
    ctx.arc(cx, cy, T * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // star
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 2);
    g.addColorStop(0, FORGE_STYLE.core);
    g.addColorStop(0.35, FORGE_STYLE.mid);
    g.addColorStop(1, FORGE_STYLE.outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, base * 2, 0, Math.PI * 2);
    ctx.fill();
    // flash when a piece goes in
    if (st.flash) {
      const age = performance.now() - st.flash.t;
      if (age < 800) {
        ctx.strokeStyle = st.flash.sign > 0 ? FORGE_STYLE.hotFlash : FORGE_STYLE.coldFlash;
        ctx.globalAlpha = 1 - age / 800;
        ctx.lineWidth = T * 0.15;
        ctx.beginPath();
        ctx.arc(cx, cy, base * (1 + age / 300), 0, Math.PI * 2);
        ctx.stroke();
      } else st.flash = null;
    }
    ctx.restore();
    r.text('STAR FORGE', cx, cy + T * 1.3, { size: 0.26, color: r.style.muted });
  }

  function drawFloor(r, t) {
    drawChart(r);
    // the big shape: whole discs cut into wedges for the current term
    if (st.round) {
      const sty = styleFor(st.round.sign);
      drawDiscSet(r, { num: st.round.num, den: st.round.den, delivered: st.round.delivered }, sty, DISC_AREA);
      r.text(
        `4 × ${st.round.den === 1 ? '1' : '1/' + st.round.den} = ${st.round.den === 1 ? '4' : '4/' + st.round.den}`,
        r.gx(DISC_AREA.x + DISC_AREA.w / 2),
        r.gy(DISC_AREA.y + DISC_AREA.h + 0.3),
        { size: 0.36, color: sty.stroke, weight: 700 }
      );
    }
    drawForge(r, t);
    if (st.round) {
      for (const p of st.round.floorPieces()) {
        const bob = Math.sin(t / 500 + p.id) * r.T * 0.04;
        drawWedge(r.ctx, r.ax(p.x), r.ay(p.y) + bob, r.T * 0.42, p.den, p.rot + t / 4000, styleFor(p.sign));
      }
    }
  }

  function drawOver(r, t, pp) {
    if (!st.carrying) return;
    drawWedge(r.ctx, r.ax(pp.x), r.ay(pp.y - 0.75), r.T * 0.36, st.carrying.den, t / 600, styleFor(st.carrying.sign));
  }

  return {
    title: 'Star Forge',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'two', name: TWO.name, sprite: TWO.sprite, x: 4, y: 14, talk }],
    gate: { x: 1, y: 1, isOpen: unlocked, lockedText: `Feed at least ${UNLOCK} terms of the series into the Star Forge to power up the warp gate.` },
    help: `<p>π = 4 − 4/3 + 4/5 − 4/7 + … Each term is 4 wedges. Walk onto a wedge (or next to it) and press
      ${key('Enter')} to pick it up, then press ${key('Enter')} next to the Star Forge to drop it in.
      <span class="pos">Fire crystals</span> add, <span class="neg">ice crystals</span> subtract.
      ${UNLOCK} terms open the warp gate; you can keep going up to ${PARTS}.
      ${key('R')} restarts the series from term 1.</p>`,
    state: st, // exposed for debugging / tests
    blocked: inForge,
    onAction,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

export default {
  id: ID,
  number: 2,
  title: 'Level 2 · The Star Forge',
  method: 'Leibniz series: π/4 = 1 − 1/3 + 1/5 − …',
  style: 'forge',
  stageCount: 1,
  stageName: () => 'Star Forge',
  createStage,
  debugJumps: () => [
    ...Array.from({ length: PARTS }, (_, k) => ({ label: `Part ${k + 1}: ${fracText(term(k).sign, 4, term(k).den)}`, si: 0, opts: { part: k } })),
    { label: `All ${PARTS} terms done (out of crystals)`, si: 0, opts: { part: PARTS } },
  ],
  // A demo player does the required terms, then stops after a random number of optional ones.
  simulate: (si, rng) => 4 * leibniz(UNLOCK + Math.floor(rng() * (PARTS - UNLOCK + 1))),
  simulateNote: `The series is fixed, so the spread only comes from how many terms a player completes (${UNLOCK} to ${PARTS}).`,
};
