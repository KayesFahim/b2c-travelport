import {
  AccessTimeRounded,
  AirlineSeatReclineNormalRounded,
  AirplanemodeActiveRounded,
  CalendarTodayRounded,
  ConnectingAirportsRounded,
  FlightLandRounded,
  FlightTakeoffRounded,
  InfoOutlined,
  LiveTvRounded,
  LuggageRounded,
  PowerRounded,
  RestaurantRounded,
  StarRounded,
  VerifiedRounded,
  WifiRounded,
} from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Chip, Tab, Typography } from "@mui/material";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import {
  calculateTransitTime,
  convertMinutesToHoursAndMinutes,
} from "../common/funcation";
import { resolveAirlineName, resolveAirportInfo } from "../../utils/travelLookup";

const getValueByKeys = (obj, keys = []) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return undefined;
};

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return (
      toText(value.text) ||
      toText(value.Text) ||
      toText(value.value) ||
      toText(value.Value) ||
      toText(value.code) ||
      toText(value.Code) ||
      ""
    );
  }
  return "";
};

const formatDate = (dateTime) => {
  if (!dateTime) return "N/A";
  const parsed = moment.utc(dateTime);
  return parsed.isValid() ? parsed.format("ddd, D MMM YYYY") : "N/A";
};

const formatTime = (dateTime) => {
  if (!dateTime) return "--:--";
  const parsed = moment.utc(dateTime);
  return parsed.isValid() ? parsed.format("HH:mm") : "--:--";
};

const formatDuration = (rawDuration) => {
  if (rawDuration === undefined || rawDuration === null) {
    return "N/A";
  }

  if (typeof rawDuration === "number" && Number.isFinite(rawDuration)) {
    return convertMinutesToHoursAndMinutes(rawDuration);
  }

  if (typeof rawDuration === "string") {
    const trimmed = rawDuration.trim();

    if (/^\d+$/.test(trimmed)) {
      return convertMinutesToHoursAndMinutes(Number(trimmed));
    }

    if (trimmed.startsWith("PT")) {
      const hoursMatch = trimmed.match(/(\d+)H/i);
      const minutesMatch = trimmed.match(/(\d+)M/i);
      const hours = Number(hoursMatch?.[1] || 0);
      const minutes = Number(minutesMatch?.[1] || 0);
      return `${hours}H ${minutes}Min`;
    }
  }

  return String(rawDuration);
};

const getCabinClass = (cabinCode) => {
  switch (cabinCode) {
    case "M":
    case "Y":
    case "Economy":
      return "Economy";
    case "C":
    case "I":
    case "Business":
      return "Business";
    case "P":
    case "First":
      return "First";
    case "S":
    case "U":
    case "PremiumEconomy":
    case "Premium Economy":
      return "Premium Economy";
    default:
      return "Economy";
  }
};

const getStopText = (segmentCount = 0) => {
  const stops = Math.max(Number(segmentCount || 0) - 1, 0);
  if (stops === 0) return "Non-stop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
};

const normalizePaxType = (value) => {
  const code = String(value || "").toUpperCase();
  if (code === "ADT" || code === "ADULT") return "Adult";
  if (code === "CHD" || code === "CNN" || code === "CHILD") return "Child";
  if (code === "INF" || code === "INFANT") return "Infant";
  return String(value || "Passenger");
};

const getAmenityIcon = (category = "", text = "") => {
  const normalized = `${String(category)} ${String(text)}`.toLowerCase();
  if (normalized.includes("wifi")) return <WifiRounded sx={{ fontSize: "14px" }} />;
  if (normalized.includes("meal") || normalized.includes("food") || normalized.includes("beverage")) {
    return <RestaurantRounded sx={{ fontSize: "14px" }} />;
  }
  if (normalized.includes("power") || normalized.includes("usb")) {
    return <PowerRounded sx={{ fontSize: "14px" }} />;
  }
  if (normalized.includes("entertainment") || normalized.includes("video") || normalized.includes("tv")) {
    return <LiveTvRounded sx={{ fontSize: "14px" }} />;
  }
  if (normalized.includes("seat") || normalized.includes("layout")) {
    return <AirlineSeatReclineNormalRounded sx={{ fontSize: "14px" }} />;
  }
  if (normalized.includes("bag") || normalized.includes("luggage")) {
    return <LuggageRounded sx={{ fontSize: "14px" }} />;
  }
  return <InfoOutlined sx={{ fontSize: "14px" }} />;
};

