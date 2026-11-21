// ---------------------------------------------------------------------------
// VISUAL THEME — everything the canvas draws gets its look from here,
// plus the SVG files in assets/sprites/ and the UI styles in assets/theme.css.
// Swap colours / sprite files here to restyle the game; no game logic lives here.
// ---------------------------------------------------------------------------

// Sprite images (paths are relative to index.html).
export const SPRITES = {
  player: 'assets/sprites/pi-character.svg',
  // number characters (names and lines are in npc_dialogue.js)
  three: 'assets/sprites/npc-three.svg',
  thirteen: 'assets/sprites/npc-thirteen.svg',
  twoPointOneFour: 'assets/sprites/npc-two-point-one-four.svg',
  rootTwo: 'assets/sprites/npc-root-two.svg',
  minusFour: 'assets/sprites/npc-minus-four.svg',
  zero: 'assets/sprites/npc-zero.svg',
  e: 'assets/sprites/npc-e.svg',
  one: 'assets/sprites/npc-one.svg',
  two: 'assets/sprites/npc-two.svg',
  four: 'assets/sprites/npc-four.svg',
  five: 'assets/sprites/npc-five.svg',
  six: 'assets/sprites/npc-six.svg',
  gate: 'assets/sprites/warp-gate.svg',
  pad: 'assets/sprites/launch-pad.svg',
  planetMoon: 'assets/sprites/planet-moon.svg',
  planetRed: 'assets/sprites/planet-red.svg',
  planetGiant: 'assets/sprites/planet-giant.svg',
};

