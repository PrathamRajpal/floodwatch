function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function findNearestGauges(lat, lon, count) {
  let gauges = [];
  for (const pad of [0.5, 1, 2, 4]) {
    const box = `bbox.xmin=${lon - pad}&bbox.ymin=${lat - pad}&bbox.xmax=${lon + pad}&bbox.ymax=${lat + pad}&srid=EPSG_4326`;
    const response = await fetch(`https://api.water.noaa.gov/nwps/v1/gauges?${box}`);
    if (!response.ok) {
      throw new Error(`NWS returned status ${response.status}`);
    }
    const data = await response.json();
    gauges = data.gauges || [];
    if (gauges.length >= count) break;
  }

  return gauges
    .map(g => ({
      lid: g.lid,
      name: g.name,
      miles: distanceMiles(lat, lon, g.latitude, g.longitude)
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count);
}

const stageOf = (d, level) => {
  const s = d.flood?.categories?.[level]?.stage;
  return typeof s === "number" && s > 0 && s < 100 ? s : null;
};

async function loadNearbyGauges(lat, lon, count) {
  const candidates = await findNearestGauges(lat, lon, count * 2);

  const details = await Promise.all(
    candidates.map(c =>
      fetch(`https://api.water.noaa.gov/nwps/v1/gauges/${c.lid}`)
        .then(r => r.json())
        .then(d => ({ d, miles: c.miles }))
        .catch(() => null)
    )
  );

  const gauges = [];
  for (const item of details) {
    if (!item) continue;
    const { d, miles } = item;
    const minor = stageOf(d, "minor");
    const major = stageOf(d, "major");
    if (!d.usgsId || minor === null || major === null) continue;

    gauges.push({
      usgsId: d.usgsId,
      nwsId: d.lid,
      name: d.name,
      miles,
      categories: {
        action: stageOf(d, "action") ?? minor,
        minor,
        moderate: stageOf(d, "moderate") ?? minor,
        major
      },
      impacts: (d.flood.impacts || [])
        .map(i => ({ stage: i.stage, statement: i.statement }))
        .sort((a, b) => a.stage - b.stage)
    });
  }
  return gauges.slice(0, count);
}