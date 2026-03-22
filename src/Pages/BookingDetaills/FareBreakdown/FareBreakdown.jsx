import { Box, Skeleton, Typography } from "@mui/material";
import commaNumber from "comma-number";
import React, { useMemo } from "react";
import { getFlightCurrencyCode } from "../../../utils/flightPolicyUtils";

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const toNumberValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizePaxKey = (value) => {
  const code = String(value || "").toUpperCase().trim();
  if (code === "ADT" || code === "ADULT") return "ADT";
  if (code === "CHD" || code === "CNN" || code === "CHILD") return "CHD";
  if (code === "INF" || code === "INFANT") return "INF";
  return code || "OTHER";
};

const PAX_ORDER = [
  { key: "ADT", label: "Adult" },
  { key: "CHD", label: "Child" },
  { key: "INF", label: "Infant" },
];

const PAX_ORDER_INDEX = new Map(PAX_ORDER.map((item, index) => [item.key, index]));

const resolvePaxLabel = (paxKey, fallbackLabel = "") => {
  const known = PAX_ORDER.find((item) => item.key === paxKey);
  if (known) return known.label;
  return String(fallbackLabel || "Other").trim() || "Other";
};

const getDefaultPaxRow = ({ key, label }) => ({
  key,
  label,
  paxCount: 0,
  baseFare: 0,
  taxAmount: 0,
  totalFare: 0,
});

const shouldShowPaxRow = (row) =>
  toNumberValue(row?.paxCount) > 0 ||
  toNumberValue(row?.baseFare) > 0 ||
  toNumberValue(row?.taxAmount) > 0 ||
  toNumberValue(row?.totalFare) > 0;

const formatAmount = (value) => {
  const numeric = toNumberValue(value);
  return commaNumber(Math.round(numeric * 100) / 100);
};

