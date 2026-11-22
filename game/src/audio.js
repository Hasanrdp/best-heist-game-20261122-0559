// The Sapphire Ledger — sound: everything is synthesised with WebAudio, no audio files.
// A soft chime for loot, a rising sting when the alarm climbs, a low thud for a pebble
// landing and a short fanfare when a room is cleared. Silent until the first gesture.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const audio = ensureAudio();
  if (!audio) return;
  const start = audio.currentTime + when;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

export function playPickup() {
  tone(880, 0.12, 'sine', 0.16);
  tone(1318, 0.18, 'sine', 0.14, 0.07);
}

export function playBigLoot() {
  tone(659, 0.14, 'sine', 0.16);
  tone(880, 0.14, 'sine', 0.16, 0.09);
  tone(1174, 0.22, 'sine', 0.16, 0.18);
  tone(1568, 0.3, 'sine', 0.12, 0.27);
}

export function playAlert() {
  tone(220, 0.5, 'sawtooth', 0.1, 0, 440);
  tone(233, 0.5, 'sawtooth', 0.08, 0.05, 466);
}

export function playCaught() {
  tone(392, 0.25, 'square', 0.1, 0, 196);
  tone(311, 0.4, 'square', 0.1, 0.2, 155);
  tone(233, 0.7, 'square', 0.1, 0.45, 110);
}

export function playClear() {
  tone(523, 0.16, 'triangle', 0.16);
  tone(659, 0.16, 'triangle', 0.16, 0.12);
  tone(784, 0.16, 'triangle', 0.16, 0.24);
  tone(1046, 0.4, 'triangle', 0.16, 0.36);
}

export function playPebble() {
  tone(180, 0.08, 'sine', 0.12, 0, 90);
}

export function playClick() {
  tone(1200, 0.05, 'sine', 0.08);
}

export function playLaser() {
  tone(1400, 0.12, 'sawtooth', 0.07, 0, 700);
}
