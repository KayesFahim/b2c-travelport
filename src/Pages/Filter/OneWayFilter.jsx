import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Slider,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  filterByBaggage,
  filterFlightsByLayoverTime,
  filterFlightsByLayoverAirport,
  handleFilterByTime,
  handleFilterArribalByTime,
} from "../../Pages/common/FilterOperation";
import { AiFillCaretDown } from "react-icons/ai";

const times = [
  {
    image: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M4.93553 12.7021C4.93553 8.45082 8.3221 5.00473 12.5 5.00473C16.6779 5.00473 20.0644 8.45082 20.0644 12.7021C20.0644 13.2192 19.6525 13.6383 19.1444 13.6383C18.6363 13.6383 18.2244 13.2192 18.2244 12.7021C18.2244 9.48489 15.6617 6.87707 12.5 6.87707C9.3383 6.87707 6.77553 9.48489 6.77553 12.7021C6.77553 13.2192 6.36363 13.6383 5.85553 13.6383C5.34743 13.6383 4.93553 13.2192 4.93553 12.7021Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12.5 1C13.2057 1 13.7778 1.58214 13.7778 2.30024V2.38344C13.7778 3.10154 13.2057 3.68367 12.5 3.68367C11.7943 3.68367 11.2222 3.10154 11.2222 2.38344V2.30024C11.2222 1.58214 11.7943 1 12.5 1ZM4.29779 4.35576C4.7968 3.84798 5.60584 3.84798 6.10484 4.35576L6.23774 4.49098C6.73674 4.99876 6.73674 5.82202 6.23774 6.3298C5.73873 6.83757 4.92969 6.83757 4.43069 6.3298L4.29779 6.19457C3.79879 5.68679 3.79879 4.86353 4.29779 4.35576ZM20.7022 4.35576C21.2012 4.86353 21.2012 5.68679 20.7022 6.19457L20.5693 6.3298C20.0703 6.83757 19.2613 6.83757 18.7623 6.3298C18.2633 5.82202 18.2633 4.99876 18.7623 4.49098L18.8952 4.35576C19.3942 3.84798 20.2032 3.84798 20.7022 4.35576ZM1 12.7021C1 11.984 1.57208 11.4019 2.27778 11.4019H2.35957C3.06527 11.4019 3.63735 11.984 3.63735 12.7021C3.63735 13.4202 3.06527 14.0024 2.35957 14.0024H2.27778C1.57208 14.0024 1 13.4202 1 12.7021ZM21.3626 12.7021C21.3626 11.984 21.9347 11.4019 22.6404 11.4019H22.7222C23.4279 11.4019 24 11.984 24 12.7021C24 13.4202 23.4279 14.0024 22.7222 14.0024H22.6404C21.9347 14.0024 21.3626 13.4202 21.3626 12.7021Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M3.4022 15.8227C3.4022 15.3057 3.8141 14.8865 4.3222 14.8865H20.6778C21.1859 14.8865 21.5978 15.3057 21.5978 15.8227C21.5978 16.3397 21.1859 16.7589 20.6778 16.7589H4.3222C3.8141 16.7589 3.4022 16.3397 3.4022 15.8227Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M5.44664 18.9433C5.44664 18.4262 5.85854 18.0071 6.36664 18.0071H18.6333C19.1414 18.0071 19.5533 18.4262 19.5533 18.9433C19.5533 19.4603 19.1414 19.8794 18.6333 19.8794H6.36664C5.85854 19.8794 5.44664 19.4603 5.44664 18.9433Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8.51331 22.0638C8.51331 21.5468 8.92521 21.1277 9.43331 21.1277H15.5666C16.0747 21.1277 16.4866 21.5468 16.4866 22.0638C16.4866 22.5809 16.0747 23 15.5666 23H9.43331C8.92521 23 8.51331 22.5809 8.51331 22.0638Z"
          fill="#9BA6B2"
        ></path>
      </svg>
    ),
    value: "00:00 - 05:59",
  },
  {
    image: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          fill="#9BA6B2"
          fill-rule="evenodd"
          d="M12 6.026a5.973 5.973 0 1 0 0 11.947 5.973 5.973 0 0 0 0-11.947ZM4.107 12a7.893 7.893 0 1 1 15.786 0 7.893 7.893 0 0 1-15.786 0ZM12 0c.736 0 1.333.597 1.333 1.333v.085a1.333 1.333 0 1 1-2.666 0v-.085C10.667.597 11.264 0 12 0ZM3.441 3.44c.52-.52 1.365-.52 1.886 0l.138.14A1.333 1.333 0 0 1 3.58 5.465l-.139-.139a1.333 1.333 0 0 1 0-1.885Zm17.118 0c.52.522.52 1.366 0 1.886l-.139.14a1.333 1.333 0 1 1-1.886-1.886l.14-.14c.52-.52 1.364-.52 1.885 0ZM0 12c0-.737.597-1.334 1.333-1.334h.086a1.333 1.333 0 0 1 0 2.667h-.086A1.333 1.333 0 0 1 0 12Zm21.248 0c0-.737.597-1.334 1.333-1.334h.086a1.333 1.333 0 0 1 0 2.667h-.086A1.333 1.333 0 0 1 21.248 12ZM5.465 18.534c.521.52.521 1.365 0 1.886l-.138.138a1.333 1.333 0 0 1-1.886-1.885l.139-.139c.52-.52 1.365-.52 1.885 0Zm13.07 0c.52-.52 1.364-.52 1.885 0l.139.139a1.333 1.333 0 1 1-1.886 1.886l-.138-.14a1.333 1.333 0 0 1 0-1.885ZM12 21.248c.736 0 1.333.597 1.333 1.333v.085a1.333 1.333 0 1 1-2.666 0v-.085c0-.736.597-1.333 1.333-1.333Z"
          clip-rule="evenodd"
        ></path>
      </svg>
    ),
    value: "06:00 - 11:59",
  },
  {
    image: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M4.93553 12.7021C4.93553 8.45082 8.3221 5.00473 12.5 5.00473C16.6779 5.00473 20.0644 8.45082 20.0644 12.7021C20.0644 13.2192 19.6525 13.6383 19.1444 13.6383C18.6363 13.6383 18.2244 13.2192 18.2244 12.7021C18.2244 9.48489 15.6617 6.87707 12.5 6.87707C9.3383 6.87707 6.77553 9.48489 6.77553 12.7021C6.77553 13.2192 6.36363 13.6383 5.85553 13.6383C5.34743 13.6383 4.93553 13.2192 4.93553 12.7021Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12.5 1C13.2057 1 13.7778 1.58214 13.7778 2.30024V2.38344C13.7778 3.10154 13.2057 3.68367 12.5 3.68367C11.7943 3.68367 11.2222 3.10154 11.2222 2.38344V2.30024C11.2222 1.58214 11.7943 1 12.5 1ZM4.29779 4.35576C4.7968 3.84798 5.60584 3.84798 6.10484 4.35576L6.23774 4.49098C6.73674 4.99876 6.73674 5.82202 6.23774 6.3298C5.73873 6.83757 4.92969 6.83757 4.43069 6.3298L4.29779 6.19457C3.79879 5.68679 3.79879 4.86353 4.29779 4.35576ZM20.7022 4.35576C21.2012 4.86353 21.2012 5.68679 20.7022 6.19457L20.5693 6.3298C20.0703 6.83757 19.2613 6.83757 18.7623 6.3298C18.2633 5.82202 18.2633 4.99876 18.7623 4.49098L18.8952 4.35576C19.3942 3.84798 20.2032 3.84798 20.7022 4.35576ZM1 12.7021C1 11.984 1.57208 11.4019 2.27778 11.4019H2.35957C3.06527 11.4019 3.63735 11.984 3.63735 12.7021C3.63735 13.4202 3.06527 14.0024 2.35957 14.0024H2.27778C1.57208 14.0024 1 13.4202 1 12.7021ZM21.3626 12.7021C21.3626 11.984 21.9347 11.4019 22.6404 11.4019H22.7222C23.4279 11.4019 24 11.984 24 12.7021C24 13.4202 23.4279 14.0024 22.7222 14.0024H22.6404C21.9347 14.0024 21.3626 13.4202 21.3626 12.7021Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M3.4022 15.8227C3.4022 15.3057 3.8141 14.8865 4.3222 14.8865H20.6778C21.1859 14.8865 21.5978 15.3057 21.5978 15.8227C21.5978 16.3397 21.1859 16.7589 20.6778 16.7589H4.3222C3.8141 16.7589 3.4022 16.3397 3.4022 15.8227Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M5.44664 18.9433C5.44664 18.4262 5.85854 18.0071 6.36664 18.0071H18.6333C19.1414 18.0071 19.5533 18.4262 19.5533 18.9433C19.5533 19.4603 19.1414 19.8794 18.6333 19.8794H6.36664C5.85854 19.8794 5.44664 19.4603 5.44664 18.9433Z"
          fill="#9BA6B2"
        ></path>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8.51331 22.0638C8.51331 21.5468 8.92521 21.1277 9.43331 21.1277H15.5666C16.0747 21.1277 16.4866 21.5468 16.4866 22.0638C16.4866 22.5809 16.0747 23 15.5666 23H9.43331C8.92521 23 8.51331 22.5809 8.51331 22.0638Z"
          fill="#9BA6B2"
        ></path>
      </svg>
    ),
    value: "12:00 - 17:59",
  },
  {
    image: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9.8813 2.33134C10.6176 2.91924 10.5122 3.88794 10.2852 4.55455L10.2847 4.55603C9.96041 5.50325 9.82316 6.52314 9.91812 7.58246L9.91841 7.58572C10.2567 11.5165 13.7984 14.6117 17.8143 14.4466C18.4078 14.4226 18.9699 14.335 19.5103 14.1916C19.8946 14.0883 20.2878 14.0409 20.658 14.0959C21.0367 14.1522 21.4417 14.3271 21.7173 14.7056C21.9916 15.0823 22.0351 15.5197 21.9781 15.8941C21.9221 16.2618 21.7646 16.6224 21.5572 16.9586C19.7906 19.8505 16.62 21.8492 12.9128 21.9925C7.64939 22.1928 2.91402 18.352 2.12398 13.1766C1.41419 8.59102 3.81801 4.35177 7.64647 2.34963C8.26397 2.02555 9.17576 1.76803 9.8813 2.33134ZM8.54656 3.95716C8.53096 3.96486 8.51491 3.97304 8.49841 3.98171L8.49683 3.98253C5.32044 5.64367 3.35865 9.13909 3.94041 12.8951L3.94073 12.8972C4.58542 17.1235 8.48782 20.3174 12.8419 20.152C15.9194 20.033 18.5365 18.3768 19.9906 15.9952L19.9932 15.9911C19.9987 15.9821 20.0041 15.9733 20.0093 15.9646C20.0015 15.9666 19.9936 15.9687 19.9856 15.9709L19.9827 15.9716C19.314 16.1493 18.6193 16.2574 17.8897 16.2869C12.9156 16.4915 8.51295 12.6802 8.08733 7.74563C7.96875 6.42023 8.14115 5.1417 8.54587 3.95919L8.54656 3.95716Z"
          fill="#9BA6B2"
        ></path>
      </svg>
    ),
    value: "18:00 - 23:59",
  },
];

