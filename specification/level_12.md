# Level 12 Aim

Colliding blocks in binary. Same rocks, same shield, same counting as level 11, but the big asteroids are 4, 16, 64 … tonnes, so the collisions count out the digits of pi in binary (11.001001…). Moved out of level 11, where it was an optional pad.

## Level 12 Method

Galperin's colliding blocks again (see level_11.md and methods.md 19). If the big asteroid weighs M tonnes (the little rock is 1 tonne), the number of collisions is π × √M rounded down.
- Level 11 uses M = 100^n, so √M = 10^n and the count is pi's decimal digits with the point taken out (31, 314, 3141 …)
- Level 12 uses M = 4^k, so √M = 2^k and the count is pi's binary digits with the point taken out. Multiplying by 2 shifts a binary number one place, just as multiplying by 10 shifts a decimal one

Pi in binary is 11.0010010000111111011… Putting the point back after the first two binary digits (pi is between 2 and 4, so it always starts `11.`) gives pi in binary. Dividing the count by 2^k gives the same value in decimal:

| Mass | Collisions | In binary | Point put in | Value |
|---|---|---|---|---|
| 4 t | 6 | 110 | 11.0 | 3 |
| 16 t | 12 | 1100 | 11.00 | 3 |
| 64 t | 25 | 11001 | 11.001 | 3.125 |
| 256 t | 50 | 110010 | 11.0010 | 3.125 |
| 1,024 t | 100 | 1100100 | 11.00100 | 3.125 |
| 4,096 t | 201 | 11001001 | 11.001001 | 3.140625 |
| 67,108,864 t (4^13) | 25735 | 110010010000111 | 11.0010010000111 | 3.1414795… |

Each step is 4 times heavier and adds one binary digit. One decimal digit is worth about 3.3 binary digits, so pi creeps up more slowly than in level 11.

## Level 12 Requirements
1. Same setup as level 11: the 1 tonne little rock, the energy shield, the track, pads of asteroids the player carries to the START mark. Same exact (event based) physics and the same one steady playback speed (see level_11.md requirements 4 and 5). Share the code with level 11 rather than copying it
2. Five pads of fixed mass that unlock in order: 4 t, 16 t, 64 t, 256 t and 1,024 t. Once all five are done, a sixth pad at the bottom opens with a custom mass, as in level 11 (any mass from 1 t to 100,000,000 t, nothing to the tracker). All four boxes fill in for it too, with the point after the first two binary digits as for the fixed masses (50 t → 22 → 10110 → 10.110 = 2.75)
3. Along the top, four boxes in a row with arrows between them, so the player can follow the steps:
   - **Collisions**: the live collision counter as an ordinary (base 10) number
   - **In binary**: the same live count, in binary (1, 10, 11, 100 …)
   - **Put the point in**: the same digits with the binary point after the first two (11001 → 11.001)
   - **Value**: that binary number as an ordinary decimal (3.125)

   The third and fourth boxes fill in once the run has finished, perhaps with the point visibly dropping into place
4. Long binary counts (up to 15 digits) must still fit in their boxes
5. For the first asteroid (4 t, 6 collisions) the player counts the collisions by hand, like 1 t in level 11, and then sees their count written in binary (6 → 110). After that the counter counts for them
6. Each run adds the value (collisions ÷ 2^k) to the tracker
7. The warp gate opens after the 64 t run (11.001 = 3.125, the first value that isn't just 3). Perhaps
8. Don't explain why, as in level 11. The NPC can explain binary itself (only 0s and 1s, each place worth twice the one to its right) since the player may not know it, but not why the collisions give pi
9. A new NPC (12?) to run the level. Placeholder dialogue until npc_dialogue.md has some
10. Level 12 becomes the finale, or an encore after level 11's finale. Level 11's closing dialogue may need adjusting
11. Debug jumps: before talking to the NPC, briefed with nothing pushed, and the warp gate open
