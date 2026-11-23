import React, { useId, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  ClickAwayListener,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import { useNavigate } from "react-router-dom";
import reactSvg from "../../utils/reactSvg";
import _DepartureIcons from "../../asstes/img/HomeImage/flightIcons/deapature.svg?react";
import _ArrivalIcons from "../../asstes/img/HomeImage/flightIcons/arrival.svg?react";
import _TravlerIcons from "../../asstes/img/HomeImage/flightIcons/travlericons.svg?react";
import flightData from "../flightData";
import {
  addDaysToIsoDate,
  calculateNights,
  extractDestinationCityCode,
  formatIsoDateOffset,
  resolveStayDestinationFromAirport,
} from "../../utils/travelportHotel";
import { makeStayLeg } from "./HotelStaysPlanner";

const DepartureIcons = reactSvg(_DepartureIcons);
const ArrivalIcons = reactSvg(_ArrivalIcons);
const TravlerIcons = reactSvg(_TravlerIcons);

const INITIAL_AIRPORTS = [
  { code: "DAC", name: "Hazrat Shahjalal Intl Airport", Address: "Dhaka, BANGLADESH" },
  { code: "DXB", name: "Dubai Intl Airport", Address: "Dubai, UNITED ARAB EMIRATES" },
  { code: "AUH", name: "Zayed International Airport", Address: "Abu Dhabi, UNITED ARAB EMIRATES" },
  { code: "LHR", name: "London Heathrow Airport", Address: "London, UNITED KINGDOM" },
  { code: "JFK", name: "John F Kennedy Intl", Address: "New York, UNITED STATES" },
  { code: "KUL", name: "Kuala Lumpur Intl Airport", Address: "Kuala Lumpur, MALAYSIA" },
  { code: "SIN", name: "Changi Airport", Address: "Singapore, SINGAPORE" },
  { code: "IST", name: "Istanbul Airport", Address: "Istanbul, TURKEY" },
  { code: "DOH", name: "Hamad International Airport", Address: "Doha, QATAR" },
  { code: "BKK", name: "Suvarnabhumi Airport", Address: "Bangkok, THAILAND" },
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

function formatShortDate(iso) {
  if (!iso) return "Select Date";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function searchAirports(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return INITIAL_AIRPORTS;
  const list = Array.isArray(flightData) ? flightData : INITIAL_AIRPORTS;
  const codeMatches = [];
  const textMatches = [];
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    const code = String(item?.code || "").toLowerCase();
    const name = String(item?.name || "").toLowerCase();
    const addr = String(item?.Address || "").toLowerCase();
    if (code === q || code.startsWith(q)) {
      codeMatches.push(item);
    } else if (name.includes(q) || addr.includes(q) || code.includes(q)) {
      textMatches.push(item);
    }
    if (codeMatches.length + textMatches.length >= 16) break;
  }
  return [...codeMatches, ...textMatches].slice(0, 10);
}

const PackageSearchBox = ({
  initialValues = null,
  onSearchSubmit,
  compact = false,
}) => {
  const navigate = useNavigate();
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const todayIso = useMemo(() => formatIsoDateOffset(0), []);

  const defaultDeparture =
    initialValues?.flightCriteria?.departureDate || formatIsoDateOffset(7);
  const defaultReturn =
    initialValues?.flightCriteria?.returnDate || formatIsoDateOffset(22);

  const [fromCode, setFromCode] = useState(
    initialValues?.flightCriteria?.fromCode || "DAC"
  );
  const [fromLabel, setFromLabel] = useState(
    initialValues?.flightCriteria?.fromLabel || "Hazrat Shahjalal Intl Airport (DAC)"
  );
  const [fromAddress, setFromAddress] = useState("Dhaka, BANGLADESH");

  const [toCode, setToCode] = useState(
    initialValues?.flightCriteria?.toCode || "DXB"
  );
  const [toLabel, setToLabel] = useState(
    initialValues?.flightCriteria?.toLabel || "Dubai Intl Airport (DXB)"
  );
  const [toAddress, setToAddress] = useState("Dubai, UNITED ARAB EMIRATES");

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

  // Flight-pad style popovers
  const [openPanel, setOpenPanel] = useState(""); // "from" | "to" | "travelers" | ""
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [formError, setFormError] = useState("");

  const totalTripNights = useMemo(
    () => calculateNights(departureDate, returnDate),
    [departureDate, returnDate]
  );
  const totalPassengers = adults + children + infants;

  const fromSuggestions = useMemo(() => searchAirports(fromQuery), [fromQuery]);
  const toSuggestions = useMemo(() => searchAirports(toQuery), [toQuery]);

  const handleDepartureChange = (nextDep) => {
    setDepartureDate(nextDep);
    setFormError("");
    if (nextDep && returnDate && returnDate <= nextDep) {
      setReturnDate(addDaysToIsoDate(nextDep, 7));
    }
  };

  const handleSwapAirports = () => {
    setFromCode(toCode);
    setFromLabel(toLabel);
    setFromAddress(toAddress);
    setToCode(fromCode);
    setToLabel(fromLabel);
    setToAddress(fromAddress);
    setFormError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const resolvedFrom = extractAirportCode(fromCode || fromLabel, "");
    const resolvedTo = extractAirportCode(toCode || toLabel, "");

    if (!resolvedFrom || !resolvedTo) {
      setFormError("Please select valid departure and arrival airports.");
      return;
    }
    if (resolvedFrom === resolvedTo) {
      setFormError("Departure and arrival airports must be different.");
      return;
    }
    if (!departureDate || !returnDate || returnDate <= departureDate) {
      setFormError("Return date must be after departure date.");
      return;
    }

    setOpenPanel("");
    const arrivalInfo = resolveStayDestinationFromAirport(resolvedTo);
    const defaultAutoStay = [
      makeStayLeg("stay-1", arrivalInfo.primary, departureDate, returnDate, 1),
    ];

    const payload = {
      flightCriteria: {
        fromCode: resolvedFrom,
        fromLabel: fromLabel || `${resolvedFrom} (${resolvedFrom})`,
        toCode: resolvedTo,
        toLabel: toLabel || `${resolvedTo} (${resolvedTo})`,
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

  const cabinLabel =
    CABIN_OPTIONS.find((c) => c.value === cabinClass)?.label || "Economy";

  return (
    <ClickAwayListener onClickAway={() => setOpenPanel("")}>
      <search aria-label="Package: Flight + Hotel Organizer">
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
            p: { xs: 1.5, md: compact ? 1.8 : 2.1 },
          }}
        >
          {/* Header Row — Identical Layout & Typography to FlightSearchBox */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 1.2,
              mb: 1.5,
            }}
          >
            <Box>
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
              <Typography
                sx={{
                  color: "var(--filter-color)",
                  fontSize: "13px",
                  fontWeight: 500,
                  mt: 0.3,
                }}
              >
                Step 1: Search &amp; select your flight — then organize auto-matched or multi-city split hotel stays in USD.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                icon={<FlightTakeoffRoundedIcon sx={{ fontSize: "15px !important" }} />}
                label={`Round Trip • ${totalTripNights} Nights`}
                sx={{
                  bgcolor: "rgba(0,154,214,0.12)",
                  color: "var(--airport-color)",
                  fontWeight: 700,
                }}
              />
              <Chip
                size="small"
                icon={<PersonRoundedIcon sx={{ fontSize: "16px !important" }} />}
                label={`${totalPassengers} Traveler${totalPassengers > 1 ? "s" : ""}`}
                sx={{
                  bgcolor: "rgba(20,184,166,0.12)",
                  color: "#0f736c",
                  fontWeight: 700,
                }}
              />
              <Chip
                size="small"
                icon={<HotelRoundedIcon sx={{ fontSize: "15px !important" }} />}
                label="Hotels in USD Next"
                sx={{
                  bgcolor: "rgba(11,74,130,0.09)",
                  color: "#0b4a82",
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
                mb: 1.4,
                px: 1.5,
                py: 0.9,
                borderRadius: "10px",
                bgcolor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {formError}
            </Box>
          )}

          {/* Inner White Search Pad — Mirrors FlightSearchBox / RoundWay */}
          <Box
            sx={{
              borderRadius: "16px",
              border: "1px solid rgba(12, 65, 107, 0.14)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
              p: { xs: 1.2, md: 1.6 },
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
              position: "relative",
            }}
          >
            <Grid container spacing={{ xs: 1.5, md: 1.2 }} alignItems="center">
              {/* Departure Cell */}
              <Grid item xs={12} sm={6} md={2.35} sx={{ position: "relative" }}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setOpenPanel((p) => (p === "from" ? "" : "from"))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenPanel((p) => (p === "from" ? "" : "from"));
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    p: 1.1,
                    borderRadius: "12px",
                    border:
                      openPanel === "from"
                        ? "1.5px solid var(--primary-color)"
                        : "1px solid rgba(12, 65, 107, 0.14)",
                    bgcolor: "#ffffff",
                    transition: "border-color 140ms ease",
                    "&:hover": { borderColor: "var(--primary-color)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Typography sx={{ color: "var(--text-color)", fontSize: "12.5px", fontWeight: 600 }}>
                      Departure
                    </Typography>
                    <DepartureIcons sx={{ fontSize: "18px" }} />
                  </Box>
                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "var(--flight-color)",
                    }}
                    noWrap
                  >
                    {fromLabel}
                  </Typography>
                  <Typography sx={{ fontSize: "11.5px", color: "#64748b" }} noWrap>
                    {fromAddress}
                  </Typography>
                </Box>

                {openPanel === "from" && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: { xs: 0, md: "auto" },
                      width: { xs: "100%", md: "320px" },
                      zIndex: 50,
                      bgcolor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #cce0f4",
                      boxShadow: "0 18px 40px rgba(6, 34, 60, 0.22)",
                      p: 1.2,
                    }}
                  >
                    <input
                      autoFocus
                      type="search"
                      aria-label="Search departure airport"
                      className="flyjatt-native-input"
                      placeholder="City or airport code (e.g. DAC, DXB)"
                      value={fromQuery}
                      onChange={(e) => setFromQuery(e.target.value)}
                      style={{ marginBottom: "0.5rem", minBlockSize: "40px" }}
                    />
                    <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
                      {fromSuggestions.map((apt) => (
                        <Box
                          key={apt.code}
                          component="button"
                          type="button"
                          onClick={() => {
                            setFromCode(apt.code);
                            setFromLabel(`${apt.name} (${apt.code})`);
                            setFromAddress(apt.Address || "");
                            setFromQuery("");
                            setOpenPanel("to");
                          }}
                          sx={{
                            width: "100%",
                            textAlign: "left",
                            border: 0,
                            background: "transparent",
                            px: 1,
                            py: 0.8,
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 1,
                            "&:hover": { bgcolor: "#eef7ff" },
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f2942" }} noWrap>
                              {apt.name}
                            </Typography>
                            <Typography sx={{ fontSize: "11px", color: "#64748b" }} noWrap>
                              {apt.Address}
                            </Typography>
                          </Box>
                          <Chip size="small" label={apt.code} sx={{ fontWeight: 800, height: 22 }} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* Swap Button */}
              <Grid item xs={12} md={0.5} sx={{ display: "flex", justifyContent: "center" }}>
                <Box
                  component="button"
                  type="button"
                  aria-label="Swap departure and arrival airports"
                  onClick={handleSwapAirports}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1px solid rgba(0, 154, 214, 0.35)",
                    bgcolor: "#f0f9ff",
                    color: "#0b4a82",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    transition: "transform 160ms ease, background-color 160ms ease",
                    "&:hover": { bgcolor: "#dff2ff", transform: "rotate(180deg)" },
                  }}
                >
                  <SwapHorizRoundedIcon fontSize="small" />
                </Box>
              </Grid>

              {/* Arrival Cell */}
              <Grid item xs={12} sm={6} md={2.35} sx={{ position: "relative" }}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setOpenPanel((p) => (p === "to" ? "" : "to"))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenPanel((p) => (p === "to" ? "" : "to"));
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    p: 1.1,
                    borderRadius: "12px",
                    border:
                      openPanel === "to"
                        ? "1.5px solid var(--primary-color)"
                        : "1px solid rgba(12, 65, 107, 0.14)",
                    bgcolor: "#ffffff",
                    transition: "border-color 140ms ease",
                    "&:hover": { borderColor: "var(--primary-color)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Typography sx={{ color: "var(--text-color)", fontSize: "12.5px", fontWeight: 600 }}>
                      Arrival (Hotel City)
                    </Typography>
                    <ArrivalIcons sx={{ fontSize: "18px" }} />
                  </Box>
                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "var(--flight-color)",
                    }}
                    noWrap
                  >
                    {toLabel}
                  </Typography>
                  <Typography sx={{ fontSize: "11.5px", color: "#64748b" }} noWrap>
                    {toAddress}
                  </Typography>
                </Box>

                {openPanel === "to" && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: { xs: 0, md: "auto" },
                      width: { xs: "100%", md: "320px" },
                      zIndex: 50,
                      bgcolor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #cce0f4",
                      boxShadow: "0 18px 40px rgba(6, 34, 60, 0.22)",
                      p: 1.2,
                    }}
                  >
                    <input
                      autoFocus
                      type="search"
                      aria-label="Search arrival airport"
                      className="flyjatt-native-input"
                      placeholder="Destination city or code (e.g. DXB, LON)"
                      value={toQuery}
                      onChange={(e) => setToQuery(e.target.value)}
                      style={{ marginBottom: "0.5rem", minBlockSize: "40px" }}
                    />
                    <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
                      {toSuggestions.map((apt) => (
                        <Box
                          key={apt.code}
                          component="button"
                          type="button"
                          onClick={() => {
                            setToCode(apt.code);
                            setToLabel(`${apt.name} (${apt.code})`);
                            setToAddress(apt.Address || "");
                            setToQuery("");
                            setOpenPanel("");
                          }}
                          sx={{
                            width: "100%",
                            textAlign: "left",
                            border: 0,
                            background: "transparent",
                            px: 1,
                            py: 0.8,
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 1,
                            "&:hover": { bgcolor: "#eef7ff" },
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f2942" }} noWrap>
                              {apt.name}
                            </Typography>
                            <Typography sx={{ fontSize: "11px", color: "#64748b" }} noWrap>
                              {apt.Address}
                            </Typography>
                          </Box>
                          <Chip size="small" label={apt.code} sx={{ fontWeight: 800, height: 22 }} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* Departure Date */}
              <Grid item xs={6} sm={3} md={1.55}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "12px",
                    border: "1px solid rgba(12, 65, 107, 0.14)",
                    bgcolor: "#ffffff",
                  }}
                >
                  <label
                    htmlFor={`${baseId}-dep`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-color)",
                      cursor: "pointer",
                    }}
                  >
                    <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: "var(--primary-color)" }} />
                    <span>Departure</span>
                  </label>
                  <input
                    id={`${baseId}-dep`}
                    type="date"
                    min={todayIso}
                    value={departureDate}
                    onChange={(e) => handleDepartureChange(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      border: 0,
                      outline: "none",
                      background: "transparent",
                      fontFamily: "inherit",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      color: "var(--flight-color)",
                      marginTop: "4px",
                      cursor: "pointer",
                    }}
                  />
                  <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                    {formatShortDate(departureDate)}
                  </Typography>
                </Box>
              </Grid>

              {/* Return Date */}
              <Grid item xs={6} sm={3} md={1.55}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "12px",
                    border: "1px solid rgba(12, 65, 107, 0.14)",
                    bgcolor: "#ffffff",
                  }}
                >
                  <label
                    htmlFor={`${baseId}-ret`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-color)",
                      cursor: "pointer",
                    }}
                  >
                    <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: "var(--primary-color)" }} />
                    <span>Return</span>
                  </label>
                  <input
                    id={`${baseId}-ret`}
                    type="date"
                    min={departureDate || todayIso}
                    value={returnDate}
                    onChange={(e) => {
                      setReturnDate(e.target.value);
                      setFormError("");
                    }}
                    required
                    style={{
                      width: "100%",
                      border: 0,
                      outline: "none",
                      background: "transparent",
                      fontFamily: "inherit",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      color: "var(--flight-color)",
                      marginTop: "4px",
                      cursor: "pointer",
                    }}
                  />
                  <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                    {formatShortDate(returnDate)}
                  </Typography>
                </Box>
              </Grid>

              {/* Travelers & Cabin Cell */}
              <Grid item xs={12} sm={6} md={1.8} sx={{ position: "relative" }}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setOpenPanel((p) => (p === "travelers" ? "" : "travelers"))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenPanel((p) => (p === "travelers" ? "" : "travelers"));
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    p: 1.1,
                    borderRadius: "12px",
                    border:
                      openPanel === "travelers"
                        ? "1.5px solid var(--primary-color)"
                        : "1px solid rgba(12, 65, 107, 0.14)",
                    bgcolor: "#ffffff",
                    "&:hover": { borderColor: "var(--primary-color)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
                    <Typography sx={{ color: "var(--text-color)", fontSize: "12.5px", fontWeight: 600 }}>
                      Traveler &amp; Cabin
                    </Typography>
                    <TravlerIcons sx={{ fontSize: "16px" }} />
                  </Box>
                  <Typography sx={{ mt: 0.4, fontSize: "14.5px", fontWeight: 800, color: "var(--flight-color)" }} noWrap>
                    {totalPassengers} Traveler{totalPassengers > 1 ? "s" : ""}
                  </Typography>
                  <Typography sx={{ fontSize: "11.5px", color: "#64748b" }} noWrap>
                    {cabinLabel} • USD
                  </Typography>
                </Box>

                {openPanel === "travelers" && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      width: { xs: "100%", sm: "290px" },
                      zIndex: 50,
                      bgcolor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #cce0f4",
                      boxShadow: "0 18px 40px rgba(6, 34, 60, 0.22)",
                      p: 1.6,
                    }}
                  >
                    <Stack spacing={1.2}>
                      {[
                        { label: "Adults", sub: "12+ yrs", val: adults, dec: () => setAdults((v) => Math.max(1, v - 1)), inc: () => setAdults((v) => Math.min(9, v + 1)) },
                        { label: "Children", sub: "2–11 yrs", val: children, dec: () => setChildren((v) => Math.max(0, v - 1)), inc: () => setChildren((v) => Math.min(6, v + 1)) },
                        { label: "Infants", sub: "Under 2", val: infants, dec: () => setInfants((v) => Math.max(0, v - 1)), inc: () => setInfants((v) => Math.min(adults, v + 1)) },
                      ].map((row) => (
                        <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box>
                            <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#0f2942" }}>{row.label}</Typography>
                            <Typography sx={{ fontSize: "11px", color: "#64748b" }}>{row.sub}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
                            <button type="button" aria-label={`Decrease ${row.label}`} className="flyjatt-stepper-btn" onClick={row.dec}>−</button>
                            <strong style={{ minWidth: 16, textAlign: "center" }}>{row.val}</strong>
                            <button type="button" aria-label={`Increase ${row.label}`} className="flyjatt-stepper-btn" onClick={row.inc}>+</button>
                          </Box>
                        </Box>
                      ))}
                      <Divider />
                      <Box className="flyjatt-stay-field">
                        <label htmlFor={`${baseId}-cabin`} className="flyjatt-stay-label">Cabin Class</label>
                        <select
                          id={`${baseId}-cabin`}
                          className="flyjatt-native-select"
                          style={{ minBlockSize: "40px" }}
                          value={cabinClass}
                          onChange={(e) => setCabinClass(e.target.value)}
                        >
                          {CABIN_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </Box>
                      <Button
                        type="button"
                        size="small"
                        variant="contained"
                        onClick={() => setOpenPanel("")}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: "9px" }}
                      >
                        Done
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Grid>

              {/* Search CTA Button */}
              <Grid item xs={12} sm={6} md={1.9}>
                <Button
                  type="submit"
                  fullWidth
                  startIcon={<SearchRoundedIcon />}
                  sx={{
                    color: "#ffffff",
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    borderRadius: "12px",
                    fontWeight: 800,
                    fontSize: "13.5px",
                    px: 1.5,
                    minHeight: "64px",
                    background: "linear-gradient(120deg, var(--primary-color), #007bb0)",
                    boxShadow: "0 10px 22px rgba(0, 130, 196, 0.28)",
                    "&:hover": {
                      background: "linear-gradient(120deg, #008fc6, #006f9f)",
                    },
                  }}
                >
                  Search Package
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </search>
    </ClickAwayListener>
  );
};

export default PackageSearchBox;
