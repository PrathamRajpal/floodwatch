async function getGaugeData() {
    const url="https://waterservices.usgs.gov/nwis/iv/?sites=05528000&parameterCd=00065&siteStatus=all&format=json";
    const response = await fetch(url);
    const data = await response.json();

    const siteName = data.value.timeSeries[0].sourceInfo.siteName;
    const height = parseFloat(data.value.timeSeries[0].values[0].value[0].value);

    console.log(siteName, height);
}

getGaugeData();