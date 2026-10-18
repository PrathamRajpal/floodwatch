async function loadGaugeDetail() {
  const statusEl = document.getElementById("status");
  const siteId = new URLSearchParams(window.location.search).get("id");

  if (!siteId || !gaugeThresholds[siteId]) {
    document.getElementById("gauge-title").textContent = "Gauge not found";
    statusEl.textContent = "Go back to the dashboard and pick a gauge.";
    return;
  }

  try {
    const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${siteId}&parameterCd=00065&period=P7D&siteStatus=all&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USGS returned status ${response.status}`);
    }
    const data = await response.json();

    const series = data.value.timeSeries[0];
    const siteName = series.sourceInfo.siteName;
    const noData = series.variable.noDataValue;

    const readings = series.values[0].value
      .map(r => ({ time: new Date(r.dateTime), height: parseFloat(r.value) }))
      .filter(r => r.height !== noData);

    if (readings.length === 0) {
      throw new Error("No readings returned for this gauge");
    }

    const latest = readings[readings.length - 1];
    const risk = getRiskStatus(latest.height, gaugeThresholds[siteId]);

        document.getElementById("gauge-title").textContent = siteName;
    document.getElementById("gauge-summary").innerHTML = `
      <div class="gauge-card tier-${risk.tier.toLowerCase()}">
        <span class="badge">${risk.tier}</span>
        <p class="height">${latest.height} ft</p>
        <p>${risk.message}</p>
      </div>
    `;

    new Chart(document.getElementById("history-chart"), {
      type: "line",
      data: {
        labels: readings.map(r =>
          r.time.toLocaleString([], { month: "short", day: "numeric", hour: "numeric" })
        ),
        datasets: [{
          label: "Gauge height (ft)",
          data: readings.map(r => r.height),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: { title: { display: true, text: "Feet" } }
        }
      }
    });
  } catch (error) {
    console.error("Failed to load gauge detail:", error);
    statusEl.textContent = "Couldn't load this gauge's history from USGS just now.";
  }
}

loadGaugeDetail();