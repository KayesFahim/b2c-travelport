import React, { useState } from "react";
import { Box, Chip, Container, Typography } from "@mui/material";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

const PARTNER_AIRLINES = [
  { code: "QR", name: "Qatar Airways" },
  { code: "EK", name: "Emirates" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "EY", name: "Etihad Airways" },
  { code: "SV", name: "Saudia" },
  { code: "BG", name: "Biman Bangladesh" },
  { code: "MH", name: "Malaysia Airlines" },
  { code: "TG", name: "Thai Airways" },
  { code: "BA", name: "British Airways" },
  { code: "LH", name: "Lufthansa" },
  { code: "ET", name: "Ethiopian Airlines" },
];

const PartnerAirlines = () => {
  const [failedLogos, setFailedLogos] = useState({});

  const renderAirlineCard = (airline, keyPrefix) => {
    const logoFailed = Boolean(failedLogos[airline.code]);
    const logoUrl = `https://images.kiwi.com/airlines/64/${airline.code}.png`;

    return (
      <Box
        key={`${keyPrefix}-${airline.code}`}
        sx={{
          flexShrink: 0,
          minWidth: 196,
          px: 2,
          py: 1.5,
          mx: 0.75,
          borderRadius: "14px",
          bgcolor: "#ffffff",
          border: "1px solid rgba(15, 39, 69, 0.09)",
          boxShadow: "0 8px 20px rgba(15, 39, 69, 0.04)",
          display: "flex",
          alignItems: "center",
          gap: 1.4,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            bgcolor: "#f0f7ff",
            border: "1px solid rgba(11, 74, 130, 0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {!logoFailed ? (
            <img
              src={logoUrl}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              onError={() =>
                setFailedLogos((prev) => ({ ...prev, [airline.code]: true }))
              }
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
          ) : (
            <Typography
              sx={{ fontWeight: 800, fontSize: "0.85rem", color: "#0b4a82" }}
            >
              {airline.code}
            </Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "0.88rem",
              color: "#0b2447",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {airline.name}
          </Typography>
          <Typography sx={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>
            GDS • {airline.code}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      component="section"
      aria-labelledby="partner-airlines-heading"
      sx={{ py: { xs: 4, md: 5 } }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            p: { xs: 2.2, md: 3.5 },
            borderRadius: "24px",
            bgcolor: "#ffffff",
            border: "1px solid rgba(15, 39, 69, 0.08)",
            boxShadow: "0 14px 36px rgba(15, 39, 69, 0.05)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <Box>
              <Chip
                icon={<VerifiedRoundedIcon sx={{ fontSize: 15 }} />}
                label="Global Airline Network"
                size="small"
                sx={{
                  bgcolor: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 700,
                  mb: 0.9,
                  "& .MuiChip-icon": { color: "#0369a1" },
                }}
              />
              <Typography
                id="partner-airlines-heading"
                component="h2"
                className="flyjatt-section-title"
              >
                Connected Travelport Carriers
              </Typography>
            </Box>
            <Typography sx={{ color: "#475569", fontSize: "0.9rem" }}>
              Live branded fares, seat availability, and instant PNR issuance across full-service airlines.
            </Typography>
          </Box>

          <Box
            className="flyjatt-marquee-viewport"
            tabIndex={0}
            aria-label="Partner airline logos list"
            sx={{ py: 0.5, borderRadius: "16px" }}
          >
            <Box className="flyjatt-marquee-track">
              {PARTNER_AIRLINES.map((airline) => renderAirlineCard(airline, "a"))}
              {PARTNER_AIRLINES.map((airline) => renderAirlineCard(airline, "b"))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PartnerAirlines;