const extractSegmentAmenities = (segment) => {
  const collected = [];
  const amenities = getArrayByKeys(segment, ["Amenities", "amenities"]);
  amenities.forEach((item) => {
    if (!item) return;
    collected.push({
      category: toText(getValueByKeys(item, ["category", "Category"])) || "General",
      text:
        toText(getValueByKeys(item, ["text", "Text", "headline", "Headline"])) ||
        toText(item),
    });
  });

  const universal = getArrayByKeys(segment, [
    "universalProductAttributes",
    "UniversalProductAttributes",
  ]);
  universal.forEach((item) => {
    const headline = toText(getValueByKeys(item, ["headline", "Headline"]));
    const description = toText(
      getValueByKeys(item, ["description", "Description"])
    );
    if (headline) collected.push({ category: "Attribute", text: headline });
    if (description) collected.push({ category: "Attribute", text: description });
  });

  return Array.from(
    new Set(
      collected
        .filter((item) => item.text)
        .map((item) =>
          JSON.stringify({
            category: item.category,
            text: item.text.replace(/\s+/g, " ").trim(),
          })
        )
    )
  ).map((item) => JSON.parse(item));
};

const extractLegAmenities = (segments = []) => {
  const list = [];
  segments.forEach((segment) => {
    extractSegmentAmenities(segment).forEach((item) => list.push(item));
  });
  return Array.from(
    new Set(
      list.map((item) =>
        JSON.stringify({
          category: item.category,
          text: String(item.text || "").replace(/\s+/g, " ").trim(),
        })
      )
    )
  ).map((item) => JSON.parse(item));
};

const normalizeBrandFeatures = (leg) => {
  const features = getValueByKeys(leg, ["BrandFeatures", "brandFeatures"]) || {};
  const brandName =
    toText(getValueByKeys(leg, ["BrandName", "brandName"])) ||
    toText(getValueByKeys(features, ["name", "Name"])) ||
    "Standard brand";
  const brandCode = toText(getValueByKeys(features, ["code", "Code"]));
  const tier = toText(getValueByKeys(features, ["tier", "Tier"]));

  const primary = getArrayByKeys(features, ["BrandAttribute", "brandAttribute"]);
  const additional = getArrayByKeys(features, [
    "AdditionalBrandAttribute",
    "additionalBrandAttribute",
  ]);

  const attributes = [...primary, ...additional]
    .map((item) => ({
      name:
        toText(
          getValueByKeys(item, [
            "classification",
            "Classification",
            "name",
            "Name",
            "groupCode",
            "GroupCode",
            "subCode",
            "SubCode",
          ])
        ) || "Brand Attribute",
      inclusion:
        toText(getValueByKeys(item, ["inclusion", "Inclusion"])) || "Info",
      code: [toText(item?.groupCode || item?.GroupCode), toText(item?.subCode || item?.SubCode)]
        .filter(Boolean)
        .join("-"),
    }))
    .filter((item) => item.name);

  return { brandName, brandCode, tier, attributes };
};

const normalizeBagEntries = (bagSource) => {
  const entries = [];
  const buildText = (item) => {
    const text = toText(getValueByKeys(item, ["text", "Text", "allowance", "Allowance"]));
    if (text) return text;
    const quantity = toText(getValueByKeys(item, ["quantity", "Quantity"]));
    const weight = toText(getValueByKeys(item, ["weight", "Weight"]));
    const unit = toText(getValueByKeys(item, ["unit", "Unit"]));
    return [quantity, weight || unit].filter(Boolean).join(" ").trim();
  };

  if (Array.isArray(bagSource)) {
    bagSource.forEach((item) => {
      if (!item) return;
      entries.push({
        type: toText(getValueByKeys(item, ["type", "Type"])).toLowerCase(),
        value: buildText(item) || toText(item),
      });
    });
    return entries.filter((item) => item.value);
  }

  if (bagSource && typeof bagSource === "object") {
    const allowanceList = getArrayByKeys(bagSource, ["allowance", "Allowance"]);
    if (allowanceList.length > 0) {
      allowanceList.forEach((item) => {
        entries.push({
          type: toText(getValueByKeys(item, ["type", "Type"])).toLowerCase(),
          value: buildText(item),
        });
      });
      return entries.filter((item) => item.value);
    }

    const value = buildText(bagSource);
    if (value) {
      return [{ type: "", value }];
    }
  }

  return [];
};

