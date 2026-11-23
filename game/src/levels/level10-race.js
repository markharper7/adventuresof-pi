// LEVEL 10 — The Star Race: the Nilakantha series against the Leibniz series.
//
//   Nilakantha:  π = 3 + 4/(2×3×4) − 4/(4×5×6) + 4/(6×7×8) − …
//   Leibniz:     π = 4 − 4/3 + 4/5 − 4/7 + …
//
// Two stars side by side. Both start with their first term already in: the Nilakantha star burns at 3,
// the Leibniz star at 4. The player feeds the Nilakantha star; 2 (from Level 2) feeds the Leibniz star,
// one term every time the player completes one, so both always have the same number of terms.
//
// One Nilakantha term k (k = 1 … TERMS) is 4 ÷ (2k × (2k+1) × (2k+2)). The player works out the three
// numbers from the pattern, takes those number stones from the rack along the bottom (2 … 2·TERMS+2) and
// puts them in the right CRYSTAL PRESS (up to 3 at once, any order): the FIRE press builds crystals that add
// (+), the ICE press builds crystals that take away (−). Each press shows the whole fraction, 4 over □ × □ × □,
// filling in as stones go in. Using the wrong press is refused with a hint; a stone that isn't in this term is
// spat back out with a hint. When all three are in, the press builds the crystal: 4 ÷ (a × b × c) = 1/den. The player picks the finished crystal up and carries it to
// the Nilakantha star. Only a finished crystal goes into the star, so every time something goes in, the star's
// value changes. At the same moment 2 throws the next Leibniz crystal into the other star. Each Nilakantha
// value goes to the tracker.
// A chart along the top shows both stars' values after each term, and a disc on the right shows the slice
// the last term added, so the player can see the terms shrinking.
// UNLOCK terms open the warp gate. After all TERMS, 2 offers to feed the Leibniz star 1000 more terms
// (fast-forward) to show how far behind it still is.
// (Dialogue: npc_dialogue.js → level10.)
import * as ui from '../core/ui.js';
import { tracker, markStageDone } from '../core/state.js';
import { play, DIALOGUE, CHARACTERS } from '../core/talk.js';
import { fmt, key, clamp, fracHtml } from '../core/utils.js';
import { drawWedge } from '../core/fractions.js';
import { PIECE_STYLES, RACE_STYLE as RS } from '../../assets/theme.js';

const ID = 'race';
const COLS = 26, ROWS = 17;
const TERMS = 8;                               // Nilakantha fractions available (after the starting 3)
const UNLOCK = 4;                              // fractions needed to open the warp gate
const EXTRA = 1000;                            // Leibniz terms 2 adds in the fast-forward
const STONES = Array.from({ length: 2 * TERMS + 1 }, (_, i) => i + 2); // 2 … 18
const RACK = { x0: 4, y: 15 };                 // stone v sits at (x0 + v − 2, y); take it from the square above
const LEI = { x: 6, y: 5, w: 2, h: 2 };        // Leibniz star tiles
const NIL = { x: 15, y: 5, w: 2, h: 2 };       // Nilakantha star tiles
// The two crystal presses, each showing the whole fraction 4 ÷ (□ × □ × □). Far enough apart that π is never next to both.
const PRESSES = [
  { id: 'fire', sign: 1, x: 7, y: 10, w: 3, h: 3, label: 'FIRE PRESS · adds' },
  { id: 'ice', sign: -1, x: 14, y: 10, w: 3, h: 3, label: 'ICE PRESS · takes away' },
];
const pressFor = (sign) => PRESSES.find((pr) => pr.sign === sign);
const centre = (s) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
const SLICE = { x: 22, y: 6.5, r: 1.6 };         // disc showing the last slice (raw grid units)
const CHART = { x0: 1.5, x1: 24.5, y0: 0.3, y1: 3.6, lo: 2.6, hi: 4.1 };
const PLAYER_START = { x: 12, y: 12 };
const TEN_POS = { x: 3, y: 11 };
const TWO_POS = { x: 3, y: 6 };
const GATE = { x: 22, y: 11 };
const D = DIALOGUE.level10;
const TEN = CHARACTERS.ten, TWO = CHARACTERS.two;

