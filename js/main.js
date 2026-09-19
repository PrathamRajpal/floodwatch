const gaugeThresholds = {
  "05528000": [
    { minHeight: 0,    tier: "Normal",  message: "No flooding impacts expected at this level." },
    { minHeight: 6.0,  tier: "Watch",   message: "Water begins overtopping low-lying riverbanks near Gurnee." },
    { minHeight: 6.5,  tier: "Watch",   message: "Low-lying sections of the Des Plaines River Trail are underwater." },
    { minHeight: 7.0,  tier: "Warning", message: "Forest land near the river begins flooding in Gurnee." },
    { minHeight: 9.0,  tier: "Warning", message: "Kilbourne Road and Emerald Avenue affected near Grand Avenue." },
    { minHeight: 10.0, tier: "Warning", message: "Residences threatened along Kilbourne Road, O'Plaine Road, and McClure Avenue. Businesses threatened along Old Grand Avenue near IL-132. IL-132 threatened east of the river." },
    { minHeight: 11.0, tier: "Major",   message: "Major flooding. US-41 (Skokie Highway) threatened near the river in Gurnee." },
    { minHeight: 12.0, tier: "Major",   message: "Downstream, Libertyville's wastewater treatment plant property is threatened." },
    { minHeight: 12.5, tier: "Major",   message: "Downstream, structures at Mundelein's water reclamation facility are threatened." },
    { minHeight: 13.5, tier: "Major",   message: "Downstream, structures at Libertyville's wastewater treatment plant are threatened." }
  ]
};
async function getGaugeData() {
    const url="https://waterservices.usgs.gov/nwis/iv/?sites=05528000&parameterCd=00065&siteStatus=all&format=json";
    const response = await fetch(url);
    const data = await response.json();

    const siteName = data.value.timeSeries[0].sourceInfo.siteName;
    const height = parseFloat(data.value.timeSeries[0].values[0].value[0].value);

    console.log(siteName, height);
}
getGaugeData();

function getRiskStatus (currentHeight, thresholds) {
    if(!thresholds) {
        return { tier: "Unknown", message: "No data available." };
    }

    const riskStatus = thresholds.findLast(
        threshold => currentHeight >= threshold.minHeight
    );

    return riskStatus
    ? { tier: riskStatus.tier, message: riskStatus.message}
    : { tier: "Unknown", message: "No risk status found." };
}
