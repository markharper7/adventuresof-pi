# Level 0 Aim

Level 0 is the introduction to the game. It is not yet introducing any maths. Instead it is introducing the character, the basic controls and setting the scene

## Level 0 requirements
1. The user is introduced to their 'pi' character in some way. Waking up and not knowing who they are. 

See the NPC dialogue file as a lot of this will be driven by NPC dialogue. 

Also let's spread the NPCs out a bit. The first one should be basically impossible to miss. Whereas the others could require the user to search for them a bit. As long as 3 out of the 5 NPCs are spoken to, level 1 is unlocked. But a user may enjoy searching for the others.

The search should not be anything too crazy. Just out of sight of screen in a few directions. The edges of the map should not take very long to reach so it should be easy to find all NPCs if you want to. e.g. under a minute or 2 of just walking around the screen.

## Ideas - feel free to discuss as part of the plan phase
- The initial UI could be the pi character waking up in some visually obvious way and realising they don't know who they are or what their value is. (Knowing your value is important to numbers). This sets the scene for the aim of the game and for the user to try to discover the value of pi which they will only realise later as they progress is a neverending task
- After waking up, the character should be shown the basic movement commands and they can be added to the help menu.
- The user should be introduced to the help menu after mastering the basic 4 movement commands (up, down, left right)
- This can all be done as an internal monologue by the pi character
- Then the pi character could move through the map and discover some other number characters. This can introduce them to the concept of talking to them by pressing enter. At this point, this key stroke would be added to the help menu. Perhaps these number NPCs introduce themselves - by their value and whether they are rational, irrational, negative, postive etc. Let's add some variety. Perhaps this is what introduces the pi character to realising they don't know their own value and they need to find out. 
- This could then introduce the user to part of the screen where they can track their current estimates for their identity (value). A min and a max. And as they go through the level they can drag and drop current calculated values into these spots. For example, in level 1 they should calculate a value of 4. They can drag this into either the min or the max. Either is fine as they don't know if it is an upper or lower bound at this point. The pi character could guide them to do this as part of level 1. At this point in level 0, show the user an example by asking them to type in a guess of the value at the top e.g. between 1 and 10. And then showing them how to drag it to the min or max spot. 
- Then the pi character could continue through the map until they reach level 1. The user should be limited in where they can move to. e.g. the level 1 NPC (probably a number '1') is off screen to the right. So the user should not be allowed to move too far up, down or left. Is there a nice way to show the boundaries of the map at all times? And then unlock the next part of the map only when a previous level is complete?
