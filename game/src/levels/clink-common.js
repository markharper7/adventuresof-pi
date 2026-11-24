// Shared by Level 11 (The Collision Course) and Level 12 (Counting in Twos): Galperin's colliding blocks.
//
// A 1 tonne rock sits on a frictionless track in front of an ENERGY SHIELD (a wall: nothing gets through, and
// anything that hits it bounces off perfectly).
// The player picks a big asteroid from a pad and it is pushed along the track towards the little rock.
// Every collision is perfectly elastic. The little rock gets squashed between the big one and the shield,
// again and again, until both rocks fly off. If the big rock weighs M tonnes, the number of collisions
// (rock–rock plus rock–shield) is π × √M rounded down. So with M = base^(2k) the count, written in that base,
// is the first digits of π with the point taken out:
//     base 10, M = 100^k: 1 t → 3,  100 t → 31,  10,000 t → 314 …            (Level 11)
//     base 2,  M = 4^k:   4 t → 110, 16 t → 1100, 64 t → 11001 (= 11.001₂) … (Level 12)
// Nothing is explained: like Level 1, "why?" is left as an open question.
//
// The physics is event based (exact, no time steps): from each collision we work out exactly when the next
// one happens (little rock hits the shield, or the rocks meet), move there and update the velocities.
// The whole run is worked out when the rock is put on the track, then played back at ONE steady speed (RATE),
// the same for every run and never changing during a run, so everything on screen moves exactly as it really
// would. With heavy rocks almost all the collisions happen in a blink by the shield, so the big rock seems to
// bounce straight off while the counter leaps. Each collision flashes and makes a short "clink" sound.
//
// The five main pads unlock in order. For the first one the collision counter is hidden and the player counts
// the collisions themselves (and can watch again) before the true count is revealed. After that the counter is
// shown live. Each run adds collisions ÷ base^k to the tracker. The third run opens the warp gate.
// Once all five are done an optional custom pad opens at the bottom (it doesn't affect the gate): the player
// types any mass from 1 t up to 100,000,000 t. Just the count, nothing to the tracker. (With steps: true the
// point and value boxes fill in too, with the point where π's point is in that base.)
// With steps: true the top shows four boxes: the count → the count in the level's base → the point put in → the value.
// With a dial (Level 12), a base dial switches on when the warp gate opens: the player picks any base in the list,
// the pads change to that base's asteroids (base², base⁴ … tonnes) and each base keeps its own runs.
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, CHARACTERS } from '../core/talk.js';
import { fmt, key, cheb, parseNum } from '../core/utils.js';
import { drawRock } from '../core/rock.js';

const COLS = 28, ROWS = 17;
const SMALL_W = 0.5, SMALL_X = 4, BIG_X = 9;   // little rock width and start positions (simulation units = squares)
const WALL_X = 2.5;                            // the energy shield's face (raw grid x); simulation x is measured from here
const TRACK_Y = 7.6;                           // the rocks sit on this line (raw grid y)
const TRACK_END = 27;
const RATE = 5;                                // simulation seconds per screen second, for every run (normal speed: big rock moves 5 squares a second)
const TAIL_MS = 2500;                          // keep watching the rocks fly off after the last collision
const START = { x: 12, y: 8 };                 // where π stands to put an asteroid on the track's starting point
const NPC_POS = { x: 3, y: 13 };
const PLAYER_START = { x: 5, y: 9 };
const GATE = { x: 25, y: 13 };
const EXTRA_PAD = { x: 14, y: 14 };            // the optional bottom pad
const DIAL_POS = { x: 9, y: 14 };              // the base dial (only in levels with cfg.dial)
const HAND = [0];                              // main pads whose collisions the player counts by hand (the first time)
const UNLOCK = 2;                              // the main pad whose run opens the warp gate
const POINT_MS = 700;                          // how long the point takes to drop into place (steps counter)

/** Drawn width in squares: 1 t is the same size as the little rock, then grows slowly (+0.4 for every ×100). */
export const widthOf = (mass) => SMALL_W + 0.2 * Math.log10(mass);
export const massLabel = (mass) => `${mass.toLocaleString('en-GB', { maximumFractionDigits: 3 })} t`;

/**
 * Work out every collision exactly. Little rock (mass 1, width SMALL_W) starts at rest; the big rock
 * (mass M, width bw) moves left at speed 1. The shield's face is at x = 0.
 * Returns typed arrays of the state just after each collision, plus the start state.
 */
export function simulate(M, bw) {
  let x1 = SMALL_X, v1 = 0, x2 = BIG_X, v2 = -1, t = 0;
  const T = [], X1 = [], V1 = [], X2 = [], V2 = [], K = [];
  for (;;) {
    const tw = v1 < 0 ? x1 / -v1 : Infinity;                    // little rock reaches the shield
    const tb = v1 > v2 ? (x2 - (x1 + SMALL_W)) / (v1 - v2) : Infinity; // the rocks meet
    if (tw === Infinity && tb === Infinity) break;              // 0 ≤ v1 ≤ v2: nothing will ever hit again
    const dt = Math.max(0, Math.min(tw, tb));
    x1 += v1 * dt;
    x2 += v2 * dt;
    t += dt;
    if (tw <= tb) {
      x1 = 0;
      v1 = -v1;
      K.push(0);
    } else {
      x2 = x1 + SMALL_W;
      const a = ((1 - M) * v1 + 2 * M * v2) / (1 + M), b = ((M - 1) * v2 + 2 * v1) / (1 + M);
      v1 = a;
      v2 = b;
      K.push(1);
    }
    T.push(t); X1.push(x1); V1.push(v1); X2.push(x2); V2.push(v2);
  }
  const f = (a) => Float64Array.from(a);
  return { count: K.length, t: f(T), x1: f(X1), v1: f(V1), x2: f(X2), v2: f(V2), kind: Uint8Array.from(K), bw };
}

