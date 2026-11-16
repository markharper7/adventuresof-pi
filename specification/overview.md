# Aim 

I would like to make a simple web based game to teach people about pi and discover its value 
by using multiple methods to further approximate its value.

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
There are separate files describing requirements for each level such as:
- level_1.md
- level_2.md
- etc.

Look in the relevant one of these when building the relevant level. Each of these should be a particular method of calculating pi outlined in methods.md.

Each level should share the same style or theme. However, there could be differences if the context allows for it. For example, in the them of Greek temples + forest, the user could be in a temple or out in a forest and these should obviously look different but should also have differences such as how they are bounded. For the space theme, we could portal to different parts of space and so their could be differences such as planets, orbits, meteors in the foreground or stars in the background. But the general style should still feel the same - just a different location in the same universe.

The level should start before talking to an NPC. Consider this when the debug menu jumps you to a certain level.

This game wants to start with easiest methods first and also the ones that can be made into engaging games. We won't need to use all the methods. 

All levels should have a similar style and share as much generic code as possible such as the grid layout, sprites, 
help controls and popups. The UI visual style of the game should be able to be changed easily across all levels.

When having a level selector menu, let's nest stages within levels so you don't see them all by default. If you click on a level, then you can choose a stage to start at.

## NPC dialogue
Each level will have at least one NPC. I want to be in control of this dialogue as this is the how I can inject my own ways of describing the mathematical concepts and getting the user to think

Dialogue I want included will be added to the file `npc_dialogue.md` and this will be broken down by level. 

Within your game files, I would like this dialogue saved in its own file for all NPC dialogue so that it is easy for a human coder to read and parse to get a full flavour of the game without having to look at code elsewhere or jump between files. It likely makes sense to store dialogue in a single interaction as an array. For example, it may be one section of dialogue which requires the user to press enter multiple times. Let's store this all in an array for a single interaction. A level can have multiple interactions. For example, the first interaction could be explaining the level and a later interaction could be explaining the solution.

Where dialogue exists in the `npc_dialogue.md` FILE, use this as a guide for level creation.

Do not add extra dialogue in a level if dialogue exists.

You can make up dialogue as placeholders when creating levels where there is no NPC dialogue yet specified. 

## Requirements across all levels
1. The name of the game is 'Adventures of Pi'
2. The game should live in a directory such as 'game'. If creating an entirely new demo, we could create a new directory alongside existing one(s) such as 'game2' and 'game3'. This is particularly useful when brainstorming ideas rather than iterating on a more polished idea
3. There should be a makefile which can be used to run, stop and restart the game
4. The user should be able to press 'h' to bring up the 'help' screen which shows the controls. The 'h' should be visible somehow like a key 
5. Can we code this in a flexible way so new levels can be added easily with minimal code replication 
6. Can the visuals of square tiles and characters be in some sort of 'assets' directory where we can easily update them in the future. Visuals should be separate to functionality. 
7. The user should be able to retry levels and sections if they want to and only move on when they want to. The game shouldn't freeze when the user reaches the end of existing levels. The number NPCs could encourage the user to try again with a slightly different path / approach if the user goes and talks to them again.
8. Keep track of the minimum and maximum values of pi found so far and this should likely be kept across levels. But the user be able to enter this themselves so they can ignore / override bad answers. 
9. An initial intro screen to set the scene and tell the user the controls as well as 'h' to view controls again
10. Makefile commands and other commands should work for linux and git bash rather than windows powershell

## Debug Requirements across all levels
Can we have a separate debug menu with its own shortcut which can be used to jump to a particular part of the game. This may need some sort of settings file or variables which it creates and edits as the game is played.
1. For each level we create, it would be good to have an option to run demo sessions on it to see what range of pi values a user could reasonably generate.
2. Ability to select which level to jump to once we have more than one level

