// LEVEL 6 — The Beacon Survey: the Gauss circle problem.
//
// Put one beacon on the centre of every tile inside (or exactly on) a circle of radius r.
// Each beacon stands for one 1 × 1 tile, so
//     number of beacons ≈ area of the circle = π × r²      so      π ≈ count ÷ r²
// This only works because the beacons are exactly 1 apart.
//
//   1. 6 gives a demonstration (dialogue docked at the bottom, the drawing changes behind it):
//      a 4 × 4 square with beacons 1 apart (16 = area), 2 apart (4) and ½ apart (64), then the circle rule.
//   2. Three orbits, radius 1, 2 and 3, each centred on a tile, each with a survey zone around it.
//      Enter on a tile in a zone drops a beacon (Enter again picks it up). Orbits unlock in order.
//      Orbit 1 lights its beacons up straight away (green inside, red outside); orbits 2 and 3 stay
//      unchecked until the player uses the survey console underneath and enters their count.
//      Then the beacons are checked: green / red, and hollow rings for missed tile centres.
//      The true count (5, 13, 29) goes into π ≈ count ÷ r², which the player works out.
//   3. All three orbits done → the warp gate opens, and the telescope works: any radius from 1 to
//      MAX_SCOPE_R, filled in by a radar sweep, Enter records count ÷ r² to the tracker.
// (Dialogue: npc_dialogue.js → level6.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, clamp, cheb, parseNum } from '../core/utils.js';
import { LATTICE_STYLE as LS } from '../../assets/theme.js';

const ID = 'lattice';
const COLS = 32, ROWS = 18;
const ORBITS = [
  { r: 1, x: 11, y: 9 },
  { r: 2, x: 18, y: 9 },
  { r: 3, x: 27, y: 9 },
].map((o) => ({ ...o, zone: o.r + 1, console: { x: o.x, y: o.y + o.r + 3 } })); // zone: half-width of the survey zone
const DEMO = { x: 2, y: 2, size: 4 };          // the 4 × 4 demonstration square (tiles)
const NPC_POS = { x: 6, y: 9 };
const PLAYER_START = { x: 2, y: 9 };
const TELESCOPE = { x: 6, y: 14 };
const GATE = { x: 2, y: 15 };
const MAX_SCOPE_R = 50;
const SWEEP_MS = 1400;                          // telescope radar sweep
const DEMO_ORDER = ['intro', 'unit', 'wide', 'dense', 'circle', 'howTo'];
const D = DIALOGUE.level6;
const SIX = CHARACTERS.six;

const k = (x, y) => `${x},${y}`;
const unk = (s) => s.split(',').map(Number);
/** Is tile (x, y) inside or on orbit o? Its centre is (x + ½, y + ½), the orbit's centre (o.x + ½, o.y + ½). */
const isInside = (o, x, y) => (x - o.x) ** 2 + (y - o.y) ** 2 <= o.r * o.r;
/** Number of lattice points (whole-number spacing) inside or on a circle of radius r round a lattice point. */
function latticeCount(r) {
  let n = 0;
  for (let i = -r; i <= r; i++) n += 2 * Math.floor(Math.sqrt(r * r - i * i)) + 1;
  return n;
}
const piFor = (r) => latticeCount(r) / (r * r);
const inZone = (o, x, y) => Math.abs(x - o.x) <= o.zone && Math.abs(y - o.y) <= o.zone;

