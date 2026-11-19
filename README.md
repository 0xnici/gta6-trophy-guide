# GTA 6 Trophy Guide

[![Competition](https://make.fun/badge/gta6-trophy-guide-01.svg?utm_campaign=gta6-trophy-guide-01)](https://make.fun/bounty/gta6-trophy-guide-01?utm_campaign=gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/0xnici/gta6-trophy-guide/rank.svg?utm_campaign=gta6-trophy-guide-01)](https://make.fun/bounty/gta6-trophy-guide-01?utm_campaign=gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/0xnici/gta6-trophy-guide/reward.svg?utm_campaign=gta6-trophy-guide-01)](https://make.fun/bounty/gta6-trophy-guide-01?utm_campaign=gta6-trophy-guide-01)

An offline trophy guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. Every trophy carries its official name, description and grade exactly as PlayStation publishes them (via the Exophase PSN list), a missable flag and a story/spoiler flag derived from the official description, and a guide written for this entry in its own words that cites its sources right beside the text — Exophase for the official list, PSNProfiles for grades and tracked counts. Where a description is deliberately cryptic, the guide says plainly that its reading is a reading and invents no location or step.

What is inside:

- **Checklist tracker** — tick trophies off; progress is saved in your browser (localStorage), with lossless JSON export/import (validated on import) and a reset that reminds you to back up first.
- **Search and filters** — by text, kind, grade, earned status, and a missable-only filter.
- **Spoiler setting** — story trophies are masked in the list, in search results and in the detail view until you earn them.
- **Roadmap to platinum** — five stepped stages with difficulty, estimated hours per step and cumulative totals, plus a “Listen: platinum roadmap intro” button that plays the bundled local audio intro.
- **Stats view** — a difficulty heat map over all 55 trophies and a source-outline panel generated live from the data itself (55 unique ids, grade counts, enum validation).

The app is plain static files under `app/` — no build step, no network requests, no Rockstar logos or artwork.

## Run it

Serve the app locally (Node 22):

```
node serve.ts
```

Then open http://localhost:8080. To build the submission output instead:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are produced with `node tools/capture.mjs` (headless Chrome + the scenes in `shots.json`).

---

Built for make.fun's “Build the best GTA 6 trophy guide” bounty: https://make.fun/bounty/gta6-trophy-guide-01

Try make.fun: https://make.fun/?ref=1n20pv53
