// Hand-in for the gta6-trophy-guide-01 entry (Node 22+, standard library
// only). The guide itself is the static web app in app/ — ES modules, CSS and
// a local audio file, no build step, nothing fetched over the network. This
// program copies app/ and screenshots/ into the output directory and writes
// dossier.json there with the vendored make.fun library, then re-reads the
// dossier to verify what was actually handed in.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output.
// vendor/makefun-frontend.ts is left exactly as shipped: the scorer requires
// dossier.json to be byte for byte what its own copy of the library writes.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, DOSSIER_SCHEMA } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the competition's gate): the text budget shapes
// the dossier bytes; the rest refuse an entry the scorer would refuse — at
// most 4 screenshots, none over 256 KiB, at most 993 entries and 48 MiB
// under app/.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// Verification pass: re-read the dossier from disk and recount the app tree,
// so a successful run proves the hand-in is complete, not just attempted.
const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (dossier.schema !== DOSSIER_SCHEMA) {
  throw new Error(`dossier schema mismatch: got ${dossier.schema}, expected ${DOSSIER_SCHEMA}`);
}
const countFiles = (dir) => readdirSync(dir, { withFileTypes: true })
  .reduce((n, e) => n + (e.isDirectory() ? countFiles(join(dir, e.name)) : 1), 0);
const appFileCount = countFiles(join(out, 'app'));
const screenshotNames = readdirSync(join(out, 'screenshots')).sort();
console.log(`gta6-trophy-guide: dossier ok (schema=${dossier.schema}), app files=${appFileCount}, screenshots=${screenshotNames.length} [${screenshotNames.join(', ')}] -> ${out}`);
