# Level 3 Aim

Random point sampling of a circle within a square.

The user should be able to walk to the edge of the map, marked by an asteroid belt, pick up some asteroids and then throw them into the area.

## Level 3 Method

Random point sampling of a circle within a square. Where the radius is half the length of the square. 

Therefore, after a sufficiently large number of samples fall into the square area, you should be able to count the ones in the circle and the total (in the square) and that ratio should equal the ratio of the areas of the square and the circle:
samples in circle / total samples = (pi*r*r) / ((2*r) * (2*r))

## Level 3 Requirements
1. New key strokes might be required and to be added to the help menu so that they aren't confused with the enter command. For example, if someone picked up an asteroid and then tried to talk to the NPC. Or, it could all be done with enter and if close to the NPC that takes precedent. You can decide which is best for now
2. Different areas of the map edge could allow picking up different numbers of asteroids. Perhaps the NPC says it is only safe to pick up the smallest ones and a few locations are shown. But each one has asteroids of different sizes so maybe one location allows you to pick up 1, one 10 and a third 100. The user could be shown how to do each and then carry on for as long as they want. An accurate answer will likely emerge only after 100s are thrown in
3. The user could have to aim in some way but ones that miss shouldn't count. Perhaps the square is some force field and as long as it 'lands' in the square, they could bounce around within the force field until stopping. You could throw them in by holding down a key for a certain amount of time and then releasing to build up power. You must also be facing the right direction. But it may not be obvious yet which way the user is facing so maybe we need to point in a direction using arrows whilst holding the power key
4. The final landing spot MUST be random. Otherwise, the maths won't work. The throwing animation is just for fun. But the random spots to finish in should essentially be precomputed and predetermined so that it is random.
5. If the throwing mechanic is too tricky then we could just have a single key to throw them and they just land in that predetermined location, always in the square, no skill from the  user required. 
6. Show the current counts along the side menu as down in other levels and allow the user to 'calculate' the ratio at any point. Once calculated that value gets added to the tray of values they can select and move to min and max

## Debug Requirements