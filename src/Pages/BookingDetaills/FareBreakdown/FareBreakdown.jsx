import { Box, Skeleton, Typography } from "@mui/material";
import commaNumber from "comma-number";
import React from "react";
import { getFlightCurrencyCode } from "../../../utils/flightPolicyUtils";

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const FareBreakdown = ({ airPriceData, selectedAirPrice, loading }) => {
  const activeFare = selectedAirPrice || airPriceData?.[0] || null;
  const currency = getFlightCurrencyCode(activeFare);
  const priceBreakdown = getArrayByKeys(activeFare, [
    "PriceBreakDown",
    "priceBreakDown",
  ]);
  const totalBaseFare = Number(activeFare?.BaseFare ?? activeFare?.baseFare ?? 0);
  const totalTaxAndFee = Number(
    (activeFare?.Taxes ?? activeFare?.taxes ?? 0) +
      (activeFare?.SerViceFee ?? activeFare?.serviceFee ?? 0)
  );
  const grossFare = Number(activeFare?.GrossFare ?? activeFare?.grossFare ?? 0);
  const netFare = Number(activeFare?.NetFare ?? activeFare?.netFare ?? 0);

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

            <Box sx={{ bgcolor: "#FFFFFF", p: "15px", mt: "20px" }}>
              <Box>
                {priceBreakdown.map((price, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "13px",
                        color: "#71727C",
                        fontWeight: 600,
                      }}
                    >
                      Traveler {i + 1}: {price?.PaxType || price?.paxType} (x
                      {price?.PaxCount || price?.paxCount || 1})
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        color: "#71727C",
                        fontWeight: 600,
                      }}
                    >
                      {commaNumber(
                        Number(price?.BaseFare ?? price?.baseFare ?? 0) *
                          Number(price?.PaxCount ?? price?.paxCount ?? 1)
                      )}{" "}
                      {currency}
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
                    pt: "2px",
                  }}
                >
                  <Typography
                    sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}
                  >
                    Total Base Fare
                  </Typography>
                  <Typography
                    sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}
                  >
                    {commaNumber(totalBaseFare)} {currency}
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
                  <Typography
                    sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}
                  >
                    Total Tax & Fee
                  </Typography>
                  <Typography
                    sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}
                  >
                    {commaNumber(totalTaxAndFee)}{" "}
                    {currency}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: "8px",
                    pb: "15px",
                    borderBottom: "1px solid #D9D9D9",
                  }}
                >
                  <Typography
                    sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}
                  >
                    Discount
                  </Typography>
                  <Typography
                    sx={{ fontSize: "13px", color: "#71727C", fontWeight: 600 }}
                  >
                    {commaNumber(grossFare - netFare)}{" "}
                    {currency}
                  </Typography>
                </Box>
              </Box>
              <Box my={3}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{ fontSize: "14px", color: "#293247", fontWeight: 600 }}
                  >
                    Grand Total
                  </Typography>
                  <Typography
                    sx={{ fontSize: "14px", color: "#293247", fontWeight: 600 }}
                  >
                    {commaNumber(netFare)} {currency}
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
