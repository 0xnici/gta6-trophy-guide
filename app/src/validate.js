// Runtime validation for the trophy dataset.
//
// The guide's claims are only worth anything if the data underneath them is
// sound, so the dataset is checked every time the app loads. The checks are:
//   * exactly 55 trophies
//   * every id unique, and the ids run 1..55 with no gaps
//   * grade is one of platinum/gold/silver/bronze, with the official counts
//     1 platinum, 2 gold, 6 silver, 46 bronze
//   * category is one of the five known categories
//   * difficulty is an integer from 1 to 5
//   * estMinutes is a positive number
//   * roadmapStep values are unique and run 1..55
//   * every trophy carries a non-empty guide and a source label, and the
//     official name and description are non-empty strings
// validateTrophies returns a list of human-readable results; an empty
// `failures` list means the dataset passed every check.

export const EXPECTED = {
  total: 55,
  grades: { platinum: 1, gold: 2, silver: 6, bronze: 46 },
  categories: ["story", "collectible", "combat", "online", "misc"],
};

export function validateTrophies(trophies) {
  const results = [];
  const check = (ok, label, detail) => results.push({ ok, label, detail });

  check(trophies.length === EXPECTED.total, "Trophy count", `${trophies.length} of ${EXPECTED.total} trophies present`);

  const ids = trophies.map((t) => t.id);
  check(new Set(ids).size === ids.length, "Unique ids", `${new Set(ids).size} distinct ids`);
  const idRangeOk = [...ids].sort((a, b) => a - b).every((id, i) => id === i + 1);
  check(idRangeOk, "Id range", "ids run 1..55 with no gaps");

  const gradeCounts = {};
  for (const t of trophies) gradeCounts[t.grade] = (gradeCounts[t.grade] || 0) + 1;
  const gradesOk = Object.entries(EXPECTED.grades).every(([g, n]) => gradeCounts[g] === n)
    && Object.keys(gradeCounts).every((g) => g in EXPECTED.grades);
  check(gradesOk, "Grade mix", Object.entries(gradeCounts).map(([g, n]) => `${n} ${g}`).join(", "));

  const badCategory = trophies.filter((t) => !EXPECTED.categories.includes(t.category));
  check(badCategory.length === 0, "Categories", badCategory.length ? `unknown category on id ${badCategory[0].id}` : "all five categories valid");

  const badDifficulty = trophies.filter((t) => !Number.isInteger(t.difficulty) || t.difficulty < 1 || t.difficulty > 5);
  check(badDifficulty.length === 0, "Difficulty range", badDifficulty.length ? `out of range on id ${badDifficulty[0].id}` : "every difficulty within 1..5");

  const badEstimate = trophies.filter((t) => !(typeof t.estMinutes === "number" && t.estMinutes > 0));
  check(badEstimate.length === 0, "Time estimates", badEstimate.length ? `missing estimate on id ${badEstimate[0].id}` : "every trophy has a positive estimate");

  const steps = trophies.map((t) => t.roadmapStep);
  const stepsOk = new Set(steps).size === steps.length
    && [...steps].sort((a, b) => a - b).every((s, i) => s === i + 1);
  check(stepsOk, "Roadmap order", "roadmap steps unique, running 1..55");

  const incomplete = trophies.filter((t) => !t.name || !t.description || !t.guide || !t.source);
  check(incomplete.length === 0, "Guide & source coverage", incomplete.length ? `missing text on id ${incomplete[0].id}` : "every trophy has a guide and a source label");

  return {
    results,
    failures: results.filter((r) => !r.ok),
    gradeCounts,
    ok: results.every((r) => r.ok),
  };
}
