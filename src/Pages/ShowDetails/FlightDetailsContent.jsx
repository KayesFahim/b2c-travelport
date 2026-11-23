import {
  AccessTimeRounded,
  AirlineSeatReclineNormalRounded,
  AirplanemodeActiveRounded,
  CalendarTodayRounded,
  ConnectingAirportsRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  FlightLandRounded,
  FlightTakeoffRounded,
  InfoOutlined,
  LiveTvRounded,
  LuggageRounded,
  PowerRounded,
  RestaurantRounded,
  StarRounded,
  VerifiedRounded,
  WarningAmberRounded,
  WifiRounded,
} from "@mui/icons-material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Chip, IconButton, Tab, Tooltip, Typography } from "@mui/material";
import moment from "moment";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import {
  calculateTransitTime,
  convertMinutesToHoursAndMinutes,
} from "../common/funcation";
import { extractUnifiedPenaltyRows } from "../../utils/flightPolicyUtils";
import { resolveAirlineName, resolveAirportInfo } from "../../utils/travelLookup";

const FLIGHT_DETAILS_FONT_FAMILY = '"Manrope", sans-serif';
const SHOW_BRAND_ATTRIBUTES_IN_FLIGHT_INFO = true;

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
  if (!dateTime) return "Not available";
  const parsed = moment.utc(dateTime);
  return parsed.isValid() ? parsed.format("ddd, D MMM YYYY") : "Not available";
};

const formatTime = (dateTime) => {
  if (!dateTime) return "--:--";
  const parsed = moment.utc(dateTime);
  return parsed.isValid() ? parsed.format("HH:mm") : "--:--";
};

const parseDurationToMinutes = (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    return Math.max(0, Number(text));
  }

  const iso = text.toUpperCase().match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?$/);
  if (iso) {
    const days = Number(iso[1] || 0);
    const hours = Number(iso[2] || 0);
    const minutes = Number(iso[3] || 0);
    return days * 24 * 60 + hours * 60 + minutes;
  }

  const hourMatch = text.match(/(\d+)\s*H/i);
  const minuteMatch = text.match(/(\d+)\s*(M|MIN)/i);
  if (hourMatch || minuteMatch) {
    const hours = Number(hourMatch?.[1] || 0);
    const minutes = Number(minuteMatch?.[1] || 0);
    return hours * 60 + minutes;
  }

  return null;
};

const formatDuration = (rawDuration) => {
  if (rawDuration === undefined || rawDuration === null) return "Not available";

  const minutes = parseDurationToMinutes(rawDuration);
  if (minutes !== null) {
    return convertMinutesToHoursAndMinutes(minutes);
  }

  return String(rawDuration).trim() || "Not available";
};

const getMinutesBetweenDateTimes = (depTime, arrTime) => {
  if (!depTime || !arrTime) return null;
  const dep = moment(depTime);
  const arr = moment(arrTime);
  if (!dep.isValid() || !arr.isValid()) return null;
  const minutes = arr.diff(dep, "minutes");
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const resolveSegmentDateTime = (segment, type) => {
  const isDeparture = type === "departure";
  const direct = getValueByKeys(segment, isDeparture ? ["DepTime", "depTime"] : ["ArrTime", "arrTime"]);
  if (direct) return direct;

  const detail = getValueByKeys(
    segment,
    isDeparture ? ["Departure", "departure"] : ["Arrival", "arrival"]
  );
  if (detail && typeof detail === "object") {
    const dateTime = getValueByKeys(detail, ["dateTime", "DateTime"]);
    if (dateTime) return dateTime;
    const date = getValueByKeys(detail, ["date", "Date"]);
    const time = getValueByKeys(detail, ["time", "Time"]);
    if (date && time) return `${date}T${time}`;
    return date || time || null;
  }

  return null;
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

const normalizePaxTypeKey = (value) => {
  const code = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!code) return "";
  if (code.includes("ADT") || code.includes("ADULT")) return "ADT";
  if (code.includes("CHD") || code.includes("CNN") || code.includes("CHILD")) {
    return "CHD";
  }
  if (code.includes("INF") || code.includes("INFANT")) return "INF";
  return code;
};

const BaggagePaxTypeOrder = {
  ADT: 0,
  CHD: 1,
  INF: 2,
};

const sortBaggageRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({ ...row, __index: index }))
    .sort((a, b) => {
      const typeA = normalizePaxTypeKey(a?.paxType);
      const typeB = normalizePaxTypeKey(b?.paxType);
      const orderA = BaggagePaxTypeOrder[typeA] ?? 9;
      const orderB = BaggagePaxTypeOrder[typeB] ?? 9;
      if (orderA !== orderB) return orderA - orderB;
      return a.__index - b.__index;
    })
    .map(({ __index, ...row }) => row);

