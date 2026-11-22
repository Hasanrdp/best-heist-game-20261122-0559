// The Sapphire Ledger — guards: patrol a loop, investigate noises and glimpses, chase
// when they are sure, then give up and walk back. A guard's certainty ("see") rises
// while the thief is inside its vision cone and falls when the thief is out of sight.

import { TUNING } from './config.js';
import { moveCircle, observerSees } from './world.js';

export function makeGuard(def) {
  const start = def.path[0];
  return {
    path: def.path,
    wait: def.wait ?? 1,
    x: start[0],
    y: start[1],
    radius: TUNING.guardRadius,
    angle: 0,
    wp: 1,
    waitLeft: 0,
    state: 'patrol',
    see: 0,
    lastSeen: null,
    target: null,
    chaseLeft: 0,
    scanAngle: 0,
    scanDir: 1,
  };
}

function faceToward(g, x, y) {
  g.angle = Math.atan2(y - g.y, x - g.x);
}

function walkTo(g, world, x, y, speed, dt) {
  const dx = x - g.x;
  const dy = y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  faceToward(g, x, y);
  moveCircle(world, g, (dx / dist) * speed * dt, (dy / dist) * speed * dt);
  return false;
}

export function updateGuard(g, world, dt) {
  const thief = world.thief;

  // How sure is this guard right now? Distance, sneak and light all shape it.
  const clarity = observerSees(
    world, g.x, g.y, g.angle, TUNING.guardRange, TUNING.guardHalfAngle, thief,
  );
  if (clarity > 0) {
    const rate = TUNING.guardSeeRate * (0.35 + clarity);
    g.see = Math.min(1, g.see + rate * dt);
    g.lastSeen = { x: thief.x, y: thief.y };
  } else {
    g.see = Math.max(0, g.see - TUNING.guardForgetRate * dt);
  }

  if (g.see >= TUNING.alertAt && g.state !== 'chase') {
    g.state = 'chase';
    g.chaseLeft = 3;
  } else if (g.see >= TUNING.suspiciousAt && g.state === 'patrol') {
    g.state = 'investigate';
    g.target = g.lastSeen ? { ...g.lastSeen } : { x: thief.x, y: thief.y };
    g.waitLeft = 0;
  }

  if (g.state === 'chase') {
    if (g.see > 0.05) g.chaseLeft = 3;
    else g.chaseLeft -= dt;
    if (g.chaseLeft <= 0) {
      g.state = 'investigate';
      g.target = g.lastSeen ? { ...g.lastSeen } : { x: g.x, y: g.y };
      g.waitLeft = 0;
    } else {
      walkTo(g, world, thief.x, thief.y, TUNING.guardChase, dt);
    }
    return;
  }

  if (g.state === 'investigate') {
    if (!g.target) {
      g.state = 'patrol';
      return;
    }
    if (walkTo(g, world, g.target.x, g.target.y, TUNING.guardInvestigate, dt)) {
      // Arrived: look around for a moment, then head back to the route.
      g.waitLeft += dt;
      g.angle += g.scanDir * 1.6 * dt;
      if (g.waitLeft > 2.2) {
        g.state = 'return';
        g.target = null;
      }
    }
    return;
  }

  if (g.state === 'return') {
    // Walk to the nearest waypoint, then resume the loop from there.
    let best = 0;
    let bestDist = Infinity;
    g.path.forEach((p, i) => {
      const d = Math.hypot(p[0] - g.x, p[1] - g.y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    if (walkTo(g, world, g.path[best][0], g.path[best][1], TUNING.guardWalk, dt)) {
      g.wp = (best + 1) % g.path.length;
      g.state = 'patrol';
    }
    return;
  }

  // Patrol: walk the loop, pausing at each corner to look around.
  const point = g.path[g.wp];
  if (g.waitLeft > 0) {
    g.waitLeft -= dt;
    g.angle += g.scanDir * 0.9 * dt;
    if (g.waitLeft <= 0) g.wp = (g.wp + 1) % g.path.length;
    return;
  }
  if (walkTo(g, world, point[0], point[1], TUNING.guardWalk, dt)) {
    g.waitLeft = g.wait;
    g.scanDir = g.scanDir === 1 ? -1 : 1;
  }
}

// The cone a guard projects, for the renderer: origin, facing, range and half-angle.
export function guardCone(g) {
  return {
    x: g.x, y: g.y, angle: g.angle, range: TUNING.guardRange, half: TUNING.guardHalfAngle,
    hot: g.state === 'chase' ? 'alert' : g.see >= TUNING.suspiciousAt ? 'suspicious' : 'patrol',
  };
}
