// Roads that the National Weather Service names in its impact statements for our four gauges
// (the same statements as in thresholds.js). "stage" is the gauge height where NWS first lists that
// road at that gauge, and "where" is NWS's wording, shortened. NWS says "threatened", not "closed".

const GAUGE_PLACE = {
  "05527800": "Russell",
  "05528000": "Gurnee",
  "05528100": "Lincolnshire",
  "05528500": "Buffalo Creek"
};

const ROADS = [
  { name: "Kilbourne Road", spots: [
    { gauge: "05528000", stage: 9,   where: "Kilbourne Road and Emerald Avenue threatened near Grand Avenue in Gurnee" },
    { gauge: "05527800", stage: 9.5, where: "industrial parking lots threatened along Kilbourne Road near Russell" },
    { gauge: "05527800", stage: 15,  where: "Kilbourne Road threatened near Russell" }
  ] },
  { name: "Grand Avenue (IL-132)", spots: [
    { gauge: "05528000", stage: 10, where: "IL-132 (Grand Avenue) threatened east of the river in Gurnee" }
  ] },
  { name: "McClure Avenue and O'Plaine Road", spots: [
    { gauge: "05528000", stage: 10, where: "residences threatened near O'Plaine Road and McClure Avenue in Gurnee" }
  ] },
  { name: "Skokie Highway (US-41)", spots: [
    { gauge: "05528000", stage: 11, where: "US-41 threatened near the river in Gurnee" },
    { gauge: "05527800", stage: 13, where: "US-41 threatened south of Wadsworth Road in Wadsworth" }
  ] },
  { name: "Russell Road", spots: [
    { gauge: "05527800", stage: 9.5, where: "residential structures threatened along it between the river and Kilbourne Road" },
    { gauge: "05527800", stage: 12,  where: "Russell Road threatened" }
  ] },
  { name: "Rosecrans Road (IL-173)", spots: [
    { gauge: "05527800", stage: 12.5, where: "threatened near Wadsworth" }
  ] },
  { name: "Wadsworth Road", spots: [
    { gauge: "05527800", stage: 13.5, where: "threatened in Wadsworth" }
  ] },
  { name: "Lincolnshire Drive", spots: [
    { gauge: "05528100", stage: 14, where: "threatened at Wiltshire Lane" }
  ] },
  { name: "Half-Day Road (IL-22)", spots: [
    { gauge: "05528100", stage: 15, where: "structures threatened along it just east of the river" },
    { gauge: "05528100", stage: 17, where: "IL-22 threatened just west of the river" }
  ] },
  { name: "Milwaukee Avenue (US-45)", spots: [
    { gauge: "05528100", stage: 15, where: "multiple structures threatened near and west of US-45 and Deerfield Road" },
    { gauge: "05528100", stage: 16, where: "numerous structures threatened along US-45 between IL-22 and Deerfield Road" },
    { gauge: "05528100", stage: 17, where: "US-45 threatened between IL-22 and Lake Cook Road" }
  ] },
  { name: "Deerfield Road", spots: [
    { gauge: "05528100", stage: 15, where: "threatened near the river" }
  ] },
  { name: "Townline Road (IL-60)", spots: [
    { gauge: "05528100", stage: 16, where: "IL-60 threatened near the river" }
  ] },
  { name: "Buffalo Grove Road", spots: [
    { gauge: "05528500", stage: 5,  where: "parking lots threatened along it" },
    { gauge: "05528500", stage: 11, where: "threatened at Lake Cook Road" }
  ] },
  { name: "Lake Cook Road", spots: [
    { gauge: "05528500", stage: 8, where: "threatened in Buffalo Grove" }
  ] },
  { name: "Arlington Heights Road", spots: [
    { gauge: "05528500", stage: 12.5, where: "may be threatened in Buffalo Grove" }
  ] },
  { name: "Raupp Boulevard", spots: [
    { gauge: "05528500", stage: 9.5, where: "threatened in Buffalo Grove" }
  ] },
  { name: "McHenry Road (Wheeling)", spots: [
    { gauge: "05528500", stage: 6.5, where: "residential parking lots threatened along it" },
    { gauge: "05528500", stage: 8.5, where: "McHenry Road threatened in Wheeling" }
  ] },
  { name: "Elmhurst Road (IL-83)", spots: [
    { gauge: "05528500", stage: 9, where: "IL-83 threatened in Wheeling" }
  ] }
];

