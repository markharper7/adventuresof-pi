// LEVEL 11 — The Collision Course: Galperin's colliding blocks. The finale.
//
// A 1 tonne rock sits on a frictionless track in front of an ENERGY SHIELD (a wall: nothing gets through, and
// anything that hits it bounces off perfectly).
// The player picks a big asteroid from a pad and it is pushed along the track towards the little rock.
// Every collision is perfectly elastic. The little rock gets squashed between the big one and the shield,
// again and again, until both rocks fly off. If the big rock weighs 100ⁿ tonnes, the number of collisions
// (rock–rock plus rock–shield) is the first n + 1 digits of π:
//     1 t → 3,   100 t → 31,   10,000 t → 314,   1,000,000 t → 3141,   100,000,000 t → 31415
// Nothing is explained: like Level 1, "why?" is left as an open question.
//
// The physics is event based (exact, no time steps): from each collision we work out exactly when the next
// one happens (little rock hits the shield, or the rocks meet), move there and update the velocities.
// The whole run is worked out when the rock is put on the track, then played back at ONE steady speed (RATE),
// the same for every run and never changing during a run, so everything on screen moves exactly as it really
// would. With heavy rocks almost all the collisions happen in a blink by the shield (the gap is 1/2000 of a square
// for 100,000,000 t), so the big rock seems to bounce straight off while the counter leaps. Each collision
// flashes and makes a short "clink" sound.
//
// The pads unlock in order. For 1 t the collision counter is hidden and the player counts the collisions
// themselves (and can watch again) before the true count is revealed. After that the counter is shown live.
// Each run adds collisions ÷ 10ⁿ to the tracker (3, 3.1, 3.14 …). The 10,000 t run opens the warp gate.
// Optional extra, open once all five are done (it doesn't affect the gate): the custom pad, where the player types
// any mass from 1 t to 100,000,000 t. Just the count, nothing to the tracker. (The binary version, masses of
// 4ᵏ t, is its own level: see specification/level_12.md.)
// (Dialogue: npc_dialogue.js → level11.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, cheb, parseNum } from '../core/utils.js';
import { drawRock } from '../core/rock.js';
import { CLINK_STYLE as CS } from '../../assets/theme.js';

const ID = 'clink';
const COLS = 28, ROWS = 17;
const SMALL_W = 0.5, SMALL_X = 4, BIG_X = 9;   // little rock width and start positions (simulation units = squares)
/** Drawn width in squares: 1 t is the same size as the little rock, then grows slowly (+0.4 for every ×100). */
const widthOf = (mass) => SMALL_W + 0.2 * Math.log10(mass);
const massLabel = (mass) => `${mass.toLocaleString('en-GB', { maximumFractionDigits: 3 })} t`;
const ROCKS = [0, 1, 2, 3, 4].map((n) => ({
  n,
  mass: 100 ** n,                              // tonnes; the little rock is 1 tonne
  label: massLabel(100 ** n),
  w: widthOf(100 ** n),
  pad: { x: 6 + 4 * n, y: 11 },
}));
// An optional extra pad that opens once all five asteroids above have been pushed. It doesn't affect the warp gate.
const MAX_MASS = ROCKS[ROCKS.length - 1].mass;  // the custom asteroid is capped at the heaviest asteroid
const CUSTOM = { id: 'custom', pad: { x: 14, y: 14 } }; // the player types any mass from 1 t to MAX_MASS
const PADS = [...ROCKS, CUSTOM];
const HAND = [0];                              // rocks whose collisions the player counts by hand (the first time)
const UNLOCK = 2;                              // the run that opens the warp gate (10,000 t → 314)
const WALL_X = 2.5;                            // the energy shield's face (raw grid x); simulation x is measured from here
const TRACK_Y = 7.6;                           // the rocks sit on this line (raw grid y)
const TRACK_END = 27;
const RATE = 5;                                // simulation seconds per screen second, for every run (normal speed: big rock moves 5 squares a second)
const TAIL_MS = 2500;                          // keep watching the rocks fly off after the last collision
const START = { x: 12, y: 8 };                 // where π stands to put an asteroid on the track's starting point
const NPC_POS = { x: 3, y: 13 };
const PLAYER_START = { x: 5, y: 9 };
const GATE = { x: 25, y: 13 };
const D = DIALOGUE.level11;
const ELEVEN = CHARACTERS.eleven;

