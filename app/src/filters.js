// Leonida Ledger — filtering, sorting and the spoiler rule.
// One module decides what is hidden and what matches, and every view (checklist, search
// results, roadmap, missables, detail, heat map) goes through it, so the spoiler shield
// can never be on in one place and off in another.
//
// The rule: while the shield is on, a story trophy that has not been earned shows neither
// its name nor its description anywhere — and search matches only what is shown, so
// searching a hidden trophy's name finds nothing and leaks nothing.

import { GRADE_ORDER, KIND_LABEL } from './data.js';

export const MASKED_NAME = 'Hidden story trophy';
export const MASKED_DESCRIPTION = 'Name and description hidden by the spoiler shield until this trophy is earned.';

export function isMasked(trophy, state) {
  return Boolean(state.hideSpoilers && trophy.spoiler && !state.earned[trophy.id]);
}

export function shownName(trophy, state) {
  return isMasked(trophy, state) ? MASKED_NAME : trophy.name;
}

export function shownDescription(trophy, state) {
  return isMasked(trophy, state) ? MASKED_DESCRIPTION : trophy.description;
}

// criteria: { query, kind ('all' | 'missable' | a kind), grade, status ('all'|'earned'|'open') }
export function filterTrophies(trophies, state, criteria) {
  const query = (criteria.query ?? '').trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (criteria.kind === 'missable') {
      if (!trophy.missable) return false;
    } else if (criteria.kind && criteria.kind !== 'all') {
      if (trophy.kind !== criteria.kind) return false;
    }
    if (criteria.grade && criteria.grade !== 'all' && trophy.grade !== criteria.grade) return false;
    if (criteria.status === 'earned' && !state.earned[trophy.id]) return false;
    if (criteria.status === 'open' && state.earned[trophy.id]) return false;
    if (query) {
      const haystack = [
        shownName(trophy, state),
        shownDescription(trophy, state),
        KIND_LABEL[trophy.kind] ?? trophy.kind,
        trophy.grade,
        trophy.missable ? 'missable' : '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

const GRADE_RANK = Object.fromEntries(GRADE_ORDER.map((grade, i) => [grade, i]));

// modes: list | stage | grade | difficulty | time | name
export function sortTrophies(trophies, mode) {
  const byId = (a, b) => a.id - b.id;
  const sorted = [...trophies];
  switch (mode) {
    case 'stage':
      sorted.sort((a, b) => a.stage - b.stage || byId(a, b));
      break;
    case 'grade':
      sorted.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || byId(a, b));
      break;
    case 'difficulty':
      sorted.sort((a, b) => b.difficulty - a.difficulty || byId(a, b));
      break;
    case 'time':
      sorted.sort((a, b) => b.est_minutes - a.est_minutes || byId(a, b));
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      sorted.sort(byId);
  }
  return sorted;
}

// The next trophy worth doing: the earliest unearned one in roadmap order,
// preferring a missable that is still open over everything else in its stage.
export function nextUp(trophies, state) {
  const open = trophies.filter((t) => !state.earned[t.id] && t.grade !== 'platinum');
  if (open.length === 0) return null;
  const byStage = [...open].sort((a, b) => a.stage - b.stage || a.id - b.id);
  const firstStage = byStage[0].stage;
  const missableHere = byStage.find((t) => t.stage === firstStage && t.missable);
  return missableHere ?? byStage[0];
}
