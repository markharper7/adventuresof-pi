// ---------------------------------------------------------------------------
// NPC DIALOGUE — every line spoken by a character in the game, in one place.
//
// Source of truth: ../npc_dialogue.md (written by the human author). Keep this
// file in step with it. Tutorial hints / toasts / the sidebar are NOT dialogue
// and live in the level files.
//
// Format
//   An INTERACTION is one conversation: an array of speeches, played in order.
//   A SPEECH is { <speaker>: [line, line, ...] }.
//   Each line is one "press Enter" (one bullet point in npc_dialogue.md).
//   {name} placeholders are filled in by the game, e.g. {value}.
//   Lines may contain simple HTML (<b>, <i>).
// ---------------------------------------------------------------------------

// Who can speak. `sprite` is a key into SPRITES in assets/theme.js.
export const CHARACTERS = {
  pi: { name: 'π', sprite: 'player' },
  thirteen: { name: '13', sprite: 'thirteen' },
  twoPointOneFour: { name: '2.14', sprite: 'twoPointOneFour' },
  rootTwo: { name: '√2', sprite: 'rootTwo' },
  minusFour: { name: '−4', sprite: 'minusFour' },
  zero: { name: '0', sprite: 'zero' },
  e: { name: 'e', sprite: 'e' },
  one: { name: '1', sprite: 'one' },
  two: { name: '2', sprite: 'two' },
  three: { name: '3', sprite: 'three' },
  four: { name: '4', sprite: 'four' },
  five: { name: '5', sprite: 'five' },
  six: { name: '6', sprite: 'six' },
  seven: { name: '7', sprite: 'seven' },
  eight: { name: '8', sprite: 'eight' },
  nine: { name: '9', sprite: 'nine' },
};