/**
 * Work out every collision exactly. Little rock (mass 1, width SMALL_W) starts at rest; the big rock
 * (mass M, width bw) moves left at speed 1. The shield's face is at x = 0.
 * Returns typed arrays of the state just after each collision, plus the start state.
 */
function simulate(M, bw) {
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

function createStage(game, si, opts = {}) {
  const st = {
    briefed: !!opts.briefed || !!opts.results,
    results: { ...(opts.results || {}) }, // n -> collisions (a run of rock n has been done)
    counted: { ...(opts.results ? { 0: true } : {}) }, // n -> the player has counted it by hand
    custom: [],          // the latest custom runs, newest first: { label, count }
    lastCustom: '',      // the mass last typed in, offered again next time
    run: null,           // { rock, sim, disp, start, shown, hand, finished } (rock = the load that was pushed)
    carrying: null,      // the load π is carrying to the starting point: { src (its pad), kind, mass, label, w, n?, k? }
    flashes: [],         // { x, y, t, kind }
    lastSound: 0,
    unlocked: opts.results ? UNLOCK in opts.results : false,
  };
  if (st.unlocked) markStageDone(ID, si);
  const extrasOpen = () => st.results[ROCKS.length - 1] !== undefined;
  const isUnlocked = (pad) => (pad.n === undefined ? extrasOpen() : pad.n === 0 || st.results[pad.n - 1] !== undefined);
  const lockedHint = (pad) => ROCKS[pad.n === undefined ? ROCKS.length - 1 : pad.n - 1].label;
  const nextRock = () => ROCKS.find((r) => st.results[r.n] === undefined) || null;
  const mainLoad = (rock) => ({ src: rock, kind: 'main', n: rock.n, mass: rock.mass, label: rock.label, w: rock.w });
  const playing = () => st.run && !st.run.finished;

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
    const pad = padNear(p);
    if (!pad) return false;
    if (!st.briefed) return ui.toast(`Those asteroids belong to ${ELEVEN.name}. Talk to them first.`), true;
    if (st.carrying) {
      if (st.carrying.src !== pad) return ui.toast(`You're already carrying the ${st.carrying.label} asteroid.`), true;
      st.carrying = null; // put it back on its pad
      game.refreshHud();
      return true;
    }
    if (playing()) return ui.toast('Wait for this run to finish.'), true;
    if (!isUnlocked(pad)) return ui.toast(`Try the ${lockedHint(pad)} asteroid first.`), true;
    let load;
    if (pad === CUSTOM) {
      const mass = await askMass();
      if (mass === null) return true;
      load = { src: CUSTOM, kind: 'custom', mass, label: massLabel(mass), w: widthOf(mass) };
    } else load = mainLoad(pad);
    st.carrying = load;
    ui.toast(`Picked up the ${load.label} asteroid. Put it on the starting point on the track.`);
    game.refreshHud();
    return true;
  }

  function launch(rock, { hand } = {}) {
    const sim = simulate(rock.mass, rock.w);
    hand = hand ?? (rock.kind === 'main' && HAND.includes(rock.n) && !st.counted[rock.n]);
    st.run = {
      rock,
      sim,
      disp: timeline(sim),
      start: performance.now() + 400,
      shown: 0,
      hand,
      finished: false,
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
      game.emit('run-done');
    }
  }

  /** After a run: count by hand (first time for the light rocks), then record it. */
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
      await ui.panel({
        title: `${count} collisions`,
        html: `<p>${guess === count ? '<b>Spot on!</b> ' : guess !== null ? `You counted ${guess}. ` : ''}The collision counter says <b>${count}</b>.</p>
          ${guess !== count && guess !== null ? '<p class="muted">Press R to watch it again.</p>' : ''}`,
        buttons: [{ label: 'OK', value: true, primary: true }],
      });
    }
    if (rock.kind === 'custom') return customDone(rock, count);
    const first = st.results[rock.n] === undefined;
    st.results[rock.n] = count;
    const value = count / 10 ** rock.n;
    tracker.addFound(value, `Colliding asteroids — ${rock.label}: ${count} collisions`);
    ui.toast(`${rock.label}: <b>${count}</b> collisions → ${fmt(value, rock.n)}. Added to your tracker.`, 3500);
    game.refreshHud();
    if (!first) return;
    if (rock.n === UNLOCK) {
      st.unlocked = true;
      markStageDone(ID, si);
    }
    await play(D.after[rock.n], { count, mass: rock.label });
  }

  /** A run from the custom pad: any mass. Just the count; nothing goes to the tracker. */
  async function customDone(rock, count) {
    const first = !st.custom.length;
    if (st.custom[0]?.label !== rock.label) st.custom = [{ label: rock.label, count }, ...st.custom].slice(0, 5); // not again for an R replay
    ui.toast(`${rock.label}: <b>${count}</b> collisions.`, 3500);
    game.refreshHud();
    if (first) await play(D.custom, { count, mass: rock.label });
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${ELEVEN.name} first.`);
    if (playing()) return ui.toast('Wait for this run to finish.');
    if (st.carrying) return ui.toast('Put the asteroid you are carrying on the starting point first.');
    if (!st.run) return ui.toast('Push an asteroid first.');
    launch(st.run.rock, { hand: false });
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const run = st.run;
    let mission;
    if (!st.briefed) mission = `<p>Talk to <b>${ELEVEN.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
    else if (extrasOpen())
      mission = `<p class="muted">A new pad is open: build an asteroid of <b>any mass</b> and count its collisions. Or take the warp gate.</p>`;
    else if (st.unlocked) mission = `<p class="muted">The warp gate is open. Try the heavier asteroids for more digits, or take the gate.</p>`;
    else {
      const nx = nextRock();
      mission = `<p class="muted">Pick up the <b>${nx.label}</b> asteroid from its pad and put it on the starting point on the track. Then count the collisions.</p>`;
    }
    if (st.carrying) mission = `<p>Carrying the <b>${st.carrying.label}</b> asteroid. Put it on the glowing starting point on the track.</p>`;
    let now = '';
    if (run && !run.finished) now = run.hand ? '<p><b>Count the collisions!</b> The counter is switched off.</p>' : `<p>Collisions so far: <b>${run.shown}</b></p>`;
    const rows = ROCKS.filter((r) => st.results[r.n] !== undefined)
      .map((r) => `<li>${r.label} → <b>${st.results[r.n]}</b> collisions → ${fmt(st.results[r.n] / 10 ** r.n, r.n)}</li>`)
      .join('');
    let results = rows ? `<h3>Your runs</h3><ol class="results">${rows}</ol>` : '';
    if (st.custom.length)
      results += `<h3>Any mass</h3><ul class="results">${st.custom.map((c) => `<li>${c.label} → <b>${c.count}</b> collisions</li>`).join('')}</ul>`;
    return `<h3>Mission</h3>${mission}${now}
      <div class="formula small">little rock: 1 t<br>big rock: 1 t, 100 t, 10,000 t …<br>count every collision</div>${results}`;
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
      ctx.arc(fx, up ? y : y, T * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    r.text('ENERGY SHIELD', fx - T * 0.2, yTop - T * 0.75, { size: 0.22, color: r.style.muted });
    const x1 = fx;
    // the track
    ctx.save();
    ctx.strokeStyle = CS.track;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([T * 0.2, T * 0.15]);
    ctx.beginPath();
    ctx.moveTo(x1, r.gy(TRACK_Y));
    ctx.lineTo(r.gx(TRACK_END), r.gy(TRACK_Y));
    ctx.stroke();
    ctx.restore();
  }

  function drawCounter(r) {
    const ctx = r.ctx, T = r.T, cx = r.gx(COLS / 2), cy = r.gy(1.6);
    const run = st.run;
    const hidden = run && run.hand && !st.counted[run.rock.n]; // stays hidden until the player has given their count
    const value = run ? (hidden ? '? ? ?' : String(run.shown)) : '0';
    ctx.save();
    ctx.fillStyle = CS.counterBg;
    ctx.strokeStyle = CS.counterEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - T * 3.2, cy - T * 0.95, T * 6.4, T * 1.9, T * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    r.text('COLLISIONS', cx, cy - T * 0.55, { size: 0.24, color: r.style.muted, weight: 700 });
    r.text(value, cx, cy + T * 0.25, { size: 0.85, color: hidden ? CS.hidden : CS.counter, weight: 800 });
  }

  function drawRocks(r, t) {
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
    return x2 === null ? null : { x1, x2 };
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

  function drawPads(r, t) {
    const ctx = r.ctx, T = r.T;
    for (const pad of PADS) {
      const { x, y } = pad.pad;
      const open = st.briefed && isUnlocked(pad);
      // what sits on the pad, its name, and the line under it once it has been used
      let w, label, note = null;
      if (pad === CUSTOM) {
        w = widthOf(10 ** 4);
        label = 'Any mass';
        if (st.custom.length) note = `last: ${st.custom[0].count} collisions`;
      } else {
        w = pad.w;
        label = pad.label;
        if (st.results[pad.n] !== undefined) note = `${st.results[pad.n]} collisions`;
      }
      const done = pad.n !== undefined && note !== null;
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
      if (!out && pad === CUSTOM && open) r.text('?', cx, cy + T * 0.3 - (w / 2) * T, { size: 0.45, color: CS.label, weight: 800 });
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
    drawRocks(r, t);
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
    const pad = padNear(p);
    if (!pad || playing()) return;
    const what = pad === CUSTOM ? 'Enter: build an asteroid of any mass' : `Enter: pick up the ${pad.label} asteroid`;
    r.bubble(p.x, p.y - 1.1, isUnlocked(pad) ? what : `Locked: try ${lockedHint(pad)} first`);
  }

  return {
    title: 'Collision Course',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [{ id: 'eleven', name: ELEVEN.name, sprite: ELEVEN.sprite, x: NPC_POS.x, y: NPC_POS.y, talk }],
    gate: { ...GATE, isOpen: () => st.unlocked, lockedText: `Push the ${ROCKS[UNLOCK].label} asteroid and count its collisions to power up the warp gate.` },
    help: `<p>Press ${key('Enter')} next to an asteroid's pad to pick it up, carry it to the START mark on the track and press ${key('Enter')} again to put it down. Off it goes towards the little 1 tonne rock.
      Count every collision: rock against rock, and rock against the shield. Each pad unlocks after the one before it.</p>
      <p>For the first asteroid you count the collisions yourself; after that the collision counter does it for you.
      ${key('R')} watches the last run again.</p>
      <p>Once all five are done, an extra pad opens where you can build an asteroid of any mass you like.</p>`,
    state: st, // exposed for debugging / tests
    blocked: (x, y) =>
      (y >= 5 && y <= 7 && x >= 1 && x <= 26) ||   // the track
      (x >= 1 && x <= 2 && y >= 3 && y <= 8) ||    // the shield and its emitters
      PADS.some((pd) => pd.pad.x === x && pd.pad.y === y),
    onAction,
    onEvent,
    tick,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

export default {
  id: ID,
  number: 11,
  title: 'Level 11 · The Collision Course',
  method: 'Colliding blocks: count the collisions',
  style: 'clink',
  stageCount: 1,
  stageName: () => 'Collision Course',
  createStage,
  debugJumps: () => [
    { label: 'Start (before talking to 11)', si: 0 },
    { label: 'Briefed, nothing pushed yet', si: 0, opts: { briefed: true } },
    { label: '1 t and 100 t already counted', si: 0, opts: { results: { 0: 3, 1: 31 } } },
    { label: 'Up to 10,000 t done (warp gate open)', si: 0, opts: { results: { 0: 3, 1: 31, 2: 314 } } },
    { label: 'All five done (custom pad open)', si: 0, opts: { results: { 0: 3, 1: 31, 2: 314, 3: 3141, 4: 31415 } } },
  ],
  // The physics is exact, so the only spread is how far a player goes (10,000 t to 100,000,000 t).
  simulate: (si, rng) => {
    const n = UNLOCK + Math.floor(rng() * (ROCKS.length - UNLOCK));
    return simulate(ROCKS[n].mass, ROCKS[n].w).count / 10 ** n;
  },
  simulateNote: 'The physics is exact, so the spread only comes from the heaviest asteroid a player pushes (10,000 t to 100,000,000 t).',
};
