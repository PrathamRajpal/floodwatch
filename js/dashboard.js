// Gets the readings, works out each gauge's status, and hands the results to the page.
// The page itself is drawn by sidebar.js (the gauge list and summary) and view.js (the selected gauge).

const TOWNS = {
  "lincolnshire":  { label: "Lincolnshire, IL",  lat: 42.19,  lon: -87.91 },
  "buffalo-grove": { label: "Buffalo Grove, IL", lat: 42.166, lon: -87.963 },
  "vernon-hills":  { label: "Vernon Hills, IL",  lat: 42.219, lon: -87.980 },
  "gurnee":        { label: "Gurnee, IL",        lat: 42.370, lon: -87.902 }
};

const FAST_RISE_FT_PER_HOUR = 0.15; // "rising fast" means at least this many feet per hour

function verifiedGauges() {
  return Object.entries(gaugeThresholds).map(([usgsId, g]) => ({ usgsId, verified: true, ...g }));
}

let currentGauges = verifiedGauges();
let riverMode = true; // true for our own four gauges, false after a search by location
let shownResults = []; // the results on screen right now

function demoHeight(gauge, demoTier) {
  if (!gauge || !demoTier) {
    return null;
  }

  const keyFor = { watch: "action", warning: "minor", major: "major" };
  const key = keyFor[demoTier.toLowerCase()];

  return gauge.categories[key] || null;
}

// Clean, oldest-first readings. USGS lists them oldest first, so the newest is the LAST one.
function readingsOf(entry) {
  if (!entry) {
    return [];
  }
  const noData = entry.variable.noDataValue;
  const list = entry.values.length > 0 ? entry.values[0].value : [];
  return list
    .map(r => ({ time: new Date(r.dateTime), height: parseFloat(r.value) }))
    .filter(r => !Number.isNaN(r.height) && r.height !== noData)
    .sort((a, b) => a.time - b.time);
}

// How fast the river has moved over roughly the last 3 hours, in feet per hour.
function recentRate(readings) {
  if (readings.length < 2) {
    return null;
  }
  const latest = readings[readings.length - 1];
  const target = latest.time.getTime() - 3 * 3600000;
  let earlier = readings[0];
  for (const r of readings) {
    if (r.time.getTime() <= target) {
      earlier = r; // the last reading at or before 3 hours ago
    }
  }
  const hours = (latest.time - earlier.time) / 3600000; // milliseconds to hours
  if (hours < 2) {
    return null; // not enough history to say anything
  }
  return { perHour: (latest.height - earlier.height) / hours, hours };
}

// In demo mode, adding &rise=0.4 to the address pretends the river rises 0.4 ft per hour.
function currentRate(readings, simulated) {
  if (simulated === null) {
    return recentRate(readings);
  }
  const demoRise = Number(new URLSearchParams(window.location.search).get("rise"));
  return demoRise > 0 ? { perHour: demoRise, hours: 3 } : null;
}

function trendLine(rate) {
  const change = rate.perHour * rate.hours;
  const hours = Math.round(rate.hours);
  if (Math.abs(change) < 0.05) {
    return `Steady over the last ${hours} hours`;
  }
  const amount = Math.abs(change).toFixed(2);
  return change > 0
    ? `Rising: up ${amount} ft in ${hours} hours`
    : `Falling: down ${amount} ft in ${hours} hours`;
}

// A rough guess at when the water reaches the next listed impact if it keeps rising at the same rate.
// Only for a river that is clearly rising and an impact less than 24 hours away.
function hoursToNext(rate, gap) {
  if (!rate || gap === null || rate.perHour < 0.05) {
    return null;
  }
  const hours = gap / rate.perHour;
  return hours <= 24 ? hours : null;
}

function etaText(hours) {
  if (hours < 1) {
    return "less than 1 hour";
  }
  const whole = Math.round(hours);
  return whole === 1 ? "about 1 hour" : `about ${whole} hours`;
}

