// LEVEL 1 — Orbit Walk: circumference ÷ diameter.
//
// A dashed orbit is drawn around a planet. π walks ALONG THE GRID LINES
// (anchor 'vertex') — up, down, left and right only, one square per step — so the
// orbit's diameter is a whole number of squares and every step can be counted.
// The player launches from the pad at the top of the orbit, flies round in their
// own way and lands back on the pad, then flies the diameter between two beacons
// (must be straight: any wobble adds steps). Then: C = steps round, d = steps across, π ≈ C ÷ d,
// typed in and calculated by the player.
//
// Traced carefully, this method ALWAYS gives exactly 4 (a staircase around a
// circle is as long as the square around it). We never say so in advance: once
// the player has done all three orbits, Captain One points out that they all
// came to 4 and leaves "why?" as an open question.
import * as ui from '../core/ui.js';
import { save, persist, tracker, markStageDone } from '../core/state.js';
import { parseNum, fmt, key } from '../core/utils.js';
import { fmtShort } from '../core/screens.js';

const ID = 'orbits';
const COLS = 30, ROWS = 20;     // squares; π walks on the (COLS+1) × (ROWS+1) grid points
const CX = 19, CY = 10;         // orbit centre (a grid point)
const STAGES = [
  { r: 3, name: 'Moonlet Mira', planet: 'planetMoon' },
  { r: 5, name: 'Red planet Rho', planet: 'planetRed' },
  { r: 8, name: 'Gas giant Gamma', planet: 'planetGiant' },
];
const CAPTAIN = { name: 'Captain One', sprite: 'captain1' };
const say = (lines) => ui.dialog({ speaker: CAPTAIN.name, sprite: CAPTAIN.sprite, lines });
const think = (lines) => ui.dialog({ speaker: 'π (thinking)', sprite: 'player', lines });

/** Latest π the player found on each orbit, kept across stages and sessions. */
const orbitResults = () => (save.levelData[ID] ||= {});

