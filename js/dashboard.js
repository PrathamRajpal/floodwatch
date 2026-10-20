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
    return { id: gauge.usgsId, name: siteName, tier: "Unknown", html: `
      <div class="gauge-card tier-unknown">
        <h2>${siteName}</h2>
        <span class="badge">No data</span>
        ${distanceHTML}
        <p>USGS is not reporting a recent reading for this gauge.</p>
        ${sourceHTML}
      </div>
    ` };
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
    ? `<p class="next-impact"><strong>Next impact at ${risk.next.stage} ft</strong> (${(risk.next.stage - height).toFixed(1)}