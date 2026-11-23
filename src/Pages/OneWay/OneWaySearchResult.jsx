import {
  Box,
  Button,
  Container,
  Grid,
  Pagination,
  Typography,
  Drawer,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AfterSearchBanner from "../AfterSearch/AfterSearchBanner";
import AirlinesSlider from "../AirlinesSlider/AirlinesSlider";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import Filter from "../Filter/Filter";
import { debounce } from "lodash";
import SingleFlight from "../SingleFlight/SingleFlight";
import Swal from "sweetalert2";
import FlightLoading from "./FlightLoading";
import { searchTravelportFlights } from "../../utils/travelportSearch";
import { groupFlightsBySchedule } from "../common/flightGrouping";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { resolveAirportInfo } from "../../utils/travelLookup";
import { readRecentSearches } from "../../utils/recentSearches";
import {
  buildTravelportSearchRequestModifiers,
  createDefaultTravelportSearchFilters,
  normalizeTravelportSearchFilters,
} from "../../utils/travelportSearchCriteria";
import SearchContextDebugBadge from "../common/SearchContextDebugBadge";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
// import { FakeDataOneway } from "./FakeDataOneway";

const toUpperText = (value) => String(value ?? "").trim().toUpperCase();
const toText = (value) => String(value ?? "").trim();

const toIsoDate = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  const parsed = moment(
    raw,
    ["YYYY-MM-DD", "DD MMM YY", "DD MMM YYYY", moment.ISO_8601],
    true
  );
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }
  const fallbackParsed = moment(raw);
  return fallbackParsed.isValid() ? fallbackParsed.format("YYYY-MM-DD") : "";
};

const normalizeSearchSegment = (segment) => {
  const depfrom = toUpperText(segment?.depfrom ?? segment?.DepFrom);
  const arrto = toUpperText(segment?.arrto ?? segment?.ArrTo);
  const depdate = toIsoDate(segment?.depdate ?? segment?.Date);
  const depFromText = toText(segment?.depFromText);
  const arrToText = toText(segment?.arrToText);

  if (!depfrom || !arrto || !depdate) {
    return null;
  }

  return {
    depfrom,
    arrto,
    depdate,
    depFromText,
    arrToText,
  };
};

const OneWaySearchResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    faddress,
    toAddress,
    fromSearchText,
    toSearchText,
    departureDate,
    arrivalDate,
    adultCount,
    childCount,
    infant,
    tripType,
    fromSendData,
    toSendData,
    className,
    result,
    valueBox,
    value,
    changeState,
    searchData,
    segments,
    searchFilters,
  } = location?.state || {};

  const resolvedSearchContext = useMemo(() => {
    const normalizedStateSegments = (
      Array.isArray(segments) && segments.length > 0
        ? segments
        : Array.isArray(searchData?.segments)
          ? searchData.segments
          : []
    )
      .map((segment) => normalizeSearchSegment(segment))
      .filter(Boolean);

    let resolvedSegment = normalizedStateSegments[0] || null;
    let recoveredFromRecent = null;

    if (!resolvedSegment) {
      const depfrom = toUpperText(fromSendData);
      const arrto = toUpperText(toSendData);
      const depdate = toIsoDate(departureDate);
      if (depfrom && arrto && depdate) {
        resolvedSegment = {
          depfrom,
          arrto,
          depdate,
          depFromText: toText(fromSearchText),
          arrToText: toText(toSearchText),
        };
      }
    }

    if (!resolvedSegment) {
      const latestOneWaySearch = readRecentSearches().find((item) => {
        const tripTypeValue = toText(item?.tripType).toLowerCase();
        return (
          tripTypeValue === "oneway" &&
          Array.isArray(item?.segments) &&
          item.segments.length >= 1
        );
      });

      if (latestOneWaySearch) {
        recoveredFromRecent = latestOneWaySearch;
        resolvedSegment =
          latestOneWaySearch.segments
            .map((segment) => normalizeSearchSegment(segment))
            .filter(Boolean)[0] || null;
      }
    }

    const safeAdultCount = Math.max(
      1,
      Number(adultCount || recoveredFromRecent?.adultCount || 1)
    );
    const safeChildCount = Math.max(
      0,
      Number(childCount || recoveredFromRecent?.childCount || 0)
    );
    const safeInfantCount = Math.max(
      0,
      Number(infant || recoveredFromRecent?.infantCount || 0)
    );
    const safeCabinClass = toText(
      className || recoveredFromRecent?.cabinClass || "Economy"
    );

    const displayFromCode = toUpperText(
      fromSendData || resolvedSegment?.depfrom || recoveredFromRecent?.fromCode
    );
    const displayToCode = toUpperText(
      toSendData || resolvedSegment?.arrto || recoveredFromRecent?.toCode
    );
    const displayFromSearch = toText(
      fromSearchText ||
      recoveredFromRecent?.fromLabel ||
      resolvedSegment?.depFromText ||
      displayFromCode
    );
    const displayToSearch = toText(
      toSearchText ||
      recoveredFromRecent?.toLabel ||
      resolvedSegment?.arrToText ||
      displayToCode
    );
    const displayDepartureDate =
      toText(departureDate) ||
      (resolvedSegment?.depdate
        ? moment(resolvedSegment.depdate).format("DD MMM YY")
        : "");

    const effectiveSearchFilters = normalizeTravelportSearchFilters(
      searchFilters ||
      recoveredFromRecent?.searchFilters ||
      createDefaultTravelportSearchFilters()
    );

    return {
      valid: Boolean(resolvedSegment),
      searchFilters: effectiveSearchFilters,
      payload: resolvedSegment
        ? {
          adultcount: safeAdultCount,
          childcount: safeChildCount,
          infantcount: safeInfantCount,
          cabinclass: safeCabinClass,
          segments: [resolvedSegment],
          ...buildTravelportSearchRequestModifiers(effectiveSearchFilters),
        }
        : null,
      display: {
        fromCode: displayFromCode,
        toCode: displayToCode,
        fromSearch: displayFromSearch,
        toSearch: displayToSearch,
        departureDate: displayDepartureDate,
        arrivalDate: toText(arrivalDate),
        fromAddress: toText(faddress || recoveredFromRecent?.fromAddress),
        toAddress: toText(toAddress || recoveredFromRecent?.toAddress),
        adultCount: safeAdultCount,
        childCount: safeChildCount,
        infantCount: safeInfantCount,
        cabinClass: safeCabinClass,
        valueBox: valueBox || recoveredFromRecent?.tripType || "oneway",
        result: safeAdultCount + safeChildCount + safeInfantCount,
      },
    };
  }, [
    adultCount,
    arrivalDate,
    childCount,
    className,
    departureDate,
    faddress,
    fromSearchText,
    fromSendData,
    infant,
    searchData?.segments,
    searchFilters,
    segments,
    toAddress,
    toSearchText,
    toSendData,
    valueBox,
  ]);

  const displayContext = resolvedSearchContext.display;
  const [flights, setFlights] = useState([]);
  const [initialFetchData, setInitialFetchData] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = secureLocalStorage.getItem("access_token");
  const [sortedBy, setSortedBy] = useState("cheapest");

  // State for pagination

  const [currentPage, setCurrentPage] = useState(1);
  //Filter
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
  const itemsPerPage = 15;

  // Price filter
  const [priceRange, setPriceRange] = useState([0, 100000]); // Adjust the initial range as needed
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!resolvedSearchContext.valid || !resolvedSearchContext.payload) {
          setFlights([]);
          setFilteredFlights([]);
          setInitialFetchData([]);
          setMinPrice(0);
          setMaxPrice(100000);
          setPriceRange([0, 100000]);
          return;
        }

        const data = await searchTravelportFlights(
          resolvedSearchContext.payload,
          token
        );
        if (data?.message === "Sign up to get more search") {
          throw new Error(data.message); // Handle "Sign up" message
        }
        const normalizedData = Array.isArray(data) ? data : [];
        setFlights(normalizedData);
        setFilteredFlights(normalizedData);
        setInitialFetchData(normalizedData);

        // Calculate min and max price
        const prices = normalizedData
          .map((item) => Number(item?.NetFare))
          .filter((price) => Number.isFinite(price));
        if (prices.length > 0) {
          const nextMin = Math.min(...prices);
          const nextMax = Math.max(...prices);
          setMinPrice(nextMin);
          setMaxPrice(nextMax);
          setPriceRange([nextMin, nextMax]);
        } else {
          setMinPrice(0);
          setMaxPrice(100000);
          setPriceRange([0, 100000]);
        }
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
          text: error.message || "An unexpected error occurred.",
        }).then(() => {
          navigate("/"); // Redirect to the home page
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    resolvedSearchContext,
    token,
    navigate,
  ]);

  // const handleAirlineClick = (career) => {
  //   setSelectedAirline(career);
  //   const filtered = flights.filter((flight) => flight.Carrier === career);
  //   setFilteredFlights(filtered);
  //   setCurrentPage(1);
  // };

  const groupedFlights = groupFlightsBySchedule(filteredFlights || []);

  const getPrimaryDepartureTimeValue = (flight) => {
    const depTime =
      flight?.AllLegsInfo?.[0]?.Segments?.[0]?.DepTime ||
      flight?.AllLegsInfo?.[0]?.DepDate ||
      "";
    const parsed = new Date(depTime).getTime();
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  };

  const sortedFlightGroups = [...groupedFlights].sort((a, b) => {
    const first = a?.primary || {};
    const second = b?.primary || {};

    if (sortedBy === "cheapest") {
      return Number(first?.NetFare || 0) - Number(second?.NetFare || 0);
    }
    if (sortedBy === "fastest") {
      return (
        Number(first?.AllLegsInfo?.[0]?.Duration || 0) -
        Number(second?.AllLegsInfo?.[0]?.Duration || 0)
      );
    }
    if (sortedBy === "earliest") {
      return (
        getPrimaryDepartureTimeValue(first) - getPrimaryDepartureTimeValue(second)
      );
    }
    return Number(first?.NetFare || 0) - Number(second?.NetFare || 0);
  });

  const totalPages = Math.ceil(sortedFlightGroups?.length / itemsPerPage);

  const paginatedFlightGroups = sortedFlightGroups?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedBy]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleDrawer = (open) => (event) => {
    setIsDrawerOpen(open);
  };

  //Filter
  const handleResetData = useCallback(() => {
    // setPageIndex(0);
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
    setCurrentPage(1); // Reset pagination
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

    setCurrentPage(1); // 2 or 3.. move page after filter setdata
  };

  const handleProvider = (name) => {
    handleSelection(name, setSelectedProvider);
  };
  const handleStops = (name) => {
    handleSelection(name, setSelectedStops);
  };
  const handleAirLine = (name, career) => {
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
  // Price filter

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

    const maxConnectionMinutes = getMaxConnectionMinutes(item, 0);
    if (maxConnectionMinutes === null) {
      return false;
    }

    return selectedConnectionDuration.some((type) => {
      if (type === "short") return maxConnectionMinutes < 120;
      if (type === "medium")
        return maxConnectionMinutes >= 120 && maxConnectionMinutes <= 240;
      if (type === "long") return maxConnectionMinutes > 240;
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
        const time = new Date(
          `1970-01-01T${item.AllLegsInfo[0].Segments[
            item.AllLegsInfo[0].Segments.length - 1
          ][
            item.AllLegsInfo[0].Segments[
              item.AllLegsInfo[0].Segments.length - 1
            ].length - 1
          ].DepTime.slice(11, 19)}`
        );
        return (
          time >= selectedBackDepartTime.startTime &&
          time <= selectedBackDepartTime.endTime
        );
      });
    }

    if (selectedBackArrivalTime.type === "returnArrival") {
      updateData = updateData.filter((item) => {
        const time = new Date(
          `1970-01-01T${item.AllLegsInfo[0].Segments[
            item.AllLegsInfo[0].Segments.length - 1
          ][
            item.AllLegsInfo[0].Segments[
              item.AllLegsInfo[0].Segments.length - 1
            ].length - 1
          ].ArrTime.slice(11, 19)}`
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
    currentPage,
    // Price filter
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

  const isPriceFiltered =
    Array.isArray(priceRange) &&
    priceRange.length === 2 &&
    (Number(priceRange[0]) !== Number(minPrice) ||
      Number(priceRange[1]) !== Number(maxPrice));

  const activeFiltersCount =
    selectedProvider.length +
    selectedStops.length +
    selectedAirlins.length +
    selectedRefundable.length +
    selectedLayover.length +
    selectedBaggage.length +
    selectedConnectionDuration.length +
    (selectedDepartTime?.name ? 1 : 0) +
    (selectedArrivalTime?.name ? 1 : 0) +
    (isPriceFiltered ? 1 : 0);

  const departureDateText = displayContext?.departureDate
    ? moment(displayContext.departureDate).format("DD MMM YYYY")
    : "Flexible date";

  const sortOptions = [
    { id: "cheapest", label: "Cheapest" },
    { id: "fastest", label: "Fastest" },
    { id: "earliest", label: "Earliest" },
  ];

  const filterProps = {
    flightData: flights,
    tripType: tripType,
    selectedProvider,
    handleProvider,
    handleRefundable,
    handleAirLine,
    selectedAirlins,
    handleStops,
    selectedStops,
    selectedRefundable,
    selectedLayover,
    handleDepartTime,
    selectedDepartTime,
    selectedArrivalTime,
    selectedBackDepartTime,
    selectedBackArrivalTime,
    handleLayover,
    uniqueLayover,
    handleResetData,
    uniqueCarriers: flightresults,
    initialFetchData,
    setInitialFetchData,
    setfilteredData: setFilteredFlights,
    filteredData: filteredFlights,
    uniqueBaggages: baggageResults,
    handleBaggage,
    selectedBaggage,
    selectedConnectionDuration,
    handleConnectionDuration,
    priceRange,
    handlePriceRangeChange,
    minPrice,
    maxPrice,
  };

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
    resolvedSearchContext?.payload?.segments?.length ||
    (Array.isArray(segments) ? segments.length : 0) ||
    1;
  const bannerSegments = Array.isArray(resolvedSearchContext?.payload?.segments)
    ? resolvedSearchContext.payload.segments
    : Array.isArray(segments)
      ? segments
      : [];
  const bannerSearchData =
    searchData && typeof searchData === "object"
      ? {
        ...searchData,
        segments: bannerSegments,
      }
      : {
        segments: bannerSegments,
      };

  return (
    <Box
      className="relative bg-transparent"
      sx={{
        bgcolor: "transparent",
        height: "100%",
        boxSizing: "border-box !important",
      }}
    >
      <SearchContextDebugBadge
        visible={showDebugBadge}
        tripType={displayContext?.valueBox || "oneway"}
        adultCount={displayContext?.adultCount}
        childCount={displayContext?.childCount}
        infantCount={displayContext?.infantCount}
        segmentCount={debugSegmentCount}
      />
      {!showBanner && (
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          <NavBar />
        </Box>
      )}

      {showBanner && (
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          <AfterSearchBanner
            fromSearch={displayContext.fromSearch}
            toSearch={displayContext.toSearch}
            faddressText={displayContext.fromAddress}
            toAddressText={displayContext.toAddress}
            depDate={displayContext.departureDate}
            arrDate={displayContext.arrivalDate}
            fromSend={displayContext.fromCode}
            toSend={displayContext.toCode}
            adult={displayContext.adultCount}
            child={displayContext.childCount}
            infantCount={displayContext.infantCount}
            classNa={displayContext.cabinClass}
            paxResult={displayContext.result}
            value={value}
            valueBoxs={displayContext.valueBox}
            segments={bannerSegments}
            searchDatas={bannerSearchData}
            searchFilters={resolvedSearchContext.searchFilters}
            toggleBanner={toggleBanner}
          />
        </Box>
      )}

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <AfterSearchBanner
          fromSearch={displayContext.fromSearch}
          toSearch={displayContext.toSearch}
          faddressText={displayContext.fromAddress}
          toAddressText={displayContext.toAddress}
          depDate={displayContext.departureDate}
          arrDate={displayContext.arrivalDate}
          fromSend={displayContext.fromCode}
          toSend={displayContext.toCode}
          adult={displayContext.adultCount}
          child={displayContext.childCount}
          infantCount={displayContext.infantCount}
          classNa={displayContext.cabinClass}
          paxResult={displayContext.result}
          value={value}
          valueBoxs={displayContext.valueBox}
          segments={bannerSegments}
          searchDatas={bannerSearchData}
          searchFilters={resolvedSearchContext.searchFilters}
        />
      </Box>

      <Container sx={{ pb: { xs: 6, md: 8 }, pt: { xs: 1.4, md: 2.2 } }}>
        <Box sx={{ display: { xs: "block", md: "none" }, mb: 1.2 }}>
          <Box
            sx={{
              borderRadius: "14px",
              border: "1px solid rgba(0,154,214,0.2)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,249,255,0.96) 100%)",
              boxShadow: "0 12px 26px rgba(10,42,70,0.11)",
              p: 1.1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: "var(--depature-color)",
                  fontWeight: 800,
                  fontSize: "17px",
                  lineHeight: 1.1,
                }}
              >
                {displayContext.fromCode || "FROM"} - {displayContext.toCode || "TO"}
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  color: "#637B93",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {departureDateText}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <Button
                onClick={toggleBanner}
                sx={{
                  bgcolor: "var(--primary-button)",
                  color: "white",
                  fontSize: "11px",
                  px: 1.1,
                  py: 0.55,
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 700,
                  ":hover": {
                    bgcolor: "var(--primary-button)",
                    color: "white",
                  },
                }}
              >
                Modify
              </Button>
              <Button
                onClick={toggleDrawer(true)}
                startIcon={<FilterAltIcon sx={{ fontSize: "19px" }} />}
                sx={{
                  borderRadius: "8px",
                  border: "1px solid rgba(0,154,214,0.24)",
                  color: "var(--primary-button)",
                  backgroundColor: "#fff",
                  textTransform: "none",
                  fontSize: "11px",
                  fontWeight: 700,
                  px: 1,
                  py: 0.55,
                  "&:hover": {
                    borderColor: "var(--primary-button)",
                    backgroundColor: "rgba(0,154,214,0.08)",
                  },
                }}
              >
                Filters
              </Button>
              <Drawer anchor="right" open={isDrawerOpen} onClose={toggleDrawer(false)}>
                <Box
                  sx={{
                    width: { xs: "92vw", sm: 360 },
                    maxWidth: "100vw",
                    p: 1.2,
                    bgcolor: "#F4F8FD",
                    minHeight: "100%",
                  }}
                >
                  <Filter {...filterProps} />
                </Box>
              </Drawer>
            </Box>
          </Box>
        </Box>

        <Box sx={{ minHeight: "76vh" }}>
          {loading ? (
            <FlightLoading />
          ) : flights?.length > 0 ? (
            <Grid container spacing={2}>
              <Grid
                item
                xs={12}
                md={3}
                sx={{ display: { xs: "none", md: "block" } }}
              >
                <Box
                  sx={{
                    position: "sticky",
                    top: "16px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 12px 24px rgba(15,35,60,0.1)",
                    border: "1px solid #E6EDF7",
                    bgcolor: "#fff",
                  }}
                >
                  <Filter {...filterProps} />
                </Box>
              </Grid>

              <Grid item xs={12} md={9}>
                <Box
                  sx={{
                    mb: 1.2,
                    borderRadius: "14px",
                    border: "1px solid rgba(0,154,214,0.2)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,250,255,0.95) 100%)",
                    boxShadow: "0 12px 24px rgba(10,42,70,0.09)",
                    px: { xs: 1.1, md: 1.4 },
                    py: 1.1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", md: "center" },
                    flexDirection: { xs: "column", md: "row" },
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        color: "var(--depature-color)",
                        fontWeight: 800,
                        fontSize: { xs: "18px", md: "21px" },
                        lineHeight: 1.15,
                      }}
                    >
                      <TravelExploreRoundedIcon sx={{ color: "var(--primary-color)" }} />
                      {displayContext.fromCode || "FROM"} to {displayContext.toCode || "TO"}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.35,
                        color: "#60788F",
                        fontSize: { xs: "12px", md: "13px" },
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <CalendarMonthRoundedIcon sx={{ fontSize: "16px" }} />
                      {departureDateText}
                      {" • "}
                      {displayContext.result || 1}{" "}
                      traveler(s)
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 0.8,
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: "999px",
                        bgcolor: "rgba(0,154,214,0.12)",
                        color: "var(--primary-color)",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      {groupedFlights.length} itineraries
                    </Box>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: "999px",
                        bgcolor: "rgba(15,35,60,0.08)",
                        color: "#1E344A",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      {activeFiltersCount} active filter
                      {activeFiltersCount === 1 ? "" : "s"}
                    </Box>
                    <Button
                      onClick={handleResetData}
                      size="small"
                      sx={{
                        textTransform: "none",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--primary-color)",
                        border: "1px solid rgba(0,154,214,0.24)",
                        px: 1.3,
                        py: 0.4,
                        "&:hover": {
                          borderColor: "var(--primary-color)",
                          backgroundColor: "rgba(0,154,214,0.08)",
                        },
                      }}
                    >
                      Clear Filters
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ mb: 1.2 }}>
                  <AirlinesSlider
                    uniqueCarriers={flightresults}
                    selectedAirlins={selectedAirlins}
                    handleAirLine={handleAirLine}
                  />
                </Box>

                <Box
                  sx={{
                    mb: 1.2,
                    borderRadius: "12px",
                    border: "1px solid #E2EAF5",
                    backgroundColor: "#fff",
                    boxShadow: "0 8px 18px rgba(12,40,70,0.06)",
                    px: 1.2,
                    py: 0.95,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", md: "center" },
                    flexDirection: { xs: "column", md: "row" },
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", md: "13px" },
                      fontWeight: 700,
                      color: "#2E445B",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <CompareArrowsRoundedIcon sx={{ fontSize: "16px", color: "var(--primary-color)" }} />
                    Sort Results
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap" }}>
                    {sortOptions.map((option) => {
                      const active = sortedBy === option.id;
                      return (
                        <Button
                          key={option.id}
                          onClick={() => setSortedBy(option.id)}
                          startIcon={<TuneRoundedIcon sx={{ fontSize: "16px" }} />}
                          sx={{
                            textTransform: "none",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            px: 1.25,
                            py: 0.42,
                            color: active ? "#fff" : "#27527B",
                            backgroundColor: active
                              ? "var(--primary-button)"
                              : "rgba(0,154,214,0.1)",
                            "&:hover": {
                              backgroundColor: active
                                ? "var(--primary-button)"
                                : "rgba(0,154,214,0.18)",
                            },
                          }}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </Box>
                </Box>

                {paginatedFlightGroups?.length > 0 ? (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.15,
                      }}
                    >
                      {paginatedFlightGroups?.map((group, index) => {
                        const primaryFlight = group?.primary || {};
                        const groupRenderKey =
                          [
                            String(group?.key || "").trim(),
                            String(primaryFlight?.ResultId || "").trim(),
                            String(index),
                          ]
                            .filter(Boolean)
                            .join("::");
                        return (
                          <Box key={groupRenderKey}>
                            <SingleFlight
                              className={className}
                              data={primaryFlight}
                              groupedFlights={group?.options || []}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                    <Box
                      sx={{
                        mt: 1.7,
                        display: "flex",
                        justifyContent: "center",
                        py: 1,
                        borderRadius: "12px",
                        backgroundColor: "#fff",
                        border: "1px solid #E2EAF5",
                      }}
                    >
                      <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={handlePageChange}
                        variant="outlined"
                        color="secondary"
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      height: "40vh",
                      borderRadius: "14px",
                      border: "1px dashed rgba(0,154,214,0.3)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.95) 100%)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#A33A3A",
                        fontWeight: 700,
                        fontSize: "15px",
                      }}
                    >
                      No flights available for current filters
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          ) : (
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                minHeight: "50vh",
                borderRadius: "14px",
                border: "1px dashed rgba(214,31,52,0.28)",
                backgroundColor: "rgba(255,255,255,0.9)",
              }}
            >
              <Typography sx={{ color: "#B03042", fontWeight: 700, fontSize: "16px" }}>
                No flights available
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default OneWaySearchResult;
