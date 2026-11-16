// LEVEL 0 — Wake Up: the introduction. No maths yet.
//
// π wakes up next to a crashed pod with no memory (dialogue: npc_dialogue.js → level0)
// and learns the controls one at a time:
//   1. move (try all four arrows)      → learns H for help
//   2. open help                       → first force field switches off
//   3. 3 calls out and teaches Enter   → π can't say who they are
//   4. meet at least NEEDED of the other numbers (2.14, √2, −4, 0, e)
//                                      → second force field switches off
//   5. walk east to the warp gate to Level 1.
//
// The map is wider than the screen (the camera follows π). Glowing force fields
// show the edge of the area you can reach; the map strip in the sidebar shows
// which areas are open.
import * as ui from '../core/ui.js';
import { hasSkill, markStageDone } from '../core/state.js';
import { key, cheb } from '../core/utils.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';

const D = DIALOGUE.level0;
const ID = 'wakeup';
const COLS = 52, ROWS = 13, VIEW = 24;
const BARRIERS = [14, 36]; // force-field columns between the three areas
const REGIONS = [
  { name: 'Wake-up Bay', from: 0, to: 13 },
  { name: 'Number Meadow', from: 15, to: 35 },
  { name: 'Path to Level 1', from: 37, to: 51 },
];
const POD = [{ x: 2, y: 6 }, { x: 3, y: 6 }];
const ROCKS = [
  { x: 1, y: 1, s: 0.5 }, { x: 9, y: 2, s: 0.35 }, { x: 11, y: 10, s: 0.6 }, { x: 6, y: 11, s: 0.3 },
  { x: 40, y: 2, s: 0.5 }, { x: 43, y: 10, s: 0.4 }, { x: 50, y: 1, s: 0.35 }, { x: 24, y: 11, s: 0.3 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const THREE = { id: 'three', x: 17, y: 6, callRange: 3 }; // calls out when π comes this close
// The other numbers, met in any order. Positions only — their lines are in npc_dialogue.js.
const NUMBERS = [
  { id: 'twoPointOneFour', x: 21, y: 3 },
  { id: 'minusFour', x: 24, y: 9 },
  { id: 'zero', x: 28, y: 3 },
  { id: 'rootTwo', x: 31, y: 9 },
  { id: 'e', x: 34, y: 5 },
];
const NEEDED = 3; // how many of NUMBERS π must talk to before the way to Level 1 opens

function createStage(game, si, opts = {}) {
  const start = opts.step || 'sleep';
  const st = {
    step: start,           // sleep → move → moved → help → meet → go
    dirs: new Set(),
    threeCalled: start === 'go',
    metThree: start === 'go',
    met: new Set(start === 'go' ? NUMBERS.map((n) => n.id) : []),
    open: [start === 'meet' || start === 'go', start === 'go'],
    openedAt: [0, 0],
    wakeAt: start === 'sleep' ? null : -1, // -1 = already awake
  };
  // debug jumps start with the controls you'd have learned by then
  const known = { sleep: [], meet: ['move', 'help'], go: ['move', 'help', 'talk'] }[start] || [];
  known.forEach((k) => game.learn(k, { announce: false }));
  if (start === 'go') markStageDone(ID, 0);
  const startPos = { sleep: { x: 5, y: 6 }, meet: { x: 13, y: 6 }, go: { x: 38, y: 6 } }[start] || { x: 5, y: 6 };

  const openBarrier = (i) => {
    st.open[i] = true;
    st.openedAt[i] = performance.now();
  };
  const regionOf = (x) => REGIONS.findIndex((r) => x <= r.to + 1);

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

  async function threeCallsOut() {
    st.threeCalled = true;
    await play(D.threeCallsOut);
    game.learn('talk');
  }

  async function checkUnlock() {
    if (st.step !== 'meet' || !st.metThree || st.met.size < NEEDED) return;
    openBarrier(1);
    st.step = 'go';
    markStageDone(ID, 0);
    ui.toast('The force field to the east has switched off! The warp gate to Level 1 is open.', 5000);
  }

  async function onEvent(name) {
    if (name === 'help' && st.step === 'help') {
      openBarrier(0);
      st.step = 'meet';
      ui.toast('The force field to the east has switched off. Go and explore!', 4500);
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
    if (!st.threeCalled && st.open[0] && cheb(THREE, to) <= THREE.callRange) game.run(threeCallsOut);
  }

  const threeNpc = {
    id: THREE.id, name: CHARACTERS.three.name, sprite: CHARACTERS.three.sprite, x: THREE.x, y: THREE.y,
    talk: async () => {
      if (st.metThree) return play(D.threeAgain);
      await play(D.threeIntroduction);
      st.metThree = true;
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
    const here = regionOf(game.player.x);
    const map = REGIONS.map((r, i) => {
      const open = i === 0 || st.open[i - 1];
      return `<div class="region${open ? ' open' : ''}${here === i ? ' here' : ''}">${open ? '' : '🔒 '}${r.name}</div>`;
    }).join('');
    const arrows = [['0,-1', '↑'], ['-1,0', '←'], ['0,1', '↓'], ['1,0', '→']]
      .map(([d, k]) => `<span class="key${st.dirs.has(d) ? ' lit' : ''}">${k}</span>`)
      .join('');
    const objective = {
      sleep: '…zzz…',
      move: `Try your thrusters: press each arrow key at least once.<div class="arrow-test">${arrows}</div>`,
      moved: `Try your thrusters: press each arrow key at least once.<div class="arrow-test">${arrows}</div>`,
      help: `Press ${key('H')} to open the help screen.`,
      meet: !hasSkill('talk')
        ? 'Explore the Number Meadow to the east.'
        : !st.metThree
          ? `Walk up to <b>3</b> and press ${key('Enter')} to talk.`
          : `Talk to the other numbers in the Number Meadow. (${Math.min(st.met.size, NEEDED)} / ${NEEDED} met)`,
      go: 'Head east to the warp gate. It leads to Level 1.',
    }[st.step];
    const names = [...(st.metThree ? ['three'] : []), ...NUMBERS.filter((n) => st.met.has(n.id)).map((n) => n.id)];
    const met = names.length
      ? `<h3>Numbers met</h3><ul class="results">${names.map((id) => `<li>${CHARACTERS[id].name}</li>`).join('')}</ul>`
      : '';
    return `<h3>Map</h3><div class="regions">${map}</div><h3>What now?</h3><p>${objective}</p>${met}`;
  }

  // ------------------------------------------------------------ drawing
  const wakeK = () => (st.wakeAt === -1 ? 1 : st.wakeAt === null ? 0 : Math.min(1, (performance.now() - st.wakeAt) / 1000));

  function playerPose() {
    const k = wakeK();
    return { rot: (-Math.PI / 2) * (1 - k), still: k < 1 };
  }

  function drawFloor(r, t) {
    const ctx = r.ctx, T = r.T, s = r.style;
    // region names
    REGIONS.forEach((reg) => r.text(reg.name.toUpperCase(), r.gx((reg.from + reg.to + 1) / 2), r.gy(0.45), { size: 0.3, color: s.muted, weight: 700 }));
    r.text('→ to Level 1', r.gx(50), r.gy(7.6), { size: 0.28, color: s.muted });
    // rocks
    for (const rk of ROCKS) {
      ctx.save();
      ctx.fillStyle = s.rock;
      ctx.beginPath();
      ctx.ellipse(r.ax(rk.x), r.ay(rk.y), T * rk.s, T * rk.s * 0.75, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // crashed escape pod
    ctx.save();
    const px = r.gx(2.1), py = r.gy(6.15), pw = T * 1.8, ph = T * 0.75;
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
    // force fields
    BARRIERS.forEach((bx, i) => {
      let alpha = 1;
      if (st.open[i]) {
        alpha = st.openedAt[i] ? 1 - (performance.now() - st.openedAt[i]) / 1200 : 0;
        if (alpha <= 0) return;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      const x0 = r.gx(bx), y0 = r.gy(0), w = T, h = ROWS * T;
      ctx.fillStyle = s.barrierFill;
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = s.barrier;
      ctx.shadowColor = s.barrier;
      ctx.shadowBlur = T * 0.4;
      ctx.lineWidth = 2;
      for (const ex of [x0 + w * 0.2, x0 + w * 0.8]) {
        ctx.beginPath();
        ctx.moveTo(ex, y0);
        ctx.lineTo(ex, y0 + h);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha * 0.6;
      for (let k = 0; k < ROWS * 2; k++) {
        const yy = y0 + ((k * T * 0.5 + t / 20) % h);
        ctx.beginPath();
        ctx.moveTo(x0 + w * 0.2, yy);
        ctx.lineTo(x0 + w * 0.8, yy + T * 0.2);
        ctx.stroke();
      }
      ctx.restore();
      if (!st.open[i]) r.text('🔒', x0 + w / 2, r.gy(ROWS / 2), { size: 0.5 });
    });
  }

  function drawOver(r, t, pp) {
    if (st.wakeAt !== null) return;
    // zzz while asleep
    for (let i = 0; i < 3; i++) {
      const k = ((t / 1400 + i / 3) % 1);
      r.text(i % 2 ? 'Z' : 'z', r.ax(pp.x + 0.3 + k * 0.6), r.ay(pp.y - 0.4 - k * 1.2), { size: 0.3 + k * 0.25, alpha: 1 - k, color: '#d6ccff', weight: 800 });
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

  return {
    title: 'Wake Up',
    cols: COLS,
    rows: ROWS,
    viewCols: VIEW,
    anchor: 'tile',
    playerStart: startPos,
    npcs: [threeNpc, ...NUMBERS.map(numberNpc)],
    gate: { x: 49, y: 6, isOpen: () => st.step === 'go', lockedText: 'This warp gate leads to Level 1.' },
    help: '<p>Explore, talk to the numbers, and find your way east. Glowing force fields mark the edge of where you can go — they switch off as you learn.</p>',
    state: st, // exposed for debugging / tests
    blocked: (x, y) => POD.some((p) => p.x === x && p.y === y) || BARRIERS.some((bx, i) => !st.open[i] && x === bx),
    canMove: () => st.wakeAt !== null && wakeK() >= 1 && st.step !== 'sleep',
    onEnter,
    onEvent,
    onMove,
    hud,
    playerPose,
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
