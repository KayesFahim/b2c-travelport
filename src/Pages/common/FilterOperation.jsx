export const handleFilterByTime = (property, selectedTime, arr) => {
  const filteredByDepTime = arr.filter((flight) => {
    const firstSegment = flight.AllLegsInfo[0]?.Segments[0];
    if (!firstSegment) return false;
    const timeValue = firstSegment[property]?.split("T")[1].slice(0, 5);
    if (selectedTime === "00:00 - 05:59") {
      return timeValue >= "00:00" && timeValue <= "05:59";
    } else if (selectedTime === "06:00 - 11:59") {
      return timeValue >= "06:00" && timeValue <= "11:59";
    } else if (selectedTime === "12:00 - 17:59") {
      return timeValue >= "12:00" && timeValue <= "17:59";
    } else if (selectedTime === "18:00 - 23:59") {
      return timeValue >= "18:00" && timeValue <= "23:59";
    }
  });

  return filteredByDepTime;
};
export const handleFilterArribalByTime = (property, selectedTime, arr) => {
  const filteredByArrTime = arr.filter((flight) => {
    const segments = flight.AllLegsInfo[0]?.Segments;
    if (!segments || segments.length === 0) return false;

    const lastSegment = segments[segments.length - 1];
    const timeValue = lastSegment[property]?.split("T")[1].slice(0, 5);
    if (selectedTime === "00:00 - 05:59") {
      return timeValue >= "00:00" && timeValue <= "05:59";
    } else if (selectedTime === "06:00 - 11:59") {
      return timeValue >= "06:00" && timeValue <= "11:59";
    } else if (selectedTime === "12:00 - 17:59") {
      return timeValue >= "12:00" && timeValue <= "17:59";
    } else if (selectedTime === "18:00 - 23:59") {
      return timeValue >= "18:00" && timeValue <= "23:59";
    }
  });

  return filteredByArrTime;
};

export const handleReturenFilterByTime = (property, selectedTime, arr) => {
  const filteredByDepTime = arr.filter((flight) => {
    const firstSegment = flight.AllLegsInfo[1]?.Segments[0];
    if (!firstSegment) return false;
    const timeValue = firstSegment[property]?.split("T")[1].slice(0, 5);
    if (selectedTime === "00:00 - 05:59") {
      return timeValue >= "00:00" && timeValue <= "05:59";
    } else if (selectedTime === "06:00 - 11:59") {
      return timeValue >= "06:00" && timeValue <= "11:59";
    } else if (selectedTime === "12:00 - 17:59") {
      return timeValue >= "12:00" && timeValue <= "17:59";
    } else if (selectedTime === "18:00 - 23:59") {
      return timeValue >= "18:00" && timeValue <= "23:59";
    }
  });

  return filteredByDepTime;
};

export const handleReturenArribalFilterByTime = (
  property,
  selectedTime,
  arr
) => {
  const filteredByArrTime = arr.filter((flight) => {
    const segments = flight.AllLegsInfo[1]?.Segments;
    if (!segments || segments.length === 0) return false;

    const lastSegment = segments[segments.length - 1];
    const timeValue = lastSegment[property]?.split("T")[1].slice(0, 5);
    if (selectedTime === "00:00 - 05:59") {
      return timeValue >= "00:00" && timeValue <= "05:59";
    } else if (selectedTime === "06:00 - 11:59") {
      return timeValue >= "06:00" && timeValue <= "11:59";
    } else if (selectedTime === "12:00 - 17:59") {
      return timeValue >= "12:00" && timeValue <= "17:59";
    } else if (selectedTime === "18:00 - 23:59") {
      return timeValue >= "18:00" && timeValue <= "23:59";
    }
  });

  return filteredByArrTime;
};

// Filtering function based on baggage
export const filterByBaggage = (bags, arr) => {
  const filteredByBaggage = arr.filter(
    (item) => item.PriceBreakDown?.[0]?.Bag?.[0]?.Allowance === bags
  );
  return filteredByBaggage;
};

//////  Layover time filter   //////
const calculateTotalTransitTime = (transit) => {
  const transitTimes = Object.values(transit).map((time) => {
    const [hours, minutes] = time.split("H ").map((val) => parseInt(val));
    return hours * 60 + minutes;
  });

  return transitTimes.reduce((total, time) => total + time, 0);
};

// filter by total transite time
export const filterFlightsByLayoverTime = (activeLayoverTime, arr) => {
  const filteredFlights = arr.filter((flight) => {
    const totalTransitTime = calculateTotalTransitTime(flight.transit);
    if (activeLayoverTime === 300) {
      return totalTransitTime <= 300; // 0-5 hours
    } else if (activeLayoverTime === 600) {
      return totalTransitTime >= 301 && totalTransitTime <= 600; // 5-10 hours
    } else if (activeLayoverTime === 900) {
      return totalTransitTime >= 601 && totalTransitTime <= 900; // 10-15 hours
    } else if (activeLayoverTime === 901) {
      return totalTransitTime >= 901; // 15+ hours
    } else {
      return true;
    }
  });
  return filteredFlights;
};

export const roundfilterFlightsByLayoverTime = (
  flightType,
  activeLayoverTime,
  arr
) => {
  const filteredFlights = arr.filter((flight) => {
    const totalTransitTime = calculateTotalTransitTime(
      flight.transit[flightType]
    );

    if (activeLayoverTime === 300) {
      return totalTransitTime <= 300;
    } else if (activeLayoverTime === 600) {
      return totalTransitTime >= 301 && totalTransitTime <= 600;
    } else if (activeLayoverTime === 900) {
      return totalTransitTime >= 601 && totalTransitTime <= 900;
    } else if (activeLayoverTime === 901) {
      return totalTransitTime >= 901;
    } else {
      return true;
    }
  });
  return filteredFlights;
};

export const filterFlightsByLayoverAirport = (arrivalAirport, arr) => {
  const filteredData = arr.filter((flight) => {
    return flight.segments.some(
      (segment) => segment.arrival === arrivalAirport
    );
  });

  return filteredData;
};

export const roundwayfilterFlightsByLayoverAirport = (arrivalAirport, arr) => {
  const filteredData = arr.filter((flight) => {
    return flight.segments.go.some(
      (segment) => segment.arrival === arrivalAirport
    );
  });

  return filteredData;
};
