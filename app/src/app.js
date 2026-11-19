// GTA 6 Trophy Guide — app logic.
//
// Three views over one dataset (app/data/trophies.js):
//   * Checklist — every trophy as a card with an expandable guide, filters
//     (search, category, status, missable-only, sort) and a spoiler mode
//     that swaps story trophies for placeholder cards everywhere.
//   * Roadmap — the same trophies in platinum order, with cumulative time
//     estimates, grade filter chips, a difficulty sort and the narrated
//     roadmap intro (a local audio file, roadmap view only).
//   * Stats & Sources — per-grade progress, a difficulty heat map, totals
//     and a source outline generated from the live dataset.
// Progress lives in localStorage and round-trips losslessly as JSON.

import { TROPHIES, LIST_META } from "../data/trophies.js";
import { validateTrophies } from "./validate.js";

const STORE_KEY = "gta6-trophy-guide/v1";
const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const CATEGORY_LABEL = { story: "Story", collectible: "Collectible", combat: "Combat", online: "Partner / co-op", misc: "Misc" };

const byId = new Map(TROPHIES.map((t) => [t.id, t]));
const roadmapOrder = [...TROPHIES].sort((a, b) => a.roadmapStep - b.roadmapStep);
const cumulativeMinutes = new Map();
{
  let acc = 0;
  for (const t of roadmapOrder) { acc += t.estMinutes; cumulativeMinutes.set(t.id, acc); }
}
const totalMinutes = roadmapOrder.reduce((a, t) => a + t.estMinutes, 0);

/* ---------------- state ---------------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { earned: {}, spoiler: false };
    const parsed = JSON.parse(raw);
    const earned = {};
    if (parsed && typeof parsed === "object" && parsed.earned) {
      for (const id of Object.keys(parsed.earned)) if (byId.has(Number(id))) earned[id] = true;
    }
    return { earned, spoiler: Boolean(parsed && parsed.spoiler) };
  } catch {
    return { earned: {}, spoiler: false };
  }
}

const state = loadState();
let currentView = "checklist";
let expandedId = null;
const filters = { q: "", category: "all", status: "all", missableOnly: false, sort: "grade" };
const roadmapOpts = { grade: "all", sort: "roadmap" };

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ earned: state.earned, spoiler: state.spoiler }));
}

const earnedCount = () => TROPHIES.filter((t) => state.earned[t.id]).length;
const isHidden = (t) => state.spoiler && t.spoiler;

/* ---------------- helpers ---------------- */

const $ = (sel) => document.querySelector(sel);

