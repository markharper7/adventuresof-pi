// ---------------------------------------------------------------------------
// VISUAL THEME — everything the canvas draws gets its look from here,
// plus the SVG files in assets/sprites/ and the UI styles in assets/theme.css.
// Swap colours / sprite files here to restyle the game; no game logic lives here.
// ---------------------------------------------------------------------------

// Sprite images (paths are relative to index.html).
export const SPRITES = {
  player: 'assets/sprites/pi-character.svg',
  captain1: 'assets/sprites/npc-captain-one.svg',
  engineer4: 'assets/sprites/npc-engineer-four.svg',
  seven: 'assets/sprites/npc-seven.svg',
  minusThree: 'assets/sprites/npc-minus-three.svg',
  half: 'assets/sprites/npc-half.svg',
  zero: 'assets/sprites/npc-zero.svg',
  rootTwo: 'assets/sprites/npc-root-two.svg',
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
    barrier: 'rgba(120,210,255,0.85)',
    barrierFill: 'rgba(80,170,255,0.16)',
    pod: '#c9d4f5',
    podGlass: '#7fe0ff',
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
};

// Fraction pieces (Level 2 and any future fraction level).
export const PIECE_STYLES = {
  positive: {
    name: 'solar crystal',
    core: '#fff6c8',
    edge: '#ff9a1f',
    stroke: '#ffe08a',
    glow: 'rgba(255,160,40,0.8)',
    ghost: 'rgba(255,170,60,0.10)',
  },
  negative: {
    name: 'ice comet',
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