const getAmenityIcon = (category = "", text = "", iconSize = 14) => {
  const iconSx = { fontSize: `${iconSize}px` };
  const normalized = `${String(category)} ${String(text)}`.toLowerCase();
  if (normalized.includes("wifi")) return <WifiRounded sx={iconSx} />;
  if (normalized.includes("meal") || normalized.includes("food") || normalized.includes("beverage")) {
    return <RestaurantRounded sx={iconSx} />;
  }
  if (normalized.includes("power") || normalized.includes("usb")) {
    return <PowerRounded sx={iconSx} />;
  }
  if (normalized.includes("entertainment") || normalized.includes("video") || normalized.includes("tv")) {
    return <LiveTvRounded sx={iconSx} />;
  }
  if (normalized.includes("seat") || normalized.includes("layout")) {
    return <AirlineSeatReclineNormalRounded sx={iconSx} />;
  }
  if (normalized.includes("bag") || normalized.includes("luggage")) {
    return <LuggageRounded sx={iconSx} />;
  }
  return <InfoOutlined sx={iconSx} />;
};

const extractSegmentAmenities = (segment) => {
  const collected = [];
  const amenityContainer = getValueByKeys(segment, ["Amenities", "amenities"]);
  const containerObj =
    amenityContainer && typeof amenityContainer === "object" ? amenityContainer : null;

  const byCategoryItems = [];
  const byCategory = containerObj
    ? getValueByKeys(containerObj, ["byCategory", "ByCategory"])
    : null;
  if (byCategory && typeof byCategory === "object") {
    Object.values(byCategory).forEach((items) => {
      if (Array.isArray(items)) {
        byCategoryItems.push(...items);
      }
    });
  }

  const amenities = [
    ...getArrayByKeys(segment, ["Amenities", "amenities"]),
    ...(containerObj ? getArrayByKeys(containerObj, ["items", "Items"]) : []),
    ...byCategoryItems,
  ];
  amenities.forEach((item) => {
    if (!item) return;
    collected.push({
      category:
        toText(getValueByKeys(item, ["category", "Category"])) ||
        toText(getValueByKeys(item, ["classification", "Classification"])) ||
        "General",
      text:
        toText(
          getValueByKeys(item, [
            "text",
            "Text",
            "headline",
            "Headline",
            "classification",
            "Classification",
          ])
        ) ||
        toText(item),
    });
  });

  const universal = [
    ...getArrayByKeys(segment, [
      "universalProductAttributes",
      "UniversalProductAttributes",
    ]),
    ...(containerObj
      ? getArrayByKeys(containerObj, [
        "universalProductAttributes",
        "UniversalProductAttributes",
      ])
      : []),
  ];
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

const extractBrandAttributesFromContainer = (container) => {
  if (!container || typeof container !== "object") return [];
  const primary = getArrayByKeys(container, ["BrandAttribute", "brandAttribute"]);
  const additional = getArrayByKeys(container, [
    "AdditionalBrandAttribute",
    "additionalBrandAttribute",
  ]);

  return [...primary, ...additional]
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
};

const dedupeBrandAttributes = (attributes = []) =>
  Array.from(
    new Map(
      (Array.isArray(attributes) ? attributes : []).map((item) => [
        `${toText(item?.name)}-${toText(item?.inclusion)}-${toText(item?.code)}`.toLowerCase(),
        item,
      ])
    ).values()
  );

const normalizeBrandFeatures = (leg, offer) => {
  const legFeatures = getValueByKeys(leg, ["BrandFeatures", "brandFeatures"]) || {};

  const topLevelFeatureCandidates = [
    getValueByKeys(offer, ["BrandFeatures", "brandFeatures"]),
    offer?.selectedBrand?.BrandFeatures,
    offer?.selectedBrand?.brandFeatures,
  ].filter((item) => item && typeof item === "object");

  const rawBrandList = [
    ...getArrayByKeys(offer, ["Brand", "brand"]),
    ...getArrayByKeys(offer?.ReferenceList || {}, ["Brand", "brand"]),
  ].filter((item) => item && typeof item === "object");

  const legBrandName = toText(getValueByKeys(leg, ["BrandName", "brandName"]));
  const legBrandCode =
    toText(getValueByKeys(leg, ["BrandCode", "brandCode"])) ||
    toText(getValueByKeys(legFeatures, ["code", "Code"]));

  const matchedRawBrand =
    rawBrandList.find((brand) => {
      const code = toText(getValueByKeys(brand, ["code", "Code"]));
      const name = toText(getValueByKeys(brand, ["name", "Name"]));
      return (
        (legBrandCode && code && legBrandCode.toLowerCase() === code.toLowerCase()) ||
        (legBrandName && name && legBrandName.toLowerCase() === name.toLowerCase())
      );
    }) || rawBrandList[0] || {};

  const attributes = dedupeBrandAttributes([
    ...extractBrandAttributesFromContainer(legFeatures),
    ...topLevelFeatureCandidates.flatMap((item) => extractBrandAttributesFromContainer(item)),
    ...extractBrandAttributesFromContainer(matchedRawBrand),
  ]);

  const brandName =
    legBrandName ||
    toText(getValueByKeys(legFeatures, ["name", "Name"])) ||
    toText(getValueByKeys(matchedRawBrand, ["name", "Name"])) ||
    "Standard brand";
  const brandCode =
    legBrandCode ||
    toText(getValueByKeys(matchedRawBrand, ["code", "Code"])) ||
    "";
  const tier =
    toText(getValueByKeys(legFeatures, ["tier", "Tier"])) ||
    toText(getValueByKeys(matchedRawBrand, ["tier", "Tier"])) ||
    "";

  const imageUrlCandidates = [
    ...getArrayByKeys(legFeatures, ["ImageURL", "imageURL", "imageUrl"]),
    ...getArrayByKeys(matchedRawBrand, ["ImageURL", "imageURL", "imageUrl"]),
    ...topLevelFeatureCandidates.flatMap((item) =>
      getArrayByKeys(item, ["ImageURL", "imageURL", "imageUrl"])
    ),
  ];
  const imageUrl = toText(imageUrlCandidates.find((u) => toText(u).startsWith("http")));

  return { brandName, brandCode, tier, attributes, imageUrl };
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
      border: "1px solid #C9EAD7",
    };
  }
  if (normalized === "chargeable") {
    return {
      background: "#FFF4E8",
      color: "#A8540C",
      border: "1px solid #F2D7BC",
    };
  }
  if (normalized === "notoffered") {
    return {
      background: "#F1F3F6",
      color: "#5F6C7A",
      border: "1px solid #D7DFE8",
    };
  }
  return {
    background: "#EEF4FB",
    color: "#2B4F73",
    border: "1px solid #D1E0EF",
  };
};

