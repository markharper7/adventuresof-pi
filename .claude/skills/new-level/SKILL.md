---
name: new-level
description: Build a new level of Adventures of Pi from its specification file. Use when asked to create, build or start level N, or to add a new level.
---

# Build a new level

Argument: the level number N.

1. Read the spec, in order:
   - `specification/overview.md` and `specification/themes.md`
   - `specification/levels/level_N.md`
   - the method it uses in `specification/methods.md`
   - the Level N section of `specification/npc_dialogue.md`, if there is one
2. Look at the closest existing level in `game/src/levels/` and the module shape in `game/src/levels/index.js`. Reuse `game/src/core/` and shared level code rather than copying it. If the spec says to share code with another level, pull the common part into a shared module.
3. Create `game/src/levels/levelN-<short-name>.js` and add it to `LEVELS` in `game/src/levels/index.js`.
4. Dialogue goes in `game/npc_dialogue.js`:
   - If `npc_dialogue.md` has a Level N section, copy it word for word. Each bullet is one line (one Enter press). Don't add extra lines.
   - Otherwise write placeholder dialogue with a `// PLACEHOLDER dialogue` comment, like the existing levels.
5. Visuals go in `game/assets/` (theme / level style), not in the level logic.
6. Debug menu: give each stage a jump target (add `debugJumps()` for useful mid-level points) and add `simulate()` so demo sessions show the range of pi values a player could get.
7. The level must start before the player talks to an NPC, let the player retry, and not freeze at the end.
8. Update `game/README.md` if the level adds controls, debug jumps or files worth knowing about.
9. Check it runs: `make restart`, then open `index.html?level=N` and play through each stage. Run the level's demo sessions from the debug menu.
10. Report what was built, any spec requirements left out or interpreted, and any placeholder dialogue added.
