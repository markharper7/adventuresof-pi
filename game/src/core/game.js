// The game shell shared by every level: loading stages, moving the player,
// talking to NPCs, warp gates, HUD, learned controls, help / tracker /
// mission-select screens and the drag-and-drop π tracker.
//
// A level module (see src/levels/) provides stages. A stage object looks like:
// {
//   title, cols, rows, anchor: 'tile' | 'vertex', playerStart: {x, y},
//   viewCols?, viewRows?,                 // narrower than cols / shorter than rows = scrolling map
//   paintBackground(g, X, Y, T),          // optional: static scenery painted once into the cached background
//   npcs: [{ name, sprite, x, y, talk: async () => {} }],
//   gate: { x, y, isOpen: () => bool, lockedText },
//   help: 'html',                         // extra help shown on the H screen
//   blocked(x, y) -> bool,                // optional impassable squares
//   boundary: { thickness, radius, clear } | false,  // optional tweaks to the shaped edge (core/boundary.js)
//   canMove() -> bool,                    // optional (e.g. while π is asleep)
//   onEnter() -> Promise,                 // optional, runs once when the stage starts
//   onEvent(name) -> Promise,             // optional: 'help', 'tracker-set', ...
//   onMove(from, to, dx, dy),             // optional
//   tick(now),                            // optional: called every frame / 100 ms, even during popups
//   onAction() -> Promise<bool>,          // Enter pressed (return true if handled)
//   onRestart() -> Promise,               // R pressed
//   hud() -> 'html',                      // sidebar contents
//   playerPose(t) -> { rot, still },      // optional
//   drawFloor(r, t), drawOver(r, t, playerPos), drawScreen(r, t)
// }
import { CONFIG } from '../../game.config.js';
import { LEVELS } from '../levels/index.js';
import { Renderer } from './renderer.js';
import * as ui from './ui.js';
import { save, persist, resetSave, tracker, isStageUnlocked, isStageDone, hasSkill, learnSkill } from './state.js';
import { setupInput } from './input.js';
import { loadSprites } from './assets.js';
import { openDebugMenu } from './debug.js';
import { introHtml, helpHtml, hudKeysHtml, trackerHtml, trackerEditorHtml, endHtml, SKILL_NAMES, fmtShort } from './screens.js';
import { cheb, parseNum, clamp } from './utils.js';
import { makeBoundary } from './boundary.js';
import { LEVEL_STYLES } from '../../assets/theme.js';

const $ = (id) => document.getElementById(id);
/** Controls every player has once they're past Level 0. */
const CORE_SKILLS = ['move', 'help', 'talk', 'tracker', 'missions', 'restart'];

export class Game {
  constructor() {
    this.renderer = new Renderer($('game-canvas'));
    this.levels = LEVELS;
    this.ui = ui;
    this.levelIndex = 0;
    this.stageIndex = 0;
    this.level = null;
    this.stage = null;
    this.player = { x: 0, y: 0, fromX: 0, fromY: 0, moveStart: 0, facing: 1 };
    this.lastMoveAt = 0;
    this.queuedMove = null;
    this.busy = false;
    this.gateOverride = false;
    this.events = [];
    this.pendingEnter = null;
    this.selectedChip = null; // 'chip' | 'h<i>' | 'min' | 'max' picked by clicking
    this.historyOpen = false; // tray history dropdown (hidden by default)
  }

