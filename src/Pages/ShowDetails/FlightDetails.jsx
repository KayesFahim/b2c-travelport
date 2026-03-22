import CloseIcon from "@mui/icons-material/Close";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AirlineSeatReclineNormalRoundedIcon from "@mui/icons-material/AirlineSeatReclineNormalRounded";
import AirplanemodeActiveRoundedIcon from "@mui/icons-material/AirplanemodeActiveRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import PowerRoundedIcon from "@mui/icons-material/PowerRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import { Box, Button, Chip, Dialog, IconButton, Typography } from "@mui/material";
import React, { useMemo, useRef } from "react";
import commaNumber from "comma-number";
import FareDetails from "../OneWayFlightDetils/FareDetails";
import FlightDetailsContent from "./FlightDetailsContent";
import {
  extractUnifiedPenaltyRows,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";

const FLIGHT_DETAILS_FONT_FAMILY = '"Manrope", sans-serif';

const toNumberValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => toText(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return (
      toText(value?.text) ||
      toText(value?.Text) ||
      toText(value?.headline) ||
      toText(value?.Headline) ||
      toText(value?.description) ||
      toText(value?.Description) ||
      ""
    );
  }
  return "";
};

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const normalizePaxType = (value) => {
  const code = String(value || "").trim().toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "Adult";
  if (["CHD", "CNN", "CHILD"].includes(code)) return "Child";
  if (["INF", "INFANT"].includes(code)) return "Infant";
  return code || "Passenger";
};

const normalizeBagText = (value) => {
  const text = toText(value);
  if (!text) return "0";
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.includes("baggage charges data not available")) return "0";
  return text;
};

const normalizeBagEntries = (bagSource) => {
  const rows = [];
  if (Array.isArray(bagSource)) {
    bagSource.forEach((item) => {
      if (!item) return;
      rows.push({
        type: toText(item?.Type || item?.type),
        value:
          normalizeBagText(item?.Allowance || item?.allowance || item?.Text || item?.text) ||
          normalizeBagText(item),
      });
    });
    return rows.filter((item) => item.value);
  }

  if (bagSource && typeof bagSource === "object") {
    const allowance = getArrayByKeys(bagSource, ["Allowance", "allowance"]);
    if (allowance.length > 0) {
      allowance.forEach((item) => {
        rows.push({
          type: toText(item?.Type || item?.type),
          value:
            normalizeBagText(item?.Allowance || item?.allowance || item?.Text || item?.text) ||
            normalizeBagText(item),
        });
      });
      return rows.filter((item) => item.value);
    }
    const fallback = normalizeBagText(bagSource?.Allowance || bagSource?.allowance || bagSource);
    if (fallback) {
      return [{ type: "", value: fallback }];
    }
  }

  const fallback = normalizeBagText(bagSource);
  return fallback ? [{ type: "", value: fallback }] : [];
};

const extractBaggageRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const bagSource = row?.Bag ?? row?.bag ?? row?.Bags ?? row?.bags ?? [];
      const entries = normalizeBagEntries(bagSource);
      const checked =
        entries.find((item) => /check|checked/i.test(String(item?.type || "")))?.value ||
        entries[0]?.value ||
        "0";
      const cabin =
        entries.find((item) => /cabin|carry|hand/i.test(String(item?.type || "")))?.value ||
        "As per airline policy";
      return {
        id: `${normalizePaxType(row?.PaxType ?? row?.paxType)}-${index}`,
        paxType: normalizePaxType(row?.PaxType ?? row?.paxType),
        paxCount: Math.max(toNumberValue(row?.PaxCount ?? row?.paxCount ?? 1), 1),
        checked,
        cabin,
      };
    })
    .filter(Boolean);

const normalizeInclusionLabel = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (normalized === "included") return "Included";
  if (normalized === "chargeable") return "Chargeable";
  if (normalized === "notoffered") return "Not Offered";
  return value || "Info";
};

const inclusionChipSx = (value = "") => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
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

const BRAND_ATTRIBUTE_MAX_ITEMS = 8;

