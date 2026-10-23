// The big part of the page: the gauge you picked (hero, tabs, river picture, chart, what floods).
// Also decides which gauge is picked and whether you are looking at a gauge or at Your roads.
//
// Needs: riverSVG and RIVER_WATER (crosssection.js), the helpers in dashboard.js (trendLine, etaText),
// renderSummary / renderGaugeList / markSelected (sidebar.js), shownResults (dashboard.js).

const TABS = [["now", "Now"], ["week", "7 days"], ["floods", "What floods"]];
const HISTORY_MAX_AGE_MS = 15 * 60 * 1000;

let selectedId = null;      // USGS id of the gauge on screen
let userPicked = false;     // true once someone chose a gauge (or the address named one)
let currentView = "gauge";  // "gauge" or "roads"
let activeTab = "now";
let weekChart = null;
let historyToken = 0;       // goes up every time we redraw, so a slow answer for an old gauge is ignored
const historyCache = {};    // USGS id -> { time, entry }

const startParams = new URLSearchParams(window.location.search);
if (TABS.some(tab => tab[0] === startParams.get("tab"))) {
  activeTab = startParams.get("tab");
}
if (startParams.get("gauge")) {
  userPicked = true;
}

// Change one thing in the address bar without reloading the page.
function setUrlParam(key, value) {
  try {
    const url = new URL(window.location.href);
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    history.replaceState(null, "", url);
  } catch (error) {
    // Not important: the address bar just won't match what is on screen.
  }
}

// Which gauge to show: the one in the address, the one you last picked, or the most serious one.
function chooseSelected(results) {
  const has = id => results.some(r => r.id === id);
  const fromAddress = new URLSearchParams(window.location.search).get("gauge");

  if (userPicked && selectedId !== null && has(selectedId)) {
    return selectedId;
  }
  if (fromAddress && has(fromAddress)) {
    userPicked = true;
    return fromAddress;
  }
  userPicked = false;

  // Highest tier first, then the smallest distance to the next impact.
  const gapOf = r => (r.gap === null ? Infinity : r.gap);
  const sorted = [...results].sort((a, b) => RANK[b.tier] - RANK[a.tier] || gapOf(a) - gapOf(b));
  return sorted[0].id;
}

function feetText(ft) {
  return Number.isFinite(ft) ? `${ft} ft` : "Not listed";
}

function gapText(r) {
  const m = r.model;
  if (m.risk.next) {
    return `${m.gap.toFixed(2)} ft below the next listed impact`;
  }
  if (r.gauge.impacts.length === 0) {
    return "NWS has not published street-level impacts for this gauge.";
  }
  return "Above every impact NWS lists here";
}

function relativeText(ft, height) {
  if (!Number.isFinite(ft)) {
    return "NWS does not list one";
  }
  return height >= ft ? "Reached" : `${(ft - height).toFixed(2)} ft higher`;
}

function trendStat(rate) {
  if (!rate) {
    return { word: "Not enough data", sub: "Needs about 2 hours of readings" };
  }
  const change = rate.perHour * rate.hours;
  const word = Math.abs(change) < 0.05 ? "Steady" : change > 0 ? "Rising" : "Falling";
  return { word, sub: `${change >= 0 ? "+" : "-"}${Math.abs(change).toFixed(2)} ft in ${Math.round(rate.hours)} hr` };
}

function nwsLink(r) {
  return r.gauge.nwsId
    ? ` &middot; <a href="https://water.noaa.gov/gauges/${clean(r.gauge.nwsId)}" target="_blank" rel="noopener">View on NWS</a>`
    : "";
}

function sourceText(r) {
  return r.gauge.verified
    ? "Thresholds checked by our team against NWS"
    : "NWS data, not independently checked by us";
}

