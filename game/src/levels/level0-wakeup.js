// LEVEL 0 — Wake Up: the introduction. No maths yet.
//
// π wakes up next to a crashed pod with no memory (dialogue: npc_dialogue.js → level0)
// and learns the controls one at a time:
//   1. move (try all four arrows)      → learns H for help
//   2. open help                       → soon after, part of the first nebula wall explodes
//   3. 13 calls out and teaches Enter  → π can't say who they are
//   4. meet at least NEEDED of the other numbers (2.14, √2, −4, 0, e), hidden around the map
//                                      → soon after, part of the second nebula wall explodes
//   5. walk east to the warp gate to Level 1.
//
// The map (MAP below) is bigger than the screen in both directions; the camera follows π.
// Thick nebula fills everything that isn't open space, so the map is a set of winding
// clearings, side passages and the odd dead end to explore.
import * as ui from '../core/ui.js';
import { hasSkill, markStageDone } from '../core/state.js';
import { key, cheb, mulberry32 } from '../core/utils.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';

const D = DIALOGUE.level0;
const ID = 'wakeup';

// ---------------------------------------------------------------------------
// THE MAP — edit this to change the layout. Every row must be the same length.
//   .  open space                     #  thick nebula (can't pass)
//   |  nebula wall between areas      *  part of a wall that explodes later (becomes a way through)
//   o  small rock (just decoration)   p  crashed escape pod (can't pass)
//   @  where π wakes up               G  warp gate to Level 1
// Numbers:  T 13 (calls out first)   a 2.14   n −4   z 0   r √2   e e
// Each connected group of | and * is one wall; walls are numbered left to right
// (wall 0 opens after the help screen, wall 1 after meeting enough numbers).
// ---------------------------------------------------------------------------
const MAP = [
  '######################################################',
  '###....###################.###########################',
  '##........################.###########################',
  '##.e....o............#####..######..##################',
  '##..........o........#####........a.##################',
  '##........#########..#####..........##################',
  '###################..#####..##########################',
  '################.........#..##........################',
  '##############|......................#################',
  '####.......###|.............o........###|##.......####',
  '##..o........#|.........#.........oz...#|.....o.....##',
  '##............|...T....###.............#|...........##',
  '#.............*........###....#.........*...........##',
  '#.pp..@.......*........###...###........*.........G.##',
  '#.............*..............###........*...........##',
  '##............|..............###.......#|...........##',
  '##.........o.#|......##......###..###..#|........o..##',
  '###.......####|##....##......###..###..#|##.......####',
  '##############|##.................###..###############',
  '#################...........####.......###############',
  '###.....##############..########..####################',
  '###.............o.......########.....#################',
  '###..o.................##########......###############',
  '###.....############.n.#############o.r###############',
  '####################....############...###############',
  '######################################################',
];
const NPC_LETTERS = { T: 'thirteen', a: 'twoPointOneFour', n: 'minusFour', z: 'zero', r: 'rootTwo', e: 'e' };
const REGION_NAMES = ['Wake-up Bay', 'Number Meadow', 'Path to Level 1'];
// where each area's name is written on the map (grid units, on top of the nebula)
const LABELS = [{ x: 7.5, y: 8.5 }, { x: 32, y: 6.5 }, { x: 46.5, y: 8.5 }];
const VIEW_COLS = 24, VIEW_ROWS = 13; // how much of the map fits on screen
const NEEDED = 3; // how many of the other numbers π must talk to before the way to Level 1 opens
const CALL_RANGE = 3; // 13 calls out when π comes this close

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOOM_MS = 1400;            // how long an explosion lasts
const BOOM_DELAY = [1500, 3000]; // ms: a wall explodes a random moment after its trigger, so it feels like chance

