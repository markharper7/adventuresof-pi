// LEVEL 8 — The Laser Lanes: Buffon's needle.
//
// A field in the middle of the map is crossed by evenly spaced horizontal laser lanes
// (GAP squares apart). Crates along the bottom hold straight debris rods, each exactly
// ROD squares long, with ROD = GAP. π takes 1, 10 or 100 rods, walks up to the field and
// presses Enter to scatter them.
//
// Each rod's FINAL resting place is random: its centre is uniform over the field and its
// angle is uniform over 0..180°. That is the only thing the maths uses; the tumbling flight
// is just for show. A rod that ends up across a lane lights up. Then:
//   P(rod crosses a lane) = 2 × ROD ÷ (π × GAP) = 2 ÷ π    so    π ≈ 2 × dropped ÷ crossing
// There is no circle anywhere in the level, which 8 points out once the gate opens.
// The player presses C at any time to calculate. Each calculation goes to the tracker tray.
// The warp gate opens after a calculation that uses at least UNLOCK rods.
// (Dialogue: npc_dialogue.js → level8.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, cheb, clamp, mulberry32 } from '../core/utils.js';
import { BUFFON_STYLE as BS } from '../../assets/theme.js';

const ID = 'buffon';
const COLS = 28, ROWS = 18;
const GAP = 2;                               // squares between neighbouring laser lanes
const ROD = 2;                               // rod length in squares (= GAP, so π ≈ 2 × dropped ÷ crossing)
const FIELD = { x: 8, y: 4, w: 12, h: 10 };  // the drop zone (raw grid units). Lanes at y = 4, 6, … 14. h must be a multiple of GAP
const LANES = Array.from({ length: FIELD.h / GAP + 1 }, (_, i) => FIELD.y + i * GAP);
const UNLOCK = 100;                          // rods in a calculation needed to open the warp gate
const MAX_IN_FIELD = 3000;                   // keep drawing fast
const MAX_CARRY = 500;
const CRATES = [
  { id: 'one', count: 1, x: 9, y: 16, name: 'a rod' },
  { id: 'ten', count: 10, x: 14, y: 16, name: 'a bundle of 10 rods' },
  { id: 'hundred', count: 100, x: 19, y: 16, name: 'a crate of 100 rods' },
];
const NPC_POS = { x: 4, y: 8 };
const PLAYER_START = { x: 2, y: 10 };
const GATE = { x: 24, y: 9 };
const D = DIALOGUE.level8;
const EIGHT = CHARACTERS.eight;

const inField = (x, y) => x >= FIELD.x && x < FIELD.x + FIELD.w && y >= FIELD.y && y < FIELD.y + FIELD.h;
const nextToField = (p) => p.x >= FIELD.x - 1 && p.x <= FIELD.x + FIELD.w && p.y >= FIELD.y - 1 && p.y <= FIELD.y + FIELD.h;
const isCrate = (x, y) => CRATES.some((c) => c.x === x && c.y === y);

/**
 * Does a rod centred at height y (grid units), at angle a, cross a lane?
 * Its ends are ROD/2 × sin(a) above and below the centre; it crosses a lane if they fall in
 * different gaps. (A centre in the field can't reach past the top or bottom lane.)
 */
function crosses(y, a) {
  const h = (ROD / 2) * Math.abs(Math.sin(a));
  return Math.floor((y - h - FIELD.y) / GAP) !== Math.floor((y + h - FIELD.y) / GAP);
}
const piFrom = (crossing, total) => (2 * ROD * total) / (GAP * crossing);

/** A fresh, unpredictable stream of random rod landings: centre uniform over the field, angle uniform over 0..π. */
function landingStream() {
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
  return () => {
    const x = FIELD.x + rng() * FIELD.w, y = FIELD.y + rng() * FIELD.h, a = rng() * Math.PI;
    return { x, y, a, cross: crosses(y, a) };
  };
}