function heroHTML(r) {
  const m = r.model;

  if (m === null) {
    return `
      <section class="hero" data-tier="Unknown">
        <div class="hero-main">
          <h2 id="gauge-title" tabindex="-1">${clean(r.place)}</h2>
          <p class="hero-full">${clean(r.name)}</p>
          <p class="hero-status">No data</p>
          <p class="hero-gap">No current reading is available for this gauge.</p>
          <p class="hero-meta">${sourceText(r)}${nwsLink(r)}</p>
        </div>
      </section>`;
  }

  const miles = r.miles !== undefined ? ` &middot; ${r.miles.toFixed(1)} mi away` : "";
  const trend = m.rate ? ` &middot; ${trendLine(m.rate)}` : "";
  const fast = m.fast ? '<span class="pill-fast">Rising fast</span>' : "";
  const eta = m.hours === null
    ? ""
    : `<p class="hero-eta">If it keeps rising at this rate, the water could reach ${m.risk.next.stage} ft in ${etaText(m.hours)}. This is a rough estimate, not a forecast: rivers can slow down, level off or rise faster. For official forecasts see the National Weather Service.</p>`;

  let updated;
  if (m.simulated !== null) {
    updated = '<span class="demo-flag">SIMULATED DATA (demo mode)</span>';
  } else {
    const old = (new Date() - m.latest.time) > 2 * 3600000; // older than 2 hours
    updated = `${old ? "Old reading, from" : "Updated"} ${clock(m.latest.time)}`;
  }

  return `
    <section class="hero" data-tier="${r.tier}">
      <div class="hero-main">
        <h2 id="gauge-title" tabindex="-1">${clean(r.place)}</h2>
        <p class="hero-full">${clean(r.name)}${miles}</p>
        <p class="hero-status">${r.tier}${trend}${fast}</p>
        <p class="hero-gap">${gapText(r)}</p>
        ${eta}
        <p class="hero-meta">${updated} &middot; ${sourceText(r)}${nwsLink(r)}</p>
      </div>
      <p class="hero-height">${m.height}<span> ft</span></p>
    </section>`;
}

function nowPanelHTML(r) {
  const m = r.model;
  const cats = r.gauge.categories;
  const river = riverSVG({
    id: r.id,
    height: m.height,
    tier: r.tier,
    minor: cats.minor,
    major: cats.major,
    nextStage: m.risk.next ? m.risk.next.stage : null
  });
  const trend = trendStat(m.rate);

  const affected = [...m.risk.affected].reverse().map(i =>
    `<li><span class="stage">${i.stage} ft</span><span>${clean(i.statement)}</span></li>`).join("");
  const affectedHTML = m.risk.affected.length > 0
    ? `<ul class="impact-rows">${affected}</ul>`
    : `<p class="muted">No impacts listed by NWS have been reached at this level.</p>`;

  const nextHTML = m.risk.next
    ? `<p><strong>Next impact at ${m.risk.next.stage} ft</strong> (${m.gap.toFixed(1)} ft higher): ${clean(m.risk.next.statement)}</p>`
    : `<p class="muted">${r.gauge.impacts.length === 0 ? "NWS has not published street-level impacts for this gauge." : "The water is above every impact NWS lists for this gauge."}</p>`;

  return `
    <div class="now-grid">
      <div class="panel-card">
        <h3>River picture</h3>
        ${river}
      </div>
      <div class="panel-card">
        <h3>Key levels</h3>
        <div class="stats">
          <div><p class="stat-label">Next listed impact</p><p class="stat-value">${m.risk.next ? m.risk.next.stage + " ft" : "None"}</p><p class="stat-sub">${m.risk.next ? m.gap.toFixed(2) + " ft higher" : "none above this level"}</p></div>
          <div><p class="stat-label">NWS flood stage</p><p class="stat-value">${feetText(cats.minor)}</p><p class="stat-sub">${relativeText(cats.minor, m.height)}</p></div>
          <div><p class="stat-label">Major flood stage</p><p class="stat-value">${feetText(cats.major)}</p><p class="stat-sub">${relativeText(cats.major, m.height)}</p></div>
          <div><p class="stat-label">Trend</p><p class="stat-value">${trend.word}</p><p class="stat-sub">${trend.sub}</p></div>
        </div>
      </div>
    </div>
    <div class="panel-card spaced">
      <h3>Affected right now</h3>
      ${affectedHTML}
    </div>
    <div class="panel-card spaced">
      <h3>Next impact</h3>
      ${nextHTML}
    </div>`;
}

function weekPanelHTML() {
  if (demoIsOn()) {
    return `<div class="panel-card"><p class="muted">Demo mode simulates the current height only. Switch back to live readings to see the real 7-day history.</p></div>`;
  }
  return `
    <div class="panel-card">
      <h3>Gauge height, last 7 days</h3>
      <div class="chart-box"><canvas id="week-chart" aria-label="Line chart of the gauge height in feet over the last 7 days"></canvas></div>
      <p class="muted" id="week-note"></p>
    </div>`;
}

