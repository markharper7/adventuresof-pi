// LEVEL 7 — The Fraction Yard: the Wallis product.
//
//   π / 2 = 2/1 × 2/3 × 4/3 × 4/5 × 6/5 × 6/7 × …      so      π ≈ 2 × (top ÷ bottom)
//
// The first level about MULTIPLYING fractions.
//
//   1. A fraction asteroid patrols left and right near the top: a top rock and a bottom rock joined
//      by the fraction bar, each showing its number. It starts as 1 / 1. A rock's VOLUME is its number,
//      so it grows with each hit; the view zooms out ×10 whenever the rocks get too big to fit.
//   2. The first FACTORS fractions of the series are shown along the top of the screen. Empty slots
//      are dim and light up as they are done.
//   3. Take a number charge (1 to 11) from the ammo rack at the bottom. Enter next to the turret gets
//      in (and loads it). In the turret: ↑ / ↓ target the top or bottom rock, ← / → slide the turret
//      along its rail, Enter fires a bolt straight up, Esc gets out (Esc leaves every turret). Since the
//      fraction keeps moving, the player has to lead it. The charge stays loaded until it is swapped.
//   4. A hit multiplies that rock and fills a matching empty slot (top numbers on top, bottom
//      numbers below, in any order: multiplication doesn't care about order). A number with no
//      empty matching slot bounces off with a hint. A miss just flies off; fire again.
//   5. The scanner reads the fraction (only when top and bottom have the same count of numbers,
//      i.e. whole fractions): top ÷ bottom ≈ π/2, and the player works out π ≈ 2 × that.
//      Scans go to the tracker. Scanning after all FACTORS fractions opens the warp gate.
//      Scanned in order, the estimates hop above and below π (after 9: 3.30, after 10: 3.00).
// (Dialogue: npc_dialogue.js → level7.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, clamp, cheb, parseNum, fracHtml } from '../core/utils.js';
import { drawRock } from '../core/rock.js';
import { WALLIS_STYLE as WS } from '../../assets/theme.js';

const ID = 'wallis';
const COLS = 30, ROWS = 18;
const FACTORS = 10;                             // fractions in the series (and needed to open the gate)
/** The k-th fraction of the series (k = 1, 2, …): 2/1, 2/3, 4/3, 4/5, 6/5 … */
const factor = (k) => ({ top: 2 * Math.ceil(k / 2), bottom: 2 * Math.floor(k / 2) + 1 });
const SERIES = Array.from({ length: FACTORS }, (_, i) => factor(i + 1));
const MAX_NUM = Math.max(...SERIES.map((f) => Math.max(f.top, f.bottom))); // the rack holds 1 … MAX_NUM
const SIDES = ['top', 'bottom'];
const RACK = { x0: 10, y: 16 };                 // the bay for number n is at (x0 + n − 1, y); take it from the square above
const TURRET_Y = 13, PLATFORM_Y = 14;           // the turret (a blocked square) fires straight up; π sits on the platform under it
const RAIL = { x0: 8, x1: 22, start: 15 };      // the turret slides along a rail between these columns
const SLIDE_MS = 110;                           // fastest slide while ← → are held
const SCANNER = { x: 25, y: 12 };
const NPC_POS = { x: 6, y: 10 };
const PLAYER_START = { x: 3, y: 10 };
const GATE = { x: 26, y: 15 };
// the fraction asteroid (raw grid units)
const PATROL = { x0: 5.5, x1: 25.5, speed: 3.2 }; // its centre goes back and forth between x0 and x1, squares per second
const ROCK_Y = { top: 3.4, bottom: 5.6 };
const BAR_Y = 4.5, BAR_HALF = 1.25;
// Rocks grow by VOLUME: radius ∝ ∛(number). That still spans 1 → ∛14,745,600 ≈ 245 × wider, so the view
// zooms out ×10 whenever the bigger rock would be wider than ROCK_R_MAX. Both rocks share the zoom.
const ROCK_R0 = 0.35, ROCK_R_MAX = 0.95;        // radius of a "1" rock at zoom ×1; the biggest a rock is drawn
const FIT = (ROCK_R_MAX / ROCK_R0) ** 3;        // the biggest number that fits at a zoom of ×1
const GROW_MS = 160;                            // smoothing time for rocks growing / shrinking
const HIT_R = 1.0;                              // a bolt hits if the fraction's centre is this close when it reaches the rock
const BOLT_Y0 = TURRET_Y + 0.2, BOLT_SPEED = 14; // squares per second
const BOUNCE_MS = 600, FX_MS = 900, PULSE_MS = 600;
const STRIP = { x0: 6.5, y: 0.2, w: 2 };        // the series along the top: fraction i is centred at x0 + w × (i + ½)
const D = DIALOGUE.level7;
const SEVEN = CHARACTERS.seven;

