// Level registry. To add a level: create a module like level1-orbits.js
// (copy the shape of an existing one) and add it to this list.
//
// A level module exports:
//   id, number, title, method, style (key into LEVEL_STYLES in assets/theme.js)
//   stageCount, stageName(i)
//   createStage(game, stageIndex, opts) -> stage object (see core/game.js)
//   debugJumps()?      -> [{ label, si, opts }] extra jump targets for the debug menu
//   simulate(si, rng)? -> one simulated player's π value, for demo sessions
import level0 from './level0-wakeup.js';
import level1 from './level1-orbits.js';
import level2 from './level2-forge.js';
import level3 from './level3-asteroids.js';
import level4 from './level4-polygons.js';
import level5 from './level5-basel.js';
import level6 from './level6-lattice.js';
import level7 from './level7-wallis.js';
import level8 from './level8-buffon.js';
import level9 from './level9-coprime.js';
import level10 from './level10-race.js';
import level11 from './level11-clink.js';

export const LEVELS = [level0, level1, level2, level3, level4, level5, level6, level7, level8, level9, level10, level11];
