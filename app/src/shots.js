// Screenshot scenes for the dossier.
//
// Loaded only when the page is opened with ?shot=<name> (see src/app.js).
// Each scene puts the app into a representative state — real interactions
// through the same GuideApp handle a user has — and then raises
// window.__shotReady after two animation frames so the capture tool
// (tools/capture.mjs) knows the frame is settled.
//
//   guide    the checklist with 14 trophies earned, platinum row on top
//   roadmap  the roadmap with the intro player and cumulative estimates
//   card     one missable trophy's card expanded, spoiler mode on
//   stats    the stats view: grade progress, heat map, totals, outline

const EARNED_SAMPLE = [2, 3, 4, 5, 8, 9, 10, 16, 21, 33, 37, 44, 45, 49];

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export function applyShot(name, app) {
  switch (name) {
    case "guide": {
      app.seedEarned(EARNED_SAMPLE);
      app.setSpoiler(false);
      app.setSort("grade");
      app.setView("checklist");
      window.scrollTo(0, 0);
      break;
    }
    case "roadmap": {
      app.seedEarned(EARNED_SAMPLE);
      app.setSpoiler(false);
      app.setView("roadmap");
      window.scrollTo(0, 0);
      break;
    }
    case "card": {
      app.seedEarned([2, 3, 16, 21, 44]);
      app.setSpoiler(true);
      app.setSort("roadmap");
      // Narrowing the search to "story" keeps the spoiler placeholders in
      // frame directly above the expanded card, so the one screenshot shows
      // both halves of the spoiler behaviour at once.
      app.setSearch("story");
      app.setView("checklist");
      app.expand(37); // Catch Me If You Can — missable, with a source quote
      break;
    }
    case "stats": {
      app.seedEarned(EARNED_SAMPLE);
      app.setSpoiler(false);
      app.setView("stats");
      window.scrollTo(0, 0);
      break;
    }
    default: {
      app.setView("checklist");
    }
  }
  ready();
}
