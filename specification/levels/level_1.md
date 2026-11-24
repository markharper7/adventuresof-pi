# Level 1 Aim

A circle is drawn on the floor. The user can then try to draw this circle by stepping the pi character up, down, left and right and estimating pi from a count of their steps and counting the squares for the diameter

There should be multiple stages in the level - a circle in each stage, each of varying size. This will show different values of pi.

## Level 1 Method
Measuring a circle's circumference/diameter directly (C/d).

## Level 1 Requirements
1. The user should have to join back to the start for the circle to complete 
2. The user should not start on the circle, but should go talk to the character NPC first. There needs to be a way to choose to start drawing the circle 
3. The user should be able to input the number of steps taken somehow, see the formula and do the calculation themselves. 
4. The steps in all directions should be equal visually to the user 
5. Can we lay out a visible grid of squares for the user to walk the pi character along. Either along the centre of each or along the edges. Later we can add some colour / background to this to make it more visually interesting 
6. The user should have freedom to draw the circles and do the levels in their own way. This adds fun. I don't want the exact right answer drawn out or required. But a dotted circle to follow which is a genuine circle is useful for level 1. 
7. Can we draw the circle to align with the edges of grid so we can easily measure the diameter as well? This should only accept an exact answer
8. We don't want diagonal movement because then we can't count the users steps / length they walk easily and so it will mess up the pi calculation
9. If done accurately, the step method will always calculate a value of 4. Don't tell the user this in advance. Let them discover it by drawing multiple (3) circles of different sizes. Then point it out to them but don't explain why. Leave it as an open question for them to think about
