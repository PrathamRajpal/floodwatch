// The left column: a one-sentence summary, the list of gauges, the "Your roads" button and the demo button.
// Needs: riverScale and RIVER_WATER (crosssection.js), RANK (alerts.js), myRoadStatuses (roads.js).

// "Des Plaines River at Lincolnshire, IL" -> "Des Plaines River"
function riverName(name) {
  return name.replace(/ (?:at|near) .*$/, "");
}

// One sentence about the most serious thing happening.
function summaryText(results) {
  const known = results.filter(r => r.tier !== "Unknown");
  const count = tier => known.filter(r => r.tier === tier).length;
  const gauges = n => (n === 1 ? "1 gauge" : `${n} gauges`);
  const demo = new URLSearchParams(window.location.search).get("demo");
  let text;

  if (known.length === 0) {
    text = "No gauge is reporting a reading right now.";
  } else if (count("Major") > 0) {
    text = `${gauges(count("Major"))} at major flood stage` +
      (count("Warning") > 0 ? `, ${count("Warning")} more at flood stage.` : ".");
  } else if (count("Warning") > 0) {
    text = `${gauges(count("Warning"))} at or above flood stage.`;
  } else if (count("Watch") > 0) {
    text = `${gauges(count("Watch"))} on watch.`;
  } else {
    text = `All ${known.length} ${riverMode ? "" : "nearby "}gauges are below flood levels.`;
  }
  return demo ? `${text} (simulated)` : text;
}

function renderSummary(results) {
  document.getElementById("summary").textContent = summaryText(results);

  // The gauge with the smallest distance, in feet, to the next impact NWS lists.
  const withGap = results.filter(r => r.tier !== "Unknown" && r.gap !== null);
  const closest = withGap.sort((a, b) => a.gap - b.gap)[0];
  const unknown = results.filter(r => r.tier === "Unknown").length;
  let line = closest
    ? `Closest call: ${closest.place}, ${closest.gap.toFixed(2)} ft below its next listed impact.`
    : "";
  if (unknown > 0) {
    line += ` ${unknown === 1 ? "1 gauge is" : `${unknown} gauges are`} not reporting.`;
  }
  document.getElementById("closest").textContent = line.trim();
}

// The address for one gauge's row, keeping demo mode if it is on. (Used when someone opens a row in a new tab.)
function rowLink(id) {
  const params = new URLSearchParams(window.location.search);
  params.set("gauge", id);
  params.delete("tab");
  return "?" + params.toString();
}

function renderGaugeList(results, selectedId) {
  const list = document.getElementById("gauge-list");
  list.innerHTML = results.map(r => {
    const m = r.model;
    const next = m && m.risk.next ? m.risk.next.stage : null;
    const scale = m ? riverScale(r.height, r.gauge.categories.major, next) : 4;
    const fill = m ? Math.min(100, Math.max(0, (r.height / scale) * 100)) : 0;
    const colour = RIVER_WATER[r.tier] ? RIVER_WATER[r.tier][1] : "#93A3B2";
    const sub = r.miles !== undefined
      ? `${r.miles.toFixed(1)} mi · ${r.gauge.verified ? "checked by us" : "NWS data"}`
      : riverName(r.name);
    const level = m ? `${r.height} <small>ft</small>` : "No data";
    const fast = r.fast ? ' <span class="fast-tag" aria-label="rising fast">FAST &#9650;</span>' : "";
    return `
      <a class="gauge-row" href="${clean(rowLink(r.id))}" data-id="${clean(r.id)}" data-tier="${r.tier}"${r.id === selectedId ? ' aria-current="true"' : ""}>
        <span class="tube" aria-hidden="true"><span class="tube-fill" style="height:${fill}%;background:${colour}"></span></span>
        <span class="row-text"><span class="row-place">${clean(r.place)}</span><span class="row-sub">${clean(sub)}</span></span>
        <span class="row-level"><span class="row-height">${level}</span><span class="row-tier"><span class="dot"></span>${r.tier === "Unknown" ? "No data" : r.tier}${fast}</span></span>
      </a>`;
  }).join("");
}

// Change which row looks selected, without redrawing the list (so keyboard focus stays where it is).
function markSelected(id) {
  document.querySelectorAll("#gauge-list .gauge-row").forEach(row => {
    if (row.dataset.id === id) {
      row.setAttribute("aria-current", "true");
    } else {
      row.removeAttribute("aria-current");
    }
  });
}

// The "Your roads" button shows a one-line status. Only for our own four gauges.
function renderRoadsTile() {
  const tile = document.getElementById("roads-tile");
  tile.hidden = !riverMode;
  if (!riverMode) {
    return;
  }

  const items = myRoadStatuses();
  const count = state => items.filter(i => i.status.state === state).length;
  let text;
  let level;

  if (items.length === 0) {
    text = "Pick the roads you drive";
    level = "none";
  } else if (count("threatened") > 0) {
    text = `${count("threatened")} threatened` + (count("close") > 0 ? `, ${count("close")} close` : "");
    level = "threatened";
  } else if (count("close") > 0) {
    text = `${count("close")} close to a listed impact`;
    level = "close";
  } else if (count("unknown") === items.length) {
    text = "No reading yet";
    level = "none";
  } else {
    text = items.length === 1 ? "1 clear" : `All ${items.length} clear`;
    level = "clear";
  }
  document.getElementById("roads-summary").innerHTML = `<span class="dot road-dot road-dot-${level}"></span>${text}`;
}

function demoIsOn() {
  return Boolean(new URLSearchParams(window.location.search).get("demo"));
}

function renderSimButton() {
  const button = document.getElementById("sim-btn");
  button.textContent = demoIsOn() ? "Back to live readings" : "Simulate a flood";
  button.setAttribute("aria-pressed", String(demoIsOn()));
}

// Switch demo mode on or off by changing the address, then reload the readings.
function toggleSimulation() {
  const url = new URL(window.location.href);
  if (demoIsOn()) {
    url.searchParams.delete("demo");
    url.searchParams.delete("rise");
  } else {
    url.searchParams.set("demo", "warning");
    url.searchParams.set("rise", "0.4");
  }
  try {
    history.replaceState(null, "", url);
  } catch (error) {
    window.location.href = url.href; // if the address can't be changed in place, just reload
    return;
  }
  resetAlertState(); // never compare made-up readings with real ones
  renderSimButton();
  getGaugeData();
}

document.getElementById("sim-btn").addEventListener("click", toggleSimulation);
document.getElementById("roads-tile").addEventListener("click", () => {
  showView("roads");
  scrollMainIntoView();
});
// roads.js saves the new choice first (it was loaded earlier), then this updates the button.
document.getElementById("roads-chooser").addEventListener("change", renderRoadsTile);
renderSimButton();
