// Leonida Ledger — hand-in program for gta6-trophy-guide-01 (Node 22, standard library only).
//
// What it does, in order:
//   1. Sanity-checks app/data/trophies.json: it must parse, name exactly 55 trophies, use each
//      list id once, and grade every trophy platinum, gold, silver or bronze in the official
//      proportions (1 / 2 / 6 / 46). A guide that fails its own data check is not handed in.
//   2. Copies app/ and screenshots/ from this repository into the output directory
//      (MAKEFUN_OUTPUT_DIR where set, /output in the grader).
//   3. Writes dossier.json there with buildDossier from vendor/makefun-frontend.ts, using the
//      scorer's published caps, so the dossier is byte for byte the one the gate rebuilds.
//
// Run it locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const EXPECTED_TOTAL = 55;
const EXPECTED_GRADES = { platinum: 1, gold: 2, silver: 6, bronze: 46 };

function checkTrophyData() {
  const file = join(repoRoot, 'app', 'data', 'trophies.json');
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const trophies = Array.isArray(parsed) ? parsed : parsed.trophies;
  if (!Array.isArray(trophies)) throw new Error('trophies.json: no trophies array');
  if (trophies.length !== EXPECTED_TOTAL) {
    throw new Error(`trophies.json: ${trophies.length} trophies, expected ${EXPECTED_TOTAL}`);
  }
  const seen = new Set();
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    if (seen.has(trophy.id)) throw new Error(`trophies.json: duplicate id ${trophy.id}`);
    seen.add(trophy.id);
    if (!(trophy.grade in grades)) throw new Error(`trophies.json: bad grade "${trophy.grade}" on id ${trophy.id}`);
    grades[trophy.grade] += 1;
    if (typeof trophy.name !== 'string' || trophy.name.trim() === '') {
      throw new Error(`trophies.json: trophy ${trophy.id} has no name`);
    }
    if (typeof trophy.guide !== 'string' || trophy.guide.trim() === '') {
      throw new Error(`trophies.json: trophy ${trophy.id} (${trophy.name}) has no guide`);
    }
  }
  for (const [grade, want] of Object.entries(EXPECTED_GRADES)) {
    if (grades[grade] !== want) {
      throw new Error(`trophies.json: ${grades[grade]} ${grade} trophies, expected ${want}`);
    }
  }
  return trophies.length;
}

const checked = checkTrophyData();

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`handed in: ${checked} trophies checked, dossier written to ${join(outputDir, 'dossier.json')}`);
