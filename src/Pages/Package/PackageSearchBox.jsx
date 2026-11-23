import React, { useId, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { useNavigate } from "react-router-dom";
import {
  addDaysToIsoDate,
  calculateNights,
  extractDestinationCityCode,
  formatIsoDateOffset,
  resolveStayDestinationFromAirport,
} from "../../utils/travelportHotel";
import { makeStayLeg } from "./HotelStaysPlanner";

const POPULAR_FLIGHT_AIRPORTS = [
  { code: "DAC", label: "Dhaka (DAC)" },
  { code: "DXB", label: "Dubai (DXB)" },
  { code: "AUH", label: "Abu Dhabi (AUH)" },
  { code: "LHR", label: "London Heathrow (LHR)" },
  { code: "JFK", label: "New York JFK (JFK)" },
  { code: "KUL", label: "Kuala Lumpur (KUL)" },
  { code: "SIN", label: "Singapore (SIN)" },
  { code: "DOH", label: "Doha (DOH)" },
  { code: "IST", label: "Istanbul (IST)" },
  { code: "CDG", label: "Paris CDG (CDG)" },
  { code: "BKK", label: "Bangkok (BKK)" },
  { code: "JED", label: "Jeddah (JED)" },
  { code: "RUH", label: "Riyadh (RUH)" },
  { code: "YYZ", label: "Toronto (YYZ)" },
  { code: "MLE", label: "Malé (MLE)" },
];

const CABIN_OPTIONS = [
  { value: "Economy", label: "Economy" },
  { value: "PremiumEconomy", label: "Premium Economy" },
  { value: "Business", label: "Business" },
  { value: "First", label: "First Class" },
];

function extractAirportCode(value, fallback = "DXB") {
  const code = extractDestinationCityCode(value);
  if (code) return code;
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return raw.length === 3 ? raw : fallback;
}

const PackageSearchBox = ({
  initialValues = null,
  onSearchSubmit,
  compact = false,
}) => {
  const navigate = useNavigate();
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const formRef = useRef(null);
  const todayIso = useMemo(() => formatIsoDateOffset(0), []);

  const defaultDeparture =
    initialValues?.flightCriteria?.departureDate || formatIsoDateOffset(7);
  const defaultReturn =
    initialValues?.flightCriteria?.returnDate || formatIsoDateOffset(22); // 15-day trip default

  const [fromInput, setFromInput] = useState(
    initialValues?.flightCriteria?.fromLabel || "Dhaka (DAC)"
  );
  const [toInput, setToInput] = useState(
    initialValues?.flightCriteria?.toLabel || "Dubai (DXB)"
  );
  const [departureDate, setDepartureDate] = useState(defaultDeparture);
  const [returnDate, setReturnDate] = useState(defaultReturn);
  const [adults, setAdults] = useState(
    Number(initialValues?.flightCriteria?.adults) || 2
  );
  const [children, setChildren] = useState(
    Number(initialValues?.flightCriteria?.children) || 0
  );
  const [infants, setInfants] = useState(
    Number(initialValues?.flightCriteria?.infants) || 0
  );
  const [cabinClass, setCabinClass] = useState(
    initialValues?.flightCriteria?.cabinClass || "Economy"
  );
  const [formError, setFormError] = useState("");

  const totalTripNights = useMemo(
    () => calculateNights(departureDate, returnDate),
    [departureDate, returnDate]
  );

  const handleDepartureChange = (nextDep) => {
    setDepartureDate(nextDep);
    setFormError("");
    if (nextDep && returnDate && returnDate <= nextDep) {
      setReturnDate(addDaysToIsoDate(nextDep, 7));
    }
  };

  const handleSwapAirports = () => {
    setFromInput(toInput);
    setToInput(fromInput);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const fromCode = extractAirportCode(fromInput, "");
    const toCode = extractAirportCode(toInput, "");

    if (!fromCode || !toCode) {
      setFormError(
        "Please enter valid 3-letter origin and destination airport codes (e.g. DAC, DXB)."
      );
      return;
    }
    if (fromCode === toCode) {
      setFormError("Origin and destination airports must be different.");
      return;
    }
    if (!departureDate || !returnDate || returnDate <= departureDate) {
      setFormError("Return flight date must be after departure date.");
      return;
    }

    const arrivalInfo = resolveStayDestinationFromAirport(toCode);
    const defaultAutoStay = [
      makeStayLeg("stay-1", arrivalInfo.primary, departureDate, returnDate, 1),
    ];

    const payload = {
      flightCriteria: {
        fromCode,
        fromLabel: fromInput.trim() || `${fromCode} (${fromCode})`,
        toCode,
        toLabel: toInput.trim() || `${toCode} (${toCode})`,
        departureDate,
        returnDate,
        tripNights: totalTripNights,
        adults,
        children,
        infants,
        cabinClass,
        currency: "USD",
      },
      hotelStays: defaultAutoStay,
      startStep: "flight",
      submittedAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "flyjatt:last_package_search",
          JSON.stringify(payload)
        );
      }
    } catch {
      // ignore storage errors
    }

    if (typeof onSearchSubmit === "function") {
      onSearchSubmit(payload);
      return;
    }

    navigate("/package", { state: payload });
  };

  return (
    <search aria-label="Package: Flight + Hotel Search">
      <Box
        ref={formRef}
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          borderRadius: "20px",
          border: "1px solid rgba(0, 154, 214, 0.24)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,250,255,0.96) 100%)",
          boxShadow: compact
            ? "0 8px 20px rgba(8, 49, 85, 0.08)"
            : "0 18px 36px rgba(8, 49, 85, 0.12)",
          p: { xs: 1.6, md: compact ? 1.8 : 2.3 },
        }}
      >
        {/* Header */}
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
              <FlightTakeoffRoundedIcon
                sx={{ color: "var(--primary-color)", fontSize: 22 }}
              />
              <Typography
                component="h2"
                sx={{
                  color: "var(--depature-color)",
                  fontWeight: 800,
                  fontSize: { xs: "18px", md: "20px" },
                }}
              >
                Package: Flight + Hotel
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
              Step 1: Search &amp; select your flight — then we&apos;ll auto-match hotels for your arrival city &amp; dates (with multi-city split-stay options).
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              icon={<FlightTakeoffRoundedIcon sx={{ fontSize: "14px !important" }} />}
              label={`1. Flight (${totalTripNights} nights)`}
              sx={{
                bgcolor: "rgba(0,154,214,0.14)",
                color: "var(--airport-color)",
                fontWeight: 700,
              }}
            />
            <Chip
              size="small"
              icon={<HotelRoundedIcon sx={{ fontSize: "14px !important" }} />}
              label="2. Auto-Matched Hotels Next"
              sx={{
                bgcolor: "rgba(20,184,166,0.14)",
                color: "#0f736c",
                fontWeight: 700,
              }}
            />
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

        {/* Step 1: Round-Trip Flight Details Only */}
        <fieldset className="flyjatt-filter-fieldset">
          <legend>1. Round-Trip Flight Details</legend>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "1.2fr auto 1.2fr 1fr 1fr 1.15fr",
              },
              gap: 1,
              alignItems: "end",
              mt: 0.4,
            }}
          >
            <Box className="flyjatt-stay-field">
              <label htmlFor={`${baseId}-from`} className="flyjatt-stay-label">
                Flying From <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${baseId}-from`}
                type="text"
                list={`${baseId}-airports`}
                className="flyjatt-native-input"
                placeholder="e.g. Dhaka (DAC)"
                value={fromInput}
                onChange={(e) => {
                  setFromInput(e.target.value);
                  setFormError("");
                }}
                required
              />
            </Box>

            <Box sx={{ display: { xs: "none", lg: "flex" }, pb: 0.4 }}>
              <Tooltip title="Swap origin & destination">
                <IconButton
                  type="button"
                  aria-label="Swap origin and destination airports"
                  onClick={handleSwapAirports}
                  sx={{
                    border: "1px solid #bfd7ec",
                    bgcolor: "#f0f8ff",
                    color: "#0b4a82",
                    width: 40,
                    height: 40,
                  }}
                >
                  <SwapHorizRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box className="flyjatt-stay-field">
              <label htmlFor={`${baseId}-to`} className="flyjatt-stay-label">
                Flying To (Arrival City) <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${baseId}-to`}
                type="text"
                list={`${baseId}-airports`}
                className="flyjatt-native-input"
                placeholder="e.g. Dubai (DXB)"
                value={toInput}
                onChange={(e) => {
                  setToInput(e.target.value);
                  setFormError("");
                }}
                required
              />
            </Box>

            <Box className="flyjatt-stay-field">
              <label htmlFor={`${baseId}-dep`} className="flyjatt-stay-label">
                Departure Date <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${baseId}-dep`}
                type="date"
                min={todayIso}
                className="flyjatt-native-input"
                value={departureDate}
                onChange={(e) => handleDepartureChange(e.target.value)}
                required
              />
            </Box>

            <Box className="flyjatt-stay-field">
              <label htmlFor={`${baseId}-ret`} className="flyjatt-stay-label">
                Return Date <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${baseId}-ret`}
                type="date"
                min={departureDate || todayIso}
                className="flyjatt-native-input"
                value={returnDate}
                onChange={(e) => {
                  setReturnDate(e.target.value);
                  setFormError("");
                }}
                required
              />
            </Box>

            <Box className="flyjatt-stay-field">
              <label htmlFor={`${baseId}-cabin`} className="flyjatt-stay-label">
                Cabin &amp; Currency
              </label>
              <Box sx={{ display: "grid", gridTemplateColumns: "1.4fr 0.75fr", gap: 0.6 }}>
                <select
                  id={`${baseId}-cabin`}
                  className="flyjatt-native-select"
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value)}
                >
                  {CABIN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Package currency"
                  type="text"
                  readOnly
                  className="flyjatt-native-input"
                  value="USD"
                  style={{ backgroundColor: "#f1f5f9", fontWeight: 700, textAlign: "center" }}
                />
              </Box>
            </Box>
          </Box>

          <datalist id={`${baseId}-airports`}>
            {POPULAR_FLIGHT_AIRPORTS.map((apt) => (
              <option key={apt.code} value={apt.label} />
            ))}
          </datalist>

          {/* Travelers row */}
          <Stack
            direction="row"
            spacing={1.2}
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
            sx={{ mt: 1.2 }}
          >
            <Box className="flyjatt-stay-stepper" sx={{ minWidth: 110, flexDirection: "row !important", gap: "0.6rem !important", px: "0.75rem !important" }}>
              <span className="flyjatt-stay-stepper-title">Adults</span>
              <button
                type="button"
                aria-label="Decrease adults"
                className="flyjatt-stepper-btn"
                onClick={() => setAdults((v) => Math.max(1, v - 1))}
              >
                −
              </button>
              <strong style={{ minWidth: 16, textAlign: "center" }}>{adults}</strong>
              <button
                type="button"
                aria-label="Increase adults"
                className="flyjatt-stepper-btn"
                onClick={() => setAdults((v) => Math.min(9, v + 1))}
              >
                +
              </button>
            </Box>

            <Box className="flyjatt-stay-stepper" sx={{ minWidth: 118, flexDirection: "row !important", gap: "0.6rem !important", px: "0.75rem !important" }}>
              <span className="flyjatt-stay-stepper-title">Children</span>
              <button
                type="button"
                aria-label="Decrease children"
                className="flyjatt-stepper-btn"
                onClick={() => setChildren((v) => Math.max(0, v - 1))}
              >
                −
              </button>
              <strong style={{ minWidth: 16, textAlign: "center" }}>{children}</strong>
              <button
                type="button"
                aria-label="Increase children"
                className="flyjatt-stepper-btn"
                onClick={() => setChildren((v) => Math.min(6, v + 1))}
              >
                +
              </button>
            </Box>

            <Box className="flyjatt-stay-stepper" sx={{ minWidth: 114, flexDirection: "row !important", gap: "0.6rem !important", px: "0.75rem !important" }}>
              <span className="flyjatt-stay-stepper-title">Infants</span>
              <button
                type="button"
                aria-label="Decrease infants"
                className="flyjatt-stepper-btn"
                onClick={() => setInfants((v) => Math.max(0, v - 1))}
              >
                −
              </button>
              <strong style={{ minWidth: 16, textAlign: "center" }}>{infants}</strong>
              <button
                type="button"
                aria-label="Increase infants"
                className="flyjatt-stepper-btn"
                onClick={() => setInfants((v) => Math.min(adults, v + 1))}
              >
                +
              </button>
            </Box>
          </Stack>
        </fieldset>

        <Divider sx={{ my: 1.5 }} />

        {/* Submit Row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.2,
          }}
        >
          <Typography sx={{ fontSize: "12.5px", color: "#526B86", fontWeight: 600 }}>
            Select your flight first — next we&apos;ll open your Hotel Stays Plan auto-matched to your arrival city &amp; dates (all hotel prices in USD).
          </Typography>
          <Button
            type="submit"
            startIcon={<SearchRoundedIcon />}
            sx={{
              color: "#ffffff",
              textTransform: "none",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "0.96rem",
              minHeight: "48px",
              px: 3.5,
              background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
              boxShadow: "0 10px 22px rgba(0, 130, 196, 0.28)",
              "&:hover": {
                background: "linear-gradient(120deg, #083a66 0%, #006da6 100%)",
              },
            }}
          >
            Search Package Flights
          </Button>
        </Box>
      </Box>
    </search>
  );
};

export default PackageSearchBox;
