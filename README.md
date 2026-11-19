# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/0xnici/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/0xnici/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Ledger** — an offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. Open `app/index.html` in a desktop browser and everything works with no network at all: the official trophy list, a checklist that saves in your browser, and a seven-stage roadmap to the platinum.

The angle is verifiability. Every trophy card keeps three things separate: the **official description**, quoted exactly as PlayStation publishes it; a **guide in our own words**, written for this entry; and the **unlock path**, step by step. Each guide names its sources beside the claims that depend on them — the Exophase PSN trophy list for the official names, descriptions and grades, and PSNProfiles for the grade and the count PSN tracks where one exists. Where an official description is a joke or a riddle, the guide says plainly that its reading is a reading; it never invents a location or a step and presents it as fact.

## What is inside

- **The roadmap is the hero** — seven stages in the order we would play them, each stage sortable by difficulty, with per-trophy time and difficulty estimates (marked as estimates), a grade filter, a running total of hours for the whole list, and a short spoken introduction recorded for this guide. The order, the stage each trophy belongs to and every missable flag are built from the official descriptions: which chapters and missions they name, which collectibles and counts they set.
- **Checklist that keeps your data** — mark trophies earned, track counters for the 21 trophies that count something (of 9 activity types, 42 range challenges, 14 drone locations, 18 meditation spots, 52 areas, 9 gangs, 8 garages, 500 choices, and more), all saved in `localStorage`. Export to JSON, import it back losslessly (imports are validated against the real trophy ids before anything is applied), and reset only behind a confirmation that reminds you to export first.
- **Filters that compose** — text search, kind chips (including a dedicated missable filter), grade and status filters, and five sort orders. Progress percentage, per-grade counts, a "next up" pointer that prefers an open missable in the earliest stage, and a difficulty heat map over all 55 trophies.
- **Spoiler shield, applied consistently** — story trophies are masked in the checklist, in search results (searching a hidden name finds nothing and leaks nothing), in the roadmap and in the detail view, until the moment you earn them.
- **Missables flagged from the text** — six trophies are flagged, and each flag argues from the official description itself: the unique animal of "Fair Game", the unscheduled VCIA departure, the Ocean Beach cocktail of the opening stretch, the showroom smash, the 500 one-time choices, and the failure-then-success of "Bad Luck, I Guess".

## The data

`app/data/trophies.json` holds all 55 trophies: exact official name, official description and grade (1 platinum, 2 gold, 6 silver, 46 bronze), plus our own fields — kind, roadmap stage, missable and spoiler flags, target counts, difficulty and time estimates, the guide text, its steps and its sources. The list is validated on load and again at build time: exactly 55 entries, unique ids 1–55, grades inside the enum, no blank name or guide, difficulty within 1–5, estimates non-negative. The Stats view shows the audit result live, computed from the data itself.

## Run it

Just open the app — it is fully static and offline:

```
open app/index.html        # or double-click it; desktop Chrome works
```

Or serve it locally (any static server does; this repo ships one):

```
node serve.ts              # serves app/ on http://127.0.0.1:8080
PORT=3000 node serve.ts    # custom port
```

Build the competition hand-in (copies `app/` and `screenshots/` to the output directory and writes the dossier):

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Regenerate the screenshots from the real app (needs a Chrome binary; see `tools/capture.mjs`):

```
node tools/capture.mjs
```

No Rockstar logos or artwork are used anywhere. Trophy names and descriptions are the official PlayStation-published texts, quoted for reference; everything else — guides, estimates, flags, code — is original to this entry.

---
<sub>Entered on [make.fun](https://make.fun/?ref=1n20pv53&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
