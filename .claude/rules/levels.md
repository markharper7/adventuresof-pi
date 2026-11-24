---
paths:
  - "game/src/levels/**"
---

# Level files

Each `game/src/levels/levelN-*.js` is specified by `specification/levels/level_N.md`, and its dialogue by the Level N section of `specification/npc_dialogue.md` (mirrored in `game/npc_dialogue.js`).

Read both before changing a level. If a change goes against the spec, say so instead of quietly changing behaviour.

Shared code (for example `clink-common.js`, `game/src/core/`) is used by several levels: check the other users before changing it.