// One style per level backdrop. Levels pick a style by name.
export const LEVEL_STYLES = {
  // Level 0 — a quiet violet/teal nebula where π wakes up
  wake: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    // no glow line here: the soft nebula edge is enough. The walls between areas reuse these colours.
    boundary: { kind: 'nebula', radius: 3, colors: ['rgba(150,90,255,0.6)', 'rgba(40,200,190,0.5)', 'rgba(110,140,255,0.55)'] },
    bgTop: '#07061a',
    bgBottom: '#10203a',
    nebulae: [
      { x: 0.08, y: 0.5, r: 0.25, color: 'rgba(150,90,255,0.30)' },
      { x: 0.45, y: 0.3, r: 0.3, color: 'rgba(40,200,190,0.16)' },
      { x: 0.9, y: 0.7, r: 0.3, color: 'rgba(80,220,140,0.18)' },
    ],
    stars: 200,
    starColors: ['#ffffff', '#d6ccff', '#c8fff4'],
    board: 'rgba(20,16,60,0.30)',
    tileA: 'rgba(255,255,255,0.025)',
    tileB: null,
    grid: 'rgba(170,150,255,0.14)',
    gridDot: null,
    border: 'rgba(140,220,255,0.75)',
    pod: '#c9d4f5',
    podGlass: '#7fe0ff',
    // nebula walls between the areas of Level 0: darker and denser than the map edge
    wallColors: ['rgba(90,50,190,0.85)', 'rgba(20,110,120,0.8)', 'rgba(60,70,170,0.85)', 'rgba(120,60,170,0.8)'],
    wallShade: 'rgba(6,4,20,0.92)',
    rock: '#4a4566',
    accent: '#9fe8ff',
    accentGlow: 'rgba(159,232,255,0.85)',
    text: '#e6e0ff',
    muted: 'rgba(220,210,255,0.6)',
    bubble: 'rgba(24,18,60,0.92)',
    bubbleBorder: '#9fe8ff',
  },
  // Level 1 — deep blue starfield, grid lines you walk along
  orbit: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    boundary: { kind: 'ring', radius: 4, colors: ['#cfe3ff', '#ffffff', '#9fc4ff', '#ffe9c4'], glow: 'rgba(127,224,255,0.55)', dashed: true },
    border: 'rgba(127,224,255,0.6)',
    bgTop: '#040716',
    bgBottom: '#0c1642',
    nebulae: [
      { x: 0.18, y: 0.25, r: 0.45, color: 'rgba(110,70,220,0.28)' },
      { x: 0.85, y: 0.8, r: 0.5, color: 'rgba(20,150,210,0.20)' },
    ],
    stars: 240,
    starColors: ['#ffffff', '#cfe3ff', '#ffe9c4'],
    board: 'rgba(10,22,70,0.30)',
    tileA: null,
    tileB: null,
    grid: 'rgba(120,170,255,0.22)',
    gridDot: 'rgba(180,215,255,0.55)',
    accent: '#7fe0ff',
    accentGlow: 'rgba(127,224,255,0.85)',
    trail: '#ffcf5a',
    trailGlow: 'rgba(255,190,70,0.9)',
    trailDot: '#fff3c8',
    diaTrail: '#7dffa8',              // the diameter you fly across, and its beacons
    diaTrailGlow: 'rgba(125,255,168,0.9)',
    text: '#dce8ff',
    muted: 'rgba(200,215,255,0.6)',
    bubble: 'rgba(14,22,58,0.92)',
    bubbleBorder: '#7fe0ff',
  },
  // Level 2 — warm nebula around a star forge, chequered deck tiles
  forge: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    boundary: { kind: 'nebula', radius: 3.5, colors: ['rgba(255,120,40,0.45)', 'rgba(255,190,80,0.35)', 'rgba(190,60,200,0.4)'], glow: 'rgba(255,179,71,0.6)' },
    border: 'rgba(255,179,71,0.6)',
    bgTop: '#10041a',
    bgBottom: '#2b0b2a',
    nebulae: [
      { x: 0.5, y: 0.5, r: 0.55, color: 'rgba(255,110,40,0.20)' },
      { x: 0.1, y: 0.9, r: 0.4, color: 'rgba(160,60,220,0.25)' },
      { x: 0.95, y: 0.1, r: 0.35, color: 'rgba(60,160,255,0.15)' },
    ],
    stars: 200,
    starColors: ['#ffffff', '#ffd9c0', '#d9e4ff'],
    board: 'rgba(40,10,40,0.25)',
    tileA: 'rgba(255,255,255,0.03)',
    tileB: 'rgba(0,0,0,0.10)',
    grid: 'rgba(255,170,120,0.13)',
    gridDot: null,
    accent: '#ffb347',
    accentGlow: 'rgba(255,179,71,0.85)',
    chartLine: '#ffd27f',
    chartBg: 'rgba(10,4,20,0.55)',
    text: '#ffe9dc',
    muted: 'rgba(255,225,210,0.6)',
    bubble: 'rgba(40,14,40,0.92)',
    bubbleBorder: '#ffb347',
  },
  // Level 3 — dusty asteroid belt ringing the map, a square force field in the middle
  belt: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    boundary: { kind: 'asteroids', radius: 4, colors: ['#a8988a', '#7d6f66', '#463c38'], glow: 'rgba(255,207,138,0.35)' },
    border: 'rgba(200,170,130,0.45)',
    bgTop: '#060914',
    bgBottom: '#1a1426',
    nebulae: [
      { x: 0.2, y: 0.2, r: 0.45, color: 'rgba(200,120,60,0.16)' },
      { x: 0.85, y: 0.75, r: 0.5, color: 'rgba(90,110,230,0.18)' },
    ],
    stars: 220,
    starColors: ['#ffffff', '#ffe6cc', '#d6e2ff'],
    board: 'rgba(30,22,40,0.25)',
    tileA: 'rgba(255,255,255,0.02)',
    tileB: null,
    grid: 'rgba(220,190,150,0.10)',
    gridDot: null,
    accent: '#ffcf8a',
    accentGlow: 'rgba(255,207,138,0.85)',
    text: '#f3e9dc',
    muted: 'rgba(240,225,205,0.6)',
    bubble: 'rgba(36,26,40,0.92)',
    bubbleBorder: '#ffcf8a',
  },
  // Level 4 — cool green observatory where polygons are projected around a circle
  archimedes: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    boundary: { kind: 'ring', radius: 3.5, colors: ['#5fe0b0', '#c9ffe9', '#9fe8ff'], glow: 'rgba(95,224,176,0.55)', dashed: true },
    border: 'rgba(95,224,176,0.55)',
    bgTop: '#03100f',
    bgBottom: '#0b1f33',
    nebulae: [
      { x: 0.65, y: 0.5, r: 0.5, color: 'rgba(60,200,160,0.14)' },
      { x: 0.1, y: 0.15, r: 0.35, color: 'rgba(110,90,230,0.18)' },
    ],
    stars: 200,
    starColors: ['#ffffff', '#d4fff0', '#d6e2ff'],
    board: 'rgba(8,30,34,0.30)',
    tileA: null,
    tileB: null,
    grid: 'rgba(120,230,200,0.10)',
    gridDot: 'rgba(160,240,215,0.25)',
    accent: '#5fe0b0',
    accentGlow: 'rgba(95,224,176,0.85)',
    text: '#dcfff4',
    muted: 'rgba(200,240,228,0.6)',
    bubble: 'rgba(8,34,34,0.92)',
    bubbleBorder: '#5fe0b0',
  },
  // Level 5 — a rosy quarry orbit where an asteroid is built up chunk by chunk
  quarry: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    boundary: { kind: 'ring', radius: 3.5, colors: ['#ff9ad5', '#ffd6ef', '#ffc58a'], glow: 'rgba(255,140,200,0.5)', dashed: true },
    border: 'rgba(255,140,200,0.5)',
    bgTop: '#0d0614',
    bgBottom: '#24102a',
    nebulae: [
      { x: 0.7, y: 0.45, r: 0.45, color: 'rgba(255,90,170,0.14)' },
      { x: 0.1, y: 0.85, r: 0.4, color: 'rgba(120,90,255,0.15)' },
    ],
    stars: 210,
    starColors: ['#ffffff', '#ffe0f2', '#e0dcff'],
    board: 'rgba(40,14,40,0.28)',
    tileA: 'rgba(255,255,255,0.02)',
    tileB: null,
    grid: 'rgba(255,170,220,0.10)',
    gridDot: null,
    accent: '#ff9ad5',
    accentGlow: 'rgba(255,154,213,0.85)',
    text: '#ffeef8',
    muted: 'rgba(255,225,240,0.6)',
    bubble: 'rgba(44,14,40,0.92)',
    bubbleBorder: '#ff9ad5',
  },
  // Level 6 — a deep indigo survey field where beacons are dropped inside orbits
  lattice: {
    // shaped edge of the map (see src/core/boundary.js): kind = nebula | ring | asteroids
    boundary: { kind: 'ring', radius: 3.5, colors: ['#ffd166', '#fff3c4', '#9fb4ff'], glow: 'rgba(255,209,102,0.5)', dashed: true },
    border: 'rgba(255,209,102,0.5)',
    bgTop: '#05061a',
    bgBottom: '#141638',
    nebulae: [
      { x: 0.6, y: 0.5, r: 0.5, color: 'rgba(255,200,90,0.10)' },
      { x: 0.1, y: 0.2, r: 0.4, color: 'rgba(90,110,255,0.20)' },
    ],
    stars: 220,
    starColors: ['#ffffff', '#fff3c4', '#d6dcff'],
    board: 'rgba(16,18,60,0.30)',
    tileA: 'rgba(255,255,255,0.025)',
    tileB: null,
    grid: 'rgba(255,220,150,0.12)',
    gridDot: null,
    accent: '#ffd166',
    accentGlow: 'rgba(255,209,102,0.85)',
    text: '#fff8e6',
    muted: 'rgba(255,240,215,0.6)',
    bubble: 'rgba(20,20,56,0.92)',
    bubbleBorder: '#ffd166',
  },
};

