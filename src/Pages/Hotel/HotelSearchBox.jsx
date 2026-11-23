import React, { useId, useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { useNavigate } from "react-router-dom";
import {
  HOTEL_CURRENCY_OPTIONS,
  POPULAR_STAY_DESTINATIONS,
  calculateNights,
  extractDestinationCityCode,
  formatIsoDateOffset,
} from "../../utils/travelportHotel";

const HotelSearchBox = ({
  initialValues = {},
  onSearchSubmit,
  compact = false,
}) => {
  const navigate = useNavigate();
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const destInputRef = useRef(null);
  const checkOutInputRef = useRef(null);

  const todayIso = useMemo(() => formatIsoDateOffset(0), []);
  const [destination, setDestination] = useState(
    initialValues.destination || "Dubai (DXB)"
  );
  const [checkIn, setCheckIn] = useState(
    initialValues.checkIn || formatIsoDateOffset(7)
  );
  const [checkOut, setCheckOut] = useState(
    initialValues.checkOut || formatIsoDateOffset(10)
  );
  const [rooms, setRooms] = useState(Number(initialValues.rooms) || 1);
  const [adults, setAdults] = useState(Number(initialValues.adults) || 2);
  const [children, setChildren] = useState(Number(initialValues.children) || 0);
  const [currency, setCurrency] = useState(initialValues.currency || "USD");
  const [radiusKm, setRadiusKm] = useState(Number(initialValues.radiusKm) || 25);
  const [minStarRating, setMinStarRating] = useState(
    String(initialValues.minStarRating || "")
  );
  const [hotelName, setHotelName] = useState(initialValues.hotelName || "");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nights = calculateNights(checkIn, checkOut);

  const handleCheckInChange = (nextCheckIn) => {
    setCheckIn(nextCheckIn);
    if (formError) setFormError("");
    if (nextCheckIn && checkOut && nextCheckIn >= checkOut) {
      const nextDay = new Date(`${nextCheckIn}T00:00:00Z`);
      if (!Number.isNaN(nextDay.getTime())) {
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        setCheckOut(nextDay.toISOString().slice(0, 10));
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedDest = String(destination || "").trim();
    if (!trimmedDest) {
      setFormError("Please enter a city or 3-letter IATA airport/city code (e.g. DXB, LON, NYC).");
      destInputRef.current?.focus();
      return;
    }

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setFormError("Check-out date must be after check-in date.");
      checkOutInputRef.current?.focus();
      return;
    }

    setFormError("");
    setSubmitting(true);

    const cityCode = extractDestinationCityCode(trimmedDest);
    const searchParams = {
      destination: trimmedDest,
      cityCode,
      checkIn,
      checkOut,
      rooms,
      adults,
      children,
      currency,
      radiusKm,
      minStarRating: minStarRating ? Number(minStarRating) : 0,
      hotelName: hotelName.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "flyjatt:last_hotel_search",
          JSON.stringify(searchParams)
        );
      }
    } catch {
      // ignore storage errors
    }

    if (typeof onSearchSubmit === "function") {
      onSearchSubmit(searchParams);
      setSubmitting(false);
      return;
    }

    const query = new URLSearchParams({
      destination: trimmedDest,
      ...(cityCode ? { cityCode } : {}),
      checkIn,
      checkOut,
      rooms: String(rooms),
      adults: String(adults),
      children: String(children),
      currency,
    });
    navigate(`/hotelresults?${query.toString()}`, { state: searchParams });
    setSubmitting(false);
  };

  return (
    <search aria-label="Travelport Stays and Hotel Search">
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          borderRadius: "20px",
          border: "1px solid rgba(0, 154, 214, 0.22)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,250,255,0.96) 100%)",
          boxShadow: compact
            ? "0 8px 20px rgba(8, 49, 85, 0.08)"
            : "0 18px 36px rgba(8, 49, 85, 0.12)",
          p: { xs: 1.6, md: compact ? 1.8 : 2.2 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 1.2,
            mb: 1.6,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
              <HotelRoundedIcon sx={{ color: "var(--primary-color)", fontSize: 22 }} />
              <Typography
                component="h2"
                sx={{
                  color: "var(--depature-color)",
                  fontWeight: 800,
                  fontSize: { xs: "18px", md: "20px" },
                }}
              >
                Search Stays &amp; Hotels
              </Typography>
            </Box>
            <Typography
              sx={{
                color: "var(--filter-color)",
                fontSize: "13px",
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              Powered by Travelport Stays API v11 — Search, Availability, Rate Rules &amp; Booking.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={`${nights} Night${nights > 1 ? "s" : ""}`}
              sx={{
                bgcolor: "rgba(0,154,214,0.12)",
                color: "var(--airport-color)",
                fontWeight: 700,
              }}
            />
            <Chip
              size="small"
              label={`${rooms} Room${rooms > 1 ? "s" : ""} • ${adults + children} Guest${adults + children > 1 ? "s" : ""}`}
              sx={{
                bgcolor: "rgba(20,184,166,0.12)",
                color: "#0f736c",
                fontWeight: 700,
              }}
            />
            <Button
              type="button"
              size="small"
              variant="outlined"
              startIcon={<TuneRoundedIcon sx={{ fontSize: 16 }} />}
              aria-expanded={showMoreFilters}
              aria-controls={`${baseId}-extra-filters`}
              onClick={() => setShowMoreFilters((prev) => !prev)}
              sx={{
                textTransform: "none",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "12px",
                borderColor: "rgba(0,123,176,0.35)",
                color: "#0b4a82",
              }}
            >
              {showMoreFilters ? "Hide Stay Filters" : "Stay Filters"}
            </Button>
          </Stack>
        </Box>

        {formError && (
          <Box
            role="alert"
            aria-live="assertive"
            sx={{
              mb: 1.5,
              px: 1.5,
              py: 1,
              borderRadius: "10px",
              bgcolor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "0.86rem",
              fontWeight: 600,
            }}
          >
            {formError}
          </Box>
        )}

        <Box className="flyjatt-stay-grid">
          {/* Destination */}
          <Box className="flyjatt-stay-field">
            <label htmlFor={`${baseId}-destination`} className="flyjatt-stay-label">
              City or Airport Code <span aria-hidden="true">*</span>
            </label>
            <input
              ref={destInputRef}
              id={`${baseId}-destination`}
              name="destination"
              type="text"
              list={`${baseId}-dest-list`}
              className="flyjatt-native-input"
              placeholder="e.g. Dubai (DXB), London (LON), NYC"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                if (formError) setFormError("");
              }}
              aria-invalid={Boolean(formError && !destination.trim())}
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
            />
            <datalist id={`${baseId}-dest-list`}>
              {POPULAR_STAY_DESTINATIONS.map((item) => (
                <option key={item.code} value={item.label}>
                  {item.city}, {item.country}
                </option>
              ))}
            </datalist>
          </Box>

          {/* Check-in */}
          <Box className="flyjatt-stay-field">
            <label htmlFor={`${baseId}-checkin`} className="flyjatt-stay-label">
              Check-in Date <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${baseId}-checkin`}
              name="checkIn"
              type="date"
              min={todayIso}
              className="flyjatt-native-input"
              value={checkIn}
              onChange={(e) => handleCheckInChange(e.target.value)}
              required
            />
          </Box>

          {/* Check-out */}
          <Box className="flyjatt-stay-field">
            <label htmlFor={`${baseId}-checkout`} className="flyjatt-stay-label">
              Check-out Date <span aria-hidden="true">*</span>
            </label>
            <input
              ref={checkOutInputRef}
              id={`${baseId}-checkout`}
              name="checkOut"
              type="date"
              min={checkIn || todayIso}
              className="flyjatt-native-input"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                if (formError) setFormError("");
              }}
              aria-invalid={Boolean(formError && checkOut <= checkIn)}
              required
            />
          </Box>

          {/* Rooms & Guests */}
          <Box className="flyjatt-stay-field">
            <span className="flyjatt-stay-label">Rooms &amp; Guests</span>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0.6,
              }}
            >
              <Box className="flyjatt-stay-stepper">
                <span className="flyjatt-stay-stepper-title">Rooms</span>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                  <button
                    type="button"
                    aria-label="Decrease rooms"
                    className="flyjatt-stepper-btn"
                    onClick={() => setRooms((v) => Math.max(1, v - 1))}
                  >
                    −
                  </button>
                  <span style={{ fontWeight: 800, minWidth: 16, textAlign: "center" }}>
                    {rooms}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase rooms"
                    className="flyjatt-stepper-btn"
                    onClick={() => setRooms((v) => Math.min(9, v + 1))}
                  >
                    +
                  </button>
                </Box>
              </Box>

              <Box className="flyjatt-stay-stepper">
                <span className="flyjatt-stay-stepper-title">Adults</span>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                  <button
                    type="button"
                    aria-label="Decrease adults"
                    className="flyjatt-stepper-btn"
                    onClick={() => setAdults((v) => Math.max(1, v - 1))}
                  >
                    −
                  </button>
                  <span style={{ fontWeight: 800, minWidth: 16, textAlign: "center" }}>
                    {adults}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase adults"
                    className="flyjatt-stepper-btn"
                    onClick={() => setAdults((v) => Math.min(9, v + 1))}
                  >
                    +
                  </button>
                </Box>
              </Box>

              <Box className="flyjatt-stay-stepper">
                <span className="flyjatt-stay-stepper-title">Children</span>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                  <button
                    type="button"
                    aria-label="Decrease children"
                    className="flyjatt-stepper-btn"
                    onClick={() => setChildren((v) => Math.max(0, v - 1))}
                  >
                    −
                  </button>
                  <span style={{ fontWeight: 800, minWidth: 16, textAlign: "center" }}>
                    {children}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase children"
                    className="flyjatt-stepper-btn"
                    onClick={() => setChildren((v) => Math.min(6, v + 1))}
                  >
                    +
                  </button>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Submit */}
          <Box sx={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="submit"
              disabled={submitting}
              startIcon={<SearchRoundedIcon />}
              sx={{
                color: "#ffffff",
                textTransform: "none",
                borderRadius: "12px",
                fontWeight: 800,
                fontSize: "0.95rem",
                minHeight: "48px",
                width: "100%",
                background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                boxShadow: "0 10px 22px rgba(0, 130, 196, 0.28)",
                "&:hover": {
                  background: "linear-gradient(120deg, #083a66 0%, #006da6 100%)",
                },
              }}
            >
              Search Stays
            </Button>
          </Box>
        </Box>

        {/* Quick Destination Pills */}
        {!compact && (
          <Stack
            direction="row"
            spacing={0.8}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1.4, alignItems: "center" }}
          >
            <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#4c657f" }}>
              Popular Stays:
            </Typography>
            {POPULAR_STAY_DESTINATIONS.slice(0, 6).map((dest) => (
              <Chip
                key={dest.code}
                size="small"
                clickable
                label={dest.label}
                onClick={() => {
                  setDestination(dest.label);
                  if (formError) setFormError("");
                }}
                sx={{
                  fontWeight: 700,
                  fontSize: "12px",
                  bgcolor:
                    destination === dest.label
                      ? "#007bb0"
                      : "rgba(11, 74, 130, 0.08)",
                  color: destination === dest.label ? "#ffffff" : "#0b4a82",
                }}
              />
            ))}
          </Stack>
        )}

        {/* Expandable Stay Filters */}
        {showMoreFilters && (
          <fieldset
            id={`${baseId}-extra-filters`}
            className="flyjatt-filter-fieldset"
            style={{ marginTop: "1rem" }}
          >
            <legend>Travelport Stays Search Modifiers</legend>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                gap: 1.2,
                mt: 0.4,
              }}
            >
              <Box className="flyjatt-stay-field">
                <label htmlFor={`${baseId}-hotel-name`} className="flyjatt-stay-label">
                  Hotel Name (Optional)
                </label>
                <input
                  id={`${baseId}-hotel-name`}
                  name="hotelName"
                  type="text"
                  className="flyjatt-native-input"
                  placeholder="e.g. Hilton, Marriott"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                />
              </Box>

              <Box className="flyjatt-stay-field">
                <label htmlFor={`${baseId}-star`} className="flyjatt-stay-label">
                  Minimum Star Rating
                </label>
                <select
                  id={`${baseId}-star`}
                  name="minStarRating"
                  className="flyjatt-native-select"
                  value={minStarRating}
                  onChange={(e) => setMinStarRating(e.target.value)}
                >
                  <option value="">Any Star Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="5">5 Stars Only</option>
                </select>
              </Box>

              <Box className="flyjatt-stay-field">
                <label htmlFor={`${baseId}-radius`} className="flyjatt-stay-label">
                  Search Radius (km)
                </label>
                <select
                  id={`${baseId}-radius`}
                  name="radiusKm"
                  className="flyjatt-native-select"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                >
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={15}>Within 15 km (Default)</option>
                  <option value={25}>Within 25 km (Max)</option>
                </select>
              </Box>

              <Box className="flyjatt-stay-field">
                <label htmlFor={`${baseId}-currency`} className="flyjatt-stay-label">
                  Currency
                </label>
                <select
                  id={`${baseId}-currency`}
                  name="currency"
                  className="flyjatt-native-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {HOTEL_CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Box>
            </Box>
          </fieldset>
        )}
      </Box>
    </search>
  );
};

export default HotelSearchBox;
