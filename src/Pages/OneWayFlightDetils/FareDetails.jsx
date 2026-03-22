import { Box, Divider, Typography } from "@mui/material";
import React, { useMemo } from "react";
import commaNumber from "comma-number";
import { getFlightCurrencyCode } from "../../utils/flightPolicyUtils";

const toNumberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  commaNumber(Math.round(toNumberValue(value) * 100) / 100);

const normalizePaxType = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (["ADT", "ADULT"].includes(raw)) return "Adult";
  if (["CHD", "CNN", "CHILD"].includes(raw)) return "Child";
  if (["INF", "INFANT"].includes(raw)) return "Infant";
  return raw || "Passenger";
};

const FareDetails = ({ data }) => {
  const currency = getFlightCurrencyCode(data);

  const breakdownRows = useMemo(() => {
    const rows = Array.isArray(data?.PriceBreakDown)
      ? data.PriceBreakDown
      : Array.isArray(data?.priceBreakDown)
        ? data.priceBreakDown
        : [];

    return rows
      .map((row, index) => {
        const paxCount = Math.max(toNumberValue(row?.PaxCount ?? row?.paxCount ?? 0), 0);
        const baseFare = toNumberValue(row?.BaseFare ?? row?.baseFare ?? 0);
        const taxes = toNumberValue(row?.Taxes ?? row?.taxes ?? 0);
        const serviceFee = toNumberValue(row?.ServiceFee ?? row?.serviceFee ?? 0);
        const otherCharges = toNumberValue(row?.OtherCharges ?? row?.otherCharges ?? 0);
        const totalFare = toNumberValue(row?.TotalFare ?? row?.totalFare ?? 0);
        const perPassengerTotal =
          totalFare > 0 ? totalFare : baseFare + taxes + serviceFee + otherCharges;
        const rowTotal = perPassengerTotal * Math.max(paxCount, 1);

        return {
          id: `${normalizePaxType(row?.PaxType ?? row?.paxType)}-${index}`,
          paxType: normalizePaxType(row?.PaxType ?? row?.paxType),
          paxCount,
          baseFare,
          taxes: taxes + serviceFee + otherCharges,
          totalFare: perPassengerTotal,
          rowTotal,
        };
      })
      .filter(
        (row) => row.paxCount > 0 && (row.baseFare > 0 || row.taxes > 0 || row.totalFare > 0)
      );
  }, [data]);

  const totals = useMemo(
    () =>
      breakdownRows.reduce(
        (acc, row) => ({
          baseFare: acc.baseFare + row.baseFare * row.paxCount,
          taxes: acc.taxes + row.taxes * row.paxCount,
          totalFare: acc.totalFare + row.rowTotal,
        }),
        { baseFare: 0, taxes: 0, totalFare: 0 }
      ),
    [breakdownRows]
  );

  if (!breakdownRows.length) {
    return (
      <Typography sx={{ fontSize: "12px", color: "#6A7E94", fontWeight: 600 }}>
        Price breakdown is not available for this itinerary.
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
          gridTemplateColumns: "1.1fr 0.8fr 1fr 1fr 1fr 1fr",
          gap: "10px",
          alignItems: "center",
          bgcolor: "#EEF5FC",
          borderBottom: "1px solid #DCE7F2",
        }}
      >
        {["Pax Type", "Count", "Base Fare", "Tax & Fees", "Per Pax", "Sub Total"].map(
          (label) => (
            <Typography
              key={label}
              sx={{ fontSize: "11px", color: "#1E3A57", fontWeight: 800 }}
            >
              {label}
            </Typography>
          )
        )}
      </Box>

      <Box sx={{ p: { xs: "10px", md: "12px" }, display: "flex", flexDirection: "column", gap: "8px" }}>
        {breakdownRows.map((row) => (
          <Box
            key={row.id}
            sx={{
              border: "1px solid #E1EAF4",
              borderRadius: "10px",
              p: "10px",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.8fr 1fr 1fr 1fr 1fr" },
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
            <Typography sx={{ fontSize: "12px", color: "#4F6277", fontWeight: 600 }}>
              {currency} {formatAmount(row.baseFare)}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#4F6277", fontWeight: 600 }}>
              {currency} {formatAmount(row.taxes)}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#1F344A", fontWeight: 700 }}>
              {currency} {formatAmount(row.totalFare)}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#113A62", fontWeight: 800 }}>
              {currency} {formatAmount(row.rowTotal)}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ borderColor: "#DCE7F2", my: "2px" }} />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: "8px" }}>
          <Box sx={{ border: "1px solid #E1EAF4", borderRadius: "10px", p: "10px", bgcolor: "#F9FCFF" }}>
            <Typography sx={{ fontSize: "11px", color: "#5A6E83", fontWeight: 700 }}>
              Total Base Fare
            </Typography>
            <Typography sx={{ mt: "3px", fontSize: "15px", color: "#1E3650", fontWeight: 800 }}>
              {currency} {formatAmount(totals.baseFare)}
            </Typography>
          </Box>
          <Box sx={{ border: "1px solid #E1EAF4", borderRadius: "10px", p: "10px", bgcolor: "#F9FCFF" }}>
            <Typography sx={{ fontSize: "11px", color: "#5A6E83", fontWeight: 700 }}>
              Total Tax & Fees
            </Typography>
            <Typography sx={{ mt: "3px", fontSize: "15px", color: "#1E3650", fontWeight: 800 }}>
              {currency} {formatAmount(totals.taxes)}
            </Typography>
          </Box>
          <Box sx={{ border: "1px solid #D2E5F8", borderRadius: "10px", p: "10px", bgcolor: "#EEF7FF" }}>
            <Typography sx={{ fontSize: "11px", color: "#17456E", fontWeight: 800 }}>
              Total Customer Fare
            </Typography>
            <Typography sx={{ mt: "3px", fontSize: "16px", color: "#0E3C64", fontWeight: 900 }}>
              {currency} {formatAmount(totals.totalFare)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FareDetails;