// Asteroids and the force field (Level 3).
export const ASTEROID_STYLE = {
  rock: '#7d6f66',
  rockLight: '#a8988a',
  rockDark: '#463c38',
  spotRing: 'rgba(255,207,138,0.85)',
  field: 'rgba(120,200,255,0.9)',
  fieldFill: 'rgba(80,160,255,0.08)',
  circle: 'rgba(255,255,255,0.75)',
  inside: '#ffcf5a',      // landed inside the circle
  outside: '#7fa8ff',     // landed in a corner of the square, outside the circle
  trail: 'rgba(255,220,170,0.6)',
};

// The asteroid gun, orbit and square of dust (Level 5).
export const BASEL_STYLE = {
  rock: '#8a7468',
  rockLight: '#c2aa9a',
  rockDark: '#4a3a34',
  orbit: 'rgba(255,200,230,0.35)',
  platform: 'rgba(255,154,213,0.8)',
  aim: 'rgba(255,230,160,0.8)',
  gun: '#d7dcef',
  gunBase: '#4a4f6e',
  gunGlow: 'rgba(255,154,213,0.8)',
  trail: 'rgba(255,220,170,0.7)',
  hit: '#ffcf5a',
  miss: 'rgba(255,120,120,0.9)',
  beam: 'rgba(160,240,255,0.95)',
  dup: '#7ff0ff',                      // the duplicator (×6) laser: cell, bolt, crate edge
  root: '#b4ff6a',                     // the square-root (√) laser: cell, bolt, crate edge
  cellText: '#10142a',                 // symbol on a laser cell
  crate: '#2c2f48',
  final: '#a98a6c',                    // the rock left after the square root
  finalLight: '#ffe2b0',
  pileFill: 'rgba(40,20,44,0.85)',     // the stockpile
  pileEdge: 'rgba(255,154,213,0.7)',
  label: '#ffcf5a',                    // the next chunk's label, LOADED, the final rock's marker
  scale: '#b9bfd8',
  dialBg: 'rgba(30,10,30,0.8)',
  dialTick: 'rgba(255,225,240,0.6)',
  needle: '#ffcf5a',
};

