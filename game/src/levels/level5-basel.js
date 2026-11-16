// LEVEL 5 — The Asteroid Quarry: the Basel problem.
//
//   1 + 1/4 + 1/9 + 1/16 + … = π² / 6      so      π = √(6 × (1 + 1/4 + 1/9 + …))
//
// Every term is positive, so (unlike the Leibniz series in Level 2) the total only ever grows.
// Everything is drawn to one scale: a rock's AREA is proportional to its mass in megatonnes.
//
//   1. Take the next chunk from the stockpile (1, then 1/4, 1/9, 1/16 … megatonnes) and carry it
//      to the gun. Enter on the gun platform loads it; ↑/↓ aim; Enter fires.
//   2. The first rock (1 megatonne) is fired INTO orbit round the planet. It has to skim the edge of
//      the orbit (nearly a tangent): too steep and it crashes into the planet, too wide and it misses.
//      The asteroid then orbits in the direction the rock was travelling. Every later chunk must
//      hit that asteroid to stick. A miss is lost: fetch another of the same chunk. Up to MAX_TERMS.
//      The stockpile always shows every chunk (used ones dimmed), so their sizes can be compared.
//   3. Fire the DUPLICATOR laser at it: 6 copies appear and crash back together into one rock
//      6 times as heavy (6 × sum ≈ π²).
//   4. Fire the SQUARE-ROOT laser at that: the debris flies off, leaving one rock weighing
//      √(6 × sum) ≈ π. It stops orbiting and drifts down.
//   5. Carry it to the scale at the top, which reveals its weight: the estimate.
// Each weighing goes to the tracker. The warp gate opens after weighing a rock built from at
// least UNLOCK terms. After a weighing the stockpile starts again at 1 megatonne.
// (Dialogue: npc_dialogue.js → level5.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, clamp, cheb, fracHtml, mulberry32 } from '../core/utils.js';
import { BASEL_STYLE as BS } from '../../assets/theme.js';

const ID = 'basel';
const COLS = 30, ROWS = 18;
const MAX_TERMS = 10;       // the stockpile has this many chunks; beyond this they are too small to see
const UNLOCK = MAX_TERMS;   // terms in a weighed rock needed to open the warp gate
const R0 = 1.0;             // radius (squares) of a 1-megatonne rock; area ∝ mass, so radius ∝ √mass
const PLANET = { x: 21, y: 9, r: 1.3 };      // raw grid units
const ORBIT_R = 5, PERIOD = 9000;            // orbit radius (squares) and time per lap (ms)
const PILE = { x0: 1, x1: 10, y0: 15, y1: 16 }; // stockpile (blocked squares), at the bottom
const DUP = { x: 2, y: 12 };                 // duplicator crate (blocked square)
const ROOT = { x: 7, y: 12 };                // square-root laser crate (blocked square)
const SCALE = { x: 10, y: 3 };               // the scale (blocked square), at the top
const LAND = { x: 14, y: 15 };               // where the final rock drifts down to
const PLATFORM = { x: 4, y: 9 };             // π stands here to use the gun
const TURRET = { x: 5, y: 9 };               // the gun itself (blocked square)
const PIVOT = { x: TURRET.x + 0.5, y: TURRET.y + 0.5 };
const BARREL = 0.8;
const AIM_MAX = 40, AIM_STEP = 2.5;          // degrees
const SHOT_SPEED = 13;                       // squares per second
const CAPTURE_TOL = 1.5;                     // the first rock's path must pass within ORBIT_R − this of the planet's centre… but no closer
const FALL_MS = 650;                         // a too-steep first rock curving into the planet
const NPC_POS = { x: 7, y: 5 };
const PLAYER_START = { x: 2, y: 7 };
const GATE = { x: 27, y: 16 };
const SCALE_MAX = 4;                         // top of the scale's dial (megatonnes)
const DUP_MS = 1500, ROOT_MS = 1700;         // animation lengths
const DUP_MERGE = 0.85;                      // fraction of the duplicator animation spent as 6 separate copies
const D = DIALOGUE.level5;
const FIVE = CHARACTERS.five;

const term = (k) => 1 / (k * k);
const sumTo = (n) => { let s = 0; for (let k = 1; k <= n; k++) s += term(k); return s; };
const piFrom = (sum) => Math.sqrt(6 * sum);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rad = (deg) => (deg * Math.PI) / 180;
const rockR = (mass) => R0 * Math.sqrt(mass);
const inPile = (x, y) => x >= PILE.x0 && x <= PILE.x1 && y >= PILE.y0 && y <= PILE.y1;
const nextToPile = (p) => p.x >= PILE.x0 - 1 && p.x <= PILE.x1 + 1 && p.y >= PILE.y0 - 1 && p.y <= PILE.y1 + 1;
const LASERS = { dup: { name: 'the duplicator', short: '×6', color: () => BS.dup }, root: { name: 'the square-root laser', short: '√', color: () => BS.root } };

// a lumpy rock outline, made once
const SHAPE = (() => {
  const rng = mulberry32(55);
  return Array.from({ length: 11 }, () => 0.82 + rng() * 0.18);
})();