const FareBreakdown = ({ airPriceData, selectedAirPrice, loading }) => {
  const activeFare = selectedAirPrice || airPriceData?.[0] || null;
  const currency = getFlightCurrencyCode(activeFare);
  const priceBreakdown = getArrayByKeys(activeFare, [
    "PriceBreakDown",
    "priceBreakDown",
  ]);

  const paxRows = useMemo(() => {
    const rowMap = new Map();

    priceBreakdown.forEach((row) => {
      const paxKey = normalizePaxKey(row?.PaxType || row?.paxType);
      const rawPaxType = String(row?.PaxType || row?.paxType || "").trim();
      const fallbackLabel = resolvePaxLabel(paxKey, rawPaxType);

      if (!rowMap.has(paxKey)) {
        rowMap.set(paxKey, getDefaultPaxRow({ key: paxKey, label: fallbackLabel }));
      }

      const target = rowMap.get(paxKey);
      const rawPaxCount = row?.PaxCount ?? row?.paxCount;
      const hasExplicitPaxCount =
        rawPaxCount !== undefined && rawPaxCount !== null && rawPaxCount !== "";
      const paxCount = hasExplicitPaxCount ? toNumberValue(rawPaxCount) : 1;
      const baseFare = toNumberValue(row?.BaseFare ?? row?.baseFare ?? 0);
      const taxAmount = toNumberValue(row?.Taxes ?? row?.taxes ?? 0);
      const serviceFee = toNumberValue(row?.ServiceFee ?? row?.serviceFee ?? 0);
      const otherCharges = toNumberValue(row?.OtherCharges ?? row?.otherCharges ?? 0);
      const totalFromRow = toNumberValue(row?.TotalFare ?? row?.totalFare ?? 0);
      const calculatedTotal = baseFare + taxAmount + serviceFee + otherCharges;

      target.paxCount += Math.max(paxCount, 0);
      target.baseFare += baseFare;
      target.taxAmount += taxAmount;
      target.totalFare += totalFromRow > 0 ? totalFromRow : calculatedTotal;
    });

    return Array.from(rowMap.values())
      .filter(shouldShowPaxRow)
      .sort((a, b) => {
        const orderA = PAX_ORDER_INDEX.has(a.key) ? PAX_ORDER_INDEX.get(a.key) : 99;
        const orderB = PAX_ORDER_INDEX.has(b.key) ? PAX_ORDER_INDEX.get(b.key) : 99;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.label).localeCompare(String(b.label), undefined, {
          sensitivity: "base",
        });
      });
  }, [priceBreakdown]);

  const totals = useMemo(() => {
    const totalBaseFare = paxRows.reduce((sum, row) => sum + toNumberValue(row.baseFare), 0);
    const totalTaxes = paxRows.reduce((sum, row) => sum + toNumberValue(row.taxAmount), 0);
    const calculatedTotalFare = paxRows.reduce((sum, row) => sum + toNumberValue(row.totalFare), 0);

    const netFare = toNumberValue(activeFare?.NetFare ?? activeFare?.netFare ?? 0);
    const grossFare = toNumberValue(activeFare?.GrossFare ?? activeFare?.grossFare ?? 0);
    const grandTotal = netFare > 0 ? netFare : calculatedTotalFare;
    const discount = grossFare > 0 ? Math.max(grossFare - grandTotal, 0) : 0;

    return {
      totalBaseFare,
      totalTaxes,
      calculatedTotalFare,
      grandTotal,
      discount,
    };
  }, [activeFare, paxRows]);

  return (
    <Box>
      {loading ? (
        <Box>
          <Skeleton height={50} />
          <Skeleton height={50} />
          <Skeleton height={50} />
          <Skeleton height={50} />
        </Box>
      ) : (
        activeFare && (
          <Box sx={{ width: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ fontSize: "12px", color: "#293247" }}>
                Fare Breakdown
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#71727C" }}>
                Prices are shown in {currency}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: "#FFFFFF", p: "15px", mt: "20px", borderRadius: "8px" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.7fr 1fr 1fr 1fr",
                  gap: "6px",
                  pb: "8px",
                  borderBottom: "1px solid #E3E8EF",
                }}
              >
                <Typography sx={{ fontSize: "11px", color: "#526075", fontWeight: 700 }}>
                  Pax Type
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#526075", fontWeight: 700, textAlign: "right" }}>
                  Count
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#526075", fontWeight: 700, textAlign: "right" }}>
                  Base Fare
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#526075", fontWeight: 700, textAlign: "right" }}>
                  Tax
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#526075", fontWeight: 700, textAlign: "right" }}>
                  Total Fare
                </Typography>
              </Box>

              <Box sx={{ pt: "8px" }}>
                {paxRows.map((row) => (
                  <Box
                    key={`pax-${row.key}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.7fr 1fr 1fr 1fr",
                      gap: "6px",
                      py: "6px",
                      borderBottom: "1px dashed #EBEEF3",
                    }}
                  >
                    <Typography sx={{ fontSize: "12px", color: "#3B4759", fontWeight: 600 }}>
                      {row.label}
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#3B4759", fontWeight: 600, textAlign: "right" }}>
                      {row.paxCount || 0}
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#3B4759", fontWeight: 600, textAlign: "right" }}>
                      {formatAmount(row.baseFare)} {currency}
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#3B4759", fontWeight: 600, textAlign: "right" }}>
                      {formatAmount(row.taxAmount)} {currency}
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#23344D", fontWeight: 700, textAlign: "right" }}>
                      {formatAmount(row.totalFare)} {currency}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box mt={2}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid #D9D9D9",
                    pt: "8px",
                  }}
                >
                  <Typography sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}>
                    Total Base Fare
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#293247", fontWeight: 700 }}>
                    {formatAmount(totals.totalBaseFare)} {currency}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: "8px",
                  }}
                >
                  <Typography sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}>
                    Total Taxes
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#293247", fontWeight: 700 }}>
                    {formatAmount(totals.totalTaxes)} {currency}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: "8px",
                    pb: "10px",
                    borderBottom: "1px solid #D9D9D9",
                  }}
                >
                  <Typography sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}>
                    Total Fare (Calculated)
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#293247", fontWeight: 700 }}>
                    {formatAmount(totals.calculatedTotalFare)} {currency}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: "8px",
                  }}
                >
                  <Typography sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}>
                    Discount
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}>
                    {formatAmount(totals.discount)} {currency}
                  </Typography>
                </Box>
              </Box>

              <Box my={2}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography sx={{ fontSize: "14px", color: "#293247", fontWeight: 700 }}>
                    Grand Total
                  </Typography>
                  <Typography sx={{ fontSize: "14px", color: "#293247", fontWeight: 700 }}>
                    {formatAmount(totals.grandTotal)} {currency}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )
      )}
    </Box>
  );
};

export default FareBreakdown;
