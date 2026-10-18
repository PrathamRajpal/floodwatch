async function getGaugeData() {
  const statusEl = document.getElementById("status");

  try {
    const url = "https://waterservices.usgs.gov/nwis/iv/?sites=05528000,05528100&parameterCd=00065&siteStatus=all&format=json";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USGS returned status ${response.status}`);
    }
    const data = await response.json();

    const cardsHTML = data.value.timeSeries.map(entry => {
      const siteId = entry.sourceInfo.siteCode[0].value;
      const siteName = entry.sourceInfo.siteName;
      const reading = entry.values[0].value[0];
      const height = parseFloat(reading.value);
      const updated = new Date(reading.dateTime).toLocaleString([], {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      });
      const risk = getRiskStatus(height, gaugeThresholds[siteId]);

      return `
        <div class="gauge-card tier-${risk.tier.toLowerCase()}">
          <h2>${siteName}</h2>
          <span class="badge">${risk.tier}</span>
          <p class="height">${height} ft</p>
          <p>${risk.message}</p>
          <p class="updated">Updated ${updated}</p>
          <a class="details" href="gauge.html?id=${siteId}">7-day history</a>
        </div>
      `;
    });

    document.getElementById("gauge-cards").innerHTML = cardsHTML.join("");
    statusEl.textContent = "";
  } catch (error) {
    console.error("Failed to load gauge data:", error);
    statusEl.textContent = "Couldn't update from USGS just now. Will retry automatically.";
  }
}

getGaugeData();
setInterval(getGaugeData, 15 * 60 * 1000);


