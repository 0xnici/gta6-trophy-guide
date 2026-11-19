// Leonida Ledger — boot, routing and rendering.
// Views: checklist (cards + filters + spoiler shield), roadmap (seven stages, sortable),
// missables (flagged from the official descriptions), stats (heat map, counts, data check,
// export / import / reset). One detail panel serves every view. All filtering and all
// spoiler masking go through filters.js, so no view can disagree with another.
import { loadTrophies, auditTrophies, GRADE_ORDER, GRADE_LABEL, KIND_LABEL, STAGES, formatMinutes, difficultyDots } from './data.js';
import { loadState, saveState, blankState, toggleEarned, setCounter, exportState, parseImport, progressOf } from './store.js';
import { isMasked, shownName, shownDescription, filterTrophies, sortTrophies, nextUp } from './filters.js';

const $ = (selector) => document.querySelector(selector);

let trophies = [];
let byId = new Map();
let state = loadState();
let kindFilter = 'all';
let selectedId = null;

// ---------------------------------------------------------------- screenshot scenes
// The maker's own captures (?shot=<scene>) seed a believable mid-run checklist, then
// signal window.__shotReady once the requested view is on screen.
const shotScene = new URLSearchParams(location.search).get('shot');

function seedDemoState() {
  const earnedIds = [2, 3, 8, 16, 20, 21, 28, 33, 35, 36, 42, 44, 53];
  const earned = {};
  earnedIds.forEach((id, i) => {
    earned[id] = new Date(Date.UTC(2026, 10, 19, 12, i * 7)).toISOString();
  });
  const demo = {
    earned,
    counters: { 15: 87, 17: 19, 30: 1, 31: 34, 52: 96500 },
    hideSpoilers: true,
  };
  localStorage.setItem('leonida-ledger-v2', JSON.stringify(demo));
  return loadState();
}

if (shotScene) state = seedDemoState();

// ---------------------------------------------------------------- small helpers
function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function medal(grade) {
  return `<span class="medal ${grade}" title="${GRADE_LABEL[grade]}"></span>`;
}

function counterLine(trophy) {
  if (!trophy.target) return '';
  const now = state.counters[trophy.id] ?? 0;
  const pct = Math.min(100, Math.round((now / trophy.target.count) * 100));
  return `<div class="counter-line"><b>${now.toLocaleString('en-US')}</b> / ${trophy.target.count.toLocaleString('en-US')} ${esc(trophy.target.label)}</div>
    <div class="mini-bar"><div style="width:${pct}%"></div></div>`;
}

function cardHtml(trophy) {
  const masked = isMasked(trophy, state);
  const earned = Boolean(state.earned[trophy.id]);
  const tags = [
    `<span class="tag kind">${esc(KIND_LABEL[trophy.kind] ?? trophy.kind)}</span>`,
    `<span class="tag stage">Stage ${trophy.stage}</span>`,
    trophy.missable ? '<span class="tag missable">Missable</span>' : '',
    trophy.target ? `<span class="tag">${trophy.target.count.toLocaleString('en-US')} ${esc(trophy.target.label)}</span>` : '',
  ].join('');
  return `<article class="card${earned ? ' earned' : ''}${masked ? ' masked' : ''}" data-open="${trophy.id}" tabindex="0" role="button" aria-label="Open guide for ${esc(shownName(trophy, state))}">
    <div class="card-top">${medal(trophy.grade)}<h4>${esc(shownName(trophy, state))}</h4><span class="num">#${trophy.id}</span></div>
    <p class="desc${masked ? ' hidden-text' : ''}">${esc(shownDescription(trophy, state))}</p>
    <div class="meta">${tags}<span class="dots" title="Difficulty ${trophy.difficulty} of 5 (our estimate)">${difficultyDots(trophy.difficulty)}</span></div>
    ${counterLine(trophy)}
    <div class="foot">
      <button type="button" class="linkish" data-open="${trophy.id}">Guide &amp; sources →</button>
      <button type="button" class="earn${earned ? ' done' : ''}" data-earn="${trophy.id}">${earned ? '✓ Earned' : 'Mark earned'}</button>
    </div>
  </article>`;
}

