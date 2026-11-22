// The Sapphire Ledger — configuration: canvas size, palette, tuning and the three rooms.
// Every level is one room the thief crosses in a single frame: walls, pillars, display
// cases, guard patrols, sweeping cameras, loot and the way out. Coordinates are pixels
// on a 1280 x 720 canvas; the room's border is 24 px thick with a door gap at the exit.

export const VIEW = { w: 1280, h: 720 };
export const TILE = 40;

// Art-deco bank at midnight: deep navy marble, brass gold, velvet red, alarm crimson.
export const PALETTE = {
  floorA: '#1c2438',
  floorB: '#202a42',
  floorLine: '#2c3a5c',
  carpet: '#5e1620',
  carpetEdge: '#8a6a2f',
  wall: '#0d1220',
  wallTop: '#3a2f1d',
  brass: '#c9a227',
  brassDim: '#8a6a2f',
  pillar: '#2a3350',
  pillarTop: '#46538a',
  glass: 'rgba(150, 210, 235, 0.16)',
  glassEdge: '#9fd2e8',
  velvet: '#a31621',
  thief: '#e8e4d8',
  thiefCoat: '#23232e',
  guard: '#2f4a7a',
  guardCap: '#1c2f52',
  conePatrol: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlert: 'rgba(255, 60, 50, 0.38)',
  coneCamera: 'rgba(140, 220, 255, 0.20)',
  lootGlow: 'rgba(90, 200, 255, 0.55)',
  goldGlow: 'rgba(255, 200, 80, 0.55)',
  smoke: 'rgba(200, 200, 210, 0.34)',
  alarm: '#ff3b30',
  alarmBg: '#3a0d0d',
  hud: '#e8e4d8',
  hudDim: '#9aa3b8',
  laser: '#ff2244',
  text: '#f2ead8',
};

export const TUNING = {
  thiefWalk: 178,
  thiefSneak: 96,
  thiefRadius: 13,
  guardWalk: 72,
  guardInvestigate: 118,
  guardChase: 176,
  guardRadius: 14,
  guardRange: 270,
  guardHalfAngle: 0.62,
  guardSeeRate: 2.4,
  guardForgetRate: 1.1,
  cameraRange: 330,
  cameraHalfAngle: 0.24,
  cameraSeeRate: 3.2,
  alarmGain: 15,
  alarmDecay: 7,
  alarmLaserTrip: 26,
  suspiciousAt: 0.35,
  alertAt: 0.85,
  lockpickSeconds: 1.2,
  pebblesPerLevel: 3,
  smokesPerLevel: 2,
  pebbleNoiseRadius: 230,
  smokeRadius: 92,
  smokeSeconds: 5,
  catchDistance: 27,
};

// One loot kind per level's centrepiece; side loot is small gems and gold bars.
export const LOOT_KINDS = {
  ledger: { label: 'Sapphire Ledger', value: 500, color: '#5ec8ff', glow: 'lootGlow' },
  star: { label: 'Star Sapphire', value: 750, color: '#7fd4ff', glow: 'lootGlow' },
  gold: { label: 'Halcyon Gold', value: 1000, color: '#ffc850', glow: 'goldGlow' },
  gem: { label: 'Sapphire', value: 150, color: '#5ec8ff', glow: 'lootGlow' },
  bar: { label: 'Gold bar', value: 250, color: '#ffc850', glow: 'goldGlow' },
};

function borderWalls(exit) {
  // Four border walls; the exit side gets a gap where the door stands.
  const walls = [
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 696, w: 1280, h: 24 },
    { x: 0, y: 0, w: 24, h: 720 },
    { x: 1256, y: 0, w: 24, h: 720 },
  ];
  if (exit.side === 'right') walls[3] = { x: 1256, y: 0, w: 24, h: exit.y0 };
  if (exit.side === 'right') walls.push({ x: 1256, y: exit.y1, w: 24, h: 720 - exit.y1 });
  if (exit.side === 'top') walls[0] = { x: 0, y: 0, w: exit.x0, h: 24 };
  if (exit.side === 'top') walls.push({ x: exit.x1, y: 0, w: 1280 - exit.x1, h: 24 });
  return walls;
}

