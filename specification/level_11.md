# Level 11 Aim

Colliding blocks. Count collisions between two asteroids and a wall and the digits of pi appear. Potentially the finale.

## Level 11 Method

Galperin's colliding blocks. A small asteroid sits between a wall (e.g. a space station) and a large asteroid moving towards it. All collisions are perfectly elastic and frictionless.
If the mass ratio is 100^n, the total number of collisions gives the first n+1 digits of pi:
- ratio 1 -> 3 collisions
- ratio 100 -> 31 collisions
- ratio 10,000 -> 314 collisions
- ratio 1,000,000 -> 3141 collisions

## Level 11 Requirements
1. The player chooses the mass ratio of the large asteroid (1, 100, 10,000 ...) perhaps by picking which asteroid to push
2. For small ratios the player counts the 'clinks' themselves. For larger ratios a counter is shown as there are far too many to count
3. Each collision makes a sound / flash
4. The simulation needs to be accurate. Compute collisions analytically (event based) rather than with fixed time steps, otherwise counts will be wrong for large ratios
5. Large ratios will have many collisions in a very short time - consider slowing down time or showing a zoomed in view
6. Don't explain why. Like level 1, leave it as an open question. It is a nice end to the game for pi to see its own digits appear
7. Possible extra / alternative finale: Gauss-Legendre (AGM) algorithm where two NPCs walk towards each other and the number of correct digits doubles each step
