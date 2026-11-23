import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Drawer,
  Grid,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AfterSearchBanner from "../AfterSearch/AfterSearchBanner";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import SingleRoundWayFlightsSilkton from "./SingleRoundWayFlightsSilkton";
import AirlinesSlider from "../AirlinesSlider/AirlinesSlider";
import AirlinesSliderSlikton from "../AirlinesSlider/AirlinesSliderSlikton";
import secureLocalStorage from "react-secure-storage";
import RoundwaySelecton from "../Filter/RoundwaySelecton";
import NavBar from "../../Shared/NavBar/NavBar";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { debounce } from "lodash";
import Filter from "../Filter/Filter";
import SingleFlight from "../SingleFlight/SingleFlight";
import Slider from "@mui/material/Slider";
import {
  fetchTravelportNextLeg,
  searchTravelportFlights,
} from "../../utils/travelportSearch";
import { groupFlightsBySchedule } from "../common/flightGrouping";
import { readRecentSearches } from "../../utils/recentSearches";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { resolveAirportInfo } from "../../utils/travelLookup";
import SearchContextDebugBadge from "../common/SearchContextDebugBadge";
import Swal from "sweetalert2";
import {
  buildTravelportSearchRequestModifiers,
  createDefaultTravelportSearchFilters,
  normalizeTravelportSearchFilters,
} from "../../utils/travelportSearchCriteria";

const toUpperText = (value) => String(value ?? "").trim().toUpperCase();
const toText = (value) => String(value ?? "").trim();

const toIsoDate = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  const parsed = moment(raw, ["YYYY-MM-DD", "DD MMM YY", "DD MMM YYYY", moment.ISO_8601], true);
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

