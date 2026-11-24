// LEVEL 12 — Counting in Twos: Galperin's colliding blocks again, counted in binary (then in any base, 2 to 10).
//
// Same rock, shield, track and pads as Level 11, but the big asteroids weigh 4 t, 16 t, 64 t, 256 t and 1,024 t
// (4ᵏ). The collisions, written in binary, are π's binary digits with the point taken out:
//     4 t → 110,  16 t → 1100,  64 t → 11001 (11.001 = 3.125) …
// Along the top, four boxes: the live count as an ordinary number → the live count in binary → the same digits
// with the point put in (it drops into place when the run is over) → that value as an ordinary decimal
// (collisions ÷ 2ᵏ, which goes to the tracker).
// The player counts the 4 t run by hand (6, shown as 110). The 64 t run opens the warp gate.
//
// When the gate opens, the BASE DIAL switches on: the player can count in any base b from 2 to 10. The pads then
// hold b², b⁴, b⁶, b⁸, b¹⁰ tonne asteroids, or 1 t, b², b⁴, b⁶, b⁸ from base 7 up (b¹⁰ would be over
// 100,000,000 t). The point goes k places from the right for a b^(2k) tonne asteroid, so the boxes, the tracker
// and the pads all follow the base. Each base keeps its own runs; its pads unlock in order again.
// Once all five are done (in any base) an optional custom pad opens, like Level 11's: any mass from 1 t to
// 100,000,000 t. All four boxes fill in, with the point where π's point is in that base (after two digits in
// binary: 50 t → 22 → 10110 → 10.110 = 2.75). Nothing to the tracker.
// Everything shared with Level 11 is in clink-common.js. (Dialogue: npc_dialogue.js → level12.)
import { DIALOGUE } from '../core/talk.js';
import { BINARY_CLINK_STYLE } from '../../assets/theme.js';
import { makeClinkLevel } from './clink-common.js';
import { key } from '../core/utils.js';

const baseName = (b) => (b === 2 ? 'binary' : `base ${b}`);

export default makeClinkLevel({
  id: 'binary',
  number: 12,
  title: 'Level 12 · Counting in Twos',
  stageTitle: 'Counting in Twos',
  method: 'Colliding blocks in binary (and any base)',
  style: 'binary',
  colors: BINARY_CLINK_STYLE,
  npc: 'twelve',
  dialogue: DIALOGUE.level12,
  base: 2,
  // base 2: 4 t, 16 t, 64 t, 256 t, 1,024 t. Keep the heaviest under 100,000,000 t (b^k ≤ 10,000).
  ks: (b) => (b ** 10 <= 100_000_000 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4]),
  dial: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  steps: true,
  formula: (b, rocks) =>
    `little rock: 1 t<br>big rock: ${rocks.slice(0, 3).map((r) => r.label).join(', ')} …<br>count every collision, in ${baseName(b)}`,
  help: `<p>The counter counts in binary. When a run is over the point drops into place, and the last box shows that
    number as an ordinary decimal. When the warp gate opens, the <b>base dial</b> switches on: walk up to it and press
    ${key('Enter')} to count in any base from 2 to 10. Each base has its own asteroids.
    Once all five asteroids are done, an extra pad opens where you can build an asteroid of any mass you like.</p>`,
  debugJumps: () => [
    { label: 'Start (before talking to 12)', si: 0 },
    { label: 'Briefed, nothing pushed yet', si: 0, opts: { briefed: true } },
    { label: 'Up to 64 t done (warp gate open, base dial on)', si: 0, opts: { results: { 0: 6, 1: 12, 2: 25 } } },
    { label: 'All five done (custom pad open)', si: 0, opts: { results: { 0: 6, 1: 12, 2: 25, 3: 50, 4: 100 } } },
    { label: 'Base dial on, counting in base 3', si: 0, opts: { results: { 0: 6, 1: 12, 2: 25 }, base: 3 } },
    { label: 'Base dial on, counting in base 8', si: 0, opts: { results: { 0: 6, 1: 12, 2: 25 }, base: 8 } },
  ],
  simulateNote: 'The physics is exact, so the spread only comes from the heaviest asteroid a player pushes (64 t to 1,024 t, in binary).',
});
