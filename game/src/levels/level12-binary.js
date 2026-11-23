// LEVEL 12 — Counting in Twos: Galperin's colliding blocks again, counted in binary.
//
// Same rock, shield, track and pads as Level 11, but the big asteroids weigh 4 t, 16 t, 64 t, 256 t and 1,024 t
// (4ᵏ). The collisions, written in binary, are π's binary digits with the point taken out:
//     4 t → 110,  16 t → 1100,  64 t → 11001 (11.001 = 3.125) …
// Along the top, four boxes: the live count as an ordinary number → the live count in binary → the same digits
// with the point put in (it drops into place when the run is over) → that value as an ordinary decimal
// (collisions ÷ 2ᵏ, which goes to the tracker).
// The player counts the 4 t run by hand (6, shown as 110). The 64 t run opens the warp gate. Once all five are
// done an optional custom pad opens, like Level 11's: any mass from 1 t to 100,000,000 t. All four boxes fill in,
// with the point after the first two binary digits (50 t → 22 → 10110 → 10.110 = 2.75). Nothing to the tracker.
// Everything shared with Level 11 is in clink-common.js. (Dialogue: npc_dialogue.js → level12.)
//
// To count in another base b (3 … 9), change `base`: the pads hold b^(2k) tonne asteroids and the counter, the
// point and the value all follow. Keep the heaviest pad under 100,000,000 t (b^k ≤ 10,000): for b ≥ 7 that means
// ks: [0, 1, 2, 3, 4], like Level 11. Only the words (dialogue, formula, help, colours) are binary-specific.
import { DIALOGUE } from '../core/talk.js';
import { BINARY_CLINK_STYLE } from '../../assets/theme.js';
import { makeClinkLevel } from './clink-common.js';

export default makeClinkLevel({
  id: 'binary',
  number: 12,
  title: 'Level 12 · Counting in Twos',
  stageTitle: 'Counting in Twos',
  method: 'Colliding blocks in binary',
  style: 'binary',
  colors: BINARY_CLINK_STYLE,
  npc: 'twelve',
  dialogue: DIALOGUE.level12,
  base: 2,
  ks: [1, 2, 3, 4, 5],       // 4 t, 16 t, 64 t, 256 t, 1,024 t
  steps: true,
  formula: 'little rock: 1 t<br>big rock: 4 t, 16 t, 64 t …<br>count every collision, in binary',
  help: `<p>The counter counts in binary. When a run is over the point drops in after the first two digits,
    and the last box shows that number as an ordinary decimal. Once all five are done, an extra pad opens where
    you can build an asteroid of any mass you like; its point goes after the first two digits too.</p>`,
  debugJumps: () => [
    { label: 'Start (before talking to 12)', si: 0 },
    { label: 'Briefed, nothing pushed yet', si: 0, opts: { briefed: true } },
    { label: 'Up to 64 t done (warp gate open)', si: 0, opts: { results: { 0: 6, 1: 12, 2: 25 } } },
    { label: 'All five done (custom pad open)', si: 0, opts: { results: { 0: 6, 1: 12, 2: 25, 3: 50, 4: 100 } } },
  ],
  simulateNote: 'The physics is exact, so the spread only comes from the heaviest asteroid a player pushes (64 t to 1,024 t).',
});