export const LEVELS = [
  {
    name: 'I — The Gallery',
    sub: 'Lift the Sapphire Ledger, then slip out the service door.',
    parSeconds: 75,
    spawn: { x: 92, y: 648 },
    exit: { side: 'right', y0: 312, y1: 408, x: 1216, y: 312, w: 64, h: 96, label: 'SERVICE DOOR' },
    walls: [],
    pillars: [
      { x: 300, y: 180, w: 56, h: 56 },
      { x: 924, y: 180, w: 56, h: 56 },
      { x: 300, y: 484, w: 56, h: 56 },
      { x: 924, y: 484, w: 56, h: 56 },
    ],
    cases: [
      { x: 580, y: 130, w: 120, h: 46 },
      { x: 580, y: 544, w: 120, h: 46 },
      { x: 140, y: 330, w: 46, h: 120 },
      { x: 1094, y: 330, w: 46, h: 120 },
    ],
    ropes: [
      { x1: 560, y1: 250, x2: 720, y2: 250 },
      { x1: 560, y1: 470, x2: 720, y2: 470 },
    ],
    lamps: [
      { x: 200, y: 120, r: 150 },
      { x: 1080, y: 120, r: 150 },
      { x: 200, y: 600, r: 150 },
      { x: 1080, y: 600, r: 150 },
    ],
    guards: [
      { path: [[170, 150], [480, 150], [480, 570], [170, 570]], wait: 1.2 },
      { path: [[1110, 150], [800, 150], [800, 570], [1110, 570]], wait: 1.2 },
    ],
    cameras: [{ x: 640, y: 34, base: Math.PI / 2, arc: 0.85, speed: 0.55, phase: 0 }],
    lasers: [],
    mainLoot: { kind: 'ledger', x: 640, y: 360 },
    sideLoot: [
      { kind: 'gem', x: 640, y: 153 },
      { kind: 'gem', x: 640, y: 567 },
      { kind: 'gem', x: 163, y: 390 },
    ],
    hint: 'Shift sneaks. Q throws a pebble, F drops smoke, hold E at the pedestal to lift the Ledger.',
  },
  {
    name: 'II — The Vault Hall',
    sub: 'The Star Sapphire waits behind the lasers. Mind the cameras.',
    parSeconds: 95,
    spawn: { x: 92, y: 648 },
    exit: { side: 'right', y0: 312, y1: 408, x: 1216, y: 312, w: 64, h: 96, label: 'SERVICE DOOR' },
    walls: [{ x: 540, y: 24, w: 200, h: 40 }],
    pillars: [
      { x: 280, y: 160, w: 56, h: 56 },
      { x: 640, y: 150, w: 56, h: 56 },
      { x: 1000, y: 160, w: 56, h: 56 },
      { x: 280, y: 520, w: 56, h: 56 },
      { x: 640, y: 530, w: 56, h: 56 },
      { x: 1000, y: 520, w: 56, h: 56 },
    ],
    cases: [
      { x: 180, y: 130, w: 120, h: 46 },
      { x: 980, y: 130, w: 120, h: 46 },
      { x: 180, y: 544, w: 120, h: 46 },
      { x: 980, y: 544, w: 120, h: 46 },
    ],
    ropes: [
      { x1: 520, y1: 210, x2: 760, y2: 210 },
      { x1: 520, y1: 470, x2: 760, y2: 470 },
    ],
    lamps: [
      { x: 180, y: 110, r: 150 },
      { x: 1100, y: 110, r: 150 },
      { x: 180, y: 610, r: 150 },
      { x: 1100, y: 610, r: 150 },
      { x: 640, y: 360, r: 190 },
    ],
    guards: [
      { path: [[170, 130], [500, 130], [500, 590], [170, 590]], wait: 1.0 },
      { path: [[1110, 130], [780, 130], [780, 590], [1110, 590]], wait: 1.0 },
      { path: [[640, 250], [640, 620], [400, 620], [880, 620], [880, 250], [400, 250]], wait: 0.8 },
    ],
    cameras: [
      { x: 40, y: 40, base: Math.PI / 4, arc: 0.7, speed: 0.7, phase: 0 },
      { x: 1240, y: 40, base: (3 * Math.PI) / 4, arc: 0.7, speed: 0.7, phase: 1.6 },
    ],
    lasers: [
      { x1: 180, y1: 330, x2: 560, y2: 330, period: 3.2, phase: 0 },
      { x1: 720, y1: 390, x2: 1100, y2: 390, period: 3.2, phase: 1.6 },
    ],
    mainLoot: { kind: 'star', x: 640, y: 120 },
    sideLoot: [
      { kind: 'gem', x: 240, y: 153 },
      { kind: 'gem', x: 1040, y: 153 },
      { kind: 'bar', x: 240, y: 567 },
      { kind: 'bar', x: 1040, y: 567 },
    ],
    hint: 'Lasers blink on a timer — cross while they are dark. Cameras fill the alarm fast.',
  },
  {
    name: 'III — The Rooftop',
    sub: 'Gold bars by the skylight, then up the rope before dawn.',
    parSeconds: 80,
    spawn: { x: 92, y: 648 },
    exit: { side: 'top', x0: 1100, x1: 1196, x: 1100, y: 70, w: 96, h: 64, label: 'SKYLIGHT ROPE' },
    walls: [
      { x: 420, y: 300, w: 180, h: 60 },
      { x: 700, y: 420, w: 180, h: 60 },
    ],
    pillars: [
      { x: 300, y: 160, w: 56, h: 56 },
      { x: 940, y: 500, w: 56, h: 56 },
    ],
    cases: [],
    ropes: [],
    lamps: [
      { x: 640, y: 360, r: 210 },
      { x: 200, y: 200, r: 130 },
      { x: 1120, y: 200, r: 130 },
    ],
    guards: [
      { path: [[200, 150], [640, 150], [640, 480], [200, 480]], wait: 1.0 },
      { path: [[1080, 200], [1080, 560], [760, 560], [760, 200]], wait: 1.0 },
    ],
    cameras: [
      { x: 40, y: 40, base: Math.PI / 4, arc: 0.8, speed: 0.6, phase: 0 },
      { x: 1240, y: 680, base: (-3 * Math.PI) / 4, arc: 0.8, speed: 0.6, phase: 2.0 },
    ],
    lasers: [],
    mainLoot: { kind: 'gold', x: 640, y: 330 },
    sideLoot: [
      { kind: 'bar', x: 240, y: 153 },
      { kind: 'gem', x: 1040, y: 153 },
      { kind: 'bar', x: 240, y: 567 },
    ],
    hint: 'The roof is open — fewer walls, longer sightlines. Use the smoke.',
  },
];

// Fill each level's border walls now so the rest of the code reads one list.
for (const level of LEVELS) {
  level.walls = [...borderWalls(level.exit), ...level.walls];
}

export function levelScore(levelIndex, lootValue, seconds, peakAlarm) {
  const level = LEVELS[levelIndex];
  const timeBonus = Math.max(0, Math.round((level.parSeconds - seconds) * 10));
  const ghostBonus = peakAlarm < 50 ? 300 : 0;
  return { loot: lootValue, time: timeBonus, ghost: ghostBonus, total: lootValue + timeBonus + ghostBonus };
}

export function levelStars(score, levelIndex) {
  const level = LEVELS[levelIndex];
  const maxLoot = LOOT_KINDS[level.mainLoot.kind].value
    + level.sideLoot.reduce((sum, item) => sum + LOOT_KINDS[item.kind].value, 0);
  if (score.total >= maxLoot + 300) return 3;
  if (score.total >= maxLoot) return 2;
  return 1;
}
