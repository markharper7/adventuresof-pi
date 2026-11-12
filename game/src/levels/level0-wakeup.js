// LEVEL 0 — Wake Up: the introduction. No maths yet.
//
// π wakes up next to a crashed pod, realises it doesn't know its own value, and
// (through its inner monologue) learns the controls one at a time:
//   1. move (try all four arrows)      → learns H for help
//   2. open help                       → first force field switches off
//   3. meet five number characters     → learns Enter to talk (rational, irrational, negative…)
//   4. realises it doesn't know its value → learns the MIN / MAX tracker, makes a guess
//      and drags it into MIN or MAX    → second force field switches off
//   5. walks east to Captain One and the warp gate to Level 1.
//
// The map is wider than the screen (the camera follows π). Glowing force fields
// show the edge of the area you can reach; the map strip in the sidebar shows
// which areas are open.
import * as ui from '../core/ui.js';
import { hasSkill, markStageDone, tracker } from '../core/state.js';
import { parseNum, key, cheb } from '../core/utils.js';

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
const think = (lines) => ui.dialog({ speaker: 'π (thinking)', sprite: 'player', lines });

const NUMBERS = [
  {
    id: 'seven', name: 'Seven', sprite: 'seven', x: 18, y: 3,
    lines: [
      'Hi! I’m <b>Seven</b> — 7. A <b>positive whole number</b>.',
      'I’m <b>rational</b>: I can be written as a fraction, 7/1. And I know my value exactly: seven. Lucky me!',
    ],
  },
  {
    id: 'minusThree', name: 'Minus Three', sprite: 'minusThree', x: 21, y: 9,
    lines: [
      'Brrr. I’m <b>Minus Three</b>, −3. I’m <b>negative</b> — I live to the left of zero on the number line.',
      'Still rational, though: −3/1. Being negative doesn’t mean I don’t know who I am!',
    ],
  },
  {
    id: 'half', name: 'One Half', sprite: 'half', x: 26, y: 3,
    lines: [
      'Hello, I’m <b>One Half</b> — ½. I’m what you get when you split 1 into 2 equal parts.',
      'I’m <b>rational</b> too: one whole number divided by another. As a decimal I’m 0.5 — and then I stop. Neat and tidy.',
    ],
  },
  {
    id: 'zero', name: 'Zero', sprite: 'zero', x: 29, y: 9,
    lines: [
      'I’m <b>Zero</b>. 0. <b>Not positive, not negative</b>. Just… nothing.',
      'People think I’m boring, but without me there’d be no 10, 100 or 1000!',
    ],
  },
  {
    id: 'rootTwo', name: 'Root Two', sprite: 'rootTwo', x: 33, y: 6,
    lines: [
      'Greetings. I am <b>Root Two</b> — √2, the number that makes 2 when you multiply me by myself.',
      'I am <b>irrational</b>: you can’t write me as a fraction. My decimals go on forever without repeating: 1.41421356…',
      'Even so, I know my value precisely. Do you know yours, little one?',
    ],
  },
];

