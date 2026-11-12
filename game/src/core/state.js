// Persistent game state (saved in the browser's localStorage):
//   - the π tracker: MIN / MAX slots set by the player, plus a tray of values they've worked out
//   - controls the player has learned (Level 0 teaches them one by one)
//   - completed stages, per-level results and one-off story flags
//   - debug settings (e.g. "unlock all") and where the player was last
import { CONFIG } from '../../game.config.js';

const DEFAULT = () => ({
  // found: the tray — just the latest worked-out value [{ value, source, isNew }]
  // history: every value worked out, newest first [{ value, source }] (the tray's ▾ dropdown)
  tracker: { min: null, max: null, found: [], history: [] },
  skills: {},        // { move: true, help: true, talk: true, tracker: true, missions: true, restart: true }
  progress: {},      // { levelId: [completed stage indexes] }
  levelData: {},     // free space for levels, e.g. { orbits: { 0: 4, 1: 4.1 } }
  flags: {},         // one-off story moments already seen
  settings: { unlockAll: false },
  last: null,        // { level, stage }
});

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (raw) {
      const data = JSON.parse(raw);
      const base = DEFAULT();
      const tracker = { ...base.tracker, ...data.tracker };
      const oldFound = tracker.found || []; // older saves kept several in the tray
      tracker.found = oldFound.slice(0, 1);
      if (!Array.isArray(tracker.history)) tracker.history = oldFound.map(({ value, source }) => ({ value, source }));
      return { ...base, ...data, tracker, settings: { ...base.settings, ...data.settings } };
    }
  } catch (e) {
    console.warn('Could not load save data', e);
  }
  return DEFAULT();
}

export const save = load();

export function persist() {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(save));
  } catch (e) {
    /* storage may be unavailable (private mode) — the game still works */
  }
}

export function resetSave() {
  const fresh = DEFAULT();
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, fresh);
  persist();
  emit();
}

// ---- skills (controls the player has learned) ----
export const hasSkill = (k) => !!save.skills[k];
/** Returns true if the skill was newly learned. */
export function learnSkill(k) {
  if (save.skills[k]) return false;
  save.skills[k] = true;
  persist();
  return true;
}

// ---- progress ----
export function markStageDone(levelId, stageIndex) {
  const arr = (save.progress[levelId] ||= []);
  if (!arr.includes(stageIndex)) arr.push(stageIndex);
  persist();
}

export function isStageDone(levelId, stageIndex) {
  return (save.progress[levelId] || []).includes(stageIndex);
}

/** A stage is unlocked if the previous stage (or the previous level's last stage) is done. */
export function isStageUnlocked(levels, li, si) {
  if (save.settings.unlockAll) return true;
  if (si > 0) return isStageDone(levels[li].id, si - 1);
  if (li === 0) return true;
  const prev = levels[li - 1];
  return isStageDone(prev.id, prev.stageCount - 1);
}

// ---- π tracker ----
const listeners = [];
function emit() {
  listeners.forEach((fn) => fn(save.tracker));
}

// Rules (enforced by the game when the player drags):
//  - the tray only holds the latest worked-out value; placing it empties the tray
//  - MIN can never be bigger than MAX
//  - once a box holds a value it can be replaced or copied over, but never emptied
//    (moving a value into an EMPTY box moves it; onto a full box copies it)
export const tracker = {
  onChange(fn) {
    listeners.push(fn);
  },
  /** A newly worked-out value replaces whatever was in the tray. */
  addFound(value, source) {
    save.tracker.found = [{ value, source, isNew: true }];
    save.tracker.history = [{ value, source }, ...(save.tracker.history || [])].slice(0, 50);
    persist();
    emit();
  },
  /** Put a value into 'min' or 'max'. from: 'chip' (the tray), 'h<i>' (history) or the other box's name. */
  place(slot, value, from) {
    const t = save.tracker;
    const moving = (from === 'min' || from === 'max') && t[slot] === null; // box → empty box: move rather than copy
    t[slot] = value;
    if (from === 'chip') t.found = [];
    else if (moving) t[from] = null;
    persist();
    emit();
  },
  /** Typed in with T (the caller checks nothing is being emptied). */
  set(min, max) {
    save.tracker.min = min;
    save.tracker.max = max;
    persist();
    emit();
  },
};
