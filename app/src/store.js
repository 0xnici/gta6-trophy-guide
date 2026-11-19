// Leonida Ledger — progress store.
// Everything the tracker remembers lives in one localStorage key:
//   earned:   { [trophyId]: ISO timestamp of when it was ticked }
//   counters: { [trophyId]: current count toward that trophy's PSN target }
//   hideSpoilers: the spoiler-shield setting
// Export serialises exactly that shape (plus a header), and import validates an export
// against the real trophy ids before applying it, so an export → import round-trip is
// lossless and a foreign file changes nothing.

export const STORAGE_KEY = 'leonida-ledger-v2';
export const EXPORT_APP = 'leonida-ledger';

export function blankState() {
  return { earned: {}, counters: {}, hideSpoilers: true };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    return normaliseState(parsed);
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Coerce anything parsed into the store's shape, dropping keys that do not fit.
export function normaliseState(value) {
  const state = blankState();
  if (!value || typeof value !== 'object') return state;
  if (value.earned && typeof value.earned === 'object') {
    for (const [id, when] of Object.entries(value.earned)) {
      if (typeof when === 'string' && when) state.earned[id] = when;
    }
  }
  if (value.counters && typeof value.counters === 'object') {
    for (const [id, count] of Object.entries(value.counters)) {
      const n = Number(count);
      if (Number.isFinite(n) && n > 0) state.counters[id] = Math.floor(n);
    }
  }
  if (typeof value.hideSpoilers === 'boolean') state.hideSpoilers = value.hideSpoilers;
  return state;
}

export function toggleEarned(state, id) {
  if (state.earned[id]) delete state.earned[id];
  else state.earned[id] = new Date().toISOString();
  return state;
}

export function setCounter(state, id, value, target) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  const capped = target ? Math.min(n, target) : n;
  if (capped > 0) state.counters[id] = capped;
  else delete state.counters[id];
  return state;
}

export function exportState(state) {
  return JSON.stringify(
    {
      app: EXPORT_APP,
      version: 2,
      exported_at: new Date().toISOString(),
      earned: state.earned,
      counters: state.counters,
      hideSpoilers: state.hideSpoilers,
    },
    null,
    2,
  );
}

// Parse an import (file text or pasted text). Throws with a readable reason when the
// text is not one of this guide's exports; on success returns a state holding only
// entries for trophies that exist, so nothing foreign is ever applied.
export function parseImport(text, validIds) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That text is not JSON — paste or pick a file this guide exported.');
  }
  if (!parsed || typeof parsed !== 'object' || parsed.app !== EXPORT_APP) {
    throw new Error('That file was not exported by Leonida Ledger (its "app" mark is missing).');
  }
  const state = normaliseState(parsed);
  const known = new Set([...validIds].map(String));
  for (const id of Object.keys(state.earned)) if (!known.has(id)) delete state.earned[id];
  for (const id of Object.keys(state.counters)) if (!known.has(id)) delete state.counters[id];
  return state;
}

// Progress over the whole list: totals overall and per grade.
export function progressOf(trophies, state) {
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let earned = 0;
  for (const trophy of trophies) {
    totals[trophy.grade] += 1;
    if (state.earned[trophy.id]) {
      earned += 1;
      byGrade[trophy.grade] += 1;
    }
  }
  return { earned, total: trophies.length, byGrade, totals };
}