  async boot() {
    await loadSprites();
    setupInput({
      isModalOpen: () => ui.isOpen(),
      onModalKey: (e) => ui.handleKey(e),
      onMove: (dx, dy, repeat) => this.tryMove(dx, dy, repeat),
      onKey: (e) => this.onKey(e),
    });
    // refit the canvas whenever its area changes (window resize, or the top bar growing when the tracker appears)
    let lastSize = '';
    new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const size = `${Math.round(width)}x${Math.round(height)}`;
      if (size !== lastSize && this.stage) {
        lastSize = size;
        this.renderer.resize();
      }
    }).observe($('stage-wrap'));
    tracker.onChange(() => this.renderTracker());
    this.setupTrackerDragDrop();
    this.renderKeys();
    this.renderTracker();
    requestAnimationFrame((t) => this.frame(t));
    this.startTicker();

    // Debug shortcut: index.html?level=2&part=3 (level = the level's number)
    const params = new URLSearchParams(location.search);
    if (params.has('level')) {
      const num = parseInt(params.get('level'), 10) || 0;
      const li = Math.max(0, LEVELS.findIndex((l) => l.number === num));
      const si = (parseInt(params.get('stage'), 10) || 1) - 1;
      const opts = {};
      if (params.has('part')) opts.part = (parseInt(params.get('part'), 10) || 1) - 1;
      if (params.has('step')) opts.step = params.get('step');
      this.loadStage(li, si, opts);
      return;
    }

    const last = save.last;
    const hasLast = last && LEVELS[last.level] && last.stage < LEVELS[last.level].stageCount;
    this.loadStage(hasLast ? last.level : 0, hasLast ? last.stage : 0, {}, { quiet: true });
    await this.run(() => this.showIntro());
  }

  async showIntro() {
    const last = save.last;
    const canContinue = last && LEVELS[last.level] && (last.level > 0 || last.stage > 0);
    const buttons = canContinue
      ? [
          { label: 'Continue', value: 'continue', primary: true },
          { label: 'Start from the very beginning', value: 'new' },
        ]
      : [{ label: 'Begin ✨', value: 'new', primary: true }];
    const v = await ui.panel({ title: CONFIG.title, html: introHtml(), buttons, closeKeys: [] });
    if (v === 'new') this.startNewGame();
    else this.loadStage(this.levelIndex, this.stageIndex);
  }

  /** A completely fresh game: forget tracker values, learned controls, progress and results. */
  startNewGame() {
    resetSave({ keepSettings: true });
    this.selectedChip = null;
    this.historyOpen = false;
    this.loadStage(0, 0);
  }

  // ---------------------------------------------------------------- stages
  loadStage(li, si, opts = {}, { quiet = false } = {}) {
    li = clamp(li, 0, LEVELS.length - 1);
    const level = LEVELS[li];
    si = clamp(si, 0, level.stageCount - 1);
    this.levelIndex = li;
    this.stageIndex = si;
    this.level = level;
    this.gateOverride = false;
    this.events = [];
    if (level.number >= 1) CORE_SKILLS.forEach((k) => learnSkill(k)); // past the tutorial: all basics known
    const s = (this.stage = level.createStage(this, si, opts));
    const styleSpec = (LEVEL_STYLES[s.style || level.style] || {}).boundary;
    this.boundary =
      styleSpec && s.boundary !== false
        ? makeBoundary({ cols: s.cols, rows: s.rows, anchor: s.anchor, spec: { ...styleSpec, ...(s.boundary || {}) }, seed: (li + 1) * 31 + si })
        : null;
    this.renderer.configure({
      boundary: this.boundary,
      cols: s.cols,
      rows: s.rows,
      viewCols: s.viewCols || s.cols,
      viewRows: s.viewRows || s.rows,
      paint: s.paintBackground || null,
      anchor: s.anchor,
      style: s.style || level.style,
      seed: (li + 1) * 31 + si,
    });
    const p = this.player;
    p.x = p.fromX = s.playerStart.x;
    p.y = p.fromY = s.playerStart.y;
    p.moveStart = 0;
    p.facing = 1;
    this.renderer.follow(p.x, p.y, true);
    this.queuedMove = null;
    this.pendingEnter = s.onEnter ? s : null;
    save.last = { level: li, stage: si };
    persist();
    this.renderKeys();
    this.renderTracker();
    this.refreshHud();
    if (!quiet && !s.onEnter) ui.toast(`<b>${level.title}</b> · ${level.stageName(si)}`, 3200);
  }

  nextDestination() {
    if (this.stageIndex + 1 < this.level.stageCount) return { li: this.levelIndex, si: this.stageIndex + 1 };
    if (this.levelIndex + 1 < LEVELS.length) return { li: this.levelIndex + 1, si: 0 };
    return null;
  }

  isGateOpen() {
    return this.gateOverride || (this.stage.gate && this.stage.gate.isOpen());
  }

  /** Queue a game event for the stage (handled when no popup is open). */
  emit(name) {
    this.events.push(name);
  }

  /** Background tick so story events still run if animation frames are paused (e.g. hidden tab). */
  startTicker() {
    setInterval(() => this.pump(), 100);
  }

  /** Teach the player a control: it appears in the HUD and help screen from now on. */
  learn(skill, { announce = true } = {}) {
    if (!learnSkill(skill)) return false;
    this.renderKeys();
    this.renderTracker();
    if (announce) ui.toast(`New control: <b>${SKILL_NAMES[skill]}</b>`, 3000);
    return true;
  }

  // ---------------------------------------------------------------- HUD
  refreshHud() {
    if (!this.stage) return;
    const lv = this.level;
    $('hud-level').textContent = lv.title;
    $('hud-stage').textContent =
      lv.stageCount > 1 ? `Stage ${this.stageIndex + 1}/${lv.stageCount}: ${lv.stageName(this.stageIndex)}` : lv.stageName(this.stageIndex);
    $('hud-method').innerHTML = lv.method ? `Method: <b>${lv.method}</b>` : '';
    $('hud-info').innerHTML = this.stage.hud ? this.stage.hud() : '';
  }

  renderKeys() {
    $('hud-keys').innerHTML = hudKeysHtml(save.skills);
  }

  renderTracker() {
    $('hud-tracker').innerHTML = hasSkill('tracker') ? trackerHtml(save.tracker, this.selectedChip, this.historyOpen) : '';
  }

  /** Value behind a drag source: 'chip' (tray), 'min' / 'max', or 'h<i>' (history list). */
  sourceValue(src) {
    const t = save.tracker;
    if (src === 'chip') return t.found[0] ? t.found[0].value : null;
    if (src === 'min' || src === 'max') return t[src];
    const h = /^h(\d+)$/.test(src) ? t.history[Number(src.slice(1))] : null;
    return h ? h.value : null;
  }

  /**
   * Drag the tray value, a value from the history list, or a MIN / MAX value onto a box —
   * or click it, then click a box. The ▾ button in the tray shows / hides the history list.
   */
  setupTrackerDragDrop() {
    const root = $('hud-tracker');
    const sourceOf = (el) => {
      const item = el.closest && el.closest('[data-src], .slot:not(.empty)');
      if (!item) return null;
      return item.dataset.src || item.dataset.slot;
    };
    root.addEventListener('click', (e) => {
      if (!e.target.closest('.history-toggle')) return;
      e.stopImmediatePropagation();
      this.historyOpen = !this.historyOpen;
      this.renderTracker();
    });
    root.addEventListener('dragstart', (e) => {
      const src = sourceOf(e.target);
      if (!src) return;
      e.dataTransfer.setData('text/plain', src);
      e.dataTransfer.effectAllowed = 'copyMove';
      root.classList.add('dragging');
    });
    root.addEventListener('dragend', () => root.classList.remove('dragging'));
    root.addEventListener('dragover', (e) => {
      const slot = e.target.closest && e.target.closest('.slot');
      if (!slot) return;
      e.preventDefault();
      slot.classList.add('over');
    });
    root.addEventListener('dragleave', (e) => {
      const slot = e.target.closest && e.target.closest('.slot');
      if (slot) slot.classList.remove('over');
    });
    root.addEventListener('drop', (e) => {
      const slot = e.target.closest && e.target.closest('.slot');
      if (!slot) return;
      e.preventDefault();
      root.classList.remove('dragging');
      this.placeValue(e.dataTransfer.getData('text/plain'), slot.dataset.slot);
    });
    root.addEventListener('click', (e) => {
      const slot = e.target.closest('.slot');
      if (this.selectedChip && slot) return this.placeValue(this.selectedChip, slot.dataset.slot);
      const src = sourceOf(e.target);
      if (src) {
        this.selectedChip = this.selectedChip === src ? null : src;
        this.renderTracker();
      }
    });
  }

  /**
   * Move a value into MIN or MAX. src: 'chip' (the tray), 'h<i>' (history) or 'min' / 'max'.
   * Refuses anything that would make MIN bigger than MAX, and never empties a box
   * that had a value (box → full box copies; box → empty box moves).
   */
  placeValue(src, target) {
    const t = save.tracker;
    this.selectedChip = null;
    const value = this.sourceValue(src);
    if (value === null || value === undefined || (target !== 'min' && target !== 'max') || src === target) return this.renderTracker();

    const other = target === 'min' ? 'max' : 'min';
    const moving = (src === 'min' || src === 'max') && t[target] === null; // the source box empties, so nothing to compare against
    const clash = !moving && t[other] !== null && (target === 'min' ? value > t[other] : value < t[other]);
    if (clash) {
      this.renderTracker();
      const v = fmtShort(value), o = fmtShort(t[other]);
      const lines =
        target === 'min'
          ? [
              `<b>${v}</b> is bigger than your MAX (<b>${o}</b>) — and MIN can’t be bigger than MAX!`,
              `If ${v} should be your new MAX, first drag your MAX value (${o}) into MIN, then drop ${v} into MAX.`,
            ]
          : [
              `<b>${v}</b> is smaller than your MIN (<b>${o}</b>) — and MAX can’t be smaller than MIN!`,
              `If ${v} should be your new MIN, first drag your MIN value (${o}) into MAX, then drop ${v} into MIN.`,
            ];
      if (this.busy) ui.toast(lines.join(' '), 5000);
      else this.run(() => ui.dialog({ speaker: 'π tracker', sprite: 'player', lines }));
      return;
    }
    if (src.startsWith('h')) this.historyOpen = false;
    tracker.place(target, value, src);
    ui.toast(`${target.toUpperCase()} is now <b>${fmtShort(value)}</b>`);
    this.emit('tracker-set');
  }

  // ---------------------------------------------------------------- input
  /** Run an async flow (conversation, popup chain) while blocking other input. */
  async run(fn) {
    if (this.busy) return;
    this.busy = true;
    try {
      await fn();
    } catch (err) {
      console.error(err);
      ui.toast('Oops: ' + err.message);
    } finally {
      this.busy = false;
      this.refreshHud();
    }
  }

  tryMove(dx, dy, repeat) {
    if (!this.stage || this.busy || ui.isOpen()) return;
    if (this.stage.canMove && !this.stage.canMove()) return;
    const now = performance.now();
    if (now - this.lastMoveAt < CONFIG.moveCooldownMs) {
      if (!repeat) this.queuedMove = [dx, dy];
      return;
    }
    this.doMove(dx, dy, now);
  }

  inBounds(x, y) {
    const extra = this.stage.anchor === 'vertex' ? 0 : 1;
    return x >= 0 && y >= 0 && x <= this.stage.cols - extra && y <= this.stage.rows - extra;
  }

  isBlocked(x, y) {
    if (this.stage.npcs.some((n) => n.x === x && n.y === y)) return true;
    if (this.boundary && this.boundary.blocked(x, y)) return true;
    return this.stage.blocked ? this.stage.blocked(x, y) : false;
  }

  doMove(dx, dy, now) {
    const p = this.player;
    const nx = p.x + dx, ny = p.y + dy;
    if (dx) p.facing = dx > 0 ? 1 : -1;
    if (!this.inBounds(nx, ny) || this.isBlocked(nx, ny)) return;
    p.fromX = p.x;
    p.fromY = p.y;
    p.x = nx;
    p.y = ny;
    p.moveStart = now;
    this.lastMoveAt = now;
    if (this.stage.onMove) this.stage.onMove({ x: p.fromX, y: p.fromY }, { x: nx, y: ny }, dx, dy);
    const g = this.stage.gate;
    if (g && g.x === nx && g.y === ny) {
      ui.toast(this.isGateOpen() ? 'Warp gate — press <span class="key">Enter</span> to warp' : 'The warp gate is powered down');
    }
    this.refreshHud();
  }

  nearbyNpc() {
    if (!this.stage) return null;
    return this.stage.npcs.find((n) => cheb(n, this.player) <= 1) || null;
  }

  onKey(e) {
    if (this.busy || !this.stage) return;
    switch (e.code) {
      case 'Space':
      case 'Enter':
      case 'NumpadEnter':
        e.preventDefault();
        if (hasSkill('talk')) this.run(() => this.action());
        break;
      case 'KeyH':
        if (hasSkill('help')) this.run(() => this.showHelp());
        break;
      case 'KeyT':
        if (hasSkill('tracker')) this.run(() => this.editTracker());
        break;
      case 'KeyL':
      case 'KeyM':
        if (hasSkill('missions')) this.run(() => this.missionSelect());
        break;
      case 'KeyR':
        if (hasSkill('restart')) this.run(() => (this.stage.onRestart ? this.stage.onRestart() : ui.toast('Nothing to restart here.')));
        break;
      case 'Backquote':
      case 'F9':
        if (CONFIG.debug.enabled) {
          e.preventDefault();
          this.run(() => openDebugMenu(this));
        }
        break;
      default:
        if (this.stage.onKey) this.stage.onKey(e);
    }
  }

  async action() {
    const npc = this.nearbyNpc();
    if (npc) return npc.talk();
    if (this.stage.onAction && (await this.stage.onAction())) return;
    const g = this.stage.gate;
    if (g && cheb(g, this.player) <= 1) return this.useGate();
    ui.toast('Nothing here. Walk next to a character and press <span class="key">Enter</span> to talk.');
  }

  // ---------------------------------------------------------------- screens
  async useGate() {
    const g = this.stage.gate;
    if (!this.isGateOpen()) {
      await ui.dialog({ speaker: 'Warp gate', sprite: 'gate', lines: [g.lockedText || 'The warp gate is powered down.'] });
      return;
    }
    const dest = this.nextDestination();
    const label = dest ? `<b>${LEVELS[dest.li].title}</b> — ${LEVELS[dest.li].stageName(dest.si)}` : '<b>the Mission Log</b> (the edge of the explored universe)';
    const v = await ui.choice({
      title: 'Warp gate',
      sprite: 'gate',
      text: `Warp to ${label}?`,
      options: [
        { label: 'Warp! ✨', value: 'go' },
        { label: 'Stay here a bit longer', value: null },
      ],
      cancelValue: null,
    });
    if (v !== 'go') return;
    if (dest) this.loadStage(dest.li, dest.si);
    else await this.showEnd();
  }

  async showEnd() {
    const v = await ui.panel({
      title: 'Mission log',
      html: endHtml(save.tracker),
      buttons: [
        { label: 'Mission select', value: 'missions', primary: true },
        { label: 'Back to the start', value: 'restart' },
        { label: 'Stay here', value: null },
      ],
    });
    if (v === 'missions') await this.missionSelect();
    else if (v === 'restart') this.loadStage(0, 0);
  }

  async showHelp() {
    await ui.panel({
      title: 'Controls',
      html: helpHtml(this.level, this.stage, save.skills),
      buttons: [{ label: 'Close', value: true, primary: true }],
      closeKeys: ['Escape', 'KeyH'],
    });
    this.emit('help');
  }

  async editTracker() {
    const t = save.tracker;
    const res = await ui.form({
      title: 'π tracker',
      html: trackerEditorHtml(t),
      fields: [
        { id: 'min', label: 'MIN — smallest my value could be', value: t.min ?? '' },
        { id: 'max', label: 'MAX — biggest my value could be', value: t.max ?? '' },
      ],
      buttons: [
        { label: 'Save', value: 'save', primary: true },
        { label: 'Cancel', value: null, cancel: true, skipValidate: true },
      ],
      validate: (v) => {
        if (t.min !== null && v.min.trim() === '') return 'You can’t delete your MIN — type a new number instead.';
        if (t.max !== null && v.max.trim() === '') return 'You can’t delete your MAX — type a new number instead.';
        const a = parseNum(v.min), b = parseNum(v.max);
        if ((v.min.trim() !== '' && a === null) || (v.max.trim() !== '' && b === null)) return 'Please enter numbers.';
        if (a !== null && b !== null && a > b) return 'MIN can’t be bigger than MAX.';
        return null;
      },
    });
    if (!res || res.button !== 'save') return;
    tracker.set(parseNum(res.values.min), parseNum(res.values.max));
    this.emit('tracker-set');
  }

  /**
   * Mission select: levels first. Picking a level with more than one stage opens
   * a second menu of its stages; a single-stage level starts straight away.
   */
  async missionSelect() {
    for (;;) {
      const options = LEVELS.map((lv, li) => {
        const stages = [...Array(lv.stageCount).keys()];
        const unlocked = stages.some((si) => isStageUnlocked(LEVELS, li, si));
        const done = stages.filter((si) => isStageDone(lv.id, si)).length;
        const hint = !unlocked ? '🔒 locked' : done === lv.stageCount ? '✓ complete' : lv.stageCount > 1 ? `${done}/${lv.stageCount} stages ▸` : '';
        return { label: lv.title, hint, value: li, disabled: !unlocked };
      });
      options.push({ label: 'Close', value: null });
      const li = await ui.choice({ title: 'Mission select', text: 'Replay any mission you have unlocked.', options, cancelValue: null });
      if (li === null || li === undefined) return;
      const lv = LEVELS[li];
      if (lv.stageCount === 1) return this.loadStage(li, 0);
      const stageOpts = Array.from({ length: lv.stageCount }, (_, si) => {
        const unlocked = isStageUnlocked(LEVELS, li, si);
        return {
          label: `Stage ${si + 1}: ${lv.stageName(si)}`,
          hint: isStageDone(lv.id, si) ? '✓ complete' : unlocked ? '' : '🔒 locked',
          value: si,
          disabled: !unlocked,
        };
      });
      stageOpts.push({ label: '◂ Back to levels', value: 'back' });
      const si = await ui.choice({ title: lv.title, text: 'Choose a stage to start at.', options: stageOpts, cancelValue: 'back' });
      if (si !== 'back') return this.loadStage(li, si);
    }
  }

  // ---------------------------------------------------------------- loop + drawing
  playerRenderPos(t) {
    const p = this.player;
    const k = clamp((t - p.moveStart) / CONFIG.moveTweenMs, 0, 1);
    const e = k * (2 - k); // ease out
    return { x: p.fromX + (p.x - p.fromX) * e, y: p.fromY + (p.y - p.fromY) * e };
  }

  /** Start a stage's intro / handle queued events / do a queued step, when nothing else is happening. */
  pump(t = performance.now()) {
    if (this.stage && this.stage.tick) this.stage.tick(t); // runs even while a popup is open
    if (this.busy || ui.isOpen() || !this.stage) return;
    if (this.pendingEnter) {
      const s = this.pendingEnter;
      this.pendingEnter = null;
      if (s === this.stage) this.run(() => s.onEnter());
    } else if (this.events.length) {
      const name = this.events.shift();
      if (this.stage.onEvent) this.run(() => this.stage.onEvent(name));
    } else if (this.queuedMove && t - this.lastMoveAt >= CONFIG.moveCooldownMs) {
      const [dx, dy] = this.queuedMove;
      this.queuedMove = null;
      this.doMove(dx, dy, t);
    }
  }

  frame(t) {
    this.pump(t);
    try {
      this.draw(t);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame((tt) => this.frame(tt));
  }

  draw(t) {
    const r = this.renderer, s = this.stage;
    if (!s) return;
    const pp = this.playerRenderPos(t);
    r.follow(pp.x, pp.y);
    r.clear();
    if (this.boundary) this.boundary.drawLive(r, t);
    if (s.drawFloor) s.drawFloor(r, t);

    if (s.gate) {
      const open = this.isGateOpen();
      r.drawSprite('gate', s.gate.x, s.gate.y, 1.4, { rot: open ? t / 700 : 0, alpha: open ? 1 : 0.3 });
      r.text(open ? 'WARP' : 'OFFLINE', r.ax(s.gate.x), r.ay(s.gate.y + 0.95), { size: 0.26, color: r.style.muted });
    }

    for (const n of s.npcs) {
      const bob = Math.sin(t / 450 + n.x) * 0.05;
      r.drawSprite(n.sprite, n.x, n.y + bob, 1.1);
    }

    const pose = s.playerPose ? s.playerPose(t) : {};
    const bob = pose.still ? 0 : Math.sin(t / 300) * 0.04;
    r.drawSprite('player', pp.x, pp.y - 0.05 + bob, 1.1, { flip: this.player.facing < 0, rot: pose.rot || 0 });
    if (s.drawOver) s.drawOver(r, t, pp);

    const near = this.nearbyNpc();
    if (near && hasSkill('talk') && !ui.isOpen()) r.bubble(near.x, near.y - 0.9, 'Enter: talk');
    if (s.drawScreen) s.drawScreen(r, t);
  }
}
