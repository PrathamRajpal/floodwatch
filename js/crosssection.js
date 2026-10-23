// A simple side-view picture of the river for one gauge.
//
// This is a SCHEMATIC. The shape of the channel is made up. What is real is the gauge height
// and the National Weather Service levels, and everything is positioned from those numbers.

// Water colour for each tier: [top, bottom] of a small gradient.
const RIVER_WATER = {
  Normal:  ["#6AAAE8", "#2463AE"],
  Watch:   ["#F0B256", "#B76E0C"],
  Warning: ["#EA8A4A", "#AE4310"],
  Major:   ["#D65A6B", "#8A1426"]
};

// Colours for the three dashed lines (dark enough to read on the pale background).
const RIVER_LINE = { next: "#8A5200", flood: "#A33F0B", major: "#A3203A" };

// How many feet the picture covers: at least 4, and one foot more than the biggest number we draw.
function riverScale(height, major, nextStage) {
  const tallest = Math.max(major || 0, Math.max(0, height), nextStage || 0);
  return Math.max(4, Math.ceil(tallest + 1));
}

function riverSVG({ id, height, tier, minor, major, nextStage }) {
  const W = 320, H = 128;       // size of the drawing (it scales to the card width)
  const top = 8, floor = 118;   // y position of the top of the picture and of the river bed
  const bedL = 96, bedR = 224;  // x of the left and right ends of the river bed
  const lipL = 14, lipR = 306;  // x of the tops of the two banks

  // Step 1: the scale (see riverScale above).
  const water = Math.max(0, height);
  const scale = riverScale(height, major, nextStage);

  // Step 2: turn feet into pixels. 0 ft is the river bed (y = floor), scale ft is the top.
  const yOf = ft => floor - (ft / scale) * (floor - top);
  // The banks slope, so the river gets wider as it gets higher. Same idea, sideways.
  const leftAt  = ft => bedL - (bedL - lipL) * (ft / scale);
  const rightAt = ft => bedR + (lipR - bedR) * (ft / scale);

  // Step 3: the water is a shape that fills the channel up to the current height.
  const waterY = yOf(water);
  const waterShape = `${leftAt(water)},${waterY} ${rightAt(water)},${waterY} ${bedR},${floor} ${bedL},${floor}`;
  const ground = `0,${top} ${lipL},${top} ${bedL},${floor} ${bedR},${floor} ${lipR},${top} ${W},${top} ${W},${H} 0,${H}`;
  const colours = RIVER_WATER[tier] || RIVER_WATER.Normal;

  // Step 4: the staff gauge, a post with a mark for every foot and a number every few feet.
  const postX = 192, postW = 12;
  const numberEvery = scale <= 8 ? 1 : scale <= 16 ? 2 : 5;
  let marks = "";
  for (let ft = 0; ft <= scale; ft++) {
    const y = yOf(ft);
    const numbered = ft % numberEvery === 0;
    marks += `<line x1="${postX - (numbered ? 6 : 3)}" x2="${postX}" y1="${y}" y2="${y}" stroke="#5D6E7E" stroke-width="1"/>`;
    if (numbered) {
      marks += `<text x="${postX - 9}" y="${y + 3.5}" text-anchor="end" font-size="10" fill="#3B4C5C">${ft}</text>`;
    }
  }
  const nowLabel = `<text x="${postX + postW + 16}" y="${waterY + 4}" font-size="11" font-weight="800" fill="#0E1A26" stroke="#fff" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${height} ft now</text>`;
  const pointer = `${postX + postW},${waterY} ${postX + postW + 10},${waterY - 5} ${postX + postW + 10},${waterY + 5}`;

  // Step 5: dashed lines for the NWS levels, each with a short label.
  const levels = [];
  if (Number.isFinite(major)) { levels.push({ ft: major, text: "Major flood", colour: RIVER_LINE.major }); }
  if (Number.isFinite(minor)) { levels.push({ ft: minor, text: "Flood stage", colour: RIVER_LINE.flood }); }
  if (nextStage !== null && nextStage !== undefined) { levels.push({ ft: nextStage, text: "Next impact", colour: RIVER_LINE.next }); }
  levels.sort((a, b) => b.ft - a.ft); // highest first, so we can push labels down if they collide

  let lines = "";
  let labels = "";
  let lastLabelY = -100;
  for (const level of levels) {
    const y = yOf(level.ft);
    const labelY = Math.max(y - 3, lastLabelY + 13); // keep labels at least 13 px apart
    lastLabelY = labelY;
    lines += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${level.colour}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    labels += `<text x="8" y="${labelY}" font-size="11" font-weight="700" fill="${level.colour}" stroke="#fff" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${level.ft} ft · ${level.text}</text>`;
  }

  // Step 6: a text description for screen readers (the picture alone says nothing to them).
  const spoken = [`Schematic river picture. The water is at ${height} feet.`];
  if (nextStage !== null && nextStage !== undefined) { spoken.push(`The next listed impact is at ${nextStage} feet.`); }
  if (Number.isFinite(minor)) { spoken.push(`NWS flood stage is ${minor} feet.`); }
  if (Number.isFinite(major)) { spoken.push(`Major flood stage is ${major} feet.`); }

  return `
    <figure class="river">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${spoken.join(" ")}">
        <defs>
          <linearGradient id="water-${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${colours[0]}"/>
            <stop offset="1" stop-color="${colours[1]}"/>
          </linearGradient>
        </defs>
        <rect width="${W}" height="${H}" fill="#EAF3FA"/>
        <polygon points="${waterShape}" fill="url(#water-${id})"/>
        <line x1="${leftAt(water) + 3}" x2="${rightAt(water) - 3}" y1="${waterY + 1}" y2="${waterY + 1}" stroke="#fff" stroke-opacity="0.7" stroke-width="1.5"/>
        <polygon points="${ground}" fill="#DCCFB5"/>
        ${lines}
        <rect x="${postX}" y="${top}" width="${postW}" height="${floor - top}" fill="#fff" stroke="#8A99A8"/>
        ${marks}
        <polygon points="${pointer}" fill="#0E1A26"/>
        ${labels}
        ${nowLabel}
      </svg>
      <figcaption>Simplified drawing, not to scale. The numbers on the post are gauge height in feet, not water depth. Dashed lines are NWS levels for this gauge.</figcaption>
    </figure>`;
}