function createStage(game, si, opts = {}) {
  const nextLanding = landingStream();
  const st = {
    briefed: !!opts.briefed || !!opts.preload,
    carrying: 0,
    landed: [],        // { x, y, a, cross }
    flying: [],        // rods in the air: { land, start, from, spin }
    crossing: 0,
    calcs: [],         // { crossing, total, pi }
    unlocked: false,
  };
  const total = () => st.landed.length;
  const pending = () => st.flying.length;
  function land(l) {
    st.landed.push(l);
    if (l.cross) st.crossing++;
  }
  if (opts.preload) for (let i = 0; i < opts.preload; i++) land(nextLanding());

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      return play(D.intro);
    }
    if (st.unlocked) return play(D.again);
    if (!total() && !pending()) return play(D.nothingDroppedYet);
    if (!st.calcs.length) return play(D.notCalculatedYet);
    const last = st.calcs[st.calcs.length - 1];
    return play(D.firstCalculation, { value: fmt(last.pi, 3), total: last.total });
  }

  // ------------------------------------------------------------ actions
  const crateNear = (p) => CRATES.find((c) => cheb(c, p) <= 1);

  async function onAction() {
    const p = game.player;
    const crate = crateNear(p);
    if (crate) {
      if (!st.briefed) return ui.toast(`Those crates belong to ${EIGHT.name}. Talk to them first.`), true;
      if (st.carrying + crate.count > MAX_CARRY) return ui.toast('You can’t carry any more. Scatter some over the laser lanes first.'), true;
      st.carrying += crate.count;
      ui.toast(`Picked up ${crate.name}. Carrying <b>${st.carrying}</b>.`);
      game.refreshHud();
      return true;
    }
    if (nextToField(p)) {
      if (!st.carrying) {
        ui.toast(st.briefed ? 'Take some rods from the crates along the bottom first.' : `Talk to ${EIGHT.name} first.`);
        return true;
      }
      scatter(p);
      return true;
    }
    return false;
  }

  function scatter(p) {
    if (total() + pending() + st.carrying > MAX_IN_FIELD) {
      ui.toast(`The field can only hold ${MAX_IN_FIELD} rods. Press ${key('R')} to clear it.`, 4000);
      return;
    }
    const n = st.carrying;
    st.carrying = 0;
    const now = performance.now();
    const spread = Math.min(1600, n * 45); // a stream of rods for big handfuls
    const from = { x: p.x + 0.5, y: p.y + 0.5 };
    for (let i = 0; i < n; i++) {
      st.flying.push({
        land: nextLanding(), // the random resting place: the only thing the maths uses
        start: now + (n > 1 ? (i / n) * spread : 0),
        from,
        spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3) * Math.PI, // extra tumbling, just for show
      });
    }
    ui.toast(`Scattered ${n} rod${n > 1 ? 's' : ''} over the laser lanes!`);
    game.refreshHud();
  }

  const FLY_MS = 750;
  function updateFlying(now) {
    if (!st.flying.length) return;
    let changed = false;
    st.flying = st.flying.filter((f) => {
      if (now - f.start < FLY_MS) return true;
      land(f.land);
      changed = true;
      return false;
    });
    if (changed) game.refreshHud();
  }

  /** Where a flying rod is drawn: an arc from π to its resting place, tumbling and slowing to its final angle. */
  function flyingPos(f, now) {
    const t = now - f.start;
    if (t < 0) return null;
    const k = clamp(t / FLY_MS, 0, 1), e = k * (2 - k);
    return {
      x: f.from.x + (f.land.x - f.from.x) * e,
      y: f.from.y + (f.land.y - f.from.y) * e - Math.sin(k * Math.PI) * 1.5,
      a: f.land.a + f.spin * (1 - e),
    };
  }

  // ------------------------------------------------------------ calculate (C)
  async function calculate() {
    if (!st.briefed) return ui.toast(`Talk to ${EIGHT.name} first.`);
    const n = total(), c = st.crossing;
    if (!n) return ui.toast(pending() ? 'Wait for the rods to land…' : 'Scatter some rods over the laser lanes first.');
    if (!c) return ui.toast('None of your rods cross a lane yet, so there is nothing to divide by. Drop some more!', 3500);
    const pi = piFrom(c, n);
    const v = await ui.panel({
      title: 'Count up the rods',
      html: `<p>Every rod landed somewhere random, pointing in a random direction. Some lie between two lanes, some cross one.</p>
        <div class="formula">
          crossing ÷ dropped ≈ 2 × rod length ÷ (π × lane gap) = 2 ÷ π<br>
          ${c} ÷ ${n} ≈ 2 ÷ π<br><br>
          π ≈ 2 × ${n} ÷ ${c} = <b>${fmt(pi, 4)}</b>
        </div>
        ${pending() ? `<p class="muted">${pending()} rod${pending() > 1 ? 's are' : ' is'} still in the air, so they aren’t counted.</p>` : ''}`,
      buttons: [
        { label: 'Add to my tracker', value: 'add', primary: true },
        { label: 'Not yet', value: null },
      ],
    });
    if (v !== 'add') return;
    st.calcs.push({ crossing: c, total: n, pi });
    tracker.addFound(pi, `Buffon’s needle — ${n} rod${n > 1 ? 's' : ''}`);
    ui.toast(`π ≈ <b>${fmt(pi, 4)}</b> from ${n} rods. Added to your tracker.`, 3200);
    game.refreshHud();
    if (!st.unlocked && n >= UNLOCK) {
      st.unlocked = true;
      markStageDone(ID, si);
      await play(D.enoughDropped, { value: fmt(pi, 3), total: n });
    } else if (st.calcs.length === 1 && !st.unlocked) {
      await play(D.firstCalculation, { value: fmt(pi, 3), total: n });
    }
  }

  function onKey(e) {
    if (e.code === 'KeyC') game.run(calculate);
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${EIGHT.name} first.`);
    const ok = await ui.choice({
      title: 'Clear the field?',
      text: 'All the rods on the laser lanes disappear and the counts go back to zero (your π tracker keeps its values).',
      options: [
        { label: 'Yes, clear it', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!ok) return;
    st.landed = [];
    st.flying = [];
    st.crossing = 0;
    game.refreshHud();
    ui.toast('The field is clear.');
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const n = total(), c = st.crossing;
    const counts = `<h3>Rods on the laser lanes</h3>
      <div class="counters">
        <div class="counter"><span class="num">${c}</span><span class="lbl">crossing a lane</span></div>
        <div class="counter"><span class="num">${n}</span><span class="lbl">dropped</span></div>
      </div>
      ${pending() ? `<p class="muted">${pending()} still in the air…</p>` : ''}
      <p>Carrying: <b>${st.carrying}</b></p>
      <div class="formula small">rod length = lane gap<br>π ≈ 2 × dropped ÷ crossing<br>Press ${key('C')} to calculate</div>`;
    const calcs = st.calcs.length
      ? `<h3>Your calculations</h3><ol class="results">${st.calcs
          .slice(-6)
          .map((x) => `<li>${x.total} rods → <b>${fmt(x.pi, 4)}</b></li>`)
          .join('')}</ol>`
      : '';
    let mission;
    if (!st.briefed) mission = `<p>Talk to <b>${EIGHT.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
    else if (st.unlocked) mission = `<p class="muted">The warp gate is open. Drop more rods for a better estimate, or take the gate.</p>`;
    else mission = `<p class="muted">Take rods from the crates at the bottom, scatter them from next to the field, then calculate. A calculation with at least ${UNLOCK} rods opens the warp gate.</p>`;
    return `<h3>Mission</h3>${mission}${counts}${calcs}`;
  }

  // ------------------------------------------------------------ drawing
  /** Line segment for a rod centred at (x, y) grid units, at angle a, in pixels. */
  function rodEnds(r, x, y, a, len = ROD) {
    const dx = (Math.cos(a) * len) / 2, dy = (Math.sin(a) * len) / 2;
    return [r.gx(x - dx), r.gy(y - dy), r.gx(x + dx), r.gy(y + dy)];
  }

  function drawField(r, t) {
    const ctx = r.ctx, T = r.T;
    const x0 = r.gx(FIELD.x), y0 = r.gy(FIELD.y), w = FIELD.w * T, h = FIELD.h * T;
    ctx.save();
    ctx.fillStyle = BS.fieldFill;
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = BS.fieldEdge;
    ctx.lineWidth = 1;
    ctx.setLineDash([T * 0.15, T * 0.15]);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);
    // the laser lanes: a little wider than the field so rods poking out still sit on a lane
    ctx.strokeStyle = BS.lane;
    ctx.shadowColor = BS.laneGlow;
    ctx.shadowBlur = T * (0.3 + 0.12 * Math.sin(t / 350));
    ctx.lineWidth = Math.max(1.5, T * 0.06);
    for (const ly of LANES) {
      ctx.beginPath();
      ctx.moveTo(r.gx(FIELD.x - 0.6), r.gy(ly));
      ctx.lineTo(r.gx(FIELD.x + FIELD.w + 0.6), r.gy(ly));
      ctx.stroke();
    }
    ctx.restore();
    // a ruler on the left edge: one rod stood up between two lanes, to show rod length = lane gap
    const rx = r.gx(FIELD.x - 0.35);
    ctx.save();
    ctx.strokeStyle = BS.ruler;
    ctx.lineWidth = Math.max(2, T * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, r.gy(LANES[0]) + 2);
    ctx.lineTo(rx, r.gy(LANES[1]) - 2);
    ctx.stroke();
    ctx.restore();
    r.text('rod', rx - T * 0.35, r.gy(LANES[0] + GAP / 2), { size: 0.22, color: BS.ruler, align: 'right' });
    r.text('LASER LANES', x0 + w / 2, y0 - T * 1.35, { size: 0.26, color: r.style.muted });

    // landed rods: plain ones first, then the crossing ones glowing on top
    const many = st.landed.length > 600;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, T * (many ? 0.035 : 0.06));
    for (const want of [false, true]) {
      ctx.strokeStyle = want ? BS.cross : BS.rod;
      if (want && !many) {
        ctx.shadowColor = BS.crossGlow;
        ctx.shadowBlur = T * 0.15;
      }
      ctx.beginPath();
      for (const l of st.landed) {
        if (l.cross !== want) continue;
        const [ax, ay, bx, by] = rodEnds(r, l.x, l.y, l.a);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCrates(r, t) {
    const ctx = r.ctx, T = r.T;
    for (const c of CRATES) {
      const x0 = r.gx(c.x + 0.08), y0 = r.gy(c.y + 0.2), w = T * 0.84, h = T * 0.66;
      ctx.save();
      ctx.fillStyle = BS.crate;
      ctx.strokeStyle = BS.crateEdge;
      ctx.shadowColor = BS.crateEdge;
      ctx.shadowBlur = T * (0.15 + 0.1 * Math.sin(t / 500 + c.x));
      ctx.lineWidth = 2;
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeRect(x0, y0, w, h);
      ctx.shadowBlur = 0;
      // rods poking out of the top
      const rng = mulberry32(c.count * 13);
      const shown = Math.min(c.count, c.count === 1 ? 1 : c.count === 10 ? 5 : 9);
      ctx.strokeStyle = BS.rod;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, T * (c.count === 100 ? 0.035 : 0.06));
      ctx.beginPath();
      for (let i = 0; i < shown; i++) {
        const px = x0 + w * (shown === 1 ? 0.5 : 0.15 + (0.7 * i) / (shown - 1));
        const tilt = (rng() - 0.5) * 0.5;
        ctx.moveTo(px, y0 + h * 0.5);
        ctx.lineTo(px + Math.sin(tilt) * T * 0.4, y0 - T * 0.25);
      }
      ctx.stroke();
      ctx.restore();
      r.text(`×${c.count}`, r.gx(c.x + 0.5), r.gy(c.y + 0.6), { size: 0.26, color: BS.label, weight: 800 });
    }
  }

  function drawFlying(r, now) {
    const ctx = r.ctx, T = r.T;
    ctx.save();
    ctx.strokeStyle = BS.flying;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, T * 0.06);
    ctx.beginPath();
    for (const f of st.flying) {
      const q = flyingPos(f, now);
      if (!q) continue;
      const [ax, ay, bx, by] = rodEnds(r, q.x, q.y, q.a);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawFloor(r, t) {
    drawField(r, t);
    drawCrates(r, t);
  }

  function drawOver(r, t, pp) {
    drawFlying(r, performance.now());
    if (st.carrying) {
      const ctx = r.ctx, T = r.T;
      const cx = r.ax(pp.x), cy = r.ay(pp.y - 0.8);
      ctx.save();
      ctx.strokeStyle = BS.rod;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, T * 0.06);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(cx - T * 0.35, cy + i * T * 0.07 + Math.sin(t / 400) * 2);
        ctx.lineTo(cx + T * 0.35, cy + i * T * 0.07 - Math.sin(t / 400) * 2);
      }
      ctx.stroke();
      ctx.restore();
      r.text(`×${st.carrying}`, r.ax(pp.x + 0.5), cy, { size: 0.28, align: 'left', weight: 800, color: BS.label });
    }
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const p = game.player;
    if (crateNear(p)) r.bubble(p.x, p.y - 1.1, 'Enter: take rods');
    else if (st.carrying && nextToField(p)) r.bubble(p.x, p.y - 1.1, 'Enter: scatter');
  }

  return {
    title: 'Laser Lanes',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'eight', name: EIGHT.name, sprite: EIGHT.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Calculate π using at least ${UNLOCK} rods to power up the warp gate.` },
    help: `<p>Take rods from the crates along the bottom (×1, ×10 or ×100) with ${key('Enter')}.
      Walk next to the laser lanes and press ${key('Enter')} to scatter everything you're carrying. Each rod lands somewhere random, pointing in a random direction.</p>
      <p>${key('C')} counts the rods and calculates π ≈ 2 × dropped ÷ crossing. The answer goes to your tracker.
      If you're standing next to ${EIGHT.name}, ${key('Enter')} talks instead.</p>
      <p>${key('R')} clears the field.</p>`,
    state: st, // exposed for debugging / tests
    blocked: (x, y) => inField(x, y) || isCrate(x, y),
    onAction,
    onKey,
    tick: updateFlying,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

/** One simulated player: drops 100 to 1000 rods, then calculates. */
function simulate(si, rng) {
  const n = 100 * (1 + Math.floor(rng() * 10));
  let c = 0;
  for (let i = 0; i < n; i++) if (crosses(FIELD.y + rng() * FIELD.h, rng() * Math.PI)) c++;
  return piFrom(Math.max(1, c), n);
}

export default {
  id: ID,
  number: 8,
  title: 'Level 8 · The Laser Lanes',
  method: 'Buffon’s needle: π ≈ 2 × dropped ÷ crossing',
  style: 'buffon',
  stageCount: 1,
  stageName: () => 'Laser Lanes',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 8)', si: 0 },
    { label: 'Briefed, empty field', si: 0, opts: { briefed: true } },
    { label: 'Briefed, 1000 rods already dropped', si: 0, opts: { preload: 1000 } },
  ],
  simulate,
  simulateNote: 'Each simulated player drops between 100 and 1000 rods (in hundreds) and calculates once.',
};
