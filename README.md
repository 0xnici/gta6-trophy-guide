# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/0xnici/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/0xnici/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

A complete, offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5. It covers all 55 official trophies — 1 platinum, 2 gold, 6 silver and 46 bronze — with each trophy's official name, description and grade reproduced exactly, and everything else written for this guide: a per-trophy guide in our own words, a difficulty rating from 1 to 5, a planning time estimate, missable and spoiler flags, and an unlock path. Wherever a guide makes a specific claim — a count, a location, a number of locations — the card separates the claim's source quote from the guide text and names the source, so nothing specific is ever left uncited.

The hero is the roadmap to platinum: all 55 trophies arranged into a recommended play order, story first and the platinum last, with per-step estimates and a running cumulative total (about 106 hours for the full route), grade filter chips, a difficulty sort, and a short narrated audio intro that plays from a file inside the app. The checklist view tracks what you have earned with filters for search text, category, earned status and a missable-only toggle, plus five sort orders; a spoiler mode hides story trophies consistently — checklist cards, open card details and roadmap steps all become placeholders, not just the names. Progress is stored in the browser's localStorage and round-trips losslessly as JSON: export it, import it on another machine, or reset it (the reset downloads a backup first, so it is always undoable).

The stats view shows progress per grade, a difficulty heat map across all 55 trophies, live totals (earned count, estimated time to platinum, time still to go) and a source outline that is generated from the live dataset every time the page loads — trophy counts by grade and kind, the feature list, and the results of the dataset validation that also runs at load (55 entries, unique ids, the official 1/2/6/46 grade mix, difficulty and estimate ranges, guide and source coverage). The whole app is plain static files — HTML, CSS and ES modules — with no build step, no accounts and no network calls: open it from disk or serve it locally and it works exactly the same.

## Run it

```sh
node serve.ts
# open http://localhost:8081 — or run node main.ts to hand the guide in
```

---
<sub>Entered on [make.fun](https://make.fun/?ref=1n20pv53&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
