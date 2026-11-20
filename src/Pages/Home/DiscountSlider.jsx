import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Chip, Container, IconButton, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { addDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import sliderFallback1 from "../../asstes/img/discountsSlider/slider1.png";
import sliderFallback2 from "../../asstes/img/discountsSlider/slider2.png";
import sliderFallback3 from "../../asstes/img/discountsSlider/sliderimg5.webp";
import { saveRecentSearch } from "../../utils/recentSearches";

const LOCAL_SLIDER_IMAGES = [sliderFallback1, sliderFallback2, sliderFallback3];

const DEFAULT_PROMO_SLIDES = [
  {
    id: "promo-dac-dxb",
    badge: "Flash Fare",
    title: "Up to 18% Off Middle East Gateways",
    subtitle: "Flexible rebooking & generous baggage on Dubai and Doha departures.",
    routeLabel: "DAC -> DXB",
    fromCode: "DAC",
    toCode: "DXB",
    fromName: "Dhaka, Bangladesh",
    toName: "Dubai, UAE",
    image: sliderFallback1,
  },
  {
    id: "promo-dac-kul",
    badge: "Southeast Asia",
    title: "Explore Kuala Lumpur & Bangkok",
    subtitle: "Compare branded Economy Light and Flex tariffs side by side.",
    routeLabel: "DAC -> KUL",
    fromCode: "DAC",
    toCode: "KUL",
    fromName: "Dhaka, Bangladesh",
    toName: "Kuala Lumpur, Malaysia",
    image: sliderFallback2,
  },
  {
    id: "promo-dac-lhr",
    badge: "Long-Haul Cabin",
    title: "Premium Cabin Upgrades to Europe",
    subtitle: "Interactive seat maps, meal requests & transparent fare rules before commit.",
    routeLabel: "DAC -> LHR",
    fromCode: "DAC",
    toCode: "LHR",
    fromName: "Dhaka, Bangladesh",
    toName: "London, UK",
    image: sliderFallback3,
  },
  {
    id: "promo-dac-sin",
    badge: "City Escape",
    title: "Singapore Direct & One-Stop Fares",
    subtitle: "Instant GDS PNR hold with transparent tax breakdown per traveler.",
    routeLabel: "DAC -> SIN",
    fromCode: "DAC",
    toCode: "SIN",
    fromName: "Dhaka, Bangladesh",
    toName: "Singapore",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=80",
  },
];

const resolveAssetSrc = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.src === "string") return value.src;
  return "";
};