// ---------------------------------------------------------------------------
// Read the map
// ---------------------------------------------------------------------------
const ROWS = MAP.length, COLS = MAP[0].length;
const at = (x, y) => (MAP[y] || '')[x] || '#';
const k = (x, y) => `${x},${y}`;
const find = (ch) => {
  for (let y = 0; y < ROWS; y++) {
    const x = MAP[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  throw new Error(`Level 0 map has no '${ch}'`);
};
const SOLID = new Set(['#', 'p']);
const isWall = (c) => c === '|' || c === '*';
const WAKE = find('@');
const GATE = find('G');
const NPC_SPOTS = Object.entries(NPC_LETTERS).map(([ch, id]) => ({ id, ...find(ch) }));
const THIRTEEN = NPC_SPOTS.find((n) => n.id === 'thirteen');
const NUMBERS = NPC_SPOTS.filter((n) => n.id !== 'thirteen');
const ROCKS = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (at(x, y) === 'o') ROCKS.push({ x, y, s: 0.25 + ((x * 7 + y * 13) % 5) * 0.07 });

// flood fill from (x, y) over squares where ok(c) is true
function flood(x0, y0, ok, seen = new Set()) {
  const out = [], todo = [[x0, y0]];
  seen.add(k(x0, y0));
  while (todo.length) {
    const [x, y] = todo.pop();
    out.push({ x, y });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(k(nx, ny)) || !ok(at(nx, ny))) continue;
      seen.add(k(nx, ny));
      todo.push([nx, ny]);
    }
  }
  return out;
}

// walls: connected groups of | and *, numbered left to right
const WALLS = (() => {
  const seen = new Set(), walls = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (isWall(at(x, y)) && !seen.has(k(x, y))) walls.push(flood(x, y, isWall, seen));
  walls.sort((a, b) => Math.min(...a.map((t) => t.x)) - Math.min(...b.map((t) => t.x)));
  return walls.map((tiles) => {
    const gap = tiles.filter((t) => at(t.x, t.y) === '*');
    return {
      tiles,
      gap: new Set(gap.map((t) => k(t.x, t.y))),
      cx: gap.reduce((s, t) => s + t.x + 0.5, 0) / gap.length, // explosion centre
      cy: gap.reduce((s, t) => s + t.y + 0.5, 0) / gap.length,
    };
  });
})();
const WALL_OF = new Map();
WALLS.forEach((w, i) => w.tiles.forEach((t) => WALL_OF.set(k(t.x, t.y), i)));

// areas: open ground split up by the walls. 0 = where π wakes, 2 = by the gate, 1 = everything else
const REGION_OF = new Map();
{
  const open = (c) => !SOLID.has(c) && !isWall(c);
  const seen = new Set();
  flood(WAKE.x, WAKE.y, open, seen).forEach((t) => REGION_OF.set(k(t.x, t.y), 0));
  flood(GATE.x, GATE.y, open, seen).forEach((t) => REGION_OF.set(k(t.x, t.y), 2));
}
const regionAt = (x, y) => REGION_OF.get(k(x, y)) ?? 1;

// nebula puffs (grid units), made once: a dark backing puff and coloured puffs on every solid square
const rng = mulberry32(4242);
function puffsFor(x, y) {
  const out = [{ dark: true, x: x + 0.5 + (rng() - 0.5) * 0.4, y: y + 0.5 + (rng() - 0.5) * 0.4, size: 0.75 + rng() * 0.25 }];
  for (let i = 0; i < 2; i++) out.push({ dark: false, x: x + 0.5 + (rng() - 0.5) * 0.8, y: y + 0.5 + (rng() - 0.5) * 0.8, size: 0.45 + rng() * 0.35 });
  return out.map((p) => ({ ...p, c: Math.floor(rng() * 1000), phase: rng() * 6.28, speed: 2 + rng() * 3 }));
}
const STATIC_PUFFS = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (at(x, y) === '#') STATIC_PUFFS.push(...puffsFor(x, y));
const WALL_PUFFS = WALLS.map((w) => w.tiles.flatMap((t) => puffsFor(t.x, t.y).map((p) => ({ ...p, inGap: w.gap.has(k(t.x, t.y)) }))));
// sparks thrown out by each explosion
const SPARKS = WALLS.map(() => Array.from({ length: 26 }, () => ({ a: rng() * Math.PI * 2, speed: 1.5 + rng() * 4, size: 0.04 + rng() * 0.07 })));

