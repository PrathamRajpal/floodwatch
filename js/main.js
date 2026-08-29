async function getGaugeData() {
    const url="https://waterservices.usgs.gov/nwis/iv/?sites=05528000&parameterCd=00065&siteStatus=all&format=json";
    const response = await fetch(url);
    const data = await response.json();

    console.log(data);
}

getGaugeData();