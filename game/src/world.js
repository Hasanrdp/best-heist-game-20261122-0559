// The Sapphire Ledger — the world: one room's live state and its rules.
// Collision is circle-versus-rectangle against walls and pillars; sight is a sampled
// ray against the same blockers. Guards and cameras live in their own files and are
// driven from here, so this file stays the single place the rules live.

import { LEVELS, LOOT_KINDS, TUNING } from './config.js';
import { makeGuard, updateGuard } from './guards.js';
import { makeCamera, updateCamera } from './cameras.js';

export function makeWorld(levelIndex) {
  const def = LEVELS[levelIndex];
  return {
    levelIndex,
    def,
    time: 0,
    status: 'play', // play | caught | clear
    thief: { x: def.spawn.x, y: def.spawn.y, angle: 0, sneak: false, moving: false },
    guards: def.guards.map(makeGuard),
    cameras: def.cameras.map(makeCamera),
    alarm: 0,
    peakAlarm: 0,
    lootTaken: false,
    lootProgress: 0,
    sideTaken: def.sideLoot.map(() => false),
    lootValue: 0,
    pebbles: TUNING.pebblesPerLevel,
    smokes: TUNING.smokesPerLevel,
    pebbleFlights: [],
    pebblePings: [],
    smokesClouds: [],
    laserTrippedAt: -10,
    spottedFlash: 0,
    caughtReason: '',
    message: '',
    messageAt: 0,
    seed: 1234 + levelIndex * 777,
  };
}

export function resetWorld(world) {
  const fresh = makeWorld(world.levelIndex);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

// --- geometry helpers -------------------------------------------------------

function rectHitsCircle(rect, x, y, r) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

export function circleHitsSolid(world, x, y, r) {
  for (const wall of world.def.walls) if (rectHitsCircle(wall, x, y, r)) return true;
  for (const pillar of world.def.pillars) if (rectHitsCircle(pillar, x, y, r)) return true;
  return false;
}

// Move a circle with axis separation so it slides along walls instead of sticking.
export function moveCircle(world, body, dx, dy) {
  const nx = body.x + dx;
  if (!circleHitsSolid(world, nx, body.y, body.radius ?? TUNING.thiefRadius)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolid(world, body.x, ny, body.radius ?? TUNING.thiefRadius)) body.y = ny;
}

// Sampled line of sight: true when no wall or pillar crosses the segment.
export function sightClear(world, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    for (const wall of world.def.walls) {
      if (x >= wall.x && x <= wall.x + wall.w && y >= wall.y && y <= wall.y + wall.h) return false;
    }
    for (const pillar of world.def.pillars) {
      if (x >= pillar.x && x <= pillar.x + pillar.w && y >= pillar.y && y <= pillar.y + pillar.h) return false;
    }
  }
  return true;
}

function inSmoke(world, x, y) {
  for (const cloud of world.smokesClouds) {
    if (Math.hypot(x - cloud.x, y - cloud.y) < TUNING.smokeRadius) return true;
  }
  return false;
}

