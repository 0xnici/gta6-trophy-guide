// Boot, rendering and interactions for the GTA 6 Trophy Guide.
// Views: checklist+detail, roadmap (with local audio intro), stats/heat map/outline.
import { loadTrophies, validateTrophies, effortOf, ROADMAP } from "./data.js";
import { loadState, saveState, exportPayload, parseImport } from "./store.js";
import { applyFilters, isMasked, displayName, displayDescription } from "./filters.js";

const $ = s => document.querySelector(s);
let trophies = [];
let state = loadState();
let selectedId = null;

function earnedCount() { return trophies.filter(t => state.earned[t.id]).length; }

function renderProgress() {
  const n = earnedCount(), total = trophies.length;
  $("#big-count").textContent = `${n} / ${total}`;
  $("#bar-fill").style.width = `${total ? (n / total) * 100 : 0}%`;
  $("#progress-line").textContent = `${total ? Math.round((n / total) * 100) : 0}% earned`;
  const counts = {};
  for (const t of trophies) if (state.earned[t.id]) counts[t.grade] = (counts[t.grade] || 0) + 1;
  $("#grade-counts").textContent = ["platinum", "gold", "silver", "bronze"].map(g => `${g}: ${counts[g] || 0}`).join(" · ");
}

function uiState() {
  return { q: $("#q").value, kind: $("#f-kind").value, grade: $("#f-grade").value, status: $("#f-status").value, missable: $("#f-missable").checked };
}

function cardHtml(t) {
  const masked = isMasked(t, state);
  return `<article class="card ${state.earned[t.id] ? "earned" : ""}" data-id="${t.id}" tabindex="0">
    <h3><span class="badge b-${t.grade}">${t.grade}</span>${displayName(t, state)}</h3>
    <p>${displayDescription(t, state)}</p>
    <p><span class="kind">${t.kind}</span> ${t.missable ? '<span class="flag">⚠ MISSABLE</span>' : ""} ${t.spoiler ? '<span class="flag">STORY / SPOILER</span>' : ""} ${t.target ? `<span class="kind">target ${t.target}</span>` : ""}</p>
    <label><input type="checkbox" data-earn="${t.id}" ${state.earned[t.id] ? "checked" : ""}> Earned</label>
    ${masked ? "" : `<p>${String(t.guide).slice(0, 170)}…</p>`}
  </article>`;
}

function renderList() {
  const rows = applyFilters(trophies, state, uiState());
  $("#list").innerHTML = rows.map(cardHtml).join("") || "<p>No trophies match those filters.</p>";
  $("#result-count").textContent = `${rows.length} of ${trophies.length} shown`;
  document.querySelectorAll("[data-earn]").forEach(box => box.addEventListener("change", () => {
    const id = box.getAttribute("data-earn");
    if (box.checked) state.earned[id] = true; else delete state.earned[id];
    saveState(state); renderAll();
  }));
  document.querySelectorAll(".card").forEach(card => card.addEventListener("click", e => {
    if (e.target.matches("[data-earn]")) return;
    selectedId = card.getAttribute("data-id"); renderDetail();
  }));
}

function renderDetail() {
  const box = $("#detail");
  const t = trophies.find(x => x.id === selectedId);
  if (!t) { box.innerHTML = '<p class="hint">Select a trophy to read its full guide, missable note and cited sources.</p>'; return; }
  if (isMasked(t, state)) {
    box.innerHTML = `<h2>Hidden story trophy</h2><p>${displayDescription(t, state)}</p><p><span class="badge b-${t.grade}">${t.grade}</span> <span class="kind">${t.kind}</span></p>`;
    return;
  }
  const sources = (t.sources || []).map(s => `<li><a href="${s.url}">${s.label}</a> — ${s.url}</li>`).join("");
  box.innerHTML = `<h2><span class="badge b-${t.grade}">${t.grade}</span>${t.name}</h2>
    <p><em>${t.description}</em></p>
    <p>${t.missable ? '<span class="flag">⚠ MISSABLE — flagged from the official description; see the guide for when it can be lost.</span>' : "Not missable: this can be earned in free roam or replayed."}</p>
    <h3>Guide (our own words)</h3><p>${t.guide}</p>
    <h3>Sources cited</h3><ul>${sources}</ul>
    <label><input type="checkbox" data-earn-detail ${state.earned[t.id] ? "checked" : ""}> Mark as earned</label>`;
  box.querySelector("[data-earn-detail]").addEventListener("change", e => {
    if (e.target.checked) state.earned[t.id] = true; else delete state.earned[t.id];
    saveState(state); renderAll();
  });
}