// Everything we know about one gauge right now, as plain data. The page decides how to show it.
function buildResult(gauge, entry, demoTier) {
  const name = niceName(entry ? entry.sourceInfo.siteName : (gauge.name || gauge.usgsId));
  const readings = readingsOf(entry);
  const latest = readings[readings.length - 1];
  const simulated = demoHeight(gauge, demoTier);
  const base = { id: gauge.usgsId, gauge, name, place: placeOf(name), miles: gauge.miles };

  if (simulated === null && !latest) {
    return { ...base, tier: "Unknown", fast: false, gap: null, model: null };
  }

  const height = simulated !== null ? simulated : latest.height;
  const risk = getRiskStatus(height, gauge);
  const gap = risk.next ? risk.next.stage - height : null;
  const rate = currentRate(readings, simulated);
  const fast = rate !== null && rate.perHour >= FAST_RISE_FT_PER_HOUR;
  const hours = hoursToNext(rate, gap);

  return {
    ...base, height, tier: risk.tier, fast, gap,
    model: { readings, latest, simulated, height, risk, gap, rate, fast, hours }
  };
}

async function fetchUsgs() {
  const siteList = currentGauges.map(g => g.usgsId).join(",");
  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${siteList}&parameterCd=00065&period=PT6H&siteStatus=all&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS returned status ${response.status}`);
  }
  return response.json();
}

// Turn USGS data into results and put them on the page.
function showResults(data, demoTier) {
  const results = currentGauges.map(gauge => {
    const entry = data.value.timeSeries.find(e => e.sourceInfo.siteCode[0].value === gauge.usgsId);
    return buildResult(gauge, entry, demoTier);
  });
  shownResults = results;
  renderApp(results);
  updateRoads(results, riverMode);
  renderRoadsTile();
  return results;
}

// USGS or the connection failed and nothing is on screen: show the last good readings, clearly labeled.
function showCachedCopy() {
  const saved = loadCache();
  if (!saved) {
    return;
  }
  showResults(saved.data, null);
  document.body.classList.add("stale");
  document.getElementById("status").textContent =
    `USGS could not be reached. Showing readings saved at ${clock(new Date(saved.savedAt))}, which may be out of date.`;
}

async function getGaugeData() {
  const statusEl = document.getElementById("status");
  const demoTier = new URLSearchParams(window.location.search).get("demo");

  try {
    const data = await fetchUsgs();
    const results = showResults(data, demoTier);
    checkAlerts(results, demoTier, riverMode);
    if (!demoTier && riverMode) {
      saveCache(data); // never save demo screens as if they were real readings
    }
    document.body.classList.remove("stale");
    statusEl.textContent = "";
  } catch (error) {
    console.error("Failed to load gauge data:", error);
    statusEl.textContent = "Couldn't update from USGS just now. Will retry automatically.";
    if (riverMode && shownResults.length === 0) {
      showCachedCopy();
    }
  }
}

async function setLocation(lat, lon, label) {
  const locStatus = document.getElementById("location-status");
  locStatus.textContent = `Finding gauges near ${label}...`;

  try {
    const nearby = await loadNearbyGauges(lat, lon, 10);
    if (nearby.length === 0) {
      locStatus.textContent = "No gauges with flood data were found near that location.";
      return;
    }

    currentGauges = nearby.map(g =>
      gaugeThresholds[g.usgsId]
        ? { usgsId: g.usgsId, verified: true, miles: g.miles, ...gaugeThresholds[g.usgsId] }
        : g
    );
    riverMode = false;
    locStatus.textContent = `Showing the ${currentGauges.length} nearest gauges to ${label}.`;
    await getGaugeData();
  } catch (error) {
    console.error("Failed to load nearby gauges:", error);
    locStatus.textContent = "Couldn't look up nearby gauges just now.";
  }
}

document.getElementById("town-select").addEventListener("change", event => {
  const value = event.target.value;
  if (value === "default") {
    currentGauges = verifiedGauges();
    riverMode = true;
    document.getElementById("location-status").textContent = "";
    getGaugeData();
    return;
  }
  const town = TOWNS[value];
  setLocation(town.lat, town.lon, town.label);
});

document.getElementById("locate-btn").addEventListener("click", () => {
  const locStatus = document.getElementById("location-status");
  if (!navigator.geolocation) {
    locStatus.textContent = "Your browser doesn't support location. Pick a town instead.";
    return;
  }
  locStatus.textContent = "Asking for your location...";
  navigator.geolocation.getCurrentPosition(
    position => setLocation(position.coords.latitude, position.coords.longitude, "your location"),
    () => { locStatus.textContent = "Couldn't get your location. Pick a town instead."; }
  );
});

getGaugeData();
setInterval(getGaugeData, 15 * 60 * 1000);
