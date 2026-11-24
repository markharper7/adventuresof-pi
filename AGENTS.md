# Adventures of Pi

A web based game (plain JavaScript + HTML) that teaches people about pi. Each level is a different method of approximating pi.

## Specification

The specification lives in `specification/`. Start at `specification/overview.md`, which links to the rest:
- `specification/overview.md` - aim, story, terms (level / stage), how themes vary between levels
- `specification/themes.md` - visual theme
- `specification/methods.md` - methods of estimating pi that levels are based on
- `specification/npc_dialogue.md` - the author's NPC dialogue, by level
- `specification/levels/level_N.md` - requirements for level N

Before changing a level, read its `specification/levels/level_N.md` and the Level N section of `specification/npc_dialogue.md`.

## Code map

- `game/` - the game. `game/README.md` describes it in detail
- `game/src/core/` - shared engine code (rendering, input, dialogue, UI, debug menu, save state)
- `game/src/levels/levelN-*.js` - one module per level, registered in `game/src/levels/index.js`
- `game/npc_dialogue.js` - every line of NPC dialogue, mirroring `specification/npc_dialogue.md`
- `game/assets/` - visuals, kept separate from functionality
- `Makefile` - run / stop / restart the game

## Requirements across all levels
1. The name of the game is 'Adventures of Pi'
2. The game should live in a directory such as 'game'. If creating an entirely new demo, we could create a new directory alongside existing one(s) such as 'game2' and 'game3'. This is particularly useful when brainstorming ideas rather than iterating on a more polished idea
3. There should be a makefile which can be used to run, stop and restart the game
4. The user should be able to press 'h' to bring up the 'help' screen which shows the controls. The 'h' should be visible somehow like a key 
5. Can we code this in a flexible way so new levels can be added easily with minimal code replication. All levels should have a similar style and share as much generic code as possible such as the grid layout, sprites, help controls and popups. The UI visual style of the game should be able to be changed easily across all levels.
6. Can the visuals of square tiles and characters be in some sort of 'assets' directory where we can easily update them in the future. Visuals should be separate to functionality. 
7. The user should be able to retry levels and sections if they want to and only move on when they want to. The game shouldn't freeze when the user reaches the end of existing levels. The number NPCs could encourage the user to try again with a slightly different path / approach if the user goes and talks to them again.
8. Keep track of the minimum and maximum values of pi found so far and this should likely be kept across levels. But the user be able to enter this themselves so they can ignore / override bad answers. 
9. An initial intro screen to set the scene and tell the user the controls as well as 'h' to view controls again
10. Makefile commands and other commands should work for linux and git bash rather than windows powershell
11. The level should start before talking to an NPC. Consider this when the debug menu jumps you to a certain level.
12. Physics animations play at one steady, normal speed and look physically accurate. No slow motion, speed-ups, time warping or zoom insets. If events are too fast to see, the game counts them. Only let the player count by hand when they can actually count at normal speed (e.g. 3 collisions, not 31).

## NPC dialogue rules
1. All NPC dialogue lives in `game/npc_dialogue.js`, one array per interaction, grouped by level.
2. Where dialogue exists in `specification/npc_dialogue.md`, use it as the guide for that level.
3. Do not add extra dialogue in a level if dialogue exists.
4. You can make up placeholder dialogue when creating levels where no NPC dialogue is specified yet. Mark it as a placeholder.

## Debug requirements across all levels
Can we have a separate debug menu with its own shortcut which can be used to jump to a particular part of the game. This may need some sort of settings file or variables which it creates and edits as the game is played.
1. For each level we create, it would be good to have an option to run demo sessions on it to see what range of pi values a user could reasonably generate.
2. Ability to select which level to jump to once we have more than one level
3. When having a level selector menu, nest stages within levels so you don't see them all by default. If you click on a level, then you can choose a stage to start at.
