// LEVEL 4 — The Polygon Projector: Archimedes' method.
//
// A circle of radius r = 1 (diameter 2) is projected in the middle of the map.
// 4 first walks through a demonstration and the drawing changes with each part
// (dialogue is docked at the bottom so the drawing stays visible):
//   circle → hexagon inside → split into triangles → halve one (right angle) →
//   formula → polygon outside.
// Inside polygon (n sides): half a side = r·sin(180°/n), so
//   perimeter ÷ diameter = n·2r·sin(180°/n) ÷ 2r = n × sin(180° ÷ n)    (too small)
// Outside polygon: half a side = r·tan(180°/n), so  π ≈ n × tan(180° ÷ n)  (too big)
//
// After that the player uses the polygon projector: pick n (3 to MAX_SIDES), work
// out the half-angle, then n × sin(angle) (the computer gives sin to 6 places),
// and optionally n × tan(angle) for the outside polygon. Each answer goes to the tracker.
// The warp gate opens once a polygon with at least UNLOCK_SIDES sides has been done.
// (Dialogue: npc_dialogue.js → level4.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, cheb, parseNum } from '../core/utils.js';
import { POLYGON_STYLE as PS } from '../../assets/theme.js';

const ID = 'polygons';
const COLS = 26, ROWS = 16;
const C = { x: 17, y: 8 };        // circle centre (raw grid units)
const R = 6.3;                    // circle radius in tiles (r = 1 in the maths)
const MAX_SIDES = 100;            // past ~100 sides the polygon is indistinguishable from the circle
const UNLOCK_SIDES = 10;
const NPC_POS = { x: 5, y: 6 };
const CONSOLE = { x: 5, y: 10 };  // the polygon projector's control desk
const PLAYER_START = { x: 2, y: 8 };
const GATE = { x: 2, y: 13 };
const INSET = { x: 0.4, y: 0.35, w: 8.2, h: 4.1 }; // zoomed-in view of one side
const DEMO_ORDER = ['circle', 'inside', 'triangles', 'halve', 'formula', 'outside'];
const D = DIALOGUE.level4;
const FOUR = CHARACTERS.four;

const DEG = Math.PI / 180;
const halfAngle = (n) => 180 / n;                          // degrees
const insidePi = (n) => n * Math.sin(halfAngle(n) * DEG);
const outsidePi = (n) => n * Math.tan(halfAngle(n) * DEG);
const deg = (a) => `${Number(a.toFixed(4))}°`;

// What the drawing shows for each part of the demo (and afterwards).
const VIEWS = {
  circle: { inside: false, outside: false, triangles: false, half: false },
  inside: { inside: true, outside: false, triangles: false, half: false },
  triangles: { inside: true, outside: false, triangles: true, half: false },
  halve: { inside: true, outside: false, triangles: true, half: true },
  formula: { inside: true, outside: false, triangles: false, half: true },
  outside: { inside: true, outside: true, triangles: false, half: true },
  play: { inside: true, outside: true, triangles: false, half: true },
};