const getBrandAttributeIcon = (name = "", iconSize = 13) => {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("refund")) {
    return <VerifiedRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("rebooking") || normalized.includes("change")) {
    return <CalendarTodayRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("upgrade")) {
    return <AirplanemodeActiveRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (
    normalized.includes("priority check") ||
    normalized.includes("priority board") ||
    normalized.includes("priority security") ||
    normalized.includes("priority bag")
  ) {
    return <AccessTimeRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("lounge")) {
    return <VerifiedRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("wifi") || normalized.includes("internet")) {
    return <WifiRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("meal") || normalized.includes("food") || normalized.includes("beverage")) {
    return <RestaurantRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("bag") || normalized.includes("carry")) {
    return <LuggageRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("seat") || normalized.includes("layout")) {
    return <AirlineSeatReclineNormalRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("power") || normalized.includes("usb")) {
    return <PowerRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("entertainment") || normalized.includes("video") || normalized.includes("tv")) {
    return <LiveTvRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("mileage") || normalized.includes("accrual")) {
    return <StarRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  if (normalized.includes("not offered")) {
    return <WarningAmberRoundedIcon sx={{ fontSize: iconSize }} />;
  }
  return <InfoOutlinedIcon sx={{ fontSize: iconSize }} />;
};

const extractBrandAttributesFromOffer = (offer) => {
  const items = [];

  const pushBrandRowsFromContainer = (container) => {
    if (!container || typeof container !== "object") return;

    const primary = getArrayByKeys(container, ["BrandAttribute", "brandAttribute"]);
    const additional = getArrayByKeys(container, [
      "AdditionalBrandAttribute",
      "additionalBrandAttribute",
    ]);

    [...primary, ...additional].forEach((item) => {
      const classification =
        toText(item?.classification) ||
        toText(item?.Classification) ||
        toText(item?.name) ||
        toText(item?.Name);
      const inclusion = normalizeInclusionLabel(
        toText(item?.inclusion) || toText(item?.Inclusion) || "Info"
      );
      if (classification) {
        items.push({ classification, inclusion });
      }
    });
  };

  [
    offer?.BrandFeatures,
    offer?.brandFeatures,
    offer?.selectedBrand?.BrandFeatures,
    offer?.selectedBrand?.brandFeatures,
  ].forEach((container) => pushBrandRowsFromContainer(container));

  const legs = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo"]);
  legs.forEach((leg) => {
    pushBrandRowsFromContainer(leg?.BrandFeatures);
    pushBrandRowsFromContainer(leg?.brandFeatures);
  });

  const rawBrandList = [
    ...getArrayByKeys(offer, ["Brand", "brand"]),
    ...getArrayByKeys(offer?.ReferenceList || {}, ["Brand", "brand"]),
  ];
  rawBrandList.forEach((brand) => pushBrandRowsFromContainer(brand));

  if (items.length === 0 && offer && typeof offer === "object") {
    pushBrandRowsFromContainer(offer);
  }

  return Array.from(
    new Map(
      items.map((item) => [`${item.classification}-${item.inclusion}`.toLowerCase(), item])
    ).values()
  );
};

const formatAmount = (value) => commaNumber(Math.round(toNumberValue(value) * 100) / 100);

const SectionBlock = ({ title, children }) => (
  <Box
    sx={{
      fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
      border: "1px solid #DCE4EE",
      borderRadius: "14px",
      overflow: "hidden",
      bgcolor: "#FFFFFF",
      boxShadow: "0 8px 22px rgba(12, 42, 76, 0.08)",
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        px: { xs: "12px", md: "16px" },
        py: "11px",
        bgcolor: "var(--primary-button)",
        borderBottom: "1px solid rgba(8, 25, 47, 0.18)",
      }}
    >
      <Typography
        sx={{
          color: "#FFFFFF",
          fontSize: { xs: "14px", md: "16px" },
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </Typography>
    </Box>
    <Box
      sx={{
        p: { xs: "10px", md: "14px" },
        overflowX: "hidden",
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  </Box>
);

const BaggageBreakdown = ({ rows = [] }) => {
  if (!rows.length) {
    return (
      <Typography sx={{ fontSize: "13px", color: "#6A7E94", fontWeight: 600 }}>
        Baggage allowance is not available for this itinerary.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid #DCE7F2",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#FFFFFF",
      }}
    >
      <Box
        sx={{
          px: { xs: "10px", md: "14px" },
          py: "10px",
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "1.1fr 0.8fr 1fr 1fr",
          gap: "10px",
          alignItems: "center",
          bgcolor: "#EEF5FC",
          borderBottom: "1px solid #DCE7F2",
        }}
      >
        {["Pax Type", "Count", "Check-In", "Cabin"].map((label) => (
          <Typography
            key={label}
            sx={{ fontSize: "12px", color: "#1E3A57", fontWeight: 800 }}
          >
            {label}
          </Typography>
        ))}
      </Box>

      <Box sx={{ p: { xs: "10px", md: "12px" }, display: "flex", flexDirection: "column", gap: "8px" }}>
        {rows.map((row) => (
          <Box
            key={row.id}
            sx={{
              border: "1px solid #E1EAF4",
              borderRadius: "10px",
              p: "10px",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.8fr 1fr 1fr" },
              gap: { xs: "5px", md: "10px" },
              alignItems: "center",
              background: "#FBFDFF",
            }}
          >
            <Typography sx={{ fontSize: "12px", color: "#1F344A", fontWeight: 700 }}>
              {row.paxType}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#2A4866", fontWeight: 700 }}>
              x{row.paxCount}
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#4F6277", fontWeight: 600 }}>
              {row.checked}
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#4F6277", fontWeight: 600 }}>
              {row.cabin}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const BrandAttributesSlider = ({ rows = [] }) => {
  const trackRef = useRef(null);
  const displayRows = Array.isArray(rows) ? rows.slice(0, BRAND_ATTRIBUTE_MAX_ITEMS) : [];

  if (!displayRows.length) {
    return (
      <Typography sx={{ fontSize: "14px", color: "#5B6F84", fontWeight: 600 }}>
        Brand attributes are not available for this itinerary.
      </Typography>
    );
  }

  const slide = (direction = 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * 300,
      behavior: "smooth",
    });
  };

  return (
    <Box>
      <Box
        sx={{
          mb: "8px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
        }}
      >
        <IconButton
          size="small"
          onClick={() => slide(-1)}
          sx={{
            border: "1px solid #D5E1EE",
            bgcolor: "#FFFFFF",
            "&:hover": { bgcolor: "#F2F8FF" },
          }}
        >
          <ChevronLeftRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => slide(1)}
          sx={{
            border: "1px solid #D5E1EE",
            bgcolor: "#FFFFFF",
            "&:hover": { bgcolor: "#F2F8FF" },
          }}
        >
          <ChevronRightRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        ref={trackRef}
        sx={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          pb: "6px",
          scrollSnapType: "x mandatory",
          "&::-webkit-scrollbar": {
            height: "7px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#C9D9EA",
            borderRadius: "999px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
        }}
      >
        {displayRows.map((item, index) => (
          <Box
            key={`${item.classification}-${item.inclusion}-${index}`}
            sx={{
              minWidth: { xs: "220px", md: "260px" },
              maxWidth: { xs: "220px", md: "260px" },
              flex: "0 0 auto",
              scrollSnapAlign: "start",
              border: "1px solid #D8E5F1",
              borderRadius: "6px",
              p: "10px",
              background: "#F9FCFF",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "9px",
              minHeight: "86px",
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
                {getBrandAttributeIcon(item.classification)}
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
                title={item.classification}
              >
                {item.classification}
              </Typography>
            </Box>
            <Typography
              sx={{
                ...inclusionChipSx(item.inclusion),
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
              {item.inclusion}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const FlightDetails = ({
  data,
  flightDetails,
  value,
  handleChange,
  round,
  multicity,
  onCloseDetails,
}) => {
  const handleCloseDetails = () => {
    if (typeof onCloseDetails === "function") {
      onCloseDetails();
    }
  };

  const allLegs = getArrayByKeys(data, ["AllLegsInfo", "allLegsInfo"]);
  const routeSummary = allLegs.length
    ? allLegs
        .map((leg, index) => {
          const dep =
            toText(leg?.DepFrom) ||
            toText(leg?.depFrom) ||
            toText(leg?.departureFrom) ||
            "DEP";
          const arr =
            toText(leg?.ArrTo) || toText(leg?.arrTo) || toText(leg?.arrivalTo) || "ARR";
          return `Leg ${index + 1}: ${dep}-${arr}`;
        })
        .join(" • ")
    : "Itinerary details";

  const currency = getFlightCurrencyCode(data);
  const priceBreakdown = Array.isArray(data?.PriceBreakDown)
    ? data.PriceBreakDown
    : Array.isArray(data?.priceBreakDown)
      ? data.priceBreakDown
      : [];

  const calculatedFare = useMemo(
    () =>
      priceBreakdown.reduce((sum, row) => {
        const paxCount = Math.max(toNumberValue(row?.PaxCount ?? row?.paxCount ?? 1), 1);
        const totalFare = toNumberValue(row?.TotalFare ?? row?.totalFare ?? 0);
        if (totalFare > 0) return sum + totalFare * paxCount;
        const baseFare = toNumberValue(row?.BaseFare ?? row?.baseFare ?? 0);
        const taxes = toNumberValue(row?.Taxes ?? row?.taxes ?? 0);
        const serviceFee = toNumberValue(row?.ServiceFee ?? row?.serviceFee ?? 0);
        const otherCharges = toNumberValue(row?.OtherCharges ?? row?.otherCharges ?? 0);
        return sum + (baseFare + taxes + serviceFee + otherCharges) * paxCount;
      }, 0),
    [priceBreakdown]
  );

  const totalCustomerFare = toNumberValue(data?.NetFare ?? data?.netFare ?? 0) || calculatedFare;
  const grossFare = toNumberValue(data?.GrossFare ?? data?.grossFare ?? 0);
  const savings = grossFare > totalCustomerFare ? grossFare - totalCustomerFare : 0;
  const totalPayable = totalCustomerFare;
  const brandAttributes = useMemo(() => extractBrandAttributesFromOffer(data), [data]);
  const baggageRows = useMemo(() => extractBaggageRows(priceBreakdown), [priceBreakdown]);
  const cancellationPenaltyRows = useMemo(
    () => extractUnifiedPenaltyRows(data, "cancellation"),
    [data]
  );
  const dateChangePenaltyRows = useMemo(
    () => extractUnifiedPenaltyRows(data, "dateChange"),
    [data]
  );

  return (
    <Dialog
      open={Boolean(flightDetails)}
      onClose={handleCloseDetails}
      scroll="paper"
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
          width: { xs: "100%", sm: "min(1280px, calc(100vw - 40px))" },
          maxWidth: { xs: "100%", sm: "min(1280px, calc(100vw - 40px))" },
          height: { xs: "100vh", sm: "92vh" },
          maxHeight: { xs: "100vh", sm: "92vh" },
          m: { xs: 0, sm: "18px auto" },
          borderRadius: { xs: 0, sm: "14px" },
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          bgcolor: "#F3F5F8",
          display: "block",
          boxShadow: "0 24px 40px rgba(11, 24, 43, 0.28)",
          "& .MuiTypography-root": {
            fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
          },
          "& .MuiButton-root": {
            fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
          },
          "& .MuiChip-label": {
            fontFamily: FLIGHT_DETAILS_FONT_FAMILY,
          },
        },
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 4,
          borderBottom: "1px solid #D9E1EA",
          px: { xs: "14px", md: "22px" },
          py: { xs: "12px", md: "16px" },
          bgcolor: "#FBFDFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: "20px", md: "28px" },
              lineHeight: 1.15,
              fontWeight: 800,
              color: "var(--primary-button)",
              letterSpacing: "-0.2px",
            }}
          >
            Flight Details & Pricing
          </Typography>
          <Typography
            sx={{
              mt: "2px",
              fontSize: { xs: "12px", md: "14px" },
              color: "#51657C",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={routeSummary}
          >
            {routeSummary}
          </Typography>
        </Box>
        <IconButton
          onClick={handleCloseDetails}
          size="small"
          sx={{
            border: "1px solid #D5DFEA",
            background: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(16, 40, 72, 0.08)",
            flexShrink: 0,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          WebkitOverflowScrolling: "touch",
          p: { xs: "10px", md: "16px" },
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#C8D8E9",
            borderRadius: "999px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
        }}
      >
          <SectionBlock title="Flight Information">
            <FlightDetailsContent data={data} compactLayout amenityIconsOnly />
          </SectionBlock>

          <SectionBlock title="Brand Attributes">
            <BrandAttributesSlider rows={brandAttributes} />
          </SectionBlock>

          <SectionBlock title="Baggage Allowance">
            <BaggageBreakdown rows={baggageRows} />
          </SectionBlock>

          <SectionBlock title="Price Breakdown">
            <FareDetails data={data} />
            <Box
              sx={{
                mt: "14px",
                pt: "12px",
                borderTop: "1px solid #DCE4EE",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#1E2D42" }}>
                  Total Customer Fare
                </Typography>
                <Typography sx={{ fontSize: "16px", fontWeight: 800, color: "#0E223A" }}>
                  {currency} {formatAmount(totalCustomerFare)}
                </Typography>
              </Box>
              <Box
                sx={{
                  border: "1px solid #CBE8D2",
                  bgcolor: "#EAF8EE",
                  borderRadius: "8px",
                  px: "14px",
                  py: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#1C7A3E" }}>
                  Commission & Your Saving
                </Typography>
                <Typography sx={{ fontSize: "16px", fontWeight: 800, color: "#1C7A3E" }}>
                  {currency} {formatAmount(savings)}
                </Typography>
              </Box>
              <Box
                sx={{
                  borderRadius: "10px",
                  px: { xs: "12px", md: "16px" },
                  py: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  color: "#FFFFFF",
                  background:
                    "linear-gradient(90deg, var(--primary-button) 0%, #F5592F 100%)",
                }}
              >
                <Typography sx={{ fontSize: { xs: "22px", md: "30px" }, fontWeight: 700 }}>
                  Total Payable
                </Typography>
                <Typography sx={{ fontSize: { xs: "20px", md: "34px" }, fontWeight: 800 }}>
                  {currency} {formatAmount(totalPayable)}
                </Typography>
              </Box>
            </Box>
          </SectionBlock>

          <SectionBlock title="Penalty & Cancellation">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: "12px",
              }}
            >
              <Box
                sx={{
                  border: "1px solid #DFE7EF",
                  borderRadius: "12px",
                  bgcolor: "#F9FBFF",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ px: "12px", py: "8px", bgcolor: "#EAF1FB", borderBottom: "1px solid #D6E2F0" }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#1F3959" }}>
                    Cancellation
                  </Typography>
                </Box>
                <Box sx={{ p: "10px" }}>
                  {cancellationPenaltyRows.length > 0 ? (
                    cancellationPenaltyRows.slice(0, 4).map((row) => (
                      <Box
                        key={row.id}
                        sx={{
                          border: "1px solid #DCE4EE",
                          borderRadius: "8px",
                          p: "8px",
                          mb: "8px",
                          bgcolor: "#FFFFFF",
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "12px", fontWeight: 700, color: "#20344A", mb: "4px" }}
                        >
                          {row.timeFrame}
                        </Typography>
                        {row.details.slice(0, 3).map((detail, index) => (
                          <Typography
                            key={`${row.id}-${index}`}
                            sx={{
                              fontSize: "11px",
                              color: "#5A6E83",
                              lineHeight: 1.5,
                              overflowWrap: "anywhere",
                            }}
                          >
                            • {detail}
                          </Typography>
                        ))}
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ fontSize: "12px", color: "#5A6E83", fontWeight: 600 }}>
                      Cancellation penalties are not available in this flight response.
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  border: "1px solid #DFE7EF",
                  borderRadius: "12px",
                  bgcolor: "#F9FBFF",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ px: "12px", py: "8px", bgcolor: "#EAF1FB", borderBottom: "1px solid #D6E2F0" }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#1F3959" }}>
                    Date Change
                  </Typography>
                </Box>
                <Box sx={{ p: "10px" }}>
                  {dateChangePenaltyRows.length > 0 ? (
                    dateChangePenaltyRows.slice(0, 4).map((row) => (
                      <Box
                        key={row.id}
                        sx={{
                          border: "1px solid #DCE4EE",
                          borderRadius: "8px",
                          p: "8px",
                          mb: "8px",
                          bgcolor: "#FFFFFF",
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "12px", fontWeight: 700, color: "#20344A", mb: "4px" }}
                        >
                          {row.timeFrame}
                        </Typography>
                        {row.details.slice(0, 3).map((detail, index) => (
                          <Typography
                            key={`${row.id}-${index}`}
                            sx={{
                              fontSize: "11px",
                              color: "#5A6E83",
                              lineHeight: 1.5,
                              overflowWrap: "anywhere",
                            }}
                          >
                            • {detail}
                          </Typography>
                        ))}
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ fontSize: "12px", color: "#5A6E83", fontWeight: 600 }}>
                      Date change penalties are not available in this flight response.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </SectionBlock>
      </Box>

      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 4,
          p: { xs: "10px", md: "14px" },
          borderTop: "1px solid #D9E1EA",
          bgcolor: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          onClick={handleCloseDetails}
          sx={{
            height: { xs: "42px", md: "52px" },
            borderRadius: "10px",
            textTransform: "none",
            fontSize: { xs: "15px", md: "18px" },
            fontWeight: 800,
            letterSpacing: "0.2px",
            color: "#FFFFFF",
            boxShadow: "none",
            background: "var(--primary-button)",
            "&:hover": {
              boxShadow: "none",
              background: "var(--primary-button)",
            },
          }}
        >
          Book Now
        </Button>
      </Box>
    </Dialog>
  );
};

export default FlightDetails;
