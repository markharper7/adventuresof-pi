// HTML for the shared screens: intro, help, HUD key hints, π tracker, end of game.
// Controls appear in the help screen and HUD only once the player has learned them.
import { CONFIG } from '../../game.config.js';
import { spriteUrl } from './assets.js';
import { key, escapeHtml } from './utils.js';

export const SKILL_NAMES = {
  move: 'Move (arrow keys)',
  help: 'Help (H)',
  talk: 'Talk (Enter)',
  tracker: 'π tracker (T)',
  missions: 'Mission select (L)',
  restart: 'Restart (R)',
};

const CONTROL_ROWS = [
  ['move', `${key('↑')}${key('↓')}${key('←')}${key('→')} or ${key('W')}${key('A')}${key('S')}${key('D')}`, 'Move one square: up, down, left or right'],
  ['talk', `${key('Enter')} or ${key('Space')}`, 'Talk to numbers · use things · pick up · drop · throw'],
  ['help', key('H'), 'Help — show the controls you know'],
  ['tracker', `${key('T')} or drag`, 'π tracker — drag values into MIN / MAX, or press T to type them'],
  ['missions', key('L'), 'Mission select — replay any unlocked mission'],
  ['restart', key('R'), 'Restart / abort the current attempt'],
];

/** Compact number for the tracker: 4, 3.2, 3.1416 */
export const fmtShort = (v) => (v === null || v === undefined ? '—' : String(Number(Number(v).toFixed(4))));

export function controlsTable(skills) {
  const rows = CONTROL_ROWS.filter(([k]) => skills[k]).map(([, keys, what]) => `<tr><td>${keys}</td><td>${what}</td></tr>`);
  if (CONFIG.debug.enabled) rows.push(`<tr><td>${key('`')} or ${key('F9')}</td><td class="muted">Debug menu (for game builders)</td></tr>`);
  const allKnown = CONTROL_ROWS.every(([k]) => skills[k]);
  return `<table class="controls">${rows.join('')}</table>${allKnown ? '' : '<p class="muted">More controls unlock as you play.</p>'}`;
}

export function introHtml() {
  return `<div class="intro">
    <img class="intro-hero" src="${spriteUrl('player')}" alt="">
    <p class="lead">Somewhere out in the Circle Nebula, a small number is fast asleep…</p>
    <p>A journey through space to discover who you really are.</p>
    <p class="muted">You’ll learn the controls as you go. The ones you know are always shown at the top right,
    and once you’ve learned ${key('H')} it shows them all again.</p>
  </div>`;
}

export function helpHtml(level, stage, skills) {
  return `${controlsTable(skills)}
    ${stage && stage.help ? `<h3>${level.title}</h3><div>${stage.help}</div>` : ''}`;
}

export function hudKeysHtml(skills) {
  const hint = (k, label) => `<span class="keyhint">${k} ${label}</span>`;
  return [
    skills.move ? hint(`${key('↑')}${key('↓')}${key('←')}${key('→')}`, 'Move') : '',
    skills.talk ? hint(key('Enter'), 'Talk / use') : '',
    skills.help ? hint(key('H'), 'Help') : '',
    skills.tracker ? hint(key('T'), 'Tracker') : '',
    skills.missions ? hint(key('L'), 'Missions') : '',
    CONFIG.debug.enabled ? hint(key('`'), 'Debug') : '',
  ].join('');
}

/**
 * The π tracker in the top bar: MIN box · tray (latest worked-out value) · MAX box.
 * selected: null | 'chip' | 'min' | 'max' (click-to-move instead of dragging)
 */
export function trackerHtml(t, selected, historyOpen) {
  const slot = (name, label) => {
    const full = t[name] !== null;
    return `<div class="slot${full ? '' : ' empty'}${selected === name ? ' selected' : ''}" data-slot="${name}"
      ${full ? 'draggable="true" title="Drag to the other box to copy or move this value"' : 'title="Drop a value here"'}>
      <span class="slot-label">${label}</span><span class="slot-val">${full ? fmtShort(t[name]) : 'drop here'}</span></div>`;
  };
  const f = t.found[0];
  const chip = f
    ? `<span class="chip${f.isNew ? ' new' : ''}${selected === 'chip' ? ' selected' : ''}" draggable="true" data-src="chip"
        title="${escapeHtml(f.source || '')} — drag me into MIN or MAX (or click me, then click a box)">${fmtShort(f.value)}</span>`
    : '<span class="tray-empty">your next value will appear here</span>';
  const hist = t.history || [];
  const toggle = hist.length
    ? `<button type="button" class="history-toggle" title="All values worked out so far">${historyOpen ? '▴' : '▾'}</button>`
    : '';
  const list = hist.length && historyOpen
    ? `<div class="history-list"><div class="history-title">All values so far — drag one into MIN or MAX</div>${hist
        .map(
          (h, i) => `<div class="history-item${selected === 'h' + i ? ' selected' : ''}" draggable="true" data-src="h${i}"
            title="Drag into MIN or MAX (or click, then click a box)"><b>${fmtShort(h.value)}</b>
            <span class="muted">${escapeHtml(h.source || '')}</span></div>`,
        )
        .join('')}</div>`
    : '';
  return `<div class="tracker" id="tracker-widget">
    <span class="tracker-label">My value</span>${slot('min', 'MIN')}<div class="tray">${chip}${toggle}${list}</div>${slot('max', 'MAX')}</div>`;
}

export function trackerEditorHtml(t) {
  const f = t.found[0];
  return `<p>Your MIN and MAX are your best guesses for the smallest and biggest your value could be.
    Type new numbers to replace them — but once a box has a value it can’t be left empty, and MIN can’t be bigger than MAX.</p>
    <h3>Latest value worked out</h3>
    ${f ? `<p><b>${fmtShort(f.value)}</b> <span class="muted">${escapeHtml(f.source || '')}</span></p>` : '<p class="muted">Nothing new right now.</p>'}`;
}

export function endHtml(t) {
  return `<p class="lead">You’ve reached the edge of the explored universe — for now!</p>
    <p>Your tracker says your value is somewhere between <b>${fmtShort(t.min)}</b> and <b>${fmtShort(t.max)}</b>.
    Will you ever pin it down exactly…?</p>
    <p>You can replay any mission to try for a closer answer. New missions will appear here as they’re built.</p>`;
}
