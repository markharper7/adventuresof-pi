# Level 8 Aim

Buffon's needle. Estimate pi by dropping rods onto evenly spaced parallel lines and counting how many cross a line. There is no circle in this level, which should be a surprise for the player.

## Level 8 Method

Buffon's needle problem. When the rod length (L) equals the line spacing (t):
pi ≈ 2 * (rods dropped) / (rods crossing a line)

General form: pi ≈ (2 * L * N) / (t * C)

## Level 8 Requirements
1. Parallel laser fences / orbit lanes are drawn across the floor of the area, evenly spaced
2. Pi collects space debris rods from a pile and drops / scatters them onto the lanes. Rods that cross a line light up
3. Like level 3, have piles which allow dropping 1, 10 or 100 rods at a time
4. The landing position AND angle of each rod MUST be random. The animation is just for fun
5. Show counts of dropped and crossing rods in the side menu and allow the user to calculate at any point. The value goes to the tray so it can be moved to min / max
6. The NPC could point out at the end that there was no circle anywhere, yet pi still appeared. Leave it as an open question (hint: the rod's angle)
7. Perhaps reuse the random landing code from level 3
