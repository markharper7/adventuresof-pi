// LEVEL 9 — The Friendship Portal: coprime probability.
//
// Two whole numbers picked at random share no common factor (other than 1) with probability 6 / π².
//   friends ÷ pairs ≈ 6 ÷ π²     so     π ≈ √(6 × pairs ÷ friends)
//
// A number portal at the top sends out pairs of random numbers (each uniform over 1 … MAX_N).
// They fly to the meeting ring in the middle. Numbers that share a factor bump into each other and
// push apart, and the shared factor (their gcd) is shown. Numbers with nothing in common (coprime)
// link up as friends. Then each pair goes to its pen: SHARE A FACTOR on the left, FRIENDS on the right.
//
// Consoles along the bottom call out ×1, ×10 or ×100 pairs. The first HAND pairs are called out one at
// a time and the player judges each one (share a factor / friends) before the answer is shown. That
// unlocks the ×10 and ×100 consoles, and from then on the portal judges every pair automatically.
// Every pair counts, whether judged by hand or not. The player's guess never changes the maths.
// The player presses C at any time to calculate. Each calculation goes to the tracker tray.
// The warp gate opens after a calculation that uses at least UNLOCK pairs.
// MAX_N is 100 (not bigger) so the player can check factors in their head; the probability for 1 … 100
// is 0.6087, against 6/π² = 0.6079, which is far closer than the random spread of a few hundred pairs.
// (Dialogue: npc_dialogue.js → level9.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, cheb, clamp, mulberry32 } from '../core/utils.js';
import { COPRIME_STYLE as CS } from '../../assets/theme.js';

const ID = 'coprime';
const COLS = 28, ROWS = 18;
const MAX_N = 100;                           // numbers are picked from 1 … MAX_N
const HAND = 5;                              // pairs judged by hand before the ×10 / ×100 consoles unlock
const UNLOCK = 100;                          // pairs in a calculation needed to open the warp gate
const MAX_PAIRS = 5000;
const PORTAL = { x: 14, y: 2.4 };            // centre of the portal (raw grid units); tiles 12–15 × 1–3 are blocked
const RING = { x: 14, y: 8, r: 1.9 };        // the meeting ring; tiles 12–15 × 6–9 are blocked
const PENS = {
  apart: { x: 2, y: 4, w: 6, h: 8, label: 'SHARE A FACTOR' },  // tiles 2–7 × 4–11
  friend: { x: 20, y: 4, w: 6, h: 8, label: 'FRIENDS' },       // tiles 20–25 × 4–11
};
const PEN_COLS = 6, PEN_ROWS = 18, PEN_SHOWN = PEN_COLS * PEN_ROWS; // little pairs drawn per pen; more are just counted
const CONSOLES = [
  { id: 'one', count: 1, x: 10, y: 15 },
  { id: 'ten', count: 10, x: 14, y: 15 },
  { id: 'hundred', count: 100, x: 18, y: 15 },
];
const NPC_POS = { x: 9, y: 12 };
const PLAYER_START = { x: 6, y: 14 };
const GATE = { x: 24, y: 14 };
const D = DIALOGUE.level9;
const NINE = CHARACTERS.nine;

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const piFrom = (friends, total) => Math.sqrt((6 * total) / friends);
const inRect = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const blockedTile = (x, y) =>
  (x >= 12 && x <= 15 && y >= 1 && y <= 3) ||
  (x >= 12 && x <= 15 && y >= 6 && y <= 9) ||
  inRect(x, y, PENS.apart) ||
  inRect(x, y, PENS.friend) ||
  CONSOLES.some((c) => c.x === x && c.y === y);

/** A fresh, unpredictable stream of random pairs. */
function pairStream() {
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
  return () => {
    const a = 1 + Math.floor(rng() * MAX_N), b = 1 + Math.floor(rng() * MAX_N);
    const g = gcd(a, b);
    return { a, b, g, friend: g === 1 };
  };
}

