// "What changed" alerts, browser notifications, and a saved copy of the last good screen.
// These cover our own four gauges only (the default view).

const SAVED_KEY = "floodwatch.lastSeen";
const CACHE_KEY = "floodwatch.cache";
const RANK = { Major: 4, Warning: 3, Watch: 2, Normal: 1, Unknown: 0 };

let previous = null;        // what we saw last time: { tiers, fast, roads }
let sessionChanges = [];    // changes found since this page opened
let panelDismissed = false;
let firstCheck = true;
let lastResults = [];

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY));
  } catch (error) {
    return null;
  }
}

function writeSaved(state) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage can be blocked. The page still works, it just cannot remember.
  }
}

function currentState(results) {
  const tiers = {};
  const fast = {};
  results.forEach(r => {
    tiers[r.id] = r.tier;
    fast[r.id] = r.fast === true;
  });
  return { tiers, fast, roads: currentRoadStates() };
}

// For demo mode: pretend everything was calm the last time you looked.
function baselineState(results) {
  const tiers = {};
  const fast = {};
  results.forEach(r => {
    tiers[r.id] = "Normal";
    fast[r.id] = false;
  });
  const roads = {};
  ROADS.forEach(road => {
    roads[road.name] = "clear";
  });
  return { tiers, fast, roads };
}

// Compare what we saw last time with what we see now. Returns a list of { worse, text }.
function findChanges(before, now, results) {
  const changes = [];
  if (!before) {
    return changes;
  }
  const beforeTiers = before.tiers || {};
  const beforeFast = before.fast || {};
  const beforeRoads = before.roads || {};

  for (const r of results) {
    const was = beforeTiers[r.id];
    if (was && was !== "Unknown" && r.tier !== "Unknown" && was !== r.tier) {
      changes.push({
        worse: RANK[r.tier] > RANK[was],
        text: `${r.place} gauge went from ${was} to ${r.tier}.`
      });
    }
    if (r.fast && beforeFast[r.id] !== true) {
      changes.push({ worse: true, text: `${r.place} gauge is rising fast.` });
    }
  }

  for (const name of myRoadNames()) {
    const was = beforeRoads[name];
    const is = now.roads[name];
    if (!was || !is || was === "unknown" || is === "unknown" || was === is) {
      continue;
    }
    changes.push({
      worse: ROAD_RANK[is] > ROAD_RANK[was],
      text: `${name}: ${ROAD_WORDS[was]}, now ${ROAD_WORDS[is]}.`
    });
  }

  return changes;
}

// The roads the user chose that are threatened or close at the current heights.
function rightNow() {
  const lines = [];
  myRoadStatuses().forEach(item => {
    if (item.status.state === "threatened") {
      lines.push({ level: "threatened", text: `${item.road.name}: NWS lists it as threatened at the current level.` });
    } else if (item.status.state === "close") {
      lines.push({ level: "close", text: `${item.road.name}: ${item.status.next.gap.toFixed(1)} ft from a listed impact.` });
    }
  });
  return lines;
}

function renderAlertPanel(results) {
  const box = document.getElementById("alert-panel");
  const lines = rightNow();
  const serious = results.some(r => r.tier === "Warning" || r.tier === "Major");
  const anyThreatened = lines.some(l => l.level === "threatened");

  if (panelDismissed || (sessionChanges.length === 0 && lines.length === 0 && !serious)) {
    box.innerHTML = "";
    return;
  }

  let html = `<div class="alert-box" role="alert">`;
  if (sessionChanges.length > 0) {
    html += `<p class="alert-title">What changed since your last visit</p><ul>` +
      sessionChanges.slice(0, 6).map(c => `<li class="${c.worse ? "worse" : "better"}">${clean(c.text)}</li>`).join("") +
      `</ul>`;
  }
  if (lines.length > 0) {
    html += `<p class="alert-title">Your roads right now</p><ul>` +
      lines.map(l => `<li>${clean(l.text)}</li>`).join("") + `</ul>`;
  }
  if (serious || anyThreatened) {
    html += `<p class="alert-safety"><strong>Never drive through floodwater. Turn around, don't drown.</strong> (National Weather Service)</p>`;
  }
  html += `<p><button type="button" id="alert-dismiss">Got it</button></p></div>`;
  box.innerHTML = html;
}

function refreshAlertPanel() {
  renderAlertPanel(lastResults);
}

function sendBrowserAlert(changes, demoTier) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const worse = changes.filter(c => c.worse);
  if (worse.length === 0) {
    return;
  }
  const prefix = demoTier ? "SIMULATED (demo mode): " : "";
  try {
    new Notification("FloodWatch", { body: prefix + worse.map(c => c.text).join(" ") });
  } catch (error) {
    // Some phone browsers do not allow this. The panel on the page still shows the alert.
  }
}

function renderNotifyControl() {
  const button = document.getElementById("notify-btn");
  const note = document.getElementById("notify-note");

  if (!("Notification" in window)) {
    button.hidden = true;
    note.textContent = "";
  } else if (Notification.permission === "default") {
    button.hidden = false;
    note.textContent = "Browser alerts work on a laptop while this page stays open. They may not work on phones.";
  } else if (Notification.permission === "granted") {
    button.hidden = true;
    note.textContent = "Browser alerts are on (only while this page is open).";
  } else {
    button.hidden = true;
    note.textContent = "";
  }
}

function checkAlerts(results, demoTier, riverMode) {
  lastResults = results;

  if (!riverMode) {
    document.getElementById("alert-panel").innerHTML = "";
    return;
  }

  const now = currentState(results);

  if (firstCheck) {
    previous = demoTier ? baselineState(results) : readSaved();
    firstCheck = false;
  }

  const changes = findChanges(previous, now, results);
  if (changes.length > 0) {
    sessionChanges = changes.concat(sessionChanges);
    panelDismissed = false;
    sendBrowserAlert(changes, demoTier);
  }

  previous = now;
  if (!demoTier) {
    writeSaved(now); // demo readings are made up, so they are never saved
  }

  renderAlertPanel(results);
  renderNotifyControl();
}

// A copy of the last good screen, for when USGS or the connection fails.
function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      cards: document.getElementById("gauge-cards").innerHTML
    }));
  } catch (error) {
    // Storage can be blocked. The page still works.
  }
}

function showCachedIfEmpty() {
  const box = document.getElementById("gauge-cards");
  if (box.innerHTML.trim() !== "") {
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!saved) {
      return;
    }
    box.innerHTML = saved.cards;
    document.getElementById("status").textContent =
      `USGS could not be reached. Showing readings saved at ${clock(new Date(saved.savedAt))}, which may be out of date.`;
  } catch (error) {
    // Nothing usable was saved.
  }
}

document.getElementById("alert-panel").addEventListener("click", event => {
  if (event.target.id === "alert-dismiss") {
    panelDismissed = true;
    document.getElementById("alert-panel").innerHTML = "";
  }
});

document.getElementById("notify-btn").addEventListener("click", () => {
  Notification.requestPermission().then(renderNotifyControl);
});