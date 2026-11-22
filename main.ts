// The Sapphire Ledger — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into /output and writes
// /output/dossier.json, the summary the judge reads, using the vendored make.fun
// library. Nothing here is generated or fetched: the same input files always give
// the same output bytes, so the grader's two runs agree.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

// The caps mirror the competition's gate: at most 4 screenshots of 256 KiB, a game/
// of at most 993 files and 48 MiB with paths under 1000 bytes, and a dossier text
// of at most 160 KiB. buildDossier throws when a cap is crossed, so a bad entry
// fails loudly here instead of quietly on the server.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