const DiscountSlider = ({ data }) => {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const slides = useMemo(() => {
    const apiImages = Array.isArray(data?.sliderimage) ? data.sliderimage : [];
    if (!apiImages.length) return DEFAULT_PROMO_SLIDES;

    const mappedApi = apiImages
      .map((entry, idx) => {
        const rawSrc =
          typeof entry === "string"
            ? entry
            : entry?.image || entry?.url || entry?.src || "";
        const preset = DEFAULT_PROMO_SLIDES[idx % DEFAULT_PROMO_SLIDES.length];
        return {
          ...preset,
          id: entry?.id || `api-slide-${idx}`,
          title: entry?.title || preset.title,
          subtitle: entry?.subtitle || preset.subtitle,
          badge: entry?.badge || preset.badge,
          image: rawSrc || preset.image,
        };
      })
      .filter((item) => Boolean(item.image));

    return mappedApi.length > 0 ? mappedApi : DEFAULT_PROMO_SLIDES;
  }, [data]);

  const scrollToSlide = useCallback(
    (targetIndex) => {
      const container = trackRef.current;
      if (!container) return;
      const safeIndex = Math.max(0, Math.min(slides.length - 1, targetIndex));
      const slideNodes = container.querySelectorAll("[data-carousel-slide]");
      const targetNode = slideNodes[safeIndex];
      if (targetNode) {
        container.scrollTo({
          left: targetNode.offsetLeft,
          behavior:
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
              ? "auto"
              : "smooth",
        });
      }
      setActiveIndex(safeIndex);
    },
    [slides.length]
  );

  useEffect(() => {
    const container = trackRef.current;
    if (!container) return undefined;

    let rafId = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const slideNodes = Array.from(
          container.querySelectorAll("[data-carousel-slide]")
        );
        if (!slideNodes.length) return;
        const scrollLeft = container.scrollLeft;
        let closestIdx = 0;
        let closestDist = Number.POSITIVE_INFINITY;
        slideNodes.forEach((node, idx) => {
          const dist = Math.abs(node.offsetLeft - scrollLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = idx;
          }
        });
        setActiveIndex(closestIdx);
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [slides.length]);

  const handlePromoSearch = (slide) => {
    const depDateObj = addDays(new Date(), 14);
    const depDateIso = format(depDateObj, "yyyy-MM-dd");
    const formattedDepartureDate = format(depDateObj, "dd MMM yy");

    saveRecentSearch({
      tripType: "oneway",
      fromCode: slide.fromCode,
      toCode: slide.toCode,
      fromLabel: `${slide.fromName} (${slide.fromCode})`,
      toLabel: `${slide.toName} (${slide.toCode})`,
      fromAddress: slide.fromName,
      toAddress: slide.toName,
      departureDate: depDateIso,
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      cabinClass: "1",
      segments: [
        {
          depfrom: slide.fromCode,
          arrto: slide.toCode,
          depdate: depDateIso,
          depFromText: `${slide.fromName} (${slide.fromCode})`,
          arrToText: `${slide.toName} (${slide.toCode})`,
        },
      ],
    });

    navigate("/offers", {
      state: {
        faddress: slide.fromName,
        toAddress: slide.toName,
        fromSearchText: `${slide.fromName} (${slide.fromCode})`,
        toSearchText: `${slide.toName} (${slide.toCode})`,
        departureDate: formattedDepartureDate,
        adultCount: 1,
        childCount: 0,
        infant: 0,
        tripType: "oneway",
        fromSendData: slide.fromCode,
        toSendData: slide.toCode,
        className: "1",
        result: 1,
        valueBox: "oneway",
        searchData: {
          segments: [
            {
              depfrom: slide.fromCode,
              arrto: slide.toCode,
              depdate: depDateIso,
              depFromText: `${slide.fromName} (${slide.fromCode})`,
              arrToText: `${slide.toName} (${slide.toCode})`,
            },
          ],
        },
      },
    });
  };

  return (
    <Box
      component="section"
      aria-labelledby="featured-promotions-heading"
      sx={{ py: { xs: 4, md: 5.5 } }}
    >
      <Container maxWidth="xl">
        <Box
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured promotions and travel offers"
          className="flyjatt-cq"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "flex-end" },
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Chip
                icon={<LocalOfferRoundedIcon sx={{ fontSize: 15 }} />}
                label="Curated Travel Savings"
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
                id="featured-promotions-heading"
                component="h2"
                className="flyjatt-section-title"
              >
                Seasonal Highlights &amp; Fare Specials
              </Typography>
              <Typography sx={{ color: "#475569", fontSize: "0.95rem", mt: 0.5 }}>
                Explore hand-picked corridors with instant seat selection and transparent fare rules.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                type="button"
                aria-label="Previous promotion"
                onClick={() =>
                  scrollToSlide(activeIndex === 0 ? slides.length - 1 : activeIndex - 1)
                }
                className="flyjatt-touch-btn"
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                  border: "1px solid rgba(15, 39, 69, 0.16)",
                  bgcolor: "#ffffff",
                  color: "#0b2447",
                  "&:hover:not(:disabled)": {
                    bgcolor: "#f0f7ff",
                    borderColor: "#0082c4",
                  },
                }}
              >
                <ArrowBackRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                type="button"
                aria-label="Next promotion"
                onClick={() => scrollToSlide((activeIndex + 1) % slides.length)}
                className="flyjatt-touch-btn"
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                  border: "1px solid rgba(15, 39, 69, 0.16)",
                  bgcolor: "#ffffff",
                  color: "#0b2447",
                  "&:hover:not(:disabled)": {
                    bgcolor: "#f0f7ff",
                    borderColor: "#0082c4",
                  },
                }}
              >
                <ArrowForwardRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Box
            ref={trackRef}
            className="flyjatt-snap-track flyjatt-promo-track"
            sx={{ pb: 1 }}
          >
            {slides.map((slide, index) => {
              const fallbackSrc = resolveAssetSrc(
                LOCAL_SLIDER_IMAGES[index % LOCAL_SLIDER_IMAGES.length]
              );
              const primarySrc = failedImages[slide.id]
                ? fallbackSrc
                : resolveAssetSrc(slide.image) || fallbackSrc;

              return (
                <Box
                  key={slide.id}
                  data-carousel-slide
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
                  className="flyjatt-snap-slide"
                  sx={{
                    borderRadius: "18px",
                    overflow: "hidden",
                    bgcolor: "#ffffff",
                    border: "1px solid rgba(15, 39, 69, 0.08)",
                    boxShadow: "0 12px 30px rgba(15, 39, 69, 0.07)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      aspectRatio: "16 / 9",
                      bgcolor: "#0b2447",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={primarySrc}
                      alt={slide.title}
                      width={640}
                      height={360}
                      loading="lazy"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [slide.id]: true }))
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
                          "linear-gradient(180deg, rgba(6,28,57,0.08) 0%, rgba(6,28,57,0.78) 100%)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        p: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Chip
                          size="small"
                          label={slide.badge}
                          sx={{
                            bgcolor: "rgba(255,255,255,0.92)",
                            color: "#061c39",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        />
                        <Chip
                          size="small"
                          label={slide.routeLabel}
                          sx={{
                            bgcolor: "rgba(6,28,57,0.78)",
                            color: "#ffffff",
                            border: "1px solid rgba(255,255,255,0.28)",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        />
                      </Box>

                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          component="h3"
                          sx={{
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "1.08rem",
                            lineHeight: 1.25,
                          }}
                        >
                          {slide.title}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      flex: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#475569",
                        fontSize: "0.86rem",
                        lineHeight: 1.45,
                        minWidth: 0,
                      }}
                    >
                      {slide.subtitle}
                    </Typography>
                    <button
                      type="button"
                      onClick={() => handlePromoSearch(slide)}
                      className="flyjatt-touch-btn"
                      aria-label={`Search ${slide.title}`}
                      style={{
                        flexShrink: 0,
                        minWidth: "44px",
                        minHeight: "44px",
                        padding: "0 14px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Explore
                      <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
                    </button>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              mt: 2,
            }}
          >
            {slides.map((slide, idx) => {
              const selected = idx === activeIndex;
              return (
                <button
                  key={`dot-${slide.id}`}
                  type="button"
                  aria-label={`Go to promotion slide ${idx + 1}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => scrollToSlide(idx)}
                  className="flyjatt-touch-btn flyjatt-focus-ring"
                  style={{
                    width: selected ? "28px" : "10px",
                    height: "10px",
                    borderRadius: "999px",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    backgroundColor: selected ? "#0082c4" : "rgba(15, 39, 69, 0.2)",
                  }}
                />
              );
            })}
            <span
              className="sr-only"
              aria-live="polite"
            >{`Showing promotion ${activeIndex + 1} of ${slides.length}`}</span>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default DiscountSlider;
