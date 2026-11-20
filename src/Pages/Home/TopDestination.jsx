import React, { useMemo, useState } from "react";
import { Box, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { addDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { TOP_DESTINATION_SPOTLIGHT_IMAGE } from "../../data/topDestinationCities";
import fallbackSpotlightImg from "../../asstes/img/HomeImage/subBanner.png";
import { saveRecentSearch } from "../../utils/recentSearches";

const FEATURED_CORRIDORS = [
  {
    rank: "01",
    fromCode: "DAC",
    fromName: "Dhaka, Bangladesh",
    city: "Dubai",
    country: "United Arab Emirates",
    code: "DXB",
    frequency: "18+ daily flights",
    duration: "5h 25m avg",
    startingFare: "From USD 368",
    tag: "Most Booked",
    image: TOP_DESTINATION_SPOTLIGHT_IMAGE,
  },
  {
    rank: "02",
    fromCode: "DAC",
    fromName: "Dhaka, Bangladesh",
    city: "London",
    country: "United Kingdom",
    code: "LHR",
    frequency: "8+ weekly hubs",
    duration: "10h 35m avg",
    startingFare: "From USD 685",
    tag: "Europe Gateway",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=80",
  },
  {
    rank: "03",
    fromCode: "DAC",
    fromName: "Dhaka, Bangladesh",
    city: "Kuala Lumpur",
    country: "Malaysia",
    code: "KUL",
    frequency: "20+ daily flights",
    duration: "4h 05m avg",
    startingFare: "From USD 242",
    tag: "Short Haul",
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=80",
  },
  {
    rank: "04",
    fromCode: "DAC",
    fromName: "Dhaka, Bangladesh",
    city: "Jeddah",
    country: "Saudi Arabia",
    code: "JED",
    frequency: "14+ daily flights",
    duration: "6h 10m avg",
    startingFare: "From USD 445",
    tag: "Direct Available",
    image:
      "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1000&q=80",
  },
  {
    rank: "05",
    fromCode: "DAC",
    fromName: "Dhaka, Bangladesh",
    city: "Singapore",
    country: "Singapore",
    code: "SIN",
    frequency: "10+ daily flights",
    duration: "4h 15m avg",
    startingFare: "From USD 310",
    tag: "Top Rated",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=80",
  },
  {
    rank: "06",
    fromCode: "DAC",
    fromName: "Dhaka, Bangladesh",
    city: "Istanbul",
    country: "Turkey",
    code: "IST",
    frequency: "6+ daily hubs",
    duration: "8h 40m avg",
    startingFare: "From USD 590",
    tag: "Intercontinental",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1000&q=80",
  },
];

const resolveAssetSrc = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.src === "string") return value.src;
  return "";
};

