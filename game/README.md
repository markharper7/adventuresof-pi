# π: Lost in Space (game5)

A small browser game where a π-shaped astronaut discovers its own value by
estimating π in different ways. Plain HTML + JavaScript modules — no build step.

## Running

Run these from the repository root (the `Makefile` lives one level above `game/`):

```sh
make run       # start the local server and open http://localhost:8005/
make stop      # stop it
make restart   # stop + start
make status
make run PORT=9000   # use another port
make run GAME=game2  # serve a different game directory
```

Needs Python 3 (only for the tiny static file server in `scripts/server.py`).
Works in Linux shells and Git Bash.

## Controls

Controls are **learned during Level 0**; the HUD and the help screen only show the
ones you know. Anyone starting at Level 1 or later gets all of them.

| Key | Action | Learned |
| --- | --- | --- |
| Arrows / WASD | move one square (up/down/left/right only — no diagonals) | on waking up |
| H | help | after trying all four moves |
| Enter (or Space) | talk · use · pick up · drop | when 3 calls out to you |
| drag / T | π tracker: drag values into MIN / MAX, or press T to type them | Level 1 |
| L | mission select: pick a level, then (if it has several) a stage | Level 1 |
| R | restart / abort current attempt | Level 1 |
| ` or F9 | debug menu | always |

## The π tracker

The top bar holds **MIN** and **MAX** boxes and a tray between them.

- The tray shows only the **latest** worked-out value (glowing). The player drags it
  into MIN or MAX (or clicks it, then clicks a box). They decide, so bad answers can
  be ignored.
- The **▾** button in the tray opens a hidden dropdown listing every value worked out
  so far (newest first). Any of them can be dragged into MIN or MAX.
- MIN can never be bigger than MAX. A drop that breaks this is refused, and π explains
  what to do instead: move MAX into MIN first, then drop the new value into MAX (or
  the reverse for MAX).
- Once a box has a value it can be replaced but never emptied.
  - Dragging MIN↔MAX onto a **full** box copies the value.
  - Dragging onto an **empty** box moves it.
- `T` lets the player type MIN and MAX directly. The same rules apply, so a box that
  has a value can't be left blank.

The real value of π is never shown to the player, only values they work out. The
debug menu's demo statistics are the only exception.

## Levels

0. **Wake Up** (intro, no maths) — π wakes beside a crashed pod with no memory,
   learns to move, then H. **13** calls out and teaches Enter, then asks π who they
   are, and π can't answer. The other numbers (2.14, √2, −4, 0, e) are hidden around the
   map, met in any order. Talking to 13 plus at least 3 of the others (`NEEDED` in the level
   file) is followed, a moment later, by part of the last nebula wall exploding to open the way
   to the warp gate (the first wall does the same soon after the help screen is opened). The
   layout is an ASCII map at the top of `src/levels/level0-wakeup.js`. It is bigger than the
   screen in both directions (the camera scrolls), with winding passages and a few dead ends.
1. **Orbit Walk** (circumference ÷ diameter) — **1** explains the method. 3 orbits of
   growing size. π walks along grid lines (up/down/left/right) from a launch pad round
   the dashed orbit and back, then flies the **diameter** between two beacons (it must
   be straight). The player enters C, d and π = C ÷ d. Traced carefully this always
   gives **4**, which is never mentioned in advance. After each orbit, 1 compares the answers
   so far (same / different), and after the third leaves "why?" as an open question.
   The tracker (MIN / MAX) appears from this level on.
2. **The Star Forge** (Leibniz series) — **2** explains the series. One part per term
   ±4/(2k+1): carry 4 wedges (each 1/(2k+1) of a disc) into the Star Forge. Fire
   crystals add, ice crystals subtract. Live π value, Leibniz sum and a convergence
   chart (no "true π" line). The warp gate opens after **6 terms** (2 then congratulates
   you automatically). You can carry on up to **20 terms**, after which 2 is out of crystals.
3. **The Asteroid Belt** (random sampling) — **3** explains the method. A square force
   field with a circle inside it sits in the middle; the map is ringed by an asteroid belt.
   Three marked safe spots give ×1, ×10 or ×100 rocks (Enter to pick up). Enter next to the
   force field throws everything carried. Each rock's final resting place is a uniformly random
   point taken from a pre-generated stream (the flight/bounce is just for show). **C** calculates
   π ≈ 4 × in circle ÷ in square at any time and adds it to the tracker. A calculation with
   ≥ **100** asteroids opens the warp gate. R clears the force field.
4. **The Polygon Projector** (Archimedes) — **4** gives a step-by-step demonstration
   (dialogue docked at the bottom so the drawing stays visible): circle → hexagon inside →
   triangles → right-angled half-triangle → formula → polygon outside. At the projector the
   player picks n (3–100), works out the angle 180° ÷ n, then n × sin(angle) (inside) and
   optionally n × tan(angle) (outside); sin/tan values are given. A zoomed inset shows one side
   against the arc. Trying a polygon with ≥ **10** sides opens the warp gate. R replays the demo.
5. **The Asteroid Quarry** (Basel problem) — **5** explains 1 + 1/4 + 1/9 + … = π²/6, so
   π = √(6 × sum). Everything is to scale (rock area ∝ mass). Take the next chunk (1, 1/4,
   1/9 … megatonnes, **10** in all, always all on show) from the stockpile at the bottom, carry it to the gun
   and press Enter next to it to get in and load it. In the gun ↑/↓ aim, Enter fires, Esc gets out
   (Esc leaves every turret / telescope). The first rock is fired into orbit round a
   planet, skimming the orbit (too steep crashes, too wide misses); later chunks must hit it.
   A miss is lost: fetch another of the same chunk. Then the **duplicator** laser (×6: six
   copies crash back into one rock) and the **square-root** laser (debris flies off, one rock
   drifts down), in that order. Carry the rock to the scale at the top: its weight is the
   estimate (10 terms ≈ 3.05), added to the tracker. The total mass is never shown until then.
   Weighing a rock built from all 10 terms opens the warp gate. R clears everything.
6. **The Beacon Survey** (Gauss circle problem) — **6** gives a docked demonstration: a 4 × 4
   square with a beacon on every tile centre (16 = the area), then beacons 2 apart (4) and ½ apart
   (64), so counting only gives the area when the beacons are exactly 1 apart. Then the circle rule:
   a tile counts if its centre is inside the orbit or exactly on it, and π ≈ beacons ÷ r².
   Three orbits (radius 1, 2, 3), each centred on a tile with a dotted survey zone round it, unlock in
   order. Enter on a tile in a zone drops / picks up a beacon. Orbit 1 colours beacons live (green
   counts, red doesn't); orbits 2 and 3 stay unchecked until the player types their count at the survey
   console underneath. Then they're checked (green / red, hollow rings for missed centres) and the true
   count (5, 13, 29) goes into π ≈ count ÷ r², which the player works out (5, 3.25, 3.22). All three
   open the warp gate and the **telescope**: ↑/↓ radius ±1, ←/→ ±5 (1 to 50), a radar sweep fills
   the lattice, Enter notes count ÷ r² down to the tracker, Esc leaves. R next to an orbit clears its
   beacons; elsewhere it replays the demonstration.
7. **The Fraction Yard** (Wallis product) — **7** explains π ÷ 2 = 2/1 × 2/3 × 4/3 × 4/5 × … (docked,
   so the series is visible). The first **10** fractions are shown along the top of the screen and
   light up as they are done. A fraction asteroid (a top rock and a bottom rock joined by the fraction
   bar, each labelled with its number, starting at 1 / 1) patrols left and right. A rock's volume is
   its number, so it grows with each hit; when the rocks get too big the view zooms out ×10 (shown by the bar). Take a number (1–11)
   from the ammo rack and press Enter next to the turret to get in and load it (it stays loaded until
   swapped). In the turret ↑/↓ target the top or bottom rock, ←/→ slide it along its rail, Enter fires
   straight up (lead the moving target), Esc gets out. A hit multiplies that rock and fills a
   matching empty slot, in any order; an unneeded number bounces off with a hint. The **scanner** works
   whenever top and bottom have the same count of numbers: it shows top ÷ bottom ≈ π/2 and the player
   doubles it (added to the tracker). In order the estimates hop above and below π (9 fractions 3.30,
   10 fractions 3.00). A scan with all 10 opens the warp gate. R clears the fraction to 1 / 1.

8. **The Laser Lanes** (Buffon's needle) — **8** explains the method. Horizontal laser lanes cross a
   field in the middle, all 2 squares apart. Crates along the bottom hold debris rods exactly as long as
   the gap (×1, ×10 or ×100, Enter next to a crate). Enter next to the field scatters everything carried.
   Each rod's resting place (centre uniform over the field) and angle (uniform over 0–180°) are random;
   the tumbling flight is just for show. Rods across a lane light up. **C** calculates
   π ≈ 2 × dropped ÷ crossing at any time and adds it to the tracker. A calculation with ≥ **100** rods
   opens the warp gate, and 8 then points out there is no circle anywhere (open question: the rods'
   angles). R clears the field.

## Debug

- ` or F9 opens the debug menu: jump to any level / stage / Level 0 step / Level 2
  part, run demo sessions (simulated players → range of π per stage), unlock all
  missions, force the warp gate open, view or reset save data.