export const DIALOGUE = {
  // =========================================================================
  // LEVEL 0 — Wake Up
  // =========================================================================
  level0: {
    // As soon as the level starts (then the movement tutorial begins).
    wakeUp: [
      {
        pi: [
          'Arghh.... Hmmm.... Where am I?',
          'How did I get here?',
          "I can't remember anything...",
          'I guess I should explore...',
        ],
      },
    ],

    // 13 calls out when π first comes near (this teaches the Enter key).
    thirteenCallsOut: [
      {
        thirteen: [
          'You there! You look shy.',
          'Come, let me show you how to interact with other numbers.',
          "Walk up to me and press 'Enter'",
        ],
      },
    ],

    // π walks up to 13 and presses Enter for the first time.
    thirteenIntroduction: [
      {
        thirteen: [
          'There you go, simple. Now with the ice broken, let me introduce myself.',
          'I am the number thirteen. Positive. Rational. Integer. Prime.',
          "It's a pleasure to meet you. And you are...?",
        ],
      },
      { pi: ["Umm... I'm not sure... I can't remember..."] },
      {
        thirteen: [
          'Oh dear.',
          'Oh dear, oh dear.',
          "I'm not sure I can have a civilised conversation with someone who doesn't even know who they are.",
          'You could be a ruffian. Or a thug. And neither of us would know!',
        ],
      },
    ],

    // Talking to 13 again afterwards.
    thirteenAgain: [{ thirteen: ['Any luck remembering who you are yet?'] }],

    // The other numbers, met in any order. Talk to enough of them to open the way to Level 1.
    meet: {
      twoPointOneFour: [
        {
          twoPointOneFour: [
            'Why hello there! My name is two point one four.',
            'I am positive and a decimal.',
            "I'm not one of those integers; there's so much more to me than that.",
          ],
        },
      ],
      rootTwo: [
        {
          rootTwo: [
            "I'm irrational you know. Root two's the name.",
            "You can't express me as a fraction. Feel free to try.",
          ],
        },
      ],
      minusFour: [
        {
          minusFour: [
            'Negative four. At your service.',
            "You look a bit blank. You do know numbers can be negative don't you?",
          ],
        },
      ],
      zero: [
        {
          zero: [
            'I am absolutely unique!',
            'Am I positive or negative?',
            'Push me the smallest amount one way or the other and the answer becomes obvious.',
            'But what do you think I am?',
          ],
        },
      ],
      e: [
        {
          e: [
            'Hmm... Ahh... What?',
            'Sorry, I was away with the fairies then.',
            "I'm a transcendental number you know. Quite rare...",
            'My value is 2.7182818284590452353602874713527... and umm... some more I think. I find it impossible to remember it all.',
          ],
        },
      ],
    },
  },

  // =========================================================================
  // LEVEL 1 — Orbit Walk (circumference ÷ diameter)
  // =========================================================================
  level1: {
    // First time π talks to 1.
    intro: [
      {
        one: [
          "I know you who are! You're called Pi.",
          "Your value? No I can't remember that I'm afraid...",
          'But I can remember a way to estimate it!',
          'Trace out a circle, any circle, to calculate its length. This is called its circumference.',
          'Then divide that by its diameter. That is, any straight line through its center.',
          'That will give you your value! Or at least, a good estimate of it depending on how accurately you trace out the circumference and diameter.',
          "There's a circular orbit over there. Go try it out!",
        ],
      },
    ],

    // Talking to 1 again before the orbit and diameter have been traced.
    howDidYouGetOn: [{ one: ['How did you get on? Did you trace out the circumference and diameter of that orbit?'] }],

    // After the answer for orbit 1.
    firstAnswer: [{ one: ["Well done! Now let's try a different orbit and see if we get the same answer."] }],

    // After the answer for orbit 2 — same as orbit 1.
    secondAnswerSame: [
      { one: ["Hmm, that's interesting! We got exactly the same answer for a different sized circle! Let's try one more."] },
    ],

    // After the answer for orbit 2 — different from orbit 1.
    secondAnswerDifferent: [{ one: ["Hmm, that's interesting! A different answer. Let's try one more."] }],

    // After the answer for orbit 3 — all three the same. {value} is that answer (4 if traced carefully).
    thirdAnswerSame: [
      {
        one: [
          'Still {value}! Is that your value?',
          "I don't think it can be though because we didn't trace the circle exactly. I wonder what is going on here?",
          "Which of our measurements wasn't accurate?",
          'Do you think this is a high estimate or low estimate for your true value?',
          'Drag the answer into one of the boxes above and keep track of your estimates. Hopefully you can then find your true value!',
        ],
      },
    ],

    // After the answer for orbit 3 — the three answers don't all match.
    thirdAnswerDifferent: [
      {
        one: [
          'Hmm {value_1}, {value_2} and {value_3}. I wonder what is going on here?',
          'Well, this was only an estimate after all.',
          'Which one do you think you drew most accurately?',
          'Do you think this is a high estimate or low estimate for your true value?',
          'Drag the answer into one of the boxes above and keep track of your estimates. Hopefully you can then find your true value!',
        ],
      },
    ],
  },

  // =========================================================================
  // LEVEL 2 — The Star Forge (Leibniz series)
  // =========================================================================
  level2: {
    // First time π talks to 2.
    intro: [
      {
        two: [
          'Ah yes, I know of you. You are known as Pi.',
          'Your value? Hmmm. I am pretty sure I remember a way to calculate it....',
          "Ah yes, an infinite sequence. That is, one that goes on forever. We don't have that long I'm afraid so we will only be able to estimate your value.",
          'The sequence which can help us is known as the Leibniz series and it is: π/4 = 1 − 1/3 + 1/5 − 1/7 + ...',
          'Do you see the pattern?',
          'To find your value, we can multiply both sides by 4 and calculate: π = 4 − 4/3 + 4/5 − 4/7 + ...',
          "My star forge can help us! Feed my star fire crystals to heat it up and ice crystals to cool it down following this sequence. It's final change in temperature will tell us Pi. I'll keep track of it for you along the top.",
        ],
      },
    ],

    // Talking to 2 before the first 6 terms are done. {n} = terms still needed.
    howAreYouGettingOn: [{ two: ['How are you getting on? Try at least {n} more terms'] }],

    // Said automatically once 6 terms are done (and if π talks to 2 again before 20). {value} = π found so far.
    sixTermsDone: [
      {
        two: [
          'Well done! {value}. Can you see the pattern we are making?',
          'Keep track of {value} as an estimate. Do you think it is a high or a low estimate?',
          'You are welcome to use more of my crystals if you want to improve your estimate.',
        ],
      },
    ],

    // Talking to 2 after all 20 terms are done.
    outOfCrystals: [
      {
        two: [
          "I'm sorry. I'm out of crystals. That's as much as I can help you. Try traveling through a portal to find someone else to help you.",
        ],
      },
    ],
  },

  // =========================================================================
  // LEVEL 3 — The Asteroid Belt (random sampling)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 3 section yet.
  // =========================================================================
  level3: {
    // First time π talks to 3.
    intro: [
      {
        three: [
          "Hello! I'm 3. Thirteen told me about you. Pi, isn't it?",
          "Well, a name is a start. Now you need your value.",
          'See that square force field? There is a circle drawn inside it, touching all four sides.',
          'Throw asteroids into the square and they land at random. Some end up in the circle, some in the corners.',
          "The fraction that land in the circle should match the circle's area divided by the square's area.",
          'The asteroid belt around the edge is far too dangerous to touch. Except the smallest rocks. I have marked three safe spots.',
          'Pick some up, walk up to the force field and throw them in. Then press C whenever you want to count up and calculate.',
        ],
      },
    ],

    // Talking to 3 before anything has been thrown.
    nothingThrownYet: [{ three: ['Go on then. Look for the marked spots in the asteroid belt.'] }],

    // Talking to 3 after throwing but before calculating.
    notCalculatedYet: [{ three: ['Press C whenever you like to count up the asteroids and calculate.'] }],

    // After the first calculation, if fewer than the unlock number of asteroids were thrown. {value}, {total}.
    firstCalculation: [
      {
        three: [
          '{value}, from only {total} asteroids. Hmm.',
          'Do you think throwing more would help? Try one of the bigger piles.',
        ],
      },
    ],

    // Said automatically the first time a calculation uses enough asteroids to open the warp gate. {value}, {total}.
    enoughThrown: [
      {
        three: [
          'Now that is more like it. {total} asteroids gives {value}.',
          'Do you think more asteroids would get you closer? Do you think this is a high or a low estimate?',
          'Keep throwing for as long as you like. The warp gate is open whenever you are ready.',
        ],
      },
    ],

    // Talking to 3 after the warp gate is open.
    again: [{ three: ['Every asteroid lands at random. The more you throw, the better your estimate... usually.'] }],
  },

  // =========================================================================
  // LEVEL 4 — The Polygon Projector (Archimedes)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 4 section yet.
  // Each part of `demo` is shown with the drawing updated to match it.
  // =========================================================================
  level4: {
    demo: {
      // Just the circle.
      circle: [
        {
          four: [
            "Ah, Pi! I'm 4. Four equal sides and four right angles. Perfectly square, if I say so myself.",
            'A long time ago a Greek mathematician called Archimedes found your value by trapping a circle between straight lines.',
            'Here is a circle with radius 1. So its diameter is 2.',
            'Its circumference divided by its diameter would be your value. But curves are very hard to measure!',
          ],
        },
      ],
      // A hexagon drawn inside the circle.
      inside: [
        {
          four: [
            'So let us fit a hexagon inside it. Six straight sides, with every corner touching the circle.',
            'Straight lines are easy to measure. Its perimeter is a little shorter than the circumference.',
          ],
        },
      ],
      // The hexagon split into triangles.
      triangles: [
        {
          four: [
            'Split the hexagon into triangles, one for each side, all meeting in the middle.',
            'Two sides of every triangle are the radius: 1.',
          ],
        },
      ],
      // One triangle cut in half to make a right-angled triangle.
      halve: [
        {
          four: [
            'Now cut one triangle in half. We get a right-angled triangle!',
            'The angle in the middle is 360° ÷ 6 ÷ 2 = 30°.',
            'The longest side is the radius, 1. The side opposite our angle is half of one side of the hexagon.',
            'And that half side is r × sin(30°).',
          ],
        },
      ],
      // The formula.
      formula: [
        {
          four: [
            'So one whole side is 2 × r × sin(angle), and there are n sides.',
            'Perimeter ÷ diameter = n × 2 × r × sin(angle) ÷ 2r = n × sin(180° ÷ n).',
            'For the hexagon: 6 × sin(30°) = 6 × 0.5 = 3.',
          ],
        },
      ],
      // A polygon drawn outside the circle too.
      outside: [
        {
          four: [
            'We can also draw a polygon outside the circle, with each side just touching it.',
            'That works the same way, but with tan instead of sin: n × tan(180° ÷ n).',
            'Which one do you think is too small, and which too big?',
            'Use my polygon projector to try more sides. Try at least one polygon with 10 or more sides.',
          ],
        },
      ],
    },

    // Talking to 4 before a polygon with at least 10 sides has been tried.
    howAreYouGettingOn: [{ four: ['Have you tried a polygon with at least 10 sides yet? Use the polygon projector.'] }],

    // Said automatically the first time a polygon with 10+ sides is worked out. {n}, {value}.
    tenSidesDone: [
      {
        four: [
          '{n} sides gives {value}. That is looking a lot more like a circle!',
          'What happens as you keep adding sides? Is there a value that the polygons can never quite reach?',
          'Try as many as you like, up to 100 sides. The warp gate is open whenever you are ready.',
        ],
      },
    ],

    // Talking to 4 after that.
    again: [{ four: ['More sides, tighter squeeze. Your value is trapped between the polygons inside and outside.'] }],
  },

  // =========================================================================
  // LEVEL 5 — The Asteroid Quarry (Basel problem)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 5 section yet.
  // =========================================================================
  level5: {
    // First time π talks to 5.
    intro: [
      {
        five: [
          "Pi! I'm 5. Welcome to my quarry.",
          'Here is a different infinite sum: 1 + 1/4 + 1/9 + 1/16 + 1/25 + ...',
          'Each term is one over a square number: 1/1², 1/2², 1/3², 1/4² and so on.',
          'Every term is positive, so the total only ever grows. It never goes down.',
          'A long time ago a mathematician called Euler showed that if you could add up all of them, forever, you would get π² ÷ 6.',
          'So if we multiply the total by 6, then take the square root, we get π!',
          'Let us build it out of rock. My stockpile has a chunk for each of the first 10 terms. The first weighs 1 megatonne, the next 1/4, then 1/9...',
          'Carry the first one to my asteroid gun, load it, aim with up and down and fire it into orbit round that planet.',
          'Careful! Aim so it just skims the edge of the orbit. Fire it straight at the planet and it will crash. Too wide and it will miss the orbit altogether.',
          'Whichever way it is travelling when it reaches the orbit, that is the way it will go round.',
          'Then fire each chunk after it at the orbiting asteroid. If you miss, it is lost in space, so fetch another of the same size.',
          'Next, fire my duplicator. It multiplies the asteroid by 6. Then fire my square-root laser at it.',
          'Whatever is left, bring it to my scale at the top. Its weight should be your value!',
        ],
      },
    ],

    // Talking to 5 before the first rock is in orbit.
    fireFirstRock: [{ five: ['Take the 1-megatonne rock from the stockpile, load the gun and fire it into orbit.', 'Remember: aim so it just skims the edge of the orbit, not straight at the planet.'] }],

    // Talking to 5 before all MAX_TERMS chunks are in the asteroid. {left}.
    howAreYouGettingOn: [{ five: ['{left} chunks left in the stockpile. See how small they are getting?'] }],

    // Talking to 5 with every chunk in, before duplicating.
    readyToDuplicate: [{ five: ['All the chunks are in! Now multiply it by 6. Load the duplicator and fire.'] }],

    // Talking to 5 after duplicating, before the square root.
    nowSquareRoot: [{ five: ['Six times as heavy! Now take the square root. Load the square-root laser and fire.'] }],

    // Talking to 5 while the final rock is waiting to be picked up.
    pickUpRock: [{ five: ['There is your rock. Pick it up and take it to the scale at the top.'] }],

    // Talking to 5 while carrying the final rock.
    weighIt: [{ five: ['Put it on the scale, quickly! That rock is heavy.'] }],

    // After the first weighing, if fewer than the unlock number of terms were used. {value}, {terms}, {needed}.
    firstCalculation: [
      {
        five: [
          '{value}, from only {terms} terms. Hmm.',
          'Each chunk is smaller than the last, but they all count. Try again with all {needed}.',
        ],
      },
    ],

    // Said automatically the first time a weighing uses enough terms to open the warp gate. {value}, {terms}.
    enoughTerms: [
      {
        five: [
          '{terms} terms gives {value}. Now we are getting somewhere!',
          'Every chunk made the asteroid heavier, never lighter. So is this estimate too high or too low?',
          'The chunks after these are tiny, but there are infinitely many of them. Do you think they could add up to much?',
          'Build another as many times as you like. The warp gate is open whenever you are ready.',
        ],
      },
    ],

    // Talking to 5 after the warp gate is open (and no asteroid in orbit).
    again: [{ five: ['Want to build another? Take the 1-megatonne rock from the stockpile and fire it into orbit.'] }],
  },

  // =========================================================================
  // LEVEL 6 — The Beacon Survey (Gauss circle problem)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 6 section yet.
  // =========================================================================
  level6: {
    // First time π talks to 6: a demonstration, one interaction per part.
    // Docked at the bottom so the drawing changes behind it.
    demo: {
      // (the 4 × 4 square is empty)
      intro: [
        {
          six: [
            "Pi! I'm 6. I survey star systems by counting.",
            'A long time ago a mathematician called Gauss had a clever idea: you can measure the area of a circle just by counting dots.',
            'Let me show you how. Look at the square in the top corner.',
          ],
        },
      ],
      // one beacon on the centre of every tile: 16
      unit: [
        {
          six: [
            'It is 4 tiles wide and 4 tiles tall, so its area is 4 × 4 = 16.',
            'I have put one beacon on the centre of every tile. Count them: 16 beacons.',
            '16 beacons, area 16. The count IS the area!',
          ],
        },
      ],
      // beacons 2 apart: 4
      wide: [
        {
          six: [
            'But watch what happens if the beacons are 2 apart instead of 1.',
            'Now there are only 4 beacons. The square has not changed. Its area is still 16!',
            'Each beacon now stands for a 2 × 2 patch, not a 1 × 1 tile.',
          ],
        },
      ],
      // beacons ½ apart: 64
      dense: [
        {
          six: [
            'And if they are only half a tile apart...',
            '64 beacons! Far too many, and the area is still 16.',
            'So remember: counting beacons only gives you the area when they are exactly 1 apart. One beacon per tile.',
          ],
        },
      ],
      // the first orbit pulses
      circle: [
        {
          six: [
            'Now for circles. Out there are three orbits, with radius 1, 2 and 3 tiles.',
            'Drop a beacon on the centre of every tile that is inside the orbit, or exactly on it.',
            "If a tile's centre is outside the orbit, its beacon does not count, even if part of the tile is inside.",
            'The number of beacons is roughly the area of the circle. And the area of a circle is π × r × r.',
            'So π ≈ number of beacons ÷ r². Just count and divide!',
          ],
        },
      ],
      howTo: [
        {
          six: [
            'Stand on a tile near an orbit and press Enter to drop a beacon. Press Enter again to pick it up.',
            'In the first orbit your beacons light up straight away: green inside, red outside.',
            'In the next two you are on your own! When you have finished, use the survey console under the orbit and tell me your count. Then I will check your beacons.',
            'Survey all three orbits and the warp gate will power up.',
          ],
        },
      ],
    },

    // Talking to 6 while an orbit is still to be surveyed.
    orbit1: [{ six: ['Start with the smallest orbit, radius 1. Drop a beacon on every tile centre inside it, or on it.', 'Then use the survey console underneath.'] }],
    orbit2: [{ six: ['Next, the orbit with radius 2. No colours to help you this time!', 'Count carefully, then use the survey console underneath.'] }],
    orbit3: [{ six: ['Last one: radius 3. That is a lot of beacons. Work round it row by row.'] }],

    // After the console check, when every beacon was right and the count matched. {count}.
    checkPerfect: [{ six: ['{count} beacons, every one in the right place, and you counted them all. Perfect surveying!'] }],

    // After the console check, when something was wrong. {said}, {count}.
    checkFixed: [
      {
        six: [
          'You counted {said}. Let me check your beacons...',
          'Green beacons are inside or on the orbit. Red ones are outside it, so they do not count. Hollow rings are tile centres you missed.',
          'The true count for this orbit is {count}. Let us use that.',
        ],
      },
    ],

    // After working out π for each orbit. {value}.
    orbit1Done: [
      {
        six: [
          '{value}?! That is nowhere near 3, is it?',
          'A circle this small is nearly all edge, and square tiles cannot follow the curve. Try a bigger orbit.',
        ],
      },
    ],
    orbit2Done: [{ six: ['{value}. Much better than 5!', 'The bigger the circle, the less the jagged edge matters. On to the last orbit.'] }],
    // Said the first time all three orbits are done (opens the warp gate). {value}.
    allDone: [
      {
        six: [
          '{value} from the radius 3 orbit.',
          'See how the estimate got closer as the circle grew? 5, then 3.25, then 3.22.',
          'Bigger circles would need hundreds of beacons. Luckily my telescope can see circles other surveyors have already filled in.',
          'Look at circles as big as you like. The warp gate is open whenever you are ready.',
        ],
      },
    ],
    // When the orbits are re-surveyed after the gate is open. {value}.
    orbitAgain: [{ six: ['{value} again. Same circle, same count, same answer. Only a bigger circle can do better.'] }],

    // The first time π looks through the telescope.
    telescopeFirst: [
      {
        six: [
          'This telescope looks at circles that other surveyors have already filled with beacons.',
          'Up and down change the radius by 1. Left and right jump by 5. Press Enter to note down the estimate.',
          'Watch how count ÷ r² settles down as the circle gets bigger.',
        ],
      },
    ],

    // Talking to 6 after the warp gate is open.
    again: [{ six: ['Bigger circles, better estimates. But even huge ones still wobble a little. Try the telescope and see!'] }],
  },

  // =========================================================================
  // LEVEL 7 — The Fraction Yard (Wallis product)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 7 section yet.
  // =========================================================================
  level7: {
    // First time π talks to 7. Docked at the bottom so the series along the top stays visible.
    intro: [
      {
        seven: [
          "Pi! I'm 7. Welcome to the Fraction Yard.",
          'See the asteroid drifting up there? It is a fraction: one rock on top, one rock underneath, joined by the fraction bar.',
          'Right now it is 1 over 1, which is just 1.',
          'A mathematician called John Wallis found something amazing. Multiply these fractions together, one after another, and you get closer and closer to π ÷ 2.',
          'The fractions are along the top of the screen: 2/1 × 2/3 × 4/3 × 4/5 × 6/5 … Look carefully. Can you see the pattern?',
          'To multiply, use my turret. Take a number from the ammo rack at the bottom and load it into the turret.',
          'Press Enter next to the turret to climb in. Up aims at the top rock, down at the bottom rock, and left and right slide the turret along its rail.',
          'Press Enter to fire, and Esc to climb back out.',
          'The fraction never stops moving, so fire a little before it is overhead!',
          'Multiply the top rock by every top number in the pattern, and the bottom rock by every bottom number.',
          'You can do them in any order you like. When you multiply, the order makes no difference to the answer.',
          'Whenever you want to know what the fraction is worth, use the scanner. Finish all ten fractions and the warp gate will power up.',
        ],
      },
    ],

    // Talking to 7 while there are numbers still to fire. {left}.
    progress: [{ seven: ['{left} numbers still to fire. Look at the pattern along the top: the dark numbers are the ones still to do.'] }],

    // Talking to 7 once every number has been fired.
    readyToScan: [{ seven: ['Every fraction in the pattern is done! Take a reading at the scanner.'] }],

    // After the first scan, if not everything is finished yet. {value}, {left}.
    firstScan: [
      {
        seven: [
          '{value}. Not bad for a start!',
          'Finish another fraction and scan again. Which way does the estimate move each time?',
        ],
      },
    ],

    // The first time a scan uses all ten fractions (opens the warp gate). {value}.
    allDone: [
      {
        seven: [
          '{value} from all ten fractions!',
          'Did you notice? It does not creep up on π. It hops over it, then under it, then over it again.',
          'After 9 fractions you get about 3.30, a bit too big. After 10 you get about 3.00, a bit too small. π is trapped in between!',
          'And the hops get smaller every time, so the more fractions you multiply, the tighter the trap.',
          'The warp gate is open. Press R if you want to build the fraction again.',
        ],
      },
    ],

    // Talking to 7 after the warp gate is open.
    again: [{ seven: ['Press R to clear the fraction back to 1 over 1. Try scanning after every fraction, and watch it zig-zag round π.'] }],
  },

  // =========================================================================
  // LEVEL 8 — The Laser Lanes (Buffon's needle)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 8 section yet.
  // =========================================================================
  level8: {
    // First time π talks to 8.
    intro: [
      {
        eight: [
          "Pi! I'm 8. Welcome to the Laser Lanes.",
          'See the glowing lines across the field? They are laser lanes, and they are all exactly the same distance apart.',
          'Now look in the crates. Each piece of space debris is a straight rod, exactly as long as the gap between two lanes.',
          'A long time ago, a French count called Buffon dropped needles onto a floor made of planks and asked a question.',
          'How likely is it that a needle lands across one of the lines between the planks?',
          'Drop some rods into the field and find out. Each one lands in a random place, pointing in a random direction.',
          'Some will lie neatly between two lanes. Others will cross a lane and light up.',
          'Take rods from the crates (1, 10 or 100 at a time), walk up to the field and press Enter to scatter them.',
          'Then press C whenever you like to count up and calculate: π ≈ 2 × rods dropped ÷ rods crossing a lane.',
        ],
      },
    ],

    // Talking to 8 before anything has been dropped.
    nothingDroppedYet: [{ eight: ['The crates are along the bottom. Grab some rods and scatter them over the lanes.'] }],

    // Talking to 8 after dropping but before calculating.
    notCalculatedYet: [{ eight: ['Press C whenever you like to count the rods and calculate.'] }],

    // After the first calculation, if fewer than the unlock number of rods were dropped. {value}, {total}.
    firstCalculation: [
      {
        eight: [
          '{value}, from {total} rods. Interesting...',
          'A handful of rods is a bit of a gamble. What happens if you drop a lot more?',
        ],
      },
    ],

    // Said automatically the first time a calculation uses enough rods to open the warp gate. {value}, {total}.
    enoughDropped: [
      {
        eight: [
          '{total} rods gives {value}. Now we are getting somewhere!',
          'But wait. Look around the field. Can you see a circle anywhere?',
          'No circles. No orbits. Just straight lines and straight rods. And yet there you are, Pi.',
          'Where do you think you are hiding? Here is a clue: think about which way the rods point when they land.',
          'Keep dropping for as long as you like. The warp gate is open whenever you are ready.',
        ],
      },
    ],

    // Talking to 8 after the warp gate is open.
    again: [{ eight: ['Every rod spins as it falls. Somewhere in all that spinning there is a circle... Press R to clear the field.'] }],
  },

  // =========================================================================
  // LEVEL 9 — The Friendship Portal (coprime probability)
  // PLACEHOLDER dialogue — npc_dialogue.md has no Level 9 section yet.
  // =========================================================================
  level9: {
    // First time π talks to 9.
    intro: [
      {
        nine: [
          "Pi! I'm 9. Three times three, so I always get on with 3... we both have a 3 inside us.",
          'Numbers are fussy about who they make friends with. If two numbers share a factor, they push each other away.',
          'A factor is a whole number that divides in exactly. 12 and 18 can both be divided by 6, so they share a factor. They will not get on.',
          'But 8 and 15? Nothing divides both of them except 1. They have nothing in common, so they become friends. Mathematicians call them <b>coprime</b>.',
          'The portal at the top sends out two random numbers from 1 to 100. They meet in the ring in the middle.',
          'Use the consoles at the bottom. First, call out one pair at a time and judge them yourself. Do they share a factor or not?',
          'After {hand} pairs you can call out 10 or 100 at a time, and the portal will judge them for you.',
          'Here is the strange part. The fraction of pairs that become friends is 6 ÷ π². Press C whenever you like to calculate.',
        ],
      },
    ],

    // Talking to 9 while still judging pairs by hand. {done}, {hand}.
    handProgress: [{ nine: ['{done} of {hand} pairs judged. Use the ×1 console to call out another pair.'] }],

    // Said automatically after the last pair judged by hand. {right}, {hand}.
    handDone: [
      {
        nine: [
          'You got {right} out of {hand} right. Checking factors by hand is hard work!',
          'Now you can use the ×10 and ×100 consoles. The portal will judge every pair for you.',
          'Watch the two pens fill up. About how many pairs end up as friends?',
        ],
      },
    ],

    // Talking to 9 after judging by hand but before calculating.
    notCalculatedYet: [{ nine: ['Press C whenever you like to count up the friends and calculate.'] }],

    // After the first calculation, if fewer than the unlock number of pairs were made. {value}, {total}.
    firstCalculation: [
      {
        nine: [
          '{value}, from {total} pairs. Hmm, not many pairs yet.',
          'Random numbers need big crowds. Try calling out a hundred at a time.',
        ],
      },
    ],

    // Said automatically the first time a calculation uses enough pairs to open the warp gate. {value}, {total}.
    enoughPairs: [
      {
        nine: [
          '{total} pairs gives {value}. Lovely!',
          'Do you remember 5, back at the Asteroid Quarry? 1 + 1/4 + 1/9 + 1/16 + … added up to π² ÷ 6.',
          'Here, the chance of two numbers being friends is 6 ÷ π². The very same number, flipped upside down!',
          'Why would friendship between numbers have anything to do with circles? Have a think about it.',
          'Keep calling pairs for as long as you like. The warp gate is open whenever you are ready.',
        ],
      },
    ],

    // Talking to 9 after the warp gate is open.
    again: [{ nine: ['About 61 out of every 100 pairs become friends. Press R to empty the pens and start counting again.'] }],
  },
};