// Every NWS level for this gauge in one list, highest first, with a marker where the river is now.
function floodsPanelHTML(r) {
  const cats = r.gauge.categories;
  const height = r.model.height;
  const rows = r.gauge.impacts.map(i => ({ stage: i.stage, text: clean(i.statement), kind: "impact" }));
  rows.push({ stage: cats.action, text: "NWS action stage", kind: "level" });
  rows.push({ stage: cats.minor, text: "NWS flood stage", kind: "level" });
  rows.push({ stage: cats.moderate, text: "Moderate flood stage", kind: "level" });
  rows.push({ stage: cats.major, text: "Major flood stage", kind: "level" });
  rows.push({ stage: height, text: "The river is here now", kind: "now" });
  const listed = rows.filter(row => Number.isFinite(row.stage));
  listed.sort((a, b) => b.stage - a.stage || (a.kind === "now" ? 1 : 0) - (b.kind === "now" ? 1 : 0));

  const items = listed.map(row => {
    const reached = row.kind !== "now" && height >= row.stage;
    return `<li class="${row.kind}${reached ? " reached" : ""}"><span class="stage">${row.stage} ft</span><span>${row.text}</span></li>`;
  }).join("");

  return `
    <div class="panel-card">
      <h3>What floods, from the National Weather Service</h3>
      <ul class="impact-rows ladder">${items}</ul>
      <p class="muted">Highlighted rows are levels the river has already reached. NWS says "threatened", not "closed". Thresholds checked by our team.</p>
    </div>`;
}

function panelHTML(key, r) {
  const body = key === "now" ? nowPanelHTML(r) : key === "week" ? weekPanelHTML() : floodsPanelHTML(r);
  return `<section role="tabpanel" id="panel-${key}" aria-labelledby="tab-${key}" ${key === activeTab ? "" : "hidden"}>${body}</section>`;
}

