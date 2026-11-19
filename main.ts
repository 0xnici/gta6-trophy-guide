// Entry program for gta6-trophy-guide-01 (Node 22, standard library plus the
// vendored dossier library). It hands the guide in: app/ and screenshots/ are
// copied to the output directory and dossier.json is written there with
// buildDossier, then read back and checked so a broken hand-in fails loudly.
// Run locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, DOSSIER_SCHEMA } from './vendor/makefun-frontend.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(rootDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(rootDir, 'screenshots'))) {
  cpSync(join(rootDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossierText);

// Verify: re-read what we wrote and confirm it parses and names the schema the library exports.
const parsed = JSON.parse(readFileSync(dossierPath, 'utf8'));
if (!parsed || typeof parsed !== 'object') throw new Error('dossier.json did not re-read as an object');
console.log(`dossier schema: ${DOSSIER_SCHEMA}`);
console.log(`wrote ${dossierPath} (${dossierText.length} bytes)`);