function createStage(game, si, opts = {}) {
  const preload = clamp(opts.preload || 0, 0, MAX_TERMS);
  const st = {
    briefed: !!opts.briefed || preload > 0,
    n: preload,              // terms in the orbiting asteroid (0 = no asteroid yet)
    sum: sumTo(preload),     // 1 + 1/4 + … + 1/n²
    duplicated: false,       // has the duplicator hit it? (then its mass is 6 × sum)
    phase: 0,                // orbit angle offset
    dir: -1,                 // +1 clockwise, −1 anticlockwise (on screen): the way the first rock was going
    carry: null,             // { kind: 'chunk', k } | { kind: 'dup' } | { kind: 'root' } | { kind: 'rock', w, n, sum }
    loaded: null,            // { kind: 'chunk', k } | { kind: 'dup' } | { kind: 'root' }
    shot: null,              // { kind, k?, start, angle, last }
    dupAnim: null,           // { start }
    rootAnim: null,          // { start, x, y, mass, w, n, sum, dirs }
    rock: null,              // { w, n, sum }: the final rock, lying at LAND
    onScale: null,           // { w, n, sum }
    scaleShown: 0,           // the dial needle eases towards onScale.w
    aim: 0,                  // degrees, + = up
    fx: [],                  // { color, x, y, start }
    calcs: [],               // { n, pi }
    unlocked: false,
  };
  if (opts.duplicated && st.n) st.duplicated = true;
  const p = () => game.player;
  const onPlatform = () => p().x === PLATFORM.x && p().y === PLATFORM.y;
  const isOut = (kind) => [st.carry, st.loaded, st.shot].some((c) => c && c.kind === kind);
  const nextK = () => st.n + 1;
  const mass = () => (st.duplicated ? 6 * st.sum : st.sum);
  const pileOpen = () => !isOut('chunk') && !st.duplicated && st.n < MAX_TERMS;

  function asteroidPos(now) {
    const a = st.phase + st.dir * (now / PERIOD) * Math.PI * 2;
    return { x: PLANET.x + Math.cos(a) * ORBIT_R, y: PLANET.y + Math.sin(a) * ORBIT_R };
  }
  /** Drawn / hit radius of the orbiting asteroid (grows during the duplicator animation). */
  function asteroidR(now) {
    if (!st.dupAnim) return rockR(mass());
    const k = clamp((now - st.dupAnim.start) / DUP_MS, 0, 1);
    const grow = clamp((k - DUP_MERGE) / (1 - DUP_MERGE), 0, 1);
    return rockR(st.sum) + (rockR(6 * st.sum) - rockR(st.sum)) * grow;
  }

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      return play(D.intro);
    }
    if (st.carry && st.carry.kind === 'rock') return play(D.weighIt);
    if (st.rock) return play(D.pickUpRock);
    if (st.duplicated) return play(D.nowSquareRoot);
    if (!st.n) return play(st.unlocked ? D.again : D.fireFirstRock);
    if (st.n < MAX_TERMS) return play(D.howAreYouGettingOn, { left: MAX_TERMS - st.n });
    return play(D.readyToDuplicate);
  }

  // ------------------------------------------------------------ actions (Enter)
  function interceptMove(dx, dy) {
    if (!dy || !onPlatform()) return false;
    if (!st.briefed) {
      ui.toast(`Talk to ${FIVE.name} before touching the gun.`);
      return true;
    }
    st.aim = clamp(st.aim - dy * AIM_STEP, -AIM_MAX, AIM_MAX);
    return true;
  }

  const handsFull = () => ui.toast('Your hands are full.');
  const itemLabel = (c) => (c.kind === 'chunk' ? fracHtml(1, c.k ** 2) : LASERS[c.kind].name);

  async function onAction() {
    const me = p();
    // the gun
    if (onPlatform()) {
      if (!st.briefed) return ui.toast(`Talk to ${FIVE.name} before touching the gun.`), true;
      if (st.loaded && !st.shot) {
        if (st.loaded.kind !== 'chunk' && !st.n) return ui.toast('There is no asteroid to fire at.'), true;
        const now = performance.now();
        st.shot = { ...st.loaded, start: now, angle: st.aim, last: now };
        st.loaded = null;
        game.refreshHud();
        return true;
      }
      if (st.carry && st.carry.kind !== 'rock') {
        if (st.loaded || st.shot) return ui.toast('Wait for the last shot to land.'), true;
        st.loaded = st.carry;
        st.carry = null;
        ui.toast(`Loaded ${itemLabel(st.loaded)}. Aim with ${key('↑')} ${key('↓')} and press ${key('Enter')} to fire.`, 3200);
        game.refreshHud();
        return true;
      }
      if (st.shot) return ui.toast('Wait for the last shot to land.'), true;
      if (st.carry) return ui.toast('Take the rock to the scale at the top.'), true;
      return ui.toast('The gun is empty. Fetch a chunk from the stockpile to load it.'), true;
    }
    // the stockpile
    if (nextToPile(me)) {
      if (!st.briefed) return ui.toast(`Ask ${FIVE.name} before taking any rock.`), true;
      if (st.carry) return handsFull(), true;
      if (st.duplicated) return ui.toast('The asteroid has been duplicated. No more chunks now: use the square-root laser.'), true;
      if (st.n >= MAX_TERMS) return ui.toast(`That's all ${MAX_TERMS} chunks. Use the duplicator next.`), true;
      if (isOut('chunk')) return ui.toast('You have already taken the next chunk. Fire it first!'), true;
      st.carry = { kind: 'chunk', k: nextK() };
      ui.toast(`Picked up ${fracHtml(1, st.carry.k ** 2)} megatonne${st.carry.k === 1 ? '' : 's'}. Take it to the gun.`);
      game.refreshHud();
      return true;
    }
    // the laser crates
    for (const [kind, spot] of [['dup', DUP], ['root', ROOT]]) {
      if (cheb(spot, me) > 1) continue;
      if (!st.briefed) return ui.toast(`Ask ${FIVE.name} about that crate first.`), true;
      if (st.carry) return handsFull(), true;
      if (isOut(kind)) return ui.toast(`${LASERS[kind].name[0].toUpperCase()}${LASERS[kind].name.slice(1)} is already out.`), true;
      if (!st.n) return ui.toast('There is no asteroid in orbit yet.'), true;
      if (kind === 'dup' && st.duplicated) return ui.toast('The asteroid has already been duplicated. Now use the square-root laser.'), true;
      if (kind === 'root' && !st.duplicated) return ui.toast('Not yet! Multiply by 6 with the duplicator first, then take the square root.'), true;
      st.carry = { kind };
      ui.toast(`Picked up ${LASERS[kind].name}. Load it into the gun.`);
      game.refreshHud();
      return true;
    }
    // the final rock
    if (st.rock && cheb(LAND, me) <= 1) {
      if (st.carry) return handsFull(), true;
      st.carry = { kind: 'rock', ...st.rock };
      st.rock = null;
      ui.toast('Picked up the rock. Take it to the scale at the top.');
      game.refreshHud();
      return true;
    }
    // the scale
    if (cheb(SCALE, me) <= 1) {
      if (!st.carry || st.carry.kind !== 'rock') return ui.toast('The scale is empty.'), true;
      await weigh();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ shots
  function shotPos(s, now) {
    if (s.fall && now >= s.fall.start) {
      // too steep: it curves in and crashes into the planet
      const k = clamp((now - s.fall.start) / FALL_MS, 0, 1), q = k * k;
      const ex = PLANET.x + (s.fall.x - PLANET.x) * (PLANET.r / ORBIT_R), ey = PLANET.y + (s.fall.y - PLANET.y) * (PLANET.r / ORBIT_R);
      return { x: s.fall.x + (ex - s.fall.x) * q, y: s.fall.y + (ey - s.fall.y) * q };
    }
    const d = BARREL + ((now - s.start) / 1000) * SHOT_SPEED;
    return { x: PIVOT.x + Math.cos(rad(s.angle)) * d, y: PIVOT.y - Math.sin(rad(s.angle)) * d };
  }

  function updateShot(now) {
    const s = st.shot;
    if (!s) return;
    if (s.fall) {
      if (now - s.fall.start >= FALL_MS) miss(shotPos(s, now), 'It came in too steeply and crashed into the planet. Aim so it just skims the edge of the orbit.');
      return;
    }
    // check a few points between the last frame and this one, so fast shots can't skip through
    for (let i = 1; i <= 4; i++) {
      const t = s.last + ((now - s.last) * i) / 4;
      const q = shotPos(s, t);
      if (!st.n && s.kind === 'chunk') {
        // the first rock: when it reaches the orbit, is it skimming along it (captured) or heading in too steeply?
        if (Math.hypot(q.x - PLANET.x, q.y - PLANET.y) <= ORBIT_R) {
          const vx = Math.cos(rad(s.angle)), vy = -Math.sin(rad(s.angle));
          const cross = (q.x - PLANET.x) * vy - (q.y - PLANET.y) * vx; // ± closest distance of its path from the planet's centre
          if (Math.abs(cross) >= ORBIT_R - CAPTURE_TOL) return capture(q, t, Math.sign(cross) || 1);
          s.fall = { start: t, x: q.x, y: q.y };
          return;
        }
      } else if (st.n && !st.dupAnim) {
        const a = asteroidPos(t);
        const sr = s.kind === 'chunk' ? rockR(term(s.k)) : 0.15;
        if (Math.hypot(q.x - a.x, q.y - a.y) <= asteroidR(t) + Math.max(0.15, sr)) {
          if (s.kind === 'chunk') return hit(s, q);
          return s.kind === 'dup' ? duplicate(q) : squareRoot(t);
        }
      }
      if (Math.hypot(q.x - PLANET.x, q.y - PLANET.y) <= PLANET.r) return miss(q, 'It hit the planet.');
      if (q.x < -1 || q.y < -1 || q.x > COLS + 1 || q.y > ROWS + 1) return miss(null, st.n ? 'It flew off into space.' : 'It went too wide and missed the orbit. Aim a little closer to the planet.');
    }
    s.last = now;
  }

  const flash = (color, x, y) => st.fx.push({ color, x, y, start: performance.now() });

  function capture(q, t, dir) {
    st.shot = null;
    st.n = 1;
    st.sum = 1;
    st.duplicated = false;
    st.dir = dir; // carry on round the planet the way it was already going
    st.phase = Math.atan2(q.y - PLANET.y, q.x - PLANET.x) - dir * (t / PERIOD) * Math.PI * 2;
    flash(BS.hit, q.x, q.y);
    ui.toast('Captured! The 1-megatonne rock is in orbit. Now fetch the next chunk.', 3500);
    game.refreshHud();
  }

  function hit(s, q) {
    st.shot = null;
    st.n = s.k;
    st.sum += term(s.k);
    flash(BS.hit, q.x, q.y);
    ui.toast(`Hit! ${fracHtml(1, s.k ** 2)} megatonnes added. The asteroid is now ${st.n} terms.`, 2600);
    if (st.n === MAX_TERMS) ui.toast(`That's all ${MAX_TERMS} chunks! Fetch the duplicator from its crate.`, 4500);
    game.refreshHud();
  }

  function miss(q, why) {
    const s = st.shot;
    st.shot = null;
    if (q) flash(BS.miss, q.x, q.y);
    const again = s.kind === 'chunk' ? `another ${fracHtml(1, s.k ** 2)} from the stockpile` : `${LASERS[s.kind].name} again from its crate`;
    ui.toast(`Missed! ${why} Fetch ${again}.`, 3200);
    game.refreshHud();
  }

  function duplicate(q) {
    st.shot = null;
    st.dupAnim = { start: performance.now() };
    if (st.carry && st.carry.kind === 'chunk') st.carry = null; // that chunk is no use now: back on the pile
    flash(BS.dup, q.x, q.y);
    ui.toast('The duplicator hit! 6 copies of the asteroid…', 2500);
    game.refreshHud();
  }

  function squareRoot(t) {
    st.shot = null;
    const a = asteroidPos(t);
    const m = 6 * st.sum, w = Math.sqrt(m);
    const rng = mulberry32(Math.floor(t));
    st.rootAnim = { start: performance.now(), x: a.x, y: a.y, mass: m, w, n: st.n, sum: st.sum, dirs: Array.from({ length: 9 }, () => rng() * Math.PI * 2) };
    st.n = 0;
    st.sum = 0;
    st.duplicated = false;
    flash(BS.root, a.x, a.y);
    ui.toast('The square-root laser blasted the rock apart!', 2500);
    game.refreshHud();
  }

  function tick(now) {
    updateShot(now);
    st.fx = st.fx.filter((f) => now - f.start < 700);
    if (st.dupAnim && now - st.dupAnim.start >= DUP_MS) {
      st.dupAnim = null;
      st.duplicated = true;
      ui.toast('…crashed back together into one rock, 6 times as heavy! Now take the square root.', 4000);
      game.refreshHud();
    }
    if (st.rootAnim && now - st.rootAnim.start >= ROOT_MS) {
      const { w, n, sum } = st.rootAnim;
      st.rock = { w, n, sum };
      st.rootAnim = null;
      ui.toast('The debris flew off into space, leaving one rock. Pick it up and weigh it!', 3500);
      game.refreshHud();
    }
    st.scaleShown += ((st.onScale ? st.onScale.w : 0) - st.scaleShown) * 0.08;
  }

  // ------------------------------------------------------------ weighing
  async function weigh() {
    const { w, n, sum } = st.carry;
    st.carry = null;
    st.onScale = { w, n, sum };
    game.refreshHud();
    await sleep(1300); // let the needle settle
    const shown = [1, 2, 3, 4].filter((k) => k <= n).map((k) => fracHtml(1, k * k)).join(' + ');
    const tail = n > 5 ? ` + … + ${fracHtml(1, n * n)}` : n === 5 ? ` + ${fracHtml(1, 25)}` : '';
    const v = await ui.panel({
      title: 'The scale',
      html: `<p>The rock weighs <b>${fmt(w, 4)}</b> megatonnes. Here is how it was made:</p>
        <div class="formula">
          ${n} chunk${n > 1 ? 's' : ''}: ${shown}${tail} = ${fmt(sum, 5)}<br><br>
          Duplicator: 6 × ${fmt(sum, 5)} = ${fmt(6 * sum, 5)} &nbsp;(close to π²)<br><br>
          Square-root laser: √${fmt(6 * sum, 5)} = <b>${fmt(w, 4)}</b><br><br>
          π ≈ √(6 × (1 + 1/4 + 1/9 + …)) = <b>${fmt(w, 4)}</b>
        </div>`,
      buttons: [
        { label: 'Add to my tracker', value: 'add', primary: true },
        { label: 'Not yet', value: null },
      ],
    });
    if (v !== 'add') return;
    st.calcs.push({ n, pi: w });
    tracker.addFound(w, `Basel problem — ${n} term${n > 1 ? 's' : ''}`);
    ui.toast(`π ≈ <b>${fmt(w, 4)}</b> from ${n} terms. Added to your tracker.`, 3200);
    game.refreshHud();
    if (!st.unlocked && n >= UNLOCK) {
      st.unlocked = true;
      markStageDone(ID, si);
      await play(D.enoughTerms, { value: fmt(w, 3), terms: n });
    } else if (st.calcs.length === 1 && !st.unlocked) {
      await play(D.firstCalculation, { value: fmt(w, 3), terms: n, needed: UNLOCK });
    }
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${FIVE.name} first.`);
    const ok = await ui.choice({
      title: 'Start again?',
      text: 'The asteroid, the gun, the lasers and the scale are all cleared, and the stockpile starts again at 1 megatonne. Your π tracker keeps its values.',
      options: [
        { label: 'Yes, start again', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!ok) return;
    Object.assign(st, { n: 0, sum: 0, duplicated: false, carry: null, loaded: null, shot: null, dupAnim: null, rootAnim: null, rock: null, onScale: null });
    game.refreshHud();
    ui.toast('Everything is cleared. Fetch the 1-megatonne rock and fire it into orbit.');
  }

  // ------------------------------------------------------------ HUD
  const itemName = (c) =>
    !c ? 'nothing' : c.kind === 'chunk' ? `${fracHtml(1, c.k ** 2)} megatonne${c.k === 1 ? '' : 's'}` : c.kind === 'rock' ? 'the final rock' : LASERS[c.kind].name;

  function hud() {
    let mission;
    if (!st.briefed) mission = `Talk to <b>${FIVE.name}</b>: walk next to them and press ${key('Enter')}.`;
    else if (st.carry && st.carry.kind === 'rock') mission = 'Put the rock on the scale at the top.';
    else if (st.rock) mission = 'One rock is left. Pick it up and take it to the scale.';
    else if (st.dupAnim || st.rootAnim) mission = 'Watch…';
    else if (st.duplicated) mission = 'Step 2: take the square root. Fire the square-root laser at the big rock.';
    else if (!st.n) mission = 'Take the 1-megatonne rock from the stockpile, load the gun and fire it into orbit.';
    else if (st.n < MAX_TERMS) mission = `Fetch the next chunk, load the gun and hit the asteroid. Use all ${MAX_TERMS}, or move on to the duplicator whenever you like.`;
    else mission = 'Step 1: multiply by 6. Fire the duplicator at the asteroid.';
    const terms = [];
    for (let i = 1; i <= st.n; i++) terms.push(`<li>${fracHtml(1, i * i)}</li>`);
    const asteroid = `<h3>The asteroid</h3>
      <div class="counters">
        <div class="counter"><span class="num">${st.n} / ${MAX_TERMS}</span><span class="lbl">terms</span></div>
        <div class="counter"><span class="num">${st.duplicated ? '×6' : '—'}</span><span class="lbl">duplicated</span></div>
      </div>
      ${st.n ? `<ol class="results">${terms.join('')}</ol>` : ''}
      <p class="muted">Its weight is a mystery until the scale reveals it.</p>
      <p>Carrying: <b>${itemName(st.carry)}</b><br>In the gun: <b>${itemName(st.loaded)}</b></p>
      <div class="formula small">sum = 1 + 1/4 + 1/9 + …<br>× 6 (duplicator), then √ (laser)<br>π ≈ √(6 × sum)</div>`;
    const calcs = st.calcs.length
      ? `<h3>Your weighings</h3><ol class="results">${st.calcs
          .slice(-6)
          .map((c) => `<li>${c.n} terms → <b>${fmt(c.pi, 4)}</b></li>`)
          .join('')}</ol>`
      : '';
    return `<h3>Mission</h3><p class="muted">${mission}</p>${asteroid}${calcs}`;
  }

  // ------------------------------------------------------------ drawing
  function rock(ctx, px, py, radius, rot, colors = [BS.rockLight, BS.rock, BS.rockDark]) {
    radius = Math.max(1.5, radius);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.beginPath();
    SHAPE.forEach((s, i) => {
      const a = (i / SHAPE.length) * Math.PI * 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * radius * s, Math.sin(a) * radius * s);
    });
    ctx.closePath();
    const g = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.6, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  const FINAL = () => [BS.finalLight, BS.final, BS.rockDark];

  /** A laser cell: a glowing capsule with its symbol. */
  function laserCell(r, kind, px, py, t) {
    const ctx = r.ctx, T = r.T, color = LASERS[kind].color();
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = T * (0.3 + 0.1 * Math.sin(t / 200));
    ctx.beginPath();
    ctx.roundRect(px - T * 0.22, py - T * 0.3, T * 0.44, T * 0.6, T * 0.15);
    ctx.fill();
    ctx.restore();
    r.text(LASERS[kind].short, px, py + 1, { size: 0.3, weight: 900, color: BS.cellText });
  }

  /** Something carried / loaded, drawn at pixel (px, py). Rocks are always drawn to scale. */
  function drawItem(r, c, px, py, t) {
    if (c.kind === 'chunk') rock(r.ctx, px, py, rockR(term(c.k)) * r.T, t / 1500);
    else if (c.kind === 'rock') rock(r.ctx, px, py, rockR(c.w) * r.T, t / 1500, FINAL());
    else laserCell(r, c.kind, px, py, t);
  }
  const itemSize = (c) => (c.kind === 'chunk' ? rockR(term(c.k)) : c.kind === 'rock' ? rockR(c.w) : 0.3);

  function drawPile(r) {
    const ctx = r.ctx, T = r.T;
    const x0 = r.gx(PILE.x0), y0 = r.gy(PILE.y0), w = (PILE.x1 - PILE.x0 + 1) * T, h = (PILE.y1 - PILE.y0 + 1) * T;
    ctx.save();
    ctx.fillStyle = BS.pileFill;
    ctx.strokeStyle = BS.pileEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, h, T * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // every chunk, side by side, to scale. Already in the asteroid: dimmed. The next one: highlighted.
    let cx = PILE.x0 + 0.25;
    const midY = (PILE.y0 + PILE.y1 + 1) / 2;
    for (let k = 1; k <= MAX_TERMS; k++) {
      const rr = rockR(term(k));
      const x = cx + rr;
      const used = k <= st.n || st.duplicated, next = k === nextK() && pileOpen();
      ctx.save();
      ctx.globalAlpha = used ? 0.35 : 1;
      rock(ctx, r.gx(x), r.gy(midY), rr * T, k);
      ctx.restore();
      r.text(`1/${k * k}`, r.gx(x), r.gy(PILE.y0 - (k % 2 ? 0.3 : 0.7)), { size: 0.26, weight: 800, color: next ? BS.label : r.style.muted, alpha: used ? 0.45 : 1 });
      cx += rr * 2 + 0.3;
    }
    r.text('STOCKPILE', r.gx((PILE.x0 + PILE.x1 + 1) / 2), r.gy(PILE.y1 + 1.35), { size: 0.24, color: r.style.muted });
  }

  function drawCrates(r, t) {
    const ctx = r.ctx, T = r.T;
    for (const [kind, spot, label] of [['dup', DUP, 'DUPLICATOR ×6'], ['root', ROOT, 'SQUARE ROOT √']]) {
      const color = LASERS[kind].color();
      ctx.save();
      ctx.fillStyle = BS.crate;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(r.gx(spot.x + 0.05), r.gy(spot.y + 0.05), T * 0.9, T * 0.9);
      ctx.strokeRect(r.gx(spot.x + 0.05), r.gy(spot.y + 0.05), T * 0.9, T * 0.9);
      ctx.restore();
      if (!isOut(kind)) laserCell(r, kind, r.ax(spot.x), r.ay(spot.y), t);
      r.text(label, r.ax(spot.x), r.gy(spot.y - 0.3), { size: 0.22, weight: 700, color });
    }
  }

  function drawPlanetAndOrbit(r, t) {
    const ctx = r.ctx, T = r.T;
    ctx.save();
    ctx.strokeStyle = BS.orbit;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([T * 0.15, T * 0.15]);
    ctx.beginPath();
    ctx.arc(r.gx(PLANET.x), r.gy(PLANET.y), ORBIT_R * T, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    r.drawSprite('planetRed', PLANET.x, PLANET.y, PLANET.r * 2.1, { raw: true, rot: t / 9000 });
  }

  function drawGun(r, t) {
    const ctx = r.ctx, T = r.T;
    const px = r.gx(PIVOT.x), py = r.gy(PIVOT.y);
    ctx.save();
    ctx.strokeStyle = BS.platform;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.gx(PLATFORM.x + 0.08), r.gy(PLATFORM.y + 0.08), T * 0.84, T * 0.84);
    if (onPlatform() && st.briefed) {
      ctx.strokeStyle = BS.aim;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([T * 0.12, T * 0.14]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(rad(st.aim)) * T * 3.5, py - Math.sin(rad(st.aim)) * T * 3.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = BS.gunBase;
    ctx.beginPath();
    ctx.arc(px, py, T * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(px, py);
    ctx.rotate(-rad(st.aim));
    ctx.fillStyle = BS.gun;
    ctx.shadowColor = BS.gunGlow;
    ctx.shadowBlur = T * 0.25;
    ctx.fillRect(0, -T * 0.12, T * BARREL, T * 0.24);
    ctx.restore();
    // what's loaded sits in a hopper under the gun (rocks to scale)
    if (st.loaded) drawItem(r, st.loaded, px, r.gy(TURRET.y + 1.5), t);
    const loadedText = st.loaded ? `LOADED: ${st.loaded.kind === 'chunk' ? `1/${st.loaded.k ** 2}` : st.loaded.kind === 'dup' ? 'DUPLICATOR' : 'SQUARE ROOT'}` : 'ASTEROID GUN';
    r.text(loadedText, px, r.gy(TURRET.y - 0.3), { size: 0.24, color: st.loaded ? BS.label : r.style.muted, weight: st.loaded ? 800 : 600 });
  }

  function drawScale(r, t) {
    const ctx = r.ctx, T = r.T;
    const cx = r.gx(SCALE.x + 0.5), base = r.gy(SCALE.y + 0.85);
    ctx.save();
    // pan and stand
    ctx.fillStyle = BS.scale;
    ctx.fillRect(cx - T * 0.45, base - T * 0.12, T * 0.9, T * 0.12);
    ctx.fillRect(cx - T * 0.06, base - T * 0.55, T * 0.12, T * 0.45);
    ctx.fillRect(cx - T * 0.6, base - T * 0.6, T * 1.2, T * 0.08);
    // dial, to the right of the scale
    const dx = r.gx(SCALE.x + 2.3), dy = r.gy(SCALE.y + 0.9), R = T * 0.9;
    ctx.fillStyle = BS.dialBg;
    ctx.beginPath();
    ctx.arc(dx, dy, R, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = BS.dialTick;
    ctx.lineWidth = 1;
    for (let i = 0; i <= SCALE_MAX; i++) {
      const a = Math.PI + (i / SCALE_MAX) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(dx + Math.cos(a) * R * 0.78, dy + Math.sin(a) * R * 0.78);
      ctx.lineTo(dx + Math.cos(a) * R, dy + Math.sin(a) * R);
      ctx.stroke();
      r.text(String(i), dx + Math.cos(a) * R * 0.6, dy + Math.sin(a) * R * 0.6, { size: 0.18, color: r.style.muted });
    }
    const a = Math.PI + clamp(st.scaleShown / SCALE_MAX, 0, 1) * Math.PI;
    ctx.strokeStyle = BS.needle;
    ctx.lineWidth = Math.max(2, T * 0.05);
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx + Math.cos(a) * R * 0.9, dy + Math.sin(a) * R * 0.9);
    ctx.stroke();
    ctx.restore();
    if (st.onScale) drawItem(r, { kind: 'rock', w: st.onScale.w }, cx, base - T * 0.6 - rockR(st.onScale.w) * T * 0.8, t);
    r.text(st.onScale ? `${fmt(st.scaleShown, 4)} Mt` : '? Mt', dx, dy + T * 0.3, { size: 0.3, weight: 800, color: BS.needle });
    r.text('SCALE', cx, r.gy(SCALE.y - 0.25), { size: 0.24, color: r.style.muted });
  }

  function drawDupAnim(r, now) {
    const k = clamp((now - st.dupAnim.start) / DUP_MS, 0, 1);
    const a = asteroidPos(now), T = r.T;
    // the asteroid becomes 6 copies (the original is one of them): they spread out, then crash back in
    if (k < DUP_MERGE) {
      const spread = Math.sin((k / DUP_MERGE) * Math.PI) * 2;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + now / 600;
        rock(r.ctx, r.gx(a.x + Math.cos(ang) * spread), r.gy(a.y + Math.sin(ang) * spread), rockR(st.sum) * T, i + now / 900);
      }
    }
  }

  function drawRootAnim(r, now) {
    const s = st.rootAnim, T = r.T;
    const k = clamp((now - s.start) / ROOT_MS, 0, 1);
    // debris flies off: the mass that isn't left over, in pieces
    const debrisR = rockR((s.mass - s.w) / s.dirs.length) * T;
    s.dirs.forEach((ang) => {
      const d = 0.8 + k * k * 24;
      rock(r.ctx, r.gx(s.x + Math.cos(ang) * d), r.gy(s.y + Math.sin(ang) * d), debrisR, ang + now / 500);
    });
    // the rock that's left stops orbiting and drifts down to LAND
    const q = k * k * (3 - 2 * k);
    const x = s.x + (LAND.x + 0.5 - s.x) * q, y = s.y + (LAND.y + 0.5 - s.y) * q;
    rock(r.ctx, r.gx(x), r.gy(y), rockR(s.w) * T, now / 1500, FINAL());
  }

  function drawFloor(r, t) {
    drawPlanetAndOrbit(r, t);
    drawPile(r);
    drawCrates(r, t);
    drawScale(r, t);
    drawGun(r, t);
    if (st.rock) {
      const ctx = r.ctx, T = r.T;
      ctx.save();
      ctx.strokeStyle = BS.label;
      ctx.setLineDash([T * 0.1, T * 0.1]);
      ctx.lineDashOffset = -t / 60;
      ctx.beginPath();
      ctx.arc(r.ax(LAND.x), r.ay(LAND.y), rockR(st.rock.w) * T + T * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawItem(r, { kind: 'rock', w: st.rock.w }, r.ax(LAND.x), r.ay(LAND.y), t);
    }
  }

  function drawOver(r, t, pp) {
    const ctx = r.ctx, T = r.T, now = performance.now();
    if (st.n) {
      const a = asteroidPos(now);
      const copiesOnly = st.dupAnim && (now - st.dupAnim.start) / DUP_MS < DUP_MERGE;
      if (st.dupAnim) drawDupAnim(r, now);
      if (!copiesOnly) rock(ctx, r.gx(a.x), r.gy(a.y), asteroidR(now) * T, now / 3000); // (hidden while it is 6 copies)
    }
    if (st.rootAnim) drawRootAnim(r, now);
    if (st.shot) {
      const s = st.shot, q = shotPos(s, now);
      if (s.kind === 'chunk') {
        const back = shotPos(s, now - 70);
        ctx.save();
        ctx.strokeStyle = BS.trail;
        ctx.lineWidth = Math.max(1.5, T * 0.05);
        ctx.beginPath();
        ctx.moveTo(r.gx(back.x), r.gy(back.y));
        ctx.lineTo(r.gx(q.x), r.gy(q.y));
        ctx.stroke();
        ctx.restore();
        drawItem(r, s, r.gx(q.x), r.gy(q.y), now);
      } else {
        // a laser bolt
        const back = shotPos(s, now - 90), color = LASERS[s.kind].color();
        ctx.save();
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = T * 0.4;
        ctx.lineWidth = Math.max(3, T * 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r.gx(back.x), r.gy(back.y));
        ctx.lineTo(r.gx(q.x), r.gy(q.y));
        ctx.stroke();
        ctx.restore();
      }
    }
    for (const f of st.fx) {
      const k = (now - f.start) / 700;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.gx(f.x), r.gy(f.y), T * (0.3 + k * 1.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // whatever π is carrying, held up above their head (rocks to scale)
    if (st.carry) drawItem(r, st.carry, r.ax(pp.x), r.ay(pp.y - 0.45 - itemSize(st.carry)), t);
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const me = p();
    let hint = null;
    if (onPlatform()) hint = st.loaded && !st.shot ? '↑↓ aim · Enter: fire' : st.carry && st.carry.kind !== 'rock' && !st.shot ? 'Enter: load' : null;
    else if (nextToPile(me) && !st.carry && pileOpen()) hint = `Enter: take 1/${nextK() ** 2}`;
    else if (cheb(DUP, me) <= 1 && !st.carry && st.n && !st.duplicated && !isOut('dup')) hint = 'Enter: take duplicator';
    else if (cheb(ROOT, me) <= 1 && !st.carry && st.duplicated && !isOut('root')) hint = 'Enter: take square-root laser';
    else if (st.rock && cheb(LAND, me) <= 1 && !st.carry) hint = 'Enter: pick up';
    else if (cheb(SCALE, me) <= 1 && st.carry && st.carry.kind === 'rock') hint = 'Enter: weigh';
    if (hint) r.bubble(me.x, me.y - 1.1, hint);
  }

  return {
    title: 'Asteroid Quarry',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'five', name: FIVE.name, sprite: FIVE.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Weigh a rock built from all ${UNLOCK} terms to power up the warp gate.` },
    help: `<p>Take the next chunk from the stockpile with ${key('Enter')} (1, then 1/4, 1/9, 1/16… megatonnes, all drawn to scale) and carry it to the gun.
      On the gun platform ${key('Enter')} loads it, ${key('↑')} ${key('↓')} aim and ${key('Enter')} fires. Step off with ${key('←')} ${key('→')}.</p>
      <p>The first rock goes into orbit if it just skims the edge of the dotted orbit line. Aim straight at the planet and it crashes; too wide and it misses. Every later chunk has to hit it. If you miss, fetch another of the same chunk.</p>
      <p>Then fire the duplicator (×6) at it, and after that the square-root laser (√). Carry the rock that's left to the scale at the top: its weight is your estimate of π.</p>
      <p>${key('R')} clears everything and starts again.</p>`,
    state: st, // exposed for debugging / tests
    blocked: (x, y) =>
      inPile(x, y) ||
      (x === TURRET.x && y === TURRET.y) ||
      (x === DUP.x && y === DUP.y) ||
      (x === ROOT.x && y === ROOT.y) ||
      (x === SCALE.x && y === SCALE.y) ||
      Math.hypot(x + 0.5 - PLANET.x, y + 0.5 - PLANET.y) < PLANET.r + 0.2,
    interceptMove,
    onAction,
    tick,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

/** One simulated player: builds a rock of 3 to MAX_TERMS terms, duplicates, square-roots and weighs it. */
function simulate(si, rng) {
  return piFrom(sumTo(3 + Math.floor(rng() * (MAX_TERMS - 2))));
}

export default {
  id: ID,
  number: 5,
  title: 'Level 5 · The Asteroid Quarry',
  method: 'Basel problem: π ≈ √(6 × (1 + 1/4 + 1/9 + …))',
  style: 'quarry',
  stageCount: 1,
  stageName: () => 'Asteroid Quarry',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 5)', si: 0 },
    { label: 'Briefed, no asteroid yet', si: 0, opts: { briefed: true } },
    { label: `Briefed, asteroid with all ${MAX_TERMS} terms`, si: 0, opts: { preload: MAX_TERMS } },
    { label: 'Asteroid duplicated, ready for the square root', si: 0, opts: { preload: MAX_TERMS, duplicated: true } },
  ],
  simulate,
  simulateNote: `Each simulated player builds a rock of between 3 and ${MAX_TERMS} terms, then duplicates, square-roots and weighs it.`,
};