const extractBaggageRows = (data) => {
  const breakdown = getArrayByKeys(data, ["PriceBreakDown", "priceBreakDown"]);
  if (!breakdown.length) return [];

  return breakdown.map((item, index) => {
    const paxType = normalizePaxType(
      getValueByKeys(item, ["PaxType", "paxType"]) || `PAX ${index + 1}`
    );
    const paxCount = Number(getValueByKeys(item, ["PaxCount", "paxCount"]) || 1);
    const bagSource = getValueByKeys(item, ["Bag", "bag", "Bags", "bags"]) || [];
    const entries = normalizeBagEntries(bagSource);

    const checked =
      entries.find((entry) => /check|checked/i.test(entry.type))?.value ||
      entries[0]?.value ||
      "As per fare policy";
    const cabin =
      entries.find((entry) => /cabin|carry|hand/i.test(entry.type))?.value ||
      "As per airline policy";

    return { paxType, paxCount, checked, cabin };
  });
};

const inclusionChipSx = (inclusion) => {
  const normalized = String(inclusion || "").toLowerCase().replace(/\s+/g, "");
  if (normalized === "included") {
    return {
      background: "#E9F9EF",
      color: "#16673A",
    };
  }
  if (normalized === "chargeable") {
    return {
      background: "#FFF4E8",
      color: "#A8540C",
    };
  }
  if (normalized === "notoffered") {
    return {
      background: "#F1F3F6",
      color: "#5F6C7A",
    };
  }
  return {
    background: "#EEF4FB",
    color: "#2B4F73",
  };
};

const sectionCardSx = {
  border: "1px solid #DFE7EF",
  borderRadius: "14px",
  background: "#FFFFFF",
  p: { xs: "12px", md: "14px" },
};