const normalizeInclusionLabel = (value = "") => {
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, "");
  if (normalized === "notoffered") return "Not Offered";
  if (normalized === "chargeable") return "Chargeable";
  if (normalized === "included") return "Included";
  return value || "Info";
};

const getBrandAttributeIcon = (name = "", iconSize = 13) => {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("refund")) {
    return <VerifiedRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("rebooking") || normalized.includes("change")) {
    return <CalendarTodayRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("upgrade")) {
    return <AirplanemodeActiveRounded sx={{ fontSize: iconSize }} />;
  }
  if (
    normalized.includes("priority check") ||
    normalized.includes("priority board") ||
    normalized.includes("priority security") ||
    normalized.includes("priority bag")
  ) {
    return <AccessTimeRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("lounge")) {
    return <VerifiedRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("wifi") || normalized.includes("internet")) {
    return <WifiRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("meal") || normalized.includes("food") || normalized.includes("beverage")) {
    return <RestaurantRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("bag") || normalized.includes("carry")) {
    return <LuggageRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("seat") || normalized.includes("layout")) {
    return <AirlineSeatReclineNormalRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("power") || normalized.includes("usb")) {
    return <PowerRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("entertainment") || normalized.includes("video") || normalized.includes("tv")) {
    return <LiveTvRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("mileage") || normalized.includes("accrual")) {
    return <StarRounded sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("not offered")) {
    return <WarningAmberRounded sx={{ fontSize: iconSize }} />;
  }
  return <InfoOutlined sx={{ fontSize: iconSize }} />;
};

