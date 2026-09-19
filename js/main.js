const gaugeThresholds = {
  "05528000": [
    { minHeight: 0,    tier: "Normal",  message: "No flooding impacts expected at this level." },
    { minHeight: 7.0,  tier: "Watch",   message: "River is beginning to top its banks near Gurnee." },
    { minHeight: 8.5,  tier: "Warning", message: "Roadway access problems on McClure Avenue and Kilbourne Road." },
    { minHeight: 9.5,  tier: "Warning", message: "Grand Avenue and nearby homes affected." },
    { minHeight: 11.0, tier: "Major",   message: "Major flooding — widespread impact expected." }
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