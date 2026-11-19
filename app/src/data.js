// Leonida Ledger — data layer.
// Loads app/data/trophies.json (fetched relative to the page, so it works from any static
// server with app/ at its root), validates it against the shape of the official list, and
// holds the roadmap model: the seven stages every trophy is played in. Stage membership
// lives on each trophy in the data file; the stage titles and reasoning live here, written
// from the official descriptions — which chapters, missions, collectibles and counts they name.

export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

export const GRADE_LABEL = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const KIND_LABEL = {
  platinum: 'Platinum',
  story: 'Story',
  stranger: 'Strangers & side missions',
  collectible: 'Collectibles',
  activity: 'Activities',
  exploration: 'Exploration',
  world: 'Free roam',
  combat: 'Combat',
  crime: 'Crime',
  money: 'Money & property',
  completion: 'Completion',
};

// The roadmap, in play order. `minutes` is our own rough estimate for the stage's
// first pass; each trophy carries its own estimate in the data file.
export const STAGES = [
  {
    n: 1,
    title: 'Opening waters',
    blurb: 'The first hour: the opening mission Gone Fishing and Chapter 1. One missable ' +
      'moment lives here — the Ocean Beach cocktail of "In The Beginning…" belongs to the ' +
      'game\'s opening stretch, so take it before the map opens up and the moment passes.',
  },
  {
    n: 2,
    title: 'The campaign',
    blurb: 'Chapters 2 to 4, the named story missions between them, and the finale. The ' +
      'choice-driven and one-time set pieces the descriptions hint at (a departure at VCIA, ' +
      'a showroom exit, the choices PSN counts to 500) all sit inside the campaign, so play ' +
      'this stage awake: that is where every story missable window opens and closes.',
  },
  {
    n: 3,
    title: 'Strangers & strands',
    blurb: 'The named strand-givers — Andy, Kenton, Billy, Randy, Tyrone and Bret — and the ' +
      'silver for finishing eight strands. Do these before the finale as a precaution: ' +
      'strand stories end with the campaign, and Bret\'s unique animal is a one-time hunt.',
  },
  {
    n: 4,
    title: 'Collectibles & the whole map',
    blurb: 'The long tail of things to find: three Collectible Card sets, 100 WAiNK spots, ' +
      '18 meditation spots, all 52 areas of Leonida and 100 vehicles discovered. Sweep these ' +
      'region by region while the story strands send you around the map.',
  },
  {
    n: 5,
    title: 'Activities & the grinds',
    blurb: 'The counted activities: 250 stunts, gold in all 42 Shooting Range challenges, a ' +
      'Top Fun drone-race win at all 14 locations, 20 race wins, 50 challenges, and one of ' +
      'each of the 9 activity types. Steady, repeatable, and best spread across the whole run.',
  },
  {
    n: 6,
    title: 'Free roam, crime & money',
    blurb: 'Everything the open world lets you repeat: partner wanted-level escapes, shop and ' +
      'vault robberies, gang operations, laundering $250,000 of Marked Bills, spending ' +
      '$100,000, the 8 garage properties and the Scooter Bros registrations — plus the small ' +
      'one-off feats (a bowling follow-through, a melee drive-by, a second-try success).',
  },
  {
    n: 7,
    title: '100% and the platinum',
    blurb: 'The gold for 100% completion is the last long pole; when it lands, only the ' +
      'platinum remains, and it unlocks on its own the moment the other 54 are earned.',
  },
];

export async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error(`trophies.json failed to load (${response.status})`);
  const doc = await response.json();
  const trophies = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(trophies)) throw new Error('trophies.json holds no trophies array');
  return trophies;
}

// A plain-language audit of the loaded list, shown on the Stats view: what was checked,
// and what passed. Returns a list of problem strings (empty when the data is clean).
export function auditTrophies(trophies) {
  const problems = [];
  if (trophies.length !== 55) problems.push(`expected 55 trophies, found ${trophies.length}`);
  const ids = new Set();
  const names = new Set();
  const gradeCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    if (ids.has(trophy.id)) problems.push(`duplicate id ${trophy.id}`);
    ids.add(trophy.id);
    const nameKey = String(trophy.name ?? '').trim().toLowerCase();
    if (names.has(nameKey)) problems.push(`duplicate name "${trophy.name}"`);
    names.add(nameKey);
    if (!(trophy.grade in gradeCounts)) problems.push(`id ${trophy.id}: unknown grade "${trophy.grade}"`);
    else gradeCounts[trophy.grade] += 1;
    if (!trophy.guide || String(trophy.guide).trim() === '') problems.push(`id ${trophy.id}: guide is blank`);
    if (!Array.isArray(trophy.sources) || trophy.sources.length === 0) {
      problems.push(`id ${trophy.id}: no sources cited`);
    }
    if (!(trophy.stage >= 1 && trophy.stage <= STAGES.length)) {
      problems.push(`id ${trophy.id}: stage ${trophy.stage} is outside 1–${STAGES.length}`);
    }
    if (!(trophy.difficulty >= 1 && trophy.difficulty <= 5)) {
      problems.push(`id ${trophy.id}: difficulty ${trophy.difficulty} is outside 1–5`);
    }
  }
  const expected = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  for (const grade of GRADE_ORDER) {
    if (gradeCounts[grade] !== expected[grade]) {
      problems.push(`${grade}: ${gradeCounts[grade]} found, the official list has ${expected[grade]}`);
    }
  }
  return problems;
}

export function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return hours >= 10 ? `${Math.round(hours)} h` : `${hours.toFixed(1).replace(/\.0$/, '')} h`;
}

export function difficultyDots(difficulty) {
  return '●'.repeat(difficulty) + '○'.repeat(5 - difficulty);
}