/** Nilakantha term k (1-based): the three numbers, sign, and the value as 1/den. */
const nilTerm = (k) => {
  const a = 2 * k, b = 2 * k + 1, c = 2 * k + 2;
  return { k, nums: [a, b, c], sign: k % 2 ? 1 : -1, den: (a * b * c) / 4 };
};
/** Nilakantha estimate after m fractions (plus the starting 3). */
const nila = (m) => {
  let s = 3;
  for (let k = 1; k <= m; k++) s += nilTerm(k).sign / nilTerm(k).den;
  return s;
};
/** Leibniz estimate after n terms (4 − 4/3 + …). */
const leibniz = (n) => {
  let s = 0;
  for (let k = 0; k < n; k++) s += (k % 2 ? -4 : 4) / (2 * k + 1);
  return s;
};
const styleFor = (sign) => (sign > 0 ? PIECE_STYLES.positive : PIECE_STYLES.negative);
const termHtml = (t) => `${t.sign < 0 ? '−' : '+'} 4 ÷ (${t.nums.join(' × ')})`;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function createStage(game, si, opts = {}) {
  const startPart = clamp(opts.part ?? 0, 0, TERMS);
  const st = {
    briefed: startPart > 0,
    part: startPart,           // Nilakantha fractions done
    slotted: [],               // stones already in the crystal press for the current term
    crystal: null,             // the finished crystal for the current term: null | 'ready' (in the press) | 'carried'
    carrying: [],              // stones π is holding
    leiTerms: startPart + 1,   // Leibniz terms in the left star (it starts with 4 already in)
    leiHistory: Array.from({ length: startPart + 1 }, (_, i) => leibniz(i + 1)),
    nilHistory: Array.from({ length: startPart + 1 }, (_, i) => nila(i)),
    fx: [],                    // crystals in flight: { side, start, sign, den }
    flash: { lei: null, nil: null },
    lastSlice: startPart ? nilTerm(startPart) : null,
    fastForwarded: false,
    ff: null,                  // fast-forward animation: { start, from, to }
  };
  const unlocked = () => st.part >= UNLOCK;
  const finished = () => st.part >= TERMS;
  if (unlocked()) markStageDone(ID, si);
  const current = () => (finished() ? null : nilTerm(st.part + 1));
  const nilNow = () => nila(st.part);
  const leiNow = () => leibniz(st.leiTerms);

  const nextTo = (s, p) => p.x >= s.x - 1 && p.x <= s.x + s.w && p.y >= s.y - 1 && p.y <= s.y + s.h;
  const inRect = (s, x, y) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  const stoneX = (v) => RACK.x0 + v - 2;
  const stoneAbove = (p) => (p.y === RACK.y - 1 ? STONES.find((v) => stoneX(v) === p.x) ?? null : null);

  // ------------------------------------------------------------ conversation
  async function talkTen() {
    if (!st.briefed) {
      st.briefed = true;
      game.refreshHud();
      return play(D.intro);
    }
    if (!unlocked()) return play(D.progress, { n: UNLOCK - st.part });
    return play(D.again);
  }

  async function talkTwo() {
    if (!st.briefed) return play([{ two: [`Hello again, Pi! Have a word with ${TEN.name} first.`] }]);
    if (!finished() || st.ff) return play(D.twoRacing);
    if (!st.fastForwarded) {
      await play(D.twoOffer);
      return fastForward();
    }
    return play(D.twoAfter, { terms: st.leiTerms, value: fmt(leiNow(), 5), nila: fmt(nilNow(), 5), nilaTerms: TERMS + 1 });
  }

  /** 2 pours EXTRA more Leibniz terms into the left star. */
  async function fastForward() {
    const from = st.leiTerms, to = from + EXTRA, ms = 3500;
    st.ff = { start: performance.now(), from, to, ms };
    await sleep(ms + 100);
    st.ff = null;
    st.leiTerms = to;
    st.fastForwarded = true;
    st.flash.lei = performance.now();
    game.refreshHud();
    await play(D.twoAfter, { terms: to, value: fmt(leiNow(), 5), nila: fmt(nilNow(), 5), nilaTerms: TERMS + 1 });
  }

  function tick(now) {
    if (st.ff) {
      const k = clamp((now - st.ff.start) / st.ff.ms, 0, 1);
      const n = Math.round(st.ff.from + (st.ff.to - st.ff.from) * k * k); // speeds up as it goes
      if (n !== st.leiTerms) {
        st.leiTerms = n;
        game.refreshHud();
      }
    }
    st.fx = st.fx.filter((f) => now - f.start < 900);
  }

  // ------------------------------------------------------------ actions
  async function onAction() {
    const p = game.player;
    const v = stoneAbove(p);
    if (v !== null) {
      if (!st.briefed) return ui.toast(`Those stones belong to ${TEN.name}. Talk to them first.`), true;
      if (finished()) return ui.toast('The race is over. Press R to race again.'), true;
      if (st.crystal) {
        ui.toast(st.crystal === 'ready' ? 'Your crystal is ready in the press. Take it to your star first.' : 'Take your crystal to the Nilakantha star first.', 3500);
      } else if (st.carrying.includes(v)) {
        st.carrying = st.carrying.filter((x) => x !== v);
        ui.toast(`Put the <b>${v}</b> stone back.`);
      } else if (st.slotted.includes(v)) {
        ui.toast(`The <b>${v}</b> stone is already in the crystal press.`);
      } else if (st.carrying.length + st.slotted.length >= 3) {
        ui.toast('Three stones is all one crystal needs. Take them to a crystal press (or put one back here).', 3500);
      } else {
        st.carrying.push(v);
        ui.toast(`Picked up the <b>${v}</b> stone. Carrying: ${st.carrying.join(', ')}.`);
      }
      game.refreshHud();
      return true;
    }
    const press = PRESSES.find((pr) => nextTo(pr, p));
    if (press) {
      if (!st.briefed) return ui.toast(`Talk to ${TEN.name} first.`), true;
      if (finished()) return ui.toast('Every stone has been used. Press R to race again.'), true;
      const t = current();
      const right = pressFor(t.sign);
      if (st.crystal === 'ready') {
        if (press !== right) return ui.toast(`Your crystal is waiting in the ${right.id} press.`), true;
        st.crystal = 'carried';
        ui.toast(`Picked up the ${styleFor(t.sign).name}: <b>${t.sign < 0 ? '−' : '+'} 1/${t.den}</b>. Take it to the Nilakantha star.`, 3500);
        game.refreshHud();
        return true;
      }
      if (st.crystal === 'carried') return ui.toast('You are already carrying the crystal. Take it to the Nilakantha star.'), true;
      if (!st.carrying.length) return ui.toast('Fetch number stones from the rack at the bottom first.'), true;
      if (press !== right) {
        const why = t.sign > 0 ? 'This fraction is added (+), so it needs the fire press.' : 'This fraction is taken away (−), so it needs the ice press.';
        return ui.toast(`The ${press.id} press won’t take them. ${why}`, 4000), true;
      }
      await feedPress();
      return true;
    }
    if (nextTo(NIL, p)) {
      if (!st.briefed) return ui.toast(`Talk to ${TEN.name} first.`), true;
      if (finished()) return ui.toast('Every stone has been used. Press R to race again.'), true;
      if (st.crystal === 'carried') {
        await completeTerm(current());
        return true;
      }
      if (st.crystal === 'ready') return ui.toast(`Your crystal is waiting in the ${pressFor(current().sign).id} press. Pick it up first.`), true;
      return ui.toast(st.carrying.length ? 'Stones go in the crystal press first. It turns them into a crystal for your star.' : 'Build a crystal in the fire or ice press, then bring it here.', 3500), true;
    }
    if (nextTo(LEI, p)) {
      ui.toast(`This is the Leibniz star. ${TWO.name} looks after it.`);
      return true;
    }
    return false;
  }

  /** Put the carried stones into the crystal press. Three right ones build the crystal. */
  async function feedPress() {
    const t = current();
    const right = st.carrying.filter((v) => t.nums.includes(v));
    const wrong = st.carrying.filter((v) => !t.nums.includes(v));
    st.slotted.push(...right);
    st.carrying = wrong;
    game.refreshHud();
    if (wrong.length) {
      const sn = st.part === 0 ? 'Start with 2, then the two numbers after it.' : `Last time it was ${nilTerm(st.part).nums.join(', ')}. What comes next?`;
      ui.toast(`The press spits out ${wrong.join(' and ')}: not part of this fraction. ${sn}`, 4500);
    }
    if (st.slotted.length < 3) {
      if (right.length && !wrong.length) ui.toast(`In it goes! ${3 - st.slotted.length} more stone${st.slotted.length === 2 ? '' : 's'} for this term.`);
      return;
    }
    st.crystal = 'ready';
    st.pressFlash = performance.now();
    game.refreshHud();
    ui.toast(`The press builds a <b>${styleFor(t.sign).name}</b>: ${termHtml(t)} = <b>${t.sign < 0 ? '−' : '+'} 1/${t.den}</b>. Pick it up and take it to your star.`, 4500);
  }

  async function completeTerm(t) {
    const now = performance.now();
    st.part++;
    st.slotted = [];
    st.crystal = null;
    st.lastSlice = t;
    st.fx.push({ side: 'nil', start: now, sign: t.sign, den: t.den, from: { x: game.player.x + 0.5, y: game.player.y + 0.5 } });
    st.flash.nil = now + 700;
    // 2 throws the next Leibniz term in at the same time
    const lk = st.leiTerms;
    st.leiTerms++;
    st.fx.push({ side: 'lei', start: now + 150, sign: lk % 2 ? -1 : 1, den: 2 * lk + 1 });
    st.flash.lei = now + 850;
    const n = nilNow(), l = leiNow();
    st.nilHistory.push(n);
    st.leiHistory.push(l);
    game.refreshHud();
    tracker.addFound(n, `Nilakantha series — ${st.part + 1} terms`);
    ui.toast(`${termHtml(t)} = ${t.sign < 0 ? '−' : '+'} 1/${t.den} → π ≈ <b>${fmt(n, 5)}</b>. Added to your tracker. (Leibniz: ${fmt(l, 5)})`, 4500);
    await sleep(900);
    const vars = { nila: fmt(n, 5), leibniz: fmt(l, 5), terms: st.part + 1 };
    if (st.part === UNLOCK) {
      markStageDone(ID, si);
      await play(D.unlocked, vars);
    }
    if (finished()) await play(D.allDone, vars);
  }

  async function onRestart() {
    if (!st.briefed) return ui.toast(`Talk to ${TEN.name} first.`);
    if (st.ff) return;
    const ok = await ui.choice({
      title: 'Restart the race?',
      text: 'Both stars go back to their first term (your π tracker keeps its values).',
      options: [
        { label: 'Yes, restart', value: true },
        { label: 'Cancel', value: false },
      ],
      cancelValue: false,
    });
    if (!ok) return;
    Object.assign(st, {
      part: 0, slotted: [], crystal: null, carrying: [], leiTerms: 1, leiHistory: [leibniz(1)], nilHistory: [nila(0)],
      fx: [], lastSlice: null, fastForwarded: false,
    });
    game.refreshHud();
    ui.toast('Ready, steady… the race is reset.');
  }

  // ------------------------------------------------------------ HUD
  function hud() {
    const t = current();
    const race = `<h3>The race (${st.part + 1} term${st.part ? 's' : ''} each${st.leiTerms > st.part + 1 ? `, Leibniz ${st.leiTerms}` : ''})</h3>
      <div class="counters">
        <div class="counter"><span class="num" style="color:${RS.nila}">${fmt(nilNow(), 5)}</span><span class="lbl">Nilakantha (you)</span></div>
        <div class="counter"><span class="num" style="color:${RS.leibniz}">${fmt(leiNow(), 5)}</span><span class="lbl">Leibniz (${TWO.name})</span></div>
      </div>`;
    const series = `<div class="formula small">π = 3 + 4/(2×3×4) − 4/(4×5×6)<br>&nbsp;&nbsp;&nbsp;+ 4/(6×7×8) − …</div>`;
    let mission;
    if (!st.briefed) mission = `<p>Talk to <b>${TEN.name}</b>: walk next to them and press ${key('Enter')}.</p>`;
    else if (finished()) mission = st.fastForwarded
      ? `<p class="muted">The race is over. Take the warp gate, or press ${key('R')} to race again.</p>`
      : `<p class="muted">The race is over! Talk to <b>${TWO.name}</b> to see how many terms Leibniz needs.</p>`;
    else if (unlocked()) mission = `<p class="muted">The warp gate is open. Keep going for a better estimate (up to ${TERMS} fractions), or take the gate.</p>`;
    else mission = `<p class="muted">Add ${UNLOCK} fractions to your star to open the warp gate (${st.part} / ${UNLOCK}).</p>`;
    let termBlock = '';
    if (st.briefed && t) {
      const cls = t.sign < 0 ? 'neg' : 'pos';
      const slots = [0, 1, 2].map((i) => (st.slotted[i] !== undefined ? `<b>${[...st.slotted].sort((a, b) => a - b)[i]}</b>` : '?')).join(' × ');
      termBlock = `<h3>Fraction ${st.part + 1} of ${TERMS}</h3>
        <div class="formula ${cls}" style="font-size:1.15em">${t.sign < 0 ? '−' : '+'} 4 ÷ (${slots})</div>
        <p>${t.sign < 0 ? 'Taken away: an <span class="neg">ice crystal</span>' : 'Added: a <span class="pos">fire crystal</span>'}</p>
        <ol class="results">
          <li>${st.crystal ? '✓ ' : ''}Put the 3 stones in the ${t.sign > 0 ? 'fire' : 'ice'} press (${st.crystal ? 3 : st.slotted.length} / 3)</li>
          <li>${st.crystal === 'carried' ? '✓ ' : ''}Pick up the crystal</li>
          <li>Carry it to the Nilakantha star</li>
        </ol>
        <p>Carrying: ${st.crystal === 'carried' ? `<b class="${cls}">${styleFor(t.sign).name} (${t.sign < 0 ? '−' : '+'} 1/${t.den})</b>` : st.carrying.length ? st.carrying.map((v) => `<b>${v}</b>`).join(', ') : 'nothing'}</p>`;
    }
    const last = st.lastSlice ? `<p class="muted">Last fraction: 4 ÷ (${st.lastSlice.nums.join('×')}) = ${fracHtml(1, st.lastSlice.den)} of a disc</p>` : '';
    return `<h3>Mission</h3>${mission}${termBlock}${race}${series}${last}`;
  }

  // ------------------------------------------------------------ drawing
  function drawChart(r) {
    const ctx = r.ctx, s = r.style, T = r.T;
    const N = TERMS + 1;
    const X = (i) => r.gx(CHART.x0 + 1 + (i / (N - 1)) * (CHART.x1 - CHART.x0 - 2.2));
    const Y = (v) => r.gy(CHART.y1 - ((clamp(v, CHART.lo, CHART.hi) - CHART.lo) / (CHART.hi - CHART.lo)) * (CHART.y1 - CHART.y0));
    ctx.save();
    ctx.fillStyle = s.chartBg;
    ctx.beginPath();
    ctx.roundRect(r.gx(CHART.x0), r.gy(CHART.y0) - T * 0.15, r.gx(CHART.x1) - r.gx(CHART.x0), r.gy(CHART.y1) - r.gy(CHART.y0) + T * 0.3, T * 0.25);
    ctx.fill();
    ctx.restore();
    // No "true π" line: the player must never be shown the real value — only what they work out.
    for (const v of [3, 3.5, 4]) r.text(v.toFixed(1), r.gx(CHART.x0 + 0.4), Y(v), { size: 0.24, color: s.muted });
    const line = (hist, col) => {
      const pts = hist.slice(0, N).map((v, i) => ({ x: X(i), y: Y(v) }));
      ctx.save();
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === pts.length - 1 ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };
    line(st.leiHistory, RS.leibniz);
    line(st.nilHistory, RS.nila);
    r.text('Leibniz', r.gx(CHART.x1 - 0.3), r.gy(CHART.y0 + 0.35), { size: 0.24, color: RS.leibniz, align: 'right', weight: 700 });
    r.text('Nilakantha', r.gx(CHART.x1 - 0.3), r.gy(CHART.y0 + 0.75), { size: 0.24, color: RS.nila, align: 'right', weight: 700 });
    r.text('π after each term →', r.gx(CHART.x1 - 0.3), r.gy(CHART.y1 - 0.05), { size: 0.22, color: s.muted, align: 'right' });
  }

  function drawStar(r, t, s, value, terms, { name, col, core, glow, lit, flashAt }) {
    const ctx = r.ctx, T = r.T, c = centre(s), cx = r.gx(c.x), cy = r.gy(c.y);
    const size = lit ? T * (0.35 + 0.22 * clamp(value, 0, 4.2)) * (1 + Math.sin(t / 300 + c.x) * 0.04) : 0;
    ctx.save();
    ctx.strokeStyle = RS.rim;
    ctx.lineWidth = 2;
    ctx.setLineDash([T * 0.2, T * 0.15]);
    ctx.lineDashOffset = t / 80;
    ctx.beginPath();
    ctx.arc(cx, cy, T * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (size) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.6);
      g.addColorStop(0, core);
      g.addColorStop(0.4, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const now = performance.now();
    if (flashAt && now > flashAt && now - flashAt < 700) {
      ctx.strokeStyle = glow;
      ctx.globalAlpha = 1 - (now - flashAt) / 700;
      ctx.lineWidth = T * 0.12;
      ctx.beginPath();
      ctx.arc(cx, cy, size + T * ((now - flashAt) / 350), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    r.text(name, cx, cy + T * 1.45, { size: 0.26, color: col, weight: 800 });
    r.text(`π ≈ ${fmt(value, 5)}`, cx, cy + T * 1.8, { size: 0.26, color: r.style.text, weight: 700 });
    r.text(`${terms} term${terms > 1 ? 's' : ''}`, cx, cy + T * 2.12, { size: 0.2, color: r.style.muted });
  }

  function drawSlice(r) {
    const ctx = r.ctx, T = r.T, cx = r.gx(SLICE.x), cy = r.gy(SLICE.y), R = SLICE.r * T;
    ctx.save();
    ctx.fillStyle = RS.disc;
    ctx.strokeStyle = RS.discEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const t = st.lastSlice;
    if (t) {
      const sty = styleFor(t.sign), a = (Math.PI * 2) / t.den;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, -Math.PI / 2 - a / 2, -Math.PI / 2 + a / 2);
      ctx.closePath();
      ctx.fillStyle = sty.edge;
      ctx.shadowColor = sty.glow;
      ctx.shadowBlur = T * 0.3;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = sty.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
    r.text('LAST SLICE', cx, cy - R - T * 0.35, { size: 0.24, color: r.style.muted });
    r.text(t ? `${t.sign < 0 ? '−' : '+'} 1/${t.den} of a disc` : 'none yet', cx, cy + R + T * 0.4, { size: 0.26, color: t ? styleFor(t.sign).stroke : r.style.muted, weight: 700 });
  }

  function drawRack(r, t) {
    const ctx = r.ctx, T = r.T;
    const x0 = r.gx(RACK.x0 - 0.2), y0 = r.gy(RACK.y + 0.05), w = (STONES.length + 0.4) * T, h = T * 0.9;
    ctx.save();
    ctx.fillStyle = RS.rackFill;
    ctx.strokeStyle = RS.rackEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, h, T * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    for (const v of STONES) {
      const used = st.carrying.includes(v) || st.slotted.includes(v);
      drawStone(r, r.gx(stoneX(v) + 0.5), r.gy(RACK.y + 0.5), T * 0.36, v, { used });
    }
    r.text('NUMBER STONES', r.gx(RACK.x0 + STONES.length / 2), r.gy(RACK.y + 1.25), { size: 0.22, color: r.style.muted });
  }

  function drawStone(r, px, py, rad, v, { used = false, numerator = false } = {}) {
    const ctx = r.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    if (used) {
      ctx.strokeStyle = RS.stoneUsed;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(px - rad * 0.3, py - rad * 0.3, rad * 0.1, px, py, rad);
      g.addColorStop(0, numerator ? RS.numLight : RS.stoneLight);
      g.addColorStop(0.7, numerator ? RS.num : RS.stone);
      g.addColorStop(1, numerator ? RS.numDark : RS.stoneDark);
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
    if (!used) r.text(String(v), px, py + 1, { size: (rad / r.T) * (v >= 10 ? 1.05 : 1.25), color: RS.stoneText, weight: 800 });
  }

  /** Crystals in flight: the Nilakantha one forms above its star and drops in; 2 throws the Leibniz one. */
  function drawFx(r, now) {
    for (const f of st.fx) {
      const k = (now - f.start) / 700;
      if (k < 0 || k > 1) continue;
      const to = centre(f.side === 'nil' ? NIL : LEI);
      const from = f.side === 'nil' ? f.from : { x: TWO_POS.x + 0.5, y: TWO_POS.y + 0.5 };
      const e = k * k;
      const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(k * Math.PI) * 1.2;
      drawWedge(r.ctx, r.gx(x), r.gy(y), r.T * 0.5, Math.min(f.den, 8), now / 300, styleFor(f.sign)); // tiny slices drawn at a visible size
    }
  }

  /** A crystal press: the whole fraction (4 over □ × □ × □), and the finished crystal floating above it.
   *  Only the press matching the current fraction's sign is lit; the other is dimmed. */
  function drawPress(r, t, press) {
    const ctx = r.ctx, T = r.T, c = centre(press), cx = r.gx(c.x);
    const sty = styleFor(press.sign);
    const tm = current();
    const active = !!tm && tm.sign === press.sign && st.briefed;
    const x0 = r.gx(press.x + 0.1), y0 = r.gy(press.y + 0.15), w = (press.w - 0.2) * T, h = (press.h - 0.3) * T;
    const flash = active && st.pressFlash && performance.now() - st.pressFlash < 600;
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.4;
    ctx.fillStyle = RS.pressFill;
    ctx.strokeStyle = sty.edge;
    ctx.shadowColor = sty.glow;
    ctx.shadowBlur = active ? T * (flash ? 0.9 : 0.3 + 0.1 * Math.sin(t / 400)) : 0;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, h, T * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // the whole fraction:   4
    //                    ─────────
    //                    □ × □ × □      (= 1/den once the crystal is built)
    const numY = press.y + 0.7, barY = press.y + 1.15, denY = press.y + 1.65;
    const sorted = active ? [...st.slotted].sort((a, b) => a - b) : [];
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.35;
    drawStone(r, cx, r.gy(numY), T * 0.26, 4, { numerator: true });
    ctx.strokeStyle = sty.stroke;
    ctx.lineWidth = Math.max(2, T * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r.gx(c.x - 1.0), r.gy(barY));
    ctx.lineTo(r.gx(c.x + 1.0), r.gy(barY));
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const sx = r.gx(c.x + (i - 1) * 0.7), sy = r.gy(denY);
      if (i) r.text('×', r.gx(c.x + (i - 1.5) * 0.7), sy, { size: 0.26, color: r.style.muted, weight: 800 });
      if (sorted[i] !== undefined) drawStone(r, sx, sy, T * 0.25, sorted[i]);
      else {
        ctx.save();
        ctx.strokeStyle = RS.slot;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(sx, sy, T * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        r.text('?', sx, sy, { size: 0.24, color: RS.slot, weight: 800 });
      }
    }
    ctx.restore();
    if (active && st.crystal) r.text(`= ${tm.sign < 0 ? '−' : '+'} 1/${tm.den}`, cx, r.gy(press.y + 2.3), { size: 0.3, color: sty.stroke, weight: 800 });
    // the finished crystal floats just above the press until π picks it up
    if (active && st.crystal === 'ready') drawWedge(ctx, cx, r.gy(press.y - 0.35) + Math.sin(t / 300) * T * 0.06, T * 0.5, Math.min(tm.den, 8), t / 900, sty); // tiny slices drawn at a visible size
    r.text(press.label, cx, r.gy(press.y + press.h + 0.3), { size: 0.24, color: active ? sty.stroke : r.style.muted, weight: 700 });
  }

  function drawFloor(r, t) {
    drawChart(r);
    for (const pr of PRESSES) drawPress(r, t, pr);
    drawStar(r, t, LEI, leiNow(), st.leiTerms, { name: 'LEIBNIZ', col: RS.leibniz, core: RS.leibnizCore, glow: RS.leibnizGlow, lit: true, flashAt: st.flash.lei });
    drawStar(r, t, NIL, nilNow(), st.part + 1, { name: 'NILAKANTHA', col: RS.nila, core: RS.nilaCore, glow: RS.nilaGlow, lit: true, flashAt: st.flash.nil });
    drawSlice(r);
    drawRack(r, t);
  }

  function drawOver(r, t, pp) {
    const now = performance.now();
    drawFx(r, now);
    if (st.ff) {
      // a stream of tiny crystals from 2 into the Leibniz star
      const to = centre(LEI);
      for (let i = 0; i < 8; i++) {
        const k = ((now / 400 + i / 8) % 1), e = k * k;
        const x = TWO_POS.x + 0.5 + (to.x - TWO_POS.x - 0.5) * e, y = TWO_POS.y + 0.5 + (to.y - TWO_POS.y - 0.5) * e - Math.sin(k * Math.PI) * 0.8;
        drawWedge(r.ctx, r.gx(x), r.gy(y), r.T * 0.2, 12, now / 200 + i, styleFor(i % 2 ? -1 : 1), { glow: false });
      }
    }
    if (st.crystal === 'carried') {
      const tm = current();
      drawWedge(r.ctx, r.ax(pp.x), r.ay(pp.y - 0.8), r.T * 0.32, Math.min(tm.den, 8), t / 600, styleFor(tm.sign));
    }
    if (st.carrying.length) {
      const n = st.carrying.length;
      st.carrying.forEach((v, i) => drawStone(r, r.ax(pp.x + (i - (n - 1) / 2) * 0.5), r.ay(pp.y - 0.8), r.T * 0.22, v));
    }
    if (game.busy || ui.isOpen() || game.nearbyNpc() || !st.briefed) return;
    const p = game.player, v = stoneAbove(p);
    if (v !== null && !finished()) r.bubble(p.x, p.y - 1.1, st.carrying.includes(v) ? `Enter: put ${v} back` : `Enter: take ${v}`);
    else if (!finished() && PRESSES.some((pr) => nextTo(pr, p))) {
      const pr = PRESSES.find((q) => nextTo(q, p)), right = pr === pressFor(current().sign);
      if (st.crystal === 'ready' && right) r.bubble(p.x, p.y - 1.1, 'Enter: take the crystal');
      else if (st.carrying.length && !st.crystal) r.bubble(p.x, p.y - 1.1, 'Enter: put stones in');
    }
    else if (nextTo(NIL, p) && st.crystal === 'carried') r.bubble(p.x, p.y - 1.1, 'Enter: add the crystal');
  }

  return {
    title: 'Star Race',
    cols: COLS,
    rows: ROWS,
    anchor: 'tile',
    playerStart: PLAYER_START,
    npcs: [
      { id: 'ten', name: TEN.name, sprite: TEN.sprite, x: TEN_POS.x, y: TEN_POS.y, talk: talkTen },
      { id: 'two', name: TWO.name, sprite: TWO.sprite, x: TWO_POS.x, y: TWO_POS.y, talk: talkTwo },
    ],
    gate: { ...GATE, isOpen: unlocked, lockedText: `Add at least ${UNLOCK} fractions to the Nilakantha star to power up the warp gate.` },
    help: `<p>π = 3 + 4/(2×3×4) − 4/(4×5×6) + 4/(6×7×8) − … Each fraction is 4 divided by three numbers in a row.
      Stand above a number stone on the rack and press ${key('Enter')} to take it (or put it back). Put the three
      stones for the next fraction in the right press with ${key('Enter')}: the <span class="pos">fire press</span> for a
      fraction that is added, the <span class="neg">ice press</span> for one that is taken away. It builds the crystal:
      pick it up and press ${key('Enter')} next to the Nilakantha star to add it.</p>
      <p>${TWO.name} adds a Leibniz term to the other star each time you add one. ${UNLOCK} fractions open the warp gate;
      you can keep going up to ${TERMS}. ${key('R')} restarts the race.</p>`,
    state: st, // exposed for debugging / tests
    blocked: (x, y) => inRect(LEI, x, y) || inRect(NIL, x, y) || PRESSES.some((pr) => inRect(pr, x, y)) || (y === RACK.y && x >= RACK.x0 && x < RACK.x0 + STONES.length),
    onAction,
    tick,
    onRestart,
    hud,
    drawFloor,
    drawOver,
  };
}

export default {
  id: ID,
  number: 10,
  title: 'Level 10 · The Star Race',
  method: 'Nilakantha series: π = 3 + 4/(2×3×4) − 4/(4×5×6) + …',
  style: 'race',
  stageCount: 1,
  stageName: () => 'Star Race',
  createStage,
  debugJumps: () => [
    ...Array.from({ length: TERMS }, (_, k) => ({ label: `Fraction ${k + 1}: ${termHtml(nilTerm(k + 1))}`, si: 0, opts: { part: k } })),
    { label: `All ${TERMS} fractions done (race over)`, si: 0, opts: { part: TERMS } },
  ],
  // The series is fixed: a demo player does the required fractions, then stops after a random number of optional ones.
  simulate: (si, rng) => nila(UNLOCK + Math.floor(rng() * (TERMS - UNLOCK + 1))),
  simulateNote: `The series is fixed, so the spread only comes from how many fractions a player adds (${UNLOCK} to ${TERMS}).`,
};
