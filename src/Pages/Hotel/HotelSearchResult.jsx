import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Pagination,
  Rating,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import PoolRoundedIcon from "@mui/icons-material/PoolRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import LocalParkingRoundedIcon from "@mui/icons-material/LocalParkingRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import HotelSearchBox from "./HotelSearchBox";
import {
  calculateNights,
  extractDestinationCityCode,
  formatIsoDateOffset,
  searchTravelportHotels,
} from "../../utils/travelportHotel";

const HOTELS_PER_PAGE = 50;

const AMENITY_FILTER_OPTIONS = [
  { key: "hasPool", label: "Swimming Pool" },
  { key: "hasWifi", label: "Free Wi-Fi / Internet" },
  { key: "hasBreakfast", label: "Breakfast Available" },
  { key: "hasParking", label: "Parking" },
  { key: "hasGym", label: "Fitness Center / Gym" },
  { key: "hasRestaurant", label: "Restaurant / Dining" },
  { key: "hasSpa", label: "Spa & Wellness" },
  { key: "hasAc", label: "Air Conditioning" },
  { key: "hasShuttle", label: "Airport Shuttle" },
  { key: "hasBusiness", label: "Business Center" },
  { key: "petFriendly", label: "Pet Friendly" },
];

const DISTANCE_FILTER_OPTIONS = [
  { value: 0, label: "Any Distance" },
  { value: 1, label: "Within 1 km of center" },
  { value: 3, label: "Within 3 km of center" },
  { value: 5, label: "Within 5 km of center" },
  { value: 10, label: "Within 10 km of center" },
  { value: 20, label: "Within 20 km of center" },
];

const DEFAULT_POLICY_FILTERS = {
  availableOnly: false,
  freeCancellation: false,
  withBreakfast: false,
  creditCardRequired: "any", // "any" | "required" | "not_required"
  prepayRequired: "any", // "any" | "required" | "not_required"
};

const HotelSearchResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = secureLocalStorage.getItem("access_token");

  const resolvedInitialSearch = useMemo(() => {
    const state = location?.state || {};
    let stored = {};
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:last_hotel_search");
        if (raw) stored = JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    const destination =
      state.destination ||
      searchParams.get("destination") ||
      stored.destination ||
      "Dubai (DXB)";
    const cityCode =
      state.cityCode ||
      searchParams.get("cityCode") ||
      stored.cityCode ||
      extractDestinationCityCode(destination);
    const checkIn =
      state.checkIn ||
      searchParams.get("checkIn") ||
      stored.checkIn ||
      formatIsoDateOffset(7);
    const checkOut =
      state.checkOut ||
      searchParams.get("checkOut") ||
      stored.checkOut ||
      formatIsoDateOffset(10);

    return {
      destination,
      cityCode,
      checkIn,
      checkOut,
      rooms: Number(state.rooms || searchParams.get("rooms") || stored.rooms || 1),
      adults: Number(state.adults || searchParams.get("adults") || stored.adults || 2),
      children: Number(state.children || searchParams.get("children") || stored.children || 0),
      currency: "USD",
      radiusKm: Number(state.radiusKm || stored.radiusKm || 15),
      minStarRating: Number(state.minStarRating || stored.minStarRating || 0),
      hotelName: state.hotelName || stored.hotelName || "",
    };
  }, [location?.state, searchParams]);

  const [activeSearch, setActiveSearch] = useState(resolvedInitialSearch);
  const [properties, setProperties] = useState([]);
  const [totalUpstreamCount, setTotalUpstreamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Left Sidebar Filters
  const [nameFilter, setNameFilter] = useState("");
  const [starFilter, setStarFilter] = useState(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [policyFilters, setPolicyFilters] = useState(DEFAULT_POLICY_FILTERS);
  const [priceBounds, setPriceBounds] = useState([0, 2000]);
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [sortBy, setSortBy] = useState("recommended");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setActiveSearch(resolvedInitialSearch);
  }, [resolvedInitialSearch]);

  const runSearch = useCallback(
    async (criteria) => {
      setLoading(true);
      setApiError(null);
      setCurrentPage(1);
      try {
        const res = await searchTravelportHotels(criteria, token);
        const list = Array.isArray(res?.properties) ? res.properties : [];
        setProperties(list);
        setTotalUpstreamCount(Number(res?.totalProperties || list.length));

        const priced = list
          .map((p) => Number(p?.minNightlyPrice))
          .filter((v) => Number.isFinite(v) && v > 0);
        if (priced.length > 0) {
          const minP = Math.floor(Math.min(...priced));
          const maxP = Math.ceil(Math.max(...priced));
          setPriceBounds([minP, Math.max(minP + 10, maxP)]);
          setPriceRange([minP, Math.max(minP + 10, maxP)]);
        } else {
          setPriceBounds([0, 2000]);
          setPriceRange([0, 2000]);
        }
      } catch (err) {
        setProperties([]);
        setTotalUpstreamCount(0);
        setApiError({
          message: err?.message || "Unable to complete Travelport Stays search.",
          status: err?.status || 500,
          isProvisioningError: Boolean(err?.isProvisioningError),
          correlationId: err?.correlationId || err?.payload?.correlationId || "",
        });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    runSearch(activeSearch);
  }, [activeSearch, runSearch]);

  const handleToggleAmenity = (key) => {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setNameFilter("");
    setStarFilter(0);
    setMaxDistanceKm(0);
    setSelectedAmenities([]);
    setPolicyFilters(DEFAULT_POLICY_FILTERS);
    setPriceRange(priceBounds);
    setSortBy("recommended");
    setCurrentPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (nameFilter.trim()) count += 1;
    if (starFilter > 0) count += 1;
    if (maxDistanceKm > 0) count += 1;
    count += selectedAmenities.length;
    if (policyFilters.availableOnly) count += 1;
    if (policyFilters.freeCancellation) count += 1;
    if (policyFilters.withBreakfast) count += 1;
    if (policyFilters.creditCardRequired !== "any") count += 1;
    if (policyFilters.prepayRequired !== "any") count += 1;
    if (priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1]) count += 1;
    return count;
  }, [
    maxDistanceKm,
    nameFilter,
    policyFilters,
    priceBounds,
    priceRange,
    selectedAmenities.length,
    starFilter,
  ]);

  const deferredNameFilter = useDeferredValue(nameFilter);
  const deferredPriceRange = useDeferredValue(priceRange);

  // Pre-compute lowercase search corpus once when properties arrive so filtering is O(n) with zero per-keystroke allocations
  const indexedProperties = useMemo(
    () =>
      properties.map((prop) => {
        const amenitiesText = (Array.isArray(prop?.amenities) ? prop.amenities : [])
          .join(" ")
          .toLowerCase();
        const searchCorpus = `${prop?.hotelName || ""} ${prop?.address || ""} ${prop?.chainCode || ""}`.toLowerCase();
        return {
          prop,
          flags: prop?.amenityFlags || {},
          amenitiesText,
          searchCorpus,
          hasNonRefundableText: /\bnon-refundable|non refundable\b/.test(amenitiesText),
          hasBreakfastText: /\bbreakfast|buffet|continental\b/.test(amenitiesText),
        };
      }),
    [properties]
  );

  const filteredAndSortedProperties = useMemo(() => {
    const q = deferredNameFilter.trim().toLowerCase();
    const isPriceFiltered =
      deferredPriceRange[0] > priceBounds[0] || deferredPriceRange[1] < priceBounds[1];

    const filtered = [];
    for (let i = 0; i < indexedProperties.length; i += 1) {
      const entry = indexedProperties[i];
      const { prop, flags } = entry;

      if (policyFilters.availableOnly && !prop.available) continue;
      if (starFilter > 0 && Number(prop.starRating || 0) < starFilter) continue;
      if (
        maxDistanceKm > 0 &&
        (prop.distanceKm === null ||
          prop.distanceKm === undefined ||
          Number(prop.distanceKm) > maxDistanceKm)
      ) {
        continue;
      }
      if (isPriceFiltered) {
        const nightly = Number(prop.minNightlyPrice);
        if (!Number.isFinite(nightly) || nightly < deferredPriceRange[0] || nightly > deferredPriceRange[1]) {
          continue;
        }
      }
      if (q && !entry.searchCorpus.includes(q)) continue;
      if (policyFilters.freeCancellation) {
        const hasFreeCancel =
          Boolean(flags.freeCancellationHint) ||
          (prop.available && !entry.hasNonRefundableText);
        if (!hasFreeCancel) continue;
      }
      if (policyFilters.withBreakfast) {
        const hasBreakfast = Boolean(flags.hasBreakfast) || entry.hasBreakfastText;
        if (!hasBreakfast) continue;
      }
      if (policyFilters.creditCardRequired === "required") {
        if (!Boolean(flags.creditCardRequiredHint) && !Boolean(prop.available)) continue;
      } else if (policyFilters.creditCardRequired === "not_required") {
        if (Boolean(flags.creditCardRequiredHint)) continue;
      }
      if (policyFilters.prepayRequired === "required") {
        if (!Boolean(flags.prepayRequiredHint)) continue;
      } else if (policyFilters.prepayRequired === "not_required") {
        if (Boolean(flags.prepayRequiredHint)) continue;
      }

      let missingAmenity = false;
      for (let a = 0; a < selectedAmenities.length; a += 1) {
        if (!flags[selectedAmenities[a]]) {
          missingAmenity = true;
          break;
        }
      }
      if (missingAmenity) continue;

      filtered.push(prop);
    }

    filtered.sort((a, b) => {
      if (sortBy === "price_asc") {
        const pa = a.minNightlyPrice ?? Number.MAX_SAFE_INTEGER;
        const pb = b.minNightlyPrice ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      if (sortBy === "price_desc") {
        const pa = a.minNightlyPrice ?? -1;
        const pb = b.minNightlyPrice ?? -1;
        return pb - pa;
      }
      if (sortBy === "distance_asc") {
        const da = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const db = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      if (sortBy === "stars_desc") {
        return Number(b.starRating || 0) - Number(a.starRating || 0);
      }
      if (a.available !== b.available) return a.available ? -1 : 1;
      const pa = a.minNightlyPrice ?? Number.MAX_SAFE_INTEGER;
      const pb = b.minNightlyPrice ?? Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });

    return filtered;
  }, [
    deferredNameFilter,
    deferredPriceRange,
    indexedProperties,
    maxDistanceKm,
    policyFilters,
    priceBounds,
    selectedAmenities,
    sortBy,
    starFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedProperties.length / HOTELS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProperties = useMemo(() => {
    const start = (safePage - 1) * HOTELS_PER_PAGE;
    return filteredAndSortedProperties.slice(start, start + HOTELS_PER_PAGE);
  }, [filteredAndSortedProperties, safePage]);

  const nights = calculateNights(activeSearch.checkIn, activeSearch.checkOut);
  const openCount = useMemo(
    () => properties.filter((p) => p.available).length,
    [properties]
  );

  const handlePageChange = (_event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenHotelDetailsPage = (property) => {
    const context = {
      property,
      searchCriteria: activeSearch,
      nights,
    };
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "flyjatt:selected_hotel_property",
          JSON.stringify(context)
        );
      }
    } catch {
      // ignore storage errors
    }

    const query = new URLSearchParams({
      chainCode: property.chainCode || "",
      propertyCode: property.propertyCode || "",
      checkIn: activeSearch.checkIn,
      checkOut: activeSearch.checkOut,
      rooms: String(activeSearch.rooms || 1),
      adults: String(activeSearch.adults || 2),
      children: String(activeSearch.children || 0),
      currency: activeSearch.currency || "USD",
    });

    navigate(`/hoteldetails?${query.toString()}`, { state: context });
  };

  const pageStartIdx = filteredAndSortedProperties.length
    ? (safePage - 1) * HOTELS_PER_PAGE + 1
    : 0;
  const pageEndIdx = Math.min(
    safePage * HOTELS_PER_PAGE,
    filteredAndSortedProperties.length
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb", pb: 6 }}>
      <NavBar />
      <Container maxWidth="xl" sx={{ pt: 3 }}>
        {/* 5-Step Travelport Stays Workflow Bar */}
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.1,
            borderRadius: "12px",
            bgcolor: "#ffffff",
            border: "1px solid #d7e6f5",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#0b4a82" }}>
            Travelport Stays v11 Workflow
          </Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip size="small" label="1. Hotel Search" color="primary" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="2. Hotel Details" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip size="small" label="3. Room Availability" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip size="small" label="4. Rate Rules" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip size="small" label="5. Create Reservation" variant="outlined" sx={{ fontWeight: 600 }} />
          </Stack>
        </Box>

        <HotelSearchBox
          initialValues={activeSearch}
          onSearchSubmit={(nextParams) => setActiveSearch(nextParams)}
          compact
        />

        <Box sx={{ mt: 2.5 }}>
          <Grid container spacing={2.5}>
            {/* Left Filter Sidebar */}
            <Grid item xs={12} md={3.2} lg={3}>
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #d7e6f5",
                  p: 2,
                  boxShadow: "0 8px 20px rgba(8, 49, 85, 0.06)",
                  position: { md: "sticky" },
                  top: { md: 16 },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Typography sx={{ fontWeight: 800, color: "#0b4a82", fontSize: "15px" }}>
                      Filter Stays
                    </Typography>
                    {activeFilterCount > 0 && (
                      <Chip
                        size="small"
                        label={activeFilterCount}
                        color="primary"
                        sx={{ height: 20, fontWeight: 800, fontSize: "11px" }}
                      />
                    )}
                  </Box>
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      size="small"
                      startIcon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
                      onClick={handleResetFilters}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
                    >
                      Reset
                    </Button>
                  )}
                </Box>

                {/* Name / Area */}
                <Box className="flyjatt-stay-field" sx={{ mb: 1.8 }}>
                  <label htmlFor="hotel-filter-name" className="flyjatt-stay-label">
                    Property Name, Chain or Area
                  </label>
                  <input
                    id="hotel-filter-name"
                    type="search"
                    className="flyjatt-native-input"
                    placeholder="e.g. Sheraton, Hilton, Marina"
                    value={nameFilter}
                    onChange={(e) => {
                      setNameFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </Box>

                {/* Price per Night Slider */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#0b4a82", mb: 0.5 }}>
                    Nightly Rate Range (USD $)
                  </Typography>
                  <Slider
                    value={priceRange}
                    min={priceBounds[0]}
                    max={priceBounds[1]}
                    onChange={(_e, val) => {
                      setPriceRange(val);
                      setCurrentPage(1);
                    }}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Booking & Payment Policies */}
                <fieldset className="flyjatt-filter-fieldset" style={{ marginBottom: "1rem" }}>
                  <legend>Cancellation, Meals &amp; Payment</legend>
                  <Stack spacing={0.1}>
                    <label className="flyjatt-check-label" style={{ minBlockSize: "38px" }}>
                      <input
                        type="checkbox"
                        className="flyjatt-check-input"
                        checked={policyFilters.availableOnly}
                        onChange={(e) => {
                          setPolicyFilters((p) => ({ ...p, availableOnly: e.target.checked }));
                          setCurrentPage(1);
                        }}
                      />
                      <span>Available / Open Only ({openCount})</span>
                    </label>
                    <label className="flyjatt-check-label" style={{ minBlockSize: "38px" }}>
                      <input
                        type="checkbox"
                        className="flyjatt-check-input"
                        checked={policyFilters.freeCancellation}
                        onChange={(e) => {
                          setPolicyFilters((p) => ({ ...p, freeCancellation: e.target.checked }));
                          setCurrentPage(1);
                        }}
                      />
                      <span>Free Cancellation</span>
                    </label>
                    <label className="flyjatt-check-label" style={{ minBlockSize: "38px" }}>
                      <input
                        type="checkbox"
                        className="flyjatt-check-input"
                        checked={policyFilters.withBreakfast}
                        onChange={(e) => {
                          setPolicyFilters((p) => ({ ...p, withBreakfast: e.target.checked }));
                          setCurrentPage(1);
                        }}
                      />
                      <span>With Breakfast</span>
                    </label>
                  </Stack>

                  <Box sx={{ mt: 1 }}>
                    <label htmlFor="filter-cc-needed" className="flyjatt-stay-label" style={{ marginBottom: 4 }}>
                      Credit Card Requirement
                    </label>
                    <select
                      id="filter-cc-needed"
                      className="flyjatt-native-select"
                      style={{ minBlockSize: "38px", fontSize: "0.82rem" }}
                      value={policyFilters.creditCardRequired}
                      onChange={(e) => {
                        setPolicyFilters((p) => ({ ...p, creditCardRequired: e.target.value }));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="any">Any Credit Card Policy</option>
                      <option value="required">Credit Card Guarantee Needed</option>
                      <option value="not_required">No Credit Card Needed</option>
                    </select>
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    <label htmlFor="filter-prepay-needed" className="flyjatt-stay-label" style={{ marginBottom: 4 }}>
                      Prepayment Policy
                    </label>
                    <select
                      id="filter-prepay-needed"
                      className="flyjatt-native-select"
                      style={{ minBlockSize: "38px", fontSize: "0.82rem" }}
                      value={policyFilters.prepayRequired}
                      onChange={(e) => {
                        setPolicyFilters((p) => ({ ...p, prepayRequired: e.target.value }));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="any">Any Payment Policy</option>
                      <option value="required">Prepayment Required</option>
                      <option value="not_required">No Prepayment / Pay Later</option>
                    </select>
                  </Box>
                </fieldset>

                {/* Distance from City Center */}
                <fieldset className="flyjatt-filter-fieldset" style={{ marginBottom: "1rem" }}>
                  <legend>Distance from City Center</legend>
                  <Stack spacing={0.1}>
                    {DISTANCE_FILTER_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flyjatt-radio-label"
                        style={{ minBlockSize: "36px" }}
                      >
                        <input
                          type="radio"
                          name="hotel-distance-filter"
                          className="flyjatt-radio-input"
                          checked={maxDistanceKm === opt.value}
                          onChange={() => {
                            setMaxDistanceKm(opt.value);
                            setCurrentPage(1);
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </Stack>
                </fieldset>

                {/* Star Rating */}
                <fieldset className="flyjatt-filter-fieldset" style={{ marginBottom: "1rem" }}>
                  <legend>Star Rating</legend>
                  <Stack spacing={0.1}>
                    {[0, 3, 4, 5].map((stars) => (
                      <label
                        key={stars}
                        className="flyjatt-radio-label"
                        style={{ minBlockSize: "36px" }}
                      >
                        <input
                          type="radio"
                          name="hotel-star-filter"
                          className="flyjatt-radio-input"
                          checked={starFilter === stars}
                          onChange={() => {
                            setStarFilter(stars);
                            setCurrentPage(1);
                          }}
                        />
                        <span>{stars === 0 ? "All Star Ratings" : `${stars}+ Stars`}</span>
                      </label>
                    ))}
                  </Stack>
                </fieldset>

                {/* Amenities */}
                <fieldset className="flyjatt-filter-fieldset">
                  <legend>Amenities</legend>
                  <Stack spacing={0.1}>
                    {AMENITY_FILTER_OPTIONS.map((amenity) => (
                      <label
                        key={amenity.key}
                        className="flyjatt-check-label"
                        style={{ minBlockSize: "36px" }}
                      >
                        <input
                          type="checkbox"
                          className="flyjatt-check-input"
                          checked={selectedAmenities.includes(amenity.key)}
                          onChange={() => handleToggleAmenity(amenity.key)}
                        />
                        <span>{amenity.label}</span>
                      </label>
                    ))}
                  </Stack>
                </fieldset>
              </Box>
            </Grid>

            {/* Right Results Column */}
            <Grid item xs={12} md={8.8} lg={9}>
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #d7e6f5",
                  px: 2,
                  py: 1.4,
                  mb: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1.2,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "18px", color: "#0f2942" }}>
                    Stays in {activeSearch.destination}
                  </Typography>
                  <Typography sx={{ fontSize: "12.5px", color: "#526B86", fontWeight: 600 }}>
                    {loading
                      ? "Searching live Travelport Stays inventory..."
                      : `Showing ${pageStartIdx}–${pageEndIdx} of ${filteredAndSortedProperties.length} properties (${openCount} open / ${totalUpstreamCount} total in area) • ${HOTELS_PER_PAGE} per page`}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`${activeSearch.checkIn} → ${activeSearch.checkOut} (${nights} night${nights > 1 ? "s" : ""})`}
                    sx={{ fontWeight: 700, bgcolor: "#e0f2fe", color: "#0369a1" }}
                  />
                  <select
                    aria-label="Sort hotels"
                    className="flyjatt-native-select"
                    style={{ width: "auto", minBlockSize: "38px", fontSize: "0.84rem", fontWeight: 700 }}
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="recommended">Sort: Recommended</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="distance_asc">Distance: Closest to Center</option>
                    <option value="stars_desc">Star Rating: High to Low</option>
                  </select>
                </Stack>
              </Box>

              {loading && (
                <Box
                  role="status"
                  aria-live="polite"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #d7e6f5",
                    p: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                  }}
                >
                  <CircularProgress size={24} />
                  <Typography sx={{ fontWeight: 700, color: "#0b4a82" }}>
                    Searching live Travelport Stays v11 properties...
                  </Typography>
                </Box>
              )}

              {!loading && apiError && (
                <Alert
                  severity={apiError.isProvisioningError ? "warning" : "error"}
                  sx={{ borderRadius: "14px", mb: 2 }}
                  action={
                    <Button
                      type="button"
                      size="small"
                      color="inherit"
                      onClick={() => runSearch(activeSearch)}
                    >
                      Retry
                    </Button>
                  }
                >
                  <Typography sx={{ fontWeight: 800, fontSize: "14px", mb: 0.4 }}>
                    Travelport Stays API Response (HTTP {apiError.status})
                  </Typography>
                  <Typography sx={{ fontSize: "13px" }}>{apiError.message}</Typography>
                  {apiError.correlationId && (
                    <Typography sx={{ fontSize: "11px", mt: 0.5, fontFamily: "monospace" }}>
                      TVP-Correlation-Id: {apiError.correlationId}
                    </Typography>
                  )}
                </Alert>
              )}

              {!loading && !apiError && filteredAndSortedProperties.length === 0 && (
                <Box
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #d7e6f5",
                    p: 5,
                    textAlign: "center",
                  }}
                >
                  <HotelRoundedIcon sx={{ fontSize: 44, color: "#94a3b8", mb: 1 }} />
                  <Typography sx={{ fontWeight: 700, color: "#334155" }}>
                    No hotel properties matched your current filters.
                  </Typography>
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleResetFilters}
                      sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
                    >
                      Clear All Sidebar Filters
                    </Button>
                  )}
                </Box>
              )}

              {/* Top Pagination when > 1 page */}
              {!loading && totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={safePage}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}

              {/* Property Cards */}
              {!loading &&
                paginatedProperties.map((property) => {
                  const flags = property?.amenityFlags || {};
                  return (
                    <Box
                      key={`${property.chainCode}-${property.propertyCode}-${property.identifier}`}
                      sx={{
                        bgcolor: "#ffffff",
                        borderRadius: "16px",
                        border: "1px solid #d7e6f5",
                        p: 2,
                        mb: 1.8,
                        boxShadow: "0 8px 22px rgba(8, 49, 85, 0.06)",
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "180px 1fr",
                          md: "210px 1fr 225px",
                        },
                        gap: 2,
                        alignItems: "center",
                        transition: "border-color 150ms ease, box-shadow 150ms ease",
                        "&:hover": {
                          borderColor: "#007bb0",
                          boxShadow: "0 12px 26px rgba(0, 123, 176, 0.12)",
                        },
                      }}
                    >
                      <Box
                        onClick={() => handleOpenHotelDetailsPage(property)}
                        sx={{
                          borderRadius: "12px",
                          overflow: "hidden",
                          bgcolor: "#e8f2fb",
                          aspectRatio: "4 / 3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
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
                          <HotelRoundedIcon sx={{ fontSize: 42, color: "#7aa7cc" }} />
                        )}
                      </Box>

                      <Box>
                        <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography
                            onClick={() => handleOpenHotelDetailsPage(property)}
                            sx={{
                              fontWeight: 800,
                              fontSize: "17px",
                              color: "#0f2942",
                              cursor: "pointer",
                              "&:hover": { color: "#007bb0" },
                            }}
                          >
                            {property.hotelName}
                          </Typography>
                          {property.starRating !== null && (
                            <Rating
                              value={Number(property.starRating)}
                              precision={0.5}
                              readOnly
                              size="small"
                            />
                          )}
                          <Chip
                            size="small"
                            label={property.available ? "Available" : "Check Dates"}
                            sx={{
                              fontSize: "11px",
                              fontWeight: 700,
                              height: 22,
                              bgcolor: property.available ? "#dcfce7" : "#f1f5f9",
                              color: property.available ? "#166534" : "#475569",
                            }}
                          />
                          {property.chainCode && (
                            <Chip
                              size="small"
                              label={`Chain: ${property.chainCode}`}
                              sx={{ fontSize: "11px", fontWeight: 700, height: 22 }}
                            />
                          )}
                        </Stack>

                        {property.address && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.6 }}>
                            <LocationOnRoundedIcon sx={{ fontSize: 16, color: "#007bb0" }} />
                            <Typography sx={{ fontSize: "13px", color: "#475569" }}>
                              {property.address}
                              {property.distanceKm !== null
                                ? ` • ${property.distanceKm} km from center`
                                : ""}
                            </Typography>
                          </Box>
                        )}

                        {/* Quick Highlight Icons */}
                        <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          {flags.hasPool && (
                            <Chip
                              size="small"
                              icon={<PoolRoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Pool"
                              sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#e0f2fe", color: "#0369a1" }}
                            />
                          )}
                          {flags.hasWifi && (
                            <Chip
                              size="small"
                              icon={<WifiRoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Wi-Fi"
                              sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857" }}
                            />
                          )}
                          {flags.hasParking && (
                            <Chip
                              size="small"
                              icon={<LocalParkingRoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Parking"
                              sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#f1f5f9", color: "#334155" }}
                            />
                          )}
                          {flags.hasRestaurant && (
                            <Chip
                              size="small"
                              icon={<RestaurantRoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Dining"
                              sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#fef3c7", color: "#92400e" }}
                            />
                          )}
                          {property.amenities?.slice(0, 4).map((amenity) => (
                            <Chip
                              key={amenity}
                              size="small"
                              label={amenity}
                              sx={{
                                fontSize: "11px",
                                bgcolor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                color: "#475569",
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>

                      <Box
                        sx={{
                          borderLeft: { md: "1px dashed #cbd5e1" },
                          pl: { md: 2 },
                          display: "flex",
                          flexDirection: "column",
                          alignItems: { xs: "flex-start", md: "flex-end" },
                          gap: 0.6,
                        }}
                      >
                        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                          {nights} night{nights > 1 ? "s" : ""}, {activeSearch.rooms} room
                        </Typography>
                        <Typography sx={{ fontSize: "22px", fontWeight: 800, color: "#0b4a82" }}>
                          {property.minTotalPrice !== null
                            ? `USD $${property.minTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "View Live Rates"}
                        </Typography>
                        {property.minNightlyPrice !== null && (
                          <Typography sx={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                            USD ${property.minNightlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / night
                          </Typography>
                        )}
                        <Button
                          type="button"
                          variant="contained"
                          onClick={() => handleOpenHotelDetailsPage(property)}
                          sx={{
                            mt: 0.8,
                            width: "100%",
                            textTransform: "none",
                            fontWeight: 800,
                            borderRadius: "10px",
                            minHeight: "42px",
                            background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                          }}
                        >
                          View Hotel &amp; Rooms
                        </Button>
                      </Box>
                    </Box>
                  );
                })}

              {/* Bottom React Pagination (50 hotels per page) */}
              {!loading && filteredAndSortedProperties.length > 0 && (
                <Box
                  sx={{
                    mt: 3,
                    py: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Pagination
                    count={totalPages}
                    page={safePage}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                  <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
                    Page {safePage} of {totalPages} ({filteredAndSortedProperties.length} properties, {HOTELS_PER_PAGE} per page)
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default HotelSearchResult;