function createStage(game, si, opts = {}) {
  const start = opts.step || 'sleep';
  const st = {
    step: start,           // sleep → move → help → meet → tracker → drag → go
    dirs: new Set(),
    met: new Set(start === 'tracker' || start === 'go' ? NUMBERS.map((n) => n.id) : []),
    open: [start === 'meet' || start === 'tracker' || start === 'go', start === 'go'],
    openedAt: [0, 0],
    wakeAt: start === 'sleep' ? null : -1, // -1 = already awake
  };
  // debug jumps start with the controls you'd have learned by then
  const known = { sleep: [], meet: ['move', 'help'], tracker: ['move', 'help', 'talk'], go: ['move', 'help', 'talk', 'tracker'] }[start] || [];
  known.forEach((k) => game.learn(k, { announce: false }));
  if (start === 'go') markStageDone(ID, 0);
  const startPos = { sleep: { x: 5, y: 6 }, meet: { x: 16, y: 6 }, tracker: { x: 31, y: 6 }, go: { x: 38, y: 6 } }[start] || { x: 5, y: 6 };

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
      await think([
        '…Mmm? Wh-where am I?',
        'Floating in space, next to a crashed pod… I must have been asleep for ages.',
        'I’m a <b>number</b> — I can feel it. And every number knows its own value. It’s the most important thing about us!',
        'So what’s my value? I’m… I’m… I can’t remember! 😟',
        'Maybe moving around will help me think. Let me try my thrusters.',
      ]);
      game.learn('move');
      st.step = 'move';
      return;
    }
    if (st.step === 'tracker') return trackerLesson();
    ui.toast('<b>Level 0 · Wake Up</b>', 2500);
  }

  async function afterMoves() {
    await think([
      'Up, down, left, right — I can move! One square at a time.',
      `A voice in my memory says: <i>“If you’re ever lost, press ${key('H')} for help.”</i> Let me try it.`,
    ]);
    game.learn('help');
    st.step = 'help';
  }

  async function learnTalk() {
    await think([
      'Someone’s over there… another number? Maybe they know something about me!',
      `I’ll walk up next to them and press ${key('Enter')} to say hello.`,
    ]);
    game.learn('talk');
  }

  async function trackerLesson() {
    st.step = 'tracker';
    await think([
      'Seven, minus three, a half, zero, root two… every one of them knows its value. Even √2, whose digits never end!',
      'And me? I’m <b>π</b>… but what number <i>am</i> I? I have to find out!',
      'I’d better keep track of my guesses as I go.',
    ]);
    game.learn('tracker');
    await think([
      'There — my tracker, at the top of the screen. <b>MIN</b> is the smallest my value could be. <b>MAX</b> is the biggest.',
      'I have no idea yet… so let me just make a guess, somewhere between 1 and 10.',
    ]);
    const res = await ui.form({
      title: 'Make a guess',
      html: '<p>What might π’s value be? Type any number between 1 and 10.</p>',
      fields: [{ id: 'g', label: 'My guess' }],
      buttons: [{ label: 'That’s my guess', value: 'ok', primary: true }],
      validate: (v) => {
        const n = parseNum(v.g);
        if (n === null) return 'Type a number.';
        if (n < 1 || n > 10) return 'Pick something between 1 and 10.';
        return null;
      },
    });
    tracker.addFound(parseNum(res.values.g), 'My first guess');
    await think([
      'My guess has appeared in the tray at the top of the screen.',
      '<b>Drag it into the MIN box or the MAX box.</b> Either one — I don’t know yet if it’s too big or too small! (Or click it, then click a box.)',
    ]);
    st.step = 'drag';
  }

  async function onEvent(name) {
    if (name === 'help' && st.step === 'help') {
      openBarrier(0);
      st.step = 'meet';
      await think([
        'So that’s what I can do so far. I bet I’ll learn more as I go.',
        'Oh! The force field to the east just switched off. Let’s explore!',
      ]);
    } else if (name === 'tracker-set' && st.step === 'drag') {
      openBarrier(1);
      st.step = 'go';
      markStageDone(ID, 0);
      await think([
        'That’s how my tracker works: whenever I work out a new value, I can drag it into MIN or MAX. And I can always change my mind.',
        'Hey — the second force field just switched off! And somebody is waving at the far end of the path…',
      ]);
    }
  }

  function onMove(from, to, dx, dy) {
    if (st.step === 'move') {
      st.dirs.add(`${dx},${dy}`);
      if (st.dirs.size === 4) {
        st.step = 'moved';
        game.run(afterMoves);
      }
    }
    if (!hasSkill('talk') && st.open[0] && NUMBERS.some((n) => cheb(n, to) <= 2)) game.run(learnTalk);
  }

  function numberNpc(n) {
    return {
      id: n.id, name: n.name, sprite: n.sprite, x: n.x, y: n.y,
      talk: async () => {
        await ui.dialog({ speaker: n.name, sprite: n.sprite, lines: n.lines });
        st.met.add(n.id);
        game.refreshHud();
        if (st.met.size === NUMBERS.length && st.step === 'meet') await trackerLesson();
        else if (st.step === 'meet') ui.toast(`Numbers met: ${st.met.size} / ${NUMBERS.length}`);
      },
    };
  }

  const captain = {
    id: 'captain', name: 'Captain One', sprite: 'captain1', x: 47, y: 6,
    talk: () =>
      ui.dialog({
        speaker: 'Captain One',
        sprite: 'captain1',
        lines: [
          'Ahoy there! I’m <b>Captain One</b>.',
          'Lost your value, have you? Then you need to study circles — every circle hides a very special number.',
          `My orbit station is through that warp gate. Step next to it and press ${key('Enter')} when you’re ready!`,
        ],
      }),
  };

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
      meet: `Meet the numbers in the Number Meadow. ${hasSkill('talk') ? `Walk next to them and press ${key('Enter')}.` : ''} (${st.met.size} / ${NUMBERS.length} met)`,
      tracker: 'Set up your tracker.',
      drag: 'Drag your guess from the tray at the top into <b>MIN</b> or <b>MAX</b>.',
      go: 'Head east and meet the number waving at the end of the path.',
    }[st.step];
    const met = st.met.size
      ? `<h3>Numbers met</h3><ul class="results">${NUMBERS.filter((n) => st.met.has(n.id)).map((n) => `<li>${n.name}</li>`).join('')}</ul>`
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
    npcs: [...NUMBERS.map(numberNpc), captain],
    gate: { x: 49, y: 6, isOpen: () => st.step === 'go', lockedText: 'This warp gate leads to Level 1.' },
    help: '<p>Explore, meet the numbers, and find your way east. Glowing force fields mark the edge of where you can go — they switch off as you learn.</p>',
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
    { label: 'Tracker lesson', si: 0, opts: { step: 'tracker' } },
    { label: 'Path to Level 1', si: 0, opts: { step: 'go' } },
  ],
};