function createStage(game, si) {
  const def = STAGES[si];
  const R = def.r, d = 2 * R;
  const pad = { x: CX, y: CY - R };
  const isLast = si === STAGES.length - 1;
  const ends = [{ x: CX - R, y: CY }, { x: CX + R, y: CY }]; // diameter beacons
  // mode: idle → drawing (orbit) → measure (go to a beacon) → across (flying the diameter) → done
  const st = { briefed: false, mode: 'idle', path: [], steps: 0, dia: [], diaSteps: 0, diaFrom: null, results: [] };
  const onPad = (p) => p.x === pad.x && p.y === pad.y;
  const endAt = (p) => ends.findIndex((e) => e.x === p.x && e.y === p.y);
  const resetDiameter = () => {
    st.dia = [];
    st.diaSteps = 0;
    st.diaFrom = null;
  };

  // ------------------------------------------------------------ conversation
  async function talk() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      if (si === 0) {
        return say([
          'Welcome to my orbit station, π! I’m Captain One.',
          'You want to know your value? Then you need to study circles. Every circle hides the same special number: its <b>circumference ÷ diameter</b>.',
          `That dashed ring is the orbit of ${def.name}. Fly to the <b>launch pad</b> at the top and press ${key('Enter')} to start tracing.`,
          'Follow the ring all the way round, in your own way, and land back on the pad. Your thrusters follow the grid lines — up, down, left and right — and every move is one square.',
          'I’ll count your steps on the step counter. Then you’ll fly <b>straight across</b> the orbit, between the two beacons on the dashed line, to measure its diameter — and we’ll do the sum.',
        ]);
      }
      return say([
        `Another orbit — this one around ${def.name}. ${isLast ? 'Our biggest yet!' : 'A bigger circle this time.'}`,
        'Same mission: trace it from the launch pad, fly straight across it between the beacons, and divide. Will a bigger circle give a different answer?',
      ]);
    }
    if (st.mode === 'drawing') {
      return say([`Keep flying! Land back on the launch pad to close the orbit. Press ${key('R')} to abort and start again.`]);
    }
    if (st.mode === 'measure') {
      return say([`Now the diameter: fly to one of the two <b>beacons</b> at the ends of the dashed line through the planet, press ${key('Enter')}, then fly straight across to the other beacon.`]);
    }
    if (st.mode === 'across') {
      return say([`Fly straight across to the other beacon — the shortest way, along the dashed line. Press ${key('R')} to start the measurement again.`]);
    }
    if (st.results.length) return say(commentary(st.results[st.results.length - 1]));
    return say([`The launch pad is at the top of the orbit. Stand on it and press ${key('Enter')} to begin tracing.`]);
  }

  function commentary(res) {
    const lines = [];
    if (res.pi > 4.05) {
      lines.push(`Your orbit gave <b>π ≈ ${fmtShort(res.pi)}</b>. Looks like you wandered away from the dashed line in places — extra steps make the answer bigger. Try hugging the line next time and see what changes.`);
    } else if (res.pi < 3.95) {
      lines.push(`Your orbit gave <b>π ≈ ${fmtShort(res.pi)}</b>. You cut inside the dashed line in places — a shorter path makes the answer smaller. Try following the line closely next time and see what changes.`);
    } else {
      lines.push(`Your orbit gave <b>π ≈ ${fmtShort(res.pi)}</b>. Careful flying! Remember that number.`);
    }
    if (save.flags.orbitPuzzle) {
      lines.push('Still puzzling over why careful orbits come out the way they do? Keep thinking about it on your travels…');
    } else if (!isLast) {
      lines.push('Try again if you like. When you’re ready, the warp gate (top-left) leads to a bigger orbit. Do you think a bigger circle will give a different answer?');
    } else {
      lines.push('Try again if you like — or see how your answers compare across all three orbits.');
    }
    return lines;
  }

  /** After all three orbits: point out they all come to 4, but don't explain why. */
  async function puzzleReveal() {
    const res = orbitResults();
    const rows = STAGES.map((s, i) => `${s.name} (d = ${2 * s.r}): <b>${fmtShort(res[i])}</b>`).join('<br>');
    await say([
      `Let’s line up your three orbits:<br>${rows}`,
      'Three very different circles. But did you notice? Trace any of them carefully along the dashed line and the answer comes out as <b>exactly 4</b> — however big or small the circle.',
      'So… is π really 4? Or is walking only up, down, left and right playing some kind of trick on us?',
      'I’m not going to tell you. That’s a puzzle for you to think about on your travels. 🤔',
    ]);
    await think(['Exactly 4, every time… Is that really my value? It’s in my tracker for now — but something feels a bit off.']);
    save.flags.orbitPuzzle = true;
    persist();
  }

  // ------------------------------------------------------------ actions
  async function onAction() {
    const e = endAt(game.player);
    if (e >= 0 && st.mode === 'measure') {
      resetDiameter();
      st.mode = 'across';
      st.diaFrom = e;
      st.dia = [{ ...ends[e] }];
      ui.toast('Measuring! Fly straight across to the other beacon.');
      return true;
    }
    if (e >= 0 && st.mode === 'across') {
      ui.toast('Fly across to the <b>other</b> beacon to finish measuring.');
      return true;
    }
    if (!onPad(game.player)) return false;
    if (!st.briefed) {
      await ui.dialog({ speaker: 'Launch pad', sprite: 'pad', lines: ['The launch pad is locked. Talk to <b>Captain One</b> first — walk next to them and press Enter.'] });
      return true;
    }
    if (st.mode === 'drawing') {
      ui.toast('You’re mid-orbit! Fly round and land back here.');
      return true;
    }
    if (st.mode === 'measure' || st.mode === 'across') {
      ui.toast(`Measure the diameter first — fly between the two beacons. (Press ${key('R')} to abandon this orbit.)`);
      return true;
    }
    const go = await ui.choice({
      title: 'Launch pad',
      sprite: 'pad',
      text: st.results.length ? 'Trace the orbit again? Your old trail will be cleared.' : 'Start tracing the orbit from here?',
      options: [
        { label: 'Launch! 🚀', value: true },
        { label: 'Not yet', value: false },
      ],
      cancelValue: false,
    });
    if (go) {
      st.mode = 'drawing';
      st.path = [{ x: pad.x, y: pad.y }];
      st.steps = 0;
      resetDiameter();
      ui.toast('Tracing! Follow the orbit and land back on the pad.');
    }
    return true;
  }

  async function onRestart() {
    if (st.mode === 'across') {
      resetDiameter();
      st.mode = 'measure';
      ui.toast('Diameter measurement reset — go to either beacon and press Enter.');
      return;
    }
    if (st.mode !== 'drawing' && st.mode !== 'measure') {
      ui.toast('Stand on the launch pad and press Enter to trace the orbit again.');
      return;
    }
    const ok = await ui.choice({
      title: 'Abort this orbit?',
      text: 'Your trail and step count will be cleared. You can launch again from the pad.',
      options: [
        { label: 'Yes, abort', value: true },
        { label: 'Keep flying', value: false },
      ],
      cancelValue: false,
    });
    if (ok) {
      st.mode = 'idle';
      st.path = [];
      st.steps = 0;
      resetDiameter();
    }
  }

  function onMove(from, to) {
    if (st.mode === 'drawing') {
      st.path.push({ x: to.x, y: to.y });
      st.steps++;
      if (onPad(to) && st.steps >= 4) {
        st.mode = 'closing';
        game.run(orbitClosed);
      }
      return;
    }
    if (st.mode === 'across') {
      st.dia.push({ x: to.x, y: to.y });
      st.diaSteps++;
      const e = endAt(to);
      if (e >= 0 && e !== st.diaFrom) {
        st.mode = 'checking';
        game.run(diameterDone);
      }
      return;
    }
    if (st.mode === 'measure' && endAt(to) >= 0) ui.toast(`Beacon — press ${key('Enter')} to start measuring across`);
    else if (onPad(to) && st.briefed && st.mode !== 'measure') ui.toast(`Launch pad — press ${key('Enter')} to start tracing`);
  }

  // ------------------------------------------------------------ the maths
  async function orbitClosed() {
    await say([
      `Orbit closed! 🎉 You flew <b>${st.steps}</b> steps around ${def.name}.`,
      `Now measure straight across. Fly to one of the two glowing <b>beacons</b> at the ends of the dashed line through the planet, press ${key('Enter')}, and fly across to the other beacon.`,
    ]);
    st.mode = 'measure';
  }

  async function diameterDone() {
    if (st.diaSteps !== d) {
      // a diameter must go straight across: any wobble adds steps
      await say([
        `That took <b>${st.diaSteps}</b> steps — but your path wasn’t quite straight.`,
        'A diameter goes in a straight line, right through the centre of the circle. Fly back to a beacon, press Enter, and try again — straight along the dashed line.',
      ]);
      resetDiameter();
      st.mode = 'measure';
      return;
    }
    await say([`Straight across in <b>${st.diaSteps}</b> steps. That’s the diameter! Now for the sum.`]);
    await finish();
  }

  async function finish() {
    const S = st.steps;
    const res = await ui.form({
      title: 'Work out π',
      html: `<p>You flew <b>round</b> the orbit (the circumference) and <b>across</b> it (the diameter). Every step is one square.</p>
        <div class="formula">
          C = steps round = <span class="blank">?</span><br>
          d = steps across = <span class="blank">?</span><br>
          π ≈ C ÷ d = <span class="blank">?</span>
        </div>
        <p class="muted">Both step counts are in the panel on the right. Use a calculator if you like — but do the sum yourself!</p>`,
      fields: [
        { id: 'c', label: 'Circumference C (steps round)' },
        { id: 'd', label: 'Diameter d (steps across)' },
        { id: 'pi', label: 'π ≈ C ÷ d' },
      ],
      buttons: [{ label: 'Check', value: 'ok', primary: true }],
      validate: (v, attempt) => {
        const c = parseNum(v.c), dd = parseNum(v.d), p = parseNum(v.pi);
        if (c === null || dd === null || p === null) return 'Fill in all three boxes with numbers.';
        if (c !== S) return attempt >= 3 ? `You flew <b>${S}</b> steps round — that’s C.` : 'Check the circumference: how many steps did you fly round the orbit? (See the step counter.)';
        if (dd !== d) return attempt >= 3 ? `You flew <b>${d}</b> steps across — that’s d.` : 'Check the diameter: how many steps did you fly across? (See the step counter.)';
        if (Math.abs(p - S / d) > 0.01) return attempt >= 3 ? `π ≈ ${S} ÷ ${d} = <b>${fmt(S / d, 3)}</b>` : `Check the division: ${S} ÷ ${d} = ?`;
        return null;
      },
    });

    const pi = parseNum(res.values.pi);
    tracker.addFound(pi, `Orbit walk — ${def.name}`);
    st.results.push({ S, d, pi });
    st.mode = 'done';
    orbitResults()[si] = pi;
    markStageDone(ID, si);
    persist();
    game.refreshHud();

    if (!save.flags.firstOrbitValue) {
      save.flags.firstOrbitValue = true;
      persist();
      await think([
        `${fmtShort(pi)}… I worked that out myself! That could be my value.`,
        'It’s popped into the tray of my tracker at the top. Let me drag it into my <b>MIN</b> or <b>MAX</b> box.',
        'I don’t know yet if it’s too big or too small — so either one is fine for now.',
      ]);
    } else {
      ui.toast(`<b>${fmtShort(pi)}</b> added to your tracker — drag it into MIN or MAX if you want to keep it`, 3500);
    }

    await say(commentary(st.results[st.results.length - 1]));
    const all = orbitResults();
    if (!save.flags.orbitPuzzle && STAGES.every((_, i) => all[i] !== undefined)) await puzzleReveal();
  }

  // ------------------------------------------------------------ HUD + drawing
  function hud() {
    const status = !st.briefed
      ? 'Talk to <b>Captain One</b> — walk next to them and press Enter.'
      : st.mode === 'drawing'
        ? 'Tracing… land back on the launch pad to close the orbit.'
        : st.mode === 'measure'
          ? 'Now the diameter: go to a <b>beacon</b> at either end of the dashed line and press Enter.'
          : st.mode === 'across'
            ? 'Measuring… fly straight across to the other beacon.'
            : st.results.length
              ? 'Orbit measured! Trace it again, or take the warp gate.'
              : 'Go to the launch pad at the top of the orbit and press Enter.';
    const results = st.results
      .slice(-5)
      .reverse()
      .map((r) => `<li>π ≈ <b>${fmtShort(r.pi)}</b> <span class="muted">(${r.S} round ÷ ${r.d} across)</span></li>`)
      .join('');
    return `<h3>Mission</h3><p>${status}</p>
      <h3>Step counter</h3>
      <div class="counters">
        <div class="counter"><span class="num">${st.steps}</span><span class="lbl">round (C)</span></div>
        <div class="counter"><span class="num">${st.diaSteps}</span><span class="lbl">across (d)</span></div>
      </div>
      <h3>Formula</h3>
      <div class="formula small">C = steps round<br>d = steps across<br>π ≈ C ÷ d</div>
      ${results ? `<h3>Your orbits here</h3><ul class="results">${results}</ul>` : ''}`;
  }

  function drawFloor(r, t) {
    const ctx = r.ctx, T = r.T, s = r.style;
    const cx = r.ax(CX), cy = r.ay(CY);

    r.drawSprite(def.planet, CX, CY, Math.max(1.6, R * 0.9));

    // orbit ring
    ctx.save();
    ctx.strokeStyle = s.accent;
    ctx.lineWidth = Math.max(2, T * 0.08);
    ctx.setLineDash([T * 0.22, T * 0.18]);
    ctx.lineDashOffset = -t / 60;
    ctx.shadowColor = s.accentGlow;
    ctx.shadowBlur = T * 0.35;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, R * T, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // diameter guide line with end ticks
    ctx.save();
    ctx.strokeStyle = s.muted;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([T * 0.12, T * 0.12]);
    ctx.beginPath();
    ctx.moveTo(cx - R * T, cy);
    ctx.lineTo(cx + R * T, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const ex of [cx - R * T, cx + R * T]) {
      ctx.beginPath();
      ctx.moveTo(ex, cy - T * 0.25);
      ctx.lineTo(ex, cy + T * 0.25);
      ctx.stroke();
    }
    ctx.restore();
    r.text('d = ? steps', cx + R * T + T * 0.45, cy + T * 0.5, { size: 0.3, color: s.muted, align: 'left' });

    // launch pad
    const pulse = st.briefed && st.mode === 'idle' ? 1 + Math.sin(t / 250) * 0.06 : 1;
    r.drawSprite('pad', pad.x, pad.y, 1.0 * pulse, { alpha: st.briefed ? 1 : 0.55 });

    // trails: round the orbit, then across it
    drawTrail(r, st.path, s.trail, s.trailGlow, s.trailDot);
    drawTrail(r, st.dia, s.diaTrail, s.diaTrailGlow, s.diaTrail);

    // diameter beacons (glow when it's time to measure)
    const active = st.mode === 'measure' || st.mode === 'across';
    ends.forEach((e, i) => {
      const bx = r.ax(e.x), by = r.ay(e.y);
      const glow = active && !(st.mode === 'across' && i === st.diaFrom);
      const rad = T * (0.22 + (glow ? Math.sin(t / 200) * 0.05 : 0));
      ctx.save();
      ctx.fillStyle = glow ? s.diaTrail : s.muted;
      ctx.shadowColor = s.diaTrailGlow;
      ctx.shadowBlur = glow ? T * 0.6 : 0;
      ctx.globalAlpha = glow ? 1 : 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, by - rad * 1.4);
      ctx.lineTo(bx + rad, by);
      ctx.lineTo(bx, by + rad * 1.4);
      ctx.lineTo(bx - rad, by);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function drawTrail(r, path, color, glow, dot) {
    if (path.length < 2) return;
    const ctx = r.ctx, T = r.T;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, T * 0.12);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = glow;
    ctx.shadowBlur = T * 0.3;
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(r.ax(p.x), r.ay(p.y)) : ctx.moveTo(r.ax(p.x), r.ay(p.y))));
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = dot;
    for (const p of path) {
      ctx.beginPath();
      ctx.arc(r.ax(p.x), r.ay(p.y), Math.max(2, T * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    title: def.name,
    cols: COLS,
    rows: ROWS,
    anchor: 'vertex',
    playerStart: { x: 3, y: 17 },
    npcs: [{ id: 'captain', name: CAPTAIN.name, sprite: CAPTAIN.sprite, x: 6, y: 15, talk }],
    gate: { x: 2, y: 3, isOpen: () => st.results.length > 0, lockedText: 'Trace the orbit and work out π to power up the warp gate.' },
    help: `<p>π walks along the grid lines, one square per step. Trace the dashed orbit from the launch pad and land back on it.
      Then go to a beacon at one end of the dashed line, press Enter and fly straight across to the other beacon to measure the diameter.
      Finally calculate <b>π ≈ circumference ÷ diameter</b> (steps round ÷ steps across).
      ${key('R')} aborts an orbit or restarts a diameter measurement.</p>`,
    state: st, // exposed for debugging / tests
    onMove,
    onAction,
    onRestart,
    hud,
    drawFloor,
  };
}

// ---------------------------------------------------------------- demo sessions
// Simulated pilots follow the orbit greedily with up/down/left/right moves.
// Careful pilots hug the line (→ 4); others drift inside or outside, or wobble.
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

function simulate(si, rng) {
  const R = STAGES[si].r;
  const persona = rng();
  const careful = persona < 0.5;
  const aim = careful ? R : R + (rng() - 0.5) * 1.6; // others fly a bit inside / outside the line
  const noise = careful ? 0.1 : 0.2 + rng() * 0.8;
  let x = 0, y = -R, len = 0, travelled = 0;
  for (let step = 0; step < 4000; step++) {
    if (travelled > 2 * Math.PI - 0.4) {
      // head home to the pad
      let mx = Math.sign(0 - x), my = Math.sign(-R - y);
      if (!mx && !my) break;
      if (mx && my) (rng() < 0.5 ? (mx = 0) : (my = 0));
      x += mx;
      y += my;
      len += 1;
      continue;
    }
    let best = null, bestScore = Infinity;
    for (const [mx, my] of DIRS4) {
      const nx = x + mx, ny = y + my;
      const prog = angDiff(Math.atan2(ny, nx), Math.atan2(y, x));
      if (prog <= 1e-9) continue;
      const score = Math.abs(Math.hypot(nx, ny) - aim) + rng() * noise - prog * 0.5;
      if (score < bestScore) { bestScore = score; best = [mx, my, prog]; }
    }
    x += best[0];
    y += best[1];
    travelled += best[2];
    len += 1;
    if (x === 0 && y === -R && travelled > Math.PI) break;
  }
  return len / (2 * R);
}

export default {
  id: ID,
  number: 1,
  title: 'Level 1 · Orbit Walk',
  method: 'circumference ÷ diameter (C/d)',
  style: 'orbit',
  stageCount: STAGES.length,
  stageName: (i) => STAGES[i].name,
  createStage,
  debugJumps: () => STAGES.map((s, si) => ({ label: `Stage ${si + 1}: ${s.name} (radius ${s.r})`, si })),
  simulate,
  simulateNote: 'Simulated pilots (up/down/left/right only): half trace carefully along the line, the rest drift inside/outside or wobble.',
};
