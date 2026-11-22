// The Sapphire Ledger — the game itself: the loop, the screens and the scoring.
// Title -> play -> caught / clear -> next room -> win. A room is retried on R after
// being caught; clearing all three rooms ends the run with a total score.

import { LEVELS, VIEW, levelScore } from './config.js';
import { makeWorld, resetWorld, stepWorld } from './world.js';
import { drawGame } from './render.js';
import { consumeKey, makeInput, readActions, readMove } from './input.js';
import { stageShot } from './shots.js';
import {
  ensureAudio, playAlert, playBigLoot, playCaught, playClear, playClick,
  playLaser, playPebble, playPickup, toggleMute,
} from './audio.js';

const STEP = 1 / 60;

function makeSession() {
  return {
    world: makeWorld(0),
    screen: 'title',
    lastScore: null,
    totalScore: 0,
    timesSpotted: 0,
    spottedBefore: false,
    runTime: 0,
  };
}

function startRoom(session, levelIndex) {
  session.world = makeWorld(levelIndex);
  session.screen = 'play';
  session.lastScore = null;
  session.spottedBefore = false;
}

function clearRoom(session) {
  const world = session.world;
  const score = levelScore(world.levelIndex, world.lootValue, world.time, world.peakAlarm);
  session.lastScore = score;
  session.totalScore += score.total;
  session.screen = 'clear';
  playClear();
}

function winRun(session) {
  session.screen = 'win';
  playClear();
}

function caughtRoom(session) {
  session.screen = 'caught';
  session.timesSpotted += 1;
  playCaught();
}

export function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW.w;
  canvas.height = VIEW.h;
  const ctx = canvas.getContext('2d');
  const input = makeInput(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');

  // Screenshot mode: stage one deterministic scene, draw it once, stop.
  if (shot) {
    const session = stageShot(shot);
    drawGame(ctx, session);
    window.__shotReady = true;
    document.title = `The Sapphire Ledger — ${shot}`;
    return;
  }

  const session = makeSession();
  let last = performance.now();
  let acc = 0;
  let alarmWasHigh = false;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    const actions = readActions(input);

    if (actions.mute) toggleMute();
    if (actions.confirm || actions.click) ensureAudio();

    if (session.screen === 'title') {
      // The title drifts: guards patrol behind the overlay.
      acc += dt;
      while (acc >= STEP) {
        stepWorld(session.world, {
          mx: 0, my: 0, sneak: false, interact: false, throwPebble: null, smoke: false,
        }, STEP);
        acc -= STEP;
      }
      if (actions.confirm || actions.click) {
        playClick();
        startRoom(session, 0);
      }
      drawGame(ctx, session);
      return;
    }

    if (session.screen === 'paused') {
      if (actions.pause || actions.confirm) session.screen = 'play';
      drawGame(ctx, session);
      return;
    }

    if (session.screen === 'caught') {
      if (actions.retry || actions.confirm) {
        playClick();
        startRoom(session, session.world.levelIndex);
      }
      drawGame(ctx, session);
      return;
    }

    if (session.screen === 'clear') {
      if (actions.confirm || actions.click) {
        playClick();
        const next = session.world.levelIndex + 1;
        if (next < LEVELS.length) startRoom(session, next);
        else winRun(session);
      }
      drawGame(ctx, session);
      return;
    }

    if (session.screen === 'win') {
      if (actions.retry) {
        playClick();
        const fresh = makeSession();
        session.world = fresh.world;
        session.screen = 'title';
        session.lastScore = null;
        session.totalScore = 0;
        session.timesSpotted = 0;
      }
      drawGame(ctx, session);
      return;
    }

    // Playing.
    if (actions.pause) {
      session.screen = 'paused';
      drawGame(ctx, session);
      return;
    }

    const move = readMove(input);
    const pebbleTarget = actions.throwPebble && session.world.pebbles > 0
      ? { x: input.mouse.x, y: input.mouse.y }
      : null;
    if (pebbleTarget) playPebble();

    acc += dt;
    let firstStep = true;
    while (acc >= STEP) {
      const before = session.world.lootValue;
      const beforeAlarm = session.world.alarm;
      stepWorld(session.world, {
        mx: move.mx,
        my: move.my,
        sneak: move.sneak,
        interact: actions.interact,
        // Q and F are single presses: fire them on the first step only, so holding
        // the key through several fixed steps cannot spend the whole stock at once.
        throwPebble: firstStep ? pebbleTarget : null,
        smoke: firstStep && actions.smoke,
      }, STEP);
      firstStep = false;
      acc -= STEP;
      if (session.world.lootValue > before) {
        if (session.world.lootTaken) playBigLoot();
        else playPickup();
      }
      if (beforeAlarm < 70 && session.world.alarm >= 70 && !alarmWasHigh) {
        alarmWasHigh = true;
        playAlert();
      }
      if (session.world.alarm < 40) alarmWasHigh = false;
      if (session.world.laserTrippedAt > 0 && session.world.time - session.world.laserTrippedAt < STEP * 1.5) {
        playLaser();
      }
      if (session.world.status === 'caught') {
        caughtRoom(session);
        break;
      }
      if (session.world.status === 'clear') {
        clearRoom(session);
        break;
      }
    }
    session.runTime += dt;
    drawGame(ctx, session);
  }

  // Keep the mute key from sticking: it is handled above each frame.
  void consumeKey;
  requestAnimationFrame(frame);
}

boot();