/** Screen time (ms after the push) of every collision: one steady speed, so screen time ∝ simulation time. */
function timeline(sim) {
  const disp = new Float64Array(sim.count);
  for (let i = 0; i < sim.count; i++) disp[i] = (sim.t[i] * 1000) / RATE;
  return disp;
}

/** Index of the last collision at or before screen time d (−1 = none yet). */
function lastBefore(disp, d) {
  let lo = -1, hi = disp.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (disp[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// A short "clink" sound made on the fly (no sound files). Created on first use, after a key press.
let audio = null;
function clinkSound(kind) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(), now = audio.currentTime;
    o.type = 'triangle';
    o.frequency.value = kind ? 1350 : 1900;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.07, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    o.connect(g).connect(audio.destination);
    o.start(now);
    o.stop(now + 0.07);
  } catch {
    /* no sound available: the flashes still show every collision */
  }
}

/**
 * Build a colliding-blocks level module.
 * cfg: {
 *   id, number, title, stageTitle, method, style,   level registry fields (style: key into LEVEL_STYLES)
 *   colors,                                          CLINK_STYLE-like palette (assets/theme.js)
 *   npc, dialogue,                                   key into CHARACTERS, and that level's DIALOGUE block
 *   base,                                            the counting base the level starts in (any 2–10)
 *   ks,                                              five k values (or base => five k values): the main pads hold
 *                                                    base^(2k) tonne asteroids
 *   dial,                                            optional list of bases: a base dial, switched on when the warp
 *                                                    gate opens, changes the counting base (each base keeps its own runs)
 *   steps,                                           true: four boxes at the top (count → in base → point in → value)
 *   formula, help,                                   HUD box (HTML, or (base, rocks) => HTML) and extra help text
 *   debugJumps, simulateNote
 * }
 */
export function makeClinkLevel(cfg) {
  const { id: ID, colors: CS, dialogue: D } = cfg;
  const NPC = CHARACTERS[cfg.npc];
  const ksFor = typeof cfg.ks === 'function' ? cfg.ks : () => cfg.ks;
  /** The five main pads in a base: base^(2k) tonne asteroids. */
  const rocksFor = (b) =>
    ksFor(b).map((k, n) => {
      const mass = b ** (2 * k);                 // tonnes; the little rock is 1 tonne
      return { n, k, mass, label: massLabel(mass), w: widthOf(mass), pad: { x: 6 + 4 * n, y: 11 } };
    });
  const ROCKS0 = rocksFor(cfg.base);             // the starting base's pads
  const MAX_MASS = 100_000_000;                  // the custom asteroid's cap (Level 11's heaviest asteroid)
  const EXTRA = { id: 'custom', pad: EXTRA_PAD };  // the optional bottom pad: any mass
  const DIAL = cfg.dial ? DIAL_POS : null;

  function createStage(game, si, opts = {}) {
    // ---- numbers in the current base (the base dial can change it: see useBase)
    let B, BASE_NAME, INT_DIGITS, ROCKS, PADS;
    const digits = (count) => count.toString(B);
    /** The count with the point put back in, k places from the right: 25 → 11001 → "11.001". */
    const pointed = (count, k) => {
      const s = digits(count);
      return k ? `${s.slice(0, s.length - k)}.${s.slice(s.length - k)}` : s;
    };
    /**
     * How many digits go after the point. The fixed pads: k (the pad's mass is base^(2k), so √mass = base^k and the
     * count is π shifted k places). A custom mass has no k of its own, so the point goes where π's point is in this
     * base: after the first two digits in binary and base 3 (π = 11.001…₂ = 10.010…₃), after the first one from
     * base 4 up (π = 3.…). 50 t → 22 = 10110 → 10.110 = 2.75.
     */
    const pointK = (rock, count) => (rock.kind === 'custom' ? Math.max(0, digits(count).length - INT_DIGITS) : rock.k);
    /**
     * count ÷ base^k as an ordinary decimal. Exact for bases made of 2s and 5s (2, 4, 5, 8, 10): 1/2 needs one
     * decimal place, 1/5 one, 1/8 three, so 1/base^k needs (places per digit) × k. Rounded for 3, 6, 7, 9.
     */
    const EXACT_PLACES = { 2: 1, 4: 2, 5: 1, 8: 3 };
    const valueText = (count, k) => {
      const v = count / B ** k;
      if (B === 10) return fmt(v, k);
      const places = EXACT_PLACES[B] ? EXACT_PLACES[B] * k : Math.ceil(k * Math.log10(B)) + 1;
      return v.toFixed(Math.min(15, places)).replace(/\.?0+$/, '');
    };

    const st = {
      briefed: !!opts.briefed || !!opts.results,
      base: cfg.base,      // the counting base right now
      bases: {             // base -> { results: n -> collisions, counted: n -> counted by hand }: each base keeps its own runs
        [cfg.base]: { results: { ...(opts.results || {}) }, counted: { ...(opts.results ? { 0: true } : {}) } },
      },
      results: null,       // the current base's results and counted (set by useBase)
      counted: null,
      extras: !!opts.results && ROCKS0.length - 1 in opts.results, // the custom pad is open (all five done in some base)
      dialSeen: false,     // the player has turned the base dial before
      custom: [],          // custom pad: the latest runs, newest first: { label, count }
      lastCustom: '',      // custom pad: the mass last typed in, offered again next time
      run: null,           // { rock, sim, disp, start, shown, hand, finished, revealAt } (rock = the load that was pushed)
      carrying: null,      // the load π is carrying to the starting point: { src (its pad), kind, mass, label, w, n?, k? }
      flashes: [],         // { x, y, t, kind }
      lastSound: 0,
      unlocked: opts.results ? UNLOCK in opts.results : false,
    };

    /** Count in base b from now on: its numbers, its pads and its own runs so far. */
    function useBase(b) {
      B = b;
      st.base = b;
      BASE_NAME = b === 2 ? 'binary' : b === 10 && !cfg.steps ? '' : `base ${b}`;
      INT_DIGITS = (3).toString(b).length;
      ROCKS = rocksFor(b);
      PADS = [...ROCKS, EXTRA];
      // only the starting base's first asteroid is counted by hand
      const own = (st.bases[b] ??= { results: {}, counted: b === cfg.base ? {} : { 0: true } });
      st.results = own.results;
      st.counted = own.counted;
    }
    useBase(cfg.base);
    if (DIAL && opts.base) useBase(opts.base);

    if (st.unlocked) markStageDone(ID, si);
    const extrasOpen = () => st.extras;
    const isUnlocked = (pad) => (pad === EXTRA ? extrasOpen() : pad.n === 0 || st.results[pad.n - 1] !== undefined);
    const lockedHint = (pad) => ROCKS[pad === EXTRA ? ROCKS.length - 1 : pad.n - 1].label;
    const nextRock = () => ROCKS.find((r) => st.results[r.n] === undefined) || null;
    const mainLoad = (rock) => ({ src: rock, kind: 'main', n: rock.n, k: rock.k, mass: rock.mass, label: rock.label, w: rock.w });
    const playing = () => st.run && !st.run.finished;
    const hiddenRun = (run) => run && run.hand && !st.counted[run.rock.n]; // the count stays hidden until the player has given theirs
    /** Placeholder values for dialogue lines after a run. */
    const vars = (rock, count) => {
      const k = pointK(rock, count);
      return { count, mass: rock.label, digits: digits(count), pointed: pointed(count, k), value: valueText(count, k), inBase: BASE_NAME };
    };

    // ------------------------------------------------------------ conversation
    async function talk() {
      if (!st.briefed) {
        st.briefed = true;
        game.refreshHud();
        return play(D.intro);
      }
      if (extrasOpen()) return play(D.extras);
      if (st.unlocked) return play(D.again);
      const nx = nextRock();
      return play(D.progress, { next: nx ? nx.label : '' });
    }

    // ------------------------------------------------------------ runs
    const padNear = (p) => PADS.find((r) => cheb(r.pad, p) <= 1);

    /** Ask for the custom asteroid's mass (1 t to MAX_MASS). Returns the mass, or null if the player backs out. */
    async function askMass() {
      const parse = (s) => {
        const t = String(s ?? '').replace(/[,\s_]/g, '').replace(/t$/i, '');
        const m = t === '' ? NaN : Number(t);
        return Number.isFinite(m) ? m : null;
      };
      const res = await ui.form({
        title: 'Build an asteroid',
        html: `<p>How heavy? Any mass from 1 tonne up to ${massLabel(MAX_MASS).replace(' t', ' tonnes')}.</p>`,
        fields: [{ id: 'm', label: 'Mass in tonnes', value: st.lastCustom, placeholder: 'e.g. 50' }],
        buttons: [
          { label: 'Pick it up', value: 'ok', primary: true },
          { label: 'Cancel', value: 'cancel', cancel: true, skipValidate: true },
        ],
        validate: (v) => {
          const m = parse(v.m);
          if (m === null) return 'Type a mass in tonnes, like 50 or 2500.';
          if (m < 1) return 'It must weigh at least 1 tonne.';
          if (m > MAX_MASS) return `The heaviest asteroid out here is ${massLabel(MAX_MASS)}.`;
          return null;
        },
      });
      if (!res || res.button !== 'ok') return null;
      st.lastCustom = res.values.m;
      return parse(res.values.m);
    }

    const atStart = (p) => cheb(START, p) <= 1;

    async function onAction() {
      const p = game.player;
      if (st.carrying && atStart(p)) {
        if (playing()) return ui.toast('Wait for this run to finish.'), true;
        const rock = st.carrying;
        st.carrying = null;
        launch(rock);
        return true;
      }
      if (DIAL && cheb(DIAL, p) <= 1) {
        await turnDial();
        return true;
      }
      const pad = padNear(p);
      if (!pad) return false;
      if (!st.briefed) return ui.toast(`Those asteroids belong to ${NPC.name}. Talk to them first.`), true;
      if (st.carrying) {
        if (st.carrying.src !== pad) return ui.toast(`You're already carrying the ${st.carrying.label} asteroid.`), true;
        st.carrying = null; // put it back on its pad
        game.refreshHud();
        return true;
      }
      if (playing()) return ui.toast('Wait for this run to finish.'), true;
      if (!isUnlocked(pad)) return ui.toast(`Try the ${lockedHint(pad)} asteroid first.`), true;
      let load;
      if (pad === EXTRA) {
        const mass = await askMass();
        if (mass === null) return true;
        load = { src: EXTRA, kind: 'custom', mass, label: massLabel(mass), w: widthOf(mass) };
      } else load = mainLoad(pad);
      st.carrying = load;
      ui.toast(`Picked up the ${load.label} asteroid. Put it on the starting point on the track.`);
      game.refreshHud();
      return true;
    }

    /** The base dial: pick the counting base. Each base has its own pads (base², base⁴ … tonnes) and its own runs. */
    async function turnDial() {
      if (!st.briefed) return ui.toast(`That dial belongs to ${NPC.name}. Talk to them first.`);
      if (!st.unlocked) return ui.toast('The base dial is switched off. It comes on when the warp gate opens.');
      if (playing()) return ui.toast('Wait for this run to finish.');
      if (st.carrying) return ui.toast('Put the asteroid back on its pad first.');
      const done = (b) => Object.keys(st.bases[b]?.results || {}).length;
      const b = await ui.choice({
        title: 'Base dial',
        text: 'Which base should the collision counter count in?',
        options: cfg.dial.map((base) => ({
          label: `Base ${base}${base === 2 ? ' · binary' : base === 10 ? ' · ordinary numbers' : ''}`,
          value: base,
          hint: `${base === st.base ? 'now · ' : ''}${done(base)}/5 asteroids`,
        })),
        cancelValue: null,
      });
      if (b === null || b === undefined || b === st.base) return;
      useBase(b);
      st.run = null; // the boxes at the top start afresh in the new base
      st.flashes = [];
      ui.toast(`Counting in base ${b}. New asteroids on the pads: ${ROCKS.map((r) => r.label).join(', ')}.`, 4500);
      game.refreshHud();
      if (!st.dialSeen && D.dial) {
        st.dialSeen = true;
        await play(D.dial, { base: b, top: b - 1, step: b * b });
      }
    }

    function launch(rock, { hand } = {}) {
      const sim = simulate(rock.mass, rock.w);
      hand = hand ?? (rock.kind === 'main' && st.base === cfg.base && HAND.includes(rock.n) && !st.counted[rock.n]);
      st.run = {
        rock,
        sim,
        disp: timeline(sim),
        start: performance.now() + 400,
        shown: 0,
        hand,
        finished: false,
        revealAt: null,    // when the final count was revealed (the point starts dropping into place)
      };
      st.flashes = [];
      ui.toast(st.run.hand ? `Here comes the ${rock.label} asteroid. Count the collisions!` : `Here comes the ${rock.label} asteroid!`);
      game.refreshHud();
    }

    function tick(now) {
      const run = st.run;
      if (!run || run.finished) return;
      const d = now - run.start;
      const upto = lastBefore(run.disp, d) + 1; // collisions that have happened by now
      if (upto > run.shown) {
        // flash the latest few, and one collision sound per frame at most
        for (let i = Math.max(run.shown, upto - 4); i < upto; i++) {
          const k = run.sim.kind[i];
          st.flashes.push({ x: WALL_X + (k ? run.sim.x2[i] : 0), y: TRACK_Y - SMALL_W / 2, t: now, kind: k });
        }
        if (st.flashes.length > 24) st.flashes.splice(0, st.flashes.length - 24);
        if (now - st.lastSound > 30) {
          clinkSound(run.sim.kind[upto - 1]);
          st.lastSound = now;
        }
        run.shown = upto;
        game.refreshHud();
      }
      const endAt = (run.sim.count ? run.disp[run.sim.count - 1] : 0) + TAIL_MS;
      if (d > endAt) {
        run.finished = true;
        if (!hiddenRun(run)) run.revealAt = now;
        game.emit('run-done');
      }
    }

    /** After a run: count by hand (first time for the first pad), then record it. */
    async function onEvent(name) {
      if (name !== 'run-done' || !st.run) return;
      const run = st.run, rock = run.rock, count = run.sim.count;
      if (run.hand) {
        const res = await ui.form({
          title: `How many collisions?`,
          html: `<p>Count every bump: rock against rock, and rock against the shield.</p>`,
          fields: [{ id: 'n', label: 'Collisions I counted', value: '' }],
          buttons: [
            { label: 'Check', value: 'check', primary: true },
            { label: 'Watch again', value: 'again', skipValidate: true },
          ],
          validate: (v) => (parseNum(v.n) === null ? 'Type the number of collisions you counted.' : null),
        });
        if (res && res.button === 'again') return launch(rock, { hand: true });
        const guess = res ? parseNum(res.values.n) : null;
        st.counted[rock.n] = true;
        run.revealAt = performance.now();
        await ui.panel({
          title: `${count} collisions`,
          html: `<p>${guess === count ? '<b>Spot on!</b> ' : guess !== null ? `You counted ${guess}. ` : ''}The collision counter says <b>${count}</b>.</p>
            ${BASE_NAME ? `<p>In ${BASE_NAME} that is <b>${digits(count)}</b>.</p>` : ''}
            ${guess !== count && guess !== null ? '<p class="muted">Press R to watch it again.</p>' : ''}`,
          buttons: [{ label: 'OK', value: true, primary: true }],
        });
      }
      if (rock.kind === 'custom') return customDone(rock, count);
      const first = st.results[rock.n] === undefined;
      st.results[rock.n] = count;
      if (rock.n === ROCKS.length - 1) st.extras = true;
      record(rock, count);
      if (!first) return;
      if (rock.n === UNLOCK && !st.unlocked) {
        st.unlocked = true;
        markStageDone(ID, si);
        game.refreshHud();
      }
      if (st.base === cfg.base) await play(D.after[rock.n], vars(rock, count)); // the story lines are for the starting base
    }

    /** Add a run's value (collisions ÷ base^k) to the tracker and say so. */
    function record(rock, count) {
      const k = rock.k, value = count / B ** k;
      if (B === 10) {
        tracker.addFound(value, `Colliding asteroids — ${rock.label}: ${count} collisions`);
        ui.toast(`${rock.label}: <b>${count}</b> collisions → ${valueText(count, k)}. Added to your tracker.`, 3500);
      } else {
        tracker.addFound(value, `Colliding asteroids (${BASE_NAME}) — ${rock.label}: ${digits(count)} collisions → ${pointed(count, k)}`);
        ui.toast(`${rock.label}: <b>${digits(count)}</b> collisions in ${BASE_NAME} → ${pointed(count, k)} = ${valueText(count, k)}. Added to your tracker.`, 4000);
      }
      game.refreshHud();
    }

    /** A run from the custom pad: any mass. Just the count; nothing goes to the tracker. */
    async function customDone(rock, count) {
      const first = !st.custom.length;
      if (st.custom[0]?.label !== rock.label) st.custom = [{ label: rock.label, count }, ...st.custom].slice(0, 5); // not again for an R replay
      const k = pointK(rock, count);
      ui.toast(
        `${rock.label}: <b>${count}</b> collisions${BASE_NAME ? `, <b>${digits(count)}</b> in ${BASE_NAME} → ${pointed(count, k)} = ${valueText(count, k)}` : ''}.`,
        3500
      );
      game.refreshHud();
      if (first) await play(D.custom, vars(rock, count));
    }

    async function onRestart() {
      if (!st.briefed) return ui.toast(`Talk to ${NPC.name} first.`);
      if (playing()) return ui.toast('Wait for this run to finish.');
      if (st.carrying) return ui.toast('Put the asteroid you are carrying on the starting point first.');
      if (!st.run) return ui.toast('Push an asteroid first.');
      launch(st.run.rock, { hand: false });
    }

    // ------------------------------------------------------------ HUD
    const runRow = (label, count, k) =>
      B === 10
        ? `<li>${label} → <b>${count}</b> collisions → ${valueText(count, k)}</li>`
        : `<li>${label} → <b>${digits(count)}</b> → ${pointed(count, k)} = ${valueText(count, k)}</li>`;

    function hud() {
      const run = st.run;
      let mission;
      if (!st.briefed) mission = `<p>Talk to <b>${NPC.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
      else if (extrasOpen())
        mission = `<p class="muted">A new pad is open: build an asteroid of <b>any mass</b> and count its collisions. Or take the warp gate.</p>`;
      else if (st.unlocked) mission = `<p class="muted">The warp gate is open. Try the heavier asteroids for more digits, or take the gate.</p>`;
      else {
        const nx = nextRock();
        mission = `<p class="muted">Pick up the <b>${nx.label}</b> asteroid from its pad and put it on the starting point on the track. Then count the collisions.</p>`;
      }
      if (st.carrying) mission = `<p>Carrying the <b>${st.carrying.label}</b> asteroid. Put it on the glowing starting point on the track.</p>`;
      let now = '';
      if (run && !run.finished)
        now = run.hand
          ? '<p><b>Count the collisions!</b> The counter is switched off.</p>'
          : `<p>Collisions so far: <b>${digits(run.shown)}</b>${BASE_NAME ? ` (${BASE_NAME})` : ''}</p>`;
      const rows = ROCKS.filter((r) => st.results[r.n] !== undefined)
        .map((r) => runRow(r.label, st.results[r.n], r.k))
        .join('');
      let results = rows ? `<h3>Your runs${DIAL ? ` in ${BASE_NAME}` : ''}</h3><ol class="results">${rows}</ol>` : '';
      if (st.custom.length)
        results += `<h3>Any mass</h3><ul class="results">${st.custom.map((c) => `<li>${c.label} → <b>${c.count}</b> collisions${BASE_NAME ? ` → ${digits(c.count)} → ${pointed(c.count, pointK({ kind: 'custom' }, c.count))} = ${valueText(c.count, pointK({ kind: 'custom' }, c.count))}` : ''}</li>`).join('')}</ul>`;
      if (DIAL && st.unlocked && st.briefed && !st.carrying)
        mission += `<p class="muted">The <b>base dial</b> is on: counting in <b>${BASE_NAME}</b>. Turn it to count in another base.</p>`;
      const formula = typeof cfg.formula === 'function' ? cfg.formula(B, ROCKS) : cfg.formula;
      return `<h3>Mission</h3>${mission}${now}<div class="formula small">${formula}</div>${results}`;
    }

    // ------------------------------------------------------------ drawing
    /** Rock positions (simulation x of their left edges) at screen time d of a run. */
    function positions(run, d) {
      const s = run.sim, i = lastBefore(run.disp, d);
      const tNow = (Math.max(0, d) / 1000) * RATE;
      if (i < 0) return { x1: SMALL_X, x2: BIG_X - tNow }; // before the first collision
      const dt = tNow - s.t[i];
      return { x1: s.x1[i] + s.v1[i] * dt, x2: s.x2[i] + s.v2[i] * dt };
    }

    /** The energy shield: a shimmering wall of light between two emitters, rippling where the little rock hits it. */
    function drawShield(r, t) {
      const ctx = r.ctx, T = r.T;
      const fx = r.gx(WALL_X), yTop = r.gy(TRACK_Y - 3.6), yBot = r.gy(TRACK_Y + 0.5);
      const now = performance.now();
      const hit = st.flashes.some((f) => !f.kind && now - f.t < 160); // a collision against the shield just now
      ctx.save();
      // the glow of the field, fading away behind the face
      const g = ctx.createLinearGradient(fx - T * 0.9, 0, fx, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, CS.shieldFill);
      ctx.fillStyle = g;
      ctx.fillRect(fx - T * 0.9, yTop, T * 0.9, yBot - yTop);
      // shimmering bands drifting up the field
      ctx.strokeStyle = CS.shieldBand;
      ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const y = yTop + (((i / 9) * (yBot - yTop) - t / 25) % (yBot - yTop) + (yBot - yTop)) % (yBot - yTop);
        ctx.beginPath();
        ctx.moveTo(fx - T * 0.6, y);
        ctx.quadraticCurveTo(fx - T * 0.3, y - T * 0.12, fx, y);
        ctx.stroke();
      }
      // the face the little rock bounces off
      ctx.strokeStyle = CS.shield;
      ctx.shadowColor = CS.shieldGlow;
      ctx.shadowBlur = T * (hit ? 0.9 : 0.35 + 0.12 * Math.sin(t / 300));
      ctx.lineWidth = Math.max(2, T * (hit ? 0.11 : 0.07));
      ctx.beginPath();
      ctx.moveTo(fx, yTop);
      ctx.lineTo(fx, yBot);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // the two emitters holding the shield up
      for (const [y, up] of [[yTop, true], [yBot, false]]) {
        const ey = up ? y - T * 0.45 : y;
        const eg = ctx.createLinearGradient(fx - T * 0.5, 0, fx + T * 0.1, 0);
        eg.addColorStop(0, CS.pylon);
        eg.addColorStop(1, CS.pylonLight);
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.roundRect(fx - T * 0.5, ey, T * 0.6, T * 0.45, T * 0.12);
        ctx.fill();
        ctx.fillStyle = CS.shield;
        ctx.shadowColor = CS.shieldGlow;
        ctx.shadowBlur = T * 0.4;
        ctx.beginPath();
        ctx.arc(fx, y, T * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      r.text('ENERGY SHIELD', fx - T * 0.2, yTop - T * 0.75, { size: 0.22, color: r.style.muted });
      // the track
      ctx.save();
      ctx.strokeStyle = CS.track;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([T * 0.2, T * 0.15]);
      ctx.beginPath();
      ctx.moveTo(fx, r.gy(TRACK_Y));
      ctx.lineTo(r.gx(TRACK_END), r.gy(TRACK_Y));
      ctx.stroke();
      ctx.restore();
    }

    /** A counter box: a rounded panel with a small title, centred on (cx, cy) in pixels. */
    function drawBox(r, cx, cy, w, title) {
      const ctx = r.ctx, T = r.T;
      ctx.save();
      ctx.fillStyle = CS.counterBg;
      ctx.strokeStyle = CS.counterEdge;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - (T * w) / 2, cy - T * 0.95, T * w, T * 1.9, T * 0.3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      r.text(title, cx, cy - T * 0.55, { size: 0.22, color: r.style.muted, weight: 700 });
    }

    const FONT = (px) => `800 ${Math.max(9, Math.round(px))}px "Segoe UI", "Trebuchet MS", sans-serif`;
    /** The biggest font size (in squares, up to `size`) at which str fits in maxW pixels. */
    function fitSize(r, str, maxW, size) {
      const ctx = r.ctx;
      ctx.save();
      ctx.font = FONT(r.T * size);
      const w = ctx.measureText(str).width;
      ctx.restore();
      return w > maxW ? (size * maxW) / w : size;
    }

    function drawCounter(r) {
      if (cfg.steps) return drawSteps(r);
      const T = r.T, cx = r.gx(COLS / 2), cy = r.gy(1.6);
      const run = st.run, hidden = hiddenRun(run);
      const value = run ? (hidden ? '? ? ?' : digits(run.shown)) : '0';
      drawBox(r, cx, cy, 6.4, BASE_NAME ? `COLLISIONS (${BASE_NAME.toUpperCase()})` : 'COLLISIONS');
      r.text(value, cx, cy + T * 0.25, { size: fitSize(r, value, T * 5.8, 0.85), color: hidden ? CS.hidden : CS.counter, weight: 800 });
    }

    /**
     * Four boxes along the top: the live count as an ordinary number → the live count in the level's base →
     * the same digits with the point put in (the point drops into place once the run is over) → that number as
     * an ordinary decimal.
     */
    function drawSteps(r) {
      const ctx = r.ctx, T = r.T, cy = r.gy(1.6), W = 5.4, GAP = 6.1;
      const xs = [-1.5, -0.5, 0.5, 1.5].map((i) => r.gx(COLS / 2 + i * GAP));
      const run = st.run, hidden = hiddenRun(run);
      const name = BASE_NAME.toUpperCase();
      drawBox(r, xs[0], cy, W, 'COLLISIONS');
      drawBox(r, xs[1], cy, W, `IN ${name}`);
      drawBox(r, xs[2], cy, W, 'PUT THE POINT IN');
      drawBox(r, xs[3], cy, W, 'VALUE');
      for (let i = 0; i < 3; i++) r.text('→', (xs[i] + xs[i + 1]) / 2, cy, { size: 0.42, color: CS.counterEdge, weight: 800 });
      const maxW = T * (W - 0.5), y = cy + T * 0.25;
      // 1 and 2: the live count, as an ordinary number and in the level's base
      const shown = [run ? String(run.shown) : '0', run ? digits(run.shown) : '0'];
      shown.forEach((s, i) => {
        const txt = hidden ? '? ? ?' : s;
        r.text(txt, xs[i], y, { size: fitSize(r, txt, maxW, 0.8), color: hidden ? CS.hidden : CS.counter, weight: 800 });
      });
      // 3 and 4 wait for the run to be over (and the count revealed)
      if (!run || run.revealAt === null) {
        const wait = run && !run.finished ? '…' : '–';
        r.text(wait, xs[2], y, { size: 0.6, color: CS.hidden, weight: 800 });
        r.text(wait, xs[3], y, { size: 0.6, color: CS.hidden, weight: 800 });
        return;
      }
      const s = digits(run.sim.count), k = pointK(run.rock, run.sim.count);
      const left = s.slice(0, s.length - k), right = s.slice(s.length - k);
      const size = fitSize(r, `${s}.`, maxW, 0.8);
      const p = Math.min(1, (performance.now() - run.revealAt) / POINT_MS), ease = 1 - (1 - p) ** 3;
      ctx.save();
      ctx.font = FONT(T * size);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const wl = ctx.measureText(left).width, wp = ctx.measureText('.').width, wr = ctx.measureText(right).width;
      let x = xs[2] - (wl + wp + wr) / 2;
      ctx.fillStyle = CS.counter;
      ctx.fillText(left, x, y);
      ctx.fillText(right, x + wl + wp, y);
      // the point falls in from above
      ctx.fillStyle = CS.point;
      ctx.globalAlpha = ease;
      ctx.fillText('.', x + wl, y - (1 - ease) * T * 1.1);
      ctx.restore();
      if (p >= 1) {
        const v = valueText(run.sim.count, k);
        const fade = Math.min(1, (performance.now() - run.revealAt - POINT_MS) / 300);
        r.text(v, xs[3], y, { size: fitSize(r, v, maxW, 0.8), color: CS.counter, weight: 800, alpha: Math.max(0, fade) });
      }
    }

    function drawRocks(r) {
      const T = r.T, run = st.run;
      let x1 = SMALL_X, x2 = null, bw = 0, rock = null;
      if (run) {
        const p = positions(run, performance.now() - run.start);
        x1 = p.x1;
        x2 = p.x2;
        bw = run.sim.bw;
        rock = run.rock;
        if (run.finished) x1 = SMALL_X, x2 = null; // between runs: the little rock is back in place
      }
      const draw = (x, w, colors, label, below = false) => {
        const cx = WALL_X + x + w / 2;
        if (cx - w / 2 > TRACK_END) return;
        drawRock(r.ctx, r.gx(cx), r.gy(TRACK_Y - w / 2), (w / 2) * T, 0, colors);
        r.text(label, r.gx(cx), below ? r.gy(TRACK_Y + 0.35) : r.gy(TRACK_Y - w - 0.3), { size: 0.24, color: CS.label, weight: 700 });
      };
      draw(x1, SMALL_W, CS.small, '1 t', true);
      if (x2 !== null) draw(x2, bw, CS.big, rock.label);
    }

    function drawFlashes(r) {
      const ctx = r.ctx, T = r.T, now = performance.now();
      st.flashes = st.flashes.filter((f) => now - f.t < 300);
      ctx.save();
      for (const f of st.flashes) {
        const k = (now - f.t) / 300;
        ctx.strokeStyle = f.kind ? CS.flashRock : CS.flashShield;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = Math.max(1.5, T * 0.08 * (1 - k));
        ctx.beginPath();
        ctx.arc(r.gx(f.x), r.gy(f.y), T * (0.15 + 0.6 * k), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    /** The line under a used pad: the count as an ordinary number, and in the level's base too: "25 collisions (11001)". */
    const countNote = (count) => `${count} collisions${BASE_NAME && B !== 10 ? ` (${digits(count)})` : ''}`;

    /** The base dial: a round console with a tick for each base and the current base in the middle. */
    function drawDial(r, t) {
      if (!DIAL) return;
      const ctx = r.ctx, T = r.T, cx = r.gx(DIAL.x + 0.5), cy = r.gy(DIAL.y + 0.5), R = T * 0.62;
      const on = st.briefed && st.unlocked, bases = cfg.dial;
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25; // a 270° sweep over the top, from bottom-left to bottom-right
      const ang = (b) => a0 + ((b - bases[0]) / (bases[bases.length - 1] - bases[0])) * (a1 - a0);
      ctx.save();
      ctx.globalAlpha = on ? 1 : 0.4;
      ctx.fillStyle = CS.counterBg;
      ctx.strokeStyle = CS.counterEdge;
      ctx.lineWidth = 2;
      ctx.shadowColor = CS.counterEdge;
      ctx.shadowBlur = on ? T * (0.18 + 0.1 * Math.sin(t / 450)) : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineCap = 'round';
      for (const b of bases) {
        const a = ang(b), cur = b === st.base;
        ctx.strokeStyle = cur ? CS.point : CS.counterEdge;
        ctx.lineWidth = cur ? 3 : 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
        ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
        ctx.stroke();
      }
      ctx.restore();
      r.text(String(st.base), cx, cy + T * 0.03, { size: 0.42, color: on ? CS.counter : CS.hidden, weight: 800 });
      r.text('BASE DIAL', cx, cy + T * 0.95, { size: 0.22, color: CS.label, weight: 700 });
      if (!on) r.text('🔒', cx, cy - T * 0.85, { size: 0.26 });
    }

    function drawPads(r, t) {
      const ctx = r.ctx, T = r.T;
      for (const pad of PADS) {
        const { x, y } = pad.pad;
        const open = st.briefed && isUnlocked(pad);
        // what sits on the pad, its name, and the line under it once it has been used
        let w, label, note = null;
        if (pad === EXTRA) {
          w = widthOf(10 ** 4);
          label = 'Any mass';
          if (st.custom.length) note = `last: ${countNote(st.custom[0].count)}`;
        } else {
          w = pad.w;
          label = pad.label;
          if (st.results[pad.n] !== undefined) note = countNote(st.results[pad.n]);
        }
        const done = pad !== EXTRA && note !== null;
        const cx = r.gx(x + 0.5), cy = r.gy(y + 0.5);
        ctx.save();
        ctx.globalAlpha = open || done ? 1 : 0.4;
        ctx.fillStyle = CS.pad;
        ctx.strokeStyle = done ? CS.padDone : CS.padEdge;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = open && !done ? T * (0.2 + 0.1 * Math.sin(t / 450 + x)) : 0;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + T * 0.3, T * 0.75, T * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        const out = (playing() && st.run.rock.src === pad) || st.carrying?.src === pad; // it's out on the track, or π has it
        if (!out) drawRock(ctx, cx, cy + T * 0.3 - (w / 2) * T, (w / 2) * T, 0, CS.big);
        ctx.restore();
        if (!out && pad === EXTRA && open) r.text('?', cx, cy + T * 0.3 - (w / 2) * T, { size: 0.45, color: CS.label, weight: 800 });
        r.text(label, cx, cy + T * 0.95, { size: 0.24, color: done ? CS.padDone : CS.label, weight: 700 });
        if (note) r.text(note, cx, cy + T * 1.3, { size: 0.2, color: r.style.muted });
        else if (!open) r.text('🔒', cx, cy - T * 0.2, { size: 0.3 });
      }
    }

    /** The starting point: a marker on the track where the big asteroid is put down. */
    function drawStart(r, t) {
      const ctx = r.ctx, T = r.T;
      const x = r.gx(WALL_X + BIG_X), y = r.gy(TRACK_Y);
      const live = !!st.carrying && !playing();
      ctx.save();
      ctx.strokeStyle = live ? CS.padDone : CS.padEdge;
      ctx.globalAlpha = live ? 0.75 + 0.25 * Math.sin(t / 200) : 0.6;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = live ? T * 0.4 : 0;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - T * 0.35);
      ctx.lineTo(x, y + T * 0.2);
      ctx.moveTo(x, y + T * 0.2);
      ctx.lineTo(x + T * 0.9, y + T * 0.2);
      ctx.stroke();
      ctx.restore();
      r.text('START', x + T * 0.45, y + T * 0.45, { size: 0.18, color: live ? CS.padDone : r.style.muted, weight: 700 });
    }

    function drawFloor(r, t) {
      drawShield(r, t);
      drawStart(r, t);
      drawCounter(r);
      drawPads(r, t);
      drawDial(r, t);
      drawRocks(r);
      drawFlashes(r);
    }

    function drawOver(r, t, pp) {
      if (st.carrying) {
        const w = st.carrying.w, T = r.T;
        drawRock(r.ctx, r.ax(pp.x), r.ay(pp.y - 0.45) - (w / 2) * T + Math.sin(t / 300) * 2, (w / 2) * T, 0, CS.big);
      }
      if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
      const p = game.player;
      if (st.carrying) {
        if (atStart(p)) r.bubble(p.x, p.y - 1.1 - st.carrying.w, playing() ? 'Wait for this run to finish' : `Enter: put it on the start`);
        else if (padNear(p) === st.carrying.src) r.bubble(p.x, p.y - 1.1 - st.carrying.w, 'Enter: put it back');
        return;
      }
      if (DIAL && cheb(DIAL, p) <= 1 && !playing())
        return r.bubble(p.x, p.y - 1.1, st.unlocked ? `Enter: turn the base dial (now base ${st.base})` : 'Base dial: on when the warp gate opens');
      const pad = padNear(p);
      if (!pad || playing()) return;
      const what = pad === EXTRA ? 'Enter: build an asteroid of any mass' : `Enter: pick up the ${pad.label} asteroid`;
      r.bubble(p.x, p.y - 1.1, isUnlocked(pad) ? what : `Locked: try ${lockedHint(pad)} first`);
    }

    return {
      title: cfg.stageTitle,
      cols: COLS,
      rows: ROWS,
      anchor: 'tile',
      playerStart: PLAYER_START,
      npcs: [{ id: cfg.npc, name: NPC.name, sprite: NPC.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
      gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Push the ${ROCKS[UNLOCK].label} asteroid and count its collisions to power up the warp gate.` },
      help: `<p>Press ${key('Enter')} next to an asteroid's pad to pick it up, carry it to the START mark on the track and press ${key('Enter')} again to put it down. Off it goes towards the little 1 tonne rock.
        Count every collision: rock against rock, and rock against the shield. Each pad unlocks after the one before it.</p>
        <p>For the first asteroid you count the collisions yourself; after that the collision counter does it for you.
        ${key('R')} watches the last run again.</p>${cfg.help}`,
      state: st, // exposed for debugging / tests
      blocked: (x, y) =>
        (y >= 5 && y <= 7 && x >= 1 && x <= 26) ||   // the track
        (x >= 1 && x <= 2 && y >= 3 && y <= 8) ||    // the shield and its emitters
        PADS.some((pd) => pd.pad.x === x && pd.pad.y === y) ||
        (!!DIAL && DIAL.x === x && DIAL.y === y),
      onAction,
      onEvent,
      tick,
      onRestart,
      hud,
      drawFloor,
      drawOver,
    };
  }

  return {
    id: ID,
    number: cfg.number,
    title: cfg.title,
    method: cfg.method,
    style: cfg.style,
    stageCount: 1,
    stageName: () => cfg.stageTitle,
    createStage,
    debugJumps: cfg.debugJumps,
    // The physics is exact, so the only spread is how far a player goes (the gate run to the heaviest main pad).
    simulate: (si, rng) => {
      const n = UNLOCK + Math.floor(rng() * (ROCKS0.length - UNLOCK));
      return simulate(ROCKS0[n].mass, ROCKS0[n].w).count / cfg.base ** ROCKS0[n].k;
    },
    simulateNote: cfg.simulateNote,
  };
}