function createStage(game, si, opts = {}) {
  const done = clamp(opts.done || 0, 0, ORBITS.length);
  const st = {
    briefed: !!opts.briefed || done > 0,
    view: opts.briefed || done > 0 ? 'unit' : null, // demo square: null | unit | wide | dense ; 'circle' pulses orbit 1
    orbits: ORBITS.map(() => ({ beacons: new Set(), checked: false, done: false, said: null, pi: null })),
    unlocked: done === ORBITS.length,
    scope: { on: false, r: 4, sweepStart: 0, seen: false, shown: 0 }, // shown: the sweep the HUD last showed finished
    pulse: false,         // orbit 1 pulses during the demonstration
    scopeLog: [],         // { r, count, pi }
  };
  // debug jumps: orbits already surveyed perfectly
  for (let i = 0; i < done; i++) {
    const o = ORBITS[i], s = st.orbits[i];
    for (let x = o.x - o.r; x <= o.x + o.r; x++) for (let y = o.y - o.r; y <= o.y + o.r; y++) if (isInside(o, x, y)) s.beacons.add(k(x, y));
    Object.assign(s, { checked: true, done: true, said: s.beacons.size, pi: piFor(o.r) });
  }
  if (st.unlocked) markStageDone(ID, si);
  const p = () => game.player;
  const isOpen = (i) => i === 0 || st.orbits[i - 1].done;
  const zoneAt = (x, y) => ORBITS.findIndex((o) => inZone(o, x, y));
  const nearConsole = (pos) => ORBITS.findIndex((o) => cheb(o.console, pos) <= 1);
  const nearScope = (pos) => cheb(TELESCOPE, pos) <= 1;
  const live = (i) => i === 0 || st.orbits[i].checked; // are this orbit's beacons coloured green / red?

  function tally(i) {
    const o = ORBITS[i], s = st.orbits[i];
    let right = 0, wrong = 0;
    for (const b of s.beacons) (isInside(o, ...unk(b)) ? right++ : wrong++);
    const count = latticeCount(o.r);
    return { right, wrong, missed: count - right, count };
  }

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) return demo();
    if (st.unlocked) return play(D.again);
    const next = st.orbits.findIndex((s) => !s.done);
    return play(D[`orbit${next + 1}`]);
  }

  async function demo() {
    for (const part of DEMO_ORDER) {
      st.view = part === 'intro' ? null : part === 'circle' || part === 'howTo' ? 'unit' : part;
      st.pulse = part === 'circle' || part === 'howTo';
      game.refreshHud();
      await play(D.demo[part], {}, { dock: true });
    }
    st.pulse = false;
    st.view = 'unit';
    st.briefed = true;
    game.refreshHud();
  }

  // ------------------------------------------------------------ actions (Enter)
  async function onAction() {
    if (st.scope.on) return recordScope(), true;
    const me = p();
    const ci = nearConsole(me);
    if (ci >= 0) {
      if (!st.briefed) return ui.toast(`Talk to ${SIX.name} first.`), true;
      if (!isOpen(ci)) return ui.toast(`Survey orbit ${ci} first.`), true;
      await useConsole(ci);
      return true;
    }
    if (nearScope(me)) {
      if (!st.briefed) return ui.toast(`Talk to ${SIX.name} first.`), true;
      if (!st.unlocked) return ui.toast('The telescope is locked until all three orbits are surveyed.'), true;
      st.scope.on = true;
      st.scope.sweepStart = performance.now();
      game.refreshHud();
      if (!st.scope.seen) {
        st.scope.seen = true;
        await play(D.telescopeFirst, {}, { dock: true });
      }
      return true;
    }
    const zi = zoneAt(me.x, me.y);
    if (zi >= 0) {
      if (!st.briefed) return ui.toast(`Talk to ${SIX.name} before dropping beacons.`), true;
      if (!isOpen(zi)) return ui.toast(`Orbit ${zi + 1} is locked. Survey orbit ${zi} first.`), true;
      const s = st.orbits[zi], id = k(me.x, me.y);
      if (s.beacons.has(id)) s.beacons.delete(id);
      else s.beacons.add(id);
      if (zi > 0) s.checked = false; // changed: orbits 2 and 3 need checking again
      game.refreshHud();
      return true;
    }
    return false;
  }

  async function useConsole(i) {
    const o = ORBITS[i], s = st.orbits[i];
    if (s.done) {
      const v = await ui.choice({
        title: `Orbit ${i + 1} (radius ${o.r})`,
        text: `Surveyed: ${latticeCount(o.r)} beacons, π ≈ <b>${fmt(s.pi, 4)}</b>.`,
        options: [
          { label: 'Clear the beacons and survey it again', value: 'again' },
          { label: 'Leave it', value: null },
        ],
        cancelValue: null,
      });
      if (v !== 'again') return;
      Object.assign(s, { beacons: new Set(), checked: false, done: false, said: null });
      game.refreshHud();
      return ui.toast(`Orbit ${i + 1} is cleared. Drop your beacons again.`);
    }
    if (!s.checked) {
      if (!s.beacons.size) return ui.toast('Drop some beacons inside the orbit first.');
      const res = await ui.form({
        title: `Orbit ${i + 1}: count the beacons`,
        html: `<p>Count the beacons ${i === 0 ? '(the green ones)' : ''} on tile centres inside the orbit, or exactly on it.</p>
          <p class="muted">${i === 0 ? 'Red beacons are outside the orbit: they don’t count.' : `${SIX.name} will check your beacons once you’ve told them your count.`}</p>`,
        fields: [{ id: 'n', label: 'Number of beacons inside the orbit' }],
        buttons: [
          { label: 'Check my survey', value: 'ok', primary: true },
          { label: 'Cancel', value: null, cancel: true, skipValidate: true },
        ],
        validate: (v) => {
          const n = parseNum(v.n);
          if (n === null || !Number.isInteger(n) || n < 0) return 'Please enter a whole number.';
          return null;
        },
      });
      if (!res || res.button !== 'ok') return;
      s.said = parseNum(res.values.n);
      s.checked = true;
      game.refreshHud();
      const t = tally(i);
      const perfect = s.said === t.count && t.wrong === 0 && t.missed === 0;
      await play(perfect ? D.checkPerfect : D.checkFixed, { said: s.said, count: t.count }, { dock: true });
    }
    await workOutPi(i);
  }

  async function workOutPi(i) {
    const o = ORBITS[i], s = st.orbits[i];
    const n = latticeCount(o.r), r2 = o.r * o.r, exact = n / r2;
    const res = await ui.form({
      title: `Orbit ${i + 1}: work out π`,
      html: `<p>Each beacon stands for one 1 × 1 tile, so the area of the circle is about <b>${n}</b>.</p>
        <div class="formula">
          area of a circle = π × r²<br>
          ${n} ≈ π × ${o.r}²<br>
          π ≈ ${n} ÷ ${o.r}² = ${n} ÷ ${r2} = <span class="blank">?</span>
        </div>
        <p class="muted">Give at least 2 decimal places if it doesn’t come out exactly.</p>`,
      fields: [{ id: 'pi', label: `π ≈ ${n} ÷ ${r2}` }],
      buttons: [
        { label: 'Check', value: 'ok', primary: true },
        { label: 'Cancel', value: null, cancel: true, skipValidate: true },
      ],
      validate: (v, attempt) => {
        const x = parseNum(v.pi);
        if (x === null) return 'Please enter a number.';
        if (Math.abs(x - exact) > 0.006) return attempt >= 2 ? `${n} ÷ ${r2} = <b>${fmt(exact, 4)}</b>` : `Not quite. Divide ${n} by ${r2}.`;
        return null;
      },
    });
    if (!res || res.button !== 'ok') return ui.toast('Your beacons are checked. Use the console again to work out π.');
    const wasUnlocked = st.unlocked;
    s.done = true;
    s.pi = exact;
    tracker.addFound(exact, `Gauss circle — radius ${o.r}, ${n} beacons`);
    ui.toast(`π ≈ <b>${fmt(exact, 4)}</b> (radius ${o.r}). Added to your tracker.`, 3500);
    game.refreshHud();
    const value = Number.isInteger(exact) ? String(exact) : fmt(exact, 2);
    if (wasUnlocked) return play(D.orbitAgain, { value });
    if (st.orbits.every((x) => x.done)) {
      st.unlocked = true;
      markStageDone(ID, si);
      game.refreshHud();
      return play(D.allDone, { value });
    }
    if (i === 0) return play(D.orbit1Done, { value });
    if (i === 1) return play(D.orbit2Done, { value });
  }

  // ------------------------------------------------------------ telescope
  function interceptMove(dx, dy) {
    if (!st.scope.on) return false;
    const r = clamp(st.scope.r - dy + dx * 5, 1, MAX_SCOPE_R);
    if (r !== st.scope.r) {
      st.scope.r = r;
      st.scope.sweepStart = performance.now();
      game.refreshHud();
    }
    return true;
  }

  const sweepK = (now = performance.now()) => clamp((now - st.scope.sweepStart) / SWEEP_MS, 0, 1);

  function recordScope() {
    if (sweepK() < 1) return ui.toast('Wait for the scan to finish.');
    const r = st.scope.r, count = latticeCount(r), pi = count / (r * r);
    st.scopeLog.push({ r, count, pi });
    tracker.addFound(pi, `Gauss circle (telescope) — radius ${r}, ${count} beacons`);
    ui.toast(`π ≈ <b>${fmt(pi, 4)}</b> (radius ${r}, ${count} beacons). Added to your tracker.`, 3200);
    game.refreshHud();
  }

  function tick(now) {
    // refresh the sidebar once when a scan finishes
    if (st.scope.on && sweepK(now) >= 1 && st.scope.shown !== st.scope.sweepStart) {
      st.scope.shown = st.scope.sweepStart;
      game.refreshHud();
    }
  }

  function leaveScope() {
    st.scope.on = false;
    game.refreshHud();
  }

  function onKey(e) {
    if (st.scope.on && (e.code === 'Escape' || e.code === 'Backspace')) {
      e.preventDefault();
      leaveScope();
    }
  }

  async function onRestart() {
    if (st.scope.on) return leaveScope();
    if (!st.briefed) return ui.toast(`Talk to ${SIX.name} first.`);
    const zi = zoneAt(p().x, p().y);
    if (zi >= 0 && isOpen(zi) && st.orbits[zi].beacons.size) {
      const ok = await ui.choice({
        title: `Clear orbit ${zi + 1}?`,
        text: 'All the beacons round this orbit are picked up. Your π tracker keeps its values.',
        options: [
          { label: 'Yes, clear them', value: true },
          { label: 'Cancel', value: false },
        ],
        cancelValue: false,
      });
      if (ok) Object.assign(st.orbits[zi], { beacons: new Set(), checked: false, done: false, said: null });
      return;
    }
    const v = await ui.choice({
      title: 'Watch the demonstration again?',
      text: `${SIX.name} will explain the method again from the start. Your beacons are kept. (Stand next to an orbit and press ${key('R')} to clear its beacons.)`,
      options: [
        { label: 'Yes, show me again', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (v) await demo();
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    if (st.scope.on) {
      const r = st.scope.r, n = latticeCount(r);
      const rows = st.scopeLog
        .slice(-8)
        .map((l) => `<tr><td>${l.r}</td><td>${l.count}</td><td>${fmt(l.pi, 4)}</td></tr>`)
        .join('');
      return `<h3>Telescope</h3>
        <div class="counters">
          <div class="counter"><span class="num">${r}</span><span class="lbl">radius r</span></div>
          <div class="counter"><span class="num">${sweepK() < 1 ? '…' : n}</span><span class="lbl">beacons</span></div>
        </div>
        <p class="muted">${key('↑')} ${key('↓')} radius ±1 · ${key('←')} ${key('→')} ±5<br>${key('Enter')} note it down · ${key('Esc')} leave</p>
        <div class="formula small">π ≈ beacons ÷ r²</div>
        ${rows ? `<h3>Noted down</h3><table class="demo"><tr><th>r</th><th>beacons</th><th>π ≈</th></tr>${rows}</table>` : ''}`;
    }
    let mission;
    const next = st.orbits.findIndex((s) => !s.done);
    if (!st.briefed) mission = `Talk to <b>${SIX.name}</b>: walk next to them and press ${key('Enter')}.`;
    else if (st.unlocked || next < 0) mission = 'The warp gate is open. Look at bigger circles through the telescope, or take the gate.';
    else {
      const s = st.orbits[next];
      mission = s.checked
        ? `Orbit ${next + 1} is checked. Use its survey console to work out π.`
        : `Survey orbit ${next + 1} (radius ${ORBITS[next].r}): drop a beacon on every tile centre inside it or on it, then use the survey console underneath.`;
    }
    const zi = zoneAt(p().x, p().y);
    let here = '';
    if (st.briefed && zi >= 0 && isOpen(zi)) {
      const s = st.orbits[zi];
      let detail = '';
      if (live(zi)) {
        const t = tally(zi);
        detail = `<div class="counter"><span class="num" style="color:${LS.inside}">${t.right}</span><span class="lbl">inside</span></div>
          <div class="counter"><span class="num" style="color:${LS.outside}">${t.wrong}</span><span class="lbl">outside</span></div>`;
      }
      here = `<h3>Orbit ${zi + 1} · radius ${ORBITS[zi].r}</h3>
        <div class="counters"><div class="counter"><span class="num">${s.beacons.size}</span><span class="lbl">beacons dropped</span></div>${detail}</div>`;
    }
    const rows = ORBITS.map((o, i) => {
      const s = st.orbits[i];
      const status = s.done ? fmt(s.pi, 4) : !isOpen(i) ? '🔒' : s.checked ? 'checked' : '—';
      return `<tr><td>${i + 1}</td><td>${o.r}</td><td>${s.done ? latticeCount(o.r) : '—'}</td><td>${status}</td></tr>`;
    }).join('');
    return `<h3>Mission</h3><p class="muted">${mission}</p>${here}
      <h3>Orbits</h3><table class="demo"><tr><th>#</th><th>r</th><th>beacons</th><th>π ≈</th></tr>${rows}</table>
      <div class="formula small">1 beacon per 1 × 1 tile<br>beacons ≈ area = π × r²<br>π ≈ beacons ÷ r²</div>`;
  }

  // ------------------------------------------------------------ drawing (map)
  /** A beacon: a little post with a glowing bulb, at raw pixel (px, py). */
  function beacon(r, px, py, color, t, size = 1) {
    const ctx = r.ctx, T = r.T * size;
    const glow = 0.6 + 0.4 * Math.sin(t / 260 + px * 0.05 + py * 0.03);
    ctx.save();
    ctx.strokeStyle = LS.beaconPost;
    ctx.lineWidth = Math.max(1.5, T * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - T * 0.12, py + T * 0.22);
    ctx.lineTo(px, py);
    ctx.lineTo(px + T * 0.12, py + T * 0.22);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = T * 0.45 * glow;
    ctx.beginPath();
    ctx.arc(px, py - T * 0.04, Math.max(2, T * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDemo(r, t) {
    const ctx = r.ctx, T = r.T, { x, y, size } = DEMO;
    const x0 = r.gx(x), y0 = r.gy(y), w = size * T;
    ctx.save();
    ctx.strokeStyle = LS.demoEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, w, w);
    const v = st.view;
    if (v === 'wide') {
      ctx.strokeStyle = LS.demoBlock;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0 + w / 2, y0);
      ctx.lineTo(x0 + w / 2, y0 + w);
      ctx.moveTo(x0, y0 + w / 2);
      ctx.lineTo(x0 + w, y0 + w / 2);
      ctx.stroke();
    }
    ctx.restore();
    const spacing = v === 'unit' ? 1 : v === 'wide' ? 2 : v === 'dense' ? 0.5 : 0;
    if (spacing) {
      const n = size / spacing;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) beacon(r, r.gx(x + (i + 0.5) * spacing), r.gy(y + (j + 0.5) * spacing), LS.beacon, t, spacing < 1 ? 0.55 : 1);
    }
    const label = v === 'unit' ? '4 × 4: 16 beacons' : v === 'wide' ? '2 apart: 4 beacons' : v === 'dense' ? '½ apart: 64 beacons' : 'area 4 × 4 = 16';
    r.text(label, x0 + w / 2, y0 + w + T * 0.4, { size: 0.3, color: LS.label });
    if (spacing) r.text('area 16', x0 + w / 2, y0 - T * 0.3, { size: 0.28, color: r.style.muted });
  }

  function drawOrbit(r, t, i) {
    const ctx = r.ctx, T = r.T, o = ORBITS[i], s = st.orbits[i], open = st.briefed && isOpen(i);
    const zx = r.gx(o.x - o.zone), zy = r.gy(o.y - o.zone), zw = (2 * o.zone + 1) * T;
    const cx = r.gx(o.x + 0.5), cy = r.gy(o.y + 0.5);
    ctx.save();
    // survey zone
    ctx.strokeStyle = open ? LS.zone : LS.zoneLocked;
    ctx.setLineDash([T * 0.15, T * 0.15]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(zx, zy, zw, zw);
    ctx.setLineDash([]);
    // the orbit
    const pulse = st.pulse && i === 0 ? 0.5 + 0.5 * Math.sin(t / 200) : 0;
    ctx.globalAlpha = open || pulse ? 1 : 0.4;
    ctx.strokeStyle = LS.orbit;
    ctx.shadowColor = LS.orbitGlow;
    ctx.shadowBlur = T * (0.25 + pulse * 0.6);
    ctx.lineWidth = 2 + pulse * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, o.r * T, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // centre marker
    ctx.fillStyle = LS.centre;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, T * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = LS.centre;
    ctx.globalAlpha *= 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - T * 0.2, cy);
    ctx.lineTo(cx + T * 0.2, cy);
    ctx.moveTo(cx, cy - T * 0.2);
    ctx.lineTo(cx, cy + T * 0.2);
    ctx.stroke();
    // the radius, during the demonstration
    if (pulse) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = LS.label;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + o.r * T, cy);
      ctx.stroke();
    }
    ctx.restore();
    if (pulse) r.text('r = 1', cx + (o.r * T) / 2, cy - T * 0.2, { size: 0.24, color: LS.label });
    r.text(`ORBIT ${i + 1} · r = ${o.r}${open ? '' : ' · LOCKED'}`, zx + zw / 2, zy - T * 0.3, { size: 0.28, color: open ? LS.label : r.style.muted });

    // beacons
    const colored = live(i);
    for (const b of s.beacons) {
      const [bx, by] = unk(b);
      const color = !colored ? LS.beacon : isInside(o, bx, by) ? LS.inside : LS.outside;
      beacon(r, r.ax(bx), r.ay(by), color, t);
    }
    // missed tile centres, once checked
    if (s.checked) {
      ctx.save();
      ctx.strokeStyle = LS.missed;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      for (let x = o.x - o.r; x <= o.x + o.r; x++)
        for (let y = o.y - o.r; y <= o.y + o.r; y++) {
          if (!isInside(o, x, y) || s.beacons.has(k(x, y))) continue;
          ctx.beginPath();
          ctx.arc(r.ax(x), r.ay(y), T * 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      ctx.restore();
    }
    // survey console
    const c = o.console, px = r.ax(c.x), py = r.ay(c.y);
    ctx.save();
    ctx.fillStyle = LS.console;
    ctx.strokeStyle = LS.consoleGlow;
    ctx.shadowColor = LS.consoleGlow;
    ctx.shadowBlur = open && !s.done ? T * (0.3 + 0.2 * Math.sin(t / 300)) : 0;
    ctx.globalAlpha = open ? 1 : 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px - T * 0.42, py - T * 0.3, T * 0.84, T * 0.6, T * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    r.text(s.done ? '✓' : String(i + 1), px, py + 1, { size: 0.34, color: s.done ? LS.inside : LS.label, weight: 800 });
    r.text('SURVEY', px, py + T * 0.6, { size: 0.22, color: r.style.muted });
  }

  function drawTelescope(r, t) {
    const ctx = r.ctx, T = r.T, px = r.ax(TELESCOPE.x), py = r.ay(TELESCOPE.y);
    ctx.save();
    ctx.globalAlpha = st.unlocked ? 1 : 0.45;
    ctx.strokeStyle = LS.scopeLeg;
    ctx.lineWidth = Math.max(1.5, T * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - T * 0.28, py + T * 0.38);
    ctx.moveTo(px, py);
    ctx.lineTo(px + T * 0.28, py + T * 0.38);
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + T * 0.4);
    ctx.stroke();
    ctx.translate(px, py - T * 0.05);
    ctx.rotate(-0.6);
    ctx.fillStyle = LS.scopeTube;
    ctx.beginPath();
    ctx.roundRect(-T * 0.3, -T * 0.1, T * 0.62, T * 0.2, T * 0.06);
    ctx.fill();
    ctx.fillStyle = LS.label;
    ctx.shadowColor = LS.consoleGlow;
    ctx.shadowBlur = st.unlocked ? T * (0.3 + 0.2 * Math.sin(t / 300)) : 0;
    ctx.beginPath();
    ctx.roundRect(T * 0.26, -T * 0.13, T * 0.1, T * 0.26, T * 0.03);
    ctx.fill();
    ctx.restore();
    r.text('TELESCOPE', px, py + T * 0.62, { size: 0.22, color: r.style.muted });
  }

  function drawFloor(r, t) {
    drawDemo(r, t);
    ORBITS.forEach((_, i) => drawOrbit(r, t, i));
    drawTelescope(r, t);
  }

  function drawOver(r) {
    if (st.scope.on || game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const me = p();
    let hint = null;
    const ci = nearConsole(me), zi = zoneAt(me.x, me.y);
    if (ci >= 0 && isOpen(ci)) hint = st.orbits[ci].done ? 'Enter: console' : st.orbits[ci].checked ? 'Enter: work out π' : 'Enter: check my survey';
    else if (nearScope(me)) hint = st.unlocked ? 'Enter: telescope' : null;
    else if (zi >= 0 && isOpen(zi)) hint = st.orbits[zi].beacons.has(k(me.x, me.y)) ? 'Enter: pick up' : 'Enter: drop beacon';
    if (hint) r.bubble(me.x, me.y - 1.1, hint);
  }

  // ------------------------------------------------------------ drawing (telescope view)
  const scopeCache = { key: '', dim: null, bright: null, angles: null };

  /** Two pre-drawn layers for radius R (all points dim; inside points bright) + sorted sweep angles of inside points. */
  function buildScope(R, L, dpr) {
    const key = `${R}|${Math.round(L)}|${dpr}`;
    if (scopeCache.key === key) return scopeCache;
    const size = Math.ceil(2 * L * dpr);
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { c, g };
    };
    const dim = mk(), bright = mk();
    const s = (L * 0.85) / R;                 // pixels per lattice step
    const dot = clamp(s * 0.3, 0.7, 7);
    const reach = Math.floor(L / s);
    const angles = [];
    dim.g.fillStyle = LS.latticeDim;
    bright.g.fillStyle = LS.inside;
    for (let i = -reach; i <= reach; i++)
      for (let j = -reach; j <= reach; j++) {
        const x = L + i * s, y = L + j * s;
        if (Math.hypot(i * s, j * s) > L - dot) continue;
        const inside = i * i + j * j <= R * R;
        dim.g.beginPath();
        dim.g.arc(x, y, dot, 0, Math.PI * 2);
        dim.g.fill();
        if (!inside) continue;
        bright.g.beginPath();
        bright.g.arc(x, y, dot, 0, Math.PI * 2);
        bright.g.fill();
        // clockwise from straight up
        angles.push(i === 0 && j === 0 ? 0 : (Math.atan2(j, i) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2));
      }
    angles.sort((a, b) => a - b);
    return Object.assign(scopeCache, { key, dim: dim.c, bright: bright.c, angles, s });
  }

  function drawScreen(r, t) {
    if (!st.scope.on) return;
    const ctx = r.ctx, T = r.T, W = r.width, H = r.height;
    const R = st.scope.r, now = performance.now(), kk = sweepK(now);
    ctx.save();
    ctx.fillStyle = LS.scopeBg;
    ctx.fillRect(0, 0, W, H);
    const L = Math.min(W * 0.31, H * 0.44);
    const cx = W * 0.06 + L, cy = H / 2;
    const sc = buildScope(R, L, r.dpr);
    // lens
    ctx.fillStyle = LS.lensBg;
    ctx.beginPath();
    ctx.arc(cx, cy, L, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sc.dim, cx - L, cy - L, 2 * L, 2 * L);
    // the sweep reveals the beacons inside the circle
    const a = kk * Math.PI * 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, L, -Math.PI / 2, -Math.PI / 2 + a);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(sc.bright, cx - L, cy - L, 2 * L, 2 * L);
    ctx.restore();
    if (kk < 1) {
      ctx.save();
      ctx.fillStyle = LS.sweep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, L, -Math.PI / 2 + a - 0.35, -Math.PI / 2 + a);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // orbit ring
    ctx.strokeStyle = LS.orbit;
    ctx.shadowColor = LS.orbitGlow;
    ctx.shadowBlur = T * 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, sc.s * R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = LS.lensEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, L, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // readout
    const lo = 0, hi = sc.angles.length;
    let n = lo, m = hi;
    while (n < m) {
      const mid = (n + m) >> 1;
      if (sc.angles[mid] <= a) n = mid + 1;
      else m = mid;
    }
    const count = kk >= 1 ? latticeCount(R) : n;
    const tx = cx + L + T * 0.8, small = { size: 0.32, color: r.style.muted, align: 'left' };
    const big = { size: 0.55, color: LS.label, align: 'left', weight: 800 };
    let y = cy - L * 0.75;
    const line = (txt, o, gap = 0.75) => {
      r.text(txt, tx, y, o);
      y += T * gap;
    };
    line('TELESCOPE', { ...small, color: LS.label, weight: 800 }, 0.9);
    line(`radius r = ${R}`, big);
    line(`beacons: ${count}`, big);
    line(`r² = ${R * R}`, big, 1.0);
    line(kk >= 1 ? `π ≈ ${count} ÷ ${R * R} = ${fmt(count / (R * R), 4)}` : 'scanning…', { ...big, size: 0.42, color: LS.inside }, 1.2);
    line('↑ ↓  radius ±1     ← →  ±5', small, 0.55);
    line('Enter  note it down', small, 0.55);
    line('Esc  leave the telescope', small, 0.55);
  }

  return {
    title: 'Beacon Survey',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'six', name: SIX.name, sprite: SIX.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: 'Survey all three orbits to power up the warp gate.' },
    help: `<p>Stand on a tile inside an orbit's dotted survey zone and press ${key('Enter')} to drop a beacon (again to pick it up).
      A tile counts if its <b>centre</b> is inside the orbit or exactly on it.</p>
      <p>Orbit 1 shows green (counts) and red (doesn't) straight away. For orbits 2 and 3, press ${key('Enter')} at the survey console
      underneath, type your count, and ${SIX.name} checks your beacons. Then work out π ≈ beacons ÷ r².</p>
      <p>After all three, the telescope shows bigger circles: ${key('↑')} ${key('↓')} change the radius, ${key('←')} ${key('→')} by 5,
      ${key('Enter')} notes the estimate down, ${key('Esc')} leaves.</p>
      <p>${key('R')} next to an orbit clears its beacons; anywhere else it replays ${SIX.name}'s demonstration.</p>`,
    state: st, // exposed for debugging / tests
    blocked: (x, y) => ORBITS.some((o) => o.console.x === x && o.console.y === y) || (x === TELESCOPE.x && y === TELESCOPE.y),
    canMove: () => !st.scope.on,
    interceptMove,
    onAction,
    onKey,
    tick,
    onRestart,
    hud,
    drawFloor,
    drawOver,
    drawScreen,
  };
}