const sectionCardSx = {
  fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
  border: "1px solid #DFE7EF",
  borderRadius: "14px",
  background: "#FFFFFF",
  p: { xs: "12px", md: "14px" },
};

const BRAND_ATTRIBUTE_VISIBLE_ITEMS = 8;

const getBrandAttributeSlidesToShow = (itemCount, viewportWidth) => {
  const total = Math.max(Number(itemCount || 0), 1);
  const width = Number(viewportWidth || 0);

  if (width <= 520) return 1;
  if (width <= 768) return Math.min(2, total);
  return Math.min(BRAND_ATTRIBUTE_VISIBLE_ITEMS, total);
};

const BrandAttributeSlider = ({ attributes = [] }) => {
  const trackRef = useRef(null);
  const items = useMemo(
    () => (Array.isArray(attributes) ? attributes.filter(Boolean) : []),
    [attributes]
  );

  if (items.length === 0) return null;

  const canScroll = items.length > 3;

  const scrollTrack = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(220, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const renderAttributeCard = (attribute, idx) => {
    const inclusionLabel = normalizeInclusionLabel(attribute.inclusion);
    return (
      <Box key={`${attribute.name}-${idx}`} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            border: "1px solid #D8E5F1",
            borderRadius: "8px",
            p: "10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "9px",
            background: "#F9FCFF",
            minHeight: "82px",
            height: "100%",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: "6px", minWidth: 0 }}>
            <Box
              sx={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                border: "1px solid #CCDBEA",
                background: "#FFFFFF",
                color: "#245A8D",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                mt: "1px",
              }}
            >
              {getBrandAttributeIcon(attribute.name)}
            </Box>
            <Typography
              sx={{
                fontSize: "12px",
                color: "#1F344A",
                fontWeight: 700,
                lineHeight: 1.35,
                wordBreak: "break-word",
                textTransform: "capitalize",
                minWidth: 0,
              }}
              title={attribute.name}
            >
              {attribute.name || "Brand Attribute"}
            </Typography>
          </Box>
          <Typography
            sx={{
              ...inclusionChipSx(inclusionLabel),
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "fit-content",
              maxWidth: "100%",
              px: "8px",
              py: "4px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: 1.2,
              textTransform: "capitalize",
            }}
          >
            {inclusionLabel}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (!canScroll) {
    return (
      <Box sx={{ mt: "12px" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: `repeat(${Math.min(3, items.length)}, minmax(0, 1fr))`,
            },
            gap: "10px",
          }}
        >
          {items.map((attribute, idx) => renderAttributeCard(attribute, idx))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: "12px",
        position: "relative",
        minWidth: 0,
      }}
    >
      <Box ref={trackRef} className="flyjatt-brand-attr-track">
        {items.map((attribute, idx) => renderAttributeCard(attribute, idx))}
      </Box>

      <IconButton
        type="button"
        aria-label="Scroll brand attributes left"
        size="small"
        onClick={() => scrollTrack(-1)}
        sx={{
          position: "absolute",
          left: 4,
          top: "50%",
          transform: "translateY(-50%)",
          width: 28,
          height: 28,
          bgcolor: "#FFFFFF",
          border: "1px solid #D0E0F1",
          boxShadow: "0 8px 18px rgba(15,39,69,0.16)",
          "&:hover": { bgcolor: "#F0F8FF" },
        }}
      >
        <ChevronLeftRounded sx={{ fontSize: 16 }} />
      </IconButton>

      <IconButton
        type="button"
        aria-label="Scroll brand attributes right"
        size="small"
        onClick={() => scrollTrack(1)}
        sx={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          width: 28,
          height: 28,
          bgcolor: "#FFFFFF",
          border: "1px solid #D0E0F1",
          boxShadow: "0 8px 18px rgba(15,39,69,0.16)",
          "&:hover": { bgcolor: "#F0F8FF" },
        }}
      >
        <ChevronRightRounded sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
};

