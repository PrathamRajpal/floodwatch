const TOWNS = {
  "lincolnshire":  { label: "Lincolnshire, IL",  lat: 42.19,  lon: -87.91 },
  "buffalo-grove": { label: "Buffalo Grove, IL", lat: 42.166, lon: -87.963 },
  "vernon-hills":  { label: "Vernon Hills, IL",  lat: 42.219, lon: -87.980 },
  "gurnee":        { label: "Gurnee, IL",        lat: 42.370, lon: -87.902 }
};

function verifiedGauges() {
  return Object.entries(gaugeThresholds).map(([usgsId, g]) => ({ usgsId, verified: true, ...g }));
}

let currentGauges = verifiedGauges();

function demoHeight(gauge, demoTier) {
  if (!gauge || !demoTier) {
    return null;
  }

  const keyFor = { watch: "action", warning: "minor", major: "major" };
  const key = keyFor[demoTier.toLowerCase()];

  return gauge.categories[key] || null;
}

function buildCard(gauge, entry, demoTier) {
  const siteName = entry ? entry.sourceInfo.siteName : (gauge.name || gauge.usgsId);
  const reading = entry?.values?.[0]?.value?.[0];
  const noData = entry?.variable?.noDataValue;
  const liveHeight = reading ? parseFloat(reading.value) : NaN;
  const hasLive = !Number.isNaN(liveHeight) && liveHeight !== noData;
  const simulated = demoHeight(gauge, demoTier);

  const distanceHTML = gauge.miles !== undefined
    ? `<p class="distance">${gauge.miles.toFixed(1)} miles away</p>`
    : "";
  const sourceHTML = gauge.verified
    ? `<p class="source verified">Thresholds checked by our team against NWS</p>`
    : `<p class="source">NWS data, not independently checked by us</p>`;

  if (simulated === null && !hasLive) {
    return `
      <div class="gauge-card tier-unknown">
        <h2>${siteName}</h2>
        <span class="badge">No data</span>
        ${distanceHTML}
        <p>USGS is not reporting a recent reading for this gauge.</p>
        ${sourceHTML}
      </div>
    `;
  }

  const height = simulated !== null ? simulated : liveHeight;
  const risk = getRiskStatus(height, gauge);

  const affectedHTML = risk.affected.length > 0
    ? `<p class="impact-heading">Affected right now</p>
       <ul class="impact-list">
         ${risk.affected.reverse().map(i => `<li>${i.statement}</li>`).join("")}
       </ul>`
    : "";

  const nextHTML = risk.next
    ? `<p class="next-impact"><strong>Next impact at ${risk.next.stage} ft</strong> (${(risk.next.stage - height).toFixed(1)} ft higher): ${risk.next.statement}</p>`
    : "";

  const noImpactsHTML = gauge.impacts.length === 0
    ? `<p class="no-impacts">NWS has not published street-level impacts for this gauge.</p>`
    : "";

  const updatedHTML = simulated !== null
    ? ""
    : `<p class="updated">Updated ${new Date(reading.dateTime).toLocaleString([], {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      })}</p>`;

  const linkHTML = gauge.verified
    ? `<a class="details" href="gauge.html?id=${gauge.usgsId}">7-day history</a>`
    : `<a class="details" href="https://water.noaa.gov/gauges/${gauge.nwsId}" target="_blank" rel="noopener">View on NWS</a>`;

  return `
    <div class="gauge-card tier-${risk.tier.toLowerCase()}">
      <h2>${siteName}</h2>
      <span class="badge">${risk.tier}</span>
      ${simulated !== null ? '<p class="demo-flag">SIMULATED DATA (demo mode)</p>' : ""}
      ${distanceHTML}
      <p class="height">${height} ft</p>
      ${affectedHTML}
      ${nextHTML}
      ${noImpactsHTML}
      ${updatedHTML}
      ${sourceHTML}
      ${linkHTML}
    </div>
  `;
}

async function getGaugeData() {
  const statusEl = document.getElementById("status");
  const demoTier = new URLSearchParams(window.location.search).get("demo");

  try {
    const siteList = currentGauges.map(g => g.usgsId).join(",");
    const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${siteList}&parameterCd=00065&siteStatus=all&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USGS returned status ${response.status}`);
    }
    const data = await response.json();

    const cardsHTML = currentGauges.map(gauge => {
      const entry = data.value.timeSeries.find(e => e.sourceInfo.siteCode[0].value === gauge.usgsId);
      return buildCard(gauge, entry, demoTier);
    });

    document.getElementById("gauge-cards").innerHTML = cardsHTML.join("");
    statusEl.textContent = "";
  } catch (error) {
    console.error("Failed to load gauge data:", error);
    statusEl.textContent = "Couldn't update from USGS just now. Will retry automatically.";
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