// ---------------------------------------------------------------- header
function renderHeader() {
  const progress = progressOf(trophies, state);
  $('#earned-count').textContent = String(progress.earned);
  const pct = Math.round((progress.earned / progress.total) * 100);
  $('#bar-fill').style.width = `${pct}%`;
  $('#bar-wrap').setAttribute('aria-valuenow', String(progress.earned));
  $('#grade-counts').innerHTML = GRADE_ORDER.map(
    (grade) => `<span>${medal(grade)} ${GRADE_LABEL[grade]} ${progress.byGrade[grade]}/${progress.totals[grade]}</span>`,
  ).join('');
  const next = nextUp(trophies, state);
  $('#next-up').textContent = next
    ? `Next up: ${shownName(next, state)} — stage ${next.stage}${next.missable ? ' · missable, do not skip past it' : ''}`
    : 'Every trophy earned. Welcome to Leonida legend status.';
}

// ---------------------------------------------------------------- checklist view
function buildChips() {
  const counts = new Map();
  for (const trophy of trophies) counts.set(trophy.kind, (counts.get(trophy.kind) ?? 0) + 1);
  const missables = trophies.filter((t) => t.missable).length;
  const chips = [
    { key: 'all', label: 'All kinds', n: trophies.length },
    { key: 'missable', label: '⚠ Missable', n: missables },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => ({ key: kind, label: KIND_LABEL[kind] ?? kind, n })),
  ];
  $('#kind-chips').innerHTML = chips
    .map((chip) => `<button type="button" class="chip${kindFilter === chip.key ? ' active' : ''}" data-kind="${chip.key}">${esc(chip.label)} <span class="n">${chip.n}</span></button>`)
    .join('');
}

function currentCriteria() {
  return {
    query: $('#search').value,
    kind: kindFilter,
    grade: $('#grade-filter').value,
    status: $('#status-filter').value,
  };
}

function renderChecklist() {
  buildChips();
  const matched = sortTrophies(filterTrophies(trophies, state, currentCriteria()), $('#sort-mode').value);
  $('#cards').innerHTML = matched.map(cardHtml).join('');
  $('#empty-note').hidden = matched.length > 0;
  const earnedShown = matched.filter((t) => state.earned[t.id]).length;
  $('#results-line').textContent =
    `Showing ${matched.length} of ${trophies.length} trophies · ${earnedShown} earned in this view · ` +
    `spoiler shield ${state.hideSpoilers ? 'on (story trophies hidden until earned)' : 'off'}`;
}

