// Data loading and validation, plus the roadmap model. The outline panel and
// the heat map are both generated from the loaded trophies — nothing is typed twice.
export async function loadTrophies() {
  const res = await fetch("data/trophies.json");
  if (!res.ok) throw new Error(`trophies.json failed to load (${res.status})`);
  const doc = await res.json();
  const trophies = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(trophies)) throw new Error("trophies.json has no trophies array");
  return trophies;
}

export function validateTrophies(trophies) {
  const ids = new Set();
  const grades = {};
  const problems = [];
  const allowed = new Set(["platinum", "gold", "silver", "bronze"]);
  for (const t of trophies) {
    if (ids.has(t.id)) problems.push(`duplicate id ${t.id}`);
    ids.add(t.id);
    if (!allowed.has(t.grade)) problems.push(`bad grade ${t.grade} on ${t.id}`);
    if (!t.name || !t.guide || !String(t.guide).trim()) problems.push(`missing name/guide on ${t.id}`);
    grades[t.grade] = (grades[t.grade] || 0) + 1;
  }
  return { total: trophies.length, uniqueIds: ids.size, grades, problems,
    missable: trophies.filter(t => t.missable).length, spoiler: trophies.filter(t => t.spoiler).length,
    kinds: [...new Set(trophies.map(t => t.kind))].sort() };
}

// Effort band 1 (quick) .. 5 (long grind), estimated from grade, target size and kind.
export function effortOf(t) {
  if (t.id === "t01") return 5;
  if (t.target && t.target >= 100) return 4;
  if (t.grade === "gold") return 5;
  if (t.grade === "silver") return 3;
  if (t.target && t.target >= 20) return 3;
  if (t.kind === "collectible" || t.kind === "exploration") return 2;
  return 1;
}

export const ROADMAP = [
  { title: "Step 1 — Story first, chapters 1–2", difficulty: "Easy", hours: 8, note: "Finish Gone Fishing, Chapter 1 and Chapter 2. Take the Ocean Beach cocktail moment (In The Beginning…) while the early story is active — it is missable-flagged. Never reload to change a story choice on this save (Actions Speak Louder)." },
  { title: "Step 2 — Chapters 3–4 and the VCIA beats", difficulty: "Easy–Medium", hours: 9, note: "Clear Chapters 3 and 4 plus Breakfast Run, The Cartel Heist, Child's Play, Headliners, VCIA Takedown and Operation Savage Glory. At VCIA, attempt the unscheduled departure (Catch Me If You Can) while the airport content is live." },
  { title: "Step 3 — Finale, stranger strands and partner feats", difficulty: "Medium", hours: 10, note: "Finish the final mission, then close the Andy, Kenton, Billy, Randy and Tyrone strands plus Bret's hunt (Fair Game — do it when offered) toward Strangers & Freaks (8 strands). Do the partner trophies Hot Together and Retail Therapy now, while both protagonists are free." },
  { title: "Step 4 — Activities and skill trophies", difficulty: "Medium–Hard", hours: 12, note: "Shooting Range golds (The Shootist), Top Fun wins everywhere, 20 different race wins, 250 stunts, 50 challenges, one arcade game, Cal's fishing challenge and every activity type once (Master of None)." },
  { title: "Step 5 — Collectibles, exploration and the money tail", difficulty: "Hard (long)", hours: 16, note: "Meditation spots, 3 card sets, 100 WAiNK locations, 100 vehicles, all of Leonida explored, bank vaults, gang operations, $250k laundered, $100k spent and all 8 garages. When the counter reads 100%, A Long Road and the platinum close the list." },
];
