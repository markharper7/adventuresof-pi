// LEVEL 11 — The Collision Course: Galperin's colliding blocks, counted in ordinary (base 10) numbers.
//
// The big asteroids weigh 1 t, 100 t, 10,000 t, 1,000,000 t and 100,000,000 t (100ⁿ), so the collisions are
// the first n + 1 digits of π: 3, 31, 314, 3141, 31415. Each run adds collisions ÷ 10ⁿ to the tracker, and
// the 10,000 t run opens the warp gate. Once all five are done an optional custom pad opens where the player
// types any mass from 1 t to 100,000,000 t (just the count, nothing to the tracker).
// Level 12 is the same setup counted in binary. Everything shared (physics, playback, drawing, pads) is in
// clink-common.js. (Dialogue: npc_dialogue.js → level11.)
import { DIALOGUE } from '../core/talk.js';
import { CLINK_STYLE } from '../../assets/theme.js';
import { makeClinkLevel } from './clink-common.js';

export default makeClinkLevel({
  id: 'clink',
  number: 11,
  title: 'Level 11 · The Collision Course',
  stageTitle: 'Collision Course',
  method: 'Colliding blocks: count the collisions',
  style: 'clink',
  colors: CLINK_STYLE,
  npc: 'eleven',
  dialogue: DIALOGUE.level11,
  base: 10,
  ks: [0, 1, 2, 3, 4],       // 1 t, 100 t, 10,000 t, 1,000,000 t, 100,000,000 t
  steps: false,
  formula: 'little rock: 1 t<br>big rock: 1 t, 100 t, 10,000 t …<br>count every collision',
  help: `<p>Once all five are done, an extra pad opens where you can build an asteroid of any mass you like.</p>`,
  debugJumps: () => [
    { label: 'Start (before talking to 11)', si: 0 },
    { label: 'Briefed, nothing pushed yet', si: 0, opts: { briefed: true } },
    { label: '1 t and 100 t already counted', si: 0, opts: { results: { 0: 3, 1: 31 } } },
    { label: 'Up to 10,000 t done (warp gate open)', si: 0, opts: { results: { 0: 3, 1: 31, 2: 314 } } },
    { label: 'All five done (custom pad open)', si: 0, opts: { results: { 0: 3, 1: 31, 2: 314, 3: 3141, 4: 31415 } } },
  ],
  simulateNote: 'The physics is exact, so the spread only comes from the heaviest asteroid a player pushes (10,000 t to 100,000,000 t).',
});