const RoundWaySearchResult = () => {
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
    result,
    tripType,
    fromSendData,
    toSendData,
    className,
    valueBox,
    changeState,
    segments,
    searchData,
    value,
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

    let resolvedSegments = normalizedStateSegments.slice(0, 2);
    let recoveredFromRecent = null;

    if (resolvedSegments.length < 2) {
      const outboundCode = toUpperText(fromSendData);
      const inboundCode = toUpperText(toSendData);
      const outboundDate = toIsoDate(departureDate);
      const inboundDate = toIsoDate(arrivalDate);

      if (outboundCode && inboundCode && outboundDate && inboundDate) {
        resolvedSegments = [
          {
            depfrom: outboundCode,
            arrto: inboundCode,
            depdate: outboundDate,
            depFromText: toText(fromSearchText),
            arrToText: toText(toSearchText),
          },
          {
            depfrom: inboundCode,
            arrto: outboundCode,
            depdate: inboundDate,
            depFromText: toText(toSearchText),
            arrToText: toText(fromSearchText),
          },
        ];
      }
    }

    if (resolvedSegments.length < 2) {
      const latestRoundSearch = readRecentSearches().find((item) => {
        const tripTypeValue = toText(item?.tripType).toLowerCase();
        return (
          ["roundway", "roundtrip", "return"].includes(tripTypeValue) &&
          Array.isArray(item?.segments) &&
          item.segments.length >= 2
        );
      });

      if (latestRoundSearch) {
        recoveredFromRecent = latestRoundSearch;
        resolvedSegments = latestRoundSearch.segments
          .map((segment) => normalizeSearchSegment(segment))
          .filter(Boolean)
          .slice(0, 2);
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
    const safeCabinClass = toText(className || recoveredFromRecent?.cabinClass || "Economy");

    const displayFromCode = toUpperText(
      fromSendData || resolvedSegments[0]?.depfrom || recoveredFromRecent?.fromCode
    );
    const displayToCode = toUpperText(
      toSendData || resolvedSegments[0]?.arrto || recoveredFromRecent?.toCode
    );

    const displayFromSearch = toText(
      fromSearchText ||
      recoveredFromRecent?.fromLabel ||
      resolvedSegments[0]?.depFromText ||
      displayFromCode
    );
    const displayToSearch = toText(
      toSearchText ||
      recoveredFromRecent?.toLabel ||
      resolvedSegments[0]?.arrToText ||
      displayToCode
    );

    const displayDepartureDate =
      toText(departureDate) ||
      (resolvedSegments[0]?.depdate
        ? moment(resolvedSegments[0]?.depdate).format("DD MMM YY")
        : "");
    const displayArrivalDate =
      toText(arrivalDate) ||
      (resolvedSegments[1]?.depdate
        ? moment(resolvedSegments[1]?.depdate).format("DD MMM YY")
        : "");

    const effectiveSearchFilters = normalizeTravelportSearchFilters(
      searchFilters ||
      recoveredFromRecent?.searchFilters ||
      createDefaultTravelportSearchFilters()
    );

    return {
      valid: resolvedSegments.length >= 2,
      searchFilters: effectiveSearchFilters,
      payload: {
        adultcount: safeAdultCount,
        childcount: safeChildCount,
        infantcount: safeInfantCount,
        cabinclass: safeCabinClass,
        segments: resolvedSegments.slice(0, 2),
        ...buildTravelportSearchRequestModifiers(effectiveSearchFilters),
      },
      display: {
        fromCode: displayFromCode,
        toCode: displayToCode,
        fromSearch: displayFromSearch,
        toSearch: displayToSearch,
        departureDate: displayDepartureDate,
        arrivalDate: displayArrivalDate,
        fromAddress: toText(faddress || recoveredFromRecent?.fromAddress),
        toAddress: toText(toAddress || recoveredFromRecent?.toAddress),
        adultCount: safeAdultCount,
        childCount: safeChildCount,
        infantCount: safeInfantCount,
        cabinClass: safeCabinClass,
        valueBox: valueBox || recoveredFromRecent?.tripType || "roundway",
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

  const [flights, setFlights] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [initialFetchData, setInitialFetchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const token = secureLocalStorage.getItem("access_token");
  const [sortedBy, setSortedBy] = useState(null);

  // Round-trip mode: Combinable ("combinable") vs Leg-Based / Next Leg ("leg_based")
  const [roundTripMode, setRoundTripMode] = useState(() =>
    resolvedSearchContext?.searchFilters?.roundTripSearchMode === "leg_based"
      ? "leg_based"
      : "combinable"
  );
  const isLegBasedMode = roundTripMode === "leg_based";
  const [legStep, setLegStep] = useState("outbound"); // "outbound" | "return"
  const [outboundOffersCache, setOutboundOffersCache] = useState([]);
  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [nextLegLoading, setNextLegLoading] = useState(false);
  const [nextLegError, setNextLegError] = useState("");

  useEffect(() => {
    setRoundTripMode(
      resolvedSearchContext?.searchFilters?.roundTripSearchMode === "leg_based"
        ? "leg_based"
        : "combinable"
    );
  }, [resolvedSearchContext?.searchFilters?.roundTripSearchMode]);

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

  const updatePriceBounds = useCallback((offerList) => {
    const prices = (Array.isArray(offerList) ? offerList : [])
      .map((item) => Number(item?.NetFare))
      .filter((price) => Number.isFinite(price) && price >= 0);
    if (prices.length > 0) {
      const minVal = Math.min(...prices);
      const maxVal = Math.max(...prices);
      setMinPrice(minVal);
      setMaxPrice(maxVal);
      setPriceRange([minVal, maxVal]);
    } else {
      setMinPrice(0);
      setMaxPrice(100000);
      setPriceRange([0, 100000]);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLegStep("outbound");
      setSelectedOutbound(null);
      setOutboundOffersCache([]);
      setNextLegError("");
      setNextLegLoading(false);
      setCurrentPage(1);

      try {
        if (!resolvedSearchContext.valid) {
          setFlights([]);
          setFilteredFlights([]);
          setInitialFetchData([]);
          updatePriceBounds([]);
          return;
        }

        const effectivePayload = {
          ...resolvedSearchContext.payload,
          ...(isLegBasedMode
            ? { searchRepresentation: "Leg" }
            : { searchRepresentation: "" }),
          searchFilters: {
            ...(resolvedSearchContext.payload?.searchFilters || {}),
            roundTripSearchMode: roundTripMode,
            searchRepresentation: isLegBasedMode ? "Leg" : "",
          },
        };

        const data = await searchTravelportFlights(effectivePayload, token);
        const normalizedData = Array.isArray(data) ? data : [];
        const usableData = isLegBasedMode
          ? normalizedData.filter((item) => {
              const legs = Array.isArray(item?.AllLegsInfo) ? item.AllLegsInfo : [];
              return legs.length >= 1;
            })
          : normalizedData.filter((item) => {
              const legs = Array.isArray(item?.AllLegsInfo) ? item.AllLegsInfo : [];
              return legs.length > 1;
            });

        if (isLegBasedMode) {
          setOutboundOffersCache(usableData);
        }

        setFlights(usableData);
        setFilteredFlights(usableData);
        setInitialFetchData(usableData);
        updatePriceBounds(usableData);
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
    resolvedSearchContext,
    roundTripMode,
    isLegBasedMode,
    token,
    navigate,
    updatePriceBounds,
  ]);

  const mergeOutboundWithReturnOffer = useCallback((outboundOffer, returnOffer) => {
    const returnLegs = Array.isArray(returnOffer?.AllLegsInfo)
      ? returnOffer.AllLegsInfo
      : [];
    if (returnLegs.length >= 2) {
      return {
        ...returnOffer,
        TripType: "Return",
      };
    }

    const outboundLeg = Array.isArray(outboundOffer?.AllLegsInfo)
      ? outboundOffer.AllLegsInfo[0]
      : null;
    const returnLeg = returnLegs[0] || null;
    const mergedLegs = [outboundLeg, returnLeg].filter(Boolean);

    const combinedProductIds = Array.from(
      new Set([
        ...(Array.isArray(outboundOffer?.productIdentifiers)
          ? outboundOffer.productIdentifiers
          : []),
        ...(Array.isArray(returnOffer?.productIdentifiers)
          ? returnOffer.productIdentifiers
          : []),
      ])
    ).filter(Boolean);

    const offerListId =
      returnOffer?.offerListIdentifier ||
      outboundOffer?.offerListIdentifier ||
      "";
    const primaryOfferId =
      returnOffer?.OfferIdentifier ||
      returnOffer?.offerIdentifier ||
      outboundOffer?.OfferIdentifier ||
      outboundOffer?.offerIdentifier ||
      "";

    return {
      ...returnOffer,
      ResultId: [outboundOffer?.ResultId, returnOffer?.ResultId]
        .filter(Boolean)
        .join("_"),
      TripType: "Return",
      offerListIdentifier: offerListId,
      offerIdentifier: primaryOfferId,
      OfferIdentifier: primaryOfferId,
      productIdentifiers: combinedProductIds,
      farePolicyRequest: primaryOfferId
        ? {
            offerIdentifier: primaryOfferId,
            offerListIdentifier: offerListId,
            productIdentifiers: combinedProductIds,
          }
        : returnOffer?.farePolicyRequest || null,
      AllLegsInfo: mergedLegs,
      catalogProductOfferingSelections: [
        {
          sequence: 1,
          offerIdentifier:
            outboundOffer?.OfferIdentifier || outboundOffer?.offerIdentifier || "",
          productIdentifiers: Array.isArray(outboundOffer?.productIdentifiers)
            ? outboundOffer.productIdentifiers
            : [],
        },
        {
          sequence: 2,
          offerIdentifier:
            returnOffer?.OfferIdentifier || returnOffer?.offerIdentifier || "",
          productIdentifiers: Array.isArray(returnOffer?.productIdentifiers)
            ? returnOffer.productIdentifiers
            : [],
        },
      ].filter((sel) => sel.offerIdentifier),
    };
  }, []);

  const handleSelectOutbound = useCallback(
    async (outboundOffer) => {
      if (!outboundOffer) return;

      const cposId =
        outboundOffer?.offerListIdentifier ||
        outboundOffer?.farePolicyRequest?.offerListIdentifier ||
        outboundOffer?.sourceUnified?.offerListIdentifier ||
        "";
      const selectedCpoId =
        outboundOffer?.OfferIdentifier ||
        outboundOffer?.offerIdentifier ||
        outboundOffer?.ResultId ||
        "";
      const selectedProductRef =
        (Array.isArray(outboundOffer?.productIdentifiers) &&
          outboundOffer.productIdentifiers[0]) ||
        (Array.isArray(outboundOffer?.farePolicyRequest?.productIdentifiers) &&
          outboundOffer.farePolicyRequest.productIdentifiers[0]) ||
        "p0";

      setSelectedOutbound(outboundOffer);
      setLegStep("return");
      setNextLegLoading(true);
      setNextLegError("");
      setCurrentPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        const nextLegResponse = await fetchTravelportNextLeg(
          {
            cposId,
            selectedCpoId,
            selectedProductRef,
            segments: resolvedSearchContext?.payload?.segments || [],
            contentSourceList:
              resolvedSearchContext?.payload?.contentSourceList || ["GDS", "NDC"],
          },
          token
        );

        const rawReturnOffers = Array.isArray(nextLegResponse?.offers)
          ? nextLegResponse.offers
          : [];
        const mergedReturnOffers = rawReturnOffers.map((item) =>
          mergeOutboundWithReturnOffer(outboundOffer, item)
        );

        setFlights(mergedReturnOffers);
        setFilteredFlights(mergedReturnOffers);
        setInitialFetchData(mergedReturnOffers);
        updatePriceBounds(mergedReturnOffers);

        if (mergedReturnOffers.length === 0) {
          setNextLegError(
            "No combinable return flights were returned for this outbound selection. Try selecting another outbound flight."
          );
        }
      } catch (error) {
        setFlights([]);
        setFilteredFlights([]);
        setInitialFetchData([]);
        updatePriceBounds([]);
        setNextLegError(
          error?.message || "Failed to fetch return flights from Travelport Next Leg API."
        );
      } finally {
        setNextLegLoading(false);
      }
    },
    [
      mergeOutboundWithReturnOffer,
      resolvedSearchContext?.payload?.contentSourceList,
      resolvedSearchContext?.payload?.segments,
      token,
      updatePriceBounds,
    ]
  );

  const handleChangeOutbound = useCallback(() => {
    setLegStep("outbound");
    setSelectedOutbound(null);
    setNextLegError("");
    setNextLegLoading(false);
    setCurrentPage(1);
    setFlights(outboundOffersCache);
    setFilteredFlights(outboundOffersCache);
    setInitialFetchData(outboundOffersCache);
    updatePriceBounds(outboundOffersCache);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [outboundOffersCache, updatePriceBounds]);

  const handleSelectReturnAndBook = useCallback(
    (returnOffer) => {
      const completeOffer = selectedOutbound
        ? mergeOutboundWithReturnOffer(selectedOutbound, returnOffer)
        : returnOffer;
      const bookingState = {
        selectedOffer: completeOffer || {},
        source: "search-results-leg-based",
        selectedAt: new Date().toISOString(),
      };
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "flyjatt:selected_offer",
            JSON.stringify(bookingState)
          );
        }
      } catch (storageError) {
        console.warn("Unable to cache selected offer for booking flow", storageError);
      }
      navigate("/selectedOffer", { state: bookingState });
    },
    [mergeOutboundWithReturnOffer, navigate, selectedOutbound]
  );

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

  const groupedFlights = groupFlightsBySchedule(filteredFlights || []);
  const totalPages = Math.ceil(groupedFlights?.length / itemsPerPage);

  const paginatedFlightGroups = groupedFlights?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
  const handleAirLine = (code) => {
    handleSelection(code, setSelectedAirlins);
    if (selectedAirline === code) {
      setSelectedAirline(null);
      setFilteredFlights(flights);
    } else {
      setSelectedAirline(code);
      const filtered = flights.filter((flight) => flight.Carrier === code);
      setFilteredFlights(filtered);
    }
    setCurrentPage(1);
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

    const outboundConnectionMinutes = getMaxConnectionMinutes(item, 0);
    const inboundConnectionMinutes = getMaxConnectionMinutes(item, 1);
    const validDurations = [
      outboundConnectionMinutes,
      inboundConnectionMinutes,
    ].filter((value) => typeof value === "number");

    if (validDurations.length === 0) {
      return false;
    }

    const highestConnectionMinutes = Math.max(...validDurations);

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
  const displayContext = resolvedSearchContext.display;
  const bannerSegments =
    Array.isArray(resolvedSearchContext?.payload?.segments) &&
      resolvedSearchContext.payload.segments.length > 0
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
  const showDebugBadge = String(location?.pathname || "") === "/offers";
  const debugSegmentCount = resolvedSearchContext?.payload?.segments?.length || 2;
  console.log("flights", paginatedFlightGroups);
  return (
    <Box className="relative bg-transparent" sx={{ bgcolor: "transparent", height: "100%" }}>
      <SearchContextDebugBadge
        visible={showDebugBadge}
        tripType={displayContext?.valueBox || "roundway"}
        adultCount={displayContext?.adultCount}
        childCount={displayContext?.childCount}
        infantCount={displayContext?.infantCount}
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
            paxResult={result}
            valueBoxs={displayContext.valueBox}
            segments={bannerSegments}
            searchDatas={bannerSearchData}
            searchFilters={resolvedSearchContext.searchFilters}
            value={value}
            toggleBanner={toggleBanner}
          />
        </Box>
      )}
      <Box
        sx={{ display: { xs: "none", sm: "none", md: "block", lg: "block" } }}
      >
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
          paxResult={result}
          valueBoxs={displayContext.valueBox}
          segments={bannerSegments}
          searchDatas={bannerSearchData}
          searchFilters={resolvedSearchContext.searchFilters}
          value={value}
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
                  {displayContext.fromCode}-{displayContext.toCode}
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
            {/* Round-Trip Search Mode Control Bar (Combinable Fare vs Leg-Based / Next Leg) */}
            <Box
              sx={{
                mb: 2,
                p: { xs: 1.4, md: 1.8 },
                borderRadius: "14px",
                border: isLegBasedMode
                  ? "1px solid rgba(0, 123, 176, 0.45)"
                  : "1px solid #d7e6f5",
                background: isLegBasedMode
                  ? "linear-gradient(120deg, #f0f8ff 0%, #ffffff 100%)"
                  : "#ffffff",
                boxShadow: "0 6px 18px rgba(8, 49, 85, 0.06)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                  <label
                    htmlFor="roundway-results-leg-mode"
                    className="flyjatt-check-label"
                    style={{
                      paddingInline: "0.45rem",
                      minBlockSize: "40px",
                      background: isLegBasedMode ? "rgba(0,123,176,0.1)" : "#f6fafd",
                      border: "1px solid rgba(11,74,130,0.18)",
                    }}
                  >
                    <input
                      id="roundway-results-leg-mode"
                      type="checkbox"
                      className="flyjatt-check-input"
                      checked={isLegBasedMode}
                      onChange={(event) =>
                        setRoundTripMode(
                          event.target.checked ? "leg_based" : "combinable"
                        )
                      }
                    />
                    <span>Leg-Based / Next Leg System</span>
                  </label>
                  <Chip
                    size="small"
                    label={
                      isLegBasedMode
                        ? legStep === "outbound"
                          ? `Step 1 of 2: Select Outbound (${displayContext.fromCode} → ${displayContext.toCode})`
                          : `Step 2 of 2: Select Return (${displayContext.toCode} → ${displayContext.fromCode}) — Combined Fare`
                        : "Combinable Fare Mode (Joint Round-Trip Pricing)"
                    }
                    sx={{
                      fontWeight: 700,
                      fontSize: "12px",
                      bgcolor: isLegBasedMode ? "#0b4a82" : "rgba(0, 123, 176, 0.12)",
                      color: isLegBasedMode ? "#ffffff" : "#0b4a82",
                    }}
                  />
                </Box>

                {isLegBasedMode && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={`1. Outbound (${displayContext.fromCode}→${displayContext.toCode})`}
                      aria-current={legStep === "outbound" ? "step" : undefined}
                      sx={{
                        fontWeight: 700,
                        bgcolor:
                          legStep === "outbound"
                            ? "#007bb0"
                            : "rgba(16, 185, 129, 0.16)",
                        color: legStep === "outbound" ? "#ffffff" : "#047857",
                      }}
                    />
                    <Typography sx={{ color: "#64748b", fontWeight: 700 }}>→</Typography>
                    <Chip
                      size="small"
                      label={`2. Return (${displayContext.toCode}→${displayContext.fromCode})`}
                      aria-current={legStep === "return" ? "step" : undefined}
                      sx={{
                        fontWeight: 700,
                        bgcolor:
                          legStep === "return" ? "#007bb0" : "rgba(100, 116, 139, 0.14)",
                        color: legStep === "return" ? "#ffffff" : "#475569",
                      }}
                    />
                  </Stack>
                )}
              </Box>

              {isLegBasedMode && selectedOutbound && (
                <Box
                  sx={{
                    mt: 1.4,
                    pt: 1.4,
                    borderTop: "1px dashed #bdd7ee",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#047857",
                      }}
                    >
                      Selected Outbound Flight (Locked for Next Leg)
                    </Typography>
                    <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#0f2942", mt: 0.2 }}>
                      {selectedOutbound?.CarrierName || selectedOutbound?.Carrier || "Airline"} •{" "}
                      {selectedOutbound?.AllLegsInfo?.[0]?.DepFrom || displayContext.fromCode} →{" "}
                      {selectedOutbound?.AllLegsInfo?.[0]?.ArrTo || displayContext.toCode}
                      {selectedOutbound?.AllLegsInfo?.[0]?.Segments?.[0]?.DepTime
                        ? ` (${moment(selectedOutbound.AllLegsInfo[0].Segments[0].DepTime).format("DD MMM, HH:mm")})`
                        : ""}
                      {selectedOutbound?.AllLegsInfo?.[0]?.BrandName
                        ? ` • ${selectedOutbound.AllLegsInfo[0].BrandName}`
                        : ""}
                    </Typography>
                  </Box>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={handleChangeOutbound}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: "9px",
                      borderColor: "#007bb0",
                      color: "#007bb0",
                    }}
                  >
                    Change Outbound Flight
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={2}>
              {loading || nextLegLoading ? (
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <AirlinesSliderSlikton
                    flights={flights}
                    onAirlineClick={handleAirLine}
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
              {nextLegError && (
                <Grid item xs={12}>
                  <Alert
                    severity="warning"
                    action={
                      <Stack direction="row" spacing={1}>
                        <Button
                          type="button"
                          size="small"
                          color="inherit"
                          onClick={handleChangeOutbound}
                        >
                          Change Outbound
                        </Button>
                        {selectedOutbound && (
                          <Button
                            type="button"
                            size="small"
                            color="inherit"
                            onClick={() => handleSelectOutbound(selectedOutbound)}
                          >
                            Retry
                          </Button>
                        )}
                      </Stack>
                    }
                  >
                    {nextLegError}
                  </Alert>
                </Grid>
              )}
              {loading || nextLegLoading ? (
                <>
                  {nextLegLoading && (
                    <Grid item xs={12}>
                      <Box
                        role="status"
                        aria-live="polite"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.6,
                          borderRadius: "12px",
                          bgcolor: "#f0f8ff",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        <CircularProgress size={20} />
                        <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#0b4a82" }}>
                          Loading combinable return flights via Travelport Next Leg (/buildnext)...
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {[...Array(6)].map((_, index) => (
                    <Grid item xs={12} sm={12} md={12} lg={12} key={index}>
                      <SingleRoundWayFlightsSilkton />
                    </Grid>
                  ))}
                </>
              ) : paginatedFlightGroups.length > 0 ? (
                paginatedFlightGroups.map((group, index) => {
                  const groupRenderKey =
                    [
                      String(group?.key || "").trim(),
                      String(group?.primary?.ResultId || "").trim(),
                      String(index),
                    ]
                      .filter(Boolean)
                      .join("::");
                  return (
                    <Grid item xs={12} sm={12} md={12} lg={12} key={groupRenderKey}>
                      <SingleFlight
                        data={group?.primary || {}}
                        groupedFlights={group?.options || []}
                        onSelectFlight={
                          isLegBasedMode
                            ? legStep === "outbound"
                              ? handleSelectOutbound
                              : handleSelectReturnAndBook
                            : undefined
                        }
                        selectButtonLabel={
                          isLegBasedMode
                            ? legStep === "outbound"
                              ? "Select Outbound"
                              : "Book Combined Fare"
                            : "Book Now"
                        }
                      />
                    </Grid>
                  );
                })
              ) : (
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 1.5,
                      py: 8,
                    }}
                  >
                    <Typography sx={{ color: "#b91c1c", fontWeight: 700 }}>
                      {isLegBasedMode && legStep === "return"
                        ? "No combinable return flights available for this outbound leg."
                        : "No flights available"}
                    </Typography>
                    {isLegBasedMode && legStep === "return" && (
                      <Button
                        type="button"
                        variant="contained"
                        onClick={handleChangeOutbound}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Choose Another Outbound Flight
                      </Button>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
            <Box
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
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default RoundWaySearchResult;
