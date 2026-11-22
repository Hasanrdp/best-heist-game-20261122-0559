[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Hasanrdp/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Hasanrdp/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# The Sapphire Ledger

A midnight heist in three rooms, built for [make.fun's best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

You are the thief. The Halcyon Grand Bank keeps one jewel no thief has ever lifted — the Sapphire Ledger — and tonight you lift it, then the Star Sapphire, then the Halcyon Gold, and get out before dawn. Every room is a single frame: guards with vision cones on patrol, cameras sweeping the floor, a loot target glowing on its pedestal, and one alarm meter that decides the night.

## How it plays

- **Move** with WASD or the arrow keys. **Shift** sneaks — slower, harder to spot.
- **Hold E** beside the centrepiece to lift it. Side loot is pocketed by walking over it.
- **Q** throws a pebble where the mouse points; guards walk over to investigate the noise.
- **F** drops a smoke bomb; no one can see through it for five seconds.
- **P** pauses, **M** mutes, **R** retries a room after being caught.

Guards patrol, investigate glimpses and noises, and chase when they are sure of you. Cameras never move — they sweep a fixed arc, and their narrow cone fills the alarm fast. Lasers in the Vault Hall blink on a timer: cross while they are dark. Fill the alarm meter and the whole bank wakes up.

Three rooms, three scores: **I — The Gallery**, **II — The Vault Hall**, **III — The Rooftop**. Clear a room for stars and a time bonus; stay under 50 alarm for the ghost bonus.

## Play it

No build step, no network. Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged scenes of the real game (`?shot=cover|gallery|caught|escape`), listed in `shots.json`.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  - `config.js` — canvas, palette, tuning, the three rooms
  - `world.js` — state, collision, line of sight, alarm, tools, loot
  - `guards.js` — patrol / investigate / chase
  - `cameras.js` — sweeping cameras
  - `render.js` — everything drawn on the canvas
  - `audio.js` — synthesised sound, no audio files
  - `input.js` — keyboard and mouse
  - `shots.js` — the staged screenshot scenes
  - `main.js` — the loop and the screens
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — four real renders of the game's own code.

## License

MIT — see [LICENSE](LICENSE).
