# π: Lost in Space (game5)

A small browser game where a π-shaped astronaut discovers its own value by
estimating π in different ways. Plain HTML + JavaScript modules — no build step.

## Running

```sh
make run       # start the local server and open http://localhost:8005/
make stop      # stop it
make restart   # stop + start
make status
make run PORT=9000   # use another port
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
| Enter (or Space) | talk · use · pick up · drop | when you first approach a number |
| drag / T | π tracker: drag values into MIN / MAX, or press T to type them | after meeting the numbers |
| L | mission select (replay unlocked missions) | Level 1 |
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

0. **Wake Up** (intro, no maths) — π wakes beside a crashed pod and, by inner
   monologue, learns to move, then H, then Enter to talk. Five numbers introduce
   themselves (7, −3, ½, 0, √2: positive/negative, rational/irrational), π realises
   it doesn't know its own value, makes a first guess (1–10) and drags it into
   MIN or MAX. The map scrolls; glowing force fields mark the reachable area and
   switch off as π learns; a map strip in the sidebar shows which areas are open.
   Captain One waits at the far east end by the warp gate to Level 1.
1. **Orbit Walk** (circumference ÷ diameter) — 3 orbits of growing size. π walks
   along grid lines (up/down/left/right) from a launch pad round the dashed orbit
   and back, then flies the **diameter** between two beacons on the dashed line
   through the planet (it must be straight — a wobbly crossing takes extra steps and
   is rejected). The player enters steps round (C), steps across (d) and π = C ÷ d.
   Traced carefully this always gives **4** — never mentioned in advance. After all
   three orbits, Captain One points out they all came to 4 and leaves "why?" as an
   open question.
2. **The Star Forge** (Leibniz series) — 10 parts, one per term ±4/(2k+1). Carry
   4 wedges (each 1/(2k+1) of a disc) into the Star Forge. Solar crystals add, ice
   comets subtract. Live π value, Leibniz sum and a convergence chart on screen (no
   "true π" line). Afterwards Engineer 4 can show pairs of later partial sums
   (10/11, 100/101, 1000/1001 terms), which hint that your value is trapped between them.

## Debug

- ` or F9 opens the debug menu: jump to any level / stage / Level 0 step / Level 2
  part, run demo sessions (simulated players → range of π per stage), unlock all
  missions, force the warp gate open, view or reset save data.
- URL jumps (level = level number): `index.html?level=0&step=tracker`,
  `index.html?level=1&stage=3`, `index.html?level=2&part=5`.
- Progress, tracker, learned controls and debug settings are saved in the
  browser's localStorage ("Reset save data" in the debug menu starts over).
- Settings: `game.config.js`.

## Project layout

```
game.config.js        game-wide settings (speeds, view width, debug, save key)
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
    fractions.js      reusable fraction-wedge delivery mechanic
    utils.js
  levels/
    index.js          level registry — add new levels here
    level0-wakeup.js
    level1-orbits.js
    level2-forge.js
```

## Adding a level

Create `src/levels/levelN-something.js` exporting
`{ id, number, title, method, style, stageCount, stageName, createStage, debugJumps?, simulate? }`
(see the comment at the top of `src/core/game.js` for the stage object), add a style
to `LEVEL_STYLES` in `assets/theme.js`, and add the module to `src/levels/index.js`.
