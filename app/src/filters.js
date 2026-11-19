// Filtering and the spoiler rule in one place, so the list, the search results
// and the detail view can never disagree about what is hidden.
export function isMasked(trophy, state) {
  return Boolean(state.spoilerHide && trophy.spoiler && !state.earned[trophy.id]);
}

export function displayName(trophy, state) {
  return isMasked(trophy, state) ? "Hidden story trophy" : trophy.name;
}

export function displayDescription(trophy, state) {
  return isMasked(trophy, state) ? "Spoiler protection is on: story trophies stay hidden until you earn them. Turn the spoiler setting off, or earn it, to reveal this entry." : trophy.description;
}

export function applyFilters(trophies, state, ui) {
  const q = ui.q.trim().toLowerCase();
  return trophies.filter(t => {
    if (ui.kind && t.kind !== ui.kind) return false;
    if (ui.grade && t.grade !== ui.grade) return false;
    if (ui.status === "earned" && !state.earned[t.id]) return false;
    if (ui.status === "todo" && state.earned[t.id]) return false;
    if (ui.missable && !t.missable) return false;
    if (q) {
      if (isMasked(t, state)) return false; // masked trophies never leak through search
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kind} ${t.grade}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
