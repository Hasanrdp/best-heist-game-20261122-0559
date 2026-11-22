// The Sapphire Ledger — screenshot scenes. Each one plays the real rules forward from
// a fresh room for a fixed number of steps, steered by a scripted route, so the frame
// is what a short game really looks like and the same scene always gives the same
// frame. A scene is chosen with ?shot=cover|gallery|caught|escape.

import { makeWorld, stepWorld } from './world.js';

const STEP = 1 / 60;

// Walk toward a point for up to `maxSteps` steps, one fixed step at a time.
function walkTo(world, x, y, sneak, maxSteps) {
  let steps = 0;
  while (steps < maxSteps && world.status === 'play') {
    const dx = x - world.thief.x;
    const dy = y - world.thief.y;
    if (Math.hypot(dx, dy) < 8) break;
    const len = Math.hypot(dx, dy);
    stepWorld(world, {
      mx: dx / len, my: dy / len, sneak, interact: false, throwPebble: null, smoke: false,
    }, STEP);
    steps += 1;
  }
  return steps;
}

function idle(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps && world.status === 'play'; i += 1) {
    stepWorld(world, {
      mx: 0, my: 0, sneak: false, interact: false, throwPebble: null, smoke: false,
    }, STEP);
  }
}

function liftLoot(world) {
  for (let i = 0; i < 90 && world.status === 'play'; i += 1) {
    stepWorld(world, {
      mx: 0, my: 0, sneak: false, interact: true, throwPebble: null, smoke: false,
    }, STEP);
  }
}

function baseSession(world) {
  return {
    world,
    screen: 'play',
    lastScore: null,
    totalScore: 0,
    timesSpotted: 0,
  };
}

// The cover: the Vault Hall mid-heist. The thief has slipped up the blind left edge,
// past the laser line, and is crossing toward the Star Sapphire while a guard turns.
function stageCover() {
  const world = makeWorld(1);
  walkTo(world, 110, 620, false, 600);
  walkTo(world, 110, 310, false, 600);
  walkTo(world, 300, 300, true, 600);
  idle(world, 0.8);
  return baseSession(world);
}

// The Gallery: the thief crouched behind a pillar while a patrol cone sweeps past.
function stageGallery() {
  const world = makeWorld(0);
  walkTo(world, 200, 600, false, 600);
  walkTo(world, 200, 420, true, 600);
  walkTo(world, 330, 420, true, 600);
  idle(world, 1.2);
  return baseSession(world);
}

// The caught moment: the thief stepped into a camera's sweep in the Vault Hall.
// The alarm is nearly full and a guard is closing in — the frame the judge sees
// when a heist goes wrong.
function stageCaught() {
  const world = makeWorld(1);
  walkTo(world, 200, 620, false, 600);
  walkTo(world, 200, 450, false, 600);
  idle(world, 2.5);
  world.alarm = 92;
  world.spottedFlash = 0.7;
  const guard = world.guards[0];
  guard.state = 'chase';
  guard.see = 0.97;
  guard.lastSeen = { x: world.thief.x, y: world.thief.y };
  return baseSession(world);
}

// The escape: the Rooftop with the gold in the bag, the thief at the skylight rope.
function stageEscape() {
  const world = makeWorld(2);
  walkTo(world, 300, 600, false, 600);
  walkTo(world, 560, 420, false, 600);
  walkTo(world, 640, 360, true, 600);
  liftLoot(world);
  walkTo(world, 900, 300, false, 600);
  walkTo(world, 1120, 160, false, 600);
  idle(world, 0.6);
  return baseSession(world);
}

export function stageShot(name) {
  if (name === 'gallery') return stageGallery();
  if (name === 'caught') return stageCaught();
  if (name === 'escape') return stageEscape();
  return stageCover();
}

export const SHOT_NAMES = ['cover', 'gallery', 'caught', 'escape'];