async function loadHistory(id) {
  const cached = historyCache[id];
  if (cached && Date.now() - cached.time < HISTORY_MAX_AGE_MS) {
    return cached.entry;
  }
  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${id}&parameterCd=00065&period=P7D&siteStatus=all&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS returned status ${response.status}`);
  }
  const data = await response.json();
  const entry = data.value.timeSeries.find(e => e.sourceInfo.siteCode[0].value === id) || null;
  historyCache[id] = { time: Date.now(), entry };
  return entry;
}

function destroyChart() {
  historyToken++; // any answer still on its way is now out of date
  if (weekChart) {
    weekChart.destroy();
    weekChart = null;
  }
}

async function drawChart(r) {
  if (!document.getElementById("week-chart")) {
    return; // demo mode shows a message instead of a chart
  }
  const note = document.getElementById("week-note");
  const token = ++historyToken;
  note.textContent = "Loading the last 7 days...";

  let entry;
  try {
    entry = await loadHistory(r.id);
  } catch (error) {
    console.error("Failed to load 7-day history:", error);
    if (token === historyToken) {
      note.textContent = "Couldn't load the 7-day history from USGS just now.";
    }
    return;
  }
  const canvas = document.getElementById("week-chart");
  if (token !== historyToken || !canvas) {
    return; // the page moved on while we waited
  }

  const readings = readingsOf(entry);
  if (typeof Chart === "undefined") {
    note.textContent = "The chart library could not be loaded. Check your connection and reload.";
    return;
  }
  if (readings.length === 0) {
    note.textContent = "USGS has no readings for this gauge in the last 7 days.";
    return;
  }
  if (weekChart) {
    weekChart.destroy();
  }

  const m = r.model;
  const cats = r.gauge.categories;
  const colour = RIVER_WATER[r.tier] ? RIVER_WATER[r.tier][1] : "#2463AE";
  const datasets = [{
    label: "Gauge height (ft)",
    data: readings.map(x => x.height),
    borderColor: colour,
    backgroundColor: colour + "22",
    fill: true, pointRadius: 0, borderWidth: 2, tension: 0.2
  }];
  const line = (label, ft, lineColour) => ({
    label, data: readings.map(() => ft), borderColor: lineColour, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false
  });
  if (m.risk.next) {
    datasets.push(line(`Next listed impact (${m.risk.next.stage} ft)`, m.risk.next.stage, "#8A5200"));
  }
  if (Number.isFinite(cats.minor)) {
    datasets.push(line(`NWS flood stage (${cats.minor} ft)`, cats.minor, "#A33F0B"));
  }

  Chart.defaults.font.family = "Manrope, system-ui, sans-serif";
  weekChart = new Chart(canvas, {
    type: "line",
    data: { labels: readings.map(x => x.time.toLocaleString([], { month: "short", day: "numeric", hour: "numeric" })), datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { intersect: false, mode: "index" },
      plugins: { legend: { position: "bottom" } },
      scales: { x: { ticks: { maxTicksLimit: 6, maxRotation: 0 } }, y: { title: { display: true, text: "feet" } } }
    }
  });
  note.textContent = "Readings are about every 15 minutes. Dashed lines are NWS levels for this gauge.";
}

function selectedResult() {
  return shownResults.find(r => r.id === selectedId) || null;
}

function showTab(key, moveFocus) {
  activeTab = key;
  TABS.forEach(([k]) => {
    const tab = document.getElementById(`tab-${k}`);
    const panel = document.getElementById(`panel-${k}`);
    if (!tab || !panel) {
      return;
    }
    tab.setAttribute("aria-selected", String(k === key));
    tab.tabIndex = k === key ? 0 : -1;
    panel.hidden = k !== key;
  });
  setUrlParam("tab", key);
  if (moveFocus) {
    document.getElementById(`tab-${key}`).focus();
  }
  if (key === "week") {
    drawChart(selectedResult());
  }
}

function renderGaugeView() {
  const box = document.getElementById("gauge-view");
  const r = selectedResult();
  destroyChart();
  if (!r) {
    box.innerHTML = "";
    return;
  }
  document.title = `${r.place} - FloodWatch`;

  // The 7-day and What-floods tabs are only for our own checked gauges.
  const hasTabs = r.model !== null && r.gauge.verified;
  if (!hasTabs) {
    box.innerHTML = heroHTML(r) + (r.model === null ? "" : `<section id="panel-now">${nowPanelHTML(r)}</section>`);
    return;
  }

  const tab = TABS.some(t => t[0] === activeTab) ? activeTab : "now";
  activeTab = tab;
  const tabs = `<div class="tabs" role="tablist" aria-label="Views of this gauge">` + TABS.map(([key, label]) =>
    `<button type="button" role="tab" id="tab-${key}" aria-controls="panel-${key}" aria-selected="${key === tab}" tabindex="${key === tab ? 0 : -1}" data-tab="${key}">${label}</button>`).join("") + `</div>`;
  box.innerHTML = heroHTML(r) + tabs + TABS.map(([key]) => panelHTML(key, r)).join("");
  if (tab === "week") {
    drawChart(r);
  }
}

// Show the gauge page or the Your roads page. Both live in the main column.
function showView(name) {
  currentView = name === "roads" && riverMode ? "roads" : "gauge";
  document.getElementById("gauge-view").hidden = currentView !== "gauge";
  document.getElementById("roads-view").hidden = currentView !== "roads";
  const tile = document.getElementById("roads-tile");
  if (currentView === "roads") {
    tile.setAttribute("aria-current", "true");
    document.querySelectorAll("#gauge-list .gauge-row").forEach(row => row.removeAttribute("aria-current"));
  } else {
    tile.removeAttribute("aria-current");
    markSelected(selectedId);
  }
}

// On a phone the list is above the main column, so scroll the new content into view.
function scrollMainIntoView() {
  if (window.matchMedia("(max-width: 899px)").matches) {
    document.getElementById("main").scrollIntoView({ block: "start" });
  }
}

function selectGauge(id) {
  selectedId = id;
  userPicked = true;
  setUrlParam("gauge", id);
  showView("gauge");
  renderGaugeView();
  scrollMainIntoView();
  const title = document.getElementById("gauge-title");
  if (title) {
    title.focus({ preventScroll: true });
  }
}

// Called by dashboard.js every time there are new results.
function renderApp(results) {
  if (results.length === 0) {
    return;
  }
  // Keep keyboard focus where it was if the page is redrawn by the 15 minute refresh.
  const active = document.activeElement;
  const focusId = active && document.getElementById("gauge-view").contains(active) ? active.id : "";

  selectedId = chooseSelected(results);
  renderSummary(results);
  renderGaugeList(results, selectedId);
  renderGaugeView();

  const demo = demoIsOn();
  document.getElementById("demo-banner").hidden = !demo;
  document.body.classList.toggle("demo", demo);
  showView(currentView);

  if (focusId && document.getElementById(focusId)) {
    document.getElementById(focusId).focus({ preventScroll: true });
  }
}

document.getElementById("gauge-list").addEventListener("click", event => {
  const row = event.target.closest(".gauge-row");
  if (!row || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
    return; // let "open in new tab" work
  }
  event.preventDefault();
  selectGauge(row.dataset.id);
});

document.getElementById("gauge-view").addEventListener("click", event => {
  const button = event.target.closest("[data-tab]");
  if (button) {
    showTab(button.dataset.tab, false);
  }
});

// Left and right arrow keys move between the tabs.
document.getElementById("gauge-view").addEventListener("keydown", event => {
  const button = event.target.closest("[data-tab]");
  if (!button || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) {
    return;
  }
  const keys = TABS.map(t => t[0]);
  const step = event.key === "ArrowRight" ? 1 : -1;
  showTab(keys[(keys.indexOf(button.dataset.tab) + step + keys.length) % keys.length], true);
  event.preventDefault();
});

document.getElementById("roads-back").addEventListener("click", () => {
  showView("gauge");
  scrollMainIntoView();
});