/** Why two numbers do or don't get on, as HTML. */
function explain(p) {
  if (p.friend) {
    if (p.a === 1 || p.b === 1) return `1 shares no factor with anything, so <b>${p.a}</b> and <b>${p.b}</b> are friends.`;
    return `No whole number bigger than 1 divides both <b>${p.a}</b> and <b>${p.b}</b>. Nothing in common, so they are friends!`;
  }
  if (p.a === p.b) return `<b>${p.a}</b> and <b>${p.b}</b> are the same number, so they share every factor. They push apart.`;
  return `Both divide by <b>${p.g}</b>: ${p.a} = ${p.g} × ${p.a / p.g} and ${p.b} = ${p.g} × ${p.b / p.g}. They share a factor, so they push apart.`;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function createStage(game, si, opts = {}) {
  const nextPair = pairStream();
  const st = {
    briefed: !!opts.briefed || !!opts.preload,
    hand: opts.preload ? HAND : 0, // pairs judged by hand so far
    right: 0,                      // ...and how many of those the player got right
    pairs: [],                     // pairs that have reached their pen: { a, b, g, friend }
    flying: [],                    // pairs on their way: { pair, start, meet, slot, hand }
    friends: 0,
    slots: { apart: 0, friend: 0 }, // next free spot in each pen
    calcs: [],                     // { friends, total, pi }
    unlocked: false,
  };
  const total = () => st.pairs.length;
  const pending = () => st.flying.length;
  const handDone = () => st.hand >= HAND;
  function arrive(p) {
    st.pairs.push(p);
    if (p.friend) st.friends++;
  }
  if (opts.preload) {
    for (let i = 0; i < opts.preload; i++) {
      const p = nextPair();
      st.slots[p.friend ? 'friend' : 'apart']++;
      arrive(p);
    }
  }

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      return play(D.intro, { hand: HAND });
    }
    if (st.unlocked) return play(D.again);
    if (!handDone()) return play(D.handProgress, { done: st.hand, hand: HAND });
    if (!st.calcs.length) return play(D.notCalculatedYet);
    const last = st.calcs[st.calcs.length - 1];
    return play(D.firstCalculation, { value: fmt(last.pi, 3), total: last.total });
  }

  // ------------------------------------------------------------ the pairs
  // Timings (ms): portal → ring, meeting in the ring, ring → pen. Batches go faster.
  const SLOW = { fly: 650, meet: 900, pen: 650 };
  const FAST = { fly: 380, meet: 420, pen: 420 };

  /** Send a pair out of the portal. meet = when it starts meeting in the ring (Infinity = wait for the player). */
  function launch(pair, start, speed, hand = false) {
    const side = pair.friend ? 'friend' : 'apart';
    const f = { pair, start, speed, meet: hand ? Infinity : start + speed.fly, slot: st.slots[side]++, hand };
    st.flying.push(f);
    return f;
  }

  function tick(now) {
    if (!st.flying.length) return;
    let changed = false;
    st.flying = st.flying.filter((f) => {
      if (now < f.meet + f.speed.meet + f.speed.pen) return true;
      arrive(f.pair);
      changed = true;
      return false;
    });
    if (changed) game.refreshHud();
  }

  const consoleNear = (p) => CONSOLES.find((c) => cheb(c, p) <= 1);

  async function onAction() {
    const c = consoleNear(game.player);
    if (!c) return false;
    if (!st.briefed) return ui.toast(`The portal belongs to ${NINE.name}. Talk to them first.`), true;
    if (total() + pending() + c.count > MAX_PAIRS) return ui.toast(`The pens are full. Press ${key('R')} to empty them.`, 4000), true;
    if (c.count === 1 && !handDone()) {
      await judgeByHand();
      return true;
    }
    if (!handDone()) return ui.toast(`Judge ${HAND - st.hand} more pair${HAND - st.hand > 1 ? 's' : ''} yourself with the ×1 console first.`, 3500), true;
    const now = performance.now();
    const spread = Math.min(2600, c.count * 55);
    for (let i = 0; i < c.count; i++) launch(nextPair(), now + (c.count > 1 ? (i / c.count) * spread : 0), c.count > 1 ? FAST : SLOW);
    ui.toast(`The portal sends out ${c.count} pair${c.count > 1 ? 's' : ''} of numbers!`);
    game.refreshHud();
    return true;
  }

  /** One pair, judged by the player before the answer is shown. */
  async function judgeByHand() {
    const pair = nextPair();
    const f = launch(pair, performance.now(), SLOW, true);
    await sleep(SLOW.fly);
    const guess = await ui.choice({
      title: `${pair.a} and ${pair.b}`,
      text: `Does any whole number bigger than 1 divide into both <b>${pair.a}</b> and <b>${pair.b}</b>?`,
      options: [
        { label: `Yes, they share a factor`, value: false },
        { label: `No, nothing in common: friends!`, value: true },
      ],
      cancelValue: null,
    });
    f.meet = performance.now();
    await sleep(SLOW.meet);
    const right = guess === pair.friend;
    st.hand++;
    if (right) st.right++;
    game.refreshHud();
    await ui.panel({
      title: pair.friend ? 'Friends!' : 'They push apart!',
      html: `<p>${guess === null ? '' : right ? '<b>You were right.</b> ' : '<b>Not quite.</b> '}${explain(pair)}</p>
        <p class="muted">Judged by hand: ${st.hand} of ${HAND}</p>`,
      buttons: [{ label: 'OK', value: true, primary: true }],
    });
    if (st.hand === HAND) await play(D.handDone, { right: st.right, hand: HAND });
  }

  // ------------------------------------------------------------ calculate (C)
  async function calculate() {
    if (!st.briefed) return ui.toast(`Talk to ${NINE.name} first.`);
    const n = total(), fr = st.friends;
    if (!n) return ui.toast(pending() ? 'Wait for the pairs to reach their pens…' : 'Call out some pairs of numbers first.');
    if (!fr) return ui.toast('No friends yet, so there is nothing to divide by. Call out some more pairs!', 3500);
    const pi = piFrom(fr, n), sq = (6 * n) / fr;
    const v = await ui.panel({
      title: 'Count up the friends',
      html: `<p>Every pair was two random numbers from 1 to ${MAX_N}. Some had nothing in common (friends), some shared a factor.</p>
        <div class="formula">
          friends ÷ pairs ≈ 6 ÷ π²<br>
          ${fr} ÷ ${n} ≈ 6 ÷ π²<br><br>
          π² ≈ 6 × ${n} ÷ ${fr} = ${fmt(sq, 4)}<br>
          π ≈ √${fmt(sq, 4)} = <b>${fmt(pi, 4)}</b>
        </div>
        ${pending() ? `<p class="muted">${pending()} pair${pending() > 1 ? 's are' : ' is'} still on the way, so they aren’t counted.</p>` : ''}`,
      buttons: [
        { label: 'Add to my tracker', value: 'add', primary: true },
        { label: 'Not yet', value: null },
      ],
    });
    if (v !== 'add') return;
    st.calcs.push({ friends: fr, total: n, pi });
    tracker.addFound(pi, `Coprime pairs — ${n} pair${n > 1 ? 's' : ''}`);
    ui.toast(`π ≈ <b>${fmt(pi, 4)}</b> from ${n} pairs. Added to your tracker.`, 3200);
    game.refreshHud();
    if (!st.unlocked && n >= UNLOCK) {
      st.unlocked = true;
      markStageDone(ID, si);
      await play(D.enoughPairs, { value: fmt(pi, 3), total: n });
    } else if (st.calcs.length === 1 && !st.unlocked) {
      await play(D.firstCalculation, { value: fmt(pi, 3), total: n });
    }
  }

  function onKey(e) {
    if (e.code === 'KeyC') game.run(calculate);
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${NINE.name} first.`);
    if (pending()) return ui.toast('Wait for the pairs to reach their pens first.');
    const ok = await ui.choice({
      title: 'Empty the pens?',
      text: 'All the pairs go home and the counts go back to zero (your π tracker keeps its values).',
      options: [
        { label: 'Yes, empty them', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!ok) return;
    st.pairs = [];
    st.friends = 0;
    st.slots = { apart: 0, friend: 0 };
    game.refreshHud();
    ui.toast('The pens are empty.');
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const n = total(), fr = st.friends;
    const counts = `<h3>Pairs of numbers</h3>
      <div class="counters">
        <div class="counter"><span class="num">${fr}</span><span class="lbl">friends</span></div>
        <div class="counter"><span class="num">${n}</span><span class="lbl">pairs</span></div>
      </div>
      ${pending() ? `<p class="muted">${pending()} on the way…</p>` : ''}
      ${st.briefed && !handDone() ? `<p>Judged by hand: <b>${st.hand}</b> of ${HAND}</p>` : ''}
      <div class="formula small">friends ÷ pairs ≈ 6 ÷ π²<br>π ≈ √(6 × pairs ÷ friends)<br>Press ${key('C')} to calculate</div>`;
    const calcs = st.calcs.length
      ? `<h3>Your calculations</h3><ol class="results">${st.calcs
          .slice(-6)
          .map((x) => `<li>${x.total} pairs → <b>${fmt(x.pi, 4)}</b></li>`)
          .join('')}</ol>`
      : '';
    let mission;
    if (!st.briefed) mission = `<p>Talk to <b>${NINE.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
    else if (st.unlocked) mission = `<p class="muted">The warp gate is open. Call out more pairs for a better estimate, or take the gate.</p>`;
    else if (!handDone()) mission = `<p class="muted">Use the ×1 console to call out a pair, then decide: do they share a factor, or are they friends?</p>`;
    else mission = `<p class="muted">Call out pairs with the consoles, then calculate. A calculation with at least ${UNLOCK} pairs opens the warp gate.</p>`;
    return `<h3>Mission</h3>${mission}${counts}${calcs}`;
  }

  // ------------------------------------------------------------ drawing
  /** A little number character: a round bubble with two eyes and its number. */
  function numberBubble(r, x, y, n, { rad = 0.38, color = CS.bubble, glow = null, label = true } = {}) {
    const ctx = r.ctx, T = r.T, px = r.gx(x), py = r.gy(y), R = rad * T;
    ctx.save();
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = R * 0.8;
    }
    ctx.fillStyle = color;
    ctx.strokeStyle = CS.bubbleEdge;
    ctx.lineWidth = Math.max(1, R * 0.1);
    ctx.beginPath();
    ctx.arc(px, py, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = CS.bubbleText;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(px + s * R * 0.32, py - R * 0.5, Math.max(1, R * 0.11), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    if (label) r.text(String(n), px, py + R * 0.15, { size: rad * (n >= 100 ? 0.75 : 0.95), color: CS.bubbleText, weight: 800 });
  }

  /** Where each number of a flying pair is: portal → ring → (meet) → pen slot. */
  function pairPos(f, now) {
    const t = now - f.start;
    if (t < 0) return null;
    const sp = f.speed, p = f.pair;
    const L = { x: RING.x - 0.95, y: RING.y }, R = { x: RING.x + 0.95, y: RING.y };
    const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    const ease = (k) => k * (2 - k);
    // 1. out of the portal, the two numbers fanning out to either side of the ring
    if (t < sp.fly) {
      const k = ease(t / sp.fly);
      return { a: lerp(PORTAL, L, k), b: lerp(PORTAL, R, k), phase: 'fly', join: 0 };
    }
    // 2. waiting in the ring for the player's verdict
    if (now < f.meet) return { a: L, b: R, phase: 'wait', join: 0, bob: Math.sin(now / 250) * 0.06 };
    const m = now - f.meet;
    // 3. meeting: friends slide together and link; the others bump and spring back apart
    if (m < sp.meet) {
      const k = m / sp.meet;
      if (p.friend) {
        const e = ease(Math.min(1, k * 1.6));
        return { a: lerp(L, { x: RING.x - 0.42, y: RING.y }, e), b: lerp(R, { x: RING.x + 0.42, y: RING.y }, e), phase: 'meet', join: e };
      }
      const d = k < 0.4 ? ease(k / 0.4) : 1 - ease((k - 0.4) / 0.6) * 1.35; // in, bump, then back out past the start
      return {
        a: lerp(L, { x: RING.x - 0.42, y: RING.y }, d),
        b: lerp(R, { x: RING.x + 0.42, y: RING.y }, d),
        phase: 'meet',
        join: 0,
        bump: k > 0.35 ? 1 - (k - 0.35) / 0.65 : 0,
      };
    }
    // 4. off to the pen
    const k = ease(clamp((m - sp.meet) / sp.pen, 0, 1));
    const side = p.friend ? 'friend' : 'apart';
    const s = slotPos(side, f.slot);
    const fromA = p.friend ? { x: RING.x - 0.42, y: RING.y } : { x: RING.x - 1.3, y: RING.y };
    const fromB = p.friend ? { x: RING.x + 0.42, y: RING.y } : { x: RING.x + 1.3, y: RING.y };
    return { a: lerp(fromA, s.a, k), b: lerp(fromB, s.b, k), phase: 'pen', join: p.friend ? 1 : 0, shrink: k };
  }

  /** The two ends of pen slot i (a tiny pair). Past PEN_SHOWN they pile onto the last row. */
  function slotPos(side, i) {
    const pen = PENS[side];
    const j = Math.min(i, PEN_SHOWN - 1);
    const cw = pen.w / PEN_COLS, ch = (pen.h - 0.4) / PEN_ROWS;
    const cx = pen.x + cw * ((j % PEN_COLS) + 0.5), cy = pen.y + 0.4 + ch * (Math.floor(j / PEN_COLS) + 0.5);
    const half = side === 'friend' ? 0.13 : 0.24;
    return { a: { x: cx - half, y: cy }, b: { x: cx + half, y: cy } };
  }

  function drawPortal(r, t) {
    const ctx = r.ctx, T = r.T, px = r.gx(PORTAL.x), py = r.gy(PORTAL.y);
    ctx.save();
    ctx.fillStyle = CS.portalBase;
    ctx.beginPath();
    ctx.ellipse(px, py + T * 0.9, T * 1.7, T * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = CS.portal[i];
      ctx.shadowColor = CS.portal[i];
      ctx.shadowBlur = T * 0.3;
      ctx.lineWidth = Math.max(1.5, T * 0.07);
      ctx.beginPath();
      const a0 = t / (500 + i * 180) + (i * Math.PI * 2) / 3;
      ctx.arc(px, py, T * (1.25 - i * 0.3), a0, a0 + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
    r.text(`NUMBER PORTAL · 1 to ${MAX_N}`, px, py - T * 1.75, { size: 0.24, color: r.style.muted });
  }

  function drawRing(r, t) {
    const ctx = r.ctx, T = r.T;
    ctx.save();
    ctx.strokeStyle = CS.ring;
    ctx.shadowColor = CS.ringGlow;
    ctx.shadowBlur = T * (0.3 + 0.1 * Math.sin(t / 400));
    ctx.lineWidth = Math.max(1.5, T * 0.06);
    ctx.setLineDash([T * 0.2, T * 0.12]);
    ctx.lineDashOffset = t / 80;
    ctx.beginPath();
    ctx.arc(r.gx(RING.x), r.gy(RING.y), RING.r * T, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    r.text('MEETING RING', r.gx(RING.x), r.gy(RING.y + RING.r + 0.35), { size: 0.22, color: r.style.muted });
  }

  function drawPen(r, side) {
    const ctx = r.ctx, T = r.T, pen = PENS[side];
    const friend = side === 'friend';
    const col = friend ? CS.friend : CS.apart;
    ctx.save();
    ctx.fillStyle = CS.penFill;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([T * 0.15, T * 0.1]);
    const x0 = r.gx(pen.x), y0 = r.gy(pen.y), w = pen.w * T, h = pen.h * T;
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // the pairs already in the pen
    const n = Math.min(st.slots[side] - flyingTo(side), PEN_SHOWN);
    const rad = Math.max(1.5, T * 0.07);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, T * 0.04);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const s = slotPos(side, i);
      const ax = r.gx(s.a.x), ay = r.gy(s.a.y), bx = r.gx(s.b.x), by = r.gy(s.b.y);
      ctx.moveTo(ax + rad, ay);
      ctx.arc(ax, ay, rad, 0, Math.PI * 2);
      ctx.moveTo(bx + rad, by);
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
    }
    ctx.fill();
    if (friend) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const s = slotPos(side, i);
        ctx.moveTo(r.gx(s.a.x), r.gy(s.a.y));
        ctx.lineTo(r.gx(s.b.x), r.gy(s.b.y));
      }
      ctx.stroke();
    }
    ctx.restore();
    const count = friend ? st.friends : total() - st.friends;
    r.text(pen.label, x0 + w / 2, y0 - T * 0.65, { size: 0.26, color: col, weight: 800 });
    r.text(String(count), x0 + w / 2, y0 - T * 0.25, { size: 0.3, color: CS.label, weight: 800 });
    if (count > PEN_SHOWN) r.text(`(showing ${PEN_SHOWN})`, x0 + w / 2, y0 + h + T * 0.3, { size: 0.2, color: r.style.muted });
  }
  /** Slots already reserved by pairs still in the air (they shouldn't be drawn in the pen yet). */
  const flyingTo = (side) => st.flying.reduce((k, f) => k + ((f.pair.friend ? 'friend' : 'apart') === side ? 1 : 0), 0);

  function drawConsoles(r, t) {
    const ctx = r.ctx, T = r.T;
    for (const c of CONSOLES) {
      const locked = c.count > 1 && !handDone();
      const x0 = r.gx(c.x + 0.1), y0 = r.gy(c.y + 0.15), w = T * 0.8, h = T * 0.7;
      ctx.save();
      ctx.globalAlpha = locked ? 0.4 : 1;
      ctx.fillStyle = CS.console;
      ctx.strokeStyle = CS.consoleEdge;
      ctx.shadowColor = CS.consoleEdge;
      ctx.shadowBlur = locked ? 0 : T * (0.15 + 0.1 * Math.sin(t / 500 + c.x));
      ctx.lineWidth = 2;
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeRect(x0, y0, w, h);
      ctx.restore();
      r.text(locked ? '🔒' : `×${c.count}`, r.gx(c.x + 0.5), r.gy(c.y + 0.5), { size: 0.26, color: CS.label, weight: 800 });
    }
  }

  function drawFlying(r, now) {
    const ctx = r.ctx, T = r.T;
    const label = st.flying.length <= 40; // big batches: plain bubbles, no numbers (too small to read anyway)
    for (const f of st.flying) {
      const q = pairPos(f, now);
      if (!q) continue;
      const p = f.pair;
      const rad = 0.38 * (1 - 0.75 * (q.shrink || 0));
      const done = q.phase === 'meet' || q.phase === 'pen';
      const color = done ? (p.friend ? CS.friend : CS.apart) : CS.bubble;
      const glow = done ? (p.friend ? CS.friendGlow : CS.apartGlow) : null;
      const bob = q.bob || 0;
      if (q.join > 0) {
        ctx.save();
        ctx.strokeStyle = CS.friend;
        ctx.shadowColor = CS.friendGlow;
        ctx.shadowBlur = T * 0.3;
        ctx.globalAlpha = q.join;
        ctx.lineWidth = Math.max(1.5, T * 0.08 * (1 - 0.6 * (q.shrink || 0)));
        ctx.beginPath();
        ctx.moveTo(r.gx(q.a.x), r.gy(q.a.y));
        ctx.lineTo(r.gx(q.b.x), r.gy(q.b.y));
        ctx.stroke();
        ctx.restore();
      }
      const show = label && (q.shrink || 0) < 0.5;
      numberBubble(r, q.a.x, q.a.y + bob, p.a, { rad, color, glow, label: show });
      numberBubble(r, q.b.x, q.b.y - bob, p.b, { rad, color, glow, label: show });
      if (q.bump && label) r.text(`÷${p.g}`, r.gx(RING.x), r.gy(RING.y - 0.8), { size: 0.34, color: CS.apart, weight: 800, alpha: q.bump });
      if (p.friend && q.phase === 'meet' && label) r.text('♥', r.gx(RING.x), r.gy(RING.y - 0.75 - q.join * 0.2), { size: 0.4, color: CS.friend, alpha: q.join });
    }
  }

  function drawFloor(r, t) {
    drawRing(r, t);
    drawPortal(r, t);
    drawPen(r, 'apart');
    drawPen(r, 'friend');
    drawConsoles(r, t);
  }

  function drawOver(r, t) {
    drawFlying(r, performance.now());
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const p = game.player, c = consoleNear(p);
    if (!c) return;
    if (c.count === 1 && !handDone()) r.bubble(p.x, p.y - 1.1, 'Enter: call out a pair');
    else if (c.count > 1 && !handDone()) r.bubble(p.x, p.y - 1.1, `Locked: judge ${HAND} pairs first`);
    else r.bubble(p.x, p.y - 1.1, `Enter: call out ${c.count} pair${c.count > 1 ? 's' : ''}`);
  }

  return {
    title: 'Friendship Portal',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'nine', name: NINE.name, sprite: NINE.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Calculate π using at least ${UNLOCK} pairs to power up the warp gate.` },
    help: `<p>Use the consoles along the bottom with ${key('Enter')} to call pairs of random numbers out of the portal.
      The first ${HAND} pairs come one at a time and you decide: do they share a factor, or are they friends (coprime)?
      After that the ×10 and ×100 consoles work, and the portal judges every pair for you.</p>
      <p>${key('C')} counts the pairs and calculates π ≈ √(6 × pairs ÷ friends). The answer goes to your tracker.
      If you're standing next to ${NINE.name}, ${key('Enter')} talks instead.</p>
      <p>${key('R')} empties the pens.</p>`,
    state: st, // exposed for debugging / tests
    blocked: blockedTile,
    onAction,
    onKey,
    tick,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

/** One simulated player: judges the hand pairs, then calls out 100 to 1000 pairs in total, and calculates. */
function simulate(si, rng) {
  const n = 100 * (1 + Math.floor(rng() * 10));
  let fr = 0;
  for (let i = 0; i < n; i++) if (gcd(1 + Math.floor(rng() * MAX_N), 1 + Math.floor(rng() * MAX_N)) === 1) fr++;
  return piFrom(Math.max(1, fr), n);
}

export default {
  id: ID,
  number: 9,
  title: 'Level 9 · The Friendship Portal',
  method: 'Coprime pairs: π ≈ √(6 × pairs ÷ friends)',
  style: 'coprime',
  stageCount: 1,
  stageName: () => 'Friendship Portal',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 9)', si: 0 },
    { label: 'Briefed, no pairs judged yet', si: 0, opts: { briefed: true } },
    { label: 'Briefed, 1000 pairs already sorted', si: 0, opts: { preload: 1000 } },
  ],
  simulate,
  simulateNote: `Each simulated player calls out between 100 and 1000 pairs (in hundreds, numbers 1 to ${MAX_N}) and calculates once.`,
};
