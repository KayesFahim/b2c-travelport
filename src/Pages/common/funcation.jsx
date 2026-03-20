export const calculateTransitTime = (ArrTime, DepTime) => {
  const segmentTwoDeparture = new Date(DepTime);
  const segmentOneArrival = new Date(ArrTime);

  const timeDifferenceMs = segmentTwoDeparture - segmentOneArrival;

  const hours = Math.floor(timeDifferenceMs / (60 * 60 * 1000));
  const minutes = Math.floor((timeDifferenceMs % (60 * 60 * 1000)) / (60 * 1000));

  return `${hours}H ${minutes}Min`;
}

export const convertMinutesToHoursAndMinutes = (Duration) => {
  const hours = Math.floor(Duration / 60);
  const minutes = Duration % 60;
  return `${hours}H ${minutes}Min`;
};



 // country spalite funcation
  export const extractCountryDetails = (nationalityString) => {
  const regex = /^(.+)\((.+)\)$/;
  const matches = nationalityString.match(regex);

  let country = "";
  let countryCode = "";


  if (matches && matches.length === 3) {
    country = matches[1].trim();
    countryCode = matches[2].trim();
    
  }

  return { country, countryCode};
};