const TopDestination = () => {
  const navigate = useNavigate();
  const [selectedCode, setSelectedCode] = useState(FEATURED_CORRIDORS[0].code);
  const [failedSpotlightIds, setFailedSpotlightIds] = useState({});

  const activeRoute = useMemo(
    () =>
      FEATURED_CORRIDORS.find((item) => item.code === selectedCode) ||
      FEATURED_CORRIDORS[0],
    [selectedCode]
  );

  const handleLaunchRouteSearch = (route) => {
    const depDateObj = addDays(new Date(), 14);
    const depDateIso = format(depDateObj, "yyyy-MM-dd");
    const formattedDepartureDate = format(depDateObj, "dd MMM yy");

    saveRecentSearch({
      tripType: "oneway",
      fromCode: route.fromCode,
      toCode: route.code,
      fromLabel: `${route.fromName} (${route.fromCode})`,
      toLabel: `${route.city}, ${route.country} (${route.code})`,
      fromAddress: route.fromName,
      toAddress: `${route.city}, ${route.country}`,
      departureDate: depDateIso,
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      cabinClass: "1",
      segments: [
        {
          depfrom: route.fromCode,
          arrto: route.code,
          depdate: depDateIso,
          depFromText: `${route.fromName} (${route.fromCode})`,
          arrToText: `${route.city}, ${route.country} (${route.code})`,
        },
      ],
    });

    navigate("/offers", {
      state: {
        faddress: route.fromName,
        toAddress: `${route.city}, ${route.country}`,
        fromSearchText: `${route.fromName} (${route.fromCode})`,
        toSearchText: `${route.city}, ${route.country} (${route.code})`,
        departureDate: formattedDepartureDate,
        adultCount: 1,
        childCount: 0,
        infant: 0,
        tripType: "oneway",
        fromSendData: route.fromCode,
        toSendData: route.code,
        className: "1",
        result: 1,
        valueBox: "oneway",
        searchData: {
          segments: [
            {
              depfrom: route.fromCode,
              arrto: route.code,
              depdate: depDateIso,
              depFromText: `${route.fromName} (${route.fromCode})`,
              arrToText: `${route.city}, ${route.country} (${route.code})`,
            },
          ],
        },
      },
    });
  };

  const spotlightImageSrc = failedSpotlightIds[activeRoute.code]
    ? resolveAssetSrc(fallbackSpotlightImg)
    : resolveAssetSrc(activeRoute.image) || resolveAssetSrc(fallbackSpotlightImg);

  return (
    <Box
      component="section"
      aria-labelledby="popular-corridors-heading"
      sx={{ py: { xs: 4, md: 5.5 } }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            p: { xs: 2.2, sm: 3, md: 4 },
            borderRadius: "24px",
            bgcolor: "#ffffff",
            border: "1px solid rgba(15, 39, 69, 0.08)",
            boxShadow: "0 18px 46px rgba(15, 39, 69, 0.06)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Chip
                icon={<TrendingUpRoundedIcon sx={{ fontSize: 15 }} />}
                label="Interactive Route Explorer"
                size="small"
                sx={{
                  bgcolor: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 700,
                  mb: 1,
                  "& .MuiChip-icon": { color: "#0369a1" },
                }}
              />
              <Typography
                id="popular-corridors-heading"
                component="h2"
                className="flyjatt-section-title"
              >
                Top Flight Destinations
              </Typography>
            </Box>
            <Typography sx={{ color: "#475569", fontSize: "0.92rem", maxWidth: 460 }}>
              Select any international hub to preview schedule density and search real-time GDS availability.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2.5, md: 3.5 }} alignItems="stretch">
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  height: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                  bgcolor: "#061c39",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    aspectRatio: "16 / 10",
                    overflow: "hidden",
                    bgcolor: "#0e3561",
                  }}
                >
                  <img
                    src={spotlightImageSrc}
                    alt={`${activeRoute.city}, ${activeRoute.country} aerial destination view`}
                    width={640}
                    height={400}
                    loading="lazy"
                    onError={() =>
                      setFailedSpotlightIds((prev) => ({
                        ...prev,
                        [activeRoute.code]: true,
                      }))
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(6,28,57,0.12) 0%, rgba(6,28,57,0.88) 100%)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      p: 2.2,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Chip
                        size="small"
                        label={activeRoute.tag}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.92)",
                          color: "#061c39",
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        size="small"
                        label={`${activeRoute.fromCode} -> ${activeRoute.code}`}
                        sx={{
                          bgcolor: "#0082c4",
                          color: "#ffffff",
                          fontWeight: 800,
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        component="h3"
                        sx={{ fontSize: "1.55rem", fontWeight: 800, lineHeight: 1.15 }}
                      >
                        {activeRoute.city}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.82)", fontSize: "0.9rem" }}>
                        {activeRoute.country}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    flex: 1,
                    justifyContent: "space-between",
                  }}
                >
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Box
                        sx={{
                          p: 1.4,
                          borderRadius: "12px",
                          bgcolor: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.72rem", color: "#93c5fd", fontWeight: 700 }}>
                          AVG FLIGHT TIME
                        </Typography>
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, mt: 0.3 }}>
                          {activeRoute.duration}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box
                        sx={{
                          p: 1.4,
                          borderRadius: "12px",
                          bgcolor: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.72rem", color: "#93c5fd", fontWeight: 700 }}>
                          INDICATIVE FARE
                        </Typography>
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, mt: 0.3 }}>
                          {activeRoute.startingFare}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1.5}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.82)",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.7,
                      }}
                    >
                      <FlightTakeoffRoundedIcon sx={{ fontSize: 17, color: "#38bdf8" }} />
                      {activeRoute.frequency}
                    </Typography>

                    <button
                      type="button"
                      onClick={() => handleLaunchRouteSearch(activeRoute)}
                      className="flyjatt-touch-btn"
                      style={{
                        minHeight: "44px",
                        padding: "0 18px",
                        borderRadius: "12px",
                        border: "none",
                        backgroundColor: "#38bdf8",
                        color: "#061c39",
                        fontWeight: 800,
                        fontSize: "0.88rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Search Flights
                      <ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} />
                    </button>
                  </Stack>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={7}>
              <Stack spacing={1.2} role="list" aria-label="Popular international flight corridors">
                {FEATURED_CORRIDORS.map((item) => {
                  const isActive = item.code === activeRoute.code;
                  return (
                    <Box
                      key={item.code}
                      role="listitem"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        p: { xs: 1.25, sm: 1.6 },
                        borderRadius: "16px",
                        border: isActive
                          ? "1.5px solid #0082c4"
                          : "1px solid rgba(15, 39, 69, 0.1)",
                        bgcolor: isActive ? "#f0f8ff" : "#f8fbff",
                        transition: "border-color 160ms ease, background-color 160ms ease",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCode(item.code)}
                        aria-pressed={isActive}
                        className="flyjatt-touch-btn flyjatt-focus-ring"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          minHeight: "44px",
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          cursor: "pointer",
                        }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            bgcolor: isActive ? "#0b4a82" : "#e2ecf6",
                            color: isActive ? "#ffffff" : "#0b2447",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {item.rank}
                        </Box>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.96rem",
                              color: "#0b2447",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.city}, {item.country}
                          </Typography>
                          <Typography
                            sx={{
                              color: "#475569",
                              fontSize: "0.8rem",
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 1,
                            }}
                          >
                            <span>
                              {item.fromCode} -&gt; {item.code}
                            </span>
                            <span>•</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                              {item.duration}
                            </span>
                          </Typography>
                        </Box>

                        <Box sx={{ textAlign: "right", flexShrink: 0, display: { xs: "none", sm: "block" } }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.88rem",
                              color: "#0b4a82",
                            }}
                          >
                            {item.startingFare}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {item.frequency}
                          </Typography>
                        </Box>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchRouteSearch(item)}
                        aria-label={`Search flights from ${item.fromCode} to ${item.code}`}
                        className="flyjatt-touch-btn"
                        style={{
                          flexShrink: 0,
                          minWidth: "44px",
                          minHeight: "44px",
                          padding: "0 12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(11, 74, 130, 0.22)",
                          backgroundColor: "#ffffff",
                          color: "#0b4a82",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Go
                        <ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} />
                      </button>
                    </Box>
                  );
                })}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default TopDestination;
