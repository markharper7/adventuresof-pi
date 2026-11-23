# Level 11 Aim

Colliding blocks. Count collisions between two asteroids and a wall and the digits of pi appear. Potentially the finale.

## Level 11 Method

Galperin's colliding blocks. A small asteroid sits between a wall (an energy shield, which anything bounces off perfectly) and a large asteroid moving towards it. All collisions are perfectly elastic and frictionless.
If the mass ratio is 100^n, the total number of collisions gives the first n+1 digits of pi:
- ratio 1 -> 3 collisions
- ratio 100 -> 31 collisions
- ratio 10,000 -> 314 collisions
- ratio 1,000,000 -> 3141 collisions

## Level 11 Requirements
1. The player chooses the mass ratio of the large asteroid (1, 100, 10,000 ...) perhaps by picking which asteroid to push
2. For the smallest ratio (1 → 3 collisions) the player counts the collisions themselves. For every larger ratio (100 → 31 onwards) the game counts them with a counter, as they come too fast to count
3. Each collision makes a sound / flash
4. The simulation needs to be accurate. Compute collisions analytically (event based) rather than with fixed time steps, otherwise counts will be wrong for large ratios
5. Large ratios will have many collisions in a very short time. Play every run back at one steady speed that never changes during a run, so the motion always looks physically accurate (no slow motion that speeds up again, no zoomed in view). It's fine that the heavy rocks seem to bounce straight off while the counter leaps
6. Don't explain why. Like level 1, leave it as an open question. It is a nice end to the game for pi to see its own digits appear
7. Possible extra / alternative finale: Gauss-Legendre (AGM) algorithm where two NPCs walk towards each other and the number of correct digits doubles each step
8. Optional extra, unlocked once all five asteroids (1 t to 100,000,000 t) are done, not needed for the warp gate: a custom pad where the player chooses any mass from 1 t up to 100,000,000 t (the count usually isn't pi's digits). The binary version (masses of 4, 16, 64 ...) has moved to its own level, see level_12.md
