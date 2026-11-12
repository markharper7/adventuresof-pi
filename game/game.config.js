// Game-wide settings. Tweak behaviour here without touching the game code.
export const CONFIG = {
  title: 'π: Lost in Space',
  saveKey: 'pi-lost-in-space-v2', // localStorage key holding progress, tracker, learned controls + debug settings
  moveCooldownMs: 115,            // minimum time between steps while a key is held
  moveTweenMs: 100,               // walk animation time between squares
  maxViewCols: 26,                // wider maps scroll; the camera follows π
  debug: {
    enabled: true,                // debug menu on ` (backtick) or F9 — always available, even before other controls are learned
    demoRuns: 500,                // simulated players per stage for "demo sessions"
  },
};
