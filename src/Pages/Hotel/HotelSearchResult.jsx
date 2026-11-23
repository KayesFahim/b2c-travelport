import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import HotelSearchBox from "./HotelSearchBox";
import {
  calculateNights,
  extractDestinationCityCode,
  fetchTravelportHotelAvailability,
  fetchTravelportHotelRules,
  formatIsoDateOffset,
  searchTravelportHotels,
} from "../../utils/travelportHotel";

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
      currency: state.currency || searchParams.get("currency") || stored.currency || "USD",
      radiusKm: Number(state.radiusKm || stored.radiusKm || 25),
      minStarRating: Number(state.minStarRating || stored.minStarRating || 0),
      hotelName: state.hotelName || stored.hotelName || "",
    };
  }, [location?.state, searchParams]);

  const [activeSearch, setActiveSearch] = useState(resolvedInitialSearch);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [starFilter, setStarFilter] = useState(0);

  // Selected property rooms & rules modal state
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [roomOffers, setRoomOffers] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [rulesByOfferId, setRulesByOfferId] = useState({});
  const [rulesLoadingId, setRulesLoadingId] = useState("");

  useEffect(() => {
    setActiveSearch(resolvedInitialSearch);
  }, [resolvedInitialSearch]);

  const runSearch = useCallback(
    async (criteria) => {
      setLoading(true);
      setApiError(null);
      try {
        const res = await searchTravelportHotels(criteria, token);
        setProperties(Array.isArray(res?.properties) ? res.properties : []);
      } catch (err) {
        setProperties([]);
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

  const filteredProperties = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    return properties.filter((prop) => {
      if (starFilter > 0 && Number(prop.starRating || 0) < starFilter) {
        return false;
      }
      if (
        q &&
        !String(prop.hotelName || "").toLowerCase().includes(q) &&
        !String(prop.address || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [nameFilter, properties, starFilter]);

  const nights = calculateNights(activeSearch.checkIn, activeSearch.checkOut);

  const handleOpenAvailability = async (property) => {
    setSelectedProperty(property);
    setRoomOffers([]);
    setRoomsError("");
    setRulesByOfferId({});
    setRoomsLoading(true);
    try {
      const res = await fetchTravelportHotelAvailability(
        {
          propertyCode: property.propertyCode,
          chainCode: property.chainCode,
          checkIn: activeSearch.checkIn,
          checkOut: activeSearch.checkOut,
          rooms: activeSearch.rooms,
          adults: activeSearch.adults,
          children: activeSearch.children,
          currency: activeSearch.currency,
          aggregator: property.aggregator,
        },
        token
      );
      setRoomOffers(Array.isArray(res?.offers) ? res.offers : []);
    } catch (err) {
      setRoomsError(err?.message || "Unable to retrieve room availability from Travelport.");
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleLoadRules = async (offer) => {
    setRulesLoadingId(offer.offerId);
    try {
      const res = await fetchTravelportHotelRules(
        {
          catalogOfferingsIdentifier: offer.catalogOfferingsIdentifier,
          catalogOfferingIdentifier: offer.catalogOfferingIdentifier,
          productIdentifier: offer.productIdentifier,
          propertyCode: selectedProperty?.propertyCode,
          chainCode: selectedProperty?.chainCode,
        },
        token
      );
      setRulesByOfferId((prev) => ({
        ...prev,
        [offer.offerId]: { ok: true, rules: res?.rules || {} },
      }));
    } catch (err) {
      setRulesByOfferId((prev) => ({
        ...prev,
        [offer.offerId]: { ok: false, error: err?.message || "Rules unavailable" },
      }));
    } finally {
      setRulesLoadingId("");
    }
  };

  const handleBookRoom = (offer) => {
    const bookingPayload = {
      property: selectedProperty,
      roomOffer: offer,
      searchCriteria: activeSearch,
      nights,
    };
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "flyjatt:selected_hotel_offer",
          JSON.stringify(bookingPayload)
        );
      }
    } catch {
      // ignore
    }
    navigate("/hotelbooking", { state: bookingPayload });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb", pb: 6 }}>
      <NavBar />
      <Container sx={{ pt: 3 }}>
        <HotelSearchBox
          initialValues={activeSearch}
          onSearchSubmit={(nextParams) => setActiveSearch(nextParams)}
          compact
        />

        <Box sx={{ mt: 2.5 }}>
          <Grid container spacing={2.5}>
            {/* Filter Sidebar */}
            <Grid item xs={12} md={3}>
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #d7e6f5",
                  p: 2,
                  boxShadow: "0 8px 20px rgba(8, 49, 85, 0.06)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: "#0b4a82", fontSize: "15px", mb: 1.5 }}>
                  Filter Stays
                </Typography>

                <Box className="flyjatt-stay-field" sx={{ mb: 2 }}>
                  <label htmlFor="hotel-filter-name" className="flyjatt-stay-label">
                    Property Name or Area
                  </label>
                  <input
                    id="hotel-filter-name"
                    type="search"
                    className="flyjatt-native-input"
                    placeholder="Filter results..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </Box>

                <fieldset className="flyjatt-filter-fieldset">
                  <legend>Star Rating</legend>
                  <Stack spacing={0.2}>
                    {[0, 3, 4, 5].map((stars) => (
                      <label key={stars} className="flyjatt-radio-label">
                        <input
                          type="radio"
                          name="hotel-star-filter"
                          className="flyjatt-radio-input"
                          checked={starFilter === stars}
                          onChange={() => setStarFilter(stars)}
                        />
                        <span>{stars === 0 ? "All Ratings" : `${stars}+ Stars`}</span>
                      </label>
                    ))}
                  </Stack>
                </fieldset>
              </Box>
            </Grid>

            {/* Results Column */}
            <Grid item xs={12} md={9}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: "18px", color: "#0f2942" }}>
                  Stays in {activeSearch.destination}
                </Typography>
                <Chip
                  size="small"
                  label={`${activeSearch.checkIn} → ${activeSearch.checkOut} (${nights} night${nights > 1 ? "s" : ""})`}
                  sx={{ fontWeight: 700, bgcolor: "#e0f2fe", color: "#0369a1" }}
                />
              </Box>

              {loading && (
                <Box
                  role="status"
                  aria-live="polite"
                  sx={{
                    bgcolor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #d7e6f5",
                    p: 4,
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
                  {apiError.isProvisioningError && (
                    <Typography sx={{ fontSize: "12px", mt: 0.8, color: "#57534e" }}>
                      Note: Our Travelport Stays v11 integration (`POST /11/hotel/search/properties/search`)
                      is live-wired with `Accept-Version: 11`, `TVP-Correlation-Id`, and `XAUTH_TRAVELPORT_ACCESSGROUP`.
                      Ensure Travelport has provisioned Hotel/Stays entitlements and `TRAVELPORT_PCC_CORE` on your pre-production Access Group.
                    </Typography>
                  )}
                  {apiError.correlationId && (
                    <Typography sx={{ fontSize: "11px", mt: 0.5, fontFamily: "monospace" }}>
                      TVP-Correlation-Id: {apiError.correlationId}
                    </Typography>
                  )}
                </Alert>
              )}

              {!loading && !apiError && filteredProperties.length === 0 && (
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
                    No hotel properties matched your criteria.
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#64748b", mt: 0.5 }}>
                    Try expanding your search radius, dates, or destination city code.
                  </Typography>
                </Box>
              )}

              {!loading &&
                filteredProperties.map((property) => (
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
                      gridTemplateColumns: { xs: "1fr", md: "1fr 220px" },
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontWeight: 800, fontSize: "17px", color: "#0f2942" }}>
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
                            {property.distanceValue !== null
                              ? ` • ${property.distanceValue} ${property.distanceUnit}`
                              : ""}
                          </Typography>
                        </Box>
                      )}

                      {property.amenities?.length > 0 && (
                        <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                          {property.amenities.slice(0, 6).map((amenity) => (
                            <Chip
                              key={amenity}
                              size="small"
                              label={amenity}
                              sx={{
                                fontSize: "11px",
                                bgcolor: "#f1f5f9",
                                color: "#334155",
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Box
                      sx={{
                        borderLeft: { md: "1px dashed #cbd5e1" },
                        pl: { md: 2 },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: { xs: "flex-start", md: "flex-end" },
                        gap: 0.8,
                      }}
                    >
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                        {nights} night{nights > 1 ? "s" : ""}, {activeSearch.rooms} room
                      </Typography>
                      <Typography sx={{ fontSize: "22px", fontWeight: 800, color: "#0b4a82" }}>
                        {property.minTotalPrice !== null
                          ? `${property.currencyCode} ${property.minTotalPrice.toLocaleString()}`
                          : "Check Live Rates"}
                      </Typography>
                      {property.minNightlyPrice !== null && (
                        <Typography sx={{ fontSize: "12px", color: "#475569" }}>
                          {property.currencyCode} {property.minNightlyPrice.toLocaleString()} / night
                        </Typography>
                      )}
                      <Button
                        type="button"
                        variant="contained"
                        onClick={() => handleOpenAvailability(property)}
                        sx={{
                          mt: 0.6,
                          width: "100%",
                          textTransform: "none",
                          fontWeight: 800,
                          borderRadius: "10px",
                          background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                        }}
                      >
                        View Rooms &amp; Rates
                      </Button>
                    </Box>
                  </Box>
                ))}
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Room Availability & Rules Dialog */}
      <Dialog
        open={Boolean(selectedProperty)}
        onClose={() => setSelectedProperty(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            color: "#0b4a82",
          }}
        >
          <span>{selectedProperty?.hotelName || "Available Rooms"}</span>
          <IconButton
            type="button"
            aria-label="Close rooms dialog"
            onClick={() => setSelectedProperty(null)}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {roomsLoading && (
            <Box sx={{ py: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
              <CircularProgress size={22} />
              <Typography sx={{ fontWeight: 700, color: "#0b4a82" }}>
                Checking live room rates via Travelport Stays Availability...
              </Typography>
            </Box>
          )}

          {!roomsLoading && roomsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {roomsError}
            </Alert>
          )}

          {!roomsLoading && !roomsError && roomOffers.length === 0 && (
            <Typography sx={{ py: 3, textAlign: "center", color: "#64748b" }}>
              No rooms available for the selected dates.
            </Typography>
          )}

          {!roomsLoading &&
            roomOffers.map((offer) => {
              const rulesState = rulesByOfferId[offer.offerId];
              return (
                <Box
                  key={offer.offerId}
                  sx={{
                    border: "1px solid #d7e6f5",
                    borderRadius: "14px",
                    p: 2,
                    mb: 1.5,
                    bgcolor: "#fbfdff",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ flex: "1 1 320px" }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#0f2942" }}>
                        {offer.roomName}
                      </Typography>
                      {offer.roomDescription && (
                        <Typography sx={{ fontSize: "13px", color: "#475569", mt: 0.4 }}>
                          {offer.roomDescription}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Chip size="small" label={offer.mealPlan} sx={{ fontWeight: 700 }} />
                        <Chip
                          size="small"
                          icon={<VerifiedUserRoundedIcon sx={{ fontSize: "14px !important" }} />}
                          label={offer.cancellationSummary}
                          color={offer.refundable ? "success" : "default"}
                          variant="outlined"
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                      <Typography sx={{ fontSize: "20px", fontWeight: 800, color: "#0b4a82" }}>
                        {offer.currencyCode} {Number(offer.totalPrice || 0).toLocaleString()}
                      </Typography>
                      <Typography sx={{ fontSize: "12px", color: "#64748b" }}>
                        Includes taxes ({offer.currencyCode} {Number(offer.taxes || 0).toLocaleString()})
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          type="button"
                          size="small"
                          variant="outlined"
                          startIcon={<InfoOutlinedIcon />}
                          disabled={rulesLoadingId === offer.offerId}
                          onClick={() => handleLoadRules(offer)}
                          sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                          {rulesLoadingId === offer.offerId ? "Loading..." : "Rate Rules"}
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="contained"
                          onClick={() => handleBookRoom(offer)}
                          sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                          }}
                        >
                          Book Room
                        </Button>
                      </Stack>
                    </Box>
                  </Box>

                  {rulesState && (
                    <Box sx={{ mt: 1.5, pt: 1.2 }}>
                      <Divider sx={{ mb: 1 }} />
                      {rulesState.ok ? (
                        <Typography sx={{ fontSize: "12px", color: "#334155" }}>
                          Check-in: {rulesState.rules?.checkInTime || "Standard"} • Check-out:{" "}
                          {rulesState.rules?.checkOutTime || "Standard"} • Guarantees:{" "}
                          {rulesState.rules?.guarantees?.length || 0} policy rule(s)
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: "12px", color: "#b91c1c" }}>
                          {rulesState.error}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HotelSearchResult;
