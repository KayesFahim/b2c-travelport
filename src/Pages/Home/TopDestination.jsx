import React from "react";
import { Box, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import SouthEastRoundedIcon from "@mui/icons-material/SouthEastRounded";
import { TOP_DESTINATION_SPOTLIGHT_IMAGE } from "../../data/topDestinationCities";

const spotlightImage = TOP_DESTINATION_SPOTLIGHT_IMAGE;

const destinations = [
  {
    id: 1,
    city: "Dubai",
    country: "UAE",
    route: "DAC to DXB",
    duration: "5h 15m",
    fare: "BDT 45,900",
    trend: "+8%",
    note: "High demand for family and business travel.",
  },
  {
    id: 2,
    city: "Singapore",
    country: "Singapore",
    route: "DAC to SIN",
    duration: "4h 30m",
    fare: "BDT 51,500",
    trend: "+5%",
    note: "Strong premium inventory and stable schedules.",
  },
  {
    id: 3,
    city: "Bangkok",
    country: "Thailand",
    route: "DAC to BKK",
    duration: "2h 35m",
    fare: "BDT 27,800",
    trend: "+11%",
    note: "Best short-haul value and frequent departures.",
  },
  {
    id: 4,
    city: "Istanbul",
    country: "Turkey",
    route: "DAC to IST",
    duration: "8h 10m",
    fare: "BDT 63,200",
    trend: "+4%",
    note: "Popular bridge route for Europe connections.",
  },
  {
    id: 5,
    city: "Kuala Lumpur",
    country: "Malaysia",
    route: "DAC to KUL",
    duration: "4h 05m",
    fare: "BDT 29,600",
    trend: "+7%",
    note: "Easy multi-city combos with predictable fares.",
  },
];

const TopDestination = () => {
  const spotlight = destinations[0];

  return (
    <Box sx={{ py: { xs: 6, md: 8 } }}>
      <Container>
        <Box
          sx={{
            borderRadius: { xs: "22px", md: "30px" },
            border: "1px solid rgba(0,154,214,0.2)",
            background:
              "linear-gradient(140deg, rgba(0,154,214,0.10) 0%, rgba(255,255,255,1) 50%)",
            boxShadow: "0 20px 44px rgba(15, 35, 58, 0.08)",
            p: { xs: 2, md: 3 },
          }}
        >
          <Grid container spacing={2.2}>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  border: "1px solid rgba(0,154,214,0.18)",
                  bgcolor: "rgba(255,255,255,0.9)",
                  p: { xs: 2, md: 2.2 },
                }}
              >
                <Chip
                  icon={<FlightTakeoffRoundedIcon sx={{ fontSize: "16px !important" }} />}
                  label="Top destination"
                  sx={{
                    mb: 1.3,
                    bgcolor: "rgba(0,154,214,0.14)",
                    color: "var(--primary-color)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                />

                <Typography
                  sx={{
                    fontSize: { xs: "24px", md: "30px" },
                    fontWeight: 800,
                    lineHeight: 1.18,
                    color: "var(--flight-color)",
                    mb: 1,
                  }}
                >
                  Most searched routes with cleaner fare visibility.
                </Typography>

                <Typography
                  sx={{
                    color: "var(--text-color)",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    mb: 2,
                  }}
                >
                  Ranked destinations by recent demand, fare movement, and route
                  consistency across Fly Jatt searches.
                </Typography>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.6,
                      px: 1.2,
                      py: 0.7,
                      borderRadius: "999px",
                      bgcolor: "rgba(0,154,214,0.12)",
                      color: "var(--primary-color)",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    <TrendingUpRoundedIcon sx={{ fontSize: 16 }} />
                    5 active routes
                  </Box>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.6,
                      px: 1.2,
                      py: 0.7,
                      borderRadius: "999px",
                      bgcolor: "rgba(0,154,214,0.08)",
                      color: "var(--depature-color)",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    <AccessTimeRoundedIcon sx={{ fontSize: 16 }} />
                    24h refresh
                  </Box>
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Box
                sx={{
                  borderRadius: "20px",
                  border: "1px solid rgba(0,154,214,0.18)",
                  bgcolor: "white",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: { xs: 1.3, md: 1.8 },
                    py: 1.2,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "58px 1fr 140px 110px" },
                    gap: 1,
                    borderBottom: "1px solid rgba(0,154,214,0.14)",
                    background:
                      "linear-gradient(120deg, rgba(0,154,214,0.06), rgba(255,255,255,0.9))",
                  }}
                >
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "var(--text-color)" }}>
                    Rank
                  </Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "var(--text-color)" }}>
                    Route
                  </Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "var(--text-color)" }}>
                    Duration
                  </Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "var(--text-color)" }}>
                    Fare
                  </Typography>
                </Box>

                {destinations.map((item, index) => (
                  <Box
                    key={item.id}
                    sx={{
                      px: { xs: 1.3, md: 1.8 },
                      py: 1.25,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "58px 1fr 140px 110px" },
                      gap: 1,
                      alignItems: "center",
                      borderBottom:
                        index === destinations.length - 1
                          ? "none"
                          : "1px solid rgba(0,154,214,0.1)",
                      "&:hover": { bgcolor: "rgba(0,154,214,0.04)" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        bgcolor:
                          index === 0
                            ? "var(--primary-color)"
                            : "rgba(0,154,214,0.12)",
                        color: index === 0 ? "white" : "var(--primary-color)",
                      }}
                    >
                      {`0${item.id}`}
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: "16px",
                          fontWeight: 800,
                          color: "var(--flight-color)",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.city}, {item.country}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "12px",
                          color: "var(--text-color)",
                          mt: 0.25,
                        }}
                      >
                        {item.route} • {item.note}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: "13px", color: "var(--depature-color)", fontWeight: 700 }}>
                      {item.duration}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                      <Typography
                        sx={{ fontSize: "15px", fontWeight: 800, color: "var(--primary-color)" }}
                      >
                        {item.fare}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#0f8b58",
                          bgcolor: "rgba(15,139,88,0.12)",
                          px: 0.8,
                          py: 0.25,
                          borderRadius: "999px",
                        }}
                      >
                        {item.trend}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 2.2,
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(0,154,214,0.18)",
              position: "relative",
              height: { xs: 220, sm: 260, md: 340, lg: 420 },
              maxHeight: 500,
            }}
          >
            <Box
              component="img"
              src={spotlightImage}
              alt="Destination spotlight"
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                p: { xs: 1.6, md: 2.2 },
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                background:
                  "linear-gradient(180deg, rgba(4,21,36,0.08) 0%, rgba(4,21,36,0.78) 100%)",
              }}
            >
              <Box>
                <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", mb: 0.35 }}>
                  Destination Spotlight
                </Typography>
                <Typography
                  sx={{
                    color: "white",
                    fontSize: { xs: "22px", md: "30px" },
                    fontWeight: 800,
                    lineHeight: 1.12,
                  }}
                >
                  {spotlight.city}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.84)", fontSize: "13px", mt: 0.45 }}>
                  {spotlight.route} • {spotlight.duration}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: "14px",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "var(--primary-color)",
                  color: "white",
                }}
              >
                <SouthEastRoundedIcon />
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default TopDestination;
