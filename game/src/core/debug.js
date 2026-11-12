// Debug menu (` or F9): jump anywhere, run demo sessions, tweak saved state.
//
// Jumping can also be done by URL: index.html?level=2&stage=1&part=4
// Saved state lives in localStorage (see state.js) — "View save data" shows it.
import { CONFIG } from '../../game.config.js';
import * as ui from './ui.js';
import { save, persist, resetSave } from './state.js';
import { mulberry32, fmt, escapeHtml } from './utils.js';

export async function openDebugMenu(game) {
  const v = await ui.choice({
    title: '🛠 Debug menu',
    text: `Currently: <b>${game.level.title}</b>, stage ${game.stageIndex + 1}.`,
    options: [
      { label: 'Jump to level / stage / part', value: 'jump' },
      { label: 'Run demo sessions (range of π values per stage)', value: 'demo' },
      { label: `${save.settings.unlockAll ? 'Re-lock' : 'Unlock'} all missions`, value: 'unlock' },
      { label: 'Power up the warp gate on this stage', value: 'gate' },
      { label: 'View save data', value: 'save' },
      { label: 'Reset save data', value: 'reset' },
      { label: 'Show the intro screen', value: 'intro' },
      { label: 'Close', value: null },
    ],
    cancelValue: null,
  });
  switch (v) {
    case 'jump':
      return jumpMenu(game);
    case 'demo':
      return demoMenu(game);
    case 'unlock':
      save.settings.unlockAll = !save.settings.unlockAll;
      persist();
      return ui.toast(save.settings.unlockAll ? 'All missions unlocked' : 'Missions locked to your progress');
    case 'gate':
      game.gateOverride = true;
      return ui.toast('Warp gate powered up for this stage');
    case 'save':
      return ui.panel({ title: 'Save data (browser localStorage)', html: `<pre class="code">${escapeHtml(JSON.stringify(save, null, 2))}</pre>`, wide: true });
    case 'reset': {
      const ok = await ui.choice({
        title: 'Reset save data?',
        text: 'This clears the π tracker, completed missions and debug settings.',
        options: [
          { label: 'Yes, reset everything', value: true },
          { label: 'Cancel', value: false },
        ],
        cancelValue: false,
      });
      if (ok) {
        resetSave();
        game.loadStage(0, 0);
      }
      return;
    }
    case 'intro':
      return game.showIntro();
  }
}

async function jumpMenu(game) {
  const options = [];
  game.levels.forEach((lv, li) => {
    const jumps = lv.debugJumps
      ? lv.debugJumps()
      : Array.from({ length: lv.stageCount }, (_, si) => ({ label: `Stage ${si + 1}: ${lv.stageName(si)}`, si }));
    for (const j of jumps) options.push({ label: `L${lv.number} · ${j.label}`, value: { li, si: j.si, opts: j.opts || {} } });
  });
  options.push({ label: 'Cancel', value: null });
  const v = await ui.choice({ title: 'Jump to…', text: 'Every jump starts the stage fresh, before talking to the NPC.', options, cancelValue: null });
  if (v) game.loadStage(v.li, v.si, v.opts);
}

async function demoMenu(game) {
  const options = game.levels.map((lv, li) => ({ label: lv.title, value: li, disabled: !lv.simulate }));
  options.push({ label: 'All levels', value: 'all' }, { label: 'Cancel', value: null });
  const v = await ui.choice({
    title: 'Run demo sessions',
    text: `Simulate ${CONFIG.debug.demoRuns} players on each stage to see what range of π values people could reasonably get.`,
    options,
    cancelValue: null,
  });
  if (v === null || v === undefined) return;
  const lis = v === 'all' ? game.levels.map((_, i) => i).filter((i) => game.levels[i].simulate) : [v];
  let html = '';
  for (const li of lis) {
    const lv = game.levels[li];
    html += `<h3>${lv.title}</h3>${lv.simulateNote ? `<p class="muted">${lv.simulateNote}</p>` : ''}
      <table class="demo"><tr><th>Stage</th><th>min</th><th>median</th><th>mean</th><th>max</th><th>distribution (red = true π)</th></tr>`;
    for (let si = 0; si < lv.stageCount; si++) {
      const rng = mulberry32(1000 + li * 100 + si);
      const vals = Array.from({ length: CONFIG.debug.demoRuns }, () => lv.simulate(si, rng)).sort((a, b) => a - b);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      html += `<tr><td>${lv.stageName(si)}</td><td>${fmt(vals[0], 3)}</td><td>${fmt(vals[vals.length >> 1], 3)}</td>
        <td>${fmt(mean, 3)}</td><td>${fmt(vals[vals.length - 1], 3)}</td><td>${histogramSvg(vals)}</td></tr>`;
    }
    html += '</table>';
  }
  return ui.panel({ title: `Demo sessions (${CONFIG.debug.demoRuns} runs per stage)`, html, wide: true });
}

function histogramSvg(vals) {
  const W = 200, H = 34, bins = 20;
  let lo = Math.min(vals[0], Math.PI), hi = Math.max(vals[vals.length - 1], Math.PI);
  if (hi - lo < 0.02) { lo -= 0.01; hi += 0.01; }
  const counts = new Array(bins).fill(0);
  for (const v of vals) counts[Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo)) * bins))]++;
  const max = Math.max(...counts);
  const bw = W / bins;
  const bars = counts
    .map((c, i) => `<rect x="${i * bw + 0.5}" y="${H - (c / max) * (H - 2)}" width="${bw - 1}" height="${(c / max) * (H - 2)}" fill="#7fe0ff"/>`)
    .join('');
  const px = ((Math.PI - lo) / (hi - lo)) * W;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}<line x1="${px}" x2="${px}" y1="0" y2="${H}" stroke="#ff6b8a" stroke-width="2"/></svg>`;
}