const ROAD_RANK = { unknown: 0, clear: 1, close: 2, threatened: 3 };
const ROAD_WORDS = {
  clear: "no impact listed",
  close: "close to a listed impact",
  threatened: "listed as threatened",
  unknown: "no reading"
};

const MYROADS_KEY = "floodwatch.myroads";
let roadHeights = {}; // the latest height for each gauge, by USGS id

function myRoadNames() {
  try {
    return JSON.parse(localStorage.getItem(MYROADS_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveMyRoads(names) {
  try {
    localStorage.setItem(MYROADS_KEY, JSON.stringify(names));
  } catch (error) {
    // Storage can be blocked. The page still works, it just will not remember the choice.
  }
}

// Is this road affected at the current gauge heights, close to it, or clear?
function roadStatus(road) {
  let reached = null; // the most serious listed spot the water has already reached
  let next = null;    // the nearest listed spot it has not reached yet

  for (const spot of road.spots) {
    const height = roadHeights[spot.gauge];
    if (height === undefined) {
      continue;
    }
    if (height >= spot.stage) {
      if (reached === null || spot.stage > reached.stage) {
        reached = spot;
      }
    } else {
      const gap = spot.stage - height;
      if (next === null || gap < next.gap) {
        next = { ...spot, gap };
      }
    }
  }

  if (reached !== null) {
    return { state: "threatened", spot: reached, next };
  }
  if (next === null) {
    return { state: "unknown" };
  }
  return { state: next.gap <= CLOSE_FT ? "close" : "clear", next };
}

function currentRoadStates() {
  const states = {};
  ROADS.forEach(road => {
    states[road.name] = roadStatus(road).state;
  });
  return states;
}

function myRoadStatuses() {
  const mine = myRoadNames();
  return ROADS.filter(road => mine.includes(road.name)).map(road => ({ road, status: roadStatus(road) }));
}

function roadCardHTML(item) {
  const { road, status } = item;
  let tag;
  let note;

  if (status.state === "threatened") {
    const spot = status.spot;
    tag = "Threatened now";
    note = `The ${GAUGE_PLACE[spot.gauge]} gauge is at ${roadHeights[spot.gauge]} ft. NWS lists this road at ${spot.stage} ft: ${spot.where}.`;
  } else if (status.state === "unknown") {
    tag = "No reading";
    note = "The gauge for this road is not reporting right now.";
  } else {
    const next = status.next;
    tag = status.state === "close" ? "Close" : "No impact listed";
    note = `${next.gap.toFixed(1)} ft below the level where NWS first lists it (${next.stage} ft at the ${GAUGE_PLACE[next.gauge]} gauge: ${next.where}).`;
  }

  return `
    <div class="road road-${status.state}">
      <div class="road-head"><strong>${clean(road.name)}</strong><span class="road-tag">${tag}</span></div>
      <p class="road-note">${clean(note)}</p>
    </div>`;
}

function renderRoadStatus() {
  const box = document.getElementById("roads-status");
  const items = myRoadStatuses();
  const demo = new URLSearchParams(window.location.search).get("demo");

  if (items.length === 0) {
    box.innerHTML = `<p class="muted">Choose the roads you drive. This page will tell you when the National Weather Service lists them as threatened, or when the river is getting close.</p>`;
    return;
  }

  const order = { threatened: 0, close: 1, clear: 2, unknown: 3 };
  items.sort((a, b) => order[a.status.state] - order[b.status.state]);
  box.innerHTML = (demo ? `<p class="demo-flag">Simulated heights (demo mode)</p>` : "") + items.map(roadCardHTML).join("");
}

// Called every time new readings arrive. Roads only apply to our own four gauges.
function updateRoads(results, riverMode) {
  const panel = document.getElementById("roads-panel");
  panel.hidden = !riverMode;
  roadHeights = {};
  if (!riverMode) {
    return;
  }
  results.forEach(r => {
    if (r.height !== undefined) {
      roadHeights[r.id] = r.height;
    }
  });
  renderRoadStatus();
}

function buildChooser() {
  const mine = myRoadNames();
  document.getElementById("roads-chooser").innerHTML = ROADS.map(road => `
    <label class="choice">
      <input type="checkbox" value="${clean(road.name)}" ${mine.includes(road.name) ? "checked" : ""}>
      ${clean(road.name)}
    </label>`).join("");
}

document.getElementById("roads-chooser").addEventListener("change", () => {
  const checked = Array.from(document.querySelectorAll("#roads-chooser input:checked")).map(box => box.value);
  saveMyRoads(checked);
  renderRoadStatus();
  refreshAlertPanel();
});

buildChooser();