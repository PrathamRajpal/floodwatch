// Small helpers shared by the other scripts.

const CLOSE_FT = 1.0; // "close" means the next listed impact is within this many feet

// Text that comes from other websites goes through this before it is put into the page as HTML.
function clean(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// USGS writes gauge names in capitals ("DES PLAINES RIVER NEAR GURNEE, IL").
function niceName(raw) {
  const small = ["at", "near", "of", "and"];
  return raw.toLowerCase().split(" ").map((word, i) => {
    if (i > 0 && small.includes(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ").replace(/, Il$/, ", IL");
}

// "Des Plaines River at Lincolnshire, IL" -> "Lincolnshire"
function placeOf(name) {
  const match = name.match(/ (?:at|near) (.*?)(?:, IL)?$/);
  return match ? match[1] : name;
}

// A time with its time zone, so "10:30 AM" cannot be misread.
function clock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}