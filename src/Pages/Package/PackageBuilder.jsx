import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Grid,
  Rating,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import PackageSearchBox from "./PackageSearchBox";
import HotelStaysPlanner, { makeStayLeg } from "./HotelStaysPlanner";
import { searchTravelportFlights } from "../../utils/travelportSearch";
import {
  calculateNights,
  fetchTravelportHotelAvailability,
  fetchTravelportHotelRules,
  formatIsoDateOffset,
  resolveStayDestinationFromAirport,
  searchTravelportHotels,
} from "../../utils/travelportHotel";

function createDefaultPackageRequest() {
  const dep = formatIsoDateOffset(7);
  const ret = formatIsoDateOffset(22); // 15-day trip default
  return {
    flightCriteria: {
      fromCode: "DAC",
      fromLabel: "Dhaka (DAC)",
      toCode: "DXB",
      toLabel: "Dubai (DXB)",
      departureDate: dep,
      returnDate: ret,
      tripNights: 15,
      adults: 2,
      children: 0,
      infants: 0,
      cabinClass: "Economy",
      currency: "USD",
    },
    hotelStays: [makeStayLeg("stay-1", "DXB", dep, ret, 1)],
    startStep: "flight",
  };
}

function formatFlightTime(isoStr) {
  if (!isoStr) return "--:--";
  const match = String(isoStr).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(isoStr).slice(0, 16);
}