const PenaltyInfoCard = ({ title, rows = [], emptyText }) => (
  <Box
    sx={{
      border: "1px solid #E3EBF3",
      borderRadius: "10px",
      p: "10px",
      background: "#FBFDFF",
      minWidth: 0,
    }}
  >
    <Typography
      sx={{
        fontSize: "11px",
        color: "#2A4360",
        fontWeight: 700,
        mb: rows.length > 0 ? "7px" : 0,
      }}
    >
      {title}
    </Typography>

    {rows.length > 0 ? (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {rows.slice(0, 3).map((rule) => (
          <Box key={rule.id} sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "11px",
                color: "#1E3550",
                fontWeight: 700,
                overflowWrap: "anywhere",
              }}
            >
              {rule.timeFrame}
            </Typography>
            {Array.isArray(rule.details) &&
              rule.details.slice(0, 2).map((detail, detailIndex) => (
                <Typography
                  key={`${rule.id}-${detailIndex}`}
                  sx={{
                    mt: "2px",
                    fontSize: "10.5px",
                    color: "#5B6F84",
                    fontWeight: 500,
                    lineHeight: 1.45,
                    overflowWrap: "anywhere",
                  }}
                >
                  {detail}
                </Typography>
              ))}
          </Box>
        ))}
      </Box>
    ) : (
      <Typography
        sx={{
          fontSize: "11px",
          color: "#6A7E94",
          overflowWrap: "anywhere",
        }}
      >
        {emptyText}
      </Typography>
    )}
  </Box>
);