const big = (n) => n.toLocaleString('en-GB');
/** π estimate from the first k fractions, in order. */
const estimate = (k) => 2 * SERIES.slice(0, k).reduce((p, f) => (p * f.top) / f.bottom, 1);

function createStage(game, si, opts = {}) {
  const fill = clamp(opts.fill || 0, 0, 2 * FACTORS); // debug: numbers already fired, in series order (top 1, bottom 1, top 2 …)
  const st = {
    briefed: !!opts.briefed || fill > 0,
    slots: { top: SERIES.map((_, i) => 2 * i < fill), bottom: SERIES.map((_, i) => 2 * i + 1 < fill) },
    carry: null,          // the number π is carrying, or null
    loaded: null,         // the number in the turret (it stays loaded until another is loaded)
    aim: 'top',           // 'top' | 'bottom'
    turretX: RAIL.start,  // the turret's column
    manned: false,        // is π in the turret? (then ↑ ↓ aim, ← → slide, Esc gets out)
    lastSlide: 0,         // when the turret last slid, and where from (for the glide)
    slideFrom: RAIL.start,
    shot: null,           // { n, target, x, start, reachAt, outcome: null | 'miss' | 'bounce' }
    fx: [],               // { kind: 'ring' | 'pop', color, text, x, y, start }
    pulse: { top: 0, bottom: 0 }, // when each rock's number last changed
    shownR: null,         // drawn radius of each rock (eases towards its real size)
    shownZoom: 1, lastDraw: 0,
    slotFlash: {},        // 'top3' → time it lit up
    scans: [],            // { k, value }
    unlocked: false,
  };
  const p = () => game.player;
  const platform = () => ({ x: st.turretX, y: PLATFORM_Y });
  const count = (side) => st.slots[side].filter(Boolean).length;
  const filled = () => count('top') + count('bottom');
  const allDone = () => filled() === 2 * FACTORS;
  const numbers = (side) => SERIES.filter((_, i) => st.slots[side][i]).map((f) => f[side]);
  const product = (side) => numbers(side).reduce((a, b) => a * b, 1);
  /** How far the view is zoomed out: the smallest power of 10 that fits the bigger rock. */
  function zoom() {
    const most = Math.max(product('top'), product('bottom'));
    let z = 1;
    while (most / z > FIT * (1 + 1e-9)) z *= 10;
    return z;
  }
  /** The radius a rock should be drawn at (squares): its volume is proportional to its number. */
  const rockR = (side) => ROCK_R0 * Math.cbrt(product(side) / zoom());
  st.shownR = { top: rockR('top'), bottom: rockR('bottom') };
  st.shownZoom = zoom();
  const bayAt = (pos) => (pos.y === RACK.y - 1 && pos.x >= RACK.x0 && pos.x < RACK.x0 + MAX_NUM ? pos.x - RACK.x0 + 1 : null);

  /** Centre x of the fraction asteroid at time t: back and forth at a steady speed. */
  function fracX(t) {
    const W = PATROL.x1 - PATROL.x0;
    const d = ((t / 1000) * PATROL.speed) % (2 * W);
    return PATROL.x0 + (d < W ? d : 2 * W - d);
  }
  const fracDir = (t) => (fracX(t + 10) >= fracX(t) ? 1 : -1);

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      return play(D.intro, {}, { dock: true });
    }
    if (st.unlocked) return play(D.again);
    if (allDone()) return play(D.readyToScan);
    return play(D.progress, { left: 2 * FACTORS - filled() });
  }

  // ------------------------------------------------------------ actions (Enter)
  function interceptMove(dx, dy, repeat) {
    if (!st.manned) return false;
    if (dy) {
      st.aim = dy < 0 ? 'top' : 'bottom';
      game.refreshHud();
    } else slide(dx, repeat);
    return true;
  }

  /** Slide the turret (with π in it) one column along the rail. */
  function slide(dx, repeat) {
    const now = performance.now();
    if (repeat && now - st.lastSlide < SLIDE_MS) return;
    const nx = clamp(st.turretX + dx, RAIL.x0, RAIL.x1);
    if (nx === st.turretX) return;
    st.slideFrom = st.turretX;
    st.turretX = nx;
    st.lastSlide = now;
    game.slidePlayer(nx, PLATFORM_Y);
  }

  function onKey(e) {
    if (st.manned && (e.code === 'Escape' || e.code === 'Backspace')) {
      e.preventDefault();
      st.manned = false;
      game.refreshHud();
    }
  }

  const TURRET_KEYS = `${key('↑')} ${key('↓')} top or bottom rock, ${key('←')} ${key('→')} move, ${key('Enter')} fires, ${key('Esc')} gets out.`;

  function load() {
    const old = st.loaded;
    st.loaded = st.carry;
    st.carry = null;
    const swap = old !== null && old !== st.loaded ? ` (the ×${old} goes back to the rack)` : '';
    ui.toast(`Loaded ×${st.loaded}${swap}. ${TURRET_KEYS}`, 4000);
    game.refreshHud();
  }

  async function onAction() {
    const me = p();
    if (st.manned) {
      if (st.carry !== null) return load(), true;
      if (st.loaded === null) return ui.toast(`The turret is empty. Press ${key('Esc')} to get out, then take a number from the ammo rack.`), true;
      if (st.shot && !st.shot.outcome) return ui.toast('Wait for the last shot to land.'), true;
      fire();
      return true;
    }
    const bay = bayAt(me);
    if (bay !== null) {
      if (!st.briefed) return ui.toast(`Ask ${SEVEN.name} before taking anything from the rack.`), true;
      const old = st.carry;
      st.carry = bay;
      const swap = old !== null && old !== bay ? ` and put the ×${old} back` : '';
      ui.toast(`Picked up ×${bay}${swap}. Load it into the turret.`);
      game.refreshHud();
      return true;
    }
    // the turret: Enter on or next to its platform gets in
    if (cheb(platform(), me) <= 1) {
      if (!st.briefed) return ui.toast(`Talk to ${SEVEN.name} before touching the turret.`), true;
      st.manned = true;
      game.slidePlayer(st.turretX, PLATFORM_Y);
      if (st.carry !== null) load();
      else {
        ui.toast(`You're in the turret. ${TURRET_KEYS}`, 4000);
        game.refreshHud();
      }
      return true;
    }
    if (cheb(SCANNER, me) <= 1) {
      if (!st.briefed) return ui.toast(`Talk to ${SEVEN.name} first.`), true;
      await scan();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ shots
  function fire() {
    const now = performance.now();
    const dist = BOLT_Y0 - ROCK_Y[st.aim];
    st.shot = { n: st.loaded, target: st.aim, x: st.turretX + 0.5, start: now, reachAt: now + (dist / BOLT_SPEED) * 1000, outcome: null };
  }

  const boltY = (s, t) => BOLT_Y0 - ((t - s.start) / 1000) * BOLT_SPEED;

  /** Why a bolt bounced off: no empty slot for that number on that side. */
  function bounceWhy(n, side) {
    const other = side === 'top' ? 'bottom' : 'top';
    if (SERIES.some((f) => f[side] === n)) return `Every ${n} on the ${side} is already done.`;
    if (SERIES.some((f) => f[other] === n)) return `${n} is not on the ${side} of any fraction in the pattern. Try the ${other} rock.`;
    return `${n} is not in the pattern.`;
  }

  /** The bolt has reached its target's height: hit, bounce or miss? */
  function resolve(s) {
    const fx = fracX(s.reachAt), y = ROCK_Y[s.target];
    if (Math.abs(fx - s.x) > HIT_R) {
      s.outcome = 'miss';
      const early = (fx - s.x) * fracDir(s.reachAt) < 0; // the fraction hadn't got there yet
      ui.toast(`Missed! You fired too ${early ? 'early' : 'late'}. The ×${s.n} is still loaded: try again.`, 2600);
      return;
    }
    const slots = st.slots[s.target];
    const i = SERIES.findIndex((f, j) => f[s.target] === s.n && !slots[j]);
    if (i < 0) {
      s.outcome = 'bounce';
      st.fx.push({ kind: 'ring', color: WS.bounce, x: s.x, y, start: s.reachAt });
      ui.toast(`Bounced off! ${bounceWhy(s.n, s.target)}`, 3800);
      return;
    }
    slots[i] = true;
    st.shot = null;
    st.pulse[s.target] = s.reachAt;
    st.slotFlash[s.target + i] = s.reachAt;
    st.fx.push({ kind: 'ring', color: WS.hit, x: fx, y, start: s.reachAt });
    st.fx.push({ kind: 'pop', color: WS.pop, text: `×${s.n}`, x: fx + 1.1, y, start: s.reachAt });
    if (allDone()) ui.toast(`Hit! That's all ${FACTORS} fractions. Take a reading at the scanner.`, 4500);
    else if (s.n === 1) ui.toast('Hit! × 1 changes nothing: the bottom rock is still the same. But 2/1 is part of the pattern, so it counts.', 4500);
    else ui.toast(`Hit! The ${s.target} rock × ${s.n} = <b>${big(product(s.target))}</b>`, 2600);
    game.refreshHud();
  }

  function tick(now) {
    const s = st.shot;
    if (s && !s.outcome && now >= s.reachAt) resolve(s);
    if (st.shot && st.shot.outcome === 'miss' && boltY(st.shot, now) < -1) st.shot = null;
    if (st.shot && st.shot.outcome === 'bounce' && now - st.shot.reachAt > BOUNCE_MS) st.shot = null;
    if (st.fx.length) st.fx = st.fx.filter((f) => now - f.start < FX_MS);
  }

  // ------------------------------------------------------------ the scanner
  async function scan() {
    const a = count('top'), b = count('bottom');
    if (!a && !b) return ui.toast('The fraction is still 1 over 1. Fire some numbers at it first.');
    if (a !== b) {
      return ui.toast(
        `The fraction is lopsided: ${a} top number${a === 1 ? '' : 's'} but ${b} bottom number${b === 1 ? '' : 's'}. Every fraction in the pattern has one of each, so finish the one you started.`,
        5000
      );
    }
    const top = product('top'), bottom = product('bottom'), q = top / bottom, value = 2 * q;
    const res = await ui.form({
      title: `The scanner: ${a} fraction${a === 1 ? '' : 's'}`,
      html: `<p>The scanner reads the fraction asteroid.</p>
        <div class="formula">
          top: ${numbers('top').join(' × ')} = <b>${big(top)}</b><br>
          bottom: ${numbers('bottom').join(' × ')} = <b>${big(bottom)}</b><br><br>
          ${fracHtml(big(top), big(bottom))} = <b>${fmt(q, 4)}</b> &nbsp;(Wallis: this is about π ÷ 2)<br><br>
          π ≈ 2 × ${fmt(q, 4)} = <span class="blank">?</span>
        </div>
        <p class="muted">Give at least 2 decimal places.</p>`,
      fields: [{ id: 'pi', label: `π ≈ 2 × ${fmt(q, 4)}` }],
      buttons: [
        { label: 'Check', value: 'ok', primary: true },
        { label: 'Cancel', value: null, cancel: true, skipValidate: true },
      ],
      validate: (v, attempt) => {
        const x = parseNum(v.pi);
        if (x === null) return 'Please enter a number.';
        if (Math.abs(x - value) > 0.006) return attempt >= 2 ? `2 × ${fmt(q, 4)} = <b>${fmt(value, 4)}</b>` : `Not quite. Double ${fmt(q, 4)}.`;
        return null;
      },
    });
    if (!res || res.button !== 'ok') return;
    st.scans.push({ k: a, value });
    tracker.addFound(value, `Wallis product — ${a} fraction${a === 1 ? '' : 's'}`);
    ui.toast(`π ≈ <b>${fmt(value, 4)}</b> from ${a} fraction${a === 1 ? '' : 's'}. Added to your tracker.`, 3200);
    game.refreshHud();
    if (!st.unlocked && a === FACTORS) {
      st.unlocked = true;
      markStageDone(ID, si);
      game.refreshHud();
      return play(D.allDone, { value: fmt(value, 4) });
    }
    if (st.scans.length === 1 && !st.unlocked) return play(D.firstScan, { value: fmt(value, 3), left: FACTORS - a });
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${SEVEN.name} first.`);
    const ok = await ui.choice({
      title: 'Start again?',
      text: 'The fraction goes back to 1 over 1 and the turret is emptied. Your scans and your π tracker keep their values.',
      options: [
        { label: 'Yes, start again', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!ok) return;
    Object.assign(st, {
      slots: { top: SERIES.map(() => false), bottom: SERIES.map(() => false) },
      carry: null,
      loaded: null,
      manned: false,
      shot: null,
      fx: [],
      slotFlash: {},
    });
    game.refreshHud();
    ui.toast('The fraction is 1 over 1 again.');
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    let mission;
    if (!st.briefed) mission = `Talk to <b>${SEVEN.name}</b>: walk next to them and press ${key('Enter')}.`;
    else if (st.unlocked && allDone()) mission = 'The warp gate is open. Press R to build the fraction again, or take the gate.';
    else if (allDone()) mission = `All ${FACTORS} fractions are done. Take a reading at the scanner.`;
    else if (st.carry !== null) mission = `Load the ×${st.carry} into the turret: press ${key('Enter')} next to it.`;
    else if (st.loaded === null) mission = 'Take a number from the ammo rack and load it into the turret.';
    else if (st.manned) mission = `Fire the ×${st.loaded} at the ${st.aim} rock. ${key('↑')} ${key('↓')} top or bottom, ${key('←')} ${key('→')} move, ${key('Esc')} gets out to fetch another number.`;
    else mission = `Get in the turret (${key('Enter')} next to it) and fire the ×${st.loaded}, or fetch another number. Scan whenever you have finished a fraction.`;
    const scans = st.scans.length
      ? `<h3>Your scans</h3><ol class="results">${st.scans
          .slice(-8)
          .map((c) => `<li>${c.k} fraction${c.k === 1 ? '' : 's'} → <b>${fmt(c.value, 4)}</b></li>`)
          .join('')}</ol>`
      : '';
    return `<h3>Mission</h3><p class="muted">${mission}</p>
      <h3>The fraction asteroid</h3>
      <div class="counters">
        <div class="counter"><span class="num">${count('top')} / ${FACTORS}</span><span class="lbl">top numbers</span></div>
        <div class="counter"><span class="num">${count('bottom')} / ${FACTORS}</span><span class="lbl">bottom numbers</span></div>
      </div>
      <p>Top rock: <b>${big(product('top'))}</b><br>Bottom rock: <b>${big(product('bottom'))}</b></p>
      <p class="muted">A rock's volume is its number${zoom() > 1 ? ` (zoomed out ×${big(zoom())} so they fit)` : ''}.</p>
      <p>Carrying: <b>${st.carry !== null ? `×${st.carry}` : 'nothing'}</b><br>
        In the turret: <b>${st.loaded !== null ? `×${st.loaded}` : 'nothing'}</b> · aimed at the <b>${st.aim}</b> rock</p>
      <div class="formula small">π ÷ 2 = 2/1 × 2/3 × 4/3 × 4/5 × …<br>π ≈ 2 × top ÷ bottom</div>
      ${scans}`;
  }

  // ------------------------------------------------------------ drawing
  const ROCK_COLORS = () => [WS.rockLight, WS.rock, WS.rockDark];
  const font = (r, size, weight) => `${weight} ${Math.max(9, Math.round(r.T * size))}px "Segoe UI", "Trebuchet MS", sans-serif`;

  /** A number on a dark pill, centred at pixel (px, py). */
  function pill(r, text, px, py, { size = 0.34, scale = 1 } = {}) {
    const ctx = r.ctx, T = r.T, s = size * scale;
    ctx.save();
    ctx.font = font(r, s, 800);
    const w = ctx.measureText(text).width + T * 0.35, h = T * s * 1.45;
    ctx.fillStyle = WS.pill;
    ctx.strokeStyle = WS.pillEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px - w / 2, py - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    r.text(text, px, py + 1, { size: s, weight: 800, color: WS.number });
  }

  /** A number charge: a glowing capsule marked ×n, centred at pixel (px, py). */
  function charge(r, n, px, py, t, size = 1, alpha = 1) {
    const ctx = r.ctx, T = r.T * size;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = WS.charge;
    ctx.shadowColor = WS.chargeGlow;
    ctx.shadowBlur = T * (0.3 + 0.1 * Math.sin(t / 220 + n));
    ctx.beginPath();
    ctx.roundRect(px - T * 0.3, py - T * 0.32, T * 0.6, T * 0.64, T * 0.16);
    ctx.fill();
    ctx.restore();
    r.text(`×${n}`, px, py + 1, { size: 0.24 * size, weight: 900, color: WS.chargeText, alpha });
  }

  function drawStrip(r, t) {
    const ctx = r.ctx, T = r.T, now = performance.now();
    const x0 = r.gx(STRIP.x0 - 2.3), x1 = r.gx(STRIP.x0 + STRIP.w * FACTORS + 0.2), y0 = r.gy(STRIP.y), h = T * 1.45;
    ctx.save();
    ctx.fillStyle = WS.stripBg;
    ctx.strokeStyle = WS.stripEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x0, y0, x1 - x0, h, T * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const yTop = r.gy(STRIP.y + 0.4), yBar = r.gy(STRIP.y + 0.73), yBot = r.gy(STRIP.y + 1.06);
    r.text('π ÷ 2 =', r.gx(STRIP.x0 - 1.15), yBar, { size: 0.34, weight: 800, color: WS.label });
    SERIES.forEach((f, i) => {
      const cx = r.gx(STRIP.x0 + STRIP.w * (i + 0.5));
      if (i) r.text('×', r.gx(STRIP.x0 + STRIP.w * i), yBar, { size: 0.3, color: r.style.muted });
      const done = (side) => st.slots[side][i];
      const colorOf = (side) => {
        const k = clamp((now - (st.slotFlash[side + i] || -1e9)) / 1200, 0, 1);
        return k < 1 ? WS.stripFlash : done(side) ? WS.stripDone : WS.stripTodo;
      };
      r.text(String(f.top), cx, yTop, { size: 0.32, weight: 800, color: colorOf('top') });
      r.text(String(f.bottom), cx, yBot, { size: 0.32, weight: 800, color: colorOf('bottom') });
      ctx.save();
      ctx.strokeStyle = done('top') && done('bottom') ? WS.stripDone : WS.stripTodo;
      ctx.lineWidth = Math.max(1.5, T * 0.04);
      ctx.beginPath();
      ctx.moveTo(cx - T * 0.32, yBar);
      ctx.lineTo(cx + T * 0.32, yBar);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawRack(r, t) {
    const ctx = r.ctx, T = r.T;
    const x0 = r.gx(RACK.x0), y0 = r.gy(RACK.y);
    ctx.save();
    ctx.fillStyle = WS.rackFill;
    ctx.strokeStyle = WS.rackEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x0 + T * 0.05, y0 + T * 0.05, MAX_NUM * T - T * 0.1, T * 0.9, T * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    for (let n = 1; n <= MAX_NUM; n++) charge(r, n, r.ax(RACK.x0 + n - 1), r.ay(RACK.y), t);
    r.text('AMMO RACK', r.gx(RACK.x0 + MAX_NUM / 2), r.gy(RACK.y + 1.35), { size: 0.24, color: r.style.muted });
  }

  function drawScanner(r, t) {
    const ctx = r.ctx, T = r.T, px = r.ax(SCANNER.x), py = r.ay(SCANNER.y);
    const ready = st.briefed && count('top') && count('top') === count('bottom');
    ctx.save();
    ctx.fillStyle = WS.scanner;
    ctx.strokeStyle = WS.scannerScreen;
    ctx.lineWidth = 2;
    ctx.shadowColor = WS.scannerScreen;
    ctx.shadowBlur = ready ? T * (0.3 + 0.2 * Math.sin(t / 300)) : 0;
    ctx.beginPath();
    ctx.roundRect(px - T * 0.42, py - T * 0.36, T * 0.84, T * 0.72, T * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    r.text('÷', px, py + 1, { size: 0.5, weight: 900, color: WS.scannerScreen, alpha: ready ? 1 : 0.5 });
    r.text('SCANNER', px, py + T * 0.68, { size: 0.22, color: r.style.muted });
  }

  function drawTurret(r, t) {
    const ctx = r.ctx, T = r.T;
    const k = clamp((performance.now() - st.lastSlide) / SLIDE_MS, 0, 1);
    const tx = st.slideFrom + (st.turretX - st.slideFrom) * k * (2 - k); // glides along the rail
    const px = r.ax(tx), py = r.ay(TURRET_Y);
    ctx.save();
    // the rail, with end stops
    const ry = r.gy(PLATFORM_Y + 0.92), rx0 = r.gx(RAIL.x0 + 0.1), rx1 = r.gx(RAIL.x1 + 0.9);
    ctx.strokeStyle = WS.rail;
    ctx.lineWidth = Math.max(2, T * 0.06);
    ctx.beginPath();
    ctx.moveTo(rx0, ry);
    ctx.lineTo(rx1, ry);
    ctx.moveTo(rx0, ry - T * 0.2);
    ctx.lineTo(rx0, ry + T * 0.05);
    ctx.moveTo(rx1, ry - T * 0.2);
    ctx.lineTo(rx1, ry + T * 0.05);
    ctx.stroke();
    // the platform rides with the turret
    ctx.strokeStyle = WS.platform;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.gx(tx + 0.08), r.gy(PLATFORM_Y + 0.08), T * 0.84, T * 0.84);
    // aim guide: straight up to the targeted rock's height
    if (st.manned) {
      const ty = r.gy(ROCK_Y[st.aim]);
      ctx.strokeStyle = WS.aim;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([T * 0.12, T * 0.14]);
      ctx.beginPath();
      ctx.moveTo(px, py - T * 0.5);
      ctx.lineTo(px, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px, ty, T * 0.28, 0, Math.PI * 2);
      ctx.moveTo(px - T * 0.45, ty);
      ctx.lineTo(px + T * 0.45, ty);
      ctx.stroke();
    }
    // base and barrel
    ctx.fillStyle = WS.turretBase;
    ctx.beginPath();
    ctx.arc(px, py + T * 0.1, T * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WS.turret;
    ctx.shadowColor = WS.chargeGlow;
    ctx.shadowBlur = st.loaded !== null ? T * 0.3 : 0;
    ctx.fillRect(px - T * 0.12, py - T * 0.55, T * 0.24, T * 0.6);
    ctx.restore();
    if (st.loaded !== null) charge(r, st.loaded, px, py + T * 0.1, t, 0.8);
    r.text(st.loaded !== null ? `LOADED ×${st.loaded}` : 'TURRET', px - T * 0.7, py, { size: 0.24, align: 'right', color: st.loaded !== null ? WS.label : r.style.muted, weight: 800 });
    if (st.briefed) r.text(`AIM: ${st.aim.toUpperCase()} ${st.aim === 'top' ? '▲' : '▼'}`, px + T * 0.7, py, { size: 0.24, align: 'left', color: WS.label, weight: 800 });
  }

  function drawFraction(r, t) {
    const ctx = r.ctx, T = r.T, now = performance.now();
    const x = fracX(now), px = r.gx(x);
    // ease each rock towards its real size; announce a zoom change
    const z = zoom();
    if (z !== st.shownZoom) {
      st.fx.push({ kind: 'pop', color: WS.zoom, text: z > st.shownZoom ? 'zooming out…' : 'zooming in…', x: x + BAR_HALF + 1.3, y: BAR_Y, start: now });
      st.shownZoom = z;
    }
    const ease = 1 - Math.exp(-clamp(now - st.lastDraw, 0, 100) / GROW_MS);
    st.lastDraw = now;
    for (const side of SIDES) st.shownR[side] += (rockR(side) - st.shownR[side]) * ease;
    // tethers and the fraction bar
    ctx.save();
    ctx.strokeStyle = WS.tether;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, r.gy(ROCK_Y.top));
    ctx.lineTo(px, r.gy(ROCK_Y.bottom));
    ctx.stroke();
    ctx.strokeStyle = WS.bar;
    ctx.shadowColor = WS.barGlow;
    ctx.shadowBlur = T * 0.4;
    ctx.lineWidth = Math.max(3, T * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r.gx(x - BAR_HALF), r.gy(BAR_Y));
    ctx.lineTo(r.gx(x + BAR_HALF), r.gy(BAR_Y));
    ctx.stroke();
    ctx.restore();
    for (const side of SIDES) {
      const R = st.shownR[side];
      drawRock(ctx, px, r.gy(ROCK_Y[side]), R * T, now / (side === 'top' ? 2600 : -3100), ROCK_COLORS());
      const k = clamp((now - st.pulse[side]) / PULSE_MS, 0, 1);
      const ly = side === 'top' ? ROCK_Y.top - R - 0.42 : ROCK_Y.bottom + R + 0.42;
      pill(r, big(product(side)), px, r.gy(ly), { scale: 1 + 0.45 * (1 - k) });
    }
    if (z > 1) r.text(`zoom ×${big(z)}`, r.gx(x + BAR_HALF + 0.25), r.gy(BAR_Y), { size: 0.24, align: 'left', weight: 800, color: WS.zoom });
  }

  function drawShot(r, now) {
    const s = st.shot;
    if (!s) return;
    const ctx = r.ctx, T = r.T, px = r.gx(s.x);
    if (s.outcome === 'bounce') {
      // knocked back down, fading
      const k = clamp((now - s.reachAt) / BOUNCE_MS, 0, 1);
      const y = ROCK_Y[s.target] + k * 2.5;
      charge(r, s.n, px + k * T * 0.8, r.gy(y), now, 0.7, 1 - k);
      return;
    }
    const y = boltY(s, now), tail = y + 0.9;
    ctx.save();
    ctx.strokeStyle = WS.trail;
    ctx.shadowColor = WS.chargeGlow;
    ctx.shadowBlur = T * 0.4;
    ctx.lineWidth = Math.max(3, T * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, r.gy(Math.min(tail, BOLT_Y0)));
    ctx.lineTo(px, r.gy(y));
    ctx.stroke();
    ctx.restore();
    charge(r, s.n, px, r.gy(y), now, 0.7);
  }

  function drawFx(r, now) {
    const ctx = r.ctx, T = r.T;
    for (const f of st.fx) {
      const k = clamp((now - f.start) / FX_MS, 0, 1);
      if (f.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.gx(f.x), r.gy(f.y), T * (0.4 + k * 1.4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        r.text(f.text, r.gx(f.x), r.gy(f.y - k * 1.2), { size: 0.5, weight: 900, color: f.color, alpha: 1 - k });
      }
    }
  }

  function drawFloor(r, t) {
    drawStrip(r, t);
    drawRack(r, t);
    drawScanner(r, t);
    drawTurret(r, t);
  }

  function drawOver(r, t, pp) {
    const now = performance.now();
    drawShot(r, now);
    drawFraction(r, t);
    drawFx(r, now);
    if (st.carry !== null) charge(r, st.carry, r.ax(pp.x), r.ay(pp.y - 0.75), t);
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const me = p(), bay = bayAt(me);
    let hint = null;
    if (st.manned) hint = st.carry !== null ? `Enter: load ×${st.carry} · Esc: get out` : st.loaded !== null ? 'Enter: fire · ↑↓ aim · ←→ move · Esc: get out' : 'Esc: get out';
    else if (bay !== null) hint = st.carry === bay ? null : `Enter: take ×${bay}`;
    else if (cheb(platform(), me) <= 1) hint = st.carry !== null ? `Enter: get in and load ×${st.carry}` : 'Enter: get in the turret';
    else if (cheb(SCANNER, me) <= 1) hint = 'Enter: scan';
    if (hint) r.bubble(me.x, me.y - 1.1, hint);
  }

  return {
    title: 'Fraction Yard',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'seven', name: SEVEN.name, sprite: SEVEN.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Scan the fraction after all ${FACTORS} fractions to power up the warp gate.` },
    help: `<p>Stand on the square above a number in the ammo rack and press ${key('Enter')} to take it. Press ${key('Enter')} on or next to the turret to get in (and load what you're carrying).
      In the turret ${key('↑')} aims at the top rock, ${key('↓')} at the bottom rock, ${key('←')} ${key('→')} slide it along its rail, ${key('Enter')} fires and ${key('Esc')} gets you out.</p>
      <p>The fraction keeps moving, so fire a little before it is overhead. The number stays loaded, so you can fire it again.</p>
      <p>Multiply the top rock by the top numbers of the pattern along the top of the screen, and the bottom rock by the bottom numbers, in any order.
      A number that isn't needed bounces off.</p>
      <p>Each rock's <b>volume</b> is its number, so it grows with every hit. When the rocks get too big for the screen, the view zooms out ×10.</p>
      <p>Use the scanner whenever top and bottom have the same count of numbers: π ≈ 2 × top ÷ bottom. ${key('R')} clears the fraction back to 1 over 1.</p>`,
    state: st, // exposed for debugging / tests
    blocked: (x, y) =>
      y <= 1 || // the series along the top
      (x === st.turretX && y === TURRET_Y) ||
      (x === SCANNER.x && y === SCANNER.y) ||
      (y === RACK.y && x >= RACK.x0 && x < RACK.x0 + MAX_NUM),
    interceptMove,
    onKey,
    onAction,
    tick,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

/** One simulated player: half finish all FACTORS fractions; the rest stop and scan after 4 to FACTORS − 1. */
function simulate(si, rng) {
  return estimate(rng() < 0.5 ? FACTORS : 4 + Math.floor(rng() * (FACTORS - 4)));
}

export default {
  id: ID,
  number: 7,
  title: 'Level 7 · The Fraction Yard',
  method: 'Wallis product: π ÷ 2 = 2/1 × 2/3 × 4/3 × 4/5 × …',
  style: 'wallis',
  stageCount: 1,
  stageName: () => 'Fraction Yard',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 7)', si: 0 },
    { label: 'Briefed, the fraction is 1 / 1', si: 0, opts: { briefed: true } },
    { label: `${FACTORS - 1} fractions done (scan gives a high estimate)`, si: 0, opts: { fill: 2 * (FACTORS - 1) } },
    { label: `All ${FACTORS} fractions done, ready to scan`, si: 0, opts: { fill: 2 * FACTORS } },
  ],
  simulate,
  simulateNote: `Scans are exact, so each value is the Wallis product of the first k fractions × 2 (k = ${FACTORS - 1}: ${estimate(FACTORS - 1).toFixed(3)}, k = ${FACTORS}: ${estimate(FACTORS).toFixed(3)}). Half the simulated players finish all ${FACTORS}; the rest scan after 4 to ${FACTORS - 1}.`,
};
