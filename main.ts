// Neon Harbor — gta6-01 entry program (Node 22, standard library only), authored by Aira.
// This program hands the game in: it copies the static open-world game in game/ and the
// maker's screenshots in screenshots/ into the output directory, then writes dossier.json
// with the kit's vendored buildDossier so the sealed scorer can verify the bytes match.
// Run it the way the grader does:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const GAME_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handInNeonHarbor() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outputDir, GAME_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`Neon Harbor handed in: game/ + screenshots/ + dossier.json (${dossier.length} bytes) -> ${outputDir}`);
}

handInNeonHarbor();