/** One simulated player: surveys the three orbits, then often looks through the telescope at a radius of 4 to MAX_SCOPE_R. */
function simulate(si, rng) {
  if (rng() < 0.3) return piFor(3);
  return piFor(4 + Math.floor(rng() * (MAX_SCOPE_R - 3)));
}

export default {
  id: ID,
  number: 6,
  title: 'Level 6 · The Beacon Survey',
  method: 'Gauss circle: π ≈ beacons inside ÷ r²',
  style: 'lattice',
  stageCount: 1,
  stageName: () => 'Beacon Survey',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 6)', si: 0 },
    { label: 'Demonstration done, orbit 1 ready', si: 0, opts: { briefed: true } },
    { label: 'Orbit 1 surveyed', si: 0, opts: { done: 1 } },
    { label: 'Orbits 1 and 2 surveyed', si: 0, opts: { done: 2 } },
    { label: 'All three surveyed (gate open, telescope ready)', si: 0, opts: { done: 3 } },
  ],
  simulate,
  simulateNote: `Counts are checked, so each orbit gives an exact value (r = 1: 5, r = 2: 3.25, r = 3: 3.22). 30% of simulated players stop at orbit 3; the rest note down one telescope circle of radius 4 to ${MAX_SCOPE_R}.`,
};