// Beacons, orbits, survey consoles and the telescope (Level 6).
export const LATTICE_STYLE = {
  orbit: 'rgba(255,209,102,0.9)',        // the orbit ring
  orbitGlow: 'rgba(255,209,102,0.6)',
  zone: 'rgba(255,240,215,0.22)',        // dashed edge of an orbit's survey zone
  zoneLocked: 'rgba(255,240,215,0.08)',
  centre: '#fff3c4',                     // the centre marker
  label: '#ffd166',
  beaconPost: '#8a90b8',
  beacon: '#ffd166',                     // not checked yet
  inside: '#5dff9a',                     // inside or on the orbit: counts
  outside: '#ff5d6e',                    // outside the orbit: doesn't count
  missed: 'rgba(93,255,154,0.9)',        // hollow ring: a tile centre that should have a beacon
  demoEdge: 'rgba(159,180,255,0.8)',     // the 4 × 4 demonstration square
  demoBlock: 'rgba(159,180,255,0.35)',
  console: '#2c3060',
  consoleGlow: 'rgba(255,209,102,0.9)',
  scopeTube: '#d7dcef',
  scopeLeg: '#6a7099',
  scopeBg: 'rgba(3,4,16,0.93)',          // telescope view
  lensBg: '#070a24',
  lensEdge: 'rgba(255,209,102,0.8)',
  latticeDim: 'rgba(170,180,230,0.28)',
  sweep: 'rgba(255,209,102,0.25)',
};

// The polygon projector (Level 4).
export const POLYGON_STYLE = {
  circle: 'rgba(255,255,255,0.85)',
  inside: '#ffcf5a',                  // inscribed polygon
  insideFill: 'rgba(255,207,90,0.08)',
  outside: '#5fe0b0',                 // circumscribed polygon
  outsideFill: 'rgba(95,224,176,0.05)',
  triangle: 'rgba(255,140,170,0.35)',
  triangleEdge: '#ff8caa',
  label: '#ffffff',
  insetBg: 'rgba(4,14,20,0.8)',
  console: '#2a5a6a',
  consoleGlow: 'rgba(95,224,176,0.9)',
};

// Fraction pieces (Level 2 and any future fraction level).
export const PIECE_STYLES = {
  positive: {
    name: 'fire crystal',
    core: '#fff6c8',
    edge: '#ff9a1f',
    stroke: '#ffe08a',
    glow: 'rgba(255,160,40,0.8)',
    ghost: 'rgba(255,170,60,0.10)',
  },
  negative: {
    name: 'ice crystal',
    core: '#f0fdff',
    edge: '#2fa8ff',
    stroke: '#bdeeff',
    glow: 'rgba(80,190,255,0.8)',
    ghost: 'rgba(80,190,255,0.10)',
  },
};

// The Star Forge in Level 2.
export const FORGE_STYLE = {
  core: '#fffbe6',
  mid: 'rgba(255,170,40,0.9)',
  outer: 'rgba(255,70,20,0)',
  rim: 'rgba(255,200,140,0.6)',
  hotFlash: 'rgba(255,200,80,0.95)',
  coldFlash: 'rgba(120,210,255,0.95)',
};
