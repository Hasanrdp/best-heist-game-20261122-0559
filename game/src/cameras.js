// The Sapphire Ledger — cameras: wall-mounted, sweeping a fixed arc, with a narrow
// cone that fills the alarm far faster than a guard's glance. A camera never moves
// from its mount; it only turns, so its sweep is fully predictable — read it, then move.

import { TUNING } from './config.js';
import { observerSees } from './world.js';

export function makeCamera(def) {
  return {
    x: def.x,
    y: def.y,
    base: def.base,
    arc: def.arc,
    speed: def.speed,
    phase: def.phase ?? 0,
    angle: def.base,
    see: 0,
  };
}

export function updateCamera(c, world, dt) {
  c.angle = c.base + c.arc * Math.sin(world.time * c.speed + c.phase);
  const clarity = observerSees(
    world, c.x, c.y, c.angle, TUNING.cameraRange, TUNING.cameraHalfAngle, world.thief,
  );
  if (clarity > 0) {
    c.see = Math.min(1, c.see + TUNING.cameraSeeRate * (0.4 + clarity) * dt);
  } else {
    c.see = Math.max(0, c.see - TUNING.guardForgetRate * dt);
  }
}

// The cone a camera projects, for the renderer.
export function cameraCone(c) {
  return {
    x: c.x, y: c.y, angle: c.angle, range: TUNING.cameraRange, half: TUNING.cameraHalfAngle,
    hot: c.see >= TUNING.suspiciousAt ? 'alert' : 'camera',
  };
}