// ---------------------------------------------------------------- roadmap view
function renderRoadmap() {
  const sortMode = $('#roadmap-sort').value;
  const grade = $('#roadmap-grade').value;
  let totalMinutes = 0;
  let remainingMinutes = 0;
  const html = STAGES.map((stage) => {
    let rows = trophies.filter((t) => t.stage === stage.n);
    if (grade !== 'all') rows = rows.filter((t) => t.grade === grade);
    rows = sortTrophies(rows, sortMode === 'stage' ? 'list' : sortMode);
    const stageAll = trophies.filter((t) => t.stage === stage.n);
    const done = stageAll.filter((t) => state.earned[t.id]).length;
    for (const t of stageAll) {
      totalMinutes += t.est_minutes;
      if (!state.earned[t.id]) remainingMinutes += t.est_minutes;
    }
    const body = rows
      .map((t) => {
        const earned = Boolean(state.earned[t.id]);
        const counter = t.target
          ? `<span class="tdesc">${(state.counters[t.id] ?? 0).toLocaleString('en-US')} / ${t.target.count.toLocaleString('en-US')} ${esc(t.target.label)}</span>`
          : '';
        return `<tr class="row${earned ? ' done' : ''}" data-open="${t.id}">
          <td>${medal(t.grade)}</td>
          <td><span class="tname">${esc(shownName(t, state))}</span><span class="tdesc">${esc(shownDescription(t, state))}</span>${counter}</td>
          <td>${esc(KIND_LABEL[t.kind] ?? t.kind)}${t.missable ? ' · <b>missable</b>' : ''}</td>
          <td><span class="dots">${difficultyDots(t.difficulty)}</span></td>
          <td class="num">${formatMinutes(t.est_minutes)}</td>
          <td>${earned ? '✓ earned' : 'open'}</td>
        </tr>`;
      })
      .join('');
    return `<section class="stage">
      <div class="stage-head"><span class="stage-no">Stage ${stage.n}</span><h3>${esc(stage.title)}</h3>
      <span class="stage-sum">${done}/${stageAll.length} earned · ≈ ${formatMinutes(stageAll.reduce((s, t) => s + t.est_minutes, 0))} of play</span></div>
      <p class="blurb">${esc(stage.blurb)}</p>
      <table class="road"><thead><tr><th></th><th>Trophy</th><th>Kind</th><th>Difficulty*</th><th class="num">Time*</th><th>Status</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6">No trophies of that grade in this stage.</td></tr>'}</tbody></table>
    </section>`;
  }).join('');
  $('#roadmap-stages').innerHTML = html;
  $('#roadmap-total').textContent =
    `Whole list ≈ ${formatMinutes(totalMinutes)} of play by our estimates (${formatMinutes(remainingMinutes)} still to go). *Difficulty and times are our estimates, not official figures.`;
}

// ---------------------------------------------------------------- missables view
function renderMissables() {
  const flagged = trophies.filter((t) => t.missable).sort((a, b) => a.stage - b.stage || a.id - b.id);
  $('#missable-cards').innerHTML = flagged.map(cardHtml).join('');
}

// ---------------------------------------------------------------- stats view
function renderStats() {
  const progress = progressOf(trophies, state);
  const gradeRows = GRADE_ORDER.map(
    (grade) => `<tr><td>${medal(grade)} ${GRADE_LABEL[grade]}</td><td class="num">${progress.byGrade[grade]} / ${progress.totals[grade]}</td></tr>`,
  ).join('');
  const kindCounts = new Map();
  for (const t of trophies) {
    const row = kindCounts.get(t.kind) ?? { total: 0, earned: 0 };
    row.total += 1;
    if (state.earned[t.id]) row.earned += 1;
    kindCounts.set(t.kind, row);
  }
  const kindRows = [...kindCounts.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([kind, row]) => `<tr><td>${esc(KIND_LABEL[kind] ?? kind)}</td><td class="num">${row.earned} / ${row.total}</td></tr>`)
    .join('');
  $('#stats-table').innerHTML =
    `<table class="counts"><thead><tr><th>Grade</th><th class="num">Earned</th></tr></thead><tbody>${gradeRows}</tbody></table>` +
    `<table class="counts"><thead><tr><th>Kind</th><th class="num">Earned</th></tr></thead><tbody>${kindRows}</tbody></table>`;
  $('#heat-map').innerHTML = trophies
    .map((t) => {
      const earned = Boolean(state.earned[t.id]);
      return `<button type="button" class="cell d${t.difficulty} g-${t.grade}${earned ? ' earned' : ''}" data-open="${t.id}" title="#${t.id} ${esc(shownName(t, state))} — ${GRADE_LABEL[t.grade]}, difficulty ${t.difficulty}">${t.id}${earned ? '✓' : ''}</button>`;
    })
    .join('');
  const problems = auditTrophies(trophies);
  $('#data-check').textContent = problems.length
    ? `Problems found: ${problems.join('; ')}.`
    : `Checked live against the loaded data: ${trophies.length} trophies, ids unique, grades 1 platinum / 2 gold / 6 silver / 46 bronze, ` +
      `every trophy carries a guide and at least one cited source, roadmap stages run 1–7, difficulty estimates run 1–5. All checks pass.`;
}

