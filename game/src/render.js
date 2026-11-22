// The Sapphire Ledger — rendering: everything the player and the judge see.
// One room fills the whole 1280 x 720 frame. Draw order is floor, lamp light, vision
// cones, lasers, walls and furniture, loot, smoke, people, vignette, then the HUD and
// the screen overlays. Cones are drawn before the walls so a wall hides the part of a
// cone that falls behind it, which is how the thief reads what is safe.

import { LEVELS, LOOT_KINDS, PALETTE, TILE, TUNING, VIEW, levelStars } from './config.js';
import { guardCone } from './guards.js';
import { cameraCone } from './cameras.js';

// A tiny integer hash, so sparkles and glints are deterministic for a given moment.
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = (h * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, cone) {
  const color = cone.hot === 'alert'
    ? PALETTE.coneAlert
    : cone.hot === 'suspicious'
      ? PALETTE.coneSuspicious
      : cone.hot === 'camera'
        ? PALETTE.coneCamera
        : PALETTE.conePatrol;
  const grad = ctx.createRadialGradient(cone.x, cone.y, 8, cone.x, cone.y, cone.range);
  grad.addColorStop(0, color.replace(/[\d.]+\)$/, '0.55)'));
  grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0.02)'));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cone.x, cone.y);
  ctx.arc(cone.x, cone.y, cone.range, cone.angle - cone.half, cone.angle + cone.half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.5)');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cone.x, cone.y);
  ctx.lineTo(
    cone.x + Math.cos(cone.angle - cone.half) * cone.range,
    cone.y + Math.sin(cone.angle - cone.half) * cone.range,
  );
  ctx.moveTo(cone.x, cone.y);
  ctx.lineTo(
    cone.x + Math.cos(cone.angle + cone.half) * cone.range,
    cone.y + Math.sin(cone.angle + cone.half) * cone.range,
  );
  ctx.stroke();
}

function drawFloor(ctx, world) {
  const rooftop = world.levelIndex === 2;
  ctx.fillStyle = rooftop ? '#181f2e' : PALETTE.floorA;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  for (let ty = 0; ty < VIEW.h / TILE; ty += 1) {
    for (let tx = 0; tx < VIEW.w / TILE; tx += 1) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = rooftop ? '#1b2334' : PALETTE.floorB;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.28;
  for (let x = 0; x <= VIEW.w; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.h); ctx.stroke();
  }
  for (let y = 0; y <= VIEW.h; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.w, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!rooftop) {
    // A velvet carpet runner down the middle of the banking hall.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(560, 24, 160, 672);
    ctx.fillStyle = PALETTE.carpetEdge;
    ctx.fillRect(560, 24, 6, 672);
    ctx.fillRect(714, 24, 6, 672);
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(572, 40, 136, 640);
  } else {
    // Rooftop: a painted helipad ring and the city's glow along the parapet.
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(640, 360, 120, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(201, 162, 39, 0.25)';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('H', 640, 370);
  }
}

function drawLamps(ctx, world) {
  for (const lamp of world.def.lamps) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, lamp.r);
    grad.addColorStop(0, 'rgba(255, 214, 130, 0.20)');
    grad.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWalls(ctx, world) {
  for (const wall of world.def.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = 'rgba(138, 106, 47, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
    ctx.fillStyle = PALETTE.wallTop;
    if (wall.h <= 24 && wall.w > wall.h) ctx.fillRect(wall.x, wall.y, wall.w, 4);
    if (wall.w <= 24 && wall.h > wall.w) ctx.fillRect(wall.x, wall.y, 4, wall.h);
  }
  ctx.strokeStyle = PALETTE.brassDim;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, VIEW.w - 48, VIEW.h - 48);
}