function puff(ctx, px, py, rad, color) {
  const grd = ctx.createRadialGradient(px, py, 0, px, py, rad);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(px, py, rad, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
function createStage(game, si, opts = {}) {
  const start = opts.step || 'sleep';
  const st = {
    step: start,           // sleep → move → moved → help → meet → go
    dirs: new Set(),
    thirteenCalled: start === 'go',
    metThirteen: start === 'go',
    met: new Set(start === 'go' ? NUMBERS.map((n) => n.id) : []),
    open: [start === 'meet' || start === 'go', start === 'go'],
    openedAt: [0, 0],
    wakeAt: start === 'sleep' ? null : -1, // -1 = already awake
  };
  // debug jumps start with the controls you'd have learned by then
  const known = { sleep: [], meet: ['move', 'help'], go: ['move', 'help', 'talk'] }[start] || [];
  known.forEach((c) => game.learn(c, { announce: false }));
  if (start === 'go') markStageDone(ID, 0);
  // debug jumps: just west of the first wall's gap / just east of the second wall's gap
  const besideGap = (i, side) => ({ x: Math.floor(WALLS[i].cx) + side, y: Math.floor(WALLS[i].cy) });
  const startPos = { meet: besideGap(0, -1), go: besideGap(1, 1) }[start] || { x: WAKE.x, y: WAKE.y };

  const openBarrier = (i) => {
    st.open[i] = true;
    st.openedAt[i] = performance.now();
  };
  // A random moment later, part of wall i explodes. Not obviously linked to what π just did.
  const explodeSoon = (i, message) => {
    const wait = BOOM_DELAY[0] + Math.random() * (BOOM_DELAY[1] - BOOM_DELAY[0]);
    setTimeout(() => {
      if (st.open[i]) return;
      openBarrier(i);
      ui.toast(message, 5000);
    }, wait);
  };

  // ------------------------------------------------------------ story beats
  async function onEnter() {
    if (st.step === 'sleep') {
      await sleep(1800); // zzz…
      st.wakeAt = performance.now();
      await sleep(1100); // stretch and sit up
      await play(D.wakeUp);
      game.learn('move');
      ui.toast('Use the arrow keys to move. Try all four!', 4000);
      st.step = 'move';
      return;
    }
    ui.toast('<b>Level 0 · Wake Up</b>', 2500);
  }

  function afterMoves() {
    game.learn('help');
    ui.toast(`Press ${key('H')} any time to see your controls. Try it now!`, 5000);
    st.step = 'help';
  }

  async function thirteenCallsOut() {
    st.thirteenCalled = true;
    await play(D.thirteenCallsOut);
    game.learn('talk');
  }

  async function checkUnlock() {
    if (st.step !== 'meet' || !st.metThirteen || st.met.size < NEEDED) return;
    st.step = 'go';
    markStageDone(ID, 0);
    explodeSoon(1, '💥 BOOM! Another part of the nebula has exploded. What is that glowing beyond it?');
  }

  async function onEvent(name) {
    if (name === 'help' && st.step === 'help') {
      st.step = 'meet';
      explodeSoon(0, '💥 BOOM! Something in the nebula just exploded. There is a gap to the east now.');
    }
  }

  function onMove(from, to, dx, dy) {
    if (st.step === 'move') {
      st.dirs.add(`${dx},${dy}`);
      if (st.dirs.size === 4) {
        st.step = 'moved';
        afterMoves();
      }
    }
    if (!st.thirteenCalled && st.open[0] && cheb(THIRTEEN, to) <= CALL_RANGE) game.run(thirteenCallsOut);
  }

  const thirteenNpc = {
    id: THIRTEEN.id, name: CHARACTERS.thirteen.name, sprite: CHARACTERS.thirteen.sprite, x: THIRTEEN.x, y: THIRTEEN.y,
    talk: async () => {
      if (st.metThirteen) return play(D.thirteenAgain);
      await play(D.thirteenIntroduction);
      st.metThirteen = true;
      game.refreshHud();
      await checkUnlock();
    },
  };

  function numberNpc(n) {
    const c = CHARACTERS[n.id];
    return {
      id: n.id, name: c.name, sprite: c.sprite, x: n.x, y: n.y,
      talk: async () => {
        await play(D.meet[n.id]);
        const isNew = !st.met.has(n.id);
        st.met.add(n.id);
        game.refreshHud();
        if (isNew && st.step === 'meet' && st.met.size < NEEDED) ui.toast(`Numbers met: ${st.met.size} / ${NEEDED}`);
        await checkUnlock();
      },
    };
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const here = regionAt(game.player.x, game.player.y);
    const map = REGION_NAMES.map((name, i) => {
      const open = i === 0 || st.open[i - 1];
      return `<div class="region${open ? ' open' : ''}${here === i ? ' here' : ''}">${open ? '' : '🌫️ '}${name}</div>`;
    }).join('');
    const arrows = [['0,-1', '↑'], ['-1,0', '←'], ['0,1', '↓'], ['1,0', '→']]
      .map(([d, c]) => `<span class="key${st.dirs.has(d) ? ' lit' : ''}">${c}</span>`)
      .join('');
    const objective = {
      sleep: '…zzz…',
      move: `Try your thrusters: press each arrow key at least once.<div class="arrow-test">${arrows}</div>`,
      moved: `Try your thrusters: press each arrow key at least once.<div class="arrow-test">${arrows}</div>`,
      help: `Press ${key('H')} to open the help screen.`,
      meet: !hasSkill('talk')
        ? 'Explore the Number Meadow to the east.'
        : !st.metThirteen
          ? `Walk up to <b>13</b> and press ${key('Enter')} to talk.`
          : `Find and talk to the other numbers. They could be anywhere! (${Math.min(st.met.size, NEEDED)} / ${NEEDED} met)`,
      go: 'Head east to the warp gate. It leads to Level 1.',
    }[st.step];
    const names = [...(st.metThirteen ? ['thirteen'] : []), ...NUMBERS.filter((n) => st.met.has(n.id)).map((n) => n.id)];
    const met = names.length
      ? `<h3>Numbers met</h3><ul class="results">${names.map((id) => `<li>${CHARACTERS[id].name}</li>`).join('')}</ul>`
      : '';
    return `<h3>Map</h3><div class="regions">${map}</div><h3>What now?</h3><p>${objective}</p>${met}`;
  }

  // ------------------------------------------------------------ drawing
  const wakeK = () => (st.wakeAt === -1 ? 1 : st.wakeAt === null ? 0 : Math.min(1, (performance.now() - st.wakeAt) / 1000));

  function playerPose() {
    const w = wakeK();
    return { rot: (-Math.PI / 2) * (1 - w), still: w < 1 };
  }

  /** Static scenery, painted once into the cached background: the nebula and the rocks. */
  function paintBackground(g, X, Y, T) {
    const s = game.renderer.style;
    const colors = s.wallColors || ['rgba(90,50,190,0.85)'];
    g.save();
    for (const p of STATIC_PUFFS) if (p.dark) puff(g, X(p.x), Y(p.y), T * p.size, s.wallShade || 'rgba(6,4,20,0.9)');
    for (const p of STATIC_PUFFS) if (!p.dark) puff(g, X(p.x), Y(p.y), T * p.size, colors[p.c % colors.length]);
    g.fillStyle = s.rock;
    for (const rk of ROCKS) {
      g.beginPath();
      g.ellipse(X(rk.x + 0.5), Y(rk.y + 0.5), T * rk.s, T * rk.s * 0.75, 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function drawFloor(r, t) {
    const ctx = r.ctx, T = r.T, s = r.style;
    // crashed escape pod
    const pod = find('p');
    ctx.save();
    const px = r.gx(pod.x + 0.1), py = r.gy(pod.y + 0.15), pw = T * 1.8, ph = T * 0.75;
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate(-0.15);
    ctx.fillStyle = s.pod;
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = s.podGlass;
    ctx.beginPath();
    ctx.ellipse(pw * 0.22, 0, ph * 0.38, ph * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,140,60,0.8)';
    ctx.beginPath();
    ctx.arc(-pw / 2 - T * 0.08, Math.sin(t / 120) * T * 0.05, T * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // nebula walls: dense, slowly drifting gas. When a wall opens, its * section explodes outwards.
    const colors = s.wallColors || ['rgba(90,50,190,0.85)'];
    const now = performance.now();
    WALLS.forEach((w, i) => {
      // e: 0 = not exploded yet, 0..1 = exploding, 1 = done (gap gone)
      const e = !st.open[i] ? 0 : st.openedAt[i] ? Math.min(1, (now - st.openedAt[i]) / BOOM_MS) : 1;
      const ease = 1 - (1 - e) * (1 - e); // fast start, slow finish
      ctx.save();
      for (const pass of [true, false]) {
        for (const p of WALL_PUFFS[i]) {
          if (p.dark !== pass || (p.inGap && e >= 1)) continue;
          let x = p.x + Math.sin(t / 1300 + p.phase) * 0.06;
          let y = p.y + Math.cos(t / 1700 + p.phase) * 0.05;
          let alpha = 1, grow = 1;
          if (p.inGap && e > 0) {
            const dx = p.x - w.cx, dy = p.y - w.cy, d = Math.hypot(dx, dy) || 1;
            x += (dx / d) * ease * p.speed;
            y += (dy / d) * ease * p.speed;
            alpha = 1 - e;
            grow = 1 + ease;
          }
          ctx.globalAlpha = alpha;
          puff(ctx, r.gx(x), r.gy(y), T * p.size * grow, p.dark ? s.wallShade || 'rgba(6,4,20,0.9)' : colors[p.c % colors.length]);
        }
      }
      if (e > 0 && e < 1) {
        const ox = r.gx(w.cx), oy = r.gy(w.cy);
        if (e < 0.45) {
          // flash
          const f = e / 0.45, rad = T * (0.6 + f * 3.5);
          const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad);
          grd.addColorStop(0, 'rgba(255,255,235,1)');
          grd.addColorStop(0.35, 'rgba(255,190,90,0.9)');
          grd.addColorStop(1, 'rgba(255,90,40,0)');
          ctx.globalAlpha = 1 - f;
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(ox, oy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        // sparks
        ctx.globalAlpha = 1 - e;
        ctx.fillStyle = '#ffcf7a';
        for (const sp of SPARKS[i]) {
          const d = ease * sp.speed;
          ctx.beginPath();
          ctx.arc(r.gx(w.cx + Math.cos(sp.a) * d), r.gy(w.cy + Math.sin(sp.a) * d), T * sp.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });

    // area names
    REGION_NAMES.forEach((name, i) => r.text(name.toUpperCase(), r.gx(LABELS[i].x), r.gy(LABELS[i].y), { size: 0.3, color: s.muted, weight: 700 }));
  }

  function drawOver(r, t, pp) {
    if (st.wakeAt !== null) return;
    // zzz while asleep
    for (let i = 0; i < 3; i++) {
      const z = ((t / 1400 + i / 3) % 1);
      r.text(i % 2 ? 'Z' : 'z', r.ax(pp.x + 0.3 + z * 0.6), r.ay(pp.y - 0.4 - z * 1.2), { size: 0.3 + z * 0.25, alpha: 1 - z, color: '#d6ccff', weight: 800 });
    }
  }

  function drawScreen(r) {
    const dark = 0.82 * (1 - wakeK());
    if (dark <= 0) return;
    r.ctx.save();
    r.ctx.fillStyle = `rgba(2,2,10,${dark})`;
    r.ctx.fillRect(0, 0, r.width, r.height);
    r.ctx.restore();
  }

  function blocked(x, y) {
    const c = at(x, y);
    if (SOLID.has(c) || c === '|') return true;
    if (c === '*') return !st.open[WALL_OF.get(k(x, y))];
    return false;
  }

  return {
    title: 'Wake Up',
    cols: COLS,
    rows: ROWS,
    viewCols: VIEW_COLS,
    viewRows: VIEW_ROWS,
    anchor: 'tile',
    playerStart: startPos,
    npcs: [thirteenNpc, ...NUMBERS.map(numberNpc)],
    gate: { x: GATE.x, y: GATE.y, isOpen: () => st.step === 'go', lockedText: 'This warp gate leads to Level 1.' },
    help: '<p>Explore, talk to the numbers, and find your way east. Thick nebula clouds mark where you can\'t go. Keep an eye on them — space is full of surprises.</p>',
    state: st, // exposed for debugging / tests
    blocked,
    canMove: () => st.wakeAt !== null && wakeK() >= 1 && st.step !== 'sleep',
    onEnter,
    onEvent,
    onMove,
    hud,
    playerPose,
    paintBackground,
    drawFloor,
    drawOver,
    drawScreen,
  };
}

export default {
  id: ID,
  number: 0,
  title: 'Level 0 · Wake Up',
  method: 'no maths yet — who am I?',
  style: 'wake',
  stageCount: 1,
  stageName: () => 'Wake Up',
  createStage,
  debugJumps: () => [
    { label: 'Start (π asleep)', si: 0, opts: { step: 'sleep' } },
    { label: 'Number Meadow (after help)', si: 0, opts: { step: 'meet' } },
    { label: 'Path to Level 1', si: 0, opts: { step: 'go' } },
  ],
};
