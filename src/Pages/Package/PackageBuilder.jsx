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
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import PackageSearchBox from "./PackageSearchBox";
import { searchTravelportFlights } from "../../utils/travelportSearch";
import {
  POPULAR_STAY_DESTINATIONS,
  addDaysToIsoDate,
  calculateNights,
  extractDestinationCityCode,
  fetchTravelportHotelAvailability,
  fetchTravelportHotelRules,
  formatIsoDateOffset,
  getDestinationLabelByCode,
  resolveStayDestinationFromAirport,
  searchTravelportHotels,
} from "../../utils/travelportHotel";

function createDefaultPackageRequest() {
  const dep = formatIsoDateOffset(7);
  const ret = formatIsoDateOffset(22); // 15-day Dubai package default
  const splitMid = addDaysToIsoDate(dep, 7);
  const splitEnd = addDaysToIsoDate(splitMid, 7);
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
    hotelStays: [
      {
        id: "stay-1",
        destination: "Dubai (DXB)",
        cityCode: "DXB",
        checkIn: dep,
        checkOut: splitMid,
        nights: 7,
        rooms: 1,
      },
      {
        id: "stay-2",
        destination: "Abu Dhabi (AUH)",
        cityCode: "AUH",
        checkIn: splitMid,
        checkOut: splitEnd,
        nights: 7,
        rooms: 1,
      },
    ],
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
    if (location?.state?.flightCriteria && location?.state?.hotelStays) {
      return location.state;
    }
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:last_package_search");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.flightCriteria && Array.isArray(parsed?.hotelStays)) {
            return parsed;
          }
        }
      }
    } catch {
      // ignore
    }
    return createDefaultPackageRequest();
  }, [location?.state]);

  const [packageRequest, setPackageRequest] = useState(initialPackage);
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [activeTab, setActiveTab] = useState("flight"); // "flight" | stay.id

  // Flight search state
  const [flights, setFlights] = useState([]);
  const [flightsLoading, setFlightsLoading] = useState(true);
  const [flightsError, setFlightsError] = useState("");
  const [flightStopsFilter, setFlightStopsFilter] = useState("all");
  const [flightSort, setFlightSort] = useState("price_asc");
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Stay hotel search state per stay.id
  const [stayResultsById, setStayResultsById] = useState({});
  // Selected hotel + room per stay.id: { [stayId]: { property, roomOffer, rateRules } }
  const [selectedStayPlan, setSelectedStayPlan] = useState({});
  // Inline hotel filter per stay.id
  const [stayFiltersById, setStayFiltersById] = useState({});
  // Inline room availability drawer per `${stayId}:${propertyCode}`
  const [openHotelKey, setOpenHotelKey] = useState("");
  const [roomsCacheByKey, setRoomsCacheByKey] = useState({});
  const [rulesCacheByOfferId, setRulesCacheByOfferId] = useState({});

  const runFlightSearch = useCallback(
    async (flightCriteria) => {
      setFlightsLoading(true);
      setFlightsError("");
      setSelectedFlight(null);
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
        if (sorted.length > 0) {
          setSelectedFlight(sorted[0]);
        }
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
            currency: flightCriteria.currency || "USD",
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

  // Execute live Flight + parallel live Hotel searches whenever packageRequest changes
  useEffect(() => {
    runFlightSearch(packageRequest.flightCriteria);
    packageRequest.hotelStays.forEach((stay) => {
      runHotelSearchForStay(stay, packageRequest.flightCriteria);
    });
  }, [packageRequest, runFlightSearch, runHotelSearchForStay]);

  const handleModifySubmit = (nextPayload) => {
    setPackageRequest(nextPayload);
    setSelectedStayPlan({});
    setOpenHotelKey("");
    setActiveTab("flight");
    setShowModifyForm(false);
  };

  // Inline stay edit (city/dates/rooms) right inside the Stay tab
  const handleInlineStayUpdate = (stayId, patch) => {
    setPackageRequest((prev) => {
      const nextStays = prev.hotelStays.map((s) => {
        if (s.id !== stayId) return s;
        const merged = { ...s, ...patch };
        if (patch.destination !== undefined) {
          merged.cityCode =
            extractDestinationCityCode(patch.destination) || s.cityCode;
        }
        if (merged.checkOut <= merged.checkIn) {
          merged.checkOut = addDaysToIsoDate(merged.checkIn, 1);
        }
        merged.nights = calculateNights(merged.checkIn, merged.checkOut);
        return merged;
      });
      const updated = { ...prev, hotelStays: nextStays };
      try {
        window.sessionStorage.setItem(
          "flyjatt:last_package_search",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      const changedStay = nextStays.find((s) => s.id === stayId);
      if (changedStay) {
        runHotelSearchForStay(changedStay, prev.flightCriteria);
      }
      return updated;
    });
    setSelectedStayPlan((prev) => {
      const copy = { ...prev };
      delete copy[stayId];
      return copy;
    });
  };

  // Add another city stay directly from the Package Builder tab bar
  const handleAddStayInline = () => {
    if (packageRequest.hotelStays.length >= 5) return;
    const lastStay =
      packageRequest.hotelStays[packageRequest.hotelStays.length - 1];
    const arrivalInfo = resolveStayDestinationFromAirport(
      packageRequest.flightCriteria.toCode
    );
    const used = new Set(packageRequest.hotelStays.map((s) => s.cityCode));
    const nextCode =
      (arrivalInfo.companions || []).find((c) => !used.has(c)) ||
      POPULAR_STAY_DESTINATIONS.find((d) => !used.has(d.code))?.code ||
      "AUH";

    let checkIn = lastStay?.checkOut || packageRequest.flightCriteria.departureDate;
    let checkOut = packageRequest.flightCriteria.returnDate;
    let updatedExisting = packageRequest.hotelStays;

    if (checkIn >= checkOut && lastStay) {
      const lastNights = calculateNights(lastStay.checkIn, lastStay.checkOut);
      if (lastNights >= 2) {
        const splitDate = addDaysToIsoDate(
          lastStay.checkIn,
          Math.floor(lastNights / 2)
        );
        updatedExisting = packageRequest.hotelStays.map((s, idx) =>
          idx === packageRequest.hotelStays.length - 1
            ? {
                ...s,
                checkOut: splitDate,
                nights: calculateNights(s.checkIn, splitDate),
              }
            : s
        );
        checkIn = splitDate;
      } else {
        checkOut = addDaysToIsoDate(checkIn, 2);
      }
    }

    const newStay = {
      id: `stay-${Date.now()}`,
      destination: getDestinationLabelByCode(nextCode),
      cityCode: nextCode,
      checkIn,
      checkOut,
      nights: calculateNights(checkIn, checkOut),
      rooms: lastStay?.rooms || 1,
    };

    const nextPkg = {
      ...packageRequest,
      hotelStays: [...updatedExisting, newStay],
    };
    setPackageRequest(nextPkg);
    setActiveTab(newStay.id);
    runHotelSearchForStay(newStay, packageRequest.flightCriteria);
  };

  // Load Step 3 live room availability inline for a hotel in a stay leg
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
          currency: packageRequest.flightCriteria.currency || "USD",
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

    // Auto-advance to the next unselected stay leg if one exists
    const nextUnselected = packageRequest.hotelStays.find(
      (s) => s.id !== stay.id && !selectedStayPlan[s.id]
    );
    if (nextUnselected) {
      setActiveTab(nextUnselected.id);
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
      currency: packageRequest.flightCriteria.currency || "USD",
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
      currency: packageRequest.flightCriteria.currency || "USD",
    });
    navigate(`/hoteldetails?${qs.toString()}`, {
      state: { property, searchCriteria },
    });
  };

  const handleProceedBookFlight = () => {
    if (!selectedFlight) return;
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
        currency:
          chosen.roomOffer?.currencyCode ||
          packageRequest.flightCriteria.currency ||
          "USD",
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
    const flightCurrency =
      selectedFlight?.CurrencyCode ||
      packageRequest.flightCriteria.currency ||
      "USD";

    let hotelsTotal = 0;
    let selectedStaysCount = 0;
    const hotelCurrencies = new Set();

    packageRequest.hotelStays.forEach((stay) => {
      const sel = selectedStayPlan[stay.id];
      if (sel?.roomOffer) {
        selectedStaysCount += 1;
        hotelsTotal += Number(sel.roomOffer.totalPrice || 0);
        if (sel.roomOffer.currencyCode) {
          hotelCurrencies.add(sel.roomOffer.currencyCode);
        }
      }
    });

    const totalStayNights = packageRequest.hotelStays.reduce(
      (acc, s) => acc + calculateNights(s.checkIn, s.checkOut),
      0
    );

    const sameCurrency =
      hotelCurrencies.size === 0 ||
      (hotelCurrencies.size === 1 && hotelCurrencies.has(flightCurrency));

    return {
      flightPrice,
      flightCurrency,
      hotelsTotal,
      hotelCurrency: Array.from(hotelCurrencies)[0] || flightCurrency,
      selectedStaysCount,
      totalStaysCount: packageRequest.hotelStays.length,
      totalStayNights,
      sameCurrency,
      combinedTotal: flightPrice + hotelsTotal,
    };
  }, [packageRequest, selectedFlight, selectedStayPlan]);

  const activeStayObj = useMemo(
    () => packageRequest.hotelStays.find((s) => s.id === activeTab) || null,
    [activeTab, packageRequest.hotelStays]
  );

  const activeStayFilter = stayFiltersById[activeTab] || {
    query: "",
    openOnly: true,
    poolOnly: false,
    minStar: 0,
    sort: "price_asc",
  };

  const updateActiveStayFilter = (patch) => {
    setStayFiltersById((prev) => ({
      ...prev,
      [activeTab]: { ...activeStayFilter, ...patch },
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
      const openList = list.filter((p) => p.availability === "Open");
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
        const pa = a.lowestNightlyPrice ?? Number.MAX_SAFE_INTEGER;
        const pb = b.lowestNightlyPrice ?? Number.MAX_SAFE_INTEGER;
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
                {" • "}
                {packageRequest.hotelStays.map((s) => `${s.cityCode} (${calculateNights(s.checkIn, s.checkOut)}n)`).join(" + ")}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                type="button"
                variant="contained"
                size="small"
                startIcon={<EditRoundedIcon />}
                onClick={() => setShowModifyForm((v) => !v)}
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
                {showModifyForm ? "Hide Search Editor" : "Modify Package & Split Stays"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="small"
                startIcon={<AddCircleOutlineRoundedIcon />}
                disabled={packageRequest.hotelStays.length >= 5}
                onClick={handleAddStayInline}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.5)",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: "10px",
                  "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                + Add City Stay
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* Collapsible Full Package Search Editor */}
        <Collapse in={showModifyForm}>
          <Box sx={{ mb: 2.5 }}>
            <PackageSearchBox
              compact
              initialValues={packageRequest}
              onSearchSubmit={handleModifySubmit}
            />
          </Box>
        </Collapse>

        <Grid container spacing={2.5} alignItems="flex-start">
          {/* Left Main Column: Flight & Multi-Stay Hotel Tabs */}
          <Grid item xs={12} lg={8.5}>
            {/* Step Tabs */}
            <Box
              sx={{
                bgcolor: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #d7e6f5",
                mb: 2,
                px: 1,
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Package itinerary legs"
              >
                <Tab
                  value="flight"
                  icon={
                    selectedFlight ? (
                      <CheckCircleRoundedIcon color="success" fontSize="small" />
                    ) : (
                      <FlightTakeoffRoundedIcon fontSize="small" />
                    )
                  }
                  iconPosition="start"
                  label={`Flight: ${fc.fromCode} ↔ ${fc.toCode}`}
                  sx={{ textTransform: "none", fontWeight: 800, minHeight: 54 }}
                />
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
                      label={`Stay ${idx + 1}: ${stay.cityCode} (${n}n)`}
                      sx={{ textTransform: "none", fontWeight: 800, minHeight: 54 }}
                    />
                  );
                })}
              </Tabs>
            </Box>

            {/* TAB CONTENT: FLIGHT SELECTION */}
            {activeTab === "flight" && (
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
                    <Typography component="h2" sx={{ fontWeight: 800, fontSize: "18px", color: "#0f2942" }}>
                      Step 1: Choose Round-Trip Flight ({visibleFlights.length} live offers)
                    </Typography>
                    <Typography sx={{ fontSize: "13px", color: "#526B86" }}>
                      {fc.fromLabel} ↔ {fc.toLabel} • {fc.departureDate} to {fc.returnDate}
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
                          <Grid item xs={12} md={8.5}>
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

                          <Grid item xs={12} md={3.5} sx={{ textAlign: { xs: "left", md: "right" } }}>
                            <Typography sx={{ fontSize: "21px", fontWeight: 800, color: "#0b4a82" }}>
                              {flight.CurrencyCode} {Number(flight.NetFare || 0).toLocaleString()}
                            </Typography>
                            <Typography sx={{ fontSize: "12px", color: "#64748b", mb: 1 }}>
                              Round-trip total (incl. taxes)
                            </Typography>
                            <Button
                              type="button"
                              variant={isSelected ? "outlined" : "contained"}
                              color={isSelected ? "success" : "primary"}
                              onClick={() => {
                                setSelectedFlight(flight);
                                if (packageRequest.hotelStays[0]) {
                                  setActiveTab(packageRequest.hotelStays[0].id);
                                }
                              }}
                              sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                borderRadius: "10px",
                                minHeight: "42px",
                                ...(!isSelected
                                  ? { background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)" }
                                  : {}),
                              }}
                            >
                              {isSelected ? "Selected ✓ (Next: Hotels)" : "Select Flight"}
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
              </Box>
            )}

            {/* TAB CONTENT: HOTEL STAY LEG SELECTION */}
            {activeStayObj && (
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #d7e6f5",
                  p: { xs: 2, md: 2.5 },
                }}
              >
                {/* Inline Stay Editor Bar */}
                <Box
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: "12px",
                    bgcolor: "#f8fbff",
                    border: "1px solid #d7e6f5",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography sx={{ fontWeight: 800, fontSize: "15.5px", color: "#0b4a82" }}>
                      Stay Leg: {activeStayObj.destination} ({calculateNights(activeStayObj.checkIn, activeStayObj.checkOut)} nights)
                    </Typography>
                    <Stack direction="row" spacing={0.8}>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        startIcon={<CallSplitRoundedIcon fontSize="small" />}
                        disabled={
                          packageRequest.hotelStays.length >= 5 ||
                          calculateNights(activeStayObj.checkIn, activeStayObj.checkOut) < 2
                        }
                        onClick={handleAddStayInline}
                        sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
                      >
                        Split / Add Another City
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshRoundedIcon fontSize="small" />}
                        onClick={() => runHotelSearchForStay(activeStayObj, fc)}
                        sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
                      >
                        Refresh Hotels
                      </Button>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        md: "1.4fr 1fr 1fr 0.8fr",
                      },
                      gap: 1,
                    }}
                  >
                    <Box className="flyjatt-stay-field">
                      <label htmlFor="pkg-inline-city" className="flyjatt-stay-label">
                        Change City
                      </label>
                      <select
                        id="pkg-inline-city"
                        className="flyjatt-native-select"
                        value={activeStayObj.cityCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          handleInlineStayUpdate(activeStayObj.id, {
                            cityCode: code,
                            destination: getDestinationLabelByCode(code),
                          });
                        }}
                      >
                        {POPULAR_STAY_DESTINATIONS.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </Box>

                    <Box className="flyjatt-stay-field">
                      <label htmlFor="pkg-inline-in" className="flyjatt-stay-label">
                        Check-in
                      </label>
                      <input
                        id="pkg-inline-in"
                        type="date"
                        className="flyjatt-native-input"
                        value={activeStayObj.checkIn}
                        onChange={(e) =>
                          handleInlineStayUpdate(activeStayObj.id, {
                            checkIn: e.target.value,
                          })
                        }
                      />
                    </Box>

                    <Box className="flyjatt-stay-field">
                      <label htmlFor="pkg-inline-out" className="flyjatt-stay-label">
                        Check-out
                      </label>
                      <input
                        id="pkg-inline-out"
                        type="date"
                        min={activeStayObj.checkIn}
                        className="flyjatt-native-input"
                        value={activeStayObj.checkOut}
                        onChange={(e) =>
                          handleInlineStayUpdate(activeStayObj.id, {
                            checkOut: e.target.value,
                          })
                        }
                      />
                    </Box>

                    <Box className="flyjatt-stay-field">
                      <label htmlFor="pkg-inline-rooms" className="flyjatt-stay-label">
                        Rooms
                      </label>
                      <select
                        id="pkg-inline-rooms"
                        className="flyjatt-native-select"
                        value={activeStayObj.rooms || 1}
                        onChange={(e) =>
                          handleInlineStayUpdate(activeStayObj.id, {
                            rooms: Number(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} Room{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </Box>
                  </Box>
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
                    <option value="price_asc">Lowest Nightly Price</option>
                    <option value="star_desc">Highest Star Rating</option>
                  </select>
                </Stack>

                {/* Loading / Error / Properties List */}
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
                      No hotels matched your filter for {activeStayObj.destination}. Try clearing filters or changing city/dates.
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
                                label={property.availability === "Open" ? "Available" : property.availability}
                                color={property.availability === "Open" ? "success" : "default"}
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
                            {property.lowestNightlyPrice !== null ? (
                              <>
                                <Typography sx={{ fontSize: "19px", fontWeight: 800, color: "#0b4a82" }}>
                                  {property.currencyCode} {Math.round(property.lowestNightlyPrice).toLocaleString()}
                                  <Typography component="span" sx={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
                                    {" "}/ night
                                  </Typography>
                                </Typography>
                                <Typography sx={{ fontSize: "12px", color: "#526B86", mb: 1 }}>
                                  Est. {property.currencyCode}{" "}
                                  {Math.round(property.lowestNightlyPrice * stayNights).toLocaleString()} ({stayNights}n)
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
                                Loading live Travelport room rates for {activeStayObj.checkIn} → {activeStayObj.checkOut}...
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
                                        <Chip size="small" icon={<VerifiedUserRoundedIcon sx={{ fontSize: "13px !important" }} />} label={offer.cancellationSummary} color={offer.refundable ? "success" : "default"} variant="outlined" sx={{ height: 22, fontSize: "11px", fontWeight: 700 }} />
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
                                        {offer.currencyCode} {Number(offer.totalPrice || 0).toLocaleString()}
                                      </Typography>
                                      <Typography sx={{ fontSize: "11.5px", color: "#64748b", mb: 0.7 }}>
                                        {offer.currencyCode} {Math.round(offer.nightlyPrice || 0).toLocaleString()} / night
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
                Your Organized Package
              </Typography>
              <Typography sx={{ fontSize: "12.5px", color: "#526B86", mt: 0.3 }}>
                {summaryTotals.totalStayNights} of {calculateNights(fc.departureDate, fc.returnDate)} trip nights covered across{" "}
                {packageRequest.hotelStays.length} stay{packageRequest.hotelStays.length > 1 ? "s" : ""}
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
                      {selectedFlight.CurrencyCode} {Number(selectedFlight.NetFare || 0).toLocaleString()}
                    </Typography>
                  ) : (
                    <Chip size="small" label="Pending" sx={{ height: 20, fontSize: "11px" }} />
                  )}
                </Stack>
                {selectedFlight ? (
                  <Typography sx={{ fontSize: "12px", color: "#475569", mt: 0.3 }}>
                    {selectedFlight.CarrierName || selectedFlight.Carrier} • {fc.departureDate} → {fc.returnDate}
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.3 }}>
                    Choose a round-trip flight on the Flight tab.
                  </Typography>
                )}
              </Box>

              {/* Stay Leg Summary Rows */}
              {packageRequest.hotelStays.map((stay, idx) => {
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
                          {sel.roomOffer.currencyCode}{" "}
                          {Number(sel.roomOffer.totalPrice || 0).toLocaleString()}
                        </Typography>
                      ) : (
                        <Button
                          type="button"
                          size="small"
                          onClick={() => setActiveTab(stay.id)}
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
              })}

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
                      {summaryTotals.flightCurrency}{" "}
                      {Math.round(summaryTotals.combinedTotal).toLocaleString()}
                    </Typography>
                  ) : (
                    <>
                      <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#0b4a82" }}>
                        Flight: {summaryTotals.flightCurrency}{" "}
                        {Math.round(summaryTotals.flightPrice).toLocaleString()}
                      </Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#15803d" }}>
                        Stays: {summaryTotals.hotelCurrency}{" "}
                        {Math.round(summaryTotals.hotelsTotal).toLocaleString()}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Checkout Buttons */}
              <Stack spacing={1}>
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
                  Book Selected Flight ({fc.fromCode} ↔ {fc.toCode})
                </Button>

                {packageRequest.hotelStays.map((stay, idx) => {
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
                        ? `Reserve Stay ${idx + 1}: ${stay.cityCode} (${chosen.roomOffer.currencyCode} ${Math.round(chosen.roomOffer.totalPrice).toLocaleString()})`
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
