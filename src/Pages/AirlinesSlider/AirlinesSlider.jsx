import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import { Box, Chip, IconButton, Stack, Typography } from "@mui/material";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import commaNumber from "comma-number";

const AirlinesSlider = ({ uniqueCarriers, selectedAirlins, handleAirLine }) => {
  const carriers = Array.isArray(uniqueCarriers) ? uniqueCarriers : [];
  const selectedAirlineCodes = Array.isArray(selectedAirlins)
    ? selectedAirlins
    : [];
  const [failedLogos, setFailedLogos] = useState({});
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const sliderRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const resolveSlidesToShow = (width, count) => {
    const safeCount = Math.max(1, count || 0);
    if (width <= 520) return Math.min(1, safeCount);
    if (width <= 760) return Math.min(2, safeCount);
    if (width <= 1080) return Math.min(3, safeCount);
    return Math.min(4, safeCount);
  };

  const slidesToShow = useMemo(
    () => resolveSlidesToShow(viewportWidth, carriers.length),
    [viewportWidth, carriers.length]
  );
  const canSlide = carriers.length > slidesToShow;

  useEffect(() => {
    if (!sliderRef.current) return;
    sliderRef.current.slickGoTo(0, true);
  }, [carriers.length, slidesToShow]);

  useEffect(() => {
    setFailedLogos({});
  }, [carriers]);

  const formatCarrierPrice = (item) => {
    const priceText = commaNumber(Number(item?.price || 0));
    const currencyCode = String(item?.currencyCode || "").trim();
    const currencySymbol = String(item?.currencySymbol || "").trim();
    if (currencySymbol && currencyCode && currencySymbol !== currencyCode) {
      return `${currencySymbol}${priceText}`;
    }
    if (currencyCode) {
      return `${currencyCode} ${priceText}`;
    }
    return priceText;
  };

  const getCarrierBadgeText = (displayName, code) => {
    const cleanedCode = String(code || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
    if (cleanedCode.length >= 2) {
      return cleanedCode.slice(0, 2);
    }

    const words = String(displayName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    if (words.length === 1 && words[0].length > 0) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return "AR";
  };

  const settings = {
    dots: false,
    infinite: canSlide,
    speed: 450,
    slidesToShow,
    slidesToScroll: 1,
    swipeToSlide: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1080,
        settings: {
          slidesToShow: Math.min(3, Math.max(1, carriers.length)),
        },
      },
      {
        breakpoint: 760,
        settings: {
          slidesToShow: Math.min(2, Math.max(1, carriers.length)),
        },
      },
      {
        breakpoint: 520,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        ".slick-slide > div": {
          margin: "0 7px",
        },
        ".slick-list": {
          margin: "0 -7px",
          py: 0.5,
        },
      }}
    >
      <Box
        sx={{
          border: "1px solid rgba(0,154,214,0.18)",
          borderRadius: "14px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
          boxShadow: "0 10px 24px rgba(15, 39, 69, 0.09)",
          px: 1,
          py: 0.6,
        }}
      >
        <Slider key={`${carriers.length}-${slidesToShow}`} ref={sliderRef} {...settings}>
          {carriers.map((item, index) => {
            const rawCode = String(item?.code || "").trim();
            const normalizedCode = rawCode.toUpperCase();
            const selectionCode = normalizedCode || rawCode;
            const isSelected =
              selectedAirlineCodes.includes(selectionCode) ||
              selectedAirlineCodes.includes(rawCode);
            const logoUrl = normalizedCode
              ? `https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${normalizedCode}.png`
              : "";
            const displayName = String(
              item?.name || selectionCode || `Airline ${index + 1}`
            ).trim();
            const isLogoFailed = Boolean(failedLogos[selectionCode]);
            const badgeText = getCarrierBadgeText(displayName, selectionCode);

            return (
              <Box key={`${selectionCode || "air"}-${index}`}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    if (selectionCode) {
                      handleAirLine(selectionCode);
                    }
                  }}
                  sx={{
                    width: "100%",
                    border: isSelected
                      ? "1px solid var(--primary-button)"
                      : "1px solid #DCE6F3",
                    borderRadius: "12px",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(0,154,214,0.14), rgba(0,154,214,0.05))"
                      : "#FFFFFF",
                    px: 1.1,
                    py: 0.9,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected
                      ? "0 10px 20px rgba(0,154,214,0.18)"
                      : "0 4px 12px rgba(15,39,69,0.06)",
                    "&:hover": {
                      borderColor: "var(--primary-button)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        border: "1px solid #D4E2F2",
                        backgroundColor: "#FFFFFF",
                        p: "3px",
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {logoUrl && !isLogoFailed ? (
                        <img
                          src={logoUrl}
                          alt={`${displayName} logo`}
                          onError={() =>
                            setFailedLogos((prev) => ({ ...prev, [selectionCode]: true }))
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#48617D",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {badgeText}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#1B3350",
                          lineHeight: 1.2,
                        }}
                        noWrap
                      >
                        {displayName}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.25,
                          fontSize: 11,
                          color: "#587089",
                          fontWeight: 600,
                          lineHeight: 1.1,
                        }}
                        noWrap
                      >
                        {formatCarrierPrice(item)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    size="small"
                    icon={
                      isSelected ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: "14px !important" }} />
                      ) : undefined
                    }
                    label={isSelected ? "Selected" : selectionCode || "Airline"}
                    sx={{
                      height: "24px",
                      borderRadius: "999px",
                      backgroundColor: isSelected ? "var(--primary-button)" : "#EEF4FC",
                      color: isSelected ? "#FFFFFF" : "#37506B",
                      fontWeight: 700,
                      fontSize: "10px",
                      flexShrink: 0,
                      "& .MuiChip-icon": {
                        color: "#FFFFFF",
                      },
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Slider>
      </Box>

      {canSlide && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <IconButton
            onClick={() => sliderRef.current?.slickPrev()}
            aria-label="Previous airlines"
            sx={{
              pointerEvents: "auto",
              position: "absolute",
              left: -12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 30,
              height: 30,
              bgcolor: "#FFFFFF",
              border: "1px solid #D7E4F4",
              boxShadow: "0 8px 18px rgba(15,39,69,0.14)",
              "&:hover": {
                bgcolor: "#FFFFFF",
              },
            }}
          >
            <ArrowForwardIosRoundedIcon sx={{ transform: "rotate(180deg)", fontSize: 14 }} />
          </IconButton>

          <IconButton
            onClick={() => sliderRef.current?.slickNext()}
            aria-label="Next airlines"
            sx={{
              pointerEvents: "auto",
              position: "absolute",
              right: -12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 30,
              height: 30,
              bgcolor: "#FFFFFF",
              border: "1px solid #D7E4F4",
              boxShadow: "0 8px 18px rgba(15,39,69,0.14)",
              "&:hover": {
                bgcolor: "#FFFFFF",
              },
            }}
          >
            <ArrowForwardIosRoundedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default AirlinesSlider;
