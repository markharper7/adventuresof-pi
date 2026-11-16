// LEVEL 3 — The Asteroid Belt: random sampling (Monte Carlo).
//
// A square force field sits in the middle of the map with a circle drawn inside
// it, touching all four sides (radius r, square side 2r). The map is ringed by an
// asteroid belt (the shared boundary, kind 'asteroids', one square thick).
// Three marked safe spots on the belt let π pick up small rocks: 1, 10 or 100 at a time. Walk up to the force field and press Enter to throw them all in.
//
// Each rock's FINAL landing spot is taken from a queue of uniformly random points
// in the square, worked out in advance. The flight and bounce are just for show.
// Then:
//   in circle / in square = πr² / (2r)² = π / 4    so    π ≈ 4 × in circle ÷ in square
// The player presses C at any time to calculate. Each calculation goes to the tracker tray.
// The warp gate opens after a calculation that uses at least UNLOCK asteroids.
// (Dialogue: npc_dialogue.js → level3.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, cheb, clamp, mulberry32 } from '../core/utils.js';
import { ASTEROID_STYLE as AS } from '../../assets/theme.js';

const ID = 'asteroids';
const COLS = 28, ROWS = 18;
const SQ = { x: 9, y: 4, size: 10 };        // force field: tiles x 9..18, y 4..13 (raw grid units)
const UNLOCK = 100;                         // asteroids in a calculation needed to open the warp gate
const MAX_IN_FIELD = 5000;                  // keep drawing fast
const MAX_CARRY = 500;
const SPOTS = [
  { id: 'pebble', count: 1, x: 0, y: 4, name: 'a pebble', size: 0.32 },
  { id: 'gravel', count: 10, x: 22, y: 0, name: '10 bits of gravel', size: 0.14 },
  { id: 'dust', count: 100, x: 27, y: 13, name: '100 grains of space dust', size: 0.05 },
];
const NPC_POS = { x: 4, y: 9 };
const PLAYER_START = { x: 3, y: 12 };
const GATE = { x: 24, y: 15 };
const D = DIALOGUE.level3;
const THREE = CHARACTERS.three;

