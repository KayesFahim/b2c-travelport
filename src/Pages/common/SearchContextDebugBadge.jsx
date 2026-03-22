import React from "react";
import { Box, Typography } from "@mui/material";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTripLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "roundway" || normalized === "roundtrip") {
    return "Round Trip";
  }
  if (normalized === "multicity") {
    return "Multi City";
  }
  return "One Way";
};

const SearchContextDebugBadge = ({
  visible = false,
  tripType = "oneway",
  adultCount = 1,
  childCount = 0,
  infantCount = 0,
  segmentCount = 1,
}) => {
  if (!visible) return null;

  const safeAdult = Math.max(1, toNumber(adultCount, 1));
  const safeChild = Math.max(0, toNumber(childCount, 0));
  const safeInfant = Math.max(0, toNumber(infantCount, 0));
  const safeSegments = Math.max(1, toNumber(segmentCount, 1));
  const totalPax = safeAdult + safeChild + safeInfant;

  return (
    <Box
      sx={{
        position: "fixed",
        top: { xs: "76px", md: "96px" },
        right: { xs: "8px", md: "14px" },
        zIndex: 1300,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          px: 1.1,
          py: 0.7,
          borderRadius: "10px",
          border: "1px solid rgba(0,154,214,0.24)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(236,247,255,0.96) 100%)",
          boxShadow: "0 10px 18px rgba(10,42,70,0.14)",
          minWidth: { xs: "190px", md: "238px" },
        }}
      >
        <Typography
          sx={{
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#516B84",
            lineHeight: 1.1,
            mb: 0.35,
          }}
        >
          Search Context
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "10.5px", md: "11px" },
            fontWeight: 700,
            color: "#153A5E",
            lineHeight: 1.25,
          }}
        >
          {normalizeTripLabel(tripType)} • Pax {totalPax} (A{safeAdult}/C{safeChild}/I
          {safeInfant}) • Seg {safeSegments}
        </Typography>
      </Box>
    </Box>
  );
};

export default SearchContextDebugBadge;