function segmentCrossesSmoke(world, x1, y1, x2, y2) {
  for (const cloud of world.smokesClouds) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((cloud.x - x1) * dx + (cloud.y - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    if (Math.hypot(px - cloud.x, py - cloud.y) < TUNING.smokeRadius * 0.85) return true;
  }
  return false;
}

// Can an observer at (ox, oy) facing `angle` see the thief? Cone, range, line of
// sight and smoke all matter; sneaking shrinks the effective range.
export function observerSees(world, ox, oy, angle, range, halfAngle, thief) {
  const dx = thief.x - ox;
  const dy = thief.y - oy;
  const dist = Math.hypot(dx, dy);
  const effective = thief.sneak ? range * 0.72 : range;
  if (dist > effective) return 0;
  let delta = Math.atan2(dy, dx) - angle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  if (Math.abs(delta) > halfAngle) return 0;
  if (!sightClear(world, ox, oy, thief.x, thief.y)) return 0;
  if (inSmoke(world, thief.x, thief.y) || segmentCrossesSmoke(world, ox, oy, thief.x, thief.y)) return 0;
  return 1 - (dist / effective) * 0.55;
}

function laserOn(world, laser) {
  const cycle = (world.time + laser.phase) % laser.period;
  return cycle < laser.period * 0.62;
}

function thiefCrossesLaser(world, laser) {
  const t = world.thief;
  if (!laserOn(world, laser)) return false;
  const minX = Math.min(laser.x1, laser.x2);
  const maxX = Math.max(laser.x1, laser.x2);
  const minY = Math.min(laser.y1, laser.y2);
  const maxY = Math.max(laser.y1, laser.y2);
  if (laser.y1 === laser.y2) {
    return Math.abs(t.y - laser.y1) < TUNING.thiefRadius + 3 && t.x > minX && t.x < maxX;
  }
  return Math.abs(t.x - laser.x1) < TUNING.thiefRadius + 3 && t.y > minY && t.y < maxY;
}

// --- one fixed step ---------------------------------------------------------

export function stepWorld(world, input, dt) {
  if (world.status !== 'play') return;
  world.time += dt;
  const t = world.thief;

  // Movement: walk or sneak, with a facing that follows the motion.
  const speed = input.sneak ? TUNING.thiefSneak : TUNING.thiefWalk;
  const len = Math.hypot(input.mx, input.my);
  t.moving = len > 0.1;
  t.sneak = input.sneak;
  if (t.moving) {
    const nx = input.mx / (len || 1);
    const ny = input.my / (len || 1);
    t.angle = Math.atan2(ny, nx);
    moveCircle(world, t, nx * speed * dt, ny * speed * dt);
  }

  // Tools.
  if (input.throwPebble && world.pebbles > 0) {
    world.pebbles -= 1;
    world.pebbleFlights.push({
      x: t.x, y: t.y, tx: input.throwPebble.x, ty: input.throwPebble.y, progress: 0,
    });
    world.message = 'Pebble thrown — they heard that.';
    world.messageAt = world.time;
  }
  if (input.smoke && world.smokes > 0) {
    world.smokes -= 1;
    world.smokesClouds.push({ x: t.x, y: t.y, left: TUNING.smokeSeconds });
    world.message = 'Smoke out. Move.';
    world.messageAt = world.time;
  }

  for (const flight of world.pebbleFlights) flight.progress += dt / 0.45;
  const landed = world.pebbleFlights.filter((f) => f.progress >= 1);
  for (const f of landed) {
    world.pebblePings.push({ x: f.tx, y: f.ty, left: 1.6 });
    for (const g of world.guards) {
      if (Math.hypot(g.x - f.tx, g.y - f.ty) < TUNING.pebbleNoiseRadius) {
        g.state = 'investigate';
        g.target = { x: f.tx, y: f.ty };
        g.waitLeft = 0;
      }
    }
  }
  world.pebbleFlights = world.pebbleFlights.filter((f) => f.progress < 1);
  for (const ping of world.pebblePings) ping.left -= dt;
  world.pebblePings = world.pebblePings.filter((p) => p.left > 0);
  for (const cloud of world.smokesClouds) cloud.left -= dt;
  world.smokesClouds = world.smokesClouds.filter((c) => c.left > 0);

  // Side loot is pocketed by walking over it.
  world.def.sideLoot.forEach((item, i) => {
    if (!world.sideTaken[i] && Math.hypot(t.x - item.x, t.y - item.y) < 30) {
      world.sideTaken[i] = true;
      world.lootValue += LOOT_KINDS[item.kind].value;
      world.message = `Pocketed a ${LOOT_KINDS[item.kind].label} (+$${LOOT_KINDS[item.kind].value}).`;
      world.messageAt = world.time;
    }
  });

  // The centrepiece needs a steady hand: hold E beside the pedestal.
  const loot = world.def.mainLoot;
  const nearLoot = Math.hypot(t.x - loot.x, t.y - loot.y) < 52;
  if (!world.lootTaken && nearLoot && input.interact) {
    world.lootProgress += dt / TUNING.lockpickSeconds;
    if (world.lootProgress >= 1) {
      world.lootTaken = true;
      world.lootValue += LOOT_KINDS[loot.kind].value;
      world.message = `${LOOT_KINDS[loot.kind].label} secured (+$${LOOT_KINDS[loot.kind].value}). Get to the exit!`;
      world.messageAt = world.time;
    }
  } else if (!world.lootTaken) {
    world.lootProgress = Math.max(0, world.lootProgress - dt * 2);
  }

  // Lasers: crossing a lit beam trips the alarm and sends the nearest guard over.
  for (const laser of world.def.lasers) {
    if (thiefCrossesLaser(world, laser) && world.time - world.laserTrippedAt > 1.5) {
      world.laserTrippedAt = world.time;
      world.alarm = Math.min(100, world.alarm + TUNING.alarmLaserTrip);
      world.spottedFlash = 0.6;
      world.message = 'Laser tripped! The alarm is climbing.';
      world.messageAt = world.time;
      let nearest = null;
      let best = Infinity;
      for (const g of world.guards) {
        const d = Math.hypot(g.x - t.x, g.y - t.y);
        if (d < best) { best = d; nearest = g; }
      }
      if (nearest) {
        nearest.state = 'investigate';
        nearest.target = { x: t.x, y: t.y };
        nearest.waitLeft = 0;
      }
    }
  }

  // Observers update, then the alarm follows what they see.
  let seen = 0;
  for (const g of world.guards) {
    updateGuard(g, world, dt);
    seen += g.see;
    if (g.see > 0.9 && Math.hypot(g.x - t.x, g.y - t.y) < TUNING.catchDistance) {
      return endCaught(world, 'A guard grabbed you in the dark.');
    }
  }
  for (const c of world.cameras) {
    updateCamera(c, world, dt);
    seen += c.see * 1.5;
  }
  if (seen > 0.05) {
    world.alarm = Math.min(100, world.alarm + seen * TUNING.alarmGain * dt);
    world.spottedFlash = Math.max(world.spottedFlash, Math.min(0.7, seen * 0.25));
  } else {
    world.alarm = Math.max(0, world.alarm - TUNING.alarmDecay * dt);
  }
  world.peakAlarm = Math.max(world.peakAlarm, world.alarm);
  world.spottedFlash = Math.max(0, world.spottedFlash - dt);
  if (world.alarm >= 100) return endCaught(world, 'The alarm hit 100 — the whole bank woke up.');

  // The exit only counts once the centrepiece is in the bag.
  const exit = world.def.exit;
  if (world.lootTaken
    && t.x > exit.x - 6 && t.x < exit.x + exit.w + 6
    && t.y > exit.y - 6 && t.y < exit.y + exit.h + 6) {
    world.status = 'clear';
  }
}

function endCaught(world, reason) {
  world.status = 'caught';
  world.caughtReason = reason;
}
