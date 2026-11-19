// Progress persistence for the trophy tracker: localStorage is the only store,
// export/import move the same shape in and out as JSON, and import is validated
// against the real trophy id set before anything is applied.
export const STORAGE_KEY = "gta6-trophy-guide-v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { earned: {}, spoilerHide: true };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.earned !== "object") return { earned: {}, spoilerHide: true };
    return { earned: parsed.earned || {}, spoilerHide: parsed.spoilerHide !== false };
  } catch { return { earned: {}, spoilerHide: true }; }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportPayload(state) {
  return JSON.stringify({ app: "gta6-trophy-guide", version: 1, exportedAt: new Date().toISOString(), earned: state.earned, spoilerHide: state.spoilerHide }, null, 2);
}

// Returns { ok, state?, error? } — lossless for the earned map, strict about shape.
export function parseImport(text, validIds) {
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "That file is not valid JSON." }; }
  if (!data || typeof data !== "object") return { ok: false, error: "Import must be a JSON object." };
  const earnedRaw = data.earned ?? data;
  if (!earnedRaw || typeof earnedRaw !== "object") return { ok: false, error: "No earned map found in that file." };
  const earned = {};
  for (const [key, value] of Object.entries(earnedRaw)) {
    if (value !== true) continue;
    if (!validIds.has(key)) return { ok: false, error: `Unknown trophy id in import: ${key}` };
    earned[key] = true;
  }
  return { ok: true, state: { earned, spoilerHide: data.spoilerHide !== false } };
}
