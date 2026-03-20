import React, { useRef } from "react";
import { Box, Container, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import Slider from "react-slick";

const PartnerAirlines = () => {
  const sliderRef = useRef(null);

  const airlines = [
    { code: "EK", name: "Emirates", meta: "Dubai hub network" },
    { code: "QR", name: "Qatar Airways", meta: "Doha global connections" },
    { code: "SQ", name: "Singapore Airlines", meta: "Premium cabin routes" },
    { code: "TK", name: "Turkish Airlines", meta: "Europe bridge access" },
    { code: "MH", name: "Malaysia Airlines", meta: "SEA-friendly timings" },
    { code: "BG", name: "Biman Bangladesh", meta: "Strong local coverage" },
    { code: "BA", name: "British Airways", meta: "UK direct options" },
    { code: "TG", name: "Thai Airways", meta: "Bangkok connector" },
    { code: "SV", name: "Saudia", meta: "Middle East inventory" },
    { code: "WY", name: "Oman Air", meta: "Transit smart fares" },
  ];

  const settings = {
    dots: false,
    infinite: airlines.length > 5,
    speed: 520,
    autoplay: true,
    autoplaySpeed: 2300,
    pauseOnHover: true,
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 4 } },
      { breakpoint: 980, settings: { slidesToShow: 3 } },
      { breakpoint: 700, settings: { slidesToShow: 2 } },
      { breakpoint: 520, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <Box sx={{ py: { xs: 3, md: 3.8 }, background: "#ffffff" }}>
      <Container>
        <Box
          sx={{
            borderRadius: "24px",
            border: "1px solid rgba(0,154,214,0.18)",
            background:
              "linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(246,250,255,0.95) 100%)",
            p: { xs: 1.5, md: 2 },
            boxShadow: "0 14px 34px rgba(14, 34, 56, 0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                color: "var(--flight-color)",
                fontSize: { xs: "16px", md: "20px" },
                fontWeight: 800,
                letterSpacing: "0.01em",
              }}
            >
              Partner Airlines
            </Typography>

            <Box sx={{ display: "flex", gap: 0.7 }}>
              <Box
                component="button"
                type="button"
                onClick={() => sliderRef.current?.slickPrev?.()}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  border: "1px solid rgba(0,154,214,0.24)",
                  background: "white",
                  color: "var(--primary-color)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(0,154,214,0.1)",
                    borderColor: "var(--primary-color)",
                  },
                }}
              >
                <ArrowBackRoundedIcon sx={{ fontSize: "18px" }} />
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => sliderRef.current?.slickNext?.()}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  border: "1px solid rgba(0,154,214,0.24)",
                  background: "white",
                  color: "var(--primary-color)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(0,154,214,0.1)",
                    borderColor: "var(--primary-color)",
                  },
                }}
              >
                <ArrowForwardRoundedIcon sx={{ fontSize: "18px" }} />
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              "& .slick-list": { margin: "0 -6px", overflow: "hidden" },
              "& .slick-slide > div": { padding: "0 6px" },
              "& .slick-track": { display: "flex" },
              "& .slick-slide": { height: "inherit" },
            }}
          >
            <Slider ref={sliderRef} {...settings}>
              {airlines.map((airline) => (
                <Box key={airline.code} sx={{ height: "100%" }}>
                  <Box
                    sx={{
                      height: 88,
                      borderRadius: "14px",
                      border: "1px solid rgba(0,154,214,0.16)",
                      background: "#ffffff",
                      px: 1.2,
                      py: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.1,
                      transition: "all 0.22s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 10px 22px rgba(0,122,175,0.16)",
                        borderColor: "var(--primary-color)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "12px",
                        border: "1px solid rgba(0,154,214,0.2)",
                        background: "rgba(0,154,214,0.08)",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        component="img"
                        src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${airline.code}.png`}
                        alt={airline.name}
                        sx={{ width: 26, height: 26, objectFit: "contain" }}
                      />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "var(--flight-color)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.25,
                        }}
                      >
                        {airline.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          color: "var(--text-color)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          mt: 0.35,
                        }}
                      >
                        {airline.meta}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Slider>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PartnerAirlines;
