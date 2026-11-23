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
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import {
  calculateNights,
  fetchTravelportHotelAvailability,
  fetchTravelportHotelDetails,
  fetchTravelportHotelRules,
  formatIsoDateOffset,
} from "../../utils/travelportHotel";

const HotelDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = secureLocalStorage.getItem("access_token");

  const resolvedContext = useMemo(() => {
    const state = location?.state || {};
    let stored = {};
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:selected_hotel_property");
        if (raw) stored = JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    const property = state.property || stored.property || null;
    const chainCode = (
      searchParams.get("chainCode") ||
      property?.chainCode ||
      ""
    )
      .trim()
      .toUpperCase();
    const propertyCode = (
      searchParams.get("propertyCode") ||
      property?.propertyCode ||
      ""
    ).trim();
    const checkIn =
      searchParams.get("checkIn") ||
      state.searchCriteria?.checkIn ||
      stored.searchCriteria?.checkIn ||
      formatIsoDateOffset(7);
    const checkOut =
      searchParams.get("checkOut") ||
      state.searchCriteria?.checkOut ||
      stored.searchCriteria?.checkOut ||
      formatIsoDateOffset(10);
    const rooms = Number(
      searchParams.get("rooms") ||
        state.searchCriteria?.rooms ||
        stored.searchCriteria?.rooms ||
        1
    );
    const adults = Number(
      searchParams.get("adults") ||
        state.searchCriteria?.adults ||
        stored.searchCriteria?.adults ||
        2
    );
    const children = Number(
      searchParams.get("children") ||
        state.searchCriteria?.children ||
        stored.searchCriteria?.children ||
        0
    );
    const currency = "USD";

    return {
      initialProperty: property,
      chainCode,
      propertyCode,
      searchCriteria: {
        destination:
          state.searchCriteria?.destination ||
          stored.searchCriteria?.destination ||
          property?.city ||
          "",
        checkIn,
        checkOut,
        rooms,
        adults,
        children,
        currency,
      },
      nights: calculateNights(checkIn, checkOut),
    };
  }, [location?.state, searchParams]);

  const [propertyDetail, setPropertyDetail] = useState(resolvedContext.initialProperty);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [roomOffers, setRoomOffers] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [roomsWarning, setRoomsWarning] = useState("");

  // Room-level filters
  const [roomFilterFreeCancel, setRoomFilterFreeCancel] = useState(false);
  const [roomFilterBreakfast, setRoomFilterBreakfast] = useState(false);
  const [roomFilterNoPrepay, setRoomFilterNoPrepay] = useState(false);
  const [roomFilterWifi, setRoomFilterWifi] = useState(false);

  // Step 4: Hotel Rules state per offerId
  const [rulesByOfferId, setRulesByOfferId] = useState({});
  const [rulesLoadingId, setRulesLoadingId] = useState("");
  const [expandedRulesId, setExpandedRulesId] = useState("");

  const loadHotelDetails = useCallback(async () => {
    if (!resolvedContext.chainCode || !resolvedContext.propertyCode) {
      setDetailsLoading(false);
      return;
    }
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const res = await fetchTravelportHotelDetails(
        {
          chainCode: resolvedContext.chainCode,
          propertyCode: resolvedContext.propertyCode,
          imageSize: "Large",
          checkIn: resolvedContext.searchCriteria.checkIn,
          checkOut: resolvedContext.searchCriteria.checkOut,
        },
        token
      );
      if (res?.property) {
        setPropertyDetail((prev) => ({
          ...(prev || {}),
          ...res.property,
          images:
            Array.isArray(res.property.images) && res.property.images.length > 0
              ? res.property.images
              : prev?.images || [],
        }));
      }
    } catch (err) {
      setDetailsError(err?.message || "Unable to load extended hotel details.");
    } finally {
      setDetailsLoading(false);
    }
  }, [
    resolvedContext.chainCode,
    resolvedContext.propertyCode,
    resolvedContext.searchCriteria.checkIn,
    resolvedContext.searchCriteria.checkOut,
    token,
  ]);

  const loadRoomAvailability = useCallback(async () => {
    if (!resolvedContext.propertyCode) {
      setRoomsLoading(false);
      return;
    }
    setRoomsLoading(true);
    setRoomsError("");
    setRoomsWarning("");
    try {
      const res = await fetchTravelportHotelAvailability(
        {
          propertyCode: resolvedContext.propertyCode,
          chainCode: resolvedContext.chainCode,
          checkIn: resolvedContext.searchCriteria.checkIn,
          checkOut: resolvedContext.searchCriteria.checkOut,
          rooms: resolvedContext.searchCriteria.rooms,
          adults: resolvedContext.searchCriteria.adults,
          children: resolvedContext.searchCriteria.children,
          currency: resolvedContext.searchCriteria.currency,
        },
        token
      );
      setRoomOffers(Array.isArray(res?.offers) ? res.offers : []);
      if (res?.warning) {
        setRoomsWarning(res.warning);
      }
    } catch (err) {
      setRoomOffers([]);
      setRoomsError(err?.message || "Unable to retrieve room availability.");
    } finally {
      setRoomsLoading(false);
    }
  }, [
    resolvedContext.chainCode,
    resolvedContext.propertyCode,
    resolvedContext.searchCriteria.adults,
    resolvedContext.searchCriteria.checkIn,
    resolvedContext.searchCriteria.checkOut,
    resolvedContext.searchCriteria.children,
    resolvedContext.searchCriteria.currency,
    resolvedContext.searchCriteria.rooms,
    token,
  ]);

  useEffect(() => {
    loadHotelDetails();
    loadRoomAvailability();
  }, [loadHotelDetails, loadRoomAvailability]);

  const handleToggleRateRules = async (offer) => {
    if (expandedRulesId === offer.offerId) {
      setExpandedRulesId("");
      return;
    }
    setExpandedRulesId(offer.offerId);
    if (rulesByOfferId[offer.offerId]?.ok) {
      return;
    }
    setRulesLoadingId(offer.offerId);
    try {
      const res = await fetchTravelportHotelRules(
        {
          catalogOfferingsIdentifier: offer.catalogOfferingsIdentifier,
          catalogOfferingIdentifier: offer.catalogOfferingIdentifier,
          authority: offer.authority || offer.aggregator || "TVPT",
          propertyCode: resolvedContext.propertyCode,
          chainCode: resolvedContext.chainCode,
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
        [offer.offerId]: { ok: false, error: err?.message || "Rate rules unavailable." },
      }));
    } finally {
      setRulesLoadingId("");
    }
  };

  const handleReserveRoom = (offer) => {
    const loadedRules = rulesByOfferId[offer.offerId]?.ok
      ? rulesByOfferId[offer.offerId].rules
      : null;
    const bookingPayload = {
      property: propertyDetail || {
        propertyCode: resolvedContext.propertyCode,
        chainCode: resolvedContext.chainCode,
        hotelName: `Hotel ${resolvedContext.chainCode}-${resolvedContext.propertyCode}`,
      },
      roomOffer: offer,
      rateRules: loadedRules,
      searchCriteria: resolvedContext.searchCriteria,
      nights: resolvedContext.nights,
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

  const filteredRooms = useMemo(() => {
    return roomOffers.filter((offer) => {
      if (roomFilterFreeCancel && !offer.freeCancellation) return false;
      if (roomFilterBreakfast && !offer.breakfastIncluded) return false;
      if (roomFilterNoPrepay && offer.prepayRequired) return false;
      if (roomFilterWifi && !offer.wifiIncluded) return false;
      return true;
    });
  }, [
    roomFilterBreakfast,
    roomFilterFreeCancel,
    roomFilterNoPrepay,
    roomFilterWifi,
    roomOffers,
  ]);

  const gallery = useMemo(() => {
    const list = Array.isArray(propertyDetail?.images) ? propertyDetail.images : [];
    if (list.length > 0) return list;
    if (propertyDetail?.imageUrl) {
      return [{ url: propertyDetail.imageUrl, caption: propertyDetail.hotelName }];
    }
    return [];
  }, [propertyDetail]);

  const heroImage = gallery[activePhotoIndex] || gallery[0] || null;

  if (!resolvedContext.propertyCode) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb" }}>
        <NavBar />
        <Container sx={{ py: 8, textAlign: "center" }}>
          <HotelRoundedIcon sx={{ fontSize: 52, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: "20px", color: "#0f2942" }}>
            No hotel selected
          </Typography>
          <Button
            type="button"
            variant="contained"
            sx={{ mt: 2, textTransform: "none", fontWeight: 700 }}
            onClick={() => navigate("/hotel")}
          >
            Search Hotels
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb", pb: 8 }}>
      <NavBar />
      <Container maxWidth="xl" sx={{ pt: 3 }}>
        {/* Top Navigation & 5-Step Progress Bar */}
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.2,
            borderRadius: "12px",
            bgcolor: "#ffffff",
            border: "1px solid #d7e6f5",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.2,
          }}
        >
          <Button
            type="button"
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: "none", fontWeight: 800, color: "#0b4a82" }}
          >
            Back to Hotel Results
          </Button>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip size="small" label="1. Search ✓" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="2. Hotel Details" color="primary" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="3. Room Availability" color="primary" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="4. Rate Rules" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="5. Create Reservation" variant="outlined" sx={{ fontWeight: 600 }} />
          </Stack>
        </Box>

        {/* Step 2: Property Details & Photo Gallery */}
        <Box
          sx={{
            bgcolor: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #d7e6f5",
            p: { xs: 2, md: 3 },
            mb: 3,
            boxShadow: "0 10px 26px rgba(8, 49, 85, 0.07)",
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  bgcolor: "#e8f2fb",
                  aspectRatio: "16 / 10",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {heroImage ? (
                  <img
                    src={heroImage.url}
                    alt={heroImage.caption || propertyDetail?.hotelName || "Hotel photo"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <HotelRoundedIcon sx={{ fontSize: 64, color: "#7aa7cc" }} />
                )}
                {heroImage?.caption && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 10,
                      left: 10,
                      px: 1.2,
                      py: 0.4,
                      borderRadius: "8px",
                      bgcolor: "rgba(15, 41, 66, 0.78)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {heroImage.caption}
                  </Box>
                )}
              </Box>

              {gallery.length > 1 && (
                <Box
                  sx={{
                    mt: 1.2,
                    display: "flex",
                    gap: 1,
                    overflowX: "auto",
                    pb: 0.5,
                  }}
                >
                  {gallery.slice(0, 10).map((img, idx) => (
                    <Box
                      component="button"
                      type="button"
                      key={`${img.url}-${idx}`}
                      onClick={() => setActivePhotoIndex(idx)}
                      sx={{
                        p: 0,
                        border: idx === activePhotoIndex ? "2px solid #007bb0" : "2px solid transparent",
                        borderRadius: "9px",
                        overflow: "hidden",
                        width: 82,
                        height: 58,
                        flexShrink: 0,
                        cursor: "pointer",
                        bgcolor: "#e8f2fb",
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.caption || `Photo ${idx + 1}`}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: "22px", md: "26px" }, color: "#0f2942" }}>
                  {propertyDetail?.hotelName || `Property ${resolvedContext.chainCode}-${resolvedContext.propertyCode}`}
                </Typography>
                {detailsLoading && <CircularProgress size={18} />}
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
                {propertyDetail?.starRating !== null && propertyDetail?.starRating !== undefined && (
                  <Rating value={Number(propertyDetail.starRating)} precision={0.5} readOnly size="small" />
                )}
                <Chip
                  size="small"
                  label={`${resolvedContext.chainCode} • Code ${resolvedContext.propertyCode}`}
                  sx={{ fontWeight: 700, bgcolor: "#eaf4fc", color: "#0b4a82" }}
                />
                <Chip
                  size="small"
                  label={`${resolvedContext.searchCriteria.checkIn} → ${resolvedContext.searchCriteria.checkOut} (${resolvedContext.nights} nights)`}
                  sx={{ fontWeight: 700, bgcolor: "#e0f2fe", color: "#0369a1" }}
                />
              </Stack>

              {propertyDetail?.address && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mt: 1.4 }}>
                  <LocationOnRoundedIcon sx={{ fontSize: 18, color: "#007bb0" }} />
                  <Typography sx={{ fontSize: "14px", color: "#334155", fontWeight: 600 }}>
                    {propertyDetail.address}
                    {propertyDetail.distanceKm !== null && propertyDetail.distanceKm !== undefined
                      ? ` • ${propertyDetail.distanceKm} km from city center`
                      : ""}
                  </Typography>
                </Box>
              )}

              {propertyDetail?.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mt: 0.6 }}>
                  <PhoneRoundedIcon sx={{ fontSize: 17, color: "#007bb0" }} />
                  <Typography sx={{ fontSize: "13.5px", color: "#475569", fontWeight: 600 }}>
                    {propertyDetail.phone}
                    {propertyDetail.email ? ` • ${propertyDetail.email}` : ""}
                  </Typography>
                </Box>
              )}

              {Array.isArray(propertyDetail?.guestRoomInfo) && propertyDetail.guestRoomInfo.length > 0 && (
                <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                  {propertyDetail.guestRoomInfo.slice(0, 5).map((info) => (
                    <Chip
                      key={info.label}
                      size="small"
                      label={`${info.count} ${info.label}`}
                      sx={{
                        fontSize: "11.5px",
                        fontWeight: 700,
                        bgcolor: "#eef6fd",
                        color: "#0b4a82",
                      }}
                    />
                  ))}
                </Stack>
              )}

              {detailsError && (
                <Alert severity="info" sx={{ mt: 1.5, borderRadius: "10px" }}>
                  Extended details note: {detailsError}
                </Alert>
              )}

              {Array.isArray(propertyDetail?.descriptions) && propertyDetail.descriptions.length > 0 && (
                <Box sx={{ mt: 1.6 }}>
                  {propertyDetail.descriptions.slice(0, 2).map((d, i) => (
                    <Typography key={i} sx={{ fontSize: "13px", color: "#475569", mb: 0.6, lineHeight: 1.55 }}>
                      <strong>{d.title}:</strong> {d.text}
                    </Typography>
                  ))}
                </Box>
              )}

              {Array.isArray(propertyDetail?.amenities) && propertyDetail.amenities.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#0b4a82", mb: 0.8 }}>
                    Property Amenities ({propertyDetail.amenities.length})
                  </Typography>
                  <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
                    {propertyDetail.amenities.slice(0, 18).map((amenity) => (
                      <Chip
                        key={amenity}
                        size="small"
                        label={amenity}
                        sx={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          bgcolor: "#f8fafc",
                          border: "1px solid #dbe7f3",
                          color: "#334155",
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Step 3 & Step 4: Room Availability & Inline Rate Rules */}
        <Box
          sx={{
            bgcolor: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #d7e6f5",
            p: { xs: 2, md: 3 },
            boxShadow: "0 10px 26px rgba(8, 49, 85, 0.07)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box>
              <Typography component="h2" sx={{ fontWeight: 800, fontSize: "20px", color: "#0f2942" }}>
                Available Rooms &amp; Rates ({filteredRooms.length})
              </Typography>
              <Typography sx={{ fontSize: "13px", color: "#526B86" }}>
                {resolvedContext.searchCriteria.rooms} room(s) • {resolvedContext.searchCriteria.adults} adult(s)
                {resolvedContext.searchCriteria.children > 0
                  ? `, ${resolvedContext.searchCriteria.children} child(ren)`
                  : ""}{" "}
                • {resolvedContext.nights} night(s)
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                clickable
                size="small"
                label="Free Cancellation"
                color={roomFilterFreeCancel ? "primary" : "default"}
                variant={roomFilterFreeCancel ? "filled" : "outlined"}
                onClick={() => setRoomFilterFreeCancel((v) => !v)}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                clickable
                size="small"
                label="Breakfast Included"
                color={roomFilterBreakfast ? "primary" : "default"}
                variant={roomFilterBreakfast ? "filled" : "outlined"}
                onClick={() => setRoomFilterBreakfast((v) => !v)}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                clickable
                size="small"
                label="No Prepayment"
                color={roomFilterNoPrepay ? "primary" : "default"}
                variant={roomFilterNoPrepay ? "filled" : "outlined"}
                onClick={() => setRoomFilterNoPrepay((v) => !v)}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                clickable
                size="small"
                label="Wi-Fi Included"
                color={roomFilterWifi ? "primary" : "default"}
                variant={roomFilterWifi ? "filled" : "outlined"}
                onClick={() => setRoomFilterWifi((v) => !v)}
                sx={{ fontWeight: 700 }}
              />
              <Button
                type="button"
                size="small"
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                disabled={roomsLoading}
                onClick={loadRoomAvailability}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Refresh Rates
              </Button>
            </Stack>
          </Box>

          {roomsLoading && (
            <Box sx={{ py: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
              <CircularProgress size={24} />
              <Typography sx={{ fontWeight: 700, color: "#0b4a82" }}>
                Fetching live room availability from Travelport Stays v11...
              </Typography>
            </Box>
          )}

          {!roomsLoading && roomsError && (
            <Alert
              severity="error"
              sx={{ borderRadius: "12px", mb: 2 }}
              action={
                <Button type="button" size="small" color="inherit" onClick={loadRoomAvailability}>
                  Retry
                </Button>
              }
            >
              {roomsError}
            </Alert>
          )}

          {!roomsLoading && !roomsError && roomsWarning && roomOffers.length === 0 && (
            <Alert
              severity="warning"
              sx={{ borderRadius: "12px", mb: 2 }}
              action={
                <Button type="button" size="small" color="inherit" onClick={loadRoomAvailability}>
                  Retry Now
                </Button>
              }
            >
              Travelport Supplier Notice: <strong>{roomsWarning}</strong>. Click Retry Now or try different dates/property.
            </Alert>
          )}

          {!roomsLoading && !roomsError && filteredRooms.length === 0 && !roomsWarning && (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography sx={{ fontWeight: 700, color: "#475569" }}>
                {roomOffers.length > 0
                  ? "No room offers match your active room filters."
                  : "No available room rates were returned for these dates."}
              </Typography>
              {roomOffers.length > 0 && (
                <Button
                  type="button"
                  variant="outlined"
                  sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
                  onClick={() => {
                    setRoomFilterFreeCancel(false);
                    setRoomFilterBreakfast(false);
                    setRoomFilterNoPrepay(false);
                    setRoomFilterWifi(false);
                  }}
                >
                  Clear Room Filters
                </Button>
              )}
            </Box>
          )}

          {!roomsLoading &&
            filteredRooms.map((offer) => {
              const rulesState = rulesByOfferId[offer.offerId];
              const isRulesExpanded = expandedRulesId === offer.offerId;
              const isLoadingThisRule = rulesLoadingId === offer.offerId;
              return (
                <Box
                  key={offer.offerId}
                  sx={{
                    border: "1px solid #d7e6f5",
                    borderRadius: "14px",
                    p: 2.2,
                    mb: 1.8,
                    bgcolor: "#fbfdff",
                    transition: "border-color 140ms ease",
                    "&:hover": { borderColor: "#007bb0" },
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontWeight: 800, fontSize: "16.5px", color: "#0f2942" }}>
                          {offer.roomName}
                        </Typography>
                        {offer.ratePlanName && (
                          <Chip
                            size="small"
                            label={offer.ratePlanName}
                            sx={{ fontSize: "11px", fontWeight: 700, height: 22, bgcolor: "#e0f2fe", color: "#0369a1" }}
                          />
                        )}
                        {offer.rateCode && (
                          <Chip
                            size="small"
                            label={`Code: ${offer.rateCode}`}
                            sx={{ fontSize: "11px", fontWeight: 700, height: 22 }}
                          />
                        )}
                      </Stack>

                      {offer.roomDescription && (
                        <Typography sx={{ fontSize: "13px", color: "#475569", mt: 0.5, lineHeight: 1.45 }}>
                          {offer.roomDescription}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                        {offer.bedType && (
                          <Chip
                            size="small"
                            icon={<BedRoundedIcon sx={{ fontSize: "14px !important" }} />}
                            label={offer.bedType}
                            sx={{ fontWeight: 700, bgcolor: "#eef6fd", color: "#0b4a82" }}
                          />
                        )}
                        <Chip
                          size="small"
                          icon={<RestaurantRoundedIcon sx={{ fontSize: "14px !important" }} />}
                          label={offer.mealPlan}
                          sx={{
                            fontWeight: 700,
                            bgcolor: offer.breakfastIncluded ? "#dcfce7" : "#f1f5f9",
                            color: offer.breakfastIncluded ? "#166534" : "#334155",
                          }}
                        />
                        <Chip
                          size="small"
                          icon={<VerifiedUserRoundedIcon sx={{ fontSize: "14px !important" }} />}
                          label={offer.cancellationSummary}
                          color={offer.freeCancellation ? "success" : offer.refundable ? "info" : "warning"}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                        {offer.smokingAllowed && offer.smokingAllowed !== "Unknown" && (
                          <Chip
                            size="small"
                            label={offer.smokingAllowed === "No" ? "Non-Smoking" : "Smoking Allowed"}
                            sx={{ fontWeight: 600, bgcolor: "#f8fafc", border: "1px solid #dbe7f3" }}
                          />
                        )}
                        {offer.wifiIncluded && (
                          <Chip
                            size="small"
                            icon={<WifiRoundedIcon sx={{ fontSize: "14px !important" }} />}
                            label="Wi-Fi Included"
                            sx={{ fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857" }}
                          />
                        )}
                        <Chip
                          size="small"
                          icon={<CreditCardRoundedIcon sx={{ fontSize: "14px !important" }} />}
                          label={
                            offer.prepayRequired
                              ? "Prepayment Required"
                              : offer.creditCardRequired
                                ? "Credit Card Guarantee"
                                : "Pay at Property"
                          }
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Box
                        sx={{
                          borderLeft: { md: "1px dashed #cbd5e1" },
                          pl: { md: 2.2 },
                          display: "flex",
                          flexDirection: "column",
                          alignItems: { xs: "flex-start", md: "flex-end" },
                          gap: 0.4,
                        }}
                      >
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                          USD ${Number(offer.nightlyTotalPrice || offer.nightlyPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / night (incl. tax)
                        </Typography>
                        <Typography sx={{ fontSize: "23px", fontWeight: 800, color: "#0b4a82", lineHeight: 1.1 }}>
                          USD ${Number(offer.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "#475569" }}>
                          Base USD ${Number(offer.basePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Taxes{" "}
                          USD ${Number(offer.taxes || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        {Number(offer.localFeesTotal) > 0 && (
                          <Typography sx={{ fontSize: "11.5px", color: "#b45309", fontWeight: 700 }}>
                            + USD ${Number(offer.localFeesTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} local fee payable at hotel
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 1.2, width: "100%" }} justifyContent="flex-end">
                          <Button
                            type="button"
                            size="small"
                            variant="outlined"
                            startIcon={<InfoOutlinedIcon />}
                            disabled={isLoadingThisRule}
                            onClick={() => handleToggleRateRules(offer)}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "9px" }}
                          >
                            {isLoadingThisRule
                              ? "Loading Rules..."
                              : isRulesExpanded
                                ? "Hide Rules"
                                : "Rate Rules"}
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            variant="contained"
                            onClick={() => handleReserveRoom(offer)}
                            sx={{
                              textTransform: "none",
                              fontWeight: 800,
                              borderRadius: "9px",
                              px: 2.2,
                              background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                            }}
                          >
                            Reserve Room
                          </Button>
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Step 4: Live Travelport Hotel Rules Collapse */}
                  <Collapse in={isRulesExpanded} unmountOnExit>
                    <Box sx={{ mt: 2, pt: 1.5 }}>
                      <Divider sx={{ mb: 1.5 }} />
                      {isLoadingThisRule && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0b4a82" }}>
                            Loading live rate rules &amp; policies from Travelport Stays v11...
                          </Typography>
                        </Box>
                      )}
                      {!isLoadingThisRule && rulesState && !rulesState.ok && (
                        <Alert severity="warning">{rulesState.error}</Alert>
                      )}
                      {!isLoadingThisRule && rulesState?.ok && (
                        <Box
                          sx={{
                            p: 1.8,
                            borderRadius: "12px",
                            bgcolor: "#f0f8ff",
                            border: "1px solid #cce3f6",
                          }}
                        >
                          <Typography sx={{ fontWeight: 800, fontSize: "13.5px", color: "#0b4a82", mb: 1 }}>
                            Verified Travelport Rate Rules &amp; Policies
                          </Typography>
                          <Grid container spacing={1.5}>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: "12.5px", color: "#1e293b", mb: 0.6 }}>
                                <strong>Cancellation:</strong> {rulesState.rules?.cancellationPolicy}
                              </Typography>
                              <Typography sx={{ fontSize: "12.5px", color: "#1e293b", mb: 0.6 }}>
                                <strong>Guarantee:</strong> {rulesState.rules?.guaranteePolicy}
                              </Typography>
                              {rulesState.rules?.depositPolicy && (
                                <Typography sx={{ fontSize: "12.5px", color: "#1e293b", mb: 0.6 }}>
                                  <strong>Deposit:</strong> {rulesState.rules.depositPolicy}
                                </Typography>
                              )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: "12.5px", color: "#1e293b", mb: 0.6 }}>
                                <strong>Verified Price:</strong> USD ${" "}
                                {Number(rulesState.rules?.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Base USD ${" "}
                                {Number(rulesState.rules?.basePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Tax USD ${" "}
                                {Number(rulesState.rules?.taxes || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                              </Typography>
                              {rulesState.rules?.maxOccupancy && (
                                <Typography sx={{ fontSize: "12.5px", color: "#1e293b", mb: 0.6 }}>
                                  <strong>Max Occupancy:</strong> {rulesState.rules.maxOccupancy} guests
                                  {rulesState.rules?.wifiIncluded ? " • Wi-Fi Included" : ""}
                                </Typography>
                              )}
                              {rulesState.rules?.promotionalInfo && (
                                <Typography sx={{ fontSize: "12.5px", color: "#047857", fontWeight: 600 }}>
                                  <strong>Offer:</strong> {rulesState.rules.promotionalInfo}
                                </Typography>
                              )}
                            </Grid>
                          </Grid>
                          {rulesState.rules?.otherInfo && (
                            <Typography sx={{ fontSize: "12px", color: "#475569", mt: 1, lineHeight: 1.5 }}>
                              <strong>Additional Terms:</strong> {rulesState.rules.otherInfo}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
        </Box>
      </Container>
    </Box>
  );
};

export default HotelDetailsPage;