function fmtMinutes(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function gradeTag(grade) {
  return el("span", `grade-tag ${grade}`, grade);
}

function missableBadge(t) {
  return t.missable ? el("span", "badge-missable", "Missable") : null;
}

/* ---------------- header / progress ---------------- */

function renderProgress() {
  const n = earnedCount();
  $("#progress-count").textContent = `${n} / ${TROPHIES.length} earned`;
  $("#progress-pct").textContent = `${Math.round((n / TROPHIES.length) * 100)}%`;
  $("#progress-fill").style.width = `${(n / TROPHIES.length) * 100}%`;
  const box = $("#grade-counts");
  box.replaceChildren();
  for (const grade of LIST_META.grades) {
    const all = TROPHIES.filter((t) => t.grade === grade);
    const got = all.filter((t) => state.earned[t.id]).length;
    const span = el("span");
    span.append(el("b", "", `${got}/${all.length}`), document.createTextNode(` ${grade}`));
    box.append(span);
  }
}

/* ---------------- checklist ---------------- */

function matchesFilters(t) {
  if (filters.category !== "all" && t.category !== filters.category) return false;
  if (filters.status === "done" && !state.earned[t.id]) return false;
  if (filters.status === "todo" && state.earned[t.id]) return false;
  if (filters.missableOnly && !t.missable) return false;
  if (filters.q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.category}`.toLowerCase();
    if (!hay.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

function sortedForChecklist(list) {
  const arr = [...list];
  switch (filters.sort) {
    case "roadmap": arr.sort((a, b) => a.roadmapStep - b.roadmapStep); break;
    case "difficulty": arr.sort((a, b) => a.difficulty - b.difficulty || GRADE_RANK[a.grade] - GRADE_RANK[b.grade]); break;
    case "difficulty-desc": arr.sort((a, b) => b.difficulty - a.difficulty || GRADE_RANK[a.grade] - GRADE_RANK[b.grade]); break;
    case "time": arr.sort((a, b) => a.estMinutes - b.estMinutes); break;
    default: arr.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.id - b.id);
  }
  return arr;
}

function placeholderCard(t, kind) {
  const card = el("article", `card spoiler-hidden ${kind || ""}`);
  const icon = el("span", "", "🙈");
  const body = el("div");
  body.append(
    el("h3", "", "Hidden by spoiler mode"),
    el("p", "", "A story trophy sits here. Turn spoiler mode off to reveal it — its guide and details are hidden too, not just its name."),
  );
  card.append(icon, body);
  return card;
}

function detailBlock(t) {
  const detail = el("div", "detail");
  const guideBlock = el("div", "block");
  guideBlock.append(el("h4", "", "Guide"), el("p", "", t.guide));
  detail.append(guideBlock);

  if (t.quote) {
    const quoteBlock = el("div", "block");
    const bq = el("blockquote", "", t.quote);
    const src = el("p", "source", `Source: ${t.source}`);
    quoteBlock.append(el("h4", "", "Source quote"), bq, src);
    detail.append(quoteBlock);
  }

  const pathBlock = el("div", "block");
  const path = `${CATEGORY_LABEL[t.category]} trophy · difficulty ${t.difficulty}/5 · about ${fmtMinutes(t.estMinutes)} of focused play · roadmap step ${t.roadmapStep} of ${TROPHIES.length}`
    + (t.missable ? " · missable — follow the guide before the story moves on" : " · cannot be missed")
    + (state.earned[t.id] ? " · earned ✓" : " · not yet earned");
  pathBlock.append(el("h4", "", "Unlock path"), el("p", "", path));
  if (!t.quote) pathBlock.append(el("p", "source", `Source: ${t.source}`));
  detail.append(pathBlock);
  return detail;
}

function cardFor(t) {
  if (isHidden(t)) return placeholderCard(t);
  const card = el("article", `card grade-${t.grade}${state.earned[t.id] ? " earned" : ""}`);
  card.dataset.id = String(t.id);

  const head = el("div", "card-head");
  const checkLabel = el("label", "check");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = Boolean(state.earned[t.id]);
  box.setAttribute("aria-label", `Mark ${t.name} as earned`);
  box.addEventListener("change", () => {
    if (box.checked) state.earned[t.id] = true; else delete state.earned[t.id];
    saveState();
    renderAll();
  });
  checkLabel.append(box);

  const main = el("div", "card-main");
  const title = el("h3", "", t.name);
  title.append(gradeTag(t.grade));
  const badge = missableBadge(t);
  if (badge) title.append(badge);
  main.append(
    title,
    el("p", "desc", `“${t.description}”`),
    el("p", "meta", `${CATEGORY_LABEL[t.category]} · difficulty ${t.difficulty}/5 · ~${fmtMinutes(t.estMinutes)} · roadmap step ${t.roadmapStep}`),
  );

  const expand = el("button", "expand-btn", expandedId === t.id ? "Hide guide ▴" : "Guide ▾");
  expand.type = "button";
  expand.addEventListener("click", () => {
    expandedId = expandedId === t.id ? null : t.id;
    renderChecklist();
  });

  head.append(checkLabel, main, expand);
  card.append(head);
  if (expandedId === t.id) card.append(detailBlock(t));
  return card;
}

function renderChecklist() {
  const list = sortedForChecklist(TROPHIES.filter(matchesFilters));
  const box = $("#card-list");
  box.replaceChildren(...list.map(cardFor));
  $("#empty-note").hidden = list.length > 0;
}

/* ---------------- roadmap ---------------- */

function renderRoadmap() {
  const totalH = fmtMinutes(totalMinutes);
  const n = earnedCount();
  $("#roadmap-summary").textContent =
    `Fifty-five steps, story first and the platinum last, in the order this guide recommends playing them. `
    + `The full route is estimated at about ${totalH} of play; each step shows the running total so you can see how far along the road you are. `
    + `You have earned ${n} of ${TROPHIES.length}. Tick steps off here or in the checklist — it is the same progress.`;

  let list = roadmapOrder.filter((t) => roadmapOpts.grade === "all" || t.grade === roadmapOpts.grade);
  if (roadmapOpts.sort === "difficulty") list = [...list].sort((a, b) => a.difficulty - b.difficulty || a.roadmapStep - b.roadmapStep);
  if (roadmapOpts.sort === "difficulty-desc") list = [...list].sort((a, b) => b.difficulty - a.difficulty || a.roadmapStep - b.roadmapStep);

  const ol = $("#roadmap-list");
  ol.replaceChildren(...list.map((t) => {
    if (isHidden(t)) {
      const li = el("li", "step spoiler-hidden");
      const body = el("div", "step-body");
      body.append(
        el("h3", "", "Hidden by spoiler mode"),
        el("p", "meta", "A story step sits here. Turn spoiler mode off to reveal it."),
      );
      li.append(el("div", "step-n", `Step ${t.roadmapStep}`), body);
      return li;
    }
    const li = el("li", `step grade-${t.grade}${state.earned[t.id] ? " earned" : ""}`);
    const body = el("div", "step-body");
    const title = el("h3", "", t.name);
    title.append(gradeTag(t.grade));
    const badge = missableBadge(t);
    if (badge) title.append(badge);
    body.append(
      title,
      el("p", "desc", `“${t.description}”`),
      el("p", "meta", `${CATEGORY_LABEL[t.category]} · difficulty ${t.difficulty}/5 · ~${fmtMinutes(t.estMinutes)} · running total ≈ ${fmtMinutes(cumulativeMinutes.get(t.id))}`),
    );
    const checkLabel = el("label", "check");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = Boolean(state.earned[t.id]);
    box.setAttribute("aria-label", `Mark ${t.name} as earned`);
    box.addEventListener("change", () => {
      if (box.checked) state.earned[t.id] = true; else delete state.earned[t.id];
      saveState();
      renderAll();
    });
    checkLabel.append(box);
    li.append(el("div", "step-n", `Step ${t.roadmapStep}`), body, checkLabel);
    return li;
  }));
}

/* ---------------- stats & outline ---------------- */

function renderStats() {
  const gp = $("#grade-progress");
  gp.replaceChildren(...LIST_META.grades.map((grade) => {
    const all = TROPHIES.filter((t) => t.grade === grade);
    const got = all.filter((t) => state.earned[t.id]).length;
    const row = el("div", "grade-progress-row");
    const bar = el("div", "bar");
    const fill = el("i", grade);
    fill.style.width = `${(got / all.length) * 100}%`;
    bar.append(fill);
    row.append(el("span", "", grade), bar, el("span", "", `${got}/${all.length} · ${Math.round((got / all.length) * 100)}%`));
    return row;
  }));

  const heat = $("#heat-map");
  heat.replaceChildren(...TROPHIES.map((t) => {
    const cell = el("div", `heat-cell d${t.difficulty}${state.earned[t.id] ? " earned" : ""}`, String(t.id));
    cell.title = `${t.name} — difficulty ${t.difficulty}/5${state.earned[t.id] ? " · earned" : ""}`;
    return cell;
  }));

  const earnedMins = TROPHIES.filter((t) => state.earned[t.id]).reduce((a, t) => a + t.estMinutes, 0);
  const totals = $("#totals");
  const cards = [
    [`${earnedCount()} / ${TROPHIES.length}`, "trophies earned"],
    [fmtMinutes(totalMinutes), "estimated route to platinum"],
    [fmtMinutes(totalMinutes - earnedMins), "estimated time still to go"],
    [`${TROPHIES.filter((t) => t.missable).length}`, "missable trophies to watch"],
    [`${TROPHIES.filter((t) => t.spoiler).length}`, "story trophies spoiler mode hides"],
    [`${new Set(TROPHIES.map((t) => t.source)).size}`, "distinct sources cited on cards"],
  ];
  totals.replaceChildren(...cards.map(([num, lbl]) => {
    const c = el("div", "total-card");
    c.append(el("div", "num", num), el("div", "lbl", lbl));
    return c;
  }));

  renderOutline();
}

function renderOutline() {
  const validation = validateTrophies(TROPHIES);
  const outline = $("#outline");
  outline.replaceChildren();

  const gradeLine = LIST_META.grades.map((g) => `${validation.gradeCounts[g]} ${g}`).join(" · ");
  const catCounts = {};
  for (const t of TROPHIES) catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  const catLine = LIST_META.categories.map((c) => `${catCounts[c]} ${CATEGORY_LABEL[c].toLowerCase()}`).join(" · ");

  const head = el("p");
  head.append(
    document.createTextNode(`${LIST_META.game} (${LIST_META.platform}) — ${LIST_META.list}: `),
    el("b", "", gradeLine),
    document.createTextNode(`. By kind: ${catLine}. Estimated full route: ${fmtMinutes(totalMinutes)}.`),
  );
  outline.append(head);

  const feats = el("ul");
  for (const f of [
    "Roadmap to platinum: all 55 trophies in a recommended play order with per-step and cumulative time estimates, grade filter chips and a difficulty sort.",
    "Every card separates the guide (this app's own words) from the source quote it rests on, and names the source — a specific count or location claim is never left uncited.",
    "Checklist progress persists in localStorage and round-trips losslessly as JSON (export, import, and a reset that offers a backup first).",
    "Filters: full-text search, category, earned status, a missable-only toggle and five sort orders.",
    "Spoiler mode hides story trophies consistently — checklist cards, open details and roadmap steps all become placeholders.",
    "Stats: per-grade progress, a difficulty heat map over all 55 trophies, and live totals.",
    "The narrated roadmap intro is a local audio file in the roadmap view; the whole app runs offline from its own files.",
  ]) feats.append(el("li", "", f));
  outline.append(feats);

  const vHead = el("p", "", "Dataset validation, run at load:");
  const vList = el("ul");
  for (const r of validation.results) {
    vList.append(el("li", r.ok ? "ok" : "fail", `${r.ok ? "✓" : "✗"} ${r.label} — ${r.detail}`));
  }
  outline.append(vHead, vList);
}

/* ---------------- validation badge ---------------- */

function renderValidation() {
  const validation = validateTrophies(TROPHIES);
  const badge = $("#validation-badge");
  if (validation.ok) {
    badge.className = "validation-badge ok";
    badge.textContent = `✓ Data verified — ${TROPHIES.length} trophies (${LIST_META.grades.map((g) => `${validation.gradeCounts[g]} ${g}`).join(", ")}), ${validation.results.length} checks passed`;
  } else {
    badge.className = "validation-badge bad";
    badge.textContent = `✗ Data problems found: ${validation.failures.map((f) => f.label).join("; ")}`;
  }
}

/* ---------------- export / import / reset ---------------- */

function exportData() {
  return {
    app: "gta6-trophy-guide",
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: TROPHIES.filter((t) => state.earned[t.id]).map((t) => t.id),
  };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ioStatus(msg) { $("#io-status").textContent = msg; }

/* ---------------- views ---------------- */

function setView(name) {
  currentView = name;
  for (const tab of document.querySelectorAll(".tab")) tab.classList.toggle("active", tab.dataset.view === name);
  $("#view-checklist").hidden = name !== "checklist";
  $("#view-roadmap").hidden = name !== "roadmap";
  $("#view-stats").hidden = name !== "stats";
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderRoadmap();
  renderStats();
}

/* ---------------- wiring ---------------- */

function init() {
  $("#spoiler-toggle").checked = state.spoiler;
  $("#spoiler-toggle").addEventListener("change", (e) => {
    state.spoiler = e.target.checked;
    saveState();
    renderAll();
  });

  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  }

  $("#filter-q").addEventListener("input", (e) => { filters.q = e.target.value; renderChecklist(); });
  $("#filter-category").addEventListener("change", (e) => { filters.category = e.target.value; renderChecklist(); });
  $("#filter-status").addEventListener("change", (e) => { filters.status = e.target.value; renderChecklist(); });
  $("#filter-sort").addEventListener("change", (e) => { filters.sort = e.target.value; renderChecklist(); });
  $("#filter-missable").addEventListener("change", (e) => { filters.missableOnly = e.target.checked; renderChecklist(); });

  $("#io-export").addEventListener("click", () => {
    downloadJson("gta6-trophy-checklist.json", exportData());
    ioStatus(`Exported ${earnedCount()} earned trophies.`);
  });

  $("#io-import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.earned)) throw new Error("not a checklist export");
      const next = {};
      let skipped = 0;
      for (const id of data.earned) {
        if (byId.has(Number(id))) next[Number(id)] = true; else skipped += 1;
      }
      state.earned = next;
      saveState();
      renderAll();
      ioStatus(`Imported ${Object.keys(next).length} earned trophies${skipped ? ` (${skipped} unknown ids skipped)` : ""}.`);
    } catch {
      ioStatus("Import failed — that file is not a checklist export from this guide.");
    }
  });

  $("#io-reset").addEventListener("click", () => {
    downloadJson("gta6-trophy-checklist-backup.json", exportData());
    ioStatus("Backup downloaded. ");
    if (window.confirm("A backup of your current progress was just downloaded. Reset all progress now?")) {
      state.earned = {};
      saveState();
      renderAll();
      ioStatus("Progress reset. Your backup file can be imported to undo this.");
    }
  });

  for (const chip of document.querySelectorAll("#roadmap-grade-chips .chip")) {
    chip.addEventListener("click", () => {
      roadmapOpts.grade = chip.dataset.grade;
      for (const c of document.querySelectorAll("#roadmap-grade-chips .chip")) c.classList.toggle("active", c === chip);
      renderRoadmap();
    });
  }
  $("#roadmap-sort").addEventListener("change", (e) => { roadmapOpts.sort = e.target.value; renderRoadmap(); });

  const audio = $("#roadmap-audio");
  const audioBtn = $("#audio-toggle");
  audioBtn.addEventListener("click", () => {
    if (audio.paused) { audio.play(); audioBtn.textContent = "⏸  Pause the roadmap intro"; }
    else { audio.pause(); audioBtn.textContent = "▶  Play the roadmap intro"; }
  });
  audio.addEventListener("ended", () => { audioBtn.textContent = "▶  Play the roadmap intro"; });

  renderValidation();
  renderAll();
}

init();

/* A small handle for the screenshot scenes (src/shots.js) and for anyone
   poking at the guide from the console. */
window.GuideApp = {
  trophies: TROPHIES,
  setView,
  renderAll,
  seedEarned(ids) {
    state.earned = {};
    for (const id of ids) if (byId.has(Number(id))) state.earned[Number(id)] = true;
    saveState();
    renderAll();
  },
  setSpoiler(on) {
    state.spoiler = Boolean(on);
    $("#spoiler-toggle").checked = state.spoiler;
    saveState();
    renderAll();
  },
  expand(id) {
    expandedId = id;
    renderChecklist();
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) card.scrollIntoView({ block: "center" });
  },
  setSort(sort) {
    filters.sort = sort;
    $("#filter-sort").value = sort;
    renderChecklist();
  },
  setSearch(q) {
    filters.q = q;
    $("#filter-q").value = q;
    renderChecklist();
  },
};

/* Screenshot scenes: ?shot=<name> hands control to src/shots.js. */
const shotParam = new URLSearchParams(location.search).get("shot");
if (shotParam) {
  import("./shots.js").then((m) => m.applyShot(shotParam, window.GuideApp)).catch(() => {
    window.__shotReady = true;
  });
}