const inSquare = (x, y) => x >= SQ.x && x < SQ.x + SQ.size && y >= SQ.y && y < SQ.y + SQ.size;
const nextToSquare = (p) => p.x >= SQ.x - 1 && p.x <= SQ.x + SQ.size && p.y >= SQ.y - 1 && p.y <= SQ.y + SQ.size;
/** u, v in [0, 1): position inside the square. Inside the circle if within 0.5 of the centre. */
const insideCircle = (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 <= 0.25;
const piFrom = (inside, total) => (4 * inside) / total;

/** A fresh, unpredictable stream of landing spots (uniform over the square). */
function landingStream() {
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
  return () => {
    const u = rng(), v = rng();
    return { u, v, inside: insideCircle(u, v) };
  };
}

function createStage(game, si, opts = {}) {
  const nextLanding = landingStream();
  const st = {
    briefed: !!opts.briefed || !!opts.preload,
    carrying: 0,
    landed: [],        // { u, v, inside }
    flying: [],        // rocks in the air: { land, start, from, entry, bounce }
    inside: 0,
    calcs: [],         // { inside, total, pi }
    unlocked: false,
  };
  if (opts.preload) {
    for (let i = 0; i < opts.preload; i++) land(nextLanding());
  }
  const total = () => st.landed.length;
  const pending = () => st.flying.length;

  function land(l) {
    st.landed.push(l);
    if (l.inside) st.inside++;
  }

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      return play(D.intro);
    }
    if (st.unlocked) return play(D.again);
    if (!total() && !pending()) return play(D.nothingThrownYet);
    if (!st.calcs.length) return play(D.notCalculatedYet);
    const last = st.calcs[st.calcs.length - 1];
    return play(D.firstCalculation, { value: fmt(last.pi, 3), total: last.total });
  }

  // ------------------------------------------------------------ actions
  const spotNear = (p) => SPOTS.find((s) => cheb(s, p) <= 1);

  async function onAction() {
    const p = game.player;
    const spot = spotNear(p);
    if (spot) {
      if (!st.briefed) return ui.toast(`Those rocks look dangerous. Talk to ${THREE.name} first.`), true;
      if (st.carrying + spot.count > MAX_CARRY) return ui.toast(`You can’t carry any more. Throw some into the force field first.`), true;
      st.carrying += spot.count;
      ui.toast(`Picked up ${spot.name}. Carrying <b>${st.carrying}</b>.`);
      game.refreshHud();
      return true;
    }
    if (nextToSquare(p)) {
      if (!st.carrying) {
        ui.toast(st.briefed ? 'Pick up some rocks from the marked spots in the asteroid belt first.' : `Talk to ${THREE.name} first.`);
        return true;
      }
      throwAll(p);
      return true;
    }
    return false;
  }

  function throwAll(p) {
    if (total() + pending() + st.carrying > MAX_IN_FIELD) {
      ui.toast(`The force field can only hold ${MAX_IN_FIELD} asteroids. Press ${key('R')} to clear it.`, 4000);
      return;
    }
    const n = st.carrying;
    st.carrying = 0;
    const now = performance.now();
    const spread = Math.min(1600, n * 45); // a stream of rocks for big handfuls
    const from = { x: p.x + 0.5, y: p.y + 0.5 };
    // where the rocks enter the field: the nearest point on its edge
    const entry = { x: clamp(from.x, SQ.x, SQ.x + SQ.size), y: clamp(from.y, SQ.y, SQ.y + SQ.size) };
    for (let i = 0; i < n; i++) {
      st.flying.push({
        land: nextLanding(), // the predetermined random landing spot: the only thing the maths uses
        start: now + (n > 1 ? (i / n) * spread : 0),
        from,
        entry: { x: entry.x + (Math.random() - 0.5) * 0.8, y: entry.y + (Math.random() - 0.5) * 0.8 },
        bounce: { x: SQ.x + Math.random() * SQ.size, y: SQ.y + Math.random() * SQ.size }, // just for show
      });
    }
    ui.toast(`Threw ${n} asteroid${n > 1 ? 's' : ''} into the force field!`);
    game.refreshHud();
  }

  // Flight timings (ms): to the field edge, a bounce, then sliding to rest.
  const T1 = 320, T2 = 260, T3 = 420;
  function updateFlying(now) {
    if (!st.flying.length) return;
    let changed = false;
    st.flying = st.flying.filter((f) => {
      if (now - f.start < T1 + T2 + T3) return true;
      land(f.land);
      changed = true;
      return false;
    });
    if (changed) game.refreshHud();
  }

  function flyingPos(f, now) {
    const t = now - f.start;
    if (t < 0) return null;
    const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    const final = { x: SQ.x + f.land.u * SQ.size, y: SQ.y + f.land.v * SQ.size };
    if (t < T1) {
      const k = t / T1, q = lerp(f.from, f.entry, k);
      return { x: q.x, y: q.y - Math.sin(k * Math.PI) * 1.2 }; // a little arc
    }
    if (t < T1 + T2) return lerp(f.entry, f.bounce, (t - T1) / T2);
    const k = clamp((t - T1 - T2) / T3, 0, 1);
    return lerp(f.bounce, final, k * (2 - k)); // ease out to rest
  }

  // ------------------------------------------------------------ calculate (C)
  async function calculate() {
    if (!st.briefed) return ui.toast(`Talk to ${THREE.name} first.`);
    const n = total(), a = st.inside;
    if (!n) return ui.toast(pending() ? 'Wait for the asteroids to land…' : 'Throw some asteroids into the force field first.');
    const pi = piFrom(a, n);
    const v = await ui.panel({
      title: 'Count up the asteroids',
      html: `<p>Every asteroid landed somewhere random in the square. Some are in the circle, some in the corners.</p>
        <div class="formula">
          in circle ÷ in square = area of circle ÷ area of square<br>
          ${a} ÷ ${n} = πr² ÷ (2r)² = π ÷ 4<br><br>
          π ≈ 4 × ${a} ÷ ${n} = <b>${fmt(pi, 4)}</b>
        </div>
        ${pending() ? `<p class="muted">${pending()} asteroid${pending() > 1 ? 's are' : ' is'} still flying, so they aren’t counted.</p>` : ''}`,
      buttons: [
        { label: 'Add to my tracker', value: 'add', primary: true },
        { label: 'Not yet', value: null },
      ],
    });
    if (v !== 'add') return;
    st.calcs.push({ inside: a, total: n, pi });
    tracker.addFound(pi, `Asteroid sampling — ${n} asteroid${n > 1 ? 's' : ''}`);
    ui.toast(`π ≈ <b>${fmt(pi, 4)}</b> from ${n} asteroids. Added to your tracker.`, 3200);
    game.refreshHud();
    if (!st.unlocked && n >= UNLOCK) {
      st.unlocked = true;
      markStageDone(ID, si);
      await play(D.enoughThrown, { value: fmt(pi, 3), total: n });
    } else if (st.calcs.length === 1 && !st.unlocked) {
      await play(D.firstCalculation, { value: fmt(pi, 3), total: n });
    }
  }

  function onKey(e) {
    if (e.code === 'KeyC') game.run(calculate);
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${THREE.name} first.`);
    const ok = await ui.choice({
      title: 'Clear the force field?',
      text: 'All the asteroids in the square disappear and the counts go back to zero (your π tracker keeps its values).',
      options: [
        { label: 'Yes, clear it', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!ok) return;
    st.landed = [];
    st.flying = [];
    st.inside = 0;
    game.refreshHud();
    ui.toast('The force field is empty.');
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const n = total(), a = st.inside;
    const counts = `<h3>Asteroids in the force field</h3>
      <div class="counters">
        <div class="counter"><span class="num">${a}</span><span class="lbl">in circle</span></div>
        <div class="counter"><span class="num">${n}</span><span class="lbl">in square</span></div>
      </div>
      ${pending() ? `<p class="muted">${pending()} still flying…</p>` : ''}
      <p>Carrying: <b>${st.carrying}</b></p>
      <div class="formula small">π ≈ 4 × in circle ÷ in square<br>Press ${key('C')} to calculate</div>`;
    const calcs = st.calcs.length
      ? `<h3>Your calculations</h3><ol class="results">${st.calcs
          .slice(-6)
          .map((c) => `<li>${c.total} asteroids → <b>${fmt(c.pi, 4)}</b></li>`)
          .join('')}</ol>`
      : '';
    let mission;
    if (!st.briefed) mission = `<p>Talk to <b>${THREE.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
    else if (st.unlocked) mission = `<p class="muted">The warp gate is open. Throw more for a better estimate, or take the gate.</p>`;
    else mission = `<p class="muted">Pick up rocks at the glowing spots in the belt, throw them in from next to the force field, then calculate. A calculation with at least ${UNLOCK} asteroids opens the warp gate.</p>`;
    return `<h3>Mission</h3>${mission}${counts}${calcs}`;
  }

  // ------------------------------------------------------------ drawing
  function rock(ctx, px, py, rad, rot, shape) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.beginPath();
    shape.forEach((s, i) => {
      const a = (i / shape.length) * Math.PI * 2;
      const fn = i ? 'lineTo' : 'moveTo';
      ctx[fn](Math.cos(a) * rad * s, Math.sin(a) * rad * s);
    });
    ctx.closePath();
    const g = ctx.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.1, 0, 0, rad);
    g.addColorStop(0, AS.rockLight);
    g.addColorStop(0.6, AS.rock);
    g.addColorStop(1, AS.rockDark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  const ROUND = [1, 0.85, 1, 0.9, 1, 0.8, 0.95];

  function drawSpots(r, t) {
    const ctx = r.ctx, T = r.T;
    // (the belt itself is the shared map boundary — see core/boundary.js; here are just the safe spots)
    for (const s of SPOTS) {
      const cx = r.gx(s.x + 0.5), cy = r.gy(s.y + 0.5);
      ctx.save();
      ctx.strokeStyle = AS.spotRing;
      ctx.shadowColor = AS.spotRing;
      ctx.shadowBlur = T * 0.3;
      ctx.lineWidth = 2;
      ctx.setLineDash([T * 0.12, T * 0.1]);
      ctx.lineDashOffset = -t / 60;
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      const rng = mulberry32(s.count * 7);
      const shown = Math.min(s.count, 40);
      for (let i = 0; i < shown; i++) {
        const a = rng() * 6.28, d = s.count === 1 ? 0 : Math.sqrt(rng()) * 0.33;
        rock(ctx, cx + Math.cos(a + t / 3000) * d * T, cy + Math.sin(a + t / 3000) * d * T, s.size * T, rng() * 6 + t / 2000, ROUND);
      }
      // label towards the inside of the map
      const lx = s.x === 0 ? s.x + 1.6 : s.x === COLS - 1 ? s.x - 0.6 : s.x + 0.5;
      const ly = s.y === 0 ? s.y + 1.5 : s.y === ROWS - 1 ? s.y - 0.5 : s.y + 0.5;
      r.text(`×${s.count}`, r.gx(lx), r.gy(ly), { size: 0.34, color: AS.spotRing, weight: 800 });
    }
  }

  function drawField(r, t) {
    const ctx = r.ctx, T = r.T;
    const x0 = r.gx(SQ.x), y0 = r.gy(SQ.y), w = SQ.size * T;
    ctx.save();
    ctx.fillStyle = AS.fieldFill;
    ctx.fillRect(x0, y0, w, w);
    ctx.strokeStyle = AS.field;
    ctx.shadowColor = AS.field;
    ctx.shadowBlur = T * (0.4 + 0.15 * Math.sin(t / 400));
    ctx.lineWidth = Math.max(2, T * 0.08);
    ctx.strokeRect(x0, y0, w, w);
    ctx.shadowBlur = 0;
    // the circle inside, touching all four sides
    ctx.strokeStyle = AS.circle;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([T * 0.2, T * 0.12]);
    ctx.beginPath();
    ctx.arc(x0 + w / 2, y0 + w / 2, w / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // landed asteroids
    const many = st.landed.length > 600;
    const rad = Math.max(1.2, T * (many ? 0.05 : 0.08));
    for (const want of [false, true]) {
      ctx.fillStyle = want ? AS.inside : AS.outside;
      ctx.beginPath();
      for (const l of st.landed) {
        if (l.inside !== want) continue;
        const px = x0 + l.u * w, py = y0 + l.v * w;
        ctx.moveTo(px + rad, py);
        ctx.arc(px, py, rad, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
    r.text('FORCE FIELD', x0 + w / 2, y0 - T * 0.3, { size: 0.26, color: r.style.muted });
  }

  function drawFlying(r, now) {
    const ctx = r.ctx, T = r.T;
    ctx.save();
    for (const f of st.flying) {
      const q = flyingPos(f, now);
      if (!q) continue;
      ctx.fillStyle = AS.trail;
      ctx.beginPath();
      ctx.arc(r.gx(q.x), r.gy(q.y), Math.max(1.5, T * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloor(r, t) {
    drawField(r, t);
    drawSpots(r, t);
  }

  function drawOver(r, t, pp) {
    drawFlying(r, performance.now());
    if (st.carrying) {
      rock(r.ctx, r.ax(pp.x), r.ay(pp.y - 0.78), r.T * 0.2, t / 700, ROUND);
      r.text(`×${st.carrying}`, r.ax(pp.x + 0.45), r.ay(pp.y - 0.78), { size: 0.28, align: 'left', weight: 800, color: AS.inside });
    }
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const p = game.player;
    if (spotNear(p)) r.bubble(p.x, p.y - 1.1, 'Enter: pick up');
    else if (st.carrying && nextToSquare(p)) r.bubble(p.x, p.y - 1.1, 'Enter: throw');
  }

  return {
    title: 'Asteroid Belt',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'three', name: THREE.name, sprite: THREE.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Calculate π using at least ${UNLOCK} asteroids to power up the warp gate.` },
    help: `<p>Pick up rocks at the glowing spots in the asteroid belt (×1, ×10 or ×100) with ${key('Enter')}.
      Walk next to the force field and press ${key('Enter')} to throw everything you're carrying. Each one lands somewhere random in the square.</p>
      <p>${key('C')} counts the asteroids and calculates π ≈ 4 × in circle ÷ in square. The answer goes to your tracker.
      If you're standing next to ${THREE.name}, ${key('Enter')} talks instead.</p>
      <p>${key('R')} clears the force field.</p>`,
    state: st, // exposed for debugging / tests
    blocked: inSquare,
    boundary: { thickness: 1, clear: SPOTS }, // the asteroid belt: one square thick, kept clear at the safe spots
    onAction,
    onKey,
    tick: updateFlying,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

/** One simulated player: throws 100 to 1000 asteroids, then calculates. */
function simulate(si, rng) {
  const n = 100 * (1 + Math.floor(rng() * 10));
  let a = 0;
  for (let i = 0; i < n; i++) if (insideCircle(rng(), rng())) a++;
  return piFrom(a, n);
}

export default {
  id: ID,
  number: 3,
  title: 'Level 3 · The Asteroid Belt',
  method: 'Random sampling: π ≈ 4 × in circle ÷ in square',
  style: 'belt',
  stageCount: 1,
  stageName: () => 'Asteroid Belt',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 3)', si: 0 },
    { label: 'Briefed, empty force field', si: 0, opts: { briefed: true } },
    { label: 'Briefed, 1000 asteroids already thrown', si: 0, opts: { preload: 1000 } },
  ],
  simulate,
  simulateNote: 'Each simulated player throws between 100 and 1000 asteroids (in hundreds) and calculates once.',
};
