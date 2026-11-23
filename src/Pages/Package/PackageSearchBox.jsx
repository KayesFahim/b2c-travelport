import React, { useEffect, useId, useMemo, useRef, useState } from "react";
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
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { useNavigate } from "react-router-dom";
import {
  HOTEL_CURRENCY_OPTIONS,
  POPULAR_STAY_DESTINATIONS,
  addDaysToIsoDate,
  calculateNights,
  extractDestinationCityCode,
  formatIsoDateOffset,
  getDestinationLabelByCode,
  resolveStayDestinationFromAirport,
} from "../../utils/travelportHotel";

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

function makeStayLeg(id, cityCode, checkIn, checkOut, rooms = 1) {
  const label = getDestinationLabelByCode(cityCode) || `${cityCode} (${cityCode})`;
  return {
    id,
    destination: label,
    cityCode,
    checkIn,
    checkOut,
    rooms: Math.max(1, Number(rooms) || 1),
  };
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
    initialValues?.flightCriteria?.returnDate || formatIsoDateOffset(22); // 15-day trip by default

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
  const [currency, setCurrency] = useState(
    initialValues?.flightCriteria?.currency || "USD"
  );

  const [staysCustomized, setStaysCustomized] = useState(
    Boolean(
      Array.isArray(initialValues?.hotelStays) &&
        initialValues.hotelStays.length > 0
    )
  );

  const [hotelStays, setHotelStays] = useState(() => {
    if (
      Array.isArray(initialValues?.hotelStays) &&
      initialValues.hotelStays.length > 0
    ) {
      return initialValues.hotelStays.map((stay, index) => ({
        id: stay.id || `stay-${index + 1}`,
        destination:
          stay.destination ||
          getDestinationLabelByCode(stay.cityCode || "DXB"),
        cityCode:
          stay.cityCode || extractDestinationCityCode(stay.destination) || "DXB",
        checkIn: stay.checkIn || defaultDeparture,
        checkOut: stay.checkOut || defaultReturn,
        rooms: Math.max(1, Number(stay.rooms) || 1),
      }));
    }
    const resolved = resolveStayDestinationFromAirport(
      extractAirportCode(
        initialValues?.flightCriteria?.toLabel || "Dubai (DXB)",
        "DXB"
      )
    );
    return [
      makeStayLeg("stay-1", resolved.primary, defaultDeparture, defaultReturn, 1),
    ];
  });

  const [formError, setFormError] = useState("");

  const arrivalCode = useMemo(
    () => extractAirportCode(toInput, "DXB"),
    [toInput]
  );
  const arrivalInfo = useMemo(
    () => resolveStayDestinationFromAirport(arrivalCode),
    [arrivalCode]
  );

  const totalTripNights = useMemo(
    () => calculateNights(departureDate, returnDate),
    [departureDate, returnDate]
  );

  // Auto-sync Stay 1 with flight arrival city and dates until customer customizes stays
  useEffect(() => {
    if (staysCustomized) return;
    setHotelStays([
      makeStayLeg(
        "stay-1",
        arrivalInfo.primary,
        departureDate,
        returnDate,
        hotelStays[0]?.rooms || 1
      ),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalInfo.primary, departureDate, returnDate, staysCustomized]);

  const stayCoverage = useMemo(() => {
    let totalStayNights = 0;
    let hasInvalidDates = false;
    let hasOutsideFlightRange = false;

    hotelStays.forEach((stay) => {
      if (!stay.checkIn || !stay.checkOut || stay.checkOut <= stay.checkIn) {
        hasInvalidDates = true;
      } else {
        totalStayNights += calculateNights(stay.checkIn, stay.checkOut);
        if (stay.checkIn < departureDate || stay.checkOut > returnDate) {
          hasOutsideFlightRange = true;
        }
      }
    });

    return {
      totalStayNights,
      hasInvalidDates,
      hasOutsideFlightRange,
    };
  }, [departureDate, hotelStays, returnDate]);

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

  const handleResetAutoStay = () => {
    setStaysCustomized(false);
    setHotelStays([
      makeStayLeg("stay-1", arrivalInfo.primary, departureDate, returnDate, 1),
    ]);
    setFormError("");
  };

  // Smart Split-Stay preset: e.g., 15-day Dubai trip -> 7 nights Dubai (DXB) + 7 nights Abu Dhabi (AUH)
  const handleQuickSplitStay = () => {
    const companionCode =
      (arrivalInfo.companions || []).find((c) => c !== arrivalInfo.primary) ||
      (arrivalInfo.primary === "DXB" ? "AUH" : "DXB");
    const firstLegNights = Math.max(1, Math.floor(totalTripNights / 2));
    const remainingNights = Math.max(1, totalTripNights - firstLegNights);
    const secondLegNights =
      totalTripNights >= 14 && totalTripNights % 2 === 1
        ? firstLegNights
        : remainingNights;

    const stay1End = addDaysToIsoDate(departureDate, firstLegNights);
    const stay2End = addDaysToIsoDate(stay1End, secondLegNights);

    setStaysCustomized(true);
    setHotelStays([
      makeStayLeg("stay-1", arrivalInfo.primary, departureDate, stay1End, 1),
      makeStayLeg(
        "stay-2",
        companionCode,
        stay1End,
        stay2End <= returnDate ? stay2End : returnDate,
        1
      ),
    ]);
    setFormError("");
  };

  const handleAddStay = () => {
    if (hotelStays.length >= 5) return;
    setStaysCustomized(true);
    const lastStay = hotelStays[hotelStays.length - 1];
    const usedCodes = new Set(hotelStays.map((s) => s.cityCode));
    const nextCode =
      (arrivalInfo.companions || []).find((c) => !usedCodes.has(c)) ||
      POPULAR_STAY_DESTINATIONS.find((d) => !usedCodes.has(d.code))?.code ||
      arrivalInfo.primary;

    let nextStart = lastStay?.checkOut || departureDate;
    let nextEnd = returnDate;

    // If last stay already reached returnDate, split last stay in half to make room
    if (nextStart >= returnDate) {
      const lastNights = calculateNights(lastStay.checkIn, lastStay.checkOut);
      if (lastNights >= 2) {
        const splitNights = Math.floor(lastNights / 2);
        const splitDate = addDaysToIsoDate(lastStay.checkIn, splitNights);
        const updated = hotelStays.map((s, idx) =>
          idx === hotelStays.length - 1 ? { ...s, checkOut: splitDate } : s
        );
        setHotelStays([
          ...updated,
          makeStayLeg(
            `stay-${Date.now()}`,
            nextCode,
            splitDate,
            returnDate,
            lastStay.rooms || 1
          ),
        ]);
        return;
      }
      nextStart = departureDate;
      nextEnd = addDaysToIsoDate(departureDate, 2);
    }

    if (nextEnd <= nextStart) {
      nextEnd = addDaysToIsoDate(nextStart, 2);
    }

    setHotelStays((prev) => [
      ...prev,
      makeStayLeg(
        `stay-${Date.now()}`,
        nextCode,
        nextStart,
        nextEnd,
        lastStay?.rooms || 1
      ),
    ]);
  };

  const handleUpdateStay = (stayId, patch) => {
    setStaysCustomized(true);
    setFormError("");
    setHotelStays((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) return stay;
        const next = { ...stay, ...patch };
        if (patch.destination !== undefined) {
          next.cityCode =
            extractDestinationCityCode(patch.destination) ||
            extractAirportCode(patch.destination, stay.cityCode);
        }
        if (patch.checkIn && next.checkOut <= patch.checkIn) {
          next.checkOut = addDaysToIsoDate(patch.checkIn, 1);
        }
        return next;
      })
    );
  };

  const handleRemoveStay = (stayId) => {
    if (hotelStays.length <= 1) return;
    setStaysCustomized(true);
    setHotelStays((prev) => prev.filter((stay) => stay.id !== stayId));
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
    if (stayCoverage.hasInvalidDates) {
      setFormError("Every hotel stay must have a check-out date after check-in.");
      return;
    }

    const normalizedStays = hotelStays.map((stay, idx) => {
      const code =
        extractDestinationCityCode(stay.destination) ||
        extractAirportCode(stay.destination, arrivalInfo.primary);
      return {
        id: stay.id || `stay-${idx + 1}`,
        destination: stay.destination.trim() || getDestinationLabelByCode(code),
        cityCode: code,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: calculateNights(stay.checkIn, stay.checkOut),
        rooms: Math.max(1, Number(stay.rooms) || 1),
      };
    });

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
        currency,
      },
      hotelStays: normalizedStays,
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

  const companionPreviewCode =
    (arrivalInfo.companions || []).find((c) => c !== arrivalInfo.primary) ||
    "AUH";
  const companionPreviewName =
    POPULAR_STAY_DESTINATIONS.find((d) => d.code === companionPreviewCode)
      ?.city || companionPreviewCode;
  const primaryCityName =
    POPULAR_STAY_DESTINATIONS.find((d) => d.code === arrivalInfo.primary)
      ?.city || arrivalInfo.primary;
  const splitHalfNights = Math.max(1, Math.floor(totalTripNights / 2));

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
                Package: Flight + Hotel Organizer
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
              Hotels auto-match your arrival city &amp; flight dates — or split
              your trip across multiple cities (e.g., 7 nights Dubai + 7 nights
              Abu Dhabi).
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={`${totalTripNights}-Night Round Trip`}
              sx={{
                bgcolor: "rgba(0,154,214,0.12)",
                color: "var(--airport-color)",
                fontWeight: 700,
              }}
            />
            <Chip
              size="small"
              label={`${hotelStays.length} Hotel Stay${hotelStays.length > 1 ? "s" : ""} • ${stayCoverage.totalStayNights}n`}
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

        {/* Section 1: Round-Trip Flight */}
        <fieldset className="flyjatt-filter-fieldset" style={{ marginBottom: "1rem" }}>
          <legend>1. Round-Trip Flight Details</legend>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "1.2fr auto 1.2fr 1fr 1fr 1.2fr",
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
              <Box sx={{ display: "grid", gridTemplateColumns: "1.35fr 0.85fr", gap: 0.6 }}>
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
                <select
                  aria-label="Package currency"
                  className="flyjatt-native-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {HOTEL_CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
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

        {/* Section 2: Auto-Synced & Split-Stay Hotel Plan */}
        <fieldset className="flyjatt-filter-fieldset">
          <legend>2. Hotel Stays Plan (Auto-Matched or Multi-City Split Stay)</legend>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              mb: 1.2,
              mt: 0.3,
            }}
          >
            <Typography sx={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>
              {staysCustomized
                ? `Custom stay schedule: ${stayCoverage.totalStayNights} of ${totalTripNights} trip night(s) planned across ${hotelStays.length} hotel stay(s).`
                : `Auto-synced to ${arrivalInfo.label} (${departureDate} → ${returnDate}, ${totalTripNights} nights). Edit freely or split into multiple cities!`}
            </Typography>

            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              {totalTripNights >= 4 && (
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<CallSplitRoundedIcon fontSize="small" />}
                  onClick={handleQuickSplitStay}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "12px",
                    borderRadius: "999px",
                    borderColor: "#007bb0",
                    color: "#0b4a82",
                    bgcolor: "#f0f9ff",
                  }}
                >
                  Split Stay: {splitHalfNights}n {primaryCityName} +{" "}
                  {totalTripNights >= 14 && totalTripNights % 2 === 1
                    ? splitHalfNights
                    : totalTripNights - splitHalfNights}
                  n {companionPreviewName}
                </Button>
              )}

              <Button
                type="button"
                size="small"
                variant="outlined"
                startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
                disabled={hotelStays.length >= 5}
                onClick={handleAddStay}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  borderRadius: "999px",
                }}
              >
                + Add City / Hotel Stay
              </Button>

              {staysCustomized && (
                <Button
                  type="button"
                  size="small"
                  variant="text"
                  startIcon={<RestartAltRoundedIcon fontSize="small" />}
                  onClick={handleResetAutoStay}
                  sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
                >
                  Reset to Full Stay
                </Button>
              )}
            </Stack>
          </Box>

          <datalist id={`${baseId}-stay-cities`}>
            {POPULAR_STAY_DESTINATIONS.map((dest) => (
              <option key={dest.code} value={dest.label}>
                {dest.city}, {dest.country}
              </option>
            ))}
          </datalist>

          <Stack spacing={1}>
            {hotelStays.map((stay, idx) => {
              const stayNights = calculateNights(stay.checkIn, stay.checkOut);
              return (
                <Box
                  key={stay.id}
                  sx={{
                    p: 1.2,
                    borderRadius: "12px",
                    bgcolor: "#ffffff",
                    border: "1px solid #d7e6f5",
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "auto 1.4fr 1fr 1fr 0.7fr auto auto",
                    },
                    gap: 1,
                    alignItems: "end",
                  }}
                >
                  <Chip
                    size="small"
                    icon={<HotelRoundedIcon sx={{ fontSize: "15px !important" }} />}
                    label={`Stay ${idx + 1}`}
                    sx={{
                      fontWeight: 800,
                      bgcolor: "#e0f2fe",
                      color: "#0b4a82",
                      height: 32,
                      mb: { lg: 0.7 },
                    }}
                  />

                  <Box className="flyjatt-stay-field">
                    <label
                      htmlFor={`${baseId}-stay-city-${stay.id}`}
                      className="flyjatt-stay-label"
                    >
                      Hotel City / Code
                    </label>
                    <input
                      id={`${baseId}-stay-city-${stay.id}`}
                      type="text"
                      list={`${baseId}-stay-cities`}
                      className="flyjatt-native-input"
                      placeholder="e.g. Dubai (DXB), Abu Dhabi (AUH)"
                      value={stay.destination}
                      onChange={(e) =>
                        handleUpdateStay(stay.id, {
                          destination: e.target.value,
                        })
                      }
                      required
                    />
                  </Box>

                  <Box className="flyjatt-stay-field">
                    <label
                      htmlFor={`${baseId}-stay-in-${stay.id}`}
                      className="flyjatt-stay-label"
                    >
                      Check-in
                    </label>
                    <input
                      id={`${baseId}-stay-in-${stay.id}`}
                      type="date"
                      min={todayIso}
                      className="flyjatt-native-input"
                      value={stay.checkIn}
                      onChange={(e) =>
                        handleUpdateStay(stay.id, { checkIn: e.target.value })
                      }
                      required
                    />
                  </Box>

                  <Box className="flyjatt-stay-field">
                    <label
                      htmlFor={`${baseId}-stay-out-${stay.id}`}
                      className="flyjatt-stay-label"
                    >
                      Check-out
                    </label>
                    <input
                      id={`${baseId}-stay-out-${stay.id}`}
                      type="date"
                      min={stay.checkIn || todayIso}
                      className="flyjatt-native-input"
                      value={stay.checkOut}
                      onChange={(e) =>
                        handleUpdateStay(stay.id, { checkOut: e.target.value })
                      }
                      required
                    />
                  </Box>

                  <Box className="flyjatt-stay-field">
                    <label
                      htmlFor={`${baseId}-stay-rooms-${stay.id}`}
                      className="flyjatt-stay-label"
                    >
                      Rooms
                    </label>
                    <select
                      id={`${baseId}-stay-rooms-${stay.id}`}
                      className="flyjatt-native-select"
                      value={stay.rooms}
                      onChange={(e) =>
                        handleUpdateStay(stay.id, {
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

                  <Chip
                    size="small"
                    label={`${stayNights} night${stayNights > 1 ? "s" : ""}`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: "#f1f5f9",
                      color: "#0f2942",
                      height: 32,
                      mb: { lg: 0.7 },
                    }}
                  />

                  {hotelStays.length > 1 ? (
                    <Tooltip title="Remove this stay">
                      <IconButton
                        type="button"
                        aria-label={`Remove Stay ${idx + 1}`}
                        color="error"
                        onClick={() => handleRemoveStay(stay.id)}
                        sx={{ mb: { lg: 0.4 } }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Box sx={{ width: 32, display: { xs: "none", lg: "block" } }} />
                  )}
                </Box>
              );
            })}
          </Stack>

          {stayCoverage.hasOutsideFlightRange && (
            <Typography
              sx={{
                mt: 1,
                fontSize: "12px",
                color: "#b45309",
                fontWeight: 600,
              }}
            >
              Note: One or more hotel stay dates extend outside your flight dates ({departureDate} – {returnDate}). You can still search if intentional.
            </Typography>
          )}
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
            Searches live Travelport Air + Stays v11 simultaneously for your flight and every hotel stay leg.
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
            Search Flight + {hotelStays.length} Hotel Stay
            {hotelStays.length > 1 ? "s" : ""}
          </Button>
        </Box>
      </Box>
    </search>
  );
};

export default PackageSearchBox;
