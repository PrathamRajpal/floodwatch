const gaugeThresholds = {
  // Des Plaines River near Russell (NWS: RUSI2)
  "05527800": {
    nwsId: "RUSI2",
    categories: { action: 6.5, minor: 7, moderate: 9, major: 10 },
    impacts: [
      { stage: 7,    statement: "Low-lying wetlands and agricultural land is inundated near the river." },
      { stage: 8,    statement: "Agricultural and park land is inundated near the river. Residential property is threatened near the river." },
      { stage: 9.5,  statement: "Residential structures threatened along Russell Road between the river and Kilbourne Road. Industrial parking lots threatened along Kilbourne Road." },
      { stage: 12,   statement: "Residential structures threatened along Ingram Drive. Russell Road threatened. Roadways and trails threatened at Van Patten Woods Forest Preserve." },
      { stage: 12.5, statement: "Rosecrans Road (IL-173) threatened near Wadsworth." },
      { stage: 13,   statement: "Skokie Highway (US-41) threatened south of Wadsworth Road in Wadsworth. Widespread inundation reaches up to a half mile from the river in Russell and Wadsworth." },
      { stage: 13.5, statement: "Wadsworth Road threatened in Wadsworth." },
      { stage: 15,   statement: "Kilbourne Road threatened. Commercial parking lots threatened along Dilleys Road." },
      { stage: 16,   statement: "Commercial parking lots threatened along Skokie Highway (US-41)." }
    ]
  },

  // Des Plaines River near Gurnee (NWS: GUNI2)
  "05528000": {
    nwsId: "GUNI2",
    categories: { action: 6.5, minor: 7, moderate: 9, major: 11 },
    impacts: [
      { stage: 6,    statement: "Water overtops low-lying banks in Gurnee." },
      { stage: 6.5,  statement: "Low-lying sections of the Des Plaines River trail inundated." },
      { stage: 7,    statement: "Forest land inundated near the river in Gurnee." },
      { stage: 9,    statement: "Kilbourne Road and Emerald Avenue threatened near Grand Avenue in Gurnee." },
      { stage: 10,   statement: "Residences threatened along Kilbourne Road and near O'Plaine Road and McClure Avenue in Gurnee. Businesses threatened along Old Grand Avenue near IL-132 in Gurnee. IL-132 (Grand Avenue) is threatened east of the river in Gurnee." },
      { stage: 11,   statement: "US-41 (Skokie Highway) threatened near the river in Gurnee. Mundelein Water Reclamation Facility property is threatened near Libertyville." },
      { stage: 12,   statement: "Libertyville Wastewater Treatment Plant property is threatened." },
      { stage: 12.5, statement: "Structures are threatened at Mundelein Water Reclamation Facility near Libertyville." },
      { stage: 13.5, statement: "Structures are threatened at Libertyville Wastewater Treatment Plant." }
    ]
  },

  // Des Plaines River at Lincolnshire (NWS: LDRI2)
  "05528100": {
    nwsId: "LDRI2",
    categories: { action: 11.5, minor: 12.5, moderate: 14, major: 15.5 },
    impacts: [
      { stage: 8,  statement: "Low-lying section of Des Plaines River Trail threatened near IL-60 (Townline Road)." },
      { stage: 13, statement: "Low-lying trails in Wright Woods Forest Preserve are inundated." },
      { stage: 14, statement: "Residences threatened east of the river just south of IL-22 (Half-Day Road). Lincolnshire Drive threatened at Wiltshire Lane." },
      { stage: 15, statement: "Structures threatened along IL-22 (Half-Day Road) just east of the river. Multiple structures threatened near and west of US-45 (Milwaukee Avenue) and Deerfield Road. Deerfield Road threatened near the river. Multiple trails inundated in Half-Day Forest Preserve." },
      { stage: 16, statement: "Numerous structures threatened along US-45 (Milwaukee Avenue) between IL-22 (Half Day Road) and Deerfield Road. Access route threatened for numerous residences near US-45 (Milwaukee Avenue) and Deerfield Road. IL-60 (Townline Road) threatened near the river." },
      { stage: 17, statement: "IL-22 (Half-Day Road) threatened just west of the river. US-45 (Milwaukee Avenue) threatened between IL-22 (Half-Day Road) and Lake Cook Road." },
      { stage: 18, statement: "Numerous structures threatened east of IL-21 (Milwaukee Avenue) between IL-60 (Townline Road) and IL-22 (Half-Day Road). Numerous residences threatened east of the river near IL-22 (Half-Day Road). Widespread inundation of residences and businesses along US-45 (Milwaukee Avenue) between IL-22 (Half-Day Road) and Lake Cook Road begins." },
      { stage: 19, statement: "Numerous commercial structures threatened near IL-21 (Milwaukee Avenue) and IL-60 (Townline Road). Low-lying sections of Grainger Woods Preserve are inundated." }
    ]
  },

  // Buffalo Creek at Wheeling (NWS: WHEI2)
  "05528500": {
    nwsId: "WHEI2",
    categories: { action: 4.5, minor: 5, moderate: 6.5, major: 7.5 },
    impacts: [
      { stage: 4,    statement: "Water overtops low-lying banks in Buffalo Grove and Wheeling." },
      { stage: 4.5,  statement: "Trails threatened near Arlington Heights Road in Buffalo Grove. Low-lying portions of Emmerich Park inundated in Buffalo Grove." },
      { stage: 5,    statement: "Parking lots threatened along Buffalo Grove Road." },
      { stage: 6,    statement: "Low-lying portions of Heritage Park inundated in Wheeling." },
      { stage: 6.5,  statement: "Residential parking lots threatened along McHenry Road. Low-lying portions of Buffalo Grove Golf Club inundated. Athletic fields threatened at Heritage Park in Wheeling." },
      { stage: 7,    statement: "A few structures threatened near Buffalo Grove Road and Lake Cook Road. A few structures threatened along St Marys Parkway near Lincoln Terrace in Buffalo Grove. Wolf Road and Jeffery Avenue threatened in Wheeling. Athletic fields threatened near Emmerich Park in Buffalo Grove. Agricultural land inundated in northwest Wheeling." },
      { stage: 7.5,  statement: "A few structures threatened along Dundee Road in Wheeling. Valley Stream Drive, Manda Lane, and side streets threatened in Wheeling." },
      { stage: 8,    statement: "Residential structures threatened along Valley Stream Drive, Manda Lane, and side streets in Wheeling. Lake Cook Road threatened in Buffalo Grove. Weiland Road threatened at McHenry Road (IL-83) in Wheeling." },
      { stage: 8.5,  statement: "Multiple commercial structures threatened near Elmhurst Road and Dundee Road in Wheeling. Widespread inundation of roadways and structures begins near Wolf Road and Jeffery Avenue in Wheeling. Multiple structures threatened along Northgate Parkway in Wheeling. McHenry Road threatened in Wheeling." },
      { stage: 9,    statement: "Widespread inundation of roadways and structures begins between Elmhurst Road and Eugene Field School in Wheeling. Water begins to bypass the main channel to the southeast along McHenry Road and Wheeling Road causing widespread inundation of roadways and structures near Wheeling Town Center. Elmhurst Road (IL-83) threatened in Wheeling. Parking lots threatened at Buffalo Grove Village Hall. Large portions of Buffalo Grove Golf Club inundated." },
      { stage: 9.5,  statement: "Raupp Boulevard threatened in Buffalo Grove." },
      { stage: 10,   statement: "Holmes Middle School threatened in Wheeling." },
      { stage: 10.5, statement: "Buffalo Grove Village Hall threatened. A few residential structures threatened along Raupp Boulevard in Buffalo Grove." },
      { stage: 11,   statement: "Buffalo Grove Road threatened at Lake Cook Road." },
      { stage: 12.5, statement: "Arlington Heights Road may be threatened in Buffalo Grove." }
    ]
  }
};

function getRiskStatus(currentHeight, gauge) {
  if (!gauge) {
    return { tier: "Unknown", message: "No data available.", affected: [], next: null };
  }

  const categories = gauge.categories;

  let tier = "Normal";
  if (currentHeight >= categories.major) {
    tier = "Major";
  } else if (currentHeight >= categories.minor) {
    tier = "Warning";
  } else if (currentHeight >= categories.action) {
    tier = "Watch";
  }

  const affected = gauge.impacts.filter(impact => currentHeight >= impact.stage);
  const next = gauge.impacts.find(impact => impact.stage > currentHeight);

  if (tier === "Normal" && affected.length > 0) {
    tier = "Watch";
  }

  const message = affected.length > 0
    ? affected[affected.length - 1].statement
    : "No flooding impacts expected at this level.";

  return { tier, message, affected, next };
}