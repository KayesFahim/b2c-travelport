import {
  Box,
  Button,
  Container,
  Drawer,
  Grid,
  Pagination,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import AirlinesSlider from "../AirlinesSlider/AirlinesSlider";
import AirlinesSliderSlikton from "../AirlinesSlider/AirlinesSliderSlikton";
import AfterSearchBanner from "../AfterSearch/AfterSearchBanner";
import NavBar from "../../Shared/NavBar/NavBar";
import SingleMulticityFlight from "./SingleMulticityFlight";
import { Link, useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import moment from "moment";
import SingleMulticityFlightSlikton from "./SingleMulticityFlightSlikton";
import RoundwaySelecton from "../Filter/RoundwaySelecton";
import RoundwayFilters from "../Filter/RoundwayFilters";
import { debounce } from "lodash";
import Filter from "../Filter/Filter";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SingleOnewayFlight from "../OneWay/SingleOnewayFlight";
import SingleFlight from "../SingleFlight/SingleFlight";
import SingleRoundWayFlightsSilkton from "../RoundWay/SingleRoundWayFlightsSilkton";
import Slider from "@mui/material/Slider";
import { searchTravelportFlights } from "../../utils/travelportSearch";
import { groupFlightsBySchedule } from "../common/flightGrouping";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { resolveAirportInfo } from "../../utils/travelLookup";
import SearchContextDebugBadge from "../common/SearchContextDebugBadge";
import Swal from "sweetalert2";

const MultiCitySearchResult = () => {
  const MAX_MULTI_CITY_SEGMENTS = 4;
  const MAX_COMBINATIONS_PER_GROUP = 4;
  const navigate = useNavigate();
  const location = useLocation();
  const {
    searchData,
    segments,
    adultCount,
    childCount,
    infant,
    className,
    tripType,
    fromSearchText,
    toSearchText,
    fromSendData,
    toSendData,
    result,
    valueBox,
    changeState,
    departureDate,
    arrivalDate,
  } = location.state || {};
  const effectiveSegments = Array.isArray(segments)
    ? segments.slice(0, MAX_MULTI_CITY_SEGMENTS)
    : [];
  const safeAdultCount = Math.max(1, Number(adultCount || 1));
  const safeChildCount = Math.max(0, Number(childCount || 0));
  const safeInfantCount = Math.max(0, Number(infant || 0));
  const safeCabinClass = String(className || "Economy");
  const safeTravelerCount = safeAdultCount + safeChildCount + safeInfantCount;
  const [flights, setFlights] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [initialFetchData, setInitialFetchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const token = secureLocalStorage.getItem("access_token");
  const [sortedBy, setSortedBy] = useState(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  //Filter
  const [filterPageIndex, setFilterPageIndex] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState([]);
  const [selectedStops, setSelectedStops] = useState([]);
  const [selectedAirlins, setSelectedAirlins] = useState([]);
  const [selectedRefundable, setSelectedRefundable] = useState([]);
  // const [filteredFlights, setFilteredFlights] = useState([]);
  const [selectedLayover, setSelectedLayover] = useState([]);
  const [selectedDepartTime, setSelectedDepartTime] = useState({
    name: "",
    type: "",
    startTime: "",
    endTime: "",
  });
  const [selectedArrivalTime, setSelectedArrivalTime] = useState({
    name: "",
    type: "",
    startTime: "",
    endTime: "",
  });
  const [selectedBackDepartTime, setSelectedBackDepartTime] = useState({
    name: "",
    type: "",
    startTime: "",
    endTime: "",
  });
  const [selectedBackArrivalTime, setSelectedBackArrivalTime] = useState({
    name: "",
    type: "",
    startTime: "",
    endTime: "",
  });

  const [selectedBaggage, setSelectedBaggage] = useState([]);
  const [selectedConnectionDuration, setSelectedConnectionDuration] = useState(
    []
  );
  const itemsPerPage = 10;
  const [priceRange, setPriceRange] = useState([0, 100000]); // Adjust the initial range as needed
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const safeSegments = Array.isArray(segments)
        ? segments.slice(0, MAX_MULTI_CITY_SEGMENTS)
        : [];
      const formattedSegments = safeSegments.map((segment) => ({
        depfrom: segment?.DepFrom || segment?.depfrom,
        arrto: segment?.ArrTo || segment?.arrto,
        depdate: moment(segment?.Date || segment?.depdate).format("YYYY-MM-DD"),
      }));

      if (formattedSegments.length === 0) {
        setFlights([]);
        setFilteredFlights([]);
        setInitialFetchData([]);
        setLoading(false);
        return;
      }
      try {
        const data = await searchTravelportFlights(
          {
            adultcount: safeAdultCount,
            childcount: safeChildCount,
            infantcount: safeInfantCount,
            cabinclass: safeCabinClass,
            segments: formattedSegments,
          },
          token
        );
        const safeData = Array.isArray(data) ? data : [];
        setFlights(safeData);
        setFilteredFlights(safeData);
        setInitialFetchData(safeData);

        // Calculate min and max price safely even on empty results
        const prices = safeData
          .map((item) => Number(item?.NetFare))
          .filter((price) => Number.isFinite(price));
        const minFound = prices.length ? Math.min(...prices) : 0;
        const maxFound = prices.length ? Math.max(...prices) : 0;
        setMinPrice(minFound);
        setMaxPrice(maxFound);
        setPriceRange([minFound, maxFound]);
      } catch (error) {
        if (
          error?.requiresLogin ||
          error?.status === 401 ||
          error?.payload?.code === "ANON_SEARCH_LIMIT_REACHED_LOGIN_REQUIRED"
        ) {
          Swal.fire({
            icon: "warning",
            title: "Login Required",
            text:
              error?.message ||
              "You have reached the guest search limit. Please sign in to continue searching.",
            confirmButtonText: "Sign In",
            allowOutsideClick: false,
          }).then(() => {
            navigate("/signIn");
          });
          return;
        }
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: error?.message || "An unexpected error occurred.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    safeAdultCount,
    safeChildCount,
    safeInfantCount,
    fromSendData,
    toSendData,
    departureDate,
    arrivalDate,
    safeCabinClass,
    segments,
    MAX_MULTI_CITY_SEGMENTS,
    navigate,
  ]);

  // const handleAirlineClick = (career) => {
  //   setSelectedAirline(career);
  //   const filtered = flights.filter((flight) => flight.Carrier === career);
  //   setFilteredFlights(filtered);
  //   setCurrentPage(1);
  // };

  // Handle Airline filter
  const handleAirlineClick = (career) => {
    if (selectedAirline === career) {
      setSelectedAirline(null);
      setFilteredFlights(flights);
    } else {
      setSelectedAirline(career);
      const filtered = flights.filter((flight) => flight.Carrier === career);
      setFilteredFlights(filtered);
    }
    setCurrentPage(1); // Reset pagination
  };

  const groupedFlights = groupFlightsBySchedule(filteredFlights || []).map(
    (group) => {
      const options = Array.isArray(group?.options)
        ? group.options.slice(0, MAX_COMBINATIONS_PER_GROUP)
        : [];
      const normalizedOptions =
        options.length > 0 ? options : [group?.primary].filter(Boolean);

      return {
        ...group,
        options: normalizedOptions,
        primary: normalizedOptions[0] || group?.primary || null,
        count: normalizedOptions.length,
      };
    }
  );
  const totalPages = Math.ceil(groupedFlights?.length / itemsPerPage);

  const paginatedFlightGroups = groupedFlights?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const firstDepFrom =
    paginatedFlightGroups[0]?.primary?.AllLegsInfo?.[0]?.DepFrom || fromSendData;
  const lastArrTo =
    paginatedFlightGroups[0]?.primary?.AllLegsInfo?.[
      paginatedFlightGroups[0]?.primary?.AllLegsInfo?.length - 1
    ]?.ArrTo || toSendData;

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModifiyDrawerOpen, setIsModifiyDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    setIsDrawerOpen(open);
  };
  const toggleModifiyDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }

    setIsModifiyDrawerOpen(open);
  };

  //Filter
  const handleResetData = useCallback(() => {
    // setPageIndex(0);
    setFilterPageIndex(null);
    setSelectedProvider([]);
    setSelectedAirlins([]);
    setSelectedStops([]);
    setSelectedRefundable([]);
    setSelectedDepartTime({ name: "", type: "", startTime: "", endTime: "" });
    setSelectedArrivalTime({ name: "", type: "", startTime: "", endTime: "" });
    setSelectedBackDepartTime({
      name: "",
      type: "",
      startTime: "",
      endTime: "",
    });
    setSelectedBackArrivalTime({
      name: "",
      type: "",
      startTime: "",
      endTime: "",
    });
    setSelectedLayover([]);
    // Baggage Filter
    setSelectedBaggage([]);
    setSelectedConnectionDuration([]);
    setFilteredFlights(flights);
  }, [flights]);
  useEffect(() => {
    handleResetData();
  }, [flights]);
  // ----------------Functionality start ----------------
  // uniqueLayover
  const uniqueLayover = Array.from(
    new Map(
      (Array.isArray(flights) ? flights : [])
        .filter((item) => item?.AllLegsInfo?.[0]?.Segments?.length > 1)
        .map((item) => {
          const segments = item?.AllLegsInfo?.[0]?.Segments || [];
          const layoverSegment =
            segments.length > 2 ? segments[2] : segments[1];
          if (!layoverSegment) return null;

          const resolvedAirport = resolveAirportInfo(
            layoverSegment?.DepFrom,
            layoverSegment?.DepAirPort,
            layoverSegment?.DepLocation
          );

          return [
            resolvedAirport.code,
            {
              code: resolvedAirport.code,
              name: resolvedAirport.name,
              address: resolvedAirport.address,
            },
          ];
        })
        .filter(Boolean)
    ).values()
  );

  const handleSelection = (name, setSelected) => {
    setSelected((prevSelected) => {
      const isSelected = prevSelected.includes(name);
      return isSelected
        ? prevSelected.filter((item) => item !== name)
        : [...prevSelected, name];
    });

    setFilterPageIndex(name); // 2 or 3.. move page after filter setdata
  };

  const handleProvider = (name) => {
    handleSelection(name, setSelectedProvider);
  };
  const handleStops = (name) => {
    handleSelection(name, setSelectedStops);
  };
  const handleAirLine = (name) => {
    handleSelection(name, setSelectedAirlins);
  };
  const handleRefundable = (name) => {
    handleSelection(name, setSelectedRefundable);
  };
  // Date Filter
  const handleDepartTime = useCallback(
    (type, name, startTime, endTime) => {
      const startDate = new Date(`1970-01-01T${startTime}`);
      const endDate = new Date(`1970-01-01T${endTime}`);
      switch (type) {
        case "Depart":
          setSelectedDepartTime(
            name === selectedDepartTime.name
              ? { name: "", type: "", startTime: "", endTime: "" }
              : { name, type: type, startTime: startDate, endTime: endDate }
          );
          break;
        case "Arrival":
          setSelectedArrivalTime(
            name === selectedArrivalTime.name
              ? { name: "", type: "", startTime: "", endTime: "" }
              : { name, type: type, startTime: startDate, endTime: endDate }
          );
          break;
        // for roundway
        case "returnDepart":
          setSelectedBackDepartTime(
            name === selectedBackDepartTime.name
              ? { name: "", type: "", startTime: "", endTime: "" }
              : { name, type: type, startTime: startDate, endTime: endDate }
          );
          break;
        case "returnArrival":
          setSelectedBackArrivalTime(
            name === selectedBackArrivalTime.name
              ? { name: "", type: "", startTime: "", endTime: "" }
              : { name, type: type, startTime: startDate, endTime: endDate }
          );
          break;
        default:
          break;
      }
    },
    [
      selectedDepartTime,
      selectedArrivalTime,
      selectedBackDepartTime,
      selectedBackArrivalTime,
    ]
  );

  const handleLayover = (name) => {
    handleSelection(name, setSelectedLayover);
  };
  // Baggage Filter
  const handleBaggage = (name) => {
    handleSelection(name, setSelectedBaggage);
  };
  const handleConnectionDuration = (name) => {
    handleSelection(name, setSelectedConnectionDuration);
  };
  const handlePriceRangeChange = (event, newValue) => {
    setPriceRange(newValue);
    setCurrentPage(1); // Reset pagination
  };

  const extractSegments = (item, legIndex = 0) => {
    const leg = item?.AllLegsInfo?.[legIndex] || item?.AllLegsInfo?.[0];
    const segments = leg?.Segments || [];

    if (segments.length === 0) {
      return [];
    }

    return Array.isArray(segments[0]) ? segments[0] : segments;
  };

  const getMaxConnectionMinutes = (item, legIndex = 0) => {
    const segments = extractSegments(item, legIndex);

    if (segments.length < 2) {
      return null;
    }

    let maxMinutes = 0;

    for (let i = 1; i < segments.length; i += 1) {
      const previousArrival = new Date(segments[i - 1]?.ArrTime);
      const nextDeparture = new Date(segments[i]?.DepTime);

      if (
        Number.isNaN(previousArrival.getTime()) ||
        Number.isNaN(nextDeparture.getTime())
      ) {
        continue;
      }

      const connectionMinutes = Math.round(
        (nextDeparture.getTime() - previousArrival.getTime()) / 60000
      );

      if (connectionMinutes > maxMinutes) {
        maxMinutes = connectionMinutes;
      }
    }

    return maxMinutes > 0 ? maxMinutes : null;
  };

  const matchConnectionDuration = (item) => {
    if (selectedConnectionDuration.length === 0) {
      return true;
    }

    const allLegs = item?.AllLegsInfo || [];
    const connectionDurationsByLeg = allLegs
      .map((_, legIndex) => getMaxConnectionMinutes(item, legIndex))
      .filter((value) => typeof value === "number");

    if (connectionDurationsByLeg.length === 0) {
      return false;
    }

    const highestConnectionMinutes = Math.max(...connectionDurationsByLeg);

    return selectedConnectionDuration.some((type) => {
      if (type === "short") return highestConnectionMinutes < 120;
      if (type === "medium")
        return highestConnectionMinutes >= 120 &&
          highestConnectionMinutes <= 240;
      if (type === "long") return highestConnectionMinutes > 240;
      return false;
    });
  };

  const filter = () => {
    let updateData = flights; // Assuming 'data' is your original dataset
    // if (selectPrice.length > 0) {
    //   updateData = updateData.filter((item) =>
    //     selectPrice.includes(item.NetFare)
    //   );
    // }
    if (selectedProvider.length > 0) {
      updateData = updateData.filter((item) =>
        selectedProvider.includes(item.System)
      );
    }
    if (selectedStops.length > 0) {
      updateData = updateData.filter((item) =>
        selectedStops.includes(item.AllLegsInfo[0].Segments.length)
      );
    }
    if (selectedConnectionDuration.length > 0) {
      updateData = updateData.filter(matchConnectionDuration);
    }
    if (selectedAirlins.length > 0) {
      updateData = updateData.filter((item) =>
        selectedAirlins.includes(item.Carrier)
      );
    }
    if (selectedRefundable.length > 0) {
      updateData = updateData.filter((item) =>
        selectedRefundable.includes(item.Refundable)
      );
    }

    if (
      selectedDepartTime.type === "Depart" &&
      selectedDepartTime.name.length > 0
    ) {
      updateData = updateData.filter((item) => {
        const segments = item?.AllLegsInfo?.[0]?.Segments || [];
        const firstSegment = Array.isArray(segments?.[0])
          ? segments?.[0]?.[0]
          : segments?.[0];
        const depTime = firstSegment?.DepTime;
        if (!depTime) return false;

        const time = new Date(
          `1970-01-01T${String(depTime).slice(11, 19)}`
        );
        return (
          time >= selectedDepartTime.startTime &&
          time <= selectedDepartTime.endTime
        );
      });
    }

    if (selectedArrivalTime.type === "Arrival") {
      updateData = updateData.filter((item) => {
        const segments = item?.AllLegsInfo?.[0]?.Segments || [];
        const arrivalSegment = Array.isArray(segments?.[0])
          ? segments?.[0]?.[segments?.[0]?.length - 1]
          : segments?.[segments?.length - 1];
        const arrTime = arrivalSegment?.ArrTime;
        if (!arrTime) return false;

        const time = new Date(
          `1970-01-01T${String(arrTime).slice(11, 19)}`
        );
        return (
          time >= selectedArrivalTime.startTime &&
          time <= selectedArrivalTime.endTime
        );
      });
    }

    if (selectedBackDepartTime.type === "returnDepart") {
      updateData = updateData.filter((item) => {
        const backLeg = item?.AllLegsInfo?.[1] || item?.AllLegsInfo?.[0];
        const segments = backLeg?.Segments || [];
        const firstBackSegment = Array.isArray(segments?.[0])
          ? segments?.[0]?.[0]
          : segments?.[0];
        const depTime = firstBackSegment?.DepTime;
        if (!depTime) return false;

        const time = new Date(
          `1970-01-01T${String(depTime).slice(11, 19)}`
        );
        return (
          time >= selectedBackDepartTime.startTime &&
          time <= selectedBackDepartTime.endTime
        );
      });
    }

    if (selectedBackArrivalTime.type === "returnArrival") {
      updateData = updateData.filter((item) => {
        const backLeg = item?.AllLegsInfo?.[1] || item?.AllLegsInfo?.[0];
        const segments = backLeg?.Segments || [];
        const lastBackSegment = Array.isArray(segments?.[0])
          ? segments?.[0]?.[segments?.[0]?.length - 1]
          : segments?.[segments?.length - 1];
        const arrTime = lastBackSegment?.ArrTime;
        if (!arrTime) return false;

        const time = new Date(
          `1970-01-01T${String(arrTime).slice(11, 19)}`
        );
        return (
          time >= selectedBackArrivalTime.startTime &&
          time <= selectedBackArrivalTime.endTime
        );
      });
    }

    if (selectedLayover.length > 0) {
      updateData = updateData.filter((item) => {
        const segments = item.AllLegsInfo[0].Segments;
        const DepFrom =
          (segments.length === 2 && segments[1].DepFrom) ||
          (segments.length > 2 && segments[2].DepFrom);
        return selectedLayover.includes(DepFrom);
      });
    }
    // Baggage Filter
    if (selectedBaggage.length > 0) {
      const normalizedSelectedBaggage = selectedBaggage.map(
        normalizeAndMapBaggageName
      );

      updateData = updateData.filter((item) => {
        const allowances =
          item?.PriceBreakDown?.flatMap((price) =>
            price?.Bag?.map((bag) =>
              normalizeAndMapBaggageName(bag?.Allowance || "")
            )
          ) || [];
        return allowances.some((allowance) =>
          normalizedSelectedBaggage.includes(allowance)
        );
      });
    }
    // Price filter
    if (priceRange.length > 0) {
      updateData = updateData.filter(
        (item) =>
          item.GrossFare >= priceRange[0] && item.GrossFare <= priceRange[1]
      );
    }

    setFilteredFlights(updateData);
  };
  // Filter
  const debouncedFilter = debounce(filter, 300);
  useEffect(() => {
    debouncedFilter();
    return () => {
      debouncedFilter.cancel();
    };
  }, [
    selectedProvider,
    selectedRefundable,
    selectedAirlins,
    selectedLayover,
    selectedStops,
    selectedDepartTime,
    selectedArrivalTime,
    selectedBackDepartTime,
    selectedBackArrivalTime,
    //Baggage Filter
    selectedBaggage,
    selectedConnectionDuration,
    flights,
    priceRange,
  ]);
  const uniqueCarriers = Array.from(
    new Set(flights.filter((item) => item.Carrier).map((item) => item.Carrier))
  );
  const flightresults = uniqueCarriers.map((carrier) => {
    const filteredData = flights.filter((item) => item.Carrier === carrier);
    const minPrice = Math.min(
      ...filteredData.map((item) => parseInt(item.NetFare))
    );
    const carrierName = filteredData[0].CarrierName;
    const currencyCode = getFlightCurrencyCode(filteredData?.[0] || {});
    const currencySymbol = getCurrencySymbol(currencyCode);
    // change this property after add
    return {
      code: carrier,
      name: carrierName,
      price: minPrice.toString(),
      currencyCode,
      currencySymbol,
    };
  });
  //Baggage Filter

  const baggageMapping = {
    "1p": "23kg",
    "2p": "46kg",
    "1n": "23kg",
    "2n": "46kg",
    "20k": "20kg",
    "25k": "25kg",
    "30k": "30kg",
    "40k": "40kg",
    "45k": "45kg",
    "35k": "35kg",
    "baggagechargesdatanotavailable": "0",
  };

  const normalizeAndMapBaggageName = (name) => {
    const normalized = name?.toLowerCase().replace(/\s+/g, "") || "";
    if (normalized.includes("baggagechargesdatanotavailable")) {
      return "0";
    }
    return baggageMapping[normalized] || normalized; // Map using baggageMapping, fallback to normalized
  };
  const uniqueBaggage = Array.from(
    new Set(
      flights.flatMap(
        (flight) =>
          flight?.PriceBreakDown?.flatMap((price) =>
            price?.Bag?.map((bag) =>
              normalizeAndMapBaggageName(bag?.Allowance || "")
            )
          ) || []
      )
    )
  ).filter((name) => name); // Remove empty names

  // Log for debugging
  const baggageResults = uniqueBaggage.map((baggage) => ({
    name: baggage, // Already normalized and mapped
  }));

  // const uniqueBaggage = Array.from(
  //   new Set(
  //     flights
  //       .filter((item) => item.PriceBreakDown)
  //       .map((item) => item.Bag)
  //       .map((item) => item.Allowance)
  //   )
  // );
  // const baggageresults = uniqueBaggage.map((baggage) => {
  //   const filteredData = flights.PriceBreakDown.filter((item) => item.Bag).map(
  //     (item) => item.Allowance === baggage
  //   );

  //   const allowance = filteredData[0].Allowance;
  //   // change this property after add
  //   return {
  //     code: baggage,
  //     name: allowance,
  //   };
  // });
  const [showBanner, setShowBanner] = useState(false);
  const toggleBanner = () => {
    setShowBanner(!showBanner);
  };
  const showDebugBadge = String(location?.pathname || "") === "/offers";
  const debugSegmentCount =
    (Array.isArray(effectiveSegments) ? effectiveSegments.length : 0) ||
    (Array.isArray(searchData?.segments) ? searchData.segments.length : 0) ||
    1;
  console.log("flightdataa", paginatedFlightGroups);
  return (
    <Box className="relative bg-transparent" sx={{ bgcolor: "transparent", height: "100%" }}>
      <SearchContextDebugBadge
        visible={showDebugBadge}
        tripType={valueBox || tripType || "multicity"}
        adultCount={safeAdultCount}
        childCount={safeChildCount}
        infantCount={safeInfantCount}
        segmentCount={debugSegmentCount}
      />
      {showBanner ? (
        ""
      ) : (
        <Box
          sx={{ display: { xs: "block", sm: "none", md: "none", lg: "none" } }}
        >
          <NavBar />
        </Box>
      )}
      {/* <Box
        sx={{ display: { xs: "block", sm: "block", md: "none", lg: "none" } }}
      >
        <NavBar />
      </Box> */}
      {/* Show AfterSearchBanner only on xs when the button is clicked */}
      {showBanner && (
        <Box
          sx={{
            display: { xs: "block", md: "none" },
          }}
        >
          <AfterSearchBanner
            fromSearch={fromSearchText}
            toSearch={toSearchText}
            // faddressText={faddress}
            // toAddressText={toAddress}
            depDate={departureDate}
            arrDate={arrivalDate}
            fromSend={fromSendData}
            toSend={toSendData}
            adult={safeAdultCount}
            child={safeChildCount}
            infantCount={safeInfantCount}
            classNa={safeCabinClass}
            paxResult={safeTravelerCount}
            // value={value}
            valueBoxs={valueBox}
            segments={effectiveSegments}
            searchDatas={searchData}
            toggleBanner={toggleBanner}
          />
        </Box>
      )}
      <Box
        sx={{ display: { xs: "none", sm: "none", md: "block", lg: "block" } }}
      >
        {/* <AfterSearchBanner
          searchDatas={searchData}
          segments={segments}
          fromSearch={fromSearchText}
          toSearch={toSearchText}
          fromSend={fromSendData}
          toSend={toSendData}
          adult={adultCount}
          child={childCount}
          infantCount={infant}
          classNa={className}
          paxResult={result}
          valueBoxs={valueBox}
        /> */}

        <AfterSearchBanner
          fromSearch={fromSearchText}
          toSearch={toSearchText}
          // faddressText={faddress}
          // toAddressText={toAddress}
          depDate={departureDate}
          arrDate={arrivalDate}
          fromSend={fromSendData}
          toSend={toSendData}
          adult={safeAdultCount}
          child={safeChildCount}
          infantCount={safeInfantCount}
          classNa={safeCabinClass}
          paxResult={safeTravelerCount}
          // value={value}
          valueBoxs={valueBox}
          segments={effectiveSegments}
          searchDatas={searchData}
        />
      </Box>

      <Container className="pb-8 pt-3">
        <Grid
          container
          sx={{
            mt: {
              xs: "0px",
              sm: "0px",
              md: 2,
            },
          }}
          spacing={2}
        >
          <Grid
            item
            xs={12}
            sm={12}
            md={12}
            lg={12}
            sx={{
              display: {
                xs: "block",
                sm: "block",
                md: "none",
                lg: "none",
              },
            }}
          >
            <Box
              sx={{
                background: "#FFFFFF",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
                borderRadius: "5px",
                px: "10px",
                height: "50px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                  }}
                >
                  {firstDepFrom}-{lastArrTo}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Box>
                  <Button
                    onClick={toggleBanner} // Toggle banner visibility
                    sx={{
                      bgcolor: "var(--primary-button)",
                      color: "white",
                      fontSize: "12px",
                      // width: "10px",
                      px: "10px",
                      ":hover": {
                        bgcolor: "var(--primary-button)",
                        color: "white",
                      },
                    }}
                  >
                    Modify Search
                  </Button>
                </Box>
                <Box>
                  <Box sx={{ cursor: "pointer" }} onClick={toggleDrawer(true)}>
                    <FilterAltIcon
                      sx={{ color: "var(--primary-button)", fontSize: "35px" }}
                    />
                  </Box>
                  {/* <Drawer
                    anchor="right"
                    open={isModifiyDrawerOpen}
                    onClose={toggleModifiyDrawer(false)}
                  >
                    <Box
                      sx={{ width: 250, padding: 2 }}
                      role="presentation"
                      onClick={toggleModifiyDrawer(false)}
                      onKeyDown={toggleModifiyDrawer(false)}
                    >
                      <FlightSearchBox />
                    </Box>
                  </Drawer> */}
                  <Drawer
                    anchor="right"
                    open={isDrawerOpen}
                    onClose={toggleDrawer(false)}
                  >
                    <Box
                      sx={{ width: 250, padding: 2 }}
                      role="presentation"
                      onClick={toggleDrawer(false)}
                      onKeyDown={toggleDrawer(false)}
                    >
                      {/* <RoundwayFilters
                        initialFetchData={initialFetchData}
                        setInitialFetchData={setInitialFetchData}
                        sortedBy={sortedBy}
                        setSortedBy={setSortedBy}
                        setfilteredData={setFilteredFlights}
                        filteredData={filteredFlights}
                        setCurrentPage={setCurrentPage}
                      /> */}
                      <Filter
                        flightData={flights}
                        tripType={tripType}
                        selectedProvider={selectedProvider}
                        handleProvider={handleProvider}
                        handleRefundable={handleRefundable}
                        handleAirLine={handleAirLine}
                        selectedAirlins={selectedAirlins}
                        handleStops={handleStops}
                        selectedStops={selectedStops}
                        selectedRefundable={selectedRefundable}
                        selectedLayover={selectedLayover}
                        handleDepartTime={handleDepartTime}
                        selectedDepartTime={selectedDepartTime}
                        selectedArrivalTime={selectedArrivalTime}
                        selectedBackDepartTime={selectedBackDepartTime}
                        selectedBackArrivalTime={selectedBackArrivalTime}
                        handleLayover={handleLayover}
                        uniqueLayover={uniqueLayover}
                        handleResetData={handleResetData}
                        uniqueCarriers={flightresults}
                        initialFetchData={initialFetchData}
                        setInitialFetchData={setInitialFetchData}
                        setfilteredData={setFilteredFlights}
                        filteredData={filteredFlights}
                        //Baggage Filter
                        uniqueBaggages={baggageResults}
                        handleBaggage={handleBaggage}
                        selectedBaggage={selectedBaggage}
                        selectedConnectionDuration={
                          selectedConnectionDuration
                        }
                        handleConnectionDuration={handleConnectionDuration}
                        priceRange={priceRange}
                        handlePriceRangeChange={handlePriceRangeChange}
                        minPrice={minPrice}
                        maxPrice={maxPrice}
                      />
                    </Box>
                  </Drawer>
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid
            item
            xs={12}
            sm={12}
            md={2.4}
            lg={2.5}
            sx={{
              display: {
                xs: "none",
                sm: "none",
                md: "block",
                lg: "block",
              },
            }}
          >
            <Box
              sx={{
                bgcolor: "white",
                boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
                maxHeight: "100%",
                borderRadius: "10px",
              }}
            >
              {loading ? (
                <RoundwaySelecton />
              ) : (
                // <RoundwayFilters
                //   initialFetchData={initialFetchData}
                //   setInitialFetchData={setInitialFetchData}
                //   sortedBy={sortedBy}
                //   setSortedBy={setSortedBy}
                //   setfilteredData={setFilteredFlights}
                //   filteredData={filteredFlights}
                //   setCurrentPage={setCurrentPage}
                // />

                <Filter
                  flightData={flights}
                  tripType={tripType}
                  selectedProvider={selectedProvider}
                  handleProvider={handleProvider}
                  handleRefundable={handleRefundable}
                  handleAirLine={handleAirLine}
                  selectedAirlins={selectedAirlins}
                  handleStops={handleStops}
                  selectedStops={selectedStops}
                  selectedRefundable={selectedRefundable}
                  selectedLayover={selectedLayover}
                  handleDepartTime={handleDepartTime}
                  selectedDepartTime={selectedDepartTime}
                  selectedArrivalTime={selectedArrivalTime}
                  selectedBackDepartTime={selectedBackDepartTime}
                  selectedBackArrivalTime={selectedBackArrivalTime}
                  handleLayover={handleLayover}
                  uniqueLayover={uniqueLayover}
                  handleResetData={handleResetData}
                  uniqueCarriers={flightresults}
                  initialFetchData={initialFetchData}
                  setInitialFetchData={setInitialFetchData}
                  setfilteredData={setFilteredFlights}
                  filteredData={filteredFlights}
                  //Baggage Filter
                  uniqueBaggages={baggageResults}
                  handleBaggage={handleBaggage}
                  selectedBaggage={selectedBaggage}
                  selectedConnectionDuration={selectedConnectionDuration}
                  handleConnectionDuration={handleConnectionDuration}
                  priceRange={priceRange}
                  handlePriceRangeChange={handlePriceRangeChange}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                />
              )}
            </Box>
          </Grid>
          <Grid item xs={12} sm={12} md={9.6} lg={9.5}>
            <Grid container spacing={2}>
              {loading ? (
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <AirlinesSliderSlikton
                    flights={flights}
                    onAirlineClick={handleAirlineClick}
                  />
                </Grid>
              ) : (
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <AirlinesSlider
                    uniqueCarriers={flightresults}
                    selectedAirlins={selectedAirlins}
                    handleAirLine={handleAirLine}
                  />
                </Grid>
              )}
              {loading ? (
                [...Array(8)].map((_, index) => (
                  <Grid item xs={12} sm={12} md={12} lg={12} key={index}>
                    <SingleRoundWayFlightsSilkton />
                  </Grid>
                ))
              ) : paginatedFlightGroups.length > 0 ? (
                paginatedFlightGroups.map((group, index) => {
                  const groupRenderKey =
                    String(group?.key || group?.primary?.ResultId || "") ||
                    `group-${index}`;
                  return (
                    <Grid item xs={12} sm={12} md={12} lg={12} key={groupRenderKey}>
                      <SingleFlight
                        data={group?.primary || {}}
                        groupedFlights={group?.options || []}
                      />
                      {/* <SingleMulticityFlight data={data} /> */}
                    </Grid>
                  );
                })
              ) : (
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100vh",
                    }}
                  >
                    <p style={{ color: "red" }}>No flights available</p>
                  </Box>
                </Grid>
              )}
            </Grid>
            <Grid
              // item
              // lg={12}
              my={2}
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                variant="outlined"
                color="secondary"
              />
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default MultiCitySearchResult;