const OneWayFilter = ({
  initialFetchData,
  filteredData,
  sortedBy,
  setSortedBy,
  setfilteredData,
  setCurrentPage,
}) => {
  let arr = [];

  const convertWeight = (initialFetchData) => {
    const mappings = {
      "1P": "23Kg",
      "2P": "46Kg",
      "1 N": "23 Kg",
      "2 N": "46 Kg",
    };
    return (
      mappings[initialFetchData] ||
      (initialFetchData.endsWith("Kg")
        ? initialFetchData
        : initialFetchData.replace("K", "Kg"))
    );
  };
  let flightprice = initialFetchData;
  flightprice.map((dat) => {
    arr.push(dat.NetFare || dat.GrossFare);
    return arr;
  });
  const maxPrice = Math.max(...arr);
  const minPrice = Math.min(...arr);
  const [range, setRange] = useState([minPrice, maxPrice]);
  const [selectPrice, setSelectPrice] = useState([minPrice, maxPrice]);

  // departure and arrival time filter states
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  // stops states
  const [directFlight, setDirectFlight] = useState(false);
  const [oneStopFlight, setOneStopFlight] = useState(false);
  const [multiStopFlight, setMultiStopFlight] = useState(false);

  // Layover Airport filter states
  const [isShowAll, setIsShowAll] = useState(false);
  const [activeLayoverAirport, setActiveLayoverAirport] = useState("");
  // Baggage filter states
  const [baggageValue, setBaggageValue] = useState("");

  const filteredFlights = filteredData.filter(
    (flight) =>
      (flight.NetFare || flight.GrossFare) >= range[0] &&
      (flight.NetFare || flight.GrossFare) <= range[1]
  );

  useEffect(() => {
    const handleFilterData = () => {
      let copyFilteredData = [...initialFetchData];
      if (directFlight) {
        const updatedData = copyFilteredData.filter(
          (item) => item.AllLegsInfo?.[0]?.Segments?.length === 1
        );
        setfilteredData(updatedData);
        copyFilteredData = [...updatedData];
      }

      if (oneStopFlight) {
        const updatedData = copyFilteredData.filter(
          (item) => item.AllLegsInfo?.[0]?.Segments?.length === 2
        );
        setfilteredData(updatedData);
        copyFilteredData = [...updatedData];
      }

      if (multiStopFlight) {
        const updatedData = copyFilteredData.filter(
          (item) => item.AllLegsInfo?.[0]?.Segments?.length > 2
        );
        setfilteredData(updatedData);
        copyFilteredData = [...updatedData];
      }

      if (departureTime) {
        const updatedData = handleFilterByTime(
          "DepTime",
          departureTime,
          copyFilteredData
        );
        setfilteredData(updatedData);
        copyFilteredData = [...updatedData];
      }

      if (arrivalTime) {
        const updatedData = handleFilterArribalByTime(
          "ArrTime",
          arrivalTime,
          copyFilteredData
        );
        setfilteredData(updatedData);
        copyFilteredData = [...updatedData];
      }

      // Apply layover airport filter
      if (activeLayoverAirport) {
        copyFilteredData = copyFilteredData.filter((flight) => {
          const segments = flight.AllLegsInfo[0]?.Segments || [];
          return segments.some(
            (segment) => segment.ArrTo === activeLayoverAirport
          );
        });
      }

      if (baggageValue) {
        const updatedData = filterByBaggage(baggageValue, copyFilteredData);
        setfilteredData(updatedData);
        copyFilteredData = [...updatedData];
      }

      setfilteredData(copyFilteredData);
    };

    handleFilterData();
  }, [
    directFlight,
    oneStopFlight,
    multiStopFlight,
    departureTime,
    arrivalTime,
    activeLayoverAirport,
    baggageValue,
    initialFetchData,
  ]);

  //////  Non Stop on change    //////
  const handleDirectFlight = (e) => {
    setOneStopFlight(false);
    setMultiStopFlight(false);
    setDirectFlight(e.target.checked);
  };

  //////  One Stop on change    //////
  const handleOneStopFlight = (e) => {
    setDirectFlight(false);
    setOneStopFlight(e.target.checked);
    setMultiStopFlight(false);
  };

  //////  One plus Stop on change    //////
  const handleMultiStopFlight = (e) => {
    setMultiStopFlight(e.target.checked);
    setDirectFlight(false);
    setOneStopFlight(false);
  };

  //////  Departure on change    //////
  const onDepartureTimeChange = (time) => {
    if (departureTime === time) {
      setDepartureTime("");
    } else {
      setDepartureTime(time);
    }
  };

  //////  Arrival on change   //////
  const onArrivalTimeChange = (time) => {
    if (arrivalTime === time) {
      setArrivalTime("");
    } else {
      setArrivalTime(time);
    }
  };

  ////// Layover Ariport on change    //////
  const allSegments = initialFetchData.flatMap(
    (flight) => flight.AllLegsInfo[0]?.Segments || []
  );
  const layoverSegments = allSegments.filter(
    (segment) => segment.ArrTo !== segment.DepFrom
  );
  const uniqueSegmentData = layoverSegments.filter((segment, index, arr) => {
    return arr.findIndex((flight) => flight.ArrTo === segment.ArrTo) === index;
  });

  const layoverAirports = isShowAll
    ? uniqueSegmentData
    : uniqueSegmentData.slice(0, 5);
  const onLayoverAirportChange = (arrTo) => {
    if (activeLayoverAirport === arrTo) {
      setActiveLayoverAirport("");
    } else {
      setActiveLayoverAirport(arrTo);
    }
  };

  const bagsArr = initialFetchData?.map(
    (item) => item.PriceBreakDown?.[0]?.Bag?.[0]?.Allowance
  );

  // Create unique and sorted baggage array
  const uniqueBagsArr = [...new Set(bagsArr)].sort((a, b) =>
    a.localeCompare(b)
  );

  //////  Reset filter   //////
  const handleResetBtn = () => {
    setSortedBy("cheapest");
    setRange([minPrice, maxPrice]);
    setSelectPrice([minPrice, maxPrice]);

    setDirectFlight(false);
    setOneStopFlight(false);
    setMultiStopFlight(false);
    setDepartureTime("");
    setArrivalTime("");
    setActiveLayoverAirport("");
    setBaggageValue("");
    setfilteredData(initialFetchData);
  };

  // Handling baggage selection
  const handleBaggageChangle = (bags) => {
    if (baggageValue === bags) {
      setBaggageValue("");
    } else {
      setBaggageValue(bags);
    }
  };

  //////  cheapest filter   //////
  const handleFilterByCheapest = () => {
    const sortedByCheapest = [...filteredData].sort(
      (a, b) => parseFloat(a.NetFare) - parseFloat(b.GrossFare)
    );
    setSortedBy("cheapest");
    setfilteredData(sortedByCheapest);
  };

  const resetFilters = () => {
    setfilteredData(initialFetchData);
  };

  useEffect(() => {
    if (initialFetchData && initialFetchData.length > 0) {
      let arr = initialFetchData.map((dat) => dat.NetFare || dat.GrossFare);

      if (arr.length > 0) {
        const minPrice = Math.min(...arr);
        const maxPrice = Math.max(...arr);

        // Set the range and selectPrice dynamically
        setRange([minPrice, maxPrice]);
        setSelectPrice([minPrice, maxPrice]);
      }
    }
  }, [initialFetchData]);
  const handleChange = (event, newValue) => {
    setRange(newValue);

    const filteredFlights = initialFetchData.filter((flight) => {
      const price = flight.NetFare || flight.GrossFare;
      return price >= newValue[0] && price <= newValue[1];
    });

    setfilteredData(filteredFlights);
    setCurrentPage(1); // Reset to the first page after filtering
  };

  return (
    <Box sx={{ p: "10px 15px" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #D9D9D9",
          pb: "2px",
        }}
      >
        <Typography sx={{ fontSize: "16px", color: "#3D3A49" }}>
          Filter
        </Typography>
        <Typography
          onClick={handleResetBtn}
          sx={{ color: "#63686D", cursor: "pointer" }}
        >
          Reset
        </Typography>
      </Box>

      <Box sx={{ py: "20px" }}>
        <Typography sx={{ fontSize: "15px", color: "#3D3A49" }}>
          Price Range
        </Typography>
        <Box sx={{ pt: "15px" }}>
          <Slider
            style={{ color: "var(--primary-color)", fontSize: "10px" }}
            getAriaLabel={() => "Temperature range"}
            value={range}
            onChange={handleChange}
            valueLabelDisplay="auto"
            aria-labelledby="range-slider"
            min={selectPrice[0]} // Set the dynamic min price
            max={selectPrice[1]} // Set the dynamic max price
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontSize: "14px",
                color: "var(--meta-black)",
                fontWeight: 500,
              }}
            >
              ৳ {selectPrice[0].toLocaleString()}
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                color: "var(--meta-black)",
                fontWeight: 500,
              }}
            >
              ৳ {selectPrice[1].toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Favourite */}
      <Box sx={{ py: "10px" }}>
        <Box>
          <Typography
            sx={{
              color: "var(--filter-text-color)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Favourite
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              pt: "5px",
            }}
          >
            <Button
              onClick={handleFilterByCheapest}
              sx={{
                color: "white",
                bgcolor: "var(--primary-button)",
                textTransform: "capitalize",
                ":hover": {
                  color: "white",
                  bgcolor: "var(--primary-button)",
                },
              }}
            >
              Cheapest
            </Button>
            <Button
              onClick={handleFilterByCheapest}
              sx={{
                color: "white",
                bgcolor: "var(--primary-button)",
                textTransform: "capitalize",
                ":hover": {
                  color: "white",
                  bgcolor: "var(--primary-button)",
                },
              }}
            >
              Best
            </Button>
          </Box>
          {/* <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              pt: "5px",
            }}
          >
            <Button
              onClick={handleFilterByCheapest}
              sx={{
                color: "white",
                bgcolor: "var(--primary-button)",
                textTransform: "capitalize",
                ":hover": {
                  color: "white",
                  bgcolor: "var(--primary-button)",
                },
              }}
            >
              Best
            </Button>
          </Box> */}
        </Box>
      </Box>

      {/* stops  */}

      <Box sx={{ py: "10px" }}>
        <Box>
          <Typography
            sx={{
              color: "var(--filter-text-color)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Stops
          </Typography>
          <Box sx={{ width: "100%" }}>
            <FormGroup className="check-box-text09">
              <FormControlLabel
                onChange={handleDirectFlight}
                checked={directFlight}
                control={
                  <Checkbox
                    style={{ color: "var(--primary-button)" }}
                    className="box-0"
                  />
                }
                label="Non Stop"
                sx={{
                  color: "var(--filter-color)",
                  "& .MuiTypography-root": {
                    fontSize: "16px",
                  },
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    style={{ color: "var(--primary-button)" }}
                    className="box-0"
                  />
                }
                checked={oneStopFlight}
                onChange={handleOneStopFlight}
                label="One Stops"
                sx={{
                  color: "var(--filter-color)",
                  "& .MuiTypography-root": {
                    fontSize: "16px",
                  },
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    style={{ color: "var(--primary-button)" }}
                    className="box-0"
                  />
                }
                checked={multiStopFlight}
                onChange={handleMultiStopFlight}
                label="One Plus Stops"
                sx={{
                  color: "var(--filter-color)",
                  "& .MuiTypography-root": {
                    fontSize: "16px",
                  },
                }}
              />
            </FormGroup>
          </Box>
        </Box>
      </Box>
      {/* Airlines  */}
      <Box sx={{ py: "10px" }}>
        <Box>
          <Typography
            sx={{
              color: "var(--filter-text-color)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Layover City
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              pt: "3px",
            }}
          >
            <FormGroup className="check-box-text09">
              {layoverAirports?.map((item, i) => (
                <FormControlLabel
                  key={i}
                  control={
                    <Checkbox
                      style={{ color: "var(--primary-button)" }}
                      checked={activeLayoverAirport === item.ArrTo}
                      onChange={() => onLayoverAirportChange(item.ArrTo)}
                      name={item?.ArrTo}
                      className="box-0"
                    />
                  }
                  label={item?.ArrAirPort}
                  sx={{
                    color: "var(--filter-color)",
                    "& .MuiTypography-root": {
                      fontSize: "15px",
                    },
                  }}
                />
              ))}
              <Typography
                onClick={() => setIsShowAll(!isShowAll)}
                sx={{
                  borderBottom: "1px solid #D9D9D9 !important",
                  width: "60px",
                  color: "Var(--filter-color)",
                  fontSize: "12px",
                  mt: "5px",
                }}
              >
                Show {isShowAll ? "Less" : "All"}
              </Typography>
            </FormGroup>
          </Box>
        </Box>
      </Box>
      {/* depature time */}

      <Box sx={{ py: "15px" }}>
        <Box>
          <Typography
            sx={{
              color: "var(--filter-text-color)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Departure Time - {initialFetchData[0]?.AllLegsInfo[0].DepFrom}
          </Typography>

          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: "500",
              color: "#8C8080",
              mb: "10px",
            }}
          >
            From {initialFetchData[0]?.AllLegsInfo[0].DepFrom}
          </Typography>
          {times.map((item, i) => (
            <Box
            key={i}
              onClick={() => onDepartureTimeChange(item.value)}
              sx={{
                display: "flex",
                p: "5px",
                my: "5px",
                cursor: "pointer",
                bgcolor: "#E9F3FF",
                border: `${
                  departureTime === item.value
                    ? "1px solid #2156a6"
                    : "1px solid transparent"
                }`,
              }}
            >
              <img src={item.image} alt="" />
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#2156a6",
                  ml: "12px",
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {/* Arrival Time */}
      <Box sx={{ py: "15px" }}>
        <Box>
          <Typography
            sx={{
              color: "var(--filter-text-color)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Arrival Time - {initialFetchData[0]?.AllLegsInfo[0].ArrTo}
          </Typography>

          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: "500",
              color: "#8C8080",
              mb: "10px",
            }}
          >
            To {initialFetchData[0]?.AllLegsInfo[0].ArrTo}
          </Typography>
          {times.map((item, i) => (
            <Box
            key={i}
              onClick={() => onArrivalTimeChange(item.value)}
              sx={{
                display: "flex",
                p: "5px",
                my: "5px",
                cursor: "pointer",
                bgcolor: "#E9F3FF",
                border: `${
                  arrivalTime === item.value
                    ? "1px solid #2156a6"
                    : "1px solid transparent"
                }`,
              }}
            >
              <img src={item.image} alt="" />
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#2156a6",
                  ml: "12px",
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {/* baggage  */}
      <Box sx={{ py: "15px" }}>
        <Box>
          <Typography
            sx={{
              color: "var(--filter-text-color)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Bagagge
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              pt: "15px",
            }}
          >
            <FormGroup className="check-box-text09">
              {uniqueBagsArr.map((item, i) => (
                <FormControlLabel
                  key={i}
                  control={
                    <Checkbox
                      style={{ color: "var(--primary-button)" }}
                      onChange={() => handleBaggageChangle(item)}
                      checked={baggageValue === item}
                      name={item}
                      className="box-0"
                    />
                  }
                  sx={{
                    color: "var(--filter-color)",
                    "& .MuiTypography-root": {
                      fontSize: "16px",
                    },
                  }}
                  label={`${convertWeight(item)}`}
                />
              ))}
            </FormGroup>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default OneWayFilter;
