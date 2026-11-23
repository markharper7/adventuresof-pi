# Level 9 Aim

Coprime numbers. The probability that two random whole numbers share no common factor (other than 1) is 6/pi^2. Use pairs of number characters to estimate it.

## Level 9 Method

Coprime probability:
(coprime pairs) / (total pairs) ≈ 6 / pi^2
so pi ≈ sqrt(6 * total pairs / coprime pairs)

## Level 9 Requirements
1. Number NPCs wander around. Pi brings two together (or they are paired at random) to see if they 'get on'
2. If they share a common factor they repel (perhaps the shared factor is shown e.g. 'we both have a 3 in us'). If coprime they become friends
3. Pairs MUST be random for the maths to work. Perhaps a random number generator machine / portal spits out pairs. Numbers in a reasonably large range e.g. 1 - 1000
4. Start with a few pairs done by hand so the player understands common factors, then allow batches of 10 / 100 to be generated automatically
5. Track total pairs and friendly (coprime) pairs in the side menu. Allow calculating at any point and adding the value to the tray
6. The NPC should link this back to level 5 (Basel problem) as the same pi^2 / 6 appears
