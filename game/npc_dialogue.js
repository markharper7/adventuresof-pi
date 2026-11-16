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
};
