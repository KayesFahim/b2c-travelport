import { Box, Chip, Skeleton, Typography } from "@mui/material";
import commaNumber from "comma-number";
import React from "react";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { getFareOptionKey } from "../../utils/fareOptionKey";

const getBrandName = (option) =>
  option?.AllLegsInfo?.[0]?.BrandName ||
  option?.allLegsInfo?.[0]?.brandName ||
  option?.AllLegsInfo?.[0]?.BrandFeatures?.name ||
  option?.allLegsInfo?.[0]?.brandFeatures?.name ||
  option?.FareType ||
  option?.fareType ||
  "Standard";

const BrandSelector = ({ loading, options = [], selectedKey = "", onSelect }) => {
  if (loading) {
    return (
      <Box>
        <Skeleton height={42} />
        <Skeleton height={62} />
        <Skeleton height={62} />
      </Box>
    );
  }

  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ fontSize: "12px", color: "#293247", fontWeight: 700 }}>
        Select Brand
      </Typography>
      <Typography sx={{ fontSize: "11px", color: "#71727C", mt: "2px" }}>
        All available branded fares from Air Price API.
      </Typography>

      <Box sx={{ mt: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {options.map((option, index) => {
          const key = getFareOptionKey(option, index);
          const isSelected = key === selectedKey;
          const currencyCode = getFlightCurrencyCode(option);
          const symbol = getCurrencySymbol(currencyCode);
          const netFare = Number(option?.NetFare ?? option?.netFare ?? 0);
          const refundableText =
            option?.Refundable === true || option?.refundable === true
              ? "Refundable"
              : "Non-refundable";

          return (
            <Box
              key={key}
              onClick={() => onSelect?.(key)}
              sx={{
                border: isSelected
                  ? "1px solid var(--primary-button)"
                  : "1px solid #DFE7EF",
                borderRadius: "10px",
                p: "10px",
                cursor: "pointer",
                bgcolor: isSelected ? "#F3F9FF" : "#FFFFFF",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#223346",
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                    noWrap
                  >
                    {getBrandName(option)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "11px",
                      color: "#617488",
                      fontWeight: 600,
                      mt: "2px",
                    }}
                  >
                    {option?.Carrier || option?.carrierCode || "Carrier"}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: "13px",
                    color: "var(--primary-button)",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {symbol}
                  {commaNumber(netFare)}
                </Typography>
              </Box>

              <Box sx={{ mt: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={refundableText}
                  sx={{
                    height: "22px",
                    background: isSelected ? "#DCEEFF" : "#F3F6FA",
                    color: "#284865",
                    fontWeight: 700,
                  }}
                />
                {isSelected && (
                  <Chip
                    size="small"
                    label="Selected"
                    sx={{
                      height: "22px",
                      background: "var(--primary-button)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BrandSelector;
