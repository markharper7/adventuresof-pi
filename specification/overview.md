# Aim 

I would like to make a simple web based game to teach people about pi and discover its value 
by using multiple methods to further approximate its value.

The rules that apply to every level (requirements, debug menu, dialogue rules) are in `AGENTS.md` at the repository root.

## Initial ideas

 The user uses a character in the shape of pi who wants to find out their identity. Each level shows a different way 
 of finding / approximating the value of pi and therefore its identity. The user controls should be simple - up, down, 
 left and right as well as a button to talk to other number characters who give some advice and some 
 sort of user input to input answers / numbers to then find the approximation. For example, the user could use the 
 pi character to walk the circumference of ever increasing circles. Count their steps. Input this count into a simple 
 calculation to then approximate pi.

## Program options
JavaScript, HTML etc. for flexibility and simplicity

## Terms
Level: A level contains a full playthrough of a particular method to calculate pi (see methods.md)
Stage: A level can contain 1 or more stages within it. More than one stage may not be needed but can be useful for a multi-part level. The debug menu should be able to jump to a particular level and stage.

## Themes
See themes.md

## Levels
There are separate files in the `levels` directory describing requirements for each level:
- levels/level_0.md
- levels/level_1.md
- etc.

Look in the relevant one of these when building the relevant level. Each of these should be a particular method of calculating pi outlined in methods.md.

Each level should share the same style or theme. However, there could be differences if the context allows for it. For example, in the them of Greek temples + forest, the user could be in a temple or out in a forest and these should obviously look different but should also have differences such as how they are bounded. For the space theme, we could portal to different parts of space and so their could be differences such as planets, orbits, meteors in the foreground or stars in the background. But the general style should still feel the same - just a different location in the same universe.

This game wants to start with easiest methods first and also the ones that can be made into engaging games. We won't need to use all the methods. 

## NPC dialogue
Each level will have at least one NPC. I want to be in control of this dialogue as this is the how I can inject my own ways of describing the mathematical concepts and getting the user to think

Dialogue I want included will be added to the file `npc_dialogue.md` and this will be broken down by level. 

Within your game files, I would like this dialogue saved in its own file for all NPC dialogue so that it is easy for a human coder to read and parse to get a full flavour of the game without having to look at code elsewhere or jump between files. It likely makes sense to store dialogue in a single interaction as an array. For example, it may be one section of dialogue which requires the user to press enter multiple times. Let's store this all in an array for a single interaction. A level can have multiple interactions. For example, the first interaction could be explaining the level and a later interaction could be explaining the solution.