function createStage(game, si, opts = {}) {
  const st = {
    briefed: !!opts.briefed || !!opts.sides,
    view: opts.briefed || opts.sides ? 'play' : 'circle',
    n: opts.sides || 6,
    tries: [],              // { n, inside, outside }   (outside null if not done)
    unlocked: false,
    changedAt: 0,           // for a little "projector" flash when n changes
  };
  if (opts.sides) {
    st.tries.push({ n: opts.sides, inside: insidePi(opts.sides), outside: outsidePi(opts.sides) });
    if (opts.sides >= UNLOCK_SIDES) {
      st.unlocked = true;
      markStageDone(ID, si);
    }
  }
  const nearConsole = (p) => cheb(CONSOLE, p) <= 1;

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) return demo();
    if (st.unlocked) return play(D.again);
    return play(D.howAreYouGettingOn);
  }

  async function demo() {
    st.n = 6;
    for (const step of DEMO_ORDER) {
      st.view = step;
      st.changedAt = performance.now();
      await play(D.demo[step], {}, { dock: true });
    }
    st.view = 'play';
    st.briefed = true;
    game.refreshHud();
  }

  // ------------------------------------------------------------ the projector
  async function onAction() {
    if (!nearConsole(game.player)) return false;
    if (!st.briefed) {
      ui.toast(`The projector is locked. Talk to ${FOUR.name} first.`);
      return true;
    }
    await useProjector();
    return true;
  }

  async function useProjector() {
    // 1. how many sides?
    const pick = await ui.form({
      title: 'Polygon projector',
      html: `<p>How many sides should the polygons have? Anything from 3 to ${MAX_SIDES}.</p>
        ${st.unlocked ? '' : `<p class="muted">Try at least one with ${UNLOCK_SIDES} or more sides.</p>`}`,
      fields: [{ id: 'n', label: 'Number of sides n', value: String(suggestNext()) }],
      buttons: [
        { label: 'Project it', value: 'ok', primary: true },
        { label: 'Cancel', value: null, cancel: true, skipValidate: true },
      ],
      validate: (v) => {
        const n = parseNum(v.n);
        if (n === null || !Number.isInteger(n)) return 'Please enter a whole number of sides.';
        if (n < 3) return 'A polygon needs at least 3 sides.';
        if (n > MAX_SIDES) return `The projector can only manage up to ${MAX_SIDES} sides.`;
        return null;
      },
    });
    if (!pick || pick.button !== 'ok') return;
    const n = parseNum(pick.values.n);
    st.n = n;
    st.changedAt = performance.now();
    const a = halfAngle(n);

    // 2. the angle in the right-angled triangle
    const ang = await ui.form({
      title: `${n} sides: the angle`,
      html: `<p>A full turn is 360°. Split the polygon into ${n} triangles, then cut one in half to get a right-angled triangle.</p>
        <div class="formula">angle = 360° ÷ ${n} ÷ 2 = <span class="blank">?</span></div>`,
      fields: [{ id: 'a', label: 'Angle in degrees' }],
      buttons: [
        { label: 'Check', value: 'ok', primary: true },
        { label: 'Cancel', value: null, cancel: true, skipValidate: true },
      ],
      validate: (v, attempt) => {
        const x = parseNum(v.a);
        if (x === null) return 'Please enter a number.';
        if (Math.abs(x - a) > 0.01) return attempt >= 2 ? `360 ÷ ${n} = ${fmt(360 / n, 3)}, and half of that is <b>${deg(a)}</b>.` : `Not quite. First 360 ÷ ${n}, then halve it.`;
        return null;
      },
    });
    if (!ang || ang.button !== 'ok') return;

    // 3. inside polygon
    const s = Math.sin(a * DEG);
    const inPi = await askPi({
      n,
      title: `${n} sides: polygon inside the circle`,
      fn: 'sin',
      value: s,
      exact: insidePi(n),
      explain: `Half of one side = r × sin(${deg(a)}). With r = 1, the ship’s computer says:`,
    });
    if (inPi === null) return;
    const entry = { n, inside: inPi, outside: null };
    st.tries.push(entry);
    tracker.addFound(inPi, `Archimedes — ${n} sides, inside`);
    game.refreshHud();

    // 4. outside polygon (optional)
    const more = await ui.choice({
      title: 'And the polygon outside?',
      text: `π ≈ <b>${fmt(inPi, 5)}</b> from the polygon inside. Now try the polygon outside the circle?`,
      options: [
        { label: 'Yes, the outside polygon too', value: true },
        { label: 'Not this time', value: false },
      ],
      cancelValue: false,
    });
    if (more) {
      const t = Math.tan(a * DEG);
      const outPi = await askPi({
        n,
        title: `${n} sides: polygon outside the circle`,
        fn: 'tan',
        value: t,
        exact: outsidePi(n),
        explain: `Each side of the outside polygon just touches the circle. Half of one side = r × tan(${deg(a)}). With r = 1:`,
      });
      if (outPi !== null) {
        entry.outside = outPi;
        tracker.addFound(outPi, `Archimedes — ${n} sides, outside`);
        game.refreshHud();
      }
    }

    if (!st.unlocked && n >= UNLOCK_SIDES) {
      st.unlocked = true;
      markStageDone(ID, si);
      game.refreshHud();
      await play(D.tenSidesDone, { n, value: fmt(inPi, 4) });
    }
  }

  /** Ask the player for n × sin (or tan). Returns the value to record (to 6 places), or null if cancelled. */
  async function askPi({ n, title, fn, value, exact, explain }) {
    const a = halfAngle(n);
    const v6 = value.toFixed(6);
    const res = await ui.form({
      title,
      html: `<p>${explain}</p>
        <div class="formula">
          ${fn}(${deg(a)}) = ${v6}<br>
          perimeter = ${n} × 2 × ${v6}<br>
          π ≈ perimeter ÷ diameter = ${n} × ${fn}(${deg(a)}) = <span class="blank">?</span>
        </div>
        <p class="muted">Use a calculator if you like. Give at least 2 decimal places.</p>`,
      fields: [{ id: 'pi', label: `π ≈ ${n} × ${v6}` }],
      buttons: [
        { label: 'Check', value: 'ok', primary: true },
        { label: 'Cancel', value: null, cancel: true, skipValidate: true },
      ],
      validate: (vals, attempt) => {
        const p = parseNum(vals.pi);
        if (p === null) return 'Please enter a number.';
        if (Math.abs(p - n * Number(v6)) > 0.006) return attempt >= 2 ? `${n} × ${v6} = <b>${fmt(n * Number(v6), 4)}</b>` : `Not quite. Multiply ${n} by ${v6}.`;
        return null;
      },
    });
    if (!res || res.button !== 'ok') return null;
    const pi = Number(exact.toFixed(6));
    ui.toast(`π ≈ <b>${fmt(pi, 6)}</b> (${n} sides, ${fn === 'sin' ? 'inside' : 'outside'}). Added to your tracker.`, 3500);
    return pi;
  }

  function suggestNext() {
    if (!st.tries.length) return UNLOCK_SIDES;
    return Math.min(MAX_SIDES, st.tries[st.tries.length - 1].n * 2);
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${FOUR.name} first.`);
    const v = await ui.choice({
      title: 'Watch the demonstration again?',
      text: `${FOUR.name} will explain the method again from the start. Your results so far are kept.`,
      options: [
        { label: 'Yes, show me again', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!v) return;
    const keepN = st.n;
    await demo();
    st.n = keepN;
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    let mission;
    if (!st.briefed) mission = `<p>Talk to <b>${FOUR.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
    else if (st.unlocked) mission = `<p class="muted">The warp gate is open. Try more sides (up to ${MAX_SIDES}) at the projector, or take the gate.</p>`;
    else mission = `<p class="muted">Use the polygon projector (press ${key('Enter')} next to it). Try a polygon with at least ${UNLOCK_SIDES} sides to open the warp gate.</p>`;
    const formulas = `<h3>Formulas</h3><div class="formula small">
      angle = 180° ÷ n<br>
      <span style="color:${PS.inside}">inside:</span> π ≈ n × sin(angle)<br>
      <span style="color:${PS.outside}">outside:</span> π ≈ n × tan(angle)</div>`;
    const rows = st.tries
      .slice(-8)
      .map((t) => `<tr><td>${t.n}</td><td>${fmt(t.inside, 5)}</td><td>${t.outside === null ? '—' : fmt(t.outside, 5)}</td></tr>`)
      .join('');
    const table = st.tries.length
      ? `<h3>Your polygons</h3><table class="demo"><tr><th>n</th><th style="color:${PS.inside}">inside</th><th style="color:${PS.outside}">outside</th></tr>${rows}</table>`
      : '';
    return `<h3>Mission</h3>${mission}<h3>Projecting</h3><p><b>${st.n}</b> sides · angle ${deg(halfAngle(st.n))}</p>${formulas}${table}`;
  }

  // ------------------------------------------------------------ drawing
  const vtx = (k, n, rad) => {
    const ang = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * k) / n; // a side sits flat at the top
    return { x: C.x + Math.cos(ang) * rad, y: C.y + Math.sin(ang) * rad };
  };

  function polygonPath(r, n, rad) {
    const ctx = r.ctx;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const v = vtx(k, n, rad);
      ctx[k ? 'lineTo' : 'moveTo'](r.gx(v.x), r.gy(v.y));
    }
    ctx.closePath();
  }

  function drawFigure(r, t) {
    const ctx = r.ctx, T = r.T;
    const view = VIEWS[st.view];
    const n = st.n;
    const cx = r.gx(C.x), cy = r.gy(C.y);
    const flash = Math.max(0, 1 - (performance.now() - st.changedAt) / 600);
    ctx.save();
    ctx.lineJoin = 'round';

    // outside polygon
    const outR = R / Math.cos(Math.PI / n);
    if (view.outside) {
      polygonPath(r, n, outR);
      ctx.fillStyle = PS.outsideFill;
      ctx.fill();
      ctx.strokeStyle = PS.outside;
      ctx.lineWidth = 2 + flash * 3;
      ctx.stroke();
    }
    // circle
    ctx.strokeStyle = PS.circle;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([T * 0.18, T * 0.12]);
    ctx.beginPath();
    ctx.arc(cx, cy, R * T, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // inside polygon
    if (view.inside) {
      polygonPath(r, n, R);
      ctx.fillStyle = PS.insideFill;
      ctx.fill();
      ctx.strokeStyle = PS.inside;
      ctx.lineWidth = 2 + flash * 3;
      ctx.stroke();
    }
    // spokes: every triangle
    if (view.triangles) {
      ctx.strokeStyle = PS.inside;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const v = vtx(k, n, R);
        ctx.moveTo(cx, cy);
        ctx.lineTo(r.gx(v.x), r.gy(v.y));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // the highlighted half-triangle (top side): centre → top-left corner → middle of the top side
    if (view.half) {
      const v0 = vtx(0, n, R);
      const m = { x: C.x, y: C.y - R * Math.cos(Math.PI / n) };
      ctx.fillStyle = PS.triangle;
      ctx.strokeStyle = PS.triangleEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(r.gx(v0.x), r.gy(v0.y));
      ctx.lineTo(r.gx(m.x), r.gy(m.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // right-angle marker at the middle of the side
      const q = Math.min(T * 0.35, Math.abs(r.gx(v0.x) - r.gx(m.x)) * 0.5);
      ctx.beginPath();
      ctx.moveTo(r.gx(m.x) - q, r.gy(m.y));
      ctx.lineTo(r.gx(m.x) - q, r.gy(m.y) + q);
      ctx.lineTo(r.gx(m.x), r.gy(m.y) + q);
      ctx.stroke();
      // the angle at the centre
      const arcR = T * 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, -Math.PI / 2 - Math.PI / n, -Math.PI / 2);
      ctx.stroke();
      r.text(`${deg(halfAngle(n))}`, cx - T * 0.25, cy - arcR - T * 0.35, { size: 0.3, color: PS.label, align: 'right' });
      // r along the radius
      r.text('r = 1', r.gx((C.x + v0.x) / 2) - T * 0.35, r.gy((C.y + v0.y) / 2), { size: 0.32, color: PS.label, align: 'right' });
      // outside polygon: its half side continues the same line up to the outer corner
      if (view.outside) {
        const o0 = vtx(0, n, outR);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(r.gx(o0.x), r.gy(o0.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
    r.text(`${n} sides`, cx, r.gy(C.y + R + 0.75 > ROWS - 0.2 ? ROWS - 0.3 : C.y + R + 0.6), { size: 0.32, color: r.style.muted });
  }

  /** Zoomed view of the top side: arc vs inside side vs outside side. */
  function drawInset(r) {
    const view = VIEWS[st.view];
    if (!view.inside) return;
    const ctx = r.ctx, T = r.T, n = st.n;
    const bx = r.gx(INSET.x), by = r.gy(INSET.y), bw = INSET.w * T, bh = INSET.h * T;
    ctx.save();
    ctx.fillStyle = PS.insetBg;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, T * 0.25);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();
    // local frame: circle centre at the origin, the top side's midpoint straight up; unit = r
    const th = Math.PI / n;
    const halfW = view.outside ? Math.tan(th) : Math.sin(th);
    const scale = (bw * 0.4) / halfW;                 // pixels per unit radius
    const midY = -(1 + Math.cos(th)) / 2;              // middle of the gap between side and arc
    const X = (x) => bx + bw / 2 + x * scale;
    const Y = (y) => by + bh * 0.55 + (y - midY) * scale;
    ctx.lineWidth = 2;
    // arc of the circle
    ctx.strokeStyle = PS.circle;
    ctx.beginPath();
    const span = th * 1.25;
    for (let i = 0; i <= 60; i++) {
      const p = -span + (2 * span * i) / 60;
      const x = Math.sin(p), y = -Math.cos(p);
      ctx[i ? 'lineTo' : 'moveTo'](X(x), Y(y));
    }
    ctx.stroke();
    // inside side
    ctx.strokeStyle = PS.inside;
    ctx.beginPath();
    ctx.moveTo(X(-Math.sin(th)), Y(-Math.cos(th)));
    ctx.lineTo(X(Math.sin(th)), Y(-Math.cos(th)));
    ctx.stroke();
    // outside side
    if (view.outside) {
      ctx.strokeStyle = PS.outside;
      ctx.beginPath();
      ctx.moveTo(X(-Math.tan(th)), Y(-1));
      ctx.lineTo(X(Math.tan(th)), Y(-1));
      ctx.stroke();
    }
    ctx.restore();
    const zoom = scale / (R * T);
    r.text(`zoomed in ×${zoom < 10 ? zoom.toFixed(1) : Math.round(zoom)} on one side`, bx + T * 0.25, by + T * 0.35, {
      size: 0.26,
      color: r.style.muted,
      align: 'left',
    });
  }

  function drawConsole(r, t) {
    const ctx = r.ctx, T = r.T;
    const x = r.ax(CONSOLE.x), y = r.ay(CONSOLE.y);
    ctx.save();
    ctx.fillStyle = PS.console;
    ctx.strokeStyle = PS.consoleGlow;
    ctx.shadowColor = PS.consoleGlow;
    ctx.shadowBlur = st.briefed ? T * (0.3 + 0.2 * Math.sin(t / 300)) : 0;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - T * 0.42, y - T * 0.3, T * 0.84, T * 0.6, T * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // a little polygon on the screen
    ctx.strokeStyle = st.briefed ? PS.inside : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    const k = Math.min(st.n, 12);
    for (let i = 0; i <= k; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / k + t / 2000;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * T * 0.18, y + Math.sin(a) * T * 0.18);
    }
    ctx.stroke();
    ctx.restore();
    r.text('PROJECTOR', x, y + T * 0.6, { size: 0.24, color: r.style.muted });
  }

  function drawFloor(r, t) {
    drawFigure(r, t);
    drawInset(r);
    drawConsole(r, t);
  }

  function drawOver(r) {
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const p = game.player;
    if (nearConsole(p)) r.bubble(p.x, p.y - 1.1, 'Enter: projector');
  }

  // keep π off the projected figure (and the console)
  const blocked = (x, y) => {
    if (x === CONSOLE.x && y === CONSOLE.y) return true;
    const dx = x + 0.5 - C.x, dy = y + 0.5 - C.y;
    return Math.hypot(dx, dy) < R + 0.3;
  };

  return {
    title: 'Polygon Projector',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'four', name: FOUR.name, sprite: FOUR.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Work out π with a polygon of at least ${UNLOCK_SIDES} sides to power up the warp gate.` },
    help: `<p>Press ${key('Enter')} next to the polygon projector to choose a number of sides (3 to ${MAX_SIDES}).
      Then work out the angle (180° ÷ n) and π ≈ n × sin(angle) for the polygon inside the circle,
      and if you like π ≈ n × tan(angle) for the polygon outside.</p>
      <p>A polygon with at least ${UNLOCK_SIDES} sides opens the warp gate. ${key('R')} replays ${FOUR.name}'s demonstration.</p>`,
    state: st, // exposed for debugging / tests
    blocked,
    onAction,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

export default {
  id: ID,
  number: 4,
  title: 'Level 4 · The Polygon Projector',
  method: 'Archimedes: polygons inside and outside a circle',
  style: 'archimedes',
  stageCount: 1,
  stageName: () => 'Polygon Projector',
  createStage,
  debugJumps: () => [
    { label: 'Start (before the demonstration)', si: 0 },
    { label: 'Demonstration done, projector ready', si: 0, opts: { briefed: true } },
    { label: 'Already tried 12 sides (gate open)', si: 0, opts: { sides: 12 } },
    { label: 'Already tried 100 sides', si: 0, opts: { sides: 100 } },
  ],
  // A demo player tries one polygon with 10 to 100 sides (inside polygon).
  simulate: (si, rng) => insidePi(UNLOCK_SIDES + Math.floor(rng() * (MAX_SIDES - UNLOCK_SIDES + 1))),
  simulateNote: `The method is exact for a given n, so the spread only comes from which n (${UNLOCK_SIDES} to ${MAX_SIDES}) a player stops at. Inside polygon shown.`,
};