function formatDurationMinutes(minutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return "";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

const PackageBuilder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = secureLocalStorage.getItem("access_token");

  const initialPackage = useMemo(() => {
    if (location?.state?.flightCriteria) {
      const fc = location.state.flightCriteria;
      const arrival = resolveStayDestinationFromAirport(fc.toCode || "DXB");
      const stays =
        Array.isArray(location.state.hotelStays) &&
        location.state.hotelStays.length > 0
          ? location.state.hotelStays
          : [makeStayLeg("stay-1", arrival.primary, fc.departureDate, fc.returnDate, 1)];
      return {
        ...location.state,
        hotelStays: stays,
      };
    }
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:last_package_search");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.flightCriteria) {
            const fc = parsed.flightCriteria;
            const arrival = resolveStayDestinationFromAirport(fc.toCode || "DXB");
            return {
              ...parsed,
              hotelStays:
                Array.isArray(parsed.hotelStays) && parsed.hotelStays.length > 0
                  ? parsed.hotelStays
                  : [makeStayLeg("stay-1", arrival.primary, fc.departureDate, fc.returnDate, 1)],
            };
          }
        }
      }
    } catch {
      // ignore
    }
    return createDefaultPackageRequest();
  }, [location?.state]);

  const [packageRequest, setPackageRequest] = useState(initialPackage);
  const [showModifyFlight, setShowModifyFlight] = useState(false);

  // Two-stage flow:
  // "flight" -> Step 1: search & select flight (Hotel Stays Plan is HIDDEN until flight is selected/booked)
  // "hotels" -> Step 2: Hotel Stays Plan (Auto-Matched or Multi-City Split Stay) + live USD hotel search
  const [packageStep, setPackageStep] = useState(
    initialPackage.startStep === "hotels" || initialPackage.bookedFlightSummary
      ? "hotels"
      : "flight"
  );
  const [activeStayId, setActiveStayId] = useState(
    initialPackage.hotelStays?.[0]?.id || "stay-1"
  );

  // Flight search state
  const [flights, setFlights] = useState([]);
  const [flightsLoading, setFlightsLoading] = useState(
    !initialPackage.bookedFlightSummary
  );
  const [flightsError, setFlightsError] = useState("");
  const [flightStopsFilter, setFlightStopsFilter] = useState("all");
  const [flightSort, setFlightSort] = useState("price_asc");
  const [selectedFlight, setSelectedFlight] = useState(
    initialPackage.bookedFlightSummary || null
  );

  // Stay hotel search state per stay.id (ONLY fetched after flight is selected -> Step 2)
  const [stayResultsById, setStayResultsById] = useState({});
  const [selectedStayPlan, setSelectedStayPlan] = useState({});
  const [stayFiltersById, setStayFiltersById] = useState({});
  const [openHotelKey, setOpenHotelKey] = useState("");
  const [roomsCacheByKey, setRoomsCacheByKey] = useState({});
  const [rulesCacheByOfferId, setRulesCacheByOfferId] = useState({});

  const runFlightSearch = useCallback(
    async (flightCriteria) => {
      setFlightsLoading(true);
      setFlightsError("");
      try {
        const payload = {
          adultcount: Math.max(1, Number(flightCriteria.adults) || 1),
          childcount: Math.max(0, Number(flightCriteria.children) || 0),
          infantcount: Math.max(0, Number(flightCriteria.infants) || 0),
          cabinclass: flightCriteria.cabinClass || "Economy",
          segments: [
            {
              depfrom: flightCriteria.fromCode,
              arrto: flightCriteria.toCode,
              depdate: flightCriteria.departureDate,
            },
            {
              depfrom: flightCriteria.toCode,
              arrto: flightCriteria.fromCode,
              depdate: flightCriteria.returnDate,
            },
          ],
        };
        const res = await searchTravelportFlights(payload, token);
        const list = Array.isArray(res) ? res : [];
        const sorted = [...list].sort(
          (a, b) => Number(a?.NetFare || 0) - Number(b?.NetFare || 0)
        );
        setFlights(sorted);
      } catch (err) {
        setFlights([]);
        setFlightsError(err?.message || "Unable to fetch live flights for this package.");
      } finally {
        setFlightsLoading(false);
      }
    },
    [token]
  );

  const runHotelSearchForStay = useCallback(
    async (stay, flightCriteria) => {
      setStayResultsById((prev) => ({
        ...prev,
        [stay.id]: {
          loading: true,
          error: "",
          properties: prev[stay.id]?.properties || [],
          totalProperties: prev[stay.id]?.totalProperties || 0,
        },
      }));

      try {
        const res = await searchTravelportHotels(
          {
            destination: stay.destination,
            cityCode: stay.cityCode,
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            rooms: stay.rooms || 1,
            adults: flightCriteria.adults || 2,
            children: flightCriteria.children || 0,
            currency: "USD",
            radiusKm: 25,
          },
          token
        );
        const properties = Array.isArray(res?.properties) ? res.properties : [];
        setStayResultsById((prev) => ({
          ...prev,
          [stay.id]: {
            loading: false,
            error: "",
            properties,
            totalProperties: Number(res?.totalProperties || properties.length),
          },
        }));
      } catch (err) {
        setStayResultsById((prev) => ({
          ...prev,
          [stay.id]: {
            loading: false,
            error: err?.message || `Unable to fetch hotels for ${stay.destination}.`,
            properties: [],
            totalProperties: 0,
          },
        }));
      }
    },
    [token]
  );

  // Step 1: search live flights only when no pre-booked flight was passed in
  useEffect(() => {
    if (packageRequest.bookedFlightSummary) {
      setFlightsLoading(false);
      return;
    }
    runFlightSearch(packageRequest.flightCriteria);
  }, [packageRequest.flightCriteria, packageRequest.bookedFlightSummary, runFlightSearch]);

  // Step 2: ONLY search hotels AFTER customer has selected/booked their flight and entered Step 2!
  useEffect(() => {
    if (packageStep !== "hotels") return;
    packageRequest.hotelStays.forEach((stay) => {
      runHotelSearchForStay(stay, packageRequest.flightCriteria);
    });
  }, [packageStep, packageRequest.hotelStays, packageRequest.flightCriteria, runHotelSearchForStay]);

  const handleModifyFlightSubmit = (nextPayload) => {
    setPackageRequest(nextPayload);
    setSelectedFlight(null);
    setSelectedStayPlan({});
    setStayResultsById({});
    setOpenHotelKey("");
    setPackageStep("flight");
    setActiveStayId(nextPayload.hotelStays?.[0]?.id || "stay-1");
    setShowModifyFlight(false);
  };

  // Customer selects a flight -> unlocks Step 2 (Hotel Stays Plan + auto-matched live hotel search)
  const handleSelectFlightAndContinue = (flight) => {
    setSelectedFlight(flight);
    const arrivalInfo = resolveStayDestinationFromAirport(
      packageRequest.flightCriteria.toCode
    );
    const stays =
      Array.isArray(packageRequest.hotelStays) &&
      packageRequest.hotelStays.length > 0
        ? packageRequest.hotelStays
        : [
            makeStayLeg(
              "stay-1",
              arrivalInfo.primary,
              packageRequest.flightCriteria.departureDate,
              packageRequest.flightCriteria.returnDate,
              1
            ),
          ];
    setPackageRequest((prev) => ({ ...prev, hotelStays: stays }));
    setActiveStayId(stays[0].id);
    setPackageStep("hotels");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Customer updates or splits stays in HotelStaysPlanner (Step 2)
  const handleApplyStayPlan = (nextStays) => {
    setPackageRequest((prev) => {
      const updated = { ...prev, hotelStays: nextStays };
      try {
        window.sessionStorage.setItem(
          "flyjatt:last_package_search",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
    // Keep selections only for unchanged stay IDs
    const nextIds = new Set(nextStays.map((s) => s.id));
    setSelectedStayPlan((prev) => {
      const filtered = {};
      Object.keys(prev).forEach((k) => {
        if (nextIds.has(k)) filtered[k] = prev[k];
      });
      return filtered;
    });
    setOpenHotelKey("");
    if (nextStays[0] && !nextIds.has(activeStayId)) {
      setActiveStayId(nextStays[0].id);
    }
  };

  // Step 3 live room availability inside a hotel card
  const handleToggleHotelRooms = async (stay, property) => {
    const key = `${stay.id}:${property.propertyCode}`;
    if (openHotelKey === key) {
      setOpenHotelKey("");
      return;
    }
    setOpenHotelKey(key);
    if (roomsCacheByKey[key]?.loaded && !roomsCacheByKey[key]?.error) {
      return;
    }
    await fetchRoomsForHotel(stay, property);
  };

  const fetchRoomsForHotel = async (stay, property) => {
    const key = `${stay.id}:${property.propertyCode}`;
    setRoomsCacheByKey((prev) => ({
      ...prev,
      [key]: { loading: true, loaded: false, offers: [], error: "", warning: "" },
    }));
    try {
      const res = await fetchTravelportHotelAvailability(
        {
          propertyCode: property.propertyCode,
          chainCode: property.chainCode,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          rooms: stay.rooms || 1,
          adults: packageRequest.flightCriteria.adults || 2,
          children: packageRequest.flightCriteria.children || 0,
          currency: "USD",
        },
        token
      );
      setRoomsCacheByKey((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          loaded: true,
          offers: Array.isArray(res?.offers) ? res.offers : [],
          error: "",
          warning: res?.warning || "",
        },
      }));
    } catch (err) {
      setRoomsCacheByKey((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          loaded: true,
          offers: [],
          error: err?.message || "Unable to fetch live rooms.",
          warning: "",
        },
      }));
    }
  };

  const handleLoadRoomRules = async (property, offer) => {
    if (rulesCacheByOfferId[offer.offerId]?.loaded) return;
    setRulesCacheByOfferId((prev) => ({
      ...prev,
      [offer.offerId]: { loading: true, loaded: false, rules: null, error: "" },
    }));
    try {
      const res = await fetchTravelportHotelRules(
        {
          catalogOfferingsIdentifier: offer.catalogOfferingsIdentifier,
          catalogOfferingIdentifier: offer.catalogOfferingIdentifier,
          authority: offer.authority || offer.aggregator || "TVPT",
          propertyCode: property.propertyCode,
          chainCode: property.chainCode,
        },
        token
      );
      setRulesCacheByOfferId((prev) => ({
        ...prev,
        [offer.offerId]: {
          loading: false,
          loaded: true,
          rules: res?.rules || {},
          error: "",
        },
      }));
    } catch (err) {
      setRulesCacheByOfferId((prev) => ({
        ...prev,
        [offer.offerId]: {
          loading: false,
          loaded: true,
          rules: null,
          error: err?.message || "Rules unavailable.",
        },
      }));
    }
  };

  const handleSelectStayRoom = (stay, property, roomOffer) => {
    const rules = rulesCacheByOfferId[roomOffer.offerId]?.rules || null;
    setSelectedStayPlan((prev) => ({
      ...prev,
      [stay.id]: {
        stay,
        property,
        roomOffer,
        rateRules: rules,
      },
    }));

    const nextUnselected = packageRequest.hotelStays.find(
      (s) => s.id !== stay.id && !selectedStayPlan[s.id]
    );
    if (nextUnselected) {
      setActiveStayId(nextUnselected.id);
    }
  };

  const handleOpenHotelDetailsPage = (stay, property) => {
    const searchCriteria = {
      destination: stay.destination,
      cityCode: stay.cityCode,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      rooms: stay.rooms || 1,
      adults: packageRequest.flightCriteria.adults || 2,
      children: packageRequest.flightCriteria.children || 0,
      currency: "USD",
    };
    try {
      window.sessionStorage.setItem(
        "flyjatt:selected_hotel_property",
        JSON.stringify({ property, searchCriteria })
      );
    } catch {
      // ignore
    }
    const qs = new URLSearchParams({
      chainCode: property.chainCode || "",
      propertyCode: property.propertyCode || "",
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      rooms: String(stay.rooms || 1),
      adults: String(packageRequest.flightCriteria.adults || 2),
      children: String(packageRequest.flightCriteria.children || 0),
      currency: "USD",
    });
    navigate(`/hoteldetails?${qs.toString()}`, {
      state: { property, searchCriteria },
    });
  };

  const handleProceedBookFlight = () => {
    if (!selectedFlight || selectedFlight.isAlreadyBooked) return;
    const bookingState = {
      selectedOffer: selectedFlight,
      source: "package-builder",
      selectedAt: new Date().toISOString(),
    };
    try {
      window.sessionStorage.setItem(
        "flyjatt:selected_offer",
        JSON.stringify(bookingState)
      );
    } catch {
      // ignore
    }
    navigate("/selectedOffer", { state: bookingState });
  };

  const handleProceedBookStay = (stayId) => {
    const chosen = selectedStayPlan[stayId];
    if (!chosen) return;
    const bookingPayload = {
      property: chosen.property,
      roomOffer: chosen.roomOffer,
      rateRules: chosen.rateRules || null,
      searchCriteria: {
        destination: chosen.stay.destination,
        cityCode: chosen.stay.cityCode,
        checkIn: chosen.stay.checkIn,
        checkOut: chosen.stay.checkOut,
        rooms: chosen.stay.rooms || 1,
        adults: packageRequest.flightCriteria.adults || 2,
        children: packageRequest.flightCriteria.children || 0,
        currency: "USD",
      },
      nights: calculateNights(chosen.stay.checkIn, chosen.stay.checkOut),
      fromPackage: true,
    };
    try {
      window.sessionStorage.setItem(
        "flyjatt:selected_hotel_offer",
        JSON.stringify(bookingPayload)
      );
    } catch {
      // ignore
    }
    navigate("/hotelbooking", { state: bookingPayload });
  };

  // Filtered flights
  const visibleFlights = useMemo(() => {
    let list = [...flights];
    if (flightStopsFilter === "nonstop") {
      list = list.filter((f) =>
        (f.AllLegsInfo || []).every((leg) => (leg.Segments || []).length <= 1)
      );
    } else if (flightStopsFilter === "1stop") {
      list = list.filter((f) =>
        (f.AllLegsInfo || []).every((leg) => (leg.Segments || []).length <= 2)
      );
    }
    if (flightSort === "duration_asc") {
      list.sort((a, b) => {
        const durA = (a.AllLegsInfo || []).reduce(
          (sum, leg) => sum + (Number(leg.Duration) || 0),
          0
        );
        const durB = (b.AllLegsInfo || []).reduce(
          (sum, leg) => sum + (Number(leg.Duration) || 0),
          0
        );
        return durA - durB;
      });
    } else {
      list.sort((a, b) => Number(a?.NetFare || 0) - Number(b?.NetFare || 0));
    }
    return list.slice(0, 30);
  }, [flightSort, flightStopsFilter, flights]);

  // Combined totals summary
  const summaryTotals = useMemo(() => {
    const flightPrice = Number(selectedFlight?.NetFare || 0);
    const flightCurrency = selectedFlight?.CurrencyCode || "USD";

    let hotelsTotal = 0;
    let selectedStaysCount = 0;

    packageRequest.hotelStays.forEach((stay) => {
      const sel = selectedStayPlan[stay.id];
      if (sel?.roomOffer) {
        selectedStaysCount += 1;
        hotelsTotal += Number(sel.roomOffer.totalPrice || 0);
      }
    });

    const totalStayNights = packageRequest.hotelStays.reduce(
      (acc, s) => acc + calculateNights(s.checkIn, s.checkOut),
      0
    );

    const sameCurrency = flightCurrency === "USD" || flightPrice === 0;

    return {
      flightPrice,
      flightCurrency,
      hotelsTotal,
      selectedStaysCount,
      totalStaysCount: packageRequest.hotelStays.length,
      totalStayNights,
      sameCurrency,
      combinedTotal: flightPrice + hotelsTotal,
    };
  }, [packageRequest, selectedFlight, selectedStayPlan]);

  const activeStayObj = useMemo(
    () =>
      packageRequest.hotelStays.find((s) => s.id === activeStayId) ||
      packageRequest.hotelStays[0] ||
      null,
    [activeStayId, packageRequest.hotelStays]
  );

  const activeStayFilter = stayFiltersById[activeStayObj?.id || ""] || {
    query: "",
    openOnly: true,
    poolOnly: false,
    minStar: 0,
    sort: "price_asc",
  };

  const updateActiveStayFilter = (patch) => {
    if (!activeStayObj) return;
    setStayFiltersById((prev) => ({
      ...prev,
      [activeStayObj.id]: { ...activeStayFilter, ...patch },
    }));
  };

  const visibleStayProperties = useMemo(() => {
    if (!activeStayObj) return [];
    const state = stayResultsById[activeStayObj.id];
    let list = Array.isArray(state?.properties) ? [...state.properties] : [];
    const q = String(activeStayFilter.query || "").trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          String(p.hotelName || "").toLowerCase().includes(q) ||
          String(p.address || "").toLowerCase().includes(q)
      );
    }
    if (activeStayFilter.openOnly) {
      const openList = list.filter((p) => p.available);
      if (openList.length > 0) list = openList;
    }
    if (activeStayFilter.poolOnly) {
      list = list.filter((p) => p.amenityFlags?.hasPool);
    }
    if (activeStayFilter.minStar > 0) {
      list = list.filter((p) => Number(p.starRating || 0) >= activeStayFilter.minStar);
    }
    if (activeStayFilter.sort === "star_desc") {
      list.sort((a, b) => Number(b.starRating || 0) - Number(a.starRating || 0));
    } else {
      list.sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        const pa = a.minNightlyPrice ?? Number.MAX_SAFE_INTEGER;
        const pb = b.minNightlyPrice ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    }
    return list.slice(0, 30);
  }, [activeStayFilter, activeStayObj, stayResultsById]);

  const fc = packageRequest.flightCriteria;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb", pb: 8 }}>
      <NavBar />
      <Container maxWidth="xl" sx={{ pt: 3 }}>
        {/* Top Package Header Banner */}
        <Box
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: "18px",
            background: "linear-gradient(115deg, #062544 0%, #0b4a82 55%, #007bb0 100%)",
            color: "#ffffff",
            mb: 2.2,
            boxShadow: "0 14px 30px rgba(6, 37, 68, 0.18)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{ fontWeight: 800, fontSize: { xs: "20px", md: "26px" } }}
              >
                Flight + Hotel Package: {fc.fromCode} ↔ {fc.toCode}
              </Typography>
              <Typography sx={{ fontSize: "13.5px", color: "rgba(255,255,255,0.88)", mt: 0.4 }}>
                {fc.departureDate} → {fc.returnDate} ({calculateNights(fc.departureDate, fc.returnDate)} nights)
                {" • "}
                {fc.adults} Adult{fc.adults > 1 ? "s" : ""}
                {fc.children > 0 ? `, ${fc.children} Child` : ""}
                {packageStep === "hotels"
                  ? ` • ${packageRequest.hotelStays.map((s) => `${s.cityCode} (${calculateNights(s.checkIn, s.checkOut)}n)`).join(" + ")}`
                  : " • Step 1: Select Flight First"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                icon={
                  selectedFlight ? (
                    <CheckCircleRoundedIcon sx={{ color: "#bbf7d0 !important", fontSize: 16 }} />
                  ) : (
                    <FlightTakeoffRoundedIcon sx={{ color: "#ffffff !important", fontSize: 16 }} />
                  )
                }
                label="1. Select Flight"
                onClick={() => !selectedFlight?.isAlreadyBooked && setPackageStep("flight")}
                sx={{
                  bgcolor:
                    packageStep === "flight"
                      ? "#00a3e0"
                      : "rgba(255,255,255,0.16)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: selectedFlight?.isAlreadyBooked ? "default" : "pointer",
                }}
              />
              <Chip
                icon={<HotelRoundedIcon sx={{ color: "#ffffff !important", fontSize: 16 }} />}
                label="2. Hotel Stays Plan"
                onClick={() => selectedFlight && setPackageStep("hotels")}
                sx={{
                  bgcolor:
                    packageStep === "hotels"
                      ? "#00a3e0"
                      : "rgba(255,255,255,0.12)",
                  color: selectedFlight ? "#fff" : "rgba(255,255,255,0.55)",
                  fontWeight: 800,
                  cursor: selectedFlight ? "pointer" : "not-allowed",
                }}
              />
              {!selectedFlight?.isAlreadyBooked && (
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => setShowModifyFlight((v) => !v)}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.16)",
                    color: "#fff",
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.3)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.26)" },
                  }}
                >
                  {showModifyFlight ? "Hide Flight Editor" : "Modify Flight Search"}
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        {/* Collapsible Flight Search Editor */}
        <Collapse in={showModifyFlight}>
          <Box sx={{ mb: 2.5 }}>
            <PackageSearchBox
              compact
              initialValues={packageRequest}
              onSearchSubmit={handleModifyFlightSubmit}
            />
          </Box>
        </Collapse>

        <Grid container spacing={2.5} alignItems="flex-start">
          {/* Left Main Column */}
          <Grid item xs={12} lg={8.5}>
            {/* ================================================================= */}
            {/* STEP 1: FLIGHT SELECTION (Hotel Stays Plan NOT shown yet!)       */}
            {/* ================================================================= */}
            {packageStep === "flight" && (
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #d7e6f5",
                  p: { xs: 2, md: 2.5 },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1.2,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography component="h2" sx={{ fontWeight: 800, fontSize: "19px", color: "#0f2942" }}>
                      Step 1: Choose Your Round-Trip Flight ({visibleFlights.length} live offers)
                    </Typography>
                    <Typography sx={{ fontSize: "13px", color: "#526B86" }}>
                      Select your flight below to unlock Step 2 (Auto-Matched &amp; Split-Stay Hotel Plan).
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      clickable
                      size="small"
                      label="All Stops"
                      color={flightStopsFilter === "all" ? "primary" : "default"}
                      onClick={() => setFlightStopsFilter("all")}
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      clickable
                      size="small"
                      label="Non-stop"
                      color={flightStopsFilter === "nonstop" ? "primary" : "default"}
                      onClick={() => setFlightStopsFilter("nonstop")}
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      clickable
                      size="small"
                      label="Up to 1 Stop"
                      color={flightStopsFilter === "1stop" ? "primary" : "default"}
                      onClick={() => setFlightStopsFilter("1stop")}
                      sx={{ fontWeight: 700 }}
                    />
                    <select
                      aria-label="Sort flights"
                      className="flyjatt-native-select"
                      style={{ minBlockSize: "34px", width: "auto", paddingBlock: "0.2rem" }}
                      value={flightSort}
                      onChange={(e) => setFlightSort(e.target.value)}
                    >
                      <option value="price_asc">Cheapest First</option>
                      <option value="duration_asc">Shortest Duration</option>
                    </select>
                  </Stack>
                </Box>

                {flightsLoading && (
                  <Box sx={{ py: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                    <CircularProgress size={24} />
                    <Typography sx={{ fontWeight: 700, color: "#0b4a82" }}>
                      Searching live Travelport flights ({fc.fromCode} ↔ {fc.toCode})...
                    </Typography>
                  </Box>
                )}

                {!flightsLoading && flightsError && (
                  <Alert
                    severity="error"
                    action={
                      <Button
                        type="button"
                        size="small"
                        color="inherit"
                        onClick={() => runFlightSearch(fc)}
                      >
                        Retry
                      </Button>
                    }
                  >
                    {flightsError}
                  </Alert>
                )}

                {!flightsLoading && !flightsError && visibleFlights.length === 0 && (
                  <Alert severity="info">
                    No live flights matched these criteria. Try adjusting stops filter or dates.
                  </Alert>
                )}

                {!flightsLoading &&
                  visibleFlights.map((flight, index) => {
                    const isSelected =
                      selectedFlight &&
                      (selectedFlight.ResultId === flight.ResultId ||
                        selectedFlight.offerIdentifier === flight.offerIdentifier);
                    const legs = Array.isArray(flight.AllLegsInfo) ? flight.AllLegsInfo : [];

                    return (
                      <Box
                        key={`${flight.ResultId || flight.offerIdentifier || index}-${index}`}
                        sx={{
                          border: isSelected ? "2px solid #007bb0" : "1px solid #d7e6f5",
                          bgcolor: isSelected ? "#f0f9ff" : "#fbfdff",
                          borderRadius: "14px",
                          p: 2,
                          mb: 1.5,
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={8}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                              <Typography sx={{ fontWeight: 800, fontSize: "15.5px", color: "#0b4a82" }}>
                                {flight.CarrierName || flight.Carrier}
                              </Typography>
                              <Chip size="small" label={flight.Carrier} sx={{ fontWeight: 700, height: 22 }} />
                              {flight.Refundable && (
                                <Chip size="small" color="success" variant="outlined" label="Refundable" sx={{ fontWeight: 700, height: 22 }} />
                              )}
                              {legs[0]?.BrandName && (
                                <Chip size="small" label={legs[0].BrandName} sx={{ fontWeight: 700, height: 22, bgcolor: "#e0f2fe", color: "#0369a1" }} />
                              )}
                            </Stack>

                            {legs.map((leg, legIdx) => {
                              const segs = Array.isArray(leg.Segments) ? leg.Segments : [];
                              const firstSeg = segs[0] || {};
                              const lastSeg = segs[segs.length - 1] || firstSeg;
                              const stops = Math.max(0, segs.length - 1);
                              return (
                                <Box
                                  key={legIdx}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 1,
                                    py: 0.7,
                                    borderTop: legIdx > 0 ? "1px dashed #cbd5e1" : "none",
                                  }}
                                >
                                  <Chip
                                    size="small"
                                    label={legIdx === 0 ? "Outbound" : "Return"}
                                    sx={{ fontWeight: 700, fontSize: "11px", minWidth: 74 }}
                                  />
                                  <Typography sx={{ fontWeight: 800, fontSize: "14.5px", color: "#0f2942" }}>
                                    {formatFlightTime(firstSeg.DepTime)} {leg.DepFrom} →{" "}
                                    {formatFlightTime(lastSeg.ArrTime)} {leg.ArrTo}
                                  </Typography>
                                  <Typography sx={{ fontSize: "12.5px", color: "#526B86", fontWeight: 600 }}>
                                    {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
                                    {leg.Duration ? ` • ${formatDurationMinutes(leg.Duration)}` : ""}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Grid>

                          <Grid item xs={12} md={4} sx={{ textAlign: { xs: "left", md: "right" } }}>
                            <Typography sx={{ fontSize: "21px", fontWeight: 800, color: "#0b4a82" }}>
                              {flight.CurrencyCode} {Number(flight.NetFare || 0).toLocaleString()}
                            </Typography>
                            <Typography sx={{ fontSize: "12px", color: "#64748b", mb: 1 }}>
                              Round-trip total (incl. taxes)
                            </Typography>
                            <Button
                              type="button"
                              variant="contained"
                              endIcon={<ArrowForwardRoundedIcon />}
                              onClick={() => handleSelectFlightAndContinue(flight)}
                              sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                borderRadius: "10px",
                                minHeight: "44px",
                                background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                              }}
                            >
                              Select Flight &amp; Plan Hotels
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
              </Box>
            )}

            {/* ================================================================= */}
            {/* STEP 2: POST-FLIGHT HOTEL STAYS PLAN + LIVE USD HOTEL PICKER      */}
            {/* ================================================================= */}
            {packageStep === "hotels" && (
              <Stack spacing={2.2}>
                {/* Selected / Booked Flight Summary Bar */}
                <Box
                  sx={{
                    bgcolor: "#f0fdf4",
                    borderRadius: "14px",
                    border: "1px solid #86efac",
                    p: 1.8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1.2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
                    <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 26 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#14532d" }}>
                        {selectedFlight?.isAlreadyBooked
                          ? `Flight Booked (PNR: ${selectedFlight.pnr}) • ${fc.fromCode} ↔ ${fc.toCode}`
                          : `Flight Selected: ${selectedFlight?.CarrierName || selectedFlight?.Carrier || ""} (${fc.fromCode} ↔ ${fc.toCode})`}
                      </Typography>
                      <Typography sx={{ fontSize: "12.5px", color: "#166534" }}>
                        {fc.departureDate} → {fc.returnDate} ({calculateNights(fc.departureDate, fc.returnDate)} nights)
                        {selectedFlight?.NetFare
                          ? ` • ${selectedFlight.CurrencyCode || "USD"} ${Number(selectedFlight.NetFare).toLocaleString()}`
                          : ""}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {!selectedFlight?.isAlreadyBooked && (
                      <>
                        <Button
                          type="button"
                          size="small"
                          variant="outlined"
                          startIcon={<ArrowBackRoundedIcon />}
                          onClick={() => setPackageStep("flight")}
                          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "9px" }}
                        >
                          Change Flight
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="contained"
                          onClick={handleProceedBookFlight}
                          sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            borderRadius: "9px",
                            bgcolor: "#15803d",
                            "&:hover": { bgcolor: "#166534" },
                          }}
                        >
                          Book Flight Now
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>

                {/* 2. Hotel Stays Plan (Auto-Matched or Multi-City Split Stay) */}
                <Box
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #d7e6f5",
                    p: { xs: 1.8, md: 2.2 },
                  }}
                >
                  <HotelStaysPlanner
                    arrivalAirportCode={fc.toCode}
                    departureDate={fc.departureDate}
                    returnDate={fc.returnDate}
                    initialStays={packageRequest.hotelStays}
                    onApplyStays={handleApplyStayPlan}
                    submitLabel="Update & Search Live Hotels (USD)"
                  />
                </Box>

                {/* Stay Leg Tabs (Stay 1, Stay 2, ...) */}
                <Box
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #d7e6f5",
                    px: 1,
                  }}
                >
                  <Tabs
                    value={activeStayObj?.id || false}
                    onChange={(_, val) => setActiveStayId(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Hotel stay legs"
                  >
                    {packageRequest.hotelStays.map((stay, idx) => {
                      const isChosen = Boolean(selectedStayPlan[stay.id]?.roomOffer);
                      const n = calculateNights(stay.checkIn, stay.checkOut);
                      return (
                        <Tab
                          key={stay.id}
                          value={stay.id}
                          icon={
                            isChosen ? (
                              <CheckCircleRoundedIcon color="success" fontSize="small" />
                            ) : (
                              <HotelRoundedIcon fontSize="small" />
                            )
                          }
                          iconPosition="start"
                          label={`Stay ${idx + 1}: ${stay.cityCode} (${n}n • ${stay.checkIn} → ${stay.checkOut})`}
                          sx={{ textTransform: "none", fontWeight: 800, minHeight: 54 }}
                        />
                      );
                    })}
                  </Tabs>
                </Box>

                {/* Active Stay Live Hotel List (USD) */}
                {activeStayObj && (
                  <Box
                    sx={{
                      bgcolor: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #d7e6f5",
                      p: { xs: 2, md: 2.5 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1.2,
                        mb: 1.8,
                      }}
                    >
                      <Box>
                        <Typography component="h2" sx={{ fontWeight: 800, fontSize: "18px", color: "#0f2942" }}>
                          Choose Hotel in {activeStayObj.destination} ({calculateNights(activeStayObj.checkIn, activeStayObj.checkOut)} nights)
                        </Typography>
                        <Typography sx={{ fontSize: "12.5px", color: "#526B86" }}>
                          {activeStayObj.checkIn} → {activeStayObj.checkOut} • {activeStayObj.rooms} room(s) • All prices in USD
                        </Typography>
                      </Box>

                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshRoundedIcon fontSize="small" />}
                        onClick={() => runHotelSearchForStay(activeStayObj, fc)}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Refresh Hotels
                      </Button>
                    </Box>

                    {/* Quick Hotel Filters */}
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                      alignItems="center"
                      sx={{ mb: 2 }}
                    >
                      <input
                        type="search"
                        aria-label="Filter hotels by name"
                        className="flyjatt-native-input"
                        placeholder="Filter hotel name..."
                        style={{ maxWidth: 230, minBlockSize: "38px" }}
                        value={activeStayFilter.query}
                        onChange={(e) =>
                          updateActiveStayFilter({ query: e.target.value })
                        }
                      />
                      <Chip
                        clickable
                        size="small"
                        label="Open / Available"
                        color={activeStayFilter.openOnly ? "primary" : "default"}
                        onClick={() =>
                          updateActiveStayFilter({ openOnly: !activeStayFilter.openOnly })
                        }
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        clickable
                        size="small"
                        label="With Pool"
                        color={activeStayFilter.poolOnly ? "primary" : "default"}
                        onClick={() =>
                          updateActiveStayFilter({ poolOnly: !activeStayFilter.poolOnly })
                        }
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        clickable
                        size="small"
                        label="4+ Stars"
                        color={activeStayFilter.minStar >= 4 ? "primary" : "default"}
                        onClick={() =>
                          updateActiveStayFilter({
                            minStar: activeStayFilter.minStar >= 4 ? 0 : 4,
                          })
                        }
                        sx={{ fontWeight: 700 }}
                      />
                      <select
                        aria-label="Sort hotels"
                        className="flyjatt-native-select"
                        style={{ width: "auto", minBlockSize: "38px" }}
                        value={activeStayFilter.sort}
                        onChange={(e) =>
                          updateActiveStayFilter({ sort: e.target.value })
                        }
                      >
                        <option value="price_asc">Lowest Nightly Price (USD)</option>
                        <option value="star_desc">Highest Star Rating</option>
                      </select>
                    </Stack>

                    {stayResultsById[activeStayObj.id]?.loading && (
                      <Box sx={{ py: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
                        <CircularProgress size={24} />
                        <Typography sx={{ fontWeight: 700, color: "#0b4a82" }}>
                          Searching live Travelport Stays in {activeStayObj.destination}...
                        </Typography>
                      </Box>
                    )}

                    {!stayResultsById[activeStayObj.id]?.loading &&
                      stayResultsById[activeStayObj.id]?.error && (
                        <Alert
                          severity="error"
                          action={
                            <Button
                              type="button"
                              size="small"
                              color="inherit"
                              onClick={() => runHotelSearchForStay(activeStayObj, fc)}
                            >
                              Retry
                            </Button>
                          }
                        >
                          {stayResultsById[activeStayObj.id].error}
                        </Alert>
                      )}

                    {!stayResultsById[activeStayObj.id]?.loading &&
                      !stayResultsById[activeStayObj.id]?.error &&
                      visibleStayProperties.length === 0 && (
                        <Alert severity="info">
                          No hotels matched your filter for {activeStayObj.destination}. Try clearing filters or adjusting your stay plan above.
                        </Alert>
                      )}

                    {!stayResultsById[activeStayObj.id]?.loading &&
                      visibleStayProperties.map((property) => {
                        const key = `${activeStayObj.id}:${property.propertyCode}`;
                        const isDrawerOpen = openHotelKey === key;
                        const roomState = roomsCacheByKey[key];
                        const chosenForStay =
                          selectedStayPlan[activeStayObj.id]?.property?.propertyCode ===
                          property.propertyCode;
                        const stayNights = calculateNights(
                          activeStayObj.checkIn,
                          activeStayObj.checkOut
                        );

                        return (
                          <Box
                            key={`${property.chainCode}-${property.propertyCode}`}
                            sx={{
                              border: chosenForStay
                                ? "2px solid #16a34a"
                                : "1px solid #d7e6f5",
                              bgcolor: chosenForStay ? "#f0fdf4" : "#fbfdff",
                              borderRadius: "14px",
                              p: 2,
                              mb: 1.6,
                            }}
                          >
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={3}>
                                <Box
                                  sx={{
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                    bgcolor: "#e8f2fb",
                                    aspectRatio: "16 / 11",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {property.imageUrl ? (
                                    <img
                                      src={property.imageUrl}
                                      alt={property.hotelName}
                                      loading="lazy"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                      }}
                                    />
                                  ) : (
                                    <HotelRoundedIcon sx={{ fontSize: 40, color: "#7aa7cc" }} />
                                  )}
                                </Box>
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                  <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#0f2942" }}>
                                    {property.hotelName}
                                  </Typography>
                                  {chosenForStay && (
                                    <Chip
                                      size="small"
                                      color="success"
                                      label="Selected for Stay ✓"
                                      sx={{ fontWeight: 800, height: 22 }}
                                    />
                                  )}
                                </Stack>
                                {property.starRating !== null && property.starRating !== undefined && (
                                  <Rating
                                    value={Number(property.starRating)}
                                    precision={0.5}
                                    readOnly
                                    size="small"
                                    sx={{ mt: 0.3 }}
                                  />
                                )}
                                <Typography sx={{ fontSize: "12.5px", color: "#526B86", mt: 0.3 }}>
                                  {property.address}
                                  {property.distanceKm !== null && property.distanceKm !== undefined
                                    ? ` • ${property.distanceKm} km from center`
                                    : ""}
                                </Typography>
                                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.9 }}>
                                  <Chip
                                    size="small"
                                    label={property.available ? "Available" : "Check Dates"}
                                    color={property.available ? "success" : "default"}
                                    variant="outlined"
                                    sx={{ fontSize: "11px", fontWeight: 700, height: 22 }}
                                  />
                                  {property.amenityFlags?.hasPool && (
                                    <Chip size="small" label="Pool" sx={{ fontSize: "11px", height: 22, fontWeight: 600 }} />
                                  )}
                                  {property.amenityFlags?.hasWifi && (
                                    <Chip size="small" label="Wi-Fi" sx={{ fontSize: "11px", height: 22, fontWeight: 600 }} />
                                  )}
                                  {property.amenityFlags?.hasBreakfast && (
                                    <Chip size="small" label="Breakfast" sx={{ fontSize: "11px", height: 22, fontWeight: 600 }} />
                                  )}
                                </Stack>
                              </Grid>

                              <Grid item xs={12} sm={3} sx={{ textAlign: { xs: "left", sm: "right" } }}>
                                {property.minNightlyPrice !== null && property.minNightlyPrice !== undefined ? (
                                  <>
                                    <Typography sx={{ fontSize: "19px", fontWeight: 800, color: "#0b4a82" }}>
                                      USD ${Number(property.minNightlyPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      <Typography component="span" sx={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
                                        {" "}/ night
                                      </Typography>
                                    </Typography>
                                    <Typography sx={{ fontSize: "12px", color: "#526B86", mb: 1 }}>
                                      Est. USD ${Number(property.minTotalPrice ?? property.minNightlyPrice * stayNights).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({stayNights}n)
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0b4a82", mb: 1 }}>
                                    Check live room rates
                                  </Typography>
                                )}

                                <Stack spacing={0.8} alignItems={{ xs: "stretch", sm: "flex-end" }}>
                                  <Button
                                    type="button"
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleToggleHotelRooms(activeStayObj, property)}
                                    sx={{
                                      textTransform: "none",
                                      fontWeight: 800,
                                      borderRadius: "10px",
                                      minHeight: "40px",
                                      background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                                    }}
                                  >
                                    {isDrawerOpen ? "Hide Rooms" : "Select Room"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="small"
                                    variant="text"
                                    endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => handleOpenHotelDetailsPage(activeStayObj, property)}
                                    sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
                                  >
                                    Full Hotel Page
                                  </Button>
                                </Stack>
                              </Grid>
                            </Grid>

                            {/* Inline Step 3 Live Room Availability Picker */}
                            <Collapse in={isDrawerOpen}>
                              <Divider sx={{ my: 1.5 }} />
                              {roomState?.loading && (
                                <Box sx={{ py: 2.5, display: "flex", alignItems: "center", gap: 1.2 }}>
                                  <CircularProgress size={18} />
                                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0b4a82" }}>
                                    Loading live Travelport room rates (USD) for {activeStayObj.checkIn} → {activeStayObj.checkOut}...
                                  </Typography>
                                </Box>
                              )}

                              {!roomState?.loading && roomState?.error && (
                                <Alert
                                  severity="error"
                                  action={
                                    <Button
                                      type="button"
                                      size="small"
                                      color="inherit"
                                      onClick={() => fetchRoomsForHotel(activeStayObj, property)}
                                    >
                                      Retry
                                    </Button>
                                  }
                                >
                                  {roomState.error}
                                </Alert>
                              )}

                              {!roomState?.loading && !roomState?.error && roomState?.warning && roomState.offers.length === 0 && (
                                <Alert
                                  severity="warning"
                                  action={
                                    <Button
                                      type="button"
                                      size="small"
                                      color="inherit"
                                      onClick={() => fetchRoomsForHotel(activeStayObj, property)}
                                    >
                                      Retry Now
                                    </Button>
                                  }
                                >
                                  Supplier Notice: {roomState.warning}
                                </Alert>
                              )}

                              {!roomState?.loading &&
                                Array.isArray(roomState?.offers) &&
                                roomState.offers.slice(0, 12).map((offer) => {
                                  const isPickedRoom =
                                    selectedStayPlan[activeStayObj.id]?.roomOffer?.offerId ===
                                    offer.offerId;
                                  const ruleState = rulesCacheByOfferId[offer.offerId];
                                  return (
                                    <Box
                                      key={offer.offerId}
                                      sx={{
                                        p: 1.5,
                                        mb: 1,
                                        borderRadius: "10px",
                                        bgcolor: isPickedRoom ? "#dcfce7" : "#ffffff",
                                        border: isPickedRoom
                                          ? "1.5px solid #16a34a"
                                          : "1px solid #dbe7f3",
                                      }}
                                    >
                                      <Grid container spacing={1.5} alignItems="center">
                                        <Grid item xs={12} md={8}>
                                          <Typography sx={{ fontWeight: 800, fontSize: "14px", color: "#0f2942" }}>
                                            {offer.roomName}
                                          </Typography>
                                          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mt: 0.7 }}>
                                            {offer.bedType && (
                                              <Chip size="small" icon={<BedRoundedIcon sx={{ fontSize: "13px !important" }} />} label={offer.bedType} sx={{ height: 22, fontSize: "11px", fontWeight: 700 }} />
                                            )}
                                            <Chip size="small" icon={<RestaurantRoundedIcon sx={{ fontSize: "13px !important" }} />} label={offer.mealPlan} sx={{ height: 22, fontSize: "11px", fontWeight: 700 }} />
                                            <Chip size="small" icon={<VerifiedUserRoundedIcon sx={{ fontSize: "13px !important" }} />} label={offer.cancellationSummary} color={offer.freeCancellation ? "success" : "warning"} variant="outlined" sx={{ height: 22, fontSize: "11px", fontWeight: 700 }} />
                                          </Stack>
                                          <Button
                                            type="button"
                                            size="small"
                                            sx={{ mt: 0.5, p: 0, textTransform: "none", fontSize: "12px", fontWeight: 700 }}
                                            onClick={() => handleLoadRoomRules(property, offer)}
                                          >
                                            {ruleState?.loading
                                              ? "Loading Rate Rules..."
                                              : ruleState?.loaded
                                                ? "Verified Rate Rules Loaded ✓"
                                                : "Check Rate Rules (v11 Step 4)"}
                                          </Button>
                                          {ruleState?.rules?.cancellationPolicy && (
                                            <Typography sx={{ fontSize: "11.5px", color: "#334155", mt: 0.4 }}>
                                              <strong>Cancellation:</strong>{" "}
                                              {ruleState.rules.cancellationPolicy.slice(0, 180)}
                                            </Typography>
                                          )}
                                        </Grid>
                                        <Grid item xs={12} md={4} sx={{ textAlign: { xs: "left", md: "right" } }}>
                                          <Typography sx={{ fontWeight: 800, fontSize: "16.5px", color: "#0b4a82" }}>
                                            USD ${Number(offer.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </Typography>
                                          <Typography sx={{ fontSize: "11.5px", color: "#64748b", mb: 0.7 }}>
                                            USD ${Number(offer.nightlyTotalPrice || offer.nightlyPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / night
                                          </Typography>
                                          <Button
                                            type="button"
                                            size="small"
                                            variant={isPickedRoom ? "outlined" : "contained"}
                                            color={isPickedRoom ? "success" : "primary"}
                                            onClick={() =>
                                              handleSelectStayRoom(activeStayObj, property, offer)
                                            }
                                            sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}
                                          >
                                            {isPickedRoom ? "Picked for Package ✓" : "Add Room to Package"}
                                          </Button>
                                        </Grid>
                                      </Grid>
                                    </Box>
                                  );
                                })}
                            </Collapse>
                          </Box>
                        );
                      })}
                  </Box>
                )}
              </Stack>
            )}
          </Grid>

          {/* Right Sticky Column: Complete Package Itinerary & Totals */}
          <Grid item xs={12} lg={3.5}>
            <Box
              sx={{
                position: { lg: "sticky" },
                top: 20,
                bgcolor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #d7e6f5",
                p: 2.3,
                boxShadow: "0 12px 28px rgba(8, 49, 85, 0.08)",
              }}
            >
              <Typography component="h2" sx={{ fontWeight: 800, fontSize: "17px", color: "#0f2942" }}>
                Your Package Summary
              </Typography>
              <Typography sx={{ fontSize: "12.5px", color: "#526B86", mt: 0.3 }}>
                {packageStep === "flight"
                  ? "Step 1: Select your round-trip flight first, then choose hotels in Step 2."
                  : `${summaryTotals.totalStayNights} of ${calculateNights(fc.departureDate, fc.returnDate)} trip nights planned across ${packageRequest.hotelStays.length} stay${packageRequest.hotelStays.length > 1 ? "s" : ""}`}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {/* Flight Summary Row */}
              <Box sx={{ mb: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontWeight: 800, fontSize: "13.5px", color: "#0b4a82" }}>
                    ✈ Flight ({fc.fromCode} ↔ {fc.toCode})
                  </Typography>
                  {selectedFlight ? (
                    <Typography sx={{ fontWeight: 800, fontSize: "14px", color: "#0f2942" }}>
                      {selectedFlight.isAlreadyBooked
                        ? `PNR ${selectedFlight.pnr}`
                        : `${selectedFlight.CurrencyCode || "USD"} ${Number(selectedFlight.NetFare || 0).toLocaleString()}`}
                    </Typography>
                  ) : (
                    <Chip size="small" label="Step 1" color="primary" sx={{ height: 20, fontSize: "11px", fontWeight: 700 }} />
                  )}
                </Stack>
                {selectedFlight ? (
                  <Typography sx={{ fontSize: "12px", color: "#475569", mt: 0.3 }}>
                    {selectedFlight.CarrierName || selectedFlight.Carrier} • {fc.departureDate} → {fc.returnDate}
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.3 }}>
                    Pick a round-trip flight on the left to unlock Hotel Stays.
                  </Typography>
                )}
              </Box>

              {/* Stay Leg Summary Rows (shown once in Step 2) */}
              {packageStep === "hotels" ? (
                packageRequest.hotelStays.map((stay, idx) => {
                  const sel = selectedStayPlan[stay.id];
                  const n = calculateNights(stay.checkIn, stay.checkOut);
                  return (
                    <Box
                      key={stay.id}
                      sx={{
                        p: 1.2,
                        mb: 1.2,
                        borderRadius: "10px",
                        bgcolor: sel ? "#f0fdf4" : "#f8fafc",
                        border: sel ? "1px solid #bbf7d0" : "1px dashed #cbd5e1",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 800, fontSize: "13px", color: "#0f2942" }}>
                          🏨 Stay {idx + 1}: {stay.cityCode} ({n}n)
                        </Typography>
                        {sel ? (
                          <Typography sx={{ fontWeight: 800, fontSize: "13.5px", color: "#15803d" }}>
                            USD ${Number(sel.roomOffer.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        ) : (
                          <Button
                            type="button"
                            size="small"
                            onClick={() => setActiveStayId(stay.id)}
                            sx={{ p: 0, minWidth: 0, textTransform: "none", fontSize: "12px", fontWeight: 800 }}
                          >
                            Pick Hotel →
                          </Button>
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: "11.5px", color: "#475569", mt: 0.3 }}>
                        {stay.checkIn} → {stay.checkOut}
                      </Typography>
                      {sel && (
                        <Typography sx={{ fontSize: "12px", color: "#166534", fontWeight: 700, mt: 0.3 }}>
                          {sel.property.hotelName} — {sel.roomOffer.roomName}
                        </Typography>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Box
                  sx={{
                    p: 1.4,
                    mb: 1.2,
                    borderRadius: "10px",
                    bgcolor: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: "13px", color: "#475569" }}>
                    🏨 Step 2: Hotel Stays Plan
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.4 }}>
                    Automatically unlocks after you select your flight — with arrival city matching and multi-city split stays.
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              {/* Combined Package Total */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#0f2942" }}>
                  Package Total
                </Typography>
                <Box sx={{ textAlign: "right" }}>
                  {summaryTotals.sameCurrency ? (
                    <Typography sx={{ fontWeight: 800, fontSize: "22px", color: "#0b4a82" }}>
                      USD ${summaryTotals.combinedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  ) : (
                    <>
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#0b4a82" }}>
                        Flight: {summaryTotals.flightCurrency}{" "}
                        {summaryTotals.flightPrice.toLocaleString()}
                      </Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#15803d" }}>
                        Stays: USD ${summaryTotals.hotelsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Checkout Buttons */}
              <Stack spacing={1}>
                {!selectedFlight?.isAlreadyBooked && (
                  <Button
                    type="button"
                    fullWidth
                    variant="contained"
                    disabled={!selectedFlight}
                    onClick={handleProceedBookFlight}
                    sx={{
                      minHeight: "44px",
                      borderRadius: "10px",
                      textTransform: "none",
                      fontWeight: 800,
                      background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                    }}
                  >
                    {selectedFlight
                      ? `Book Selected Flight (${fc.fromCode} ↔ ${fc.toCode})`
                      : "Select a Flight First"}
                  </Button>
                )}

                {packageStep === "hotels" &&
                  packageRequest.hotelStays.map((stay, idx) => {
                    const chosen = selectedStayPlan[stay.id];
                    return (
                      <Button
                        key={stay.id}
                        type="button"
                        fullWidth
                        variant="outlined"
                        disabled={!chosen}
                        onClick={() => handleProceedBookStay(stay.id)}
                        sx={{
                          minHeight: "42px",
                          borderRadius: "10px",
                          textTransform: "none",
                          fontWeight: 700,
                        }}
                      >
                        {chosen
                          ? `Reserve Stay ${idx + 1}: ${stay.cityCode} (USD $${Number(chosen.roomOffer.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                          : `Select Hotel for Stay ${idx + 1} (${stay.cityCode})`}
                      </Button>
                    );
                  })}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default PackageBuilder;