function renderRoadmap() {
  let cumulative = 0;
  $("#roadmap-steps").innerHTML = ROADMAP.map((s, i) => {
    cumulative += s.hours;
    const ids = trophies.filter(t => roadmapStepOf(t) === i + 1);
    const done = ids.filter(t => state.earned[t.id]).length;
    return `<div class="step"><h3>${s.title}</h3><p>Difficulty: <strong>${s.difficulty}</strong> · Estimated: <strong>${s.hours} h</strong> · Cumulative: <strong>${cumulative} h</strong> · Progress in step: ${done}/${ids.length}</p><p>${s.note}</p></div>`;
  }).join("");
  const total = ROADMAP.reduce((a, s) => a + s.hours, 0);
  $("#roadmap-total").textContent = `Total estimate: about ${total} hours to platinum across ${ROADMAP.length} steps. Estimates are this guide's own planning figures, not official data.`;
}

function roadmapStepOf(t) {
  if (t.kind === "story") return t.id === "t07" ? 3 : (["t02","t03","t04"].includes(t.id) ? 1 : 2);
  if (t.kind === "stranger" || t.kind === "co-op") return 3;
  if (t.kind === "activity" || t.kind === "combat" && t.id === "t36") return 4;
  return 5;
}

function renderStats() {
  $("#heatmap").innerHTML = trophies.map(t => {
    const e = effortOf(t);
    const label = isMasked(t, state) ? "Hidden story trophy" : t.name;
    return `<div class="cell e${e}" title="${label} — effort ${e}/5"><strong>${label}</strong><br>${t.grade} · effort ${e}/5${t.missable ? " · missable" : ""}${state.earned[t.id] ? " · ✓ earned" : ""}</div>`;
  }).join("");
  const v = validateTrophies(trophies);
  $("#outline").textContent =
`Generated from app/data/trophies.json at run time — nothing here is hand-typed.
Total trophies loaded: ${v.total}
Unique ids: ${v.uniqueIds} (expected 55, all unique: ${v.uniqueIds === v.total && v.total === 55})
Grades present: ${Object.entries(v.grades).map(([g, n]) => `${g} × ${n}`).join(", ")}
Grade enum check: only platinum / gold / silver / bronze allowed — ${v.problems.length === 0 ? "PASS" : "FAIL"}
Every trophy has a non-blank guide: ${v.problems.length === 0 ? "PASS" : "FAIL"}
Missable-flagged: ${v.missable} · Story/spoiler-flagged: ${v.spoiler}
Kinds in use: ${v.kinds.join(", ")}
Problems: ${v.problems.length ? v.problems.join("; ") : "none"}`;
}

function renderAll() { renderProgress(); renderList(); renderDetail(); renderRoadmap(); renderStats(); }

function switchView(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.getAttribute("data-view") === name));
  for (const v of ["checklist", "roadmap", "stats"]) $(`#view-${v}`).hidden = v !== name;
}

function setupShot() {
  const shot = new URLSearchParams(location.search).get("shot");
  if (!shot) return false;
  const seed = ["t02", "t03", "t04", "t05", "t08", "t16", "t21", "t35", "t53"];
  for (const id of seed) state.earned[id] = true;
  saveState(state);
  if (shot === "roadmap") switchView("roadmap");
  else if (shot === "stats") switchView("stats");
  else if (shot === "detail") {
    state.spoilerHide = true; $("#f-spoiler").checked = true;
    selectedId = "t37"; // Catch Me If You Can — missable, guide + citation in the detail pane
  }
  renderAll();
  requestAnimationFrame(() => setTimeout(() => { window.__shotReady = true; }, 350));
  return true;
}

async function boot() {
  trophies = await loadTrophies();
  const kinds = [...new Set(trophies.map(t => t.kind))].sort();
  $("#f-kind").innerHTML = '<option value="">All kinds</option>' + kinds.map(k => `<option>${k}</option>`).join("");
  $("#f-spoiler").checked = state.spoilerHide !== false;
  for (const el of ["#q", "#f-kind", "#f-grade", "#f-status", "#f-missable"]) $(el).addEventListener("input", renderList);
  $("#f-spoiler").addEventListener("change", e => { state.spoilerHide = e.target.checked; saveState(state); renderAll(); });
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => switchView(b.getAttribute("data-view"))));
  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([exportPayload(state)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gta6-trophy-progress.json"; a.click();
    URL.revokeObjectURL(a.href); $("#save-msg").textContent = "Exported.";
  });
  $("#file-import").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    const result = parseImport(await file.text(), new Set(trophies.map(t => t.id)));
    if (!result.ok) { $("#save-msg").textContent = `Import failed: ${result.error}`; return; }
    state = result.state; saveState(state); $("#f-spoiler").checked = state.spoilerHide; renderAll();
    $("#save-msg").textContent = "Import applied.";
  });
  $("#btn-reset").addEventListener("click", () => {
    if (!confirm("Reset all progress? Tip: Export a backup JSON first — this cannot be undone.")) return;
    state = { earned: {}, spoilerHide: true }; saveState(state); $("#f-spoiler").checked = true; renderAll();
    $("#save-msg").textContent = "Progress reset.";
  });
  const audio = $("#roadmap-audio");
  $("#btn-listen").addEventListener("click", () => { audio.play(); });
  if (!setupShot()) renderAll();
}

boot().catch(err => { document.body.insertAdjacentHTML("beforeend", `<p role="alert">${err.message}</p>`); });