const FlightDetails = ({ data }) => {
  const allLegsInfo = useMemo(() => {
    const list =
      getValueByKeys(data, ["AllLegsInfo", "allLegsInfo"]) ||
      getValueByKeys(data, ["legs", "Legs"]) ||
      [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const baggageRows = useMemo(() => extractBaggageRows(data), [data]);
  const [value, setValue] = useState("0");

  useEffect(() => {
    const legIndex = Number(value);
    if (allLegsInfo.length === 0) {
      setValue("0");
      return;
    }
    if (!Number.isFinite(legIndex) || legIndex >= allLegsInfo.length) {
      setValue("0");
    }
  }, [allLegsInfo.length, value]);

  const handleChange = (_, newValue) => {
    setValue(newValue);
  };

  if (allLegsInfo.length === 0) {
    return (
      <Box
        sx={{
          border: "1px solid #DFE7EF",
          borderRadius: "12px",
          background: "#F9FBFF",
          p: "16px",
        }}
      >
        <Typography
          sx={{
            fontSize: "13px",
            color: "#5A6B7D",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Flight details are not available for this itinerary.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <TabContext value={value}>
        {allLegsInfo.length > 1 && (
          <Box
            sx={{
              mb: "12px",
              border: "1px solid #DFE7EF",
              borderRadius: "12px",
              background: "#FFFFFF",
              p: "6px",
            }}
          >
            <TabList
              onChange={handleChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: "unset",
                "& .MuiTabs-indicator": {
                  display: "none",
                },
                "& .MuiTab-root": {
                  minHeight: "34px",
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: { xs: "11px", md: "12px" },
                  fontWeight: 600,
                  color: "#4B5A69",
                  px: "12px",
                },
                "& .MuiTab-root.Mui-selected": {
                  background: "var(--primary-button)",
                  color: "#FFFFFF",
                },
              }}
            >
              {allLegsInfo.map((leg, legIndex) => {
                const dep = getValueByKeys(leg, [
                  "DepFrom",
                  "departureFrom",
                  "depFrom",
                ]);
                const arr = getValueByKeys(leg, [
                  "ArrTo",
                  "arrivalTo",
                  "arrTo",
                ]);
                return (
                  <Tab
                    key={`${dep || "DEP"}-${arr || "ARR"}-${legIndex}`}
                    value={String(legIndex)}
                    label={`${dep || "DEP"} - ${arr || "ARR"}`}
                  />
                );
              })}
            </TabList>
          </Box>
        )}

        {allLegsInfo.map((leg, legIndex) => {
          const segments =
            getValueByKeys(leg, ["Segments", "segments", "Segment"]) || [];
          const segmentList = Array.isArray(segments) ? segments : [];
          const dep = getValueByKeys(leg, ["DepFrom", "departureFrom", "depFrom"]);
          const arr = getValueByKeys(leg, ["ArrTo", "arrivalTo", "arrTo"]);
          const totalDuration = formatDuration(
            getValueByKeys(leg, ["TotalDuration", "totalDuration"])
          );
          const brandDetails = normalizeBrandFeatures(leg);
          const legAmenities = extractLegAmenities(segmentList);

          return (
            <TabPanel
              key={`leg-panel-${legIndex}`}
              value={String(legIndex)}
              sx={{ p: 0 }}
            >
              <Box
                sx={{
                  borderRadius: "14px",
                  border: "1px solid #D9E4EE",
                  background:
                    "linear-gradient(180deg, rgba(22,85,147,0.06) 0%, rgba(255,255,255,1) 100%)",
                  p: { xs: "12px", md: "14px" },
                  mb: "12px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "13px", md: "16px" },
                    fontWeight: 700,
                    color: "var(--meta-black)",
                    lineHeight: 1.2,
                  }}
                >
                  {dep || "DEP"} to {arr || "ARR"}
                </Typography>
                <Typography
                  sx={{
                    mt: "4px",
                    fontSize: { xs: "11px", md: "12px" },
                    color: "#5A6B7D",
                    fontWeight: 500,
                  }}
                >
                  {getStopText(segmentList.length)} • Total duration {totalDuration}
                </Typography>
              </Box>

              {segmentList.map((segment, segmentIndex) => {
                const marketingCarrier = getValueByKeys(segment, [
                  "MarketingCarrier",
                  "marketingCarrier",
                ]);
                const marketingCarrierName = getValueByKeys(segment, [
                  "MarketingCarrierName",
                  "marketingCarrierName",
                ]);
                const marketingFlightNumber = getValueByKeys(segment, [
                  "MarketingFlightNumber",
                  "marketingFlightNumber",
                ]);
                const operatingCarrier = getValueByKeys(segment, [
                  "OperatingCarrier",
                  "operatingCarrier",
                  "operatedBy",
                ]);
                const depTime = getValueByKeys(segment, ["DepTime", "depTime"]);
                const arrTime = getValueByKeys(segment, ["ArrTime", "arrTime"]);
                const depFrom = getValueByKeys(segment, ["DepFrom", "depFrom"]);
                const arrTo = getValueByKeys(segment, ["ArrTo", "arrTo"]);
                const depAirport = getValueByKeys(segment, [
                  "DepAirPort",
                  "depAirport",
                ]);
                const arrAirport = getValueByKeys(segment, [
                  "ArrAirPort",
                  "arrAirport",
                ]);
                const depLocation = getValueByKeys(segment, [
                  "DepLocation",
                  "depLocation",
                ]);
                const arrLocation = getValueByKeys(segment, [
                  "ArrLocation",
                  "arrLocation",
                ]);
                const aircraft = getValueByKeys(segment, [
                  "AirCraft",
                  "aircraftTypeName",
                  "aircraft",
                ]);
                const gateOut = getValueByKeys(segment, [
                  "DepartureGate",
                  "departureGate",
                ]);
                const gateIn = getValueByKeys(segment, [
                  "ArrivalGate",
                  "arrivalGate",
                ]);
                const segmentDuration = formatDuration(
                  getValueByKeys(segment, ["Duration", "duration"])
                );
                const stopCount = Number(
                  getValueByKeys(segment, ["StopCount", "stopCount"]) || 0
                );
                const segmentCode = getValueByKeys(segment, [
                  "SegmentCode",
                  "segmentCode",
                ]);
                const cabinClass = getCabinClass(
                  getValueByKeys(segmentCode, ["cabinCode", "CabinCode"])
                );
                const bookingCode = getValueByKeys(segmentCode, [
                  "bookingCode",
                  "BookingCode",
                ]);
                const logoCarrier = operatingCarrier || marketingCarrier || "N/A";
                const resolvedAirlineName = resolveAirlineName(
                  marketingCarrier || operatingCarrier,
                  marketingCarrierName
                );
                const depAirportInfo = resolveAirportInfo(
                  depFrom || depAirport,
                  depAirport || depLocation,
                  depLocation
                );
                const arrAirportInfo = resolveAirportInfo(
                  arrTo || arrAirport,
                  arrAirport || arrLocation,
                  arrLocation
                );
                const segmentAmenities = extractSegmentAmenities(segment);

                return (
                  <Box key={`segment-${legIndex}-${segmentIndex}`}>
                    <Box sx={{ ...sectionCardSx, mb: "10px" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: { xs: "flex-start", md: "center" },
                          justifyContent: "space-between",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Box
                            component="img"
                            src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${logoCarrier}.png`}
                            alt={resolvedAirlineName || "Airline"}
                            sx={{
                              width: "40px",
                              height: "40px",
                              objectFit: "contain",
                              borderRadius: "8px",
                              border: "1px solid #E3ECF5",
                              background: "#FFFFFF",
                              p: "2px",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <Box>
                            <Typography
                              sx={{
                                fontSize: { xs: "12px", md: "14px" },
                                color: "var(--meta-black)",
                                fontWeight: 700,
                                lineHeight: 1.2,
                              }}
                            >
                              {resolvedAirlineName}
                            </Typography>
                            <Typography
                              sx={{
                                mt: "2px",
                                fontSize: { xs: "11px", md: "12px" },
                                color: "#5A6B7D",
                                fontWeight: 500,
                              }}
                            >
                              {(marketingCarrier || "") +
                                " " +
                                (marketingFlightNumber || "")}
                              {operatingCarrier
                                ? ` • Operated by ${operatingCarrier}`
                                : ""}
                            </Typography>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <Chip
                            size="small"
                            label={cabinClass}
                            sx={{
                              background: "#EEF4FB",
                              color: "#13406B",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          />
                          {bookingCode && (
                            <Chip
                              size="small"
                              label={`RBD ${bookingCode}`}
                              sx={{
                                background: "#F4F7FB",
                                color: "#4B5A69",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            />
                          )}
                          {aircraft && (
                            <Chip
                              size="small"
                              label={`Aircraft ${aircraft}`}
                              sx={{
                                background: "#F4F7FB",
                                color: "#4B5A69",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          mt: "12px",
                          display: "grid",
                          gap: { xs: "14px", md: "10px" },
                          gridTemplateColumns: { xs: "1fr", md: "1fr 0.9fr 1fr" },
                          alignItems: "center",
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <FlightTakeoffRounded sx={{ fontSize: "16px" }} />
                            Departure
                          </Typography>
                          <Typography
                            sx={{
                              mt: "4px",
                              fontSize: { xs: "18px", md: "22px" },
                              fontWeight: 700,
                              color: "var(--depature-color)",
                              lineHeight: 1.1,
                            }}
                          >
                            {depFrom || "---"}{" "}
                            <Box component="span" sx={{ color: "var(--primary-button)" }}>
                              {formatTime(depTime)}
                            </Box>
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 500,
                            }}
                          >
                            {depAirportInfo.name || "Departure airport"}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "10px", md: "11px" },
                              color: "#7A8DA3",
                              fontWeight: 500,
                            }}
                          >
                            {depAirportInfo.address || depLocation || ""}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 500,
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <CalendarTodayRounded sx={{ fontSize: "13px" }} />
                            {formatDate(depTime)}
                          </Typography>
                          {gateOut && (
                            <Typography
                              sx={{
                                mt: "2px",
                                fontSize: "11px",
                                color: "#5A6B7D",
                                fontWeight: 500,
                              }}
                            >
                              Departure gate: {gateOut}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ textAlign: "center" }}>
                          <Typography
                            sx={{
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <AccessTimeRounded sx={{ fontSize: "15px" }} />
                            {segmentDuration}
                          </Typography>

                          <Box
                            sx={{
                              mt: "8px",
                              mb: "6px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Box
                              sx={{
                                flex: 1,
                                height: "2px",
                                borderRadius: "999px",
                                background: "#C6D9EB",
                              }}
                            />
                            <Box
                              sx={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "999px",
                                display: "grid",
                                placeItems: "center",
                                background: "#EAF3FC",
                                border: "1px solid #C9DEEF",
                                color: "var(--primary-button)",
                              }}
                            >
                              <AirplanemodeActiveRounded sx={{ fontSize: "16px" }} />
                            </Box>
                            <Box
                              sx={{
                                flex: 1,
                                height: "2px",
                                borderRadius: "999px",
                                background: "#C6D9EB",
                              }}
                            />
                          </Box>

                          <Typography
                            sx={{
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#4B5A69",
                              fontWeight: 600,
                            }}
                          >
                            {stopCount > 0
                              ? `${stopCount} stop${stopCount > 1 ? "s" : ""}`
                              : "Non-stop"}
                          </Typography>
                        </Box>

                        <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                          <Typography
                            sx={{
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <FlightLandRounded sx={{ fontSize: "16px" }} />
                            Arrival
                          </Typography>
                          <Typography
                            sx={{
                              mt: "4px",
                              fontSize: { xs: "18px", md: "22px" },
                              fontWeight: 700,
                              color: "var(--depature-color)",
                              lineHeight: 1.1,
                            }}
                          >
                            <Box component="span" sx={{ color: "var(--primary-button)" }}>
                              {formatTime(arrTime)}
                            </Box>{" "}
                            {arrTo || "---"}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 500,
                            }}
                          >
                            {arrAirportInfo.name || "Arrival airport"}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "10px", md: "11px" },
                              color: "#7A8DA3",
                              fontWeight: 500,
                            }}
                          >
                            {arrAirportInfo.address || arrLocation || ""}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#5A6B7D",
                              fontWeight: 500,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <CalendarTodayRounded sx={{ fontSize: "13px" }} />
                            {formatDate(arrTime)}
                          </Typography>
                          {gateIn && (
                            <Typography
                              sx={{
                                mt: "2px",
                                fontSize: "11px",
                                color: "#5A6B7D",
                                fontWeight: 500,
                              }}
                            >
                              Arrival gate: {gateIn}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {segmentAmenities.length > 0 && (
                        <Box sx={{ mt: "12px" }}>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              color: "#54697E",
                              fontWeight: 700,
                              mb: "6px",
                            }}
                          >
                            Segment Amenities
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {segmentAmenities.map((item, amenityIndex) => (
                              <Chip
                                key={`${item.category}-${item.text}-${amenityIndex}`}
                                icon={getAmenityIcon(item.category, item.text)}
                                label={item.text}
                                size="small"
                                sx={{
                                  background: "#F2F7FC",
                                  color: "#254A70",
                                  "& .MuiChip-icon": {
                                    color: "#2A5D8F",
                                  },
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {segmentIndex < segmentList.length - 1 && (
                      <Box
                        sx={{
                          border: "1px dashed #BED5E9",
                          borderRadius: "12px",
                          background: "#F4FAFF",
                          p: { xs: "10px 12px", md: "10px 14px" },
                          mb: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "11px", md: "12px" },
                            color: "#13406B",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <ConnectingAirportsRounded sx={{ fontSize: "16px" }} />
                          Connection at {arrAirportInfo.name || arrTo || "transit airport"}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: "11px", md: "12px" },
                            color: "#4B5A69",
                            fontWeight: 600,
                          }}
                        >
                          Layover{" "}
                          {calculateTransitTime(
                            getValueByKeys(segment, ["ArrTime", "arrTime"]),
                            getValueByKeys(segmentList[segmentIndex + 1], [
                              "DepTime",
                              "depTime",
                            ])
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}

              {segmentList.length === 0 && (
                <Box sx={sectionCardSx}>
                  <Typography
                    sx={{
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#5A6B7D",
                      fontWeight: 500,
                    }}
                  >
                    Segment data is not available for this leg.
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  mt: "10px",
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                  gap: "10px",
                }}
              >
                <Box sx={sectionCardSx}>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#193A5A",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      mb: "8px",
                    }}
                  >
                    <StarRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
                    Brand Attributes
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#2B3D52",
                      fontWeight: 700,
                    }}
                  >
                    {brandDetails.brandName}
                  </Typography>
                  {(brandDetails.brandCode || brandDetails.tier) && (
                    <Typography
                      sx={{
                        mt: "2px",
                        fontSize: "11px",
                        color: "#617488",
                        fontWeight: 600,
                      }}
                    >
                      {[brandDetails.brandCode, brandDetails.tier && `Tier ${brandDetails.tier}`]
                        .filter(Boolean)
                        .join(" • ")}
                    </Typography>
                  )}

                  {brandDetails.attributes.length > 0 ? (
                    <Box sx={{ mt: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {brandDetails.attributes.map((attribute, idx) => (
                        <Box
                          key={`${attribute.name}-${idx}`}
                          sx={{
                            border: "1px solid #E3EBF3",
                            borderRadius: "9px",
                            p: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            flexWrap: "wrap",
                            background: "#FBFDFF",
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "11px",
                                color: "#2B3D52",
                                fontWeight: 700,
                              }}
                            >
                              {attribute.name}
                            </Typography>
                            {attribute.code && (
                              <Typography
                                sx={{
                                  fontSize: "10px",
                                  color: "#6F8195",
                                  fontWeight: 600,
                                  mt: "1px",
                                }}
                              >
                                {attribute.code}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            size="small"
                            label={attribute.inclusion}
                            sx={{
                              ...inclusionChipSx(attribute.inclusion),
                              fontWeight: 700,
                              fontSize: "11px",
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography sx={{ mt: "8px", fontSize: "11px", color: "#6A7E94" }}>
                      Brand attributes are not provided for this itinerary.
                    </Typography>
                  )}
                </Box>

                <Box sx={sectionCardSx}>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#193A5A",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      mb: "8px",
                    }}
                  >
                    <LuggageRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
                    Baggage
                  </Typography>
                  {baggageRows.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {baggageRows.map((row, rowIndex) => (
                        <Box
                          key={`${row.paxType}-${rowIndex}`}
                          sx={{
                            border: "1px solid #E3EBF3",
                            borderRadius: "9px",
                            p: "8px",
                            background: "#FBFDFF",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "11px",
                              color: "#2B3D52",
                              fontWeight: 700,
                              mb: "5px",
                            }}
                          >
                            {row.paxType} x{row.paxCount}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <Typography sx={{ fontSize: "11px", color: "#5B6F84", fontWeight: 600 }}>
                              Checked
                            </Typography>
                            <Typography sx={{ fontSize: "11px", color: "#2B3D52", fontWeight: 700 }}>
                              {row.checked}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "8px",
                              mt: "2px",
                            }}
                          >
                            <Typography sx={{ fontSize: "11px", color: "#5B6F84", fontWeight: 600 }}>
                              Cabin
                            </Typography>
                            <Typography sx={{ fontSize: "11px", color: "#2B3D52", fontWeight: 700 }}>
                              {row.cabin}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: "11px", color: "#6A7E94" }}>
                      Baggage information is not available for this fare.
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ ...sectionCardSx, mt: "10px" }}>
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: "#193A5A",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    mb: "8px",
                  }}
                >
                  <VerifiedRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
                  All Amenities
                </Typography>

                {legAmenities.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {legAmenities.map((item, idx) => (
                      <Chip
                        key={`${item.category}-${item.text}-${idx}`}
                        icon={getAmenityIcon(item.category, item.text)}
                        label={item.text}
                        size="small"
                        sx={{
                          background: "#EFF5FC",
                          color: "#1F4468",
                          "& .MuiChip-icon": {
                            color: "#2A5D8F",
                          },
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: "11px", color: "#6A7E94" }}>
                    Amenities were not returned by the supplier for this leg.
                  </Typography>
                )}
              </Box>
            </TabPanel>
          );
        })}
      </TabContext>
    </Box>
  );
};

export default FlightDetails;