const FlightDetails = ({ data, compactLayout = false, amenityIconsOnly = false }) => {
  const allLegsInfo = useMemo(() => {
    const list =
      getValueByKeys(data, ["AllLegsInfo", "allLegsInfo"]) ||
      getValueByKeys(data, ["legs", "Legs"]) ||
      [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const baggageRows = useMemo(
    () => sortBaggageRows(extractBaggageRows(data)),
    [data]
  );
  const baggageColumnCount = useMemo(() => {
    const paxTypeCount = new Set(
      baggageRows
        .map((row) => normalizePaxTypeKey(row?.paxType))
        .filter((item) => item === "ADT" || item === "CHD" || item === "INF")
    ).size;
    if (paxTypeCount >= 3) return 3;
    if (paxTypeCount === 2) return 2;
    return 1;
  }, [baggageRows]);
  const cancellationPenaltyRows = useMemo(
    () => extractUnifiedPenaltyRows(data, "cancellation"),
    [data]
  );
  const dateChangePenaltyRows = useMemo(
    () => extractUnifiedPenaltyRows(data, "dateChange"),
    [data]
  );
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
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        overflowX: "hidden",
        fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
        "& .MuiTypography-root": {
          fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
        },
        "& .MuiChip-label": {
          fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
        },
      }}
    >
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
          const legDurationRaw = getValueByKeys(leg, [
            "TotalDuration",
            "totalDuration",
            "TotalDurationISO",
            "totalDurationISO",
            "TotalDurationIso",
            "totalDurationIso",
            "Duration",
            "duration",
          ]);
          const summedSegmentDuration = segmentList.reduce((sum, segment) => {
            const raw = getValueByKeys(segment, [
              "Duration",
              "duration",
              "DurationIso",
              "durationIso",
              "DurationISO",
              "durationISO",
            ]);
            const depTime = resolveSegmentDateTime(segment, "departure");
            const arrTime = resolveSegmentDateTime(segment, "arrival");

            const fromRaw = parseDurationToMinutes(raw);
            if (fromRaw !== null && fromRaw > 0) return sum + fromRaw;

            const byClock = getMinutesBetweenDateTimes(depTime, arrTime);
            return sum + (byClock || 0);
          }, 0);
          const totalDuration = formatDuration(
            legDurationRaw !== undefined && legDurationRaw !== null && String(legDurationRaw).trim()
              ? legDurationRaw
              : summedSegmentDuration > 0
                ? summedSegmentDuration
                : null
          );
          const totalLegJourneyDurationLabel = `Total Leg Journey Duration: ${totalDuration}`;
          const legSummary = `Leg ${legIndex + 1} • ${dep || "DEP"} \u2192 ${arr || "ARR"
            } • ${getStopText(segmentList.length)} • ${totalDuration}`;
          const brandDetails = normalizeBrandFeatures(leg, data);
          const legAmenities = extractLegAmenities(segmentList);

          return (
            <TabPanel
              key={`leg-panel-${legIndex}`}
              value={String(legIndex)}
              sx={{ p: 0, overflowX: "hidden", minWidth: 0 }}
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
                    fontSize: { xs: "13px", md: "15px" },
                    fontWeight: 700,
                    color: "var(--meta-black)",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={legSummary}
                >
                  {legSummary}
                </Typography>
                <Typography
                  sx={{
                    mt: "6px",
                    fontSize: { xs: "11px", md: "12px" },
                    fontWeight: 600,
                    color: "#3E5E82",
                    lineHeight: 1.35,
                  }}
                  title={totalLegJourneyDurationLabel}
                >
                  {totalLegJourneyDurationLabel}
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
                const depTime = resolveSegmentDateTime(segment, "departure");
                const arrTime = resolveSegmentDateTime(segment, "arrival");
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
                const segmentDurationRaw = getValueByKeys(segment, [
                  "Duration",
                  "duration",
                  "DurationIso",
                  "durationIso",
                  "DurationISO",
                  "durationISO",
                ]);
                const segmentDurationByClock = getMinutesBetweenDateTimes(depTime, arrTime);
                const segmentDuration = formatDuration(
                  segmentDurationRaw !== undefined &&
                    segmentDurationRaw !== null &&
                    String(segmentDurationRaw).trim()
                    ? segmentDurationRaw
                    : segmentDurationByClock
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
                const logoCarrier = operatingCarrier || marketingCarrier || "";
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
                const topAmenities = Array.from(
                  new Map(
                    segmentAmenities.map((item) => [
                      `${String(item.category || "")}-${String(item.text || "")}`,
                      item,
                    ])
                  ).values()
                ).slice(0, 5);
                const flightCodeLabel = [marketingCarrier, marketingFlightNumber]
                  .map((item) => String(item || "").trim())
                  .filter(Boolean)
                  .join(" ");
                const segmentRouteLabel = [
                  depFrom || depAirport || "DEP",
                  arrTo || arrAirport || "ARR",
                ]
                  .map((item) => String(item || "").trim())
                  .filter(Boolean)
                  .join(" → ");
                const segmentAmenityTitle = [
                  `Flight ${segmentIndex + 1} Amenities`,
                  flightCodeLabel,
                  segmentRouteLabel,
                ]
                  .filter(Boolean)
                  .join(" • ");
                const stopSummary =
                  stopCount > 0
                    ? `${stopCount} Stop${stopCount > 1 ? "s" : ""} ${segmentDuration}`
                    : `Non-stop ${segmentDuration}`;

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
                          minWidth: 0,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
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
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: { xs: "13px", md: "15px" },
                                color: "var(--meta-black)",
                                fontWeight: 700,
                                lineHeight: 1.2,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {resolvedAirlineName}
                            </Typography>
                            <Typography
                              sx={{
                                mt: "2px",
                                fontSize: { xs: "12px", md: "13px" },
                                color: "#5A6B7D",
                                fontWeight: 500,
                                overflowWrap: "anywhere",
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
                            label={stopSummary}
                            sx={{
                              background: "#F4F7FB",
                              color: "#4B5A69",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          />
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
                          {!amenityIconsOnly && topAmenities.length > 0 && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              {topAmenities.map((item, amenityIndex) => (
                                <Tooltip
                                  key={`${item.category}-${item.text}-top-${amenityIndex}`}
                                  title={
                                    item?.category
                                      ? `${item.category}: ${item.text}`
                                      : item.text
                                  }
                                  arrow
                                  placement="top"
                                >
                                  <Box
                                    sx={{
                                      width: "18px",
                                      height: "18px",
                                      borderRadius: "999px",
                                      border: "1px solid #D3E3F2",
                                      background: "#F4F9FF",
                                      color: "#2A5D8F",
                                      display: "grid",
                                      placeItems: "center",
                                      flexShrink: 0,
                                      cursor: "help",
                                    }}
                                  >
                                    {getAmenityIcon(item.category, item.text, 10)}
                                  </Box>
                                </Tooltip>
                              ))}
                            </Box>
                          )}
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
                              fontSize: { xs: "12px", md: "13px" },
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
                              fontSize: { xs: "12px", md: "13px" },
                              color: "#5A6B7D",
                              fontWeight: 500,
                            }}
                          >
                            {depAirportInfo.name || "Departure airport"}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#7A8DA3",
                              fontWeight: 500,
                            }}
                          >
                            {depAirportInfo.address || depLocation || ""}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "12px", md: "13px" },
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
                              fontSize: { xs: "12px", md: "13px" },
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
                              fontSize: { xs: "12px", md: "13px" },
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
                              fontSize: { xs: "12px", md: "13px" },
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
                              fontSize: { xs: "12px", md: "13px" },
                              color: "#5A6B7D",
                              fontWeight: 500,
                            }}
                          >
                            {arrAirportInfo.name || "Arrival airport"}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "11px", md: "12px" },
                              color: "#7A8DA3",
                              fontWeight: 500,
                            }}
                          >
                            {arrAirportInfo.address || arrLocation || ""}
                          </Typography>
                          <Typography
                            sx={{
                              mt: "2px",
                              fontSize: { xs: "12px", md: "13px" },
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
                              overflowWrap: "anywhere",
                            }}
                          >
                            {segmentAmenityTitle}
                          </Typography>
                          {amenityIconsOnly ? (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {segmentAmenities.map((item, amenityIndex) => (
                                <Tooltip
                                  key={`${item.category}-${item.text}-${amenityIndex}`}
                                  title={
                                    item?.category
                                      ? `${item.category}: ${item.text}`
                                      : item.text
                                  }
                                  arrow
                                  placement="top"
                                >
                                  <Box
                                    sx={{
                                      width: "26px",
                                      height: "26px",
                                      borderRadius: "999px",
                                      border: "1px solid #D3E3F2",
                                      background: "#F4F9FF",
                                      color: "#2A5D8F",
                                      display: "grid",
                                      placeItems: "center",
                                      flexShrink: 0,
                                      cursor: "help",
                                    }}
                                  >
                                    {getAmenityIcon(item.category, item.text, 14)}
                                  </Box>
                                </Tooltip>
                              ))}
                            </Box>
                          ) : (
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
                          )}
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
                            overflowWrap: "anywhere",
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

              {(SHOW_BRAND_ATTRIBUTES_IN_FLIGHT_INFO || !compactLayout) && (
                <Box
                  sx={{
                    mt: "10px",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr" },
                    gap: "10px",
                    alignItems: "start",
                  }}
                >
                  {SHOW_BRAND_ATTRIBUTES_IN_FLIGHT_INFO && (
                    <Box sx={{ ...sectionCardSx, alignSelf: "start" }}>
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
                      <Box
                        sx={{
                          border: "1px solid #DCE7F2",
                          borderRadius: "12px",
                          p: "10px 11px",
                          background: "linear-gradient(160deg, #FFFFFF 0%, #F2F8FF 100%)",
                          boxShadow: "0 8px 16px rgba(21, 55, 91, 0.07)",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {brandDetails.imageUrl && (
                              <Tooltip
                                arrow
                                placement="right"
                                title={
                                  <Box
                                    component="img"
                                    src={brandDetails.imageUrl}
                                    alt={brandDetails.brandName}
                                    sx={{
                                      width: "300px",
                                      height: "300px",
                                      objectFit: "contain",
                                      borderRadius: "8px",
                                      background: "#fff",
                                      display: "block",
                                    }}
                                  />
                                }
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: "#fff",
                                      border: "1px solid #DCE7F2",
                                      borderRadius: "10px",
                                      boxShadow: "0 8px 32px rgba(21,55,91,0.18)",
                                      p: "6px",
                                      maxWidth: "none",
                                    },
                                  },
                                  arrow: {
                                    sx: { color: "#DCE7F2" },
                                  },
                                }}
                              >
                                <Box
                                  component="img"
                                  src={brandDetails.imageUrl}
                                  alt={brandDetails.brandName}
                                  sx={{
                                    height: "36px",
                                    maxWidth: "80px",
                                    objectFit: "contain",
                                    borderRadius: "6px",
                                    border: "1px solid #DCE7F2",
                                    background: "#fff",
                                    p: "2px",
                                    cursor: "zoom-in",
                                  }}
                                />
                              </Tooltip>
                            )}
                            <Typography
                              sx={{
                                fontSize: "12px",
                                color: "#203247",
                                fontWeight: 700,
                              }}
                            >
                              {brandDetails.brandName}
                            </Typography>
                          </Box>
                          {brandDetails.attributes.length > 0 && (
                            <Chip
                              size="small"
                              label={`${brandDetails.attributes.length} benefit${brandDetails.attributes.length > 1 ? "s" : ""
                                }`}
                              sx={{
                                height: "22px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#20486D",
                                background: "#E5F1FC",
                                border: "1px solid #C4DAEE",
                              }}
                            />
                          )}
                        </Box>

                        {(brandDetails.brandCode || brandDetails.tier) && (
                          <Box
                            sx={{
                              mt: "8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {brandDetails.brandCode && (
                              <Chip
                                size="small"
                                label={brandDetails.brandCode}
                                sx={{
                                  height: "22px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#4A5E74",
                                  background: "#EDF3FA",
                                  border: "1px solid #D5E0EC",
                                }}
                              />
                            )}
                            {brandDetails.tier && (
                              <Chip
                                size="small"
                                label={`Tier ${brandDetails.tier}`}
                                sx={{
                                  height: "22px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#6A4805",
                                  background: "#FFF7E6",
                                  border: "1px solid #F0DEC1",
                                }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>

                      {brandDetails.attributes.length > 0 ? (
                        <BrandAttributeSlider attributes={brandDetails.attributes} />
                      ) : (
                        <Typography sx={{ mt: "10px", fontSize: "11px", color: "#6A7E94" }}>
                          Brand attributes are not provided for this itinerary.
                        </Typography>
                      )}
                    </Box>
                  )}

                  {!compactLayout && (
                    <Box sx={{ ...sectionCardSx, alignSelf: "start" }}>
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
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: compactLayout
                              ? "1fr"
                              : {
                                xs: "1fr",
                                md: `repeat(${baggageColumnCount}, minmax(0, 1fr))`,
                              },
                            gap: "8px",
                          }}
                        >
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
                                <Typography
                                  sx={{
                                    fontSize: "11px",
                                    color: "#2B3D52",
                                    fontWeight: 700,
                                    textAlign: "right",
                                    overflowWrap: "anywhere",
                                    minWidth: 0,
                                  }}
                                >
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
                                <Typography
                                  sx={{
                                    fontSize: "11px",
                                    color: "#2B3D52",
                                    fontWeight: 700,
                                    textAlign: "right",
                                    overflowWrap: "anywhere",
                                    minWidth: 0,
                                  }}
                                >
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
                  )}
                </Box>
              )}

              {!compactLayout && (
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
                    <WarningAmberRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
                    Penalties & Cancellation
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: "8px",
                    }}
                  >
                    <PenaltyInfoCard
                      title="Cancellation"
                      rows={cancellationPenaltyRows}
                      emptyText="Cancellation penalties are not available for this fare."
                    />
                    <PenaltyInfoCard
                      title="Date Change"
                      rows={dateChangePenaltyRows}
                      emptyText="Date change penalties are not available for this fare."
                    />
                  </Box>
                </Box>
              )}

              {!compactLayout && (
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
              )}
            </TabPanel>
          );
        })}
      </TabContext>
    </Box>
  );
};

export default FlightDetails;