- URL jumps (level = level number): `index.html?level=0&step=meet`,
  `index.html?level=1&stage=3`, `index.html?level=2&part=5`, `index.html?level=3`.
  Levels 3–8 have extra debug-menu jumps (e.g. 1000 asteroids already thrown, 12 sides tried,
  Level 6 orbits already surveyed, Level 7 fractions already fired).
- Progress, tracker, learned controls and debug settings are saved in the
  browser's localStorage ("Reset save data" in the debug menu starts over).
- Settings: `game.config.js`.

## Dialogue

Every line a character speaks is in **`npc_dialogue.js`**, one array per interaction,
grouped by level. It mirrors `../specification/npc_dialogue.md`, which is the source of truth. `{name}`
placeholders (e.g. `{value}`) are filled in by the game. Tutorial hints, toasts and
sidebar text are not dialogue, so they live in the level files.

## Project layout

```
game.config.js        game-wide settings (speeds, view width, debug, save key)
npc_dialogue.js       ALL character dialogue, by level and interaction
index.html
assets/
  theme.css           UI look (HUD, tracker, popups) — CSS variables at the top
  theme.js            canvas look: sprite paths, per-level colours, piece/forge colours
  sprites/*.svg       π, number characters, planets, pad, gate
src/
  main.js
  core/               shared by every level
    game.js           game shell: stages, movement, NPC talk, gates, HUD, learned controls,
                      tracker drag-and-drop, screens, event queue
    renderer.js       canvas, grid, starfield, scrolling camera, sprites
    input.js          keyboard
    ui.js             popups: dialog, choice, panel, form, toast
    state.js          save data, π tracker, learned controls, progress
    screens.js        intro / help / HUD / tracker / end-screen HTML
    debug.js          debug menu + demo sessions
    talk.js           plays interactions from npc_dialogue.js
    fractions.js      reusable fraction-wedge delivery mechanic
    rock.js           lumpy asteroid drawing (Levels 5 and 7)
    boundary.js       shaped, themed map edge (rounded corners; nebula / ring / asteroids)
    utils.js
  levels/
    index.js          level registry — add new levels here
    level0-wakeup.js
    level1-orbits.js
    level2-forge.js
    level3-asteroids.js
    level4-polygons.js
    level5-basel.js
    level6-lattice.js
    level7-wallis.js
    level8-buffon.js
```

## Map boundaries

Every map has a shaped edge rather than a plain rectangle (`src/core/boundary.js`): the
walkable area is a rounded rectangle, the cut-off corners are blocked, and the edge is
decorated per level. The look is set in `assets/theme.js` → `LEVEL_STYLES[...].boundary`
(`kind`: `nebula`, `ring` or `asteroids`, plus colours, glow and corner radius). A stage can
tweak it with `boundary: { thickness, radius, clear }` or switch it off with `boundary: false`
(Level 3 uses `thickness: 1` so the asteroid belt is a full square thick).

## Adding a level

Create `src/levels/levelN-something.js` exporting
`{ id, number, title, method, style, stageCount, stageName, createStage, debugJumps?, simulate? }`
(see the comment at the top of `src/core/game.js` for the stage object), add a style
to `LEVEL_STYLES` in `assets/theme.js`, and add the module to `src/levels/index.js`.