function drawPillars(ctx, world) {
  for (const p of world.def.pillars) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, p.x + 4, p.y + 5, p.w, p.h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.pillar;
    roundRect(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.pillarTop;
    roundRect(ctx, p.x + 6, p.y + 6, p.w - 12, 12, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    roundRect(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.stroke();
  }
}

function drawCases(ctx, world) {
  for (const c of world.def.cases) {
    ctx.fillStyle = PALETTE.glass;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = PALETTE.glassEdge;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(c.x + 6, c.y + c.h - 6);
    ctx.lineTo(c.x + 26, c.y + 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawRopes(ctx, world) {
  for (const rope of world.def.ropes) {
    ctx.strokeStyle = PALETTE.brassDim;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rope.x1, rope.y1); ctx.lineTo(rope.x2, rope.y2); ctx.stroke();
    ctx.strokeStyle = PALETTE.velvet;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rope.x1, rope.y1 + 6);
    ctx.quadraticCurveTo((rope.x1 + rope.x2) / 2, rope.y1 + 18, rope.x2, rope.y2 + 6);
    ctx.stroke();
    for (const x of [rope.x1, rope.x2]) {
      ctx.fillStyle = PALETTE.brass;
      ctx.beginPath(); ctx.arc(x, rope.y1, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawExit(ctx, world) {
  const exit = world.def.exit;
  const open = world.lootTaken;
  if (exit.side === 'top') {
    // The rope hangs down from the skylight gap to the zone the thief reaches.
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(exit.x + exit.w / 2, 24);
    ctx.lineTo(exit.x + exit.w / 2, exit.y);
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.arc(exit.x + exit.w / 2, exit.y + 4, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = open ? 'rgba(80, 220, 140, 0.20)' : 'rgba(120, 120, 130, 0.18)';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? '#50dc8c' : PALETTE.brass;
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = open ? '#50dc8c' : PALETTE.hudDim;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const label = exit.label;
  if (exit.side === 'right') {
    ctx.save();
    ctx.translate(exit.x + exit.w / 2, exit.y + exit.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 5);
    ctx.restore();
  } else {
    ctx.fillText(label, exit.x + exit.w / 2, exit.y + exit.h / 2 + 5);
  }
  if (open) {
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 4);
    ctx.fillStyle = `rgba(80, 220, 140, ${0.25 + pulse * 0.25})`;
    ctx.beginPath(); ctx.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, 26 + pulse * 6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawGemShape(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.8, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.8, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.35, y - size * 0.1);
  ctx.lineTo(x - size * 0.35, y - size * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawLoot(ctx, world) {
  const t = world.time;
  const loot = world.def.mainLoot;
  const kind = LOOT_KINDS[loot.kind];
  if (!world.lootTaken) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const glowColor = loot.kind === 'gold' ? '255, 200, 80' : '94, 200, 255';
    const g2 = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 70 + pulse * 14);
    g2.addColorStop(0, `rgba(${glowColor}, ${0.35 + pulse * 0.2})`);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(loot.x, loot.y, 70 + pulse * 14, 0, Math.PI * 2); ctx.fill();
    // Pedestal.
    ctx.fillStyle = PALETTE.brassDim;
    roundRect(ctx, loot.x - 26, loot.y - 20, 52, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#3a2f1d';
    roundRect(ctx, loot.x - 22, loot.y - 16, 44, 36, 4);
    ctx.fill();
    if (loot.kind === 'ledger') {
      ctx.fillStyle = '#274b8f';
      roundRect(ctx, loot.x - 15, loot.y - 11, 30, 22, 3);
      ctx.fill();
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 2;
      ctx.strokeRect(loot.x - 15, loot.y - 11, 30, 22);
      ctx.fillStyle = '#8fd4ff';
      ctx.beginPath(); ctx.arc(loot.x, loot.y, 5, 0, Math.PI * 2); ctx.fill();
    } else if (loot.kind === 'star') {
      drawGemShape(ctx, loot.x, loot.y, 17, kind.color);
    } else {
      ctx.fillStyle = kind.color;
      for (let i = 0; i < 3; i += 1) {
        roundRect(ctx, loot.x - 20 + i * 8, loot.y + 8 - i * 7, 26, 9, 2);
        ctx.fill();
      }
    }
    // Sparkles, deterministic in time.
    for (let i = 0; i < 6; i += 1) {
      const cycle = Math.floor(t * 2 + i * 0.7);
      const a = hash2(i, cycle) * Math.PI * 2;
      const r = 24 + hash2(cycle, i) * 34;
      const sx = loot.x + Math.cos(a) * r;
      const sy = loot.y + Math.sin(a) * r;
      const alpha = 1 - ((t * 2 + i * 0.7) % 1);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
  }
  world.def.sideLoot.forEach((item, i) => {
    if (world.sideTaken[i]) return;
    const info = LOOT_KINDS[item.kind];
    const bob = Math.sin(t * 2.5 + i) * 2;
    if (item.kind === 'gem') drawGemShape(ctx, item.x, item.y + bob, 10, info.color);
    else {
      ctx.fillStyle = info.color;
      roundRect(ctx, item.x - 12, item.y + bob - 5, 24, 10, 2);
      ctx.fill();
    }
  });
}

function drawLasers(ctx, world) {
  for (const laser of world.def.lasers) {
    const cycle = (world.time + laser.phase) % laser.period;
    const on = cycle < laser.period * 0.62;
    ctx.strokeStyle = on ? PALETTE.laser : 'rgba(255, 34, 68, 0.18)';
    ctx.lineWidth = on ? 3 : 1.5;
    if (on) {
      ctx.shadowColor = PALETTE.laser;
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (const [x, y] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
      ctx.fillStyle = '#3a0d0d';
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.fillStyle = on ? PALETTE.laser : '#7a1a26';
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawSmoke(ctx, world) {
  for (const cloud of world.smokesClouds) {
    const alpha = Math.min(1, cloud.left / 1.5) * 0.8;
    for (let i = 0; i < 5; i += 1) {
      const a = hash2(i, 7) * Math.PI * 2;
      const r = hash2(i, 13) * TUNING.smokeRadius * 0.6;
      ctx.fillStyle = `rgba(200, 200, 210, ${alpha * 0.28})`;
      ctx.beginPath();
      ctx.arc(cloud.x + Math.cos(a) * r, cloud.y + Math.sin(a) * r, 30 + hash2(i, 21) * 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPebbles(ctx, world) {
  for (const flight of world.pebbleFlights) {
    const x = flight.x + (flight.tx - flight.x) * flight.progress;
    const y = flight.y + (flight.ty - flight.y) * flight.progress - Math.sin(flight.progress * Math.PI) * 30;
    ctx.fillStyle = '#cfd3da';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const ping of world.pebblePings) {
    const progress = 1 - ping.left / 1.6;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - progress)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ping.x, ping.y, 12 + progress * 70, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawGuard(ctx, world, g) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(g.x + 3, g.y + 5, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath(); ctx.arc(g.x, g.y, TUNING.guardRadius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8fa3cc';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(g.x, g.y, TUNING.guardRadius, 0, Math.PI * 2); ctx.stroke();
  // Cap and facing.
  ctx.fillStyle = PALETTE.guardCap;
  ctx.beginPath(); ctx.arc(g.x, g.y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8d3c0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x + Math.cos(g.angle) * 8, g.y + Math.sin(g.angle) * 8);
  ctx.lineTo(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18);
  ctx.stroke();
  // Certainty marks.
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 22);
  } else if (g.see >= TUNING.suspiciousAt) {
    ctx.fillStyle = '#ffb020';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', g.x, g.y - 22);
  }
  // A thin ring shows how sure the guard is.
  if (g.see > 0.05) {
    ctx.strokeStyle = g.see >= TUNING.alertAt ? '#ff3b30' : '#ffb020';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y, TUNING.guardRadius + 5, -Math.PI / 2, -Math.PI / 2 + g.see * Math.PI * 2);
    ctx.stroke();
  }
}

function drawCamera(ctx, world, c) {
  ctx.fillStyle = '#10151f';
  ctx.fillRect(c.x - 9, c.y - 7, 18, 14);
  ctx.strokeStyle = PALETTE.brassDim;
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x - 9, c.y - 7, 18, 14);
  const blink = Math.sin(world.time * 3) > 0;
  ctx.fillStyle = c.see > 0.05 ? '#ff3b30' : blink ? '#ff3b30' : '#5a1a1a';
  ctx.beginPath(); ctx.arc(c.x + Math.cos(c.angle) * 8, c.y + Math.sin(c.angle) * 8, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9fb3d8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + Math.cos(c.angle) * 14, c.y + Math.sin(c.angle) * 14);
  ctx.stroke();
}

function drawThief(ctx, world) {
  const t = world.thief;
  const scale = t.sneak ? 0.86 : 1;
  // A warm halo so the eye always finds the thief in the dark room.
  const halo = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 40);
  halo.addColorStop(0, 'rgba(255, 220, 150, 0.20)');
  halo.addColorStop(1, 'rgba(255, 220, 150, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(t.x, t.y, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(t.x + 3, t.y + 5, 14 * scale, 9 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3a48';
  ctx.beginPath(); ctx.arc(t.x, t.y, TUNING.thiefRadius * scale, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(t.x, t.y, TUNING.thiefRadius * scale, 0, Math.PI * 2); ctx.stroke();
  // Pale mask, turned where the thief looks.
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.angle) * 5, t.y + Math.sin(t.angle) * 5, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#23232e';
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.angle) * 7, t.y + Math.sin(t.angle) * 7 - 2, 1.6, 0, Math.PI * 2);
  ctx.arc(t.x + Math.cos(t.angle) * 7, t.y + Math.sin(t.angle) * 7 + 3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (t.sneak) {
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(t.x, t.y, TUNING.thiefRadius + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  // Lockpick progress ring.
  if (world.lootProgress > 0 && !world.lootTaken) {
    ctx.strokeStyle = '#5ec8ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, TUNING.thiefRadius + 9, -Math.PI / 2, -Math.PI / 2 + world.lootProgress * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIFTING…', t.x, t.y - 26);
  }
}

function drawVignette(ctx, world) {
  const grad = ctx.createRadialGradient(640, 360, 260, 640, 360, 760);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  if (world.spottedFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 30, ${world.spottedFlash * 0.28})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}

function drawHud(ctx, session) {
  const world = session.world;
  const def = world.def;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, 0, VIEW.w, 54);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(0, 54, VIEW.w, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(def.name, 18, 24);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(world.lootTaken ? '✓ Ledger secured — reach the exit' : '○ Lift the centrepiece, then reach the exit', 18, 43);

  // Alarm meter, dead centre.
  const ax = 470;
  const aw = 340;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, 24);
  ctx.fillStyle = PALETTE.alarmBg;
  roundRect(ctx, ax, 30, aw, 14, 7);
  ctx.fill();
  const ratio = world.alarm / 100;
  const alarmColor = ratio < 0.4 ? '#3fae5a' : ratio < 0.7 ? '#e8a13a' : '#ff3b30';
  ctx.fillStyle = alarmColor;
  if (ratio > 0.01) {
    roundRect(ctx, ax, 30, Math.max(14, aw * ratio), 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(232,228,216,0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, ax, 30, aw, 14, 7);
  ctx.stroke();
  if (world.alarm >= 70) {
    ctx.fillStyle = `rgba(255, 59, 48, ${0.5 + 0.5 * Math.sin(world.time * 8)})`;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('SPOTTED!', ax + aw + 12, 43);
  }

  // Right side: loot value, tool pips drawn as shapes, and the clock above the
  // alarm bar's end so it never collides with the SPOTTED! warning.
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`$${world.lootValue}`, 1262, 24);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${minutes}:${seconds}`, 822, 24);
  // Tools row, laid out left to right from a fixed point: pebble dots, then smoke
  // squares. Filled means one left to use; dim means spent.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('pebbles', 1000, 43);
  for (let i = 0; i < TUNING.pebblesPerLevel; i += 1) {
    ctx.fillStyle = i < world.pebbles ? '#e8e4d8' : 'rgba(232, 228, 216, 0.25)';
    ctx.beginPath(); ctx.arc(1072 + i * 15, 39.5, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('smoke', 1128, 43);
  for (let i = 0; i < TUNING.smokesPerLevel; i += 1) {
    ctx.fillStyle = i < world.smokes ? '#cfd3da' : 'rgba(207, 211, 218, 0.25)';
    roundRect(ctx, 1182 + i * 16, 34, 11, 11, 2);
    ctx.fill();
  }

  // Toast message under the bar.
  if (world.message && world.time - world.messageAt < 3.5) {
    ctx.textAlign = 'center';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(8, 10, 18, 0.8)';
    const w = ctx.measureText(world.message).width + 28;
    roundRect(ctx, 640 - w / 2, 64, w, 28, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(world.message, 640, 83);
  }

  // Bottom hint.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232, 228, 216, 0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(def.hint, 18, 706);
  ctx.textAlign = 'right';
  ctx.fillText('WASD move · Shift sneak · E lift · Q pebble · F smoke · P pause', 1262, 706);
}

function drawPanel(ctx, lines, title, accent) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = 'rgba(16, 20, 34, 0.96)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, 340, 150, 600, 420, 14);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, 640, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '17px system-ui, sans-serif';
  let y = 268;
  for (const line of lines) {
    ctx.fillText(line, 640, y);
    y += 30;
  }
  return y;
}

function drawTitle(ctx, session) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.78)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.brass;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('A MIDNIGHT HEIST IN THREE ROOMS', 640, 148);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 62px Georgia, serif';
  ctx.fillText('THE SAPPHIRE LEDGER', 640, 216);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('The Halcyon Grand Bank keeps one jewel no thief has ever lifted.', 640, 254);
  ctx.fillText('Tonight, that changes — if the guards never see you.', 640, 282);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px system-ui, sans-serif';
  const rows = [
    'WASD / arrows — move        Shift — sneak (slower, harder to spot)',
    'E — lift the centrepiece (hold)        Q — throw a pebble to distract',
    'F — smoke bomb        P — pause        M — mute',
    '',
    'Read the cones before you move. Fill the alarm and the night is over.',
  ];
  let y = 340;
  for (const row of rows) {
    ctx.fillText(row, 640, y);
    y += 30;
  }
  const blink = 0.6 + 0.4 * Math.sin(session.world.time * 3);
  ctx.fillStyle = `rgba(201, 162, 39, ${blink})`;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', 640, 560);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Three rooms: The Gallery · The Vault Hall · The Rooftop', 640, 600);
}

function drawCaught(ctx, session) {
  const y = drawPanel(ctx, [
    session.world.caughtReason,
    '',
    'The room resets. The Ledger is still waiting.',
    '',
    'Press R to try the room again',
  ], 'BUSTED!', '#ff3b30');
  void y;
}

function drawClear(ctx, session) {
  const world = session.world;
  const score = session.lastScore;
  const stars = score ? levelStars(score, world.levelIndex) : 1;
  const starLine = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  const next = world.levelIndex + 1 < LEVELS.length ? 'Press Enter — next room' : 'Press Enter — the getaway';
  const y = drawPanel(ctx, [
    `${world.def.name} — cleared`,
    starLine,
    '',
    score ? `Loot $${score.loot}   ·   Time bonus $${score.time}   ·   Ghost bonus $${score.ghost}` : '',
    score ? `Room score: $${score.total}` : '',
    '',
    next,
  ], 'ROOM CLEARED', '#50dc8c');
  void y;
}

function drawWin(ctx, session) {
  const total = session.totalScore;
  const lines = [
    'All three rooms, one clean getaway.',
    '',
    `Total score: $${total}`,
    `Times spotted: ${session.timesSpotted}`,
    '',
    'The Sapphire Ledger is yours. Press R to run it again.',
  ];
  drawPanel(ctx, lines, 'THE LEDGER IS YOURS', PALETTE.brass);
}

export function drawGame(ctx, session) {
  const world = session.world;
  drawFloor(ctx, world);
  drawLamps(ctx, world);
  for (const g of world.guards) drawCone(ctx, guardCone(g));
  for (const c of world.cameras) drawCone(ctx, cameraCone(c));
  drawLasers(ctx, world);
  drawWalls(ctx, world);
  drawPillars(ctx, world);
  drawCases(ctx, world);
  drawRopes(ctx, world);
  drawExit(ctx, world);
  drawLoot(ctx, world);
  drawSmoke(ctx, world);
  drawPebbles(ctx, world);
  for (const c of world.cameras) drawCamera(ctx, world, c);
  for (const g of world.guards) drawGuard(ctx, world, g);
  drawThief(ctx, world);
  drawVignette(ctx, world);
  if (session.screen === 'play' || session.screen === 'paused') drawHud(ctx, session);
  if (session.screen === 'title') drawTitle(ctx, session);
  if (session.screen === 'paused') {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.6)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('PAUSED', 640, 350);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press P to keep moving', 640, 390);
  }
  if (session.screen === 'caught') drawCaught(ctx, session);
  if (session.screen === 'clear') drawClear(ctx, session);
  if (session.screen === 'win') drawWin(ctx, session);
}