// ---------------------------------------------------------------- detail panel
function openDetail(id) {
  const trophy = byId.get(Number(id));
  if (!trophy) return;
  selectedId = trophy.id;
  const masked = isMasked(trophy, state);
  const earned = Boolean(state.earned[trophy.id]);
  const stage = STAGES.find((s) => s.n === trophy.stage);
  const counter = trophy.target
    ? `<h5>Your count</h5>
       <div class="counter-ctl">
         <button type="button" data-count="-1">−</button>
         <input type="number" id="counter-input" min="0" max="${trophy.target.count}" value="${state.counters[trophy.id] ?? 0}">
         <button type="button" data-count="1">+</button>
         <span>of ${trophy.target.count.toLocaleString('en-US')} ${esc(trophy.target.label)}</span>
       </div>`
    : '';
  const guideBlock = masked
    ? `<h5>Guide</h5><p>Hidden by the spoiler shield. Mark this trophy earned — or switch the shield off — to read its guide.</p>`
    : `<h5>Guide — our own words</h5><p>${esc(trophy.guide)}</p>
       <h5>Unlock path</h5>
       <ol>${trophy.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
       <h5>Sources</h5>
       <ul class="sources">${trophy.sources.map((s) => `<li>${esc(s.label)}${s.url ? ` — <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : ''}</li>`).join('')}</ul>
       <p class="small">The official name, description and grade above are quoted from the official list; everything in the guide is written for this page and cites where its facts come from.</p>`;
  $('#detail').innerHTML = `
    <button type="button" class="close" id="detail-close">Close ✕</button>
    <p class="cap">#${trophy.id} · ${GRADE_LABEL[trophy.grade]} · ${esc(KIND_LABEL[trophy.kind] ?? trophy.kind)} · Roadmap stage ${trophy.stage} — ${esc(stage?.title ?? '')}</p>
    <h2>${medal(trophy.grade)} ${esc(shownName(trophy, state))}</h2>
    <div class="meta">
      ${trophy.missable ? '<span class="tag missable">Missable</span>' : ''}
      <span class="tag">Difficulty* <span class="dots">${difficultyDots(trophy.difficulty)}</span></span>
      <span class="tag">≈ ${formatMinutes(trophy.est_minutes)}*</span>
      ${earned ? '<span class="tag">✓ Earned</span>' : ''}
    </div>
    <div class="official"><p class="cap">Official description, as PlayStation publishes it</p><p>“${esc(shownDescription(trophy, state))}”</p></div>
    ${trophy.missable && !masked ? `<p class="warn">⚠ Missable: ${esc(trophy.missable_note ?? 'Its official description points at a one-time window — see the guide before you play past it.')}</p>` : ''}
    ${guideBlock}
    ${counter}
    <button type="button" class="earn earn-wide${earned ? ' done' : ''}" data-earn="${trophy.id}">${earned ? '✓ Earned — tap to undo' : 'Mark as earned'}</button>
    <p class="small">*Difficulty and time are our estimates. Earned state and counters are saved in this browser only.</p>`;
  $('#detail').hidden = false;
  $('#backdrop').hidden = false;
  $('#detail-close').addEventListener('click', closeDetail);
  const input = $('#counter-input');
  if (input) {
    input.addEventListener('change', () => {
      setCounter(state, trophy.id, input.value, trophy.target?.count);
      saveState(state);
      refresh();
      openDetail(trophy.id);
    });
    document.querySelectorAll('[data-count]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const now = (state.counters[trophy.id] ?? 0) + Number(btn.dataset.count);
        setCounter(state, trophy.id, now, trophy.target?.count);
        saveState(state);
        refresh();
        openDetail(trophy.id);
      }),
    );
  }
}

function closeDetail() {
  selectedId = null;
  $('#detail').hidden = true;
  $('#backdrop').hidden = true;
}

// ---------------------------------------------------------------- data tools
function dataMessage(text, ok) {
  const el = $('#data-msg');
  el.textContent = text;
  el.className = ok ? 'ok' : 'err';
}

function wireDataTools() {
  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leonida-ledger-progress.json';
    a.click();
    URL.revokeObjectURL(url);
    dataMessage('Exported. Keep that file — it is the only copy of your progress outside this browser.', true);
  });
  const applyImport = (text) => {
    try {
      state = parseImport(text, byId.keys());
      saveState(state);
      refresh();
      dataMessage('Import applied: earned trophies, counters and settings restored exactly as exported.', true);
    } catch (error) {
      dataMessage(error.message, false);
    }
  };
  $('#import-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (file) applyImport(await file.text());
    event.target.value = '';
  });
  $('#import-btn').addEventListener('click', () => applyImport($('#import-text').value));
  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Reset the whole checklist? Export first if you might want this progress back — a reset cannot be undone.')) return;
    state = blankState();
    saveState(state);
    refresh();
    dataMessage('Checklist reset to a fresh start.', true);
  });
}

// ---------------------------------------------------------------- routing & refresh
const ROUTES = { '': 'checklist', roadmap: 'roadmap', missables: 'missables', stats: 'stats' };

function currentRoute() {
  const key = location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES[key] ?? 'checklist';
}

function applyRoute() {
  const route = shotScene === 'roadmap' && !location.hash ? 'roadmap' : currentRoute();
  for (const name of Object.values(ROUTES)) {
    $(`#view-${name}`).hidden = name !== route;
  }
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.route === route);
  });
  if (route === 'roadmap') renderRoadmap();
  if (route === 'missables') renderMissables();
  if (route === 'stats') renderStats();
}

