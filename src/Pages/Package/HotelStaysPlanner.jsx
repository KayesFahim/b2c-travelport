import React, { useEffect, useId, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  POPULAR_STAY_DESTINATIONS,
  addDaysToIsoDate,
  calculateNights,
  extractDestinationCityCode,
  formatIsoDateOffset,
  getDestinationLabelByCode,
  resolveStayDestinationFromAirport,
} from "../../utils/travelportHotel";

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

export function makeStayLeg(id, cityCode, checkIn, checkOut, rooms = 1) {
  const label = getDestinationLabelByCode(cityCode) || `${cityCode} (${cityCode})`;
  return {
    id,
    destination: label,
    cityCode,
    checkIn,
    checkOut,
    nights: calculateNights(checkIn, checkOut),
    rooms: Math.max(1, Number(rooms) || 1),
  };
}

const HotelStaysPlanner = ({
  arrivalAirportCode = "DXB",
  departureDate,
  returnDate,
  initialStays = null,
  onApplyStays,
  submitLabel = "Search Live Hotels for This Stay Plan",
  title = "2. Hotel Stays Plan (Auto-Matched or Multi-City Split Stay)",
}) => {
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const todayIso = useMemo(() => formatIsoDateOffset(0), []);

  const safeDep = departureDate || formatIsoDateOffset(7);
  const safeRet =
    returnDate && returnDate > safeDep
      ? returnDate
      : addDaysToIsoDate(safeDep, 3);

  const arrivalInfo = useMemo(
    () => resolveStayDestinationFromAirport(arrivalAirportCode || "DXB"),
    [arrivalAirportCode]
  );

  const totalTripNights = useMemo(
    () => calculateNights(safeDep, safeRet),
    [safeDep, safeRet]
  );

  const [staysCustomized, setStaysCustomized] = useState(
    Boolean(Array.isArray(initialStays) && initialStays.length > 1)
  );

  const [hotelStays, setHotelStays] = useState(() => {
    if (Array.isArray(initialStays) && initialStays.length > 0) {
      return initialStays.map((stay, idx) => ({
        id: stay.id || `stay-${idx + 1}`,
        destination:
          stay.destination ||
          getDestinationLabelByCode(stay.cityCode || arrivalInfo.primary),
        cityCode:
          stay.cityCode ||
          extractDestinationCityCode(stay.destination) ||
          arrivalInfo.primary,
        checkIn: stay.checkIn || safeDep,
        checkOut: stay.checkOut || safeRet,
        nights: calculateNights(stay.checkIn || safeDep, stay.checkOut || safeRet),
        rooms: Math.max(1, Number(stay.rooms) || 1),
      }));
    }
    return [makeStayLeg("stay-1", arrivalInfo.primary, safeDep, safeRet, 1)];
  });

  const [formError, setFormError] = useState("");

  // Keep synced with arrival city/dates when flight changes and user hasn't manually customized
  useEffect(() => {
    if (staysCustomized) return;
    if (Array.isArray(initialStays) && initialStays.length > 1) return;
    setHotelStays([
      makeStayLeg(
        "stay-1",
        arrivalInfo.primary,
        safeDep,
        safeRet,
        hotelStays[0]?.rooms || 1
      ),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalInfo.primary, safeDep, safeRet, staysCustomized]);

  const stayCoverage = useMemo(() => {
    let totalStayNights = 0;
    let hasInvalidDates = false;
    let hasOutsideFlightRange = false;

    hotelStays.forEach((stay) => {
      if (!stay.checkIn || !stay.checkOut || stay.checkOut <= stay.checkIn) {
        hasInvalidDates = true;
      } else {
        totalStayNights += calculateNights(stay.checkIn, stay.checkOut);
        if (stay.checkIn < safeDep || stay.checkOut > safeRet) {
          hasOutsideFlightRange = true;
        }
      }
    });

    return {
      totalStayNights,
      hasInvalidDates,
      hasOutsideFlightRange,
    };
  }, [hotelStays, safeDep, safeRet]);

  const emitIfValid = (nextStays) => {
    const normalized = nextStays.map((stay, idx) => {
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
    if (typeof onApplyStays === "function") {
      onApplyStays(normalized);
    }
  };

  const handleResetAutoStay = () => {
    const resetList = [
      makeStayLeg("stay-1", arrivalInfo.primary, safeDep, safeRet, 1),
    ];
    setStaysCustomized(false);
    setHotelStays(resetList);
    setFormError("");
    emitIfValid(resetList);
  };

  // Smart Split-Stay preset: e.g. 15-day Dubai trip -> 7n Dubai (DXB) + 7n Abu Dhabi (AUH)
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

    const stay1End = addDaysToIsoDate(safeDep, firstLegNights);
    const stay2End = addDaysToIsoDate(stay1End, secondLegNights);

    const splitList = [
      makeStayLeg("stay-1", arrivalInfo.primary, safeDep, stay1End, 1),
      makeStayLeg(
        "stay-2",
        companionCode,
        stay1End,
        stay2End <= safeRet ? stay2End : safeRet,
        1
      ),
    ];

    setStaysCustomized(true);
    setHotelStays(splitList);
    setFormError("");
    emitIfValid(splitList);
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

    let nextStart = lastStay?.checkOut || safeDep;
    let nextEnd = safeRet;
    let baseList = hotelStays;

    if (nextStart >= safeRet && lastStay) {
      const lastNights = calculateNights(lastStay.checkIn, lastStay.checkOut);
      if (lastNights >= 2) {
        const splitNights = Math.floor(lastNights / 2);
        const splitDate = addDaysToIsoDate(lastStay.checkIn, splitNights);
        baseList = hotelStays.map((s, idx) =>
          idx === hotelStays.length - 1
            ? {
                ...s,
                checkOut: splitDate,
                nights: calculateNights(s.checkIn, splitDate),
              }
            : s
        );
        nextStart = splitDate;
      } else {
        nextStart = safeDep;
        nextEnd = addDaysToIsoDate(safeDep, 2);
      }
    }

    if (nextEnd <= nextStart) {
      nextEnd = addDaysToIsoDate(nextStart, 2);
    }

    const nextList = [
      ...baseList,
      makeStayLeg(
        `stay-${Date.now()}`,
        nextCode,
        nextStart,
        nextEnd,
        lastStay?.rooms || 1
      ),
    ];
    setHotelStays(nextList);
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
        next.nights = calculateNights(next.checkIn, next.checkOut);
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
    if (stayCoverage.hasInvalidDates) {
      setFormError("Every hotel stay must have a check-out date after check-in.");
      return;
    }
    setFormError("");
    emitIfValid(hotelStays);
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
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <fieldset className="flyjatt-filter-fieldset">
        <legend>{title}</legend>

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
          <Typography sx={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>
            {staysCustomized
              ? `Custom stay schedule: ${stayCoverage.totalStayNights} of ${totalTripNights} trip night(s) planned across ${hotelStays.length} hotel stay(s).`
              : `Auto-synced to ${arrivalInfo.label} (${safeDep} → ${safeRet}, ${totalTripNights} nights). Edit freely or split into multiple cities!`}
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

        {formError && (
          <Box
            role="alert"
            sx={{
              mb: 1.2,
              px: 1.4,
              py: 0.9,
              borderRadius: "9px",
              bgcolor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "0.84rem",
              fontWeight: 600,
            }}
          >
            {formError}
          </Box>
        )}

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
            Note: One or more hotel stay dates extend outside your flight dates ({safeDep} – {safeRet}).
          </Typography>
        )}

        <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchRoundedIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "10px",
              minHeight: "44px",
              px: 2.8,
              background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
            }}
          >
            {submitLabel}
          </Button>
        </Box>
      </fieldset>
    </Box>
  );
};

export default HotelStaysPlanner;