function refresh() {
  renderHeader();
  renderChecklist();
  const route = currentRoute();
  if (route === 'roadmap') renderRoadmap();
  if (route === 'missables') renderMissables();
  if (route === 'stats') renderStats();
}

// ---------------------------------------------------------------- wiring
function wire() {
  ['search', 'grade-filter', 'status-filter', 'sort-mode'].forEach((id) => {
    $(`#${id}`).addEventListener('input', renderChecklist);
    $(`#${id}`).addEventListener('change', renderChecklist);
  });
  $('#spoiler-toggle').addEventListener('change', (event) => {
    state.hideSpoilers = event.target.checked;
    saveState(state);
    refresh();
  });
  $('#kind-chips').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (!chip) return;
    kindFilter = chip.dataset.kind;
    renderChecklist();
  });
  $('#roadmap-sort').addEventListener('change', renderRoadmap);
  $('#roadmap-grade').addEventListener('change', renderRoadmap);
  document.addEventListener('click', (event) => {
    const earnBtn = event.target.closest('[data-earn]');
    if (earnBtn) {
      event.stopPropagation();
      toggleEarned(state, earnBtn.dataset.earn);
      saveState(state);
      refresh();
      if (selectedId !== null) openDetail(selectedId);
      return;
    }
    const opener = event.target.closest('[data-open]');
    if (opener) openDetail(opener.dataset.open);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
    if (event.key === 'Enter') {
      const opener = event.target.closest?.('[data-open]');
      if (opener) openDetail(opener.dataset.open);
    }
  });
  $('#backdrop').addEventListener('click', closeDetail);
  window.addEventListener('hashchange', applyRoute);
  wireDataTools();
}

// ---------------------------------------------------------------- boot
async function boot() {
  trophies = await loadTrophies();
  byId = new Map(trophies.map((t) => [t.id, t]));
  $('#spoiler-toggle').checked = state.hideSpoilers;
  wire();
  renderHeader();
  renderChecklist();
  if (shotScene === 'detail') openDetail(37);
  if (shotScene === 'spoilers') {
    kindFilter = 'story';
    renderChecklist();
  }
  if (shotScene === 'roadmap') applyRoute();
  else if (location.hash) applyRoute();
  if (shotScene) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  }
}

boot().catch((error) => {
  document.querySelector('main').innerHTML = `<p class="empty">The guide could not load its trophy data: ${esc(error.message)}</p>`;
});
