import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { addDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { TOP_DESTINATION_CITY_IMAGES } from "../../data/topDestinationCities";
import dealFallback1 from "../../asstes/img/hotDeals/img1.webp";
import dealFallback2 from "../../asstes/img/hotDeals/img2.jpeg";
import dealFallback3 from "../../asstes/img/hotDeals/img4.webp";
import { saveRecentSearch } from "../../utils/recentSearches";

const LOCAL_DEAL_FALLBACKS = [dealFallback1, dealFallback2, dealFallback3];

const HOT_DEALS_DATA = [
  {
    id: "deal-dubai-saver",
    category: "Flight",
    tag: "GDS Exclusive",
    promoCode: "FLYDXB12",
    title: "Save Up to 12% on Dubai Round Trips",
    description:
      "Reduced base fares with complimentary 30kg checked baggage on selected Gulf carriers.",
    validity: "Valid on departures within the next 60 days",
    fromCode: "DAC",
    toCode: "DXB",
    fromName: "Dhaka, Bangladesh",
    toName: "Dubai, UAE",
    tripType: "roundway",
    image:
      TOP_DESTINATION_CITY_IMAGES?.DXB ||
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "deal-domestic-cox",
    category: "Domestic",
    tag: "Weekend Escape",
    promoCode: "COXFLY10",
    title: "Cox's Bazar Quick-Turn Domestic Deals",
    description:
      "Morning and evening non-stop departures with instant e-ticket generation.",
    validity: "Instant confirmation via Travelport workbench",
    fromCode: "DAC",
    toCode: "CXB",
    fromName: "Dhaka, Bangladesh",
    toName: "Cox's Bazar, Bangladesh",
    tripType: "oneway",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "deal-london-flex",
    category: "International",
    tag: "Branded Flex",
    promoCode: "LONFLEX8",
    title: "London & Europe Multi-City Flex Fares",
    description:
      "Compare Economy Basic vs Economy Flex seat rules and lower change fees.",
    validity: "Combinable outbound and inbound fare brands",
    fromCode: "DAC",
    toCode: "LHR",
    fromName: "Dhaka, Bangladesh",
    toName: "London, UK",
    tripType: "roundway",
    image:
      TOP_DESTINATION_CITY_IMAGES?.LHR ||
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "deal-singapore-city",
    category: "Tour",
    tag: "Stopover Pick",
    promoCode: "SINPORT5",
    title: "Singapore City Stopover & Return Specials",
    description:
      "Smooth Changi transfers with real-time seat selection prior to PNR issuance.",
    validity: "Applies on single-carrier itineraries",
    fromCode: "DAC",
    toCode: "SIN",
    fromName: "Dhaka, Bangladesh",
    toName: "Singapore",
    tripType: "roundway",
    image:
      TOP_DESTINATION_CITY_IMAGES?.SIN ||
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "deal-kul-klia",
    category: "Hotel",
    tag: "Bundle Friendly",
    promoCode: "KULSTAY9",
    title: "Kuala Lumpur Flight + Gateway Special",
    description:
      "Consistent daily frequencies ideal for quick business and leisure breaks.",
    validity: "Includes complimentary seat eligibility preview",
    fromCode: "DAC",
    toCode: "KUL",
    fromName: "Dhaka, Bangladesh",
    toName: "Kuala Lumpur, Malaysia",
    tripType: "roundway",
    image:
      TOP_DESTINATION_CITY_IMAGES?.KUL ||
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=900&q=80",
  },
];

const CATEGORIES = ["All", "Flight", "Domestic", "International", "Hotel", "Tour"];

const resolveAssetSrc = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.src === "string") return value.src;
  return "";
};

const HotDeals = () => {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [failedImages, setFailedImages] = useState({});
  const [activeDealModal, setActiveDealModal] = useState(null);

  const visibleDeals = useMemo(() => {
    if (selectedCategory === "All") return HOT_DEALS_DATA;
    return HOT_DEALS_DATA.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const scrollTrack = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const distance = Math.max(280, Math.round(el.clientWidth * 0.72)) * direction;
    el.scrollBy({
      left: distance,
      behavior:
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
          ? "auto"
          : "smooth",
    });
  };

  const launchDealSearch = (deal) => {
    const depObj = addDays(new Date(), 14);
    const retObj = addDays(new Date(), 21);
    const depIso = format(depObj, "yyyy-MM-dd");
    const retIso = format(retObj, "yyyy-MM-dd");
    const isRoundTrip = deal.tripType === "roundway";

    const segments = isRoundTrip
      ? [
          {
            depfrom: deal.fromCode,
            arrto: deal.toCode,
            depdate: depIso,
            depFromText: `${deal.fromName} (${deal.fromCode})`,
            arrToText: `${deal.toName} (${deal.toCode})`,
          },
          {
            depfrom: deal.toCode,
            arrto: deal.fromCode,
            depdate: retIso,
            depFromText: `${deal.toName} (${deal.toCode})`,
            arrToText: `${deal.fromName} (${deal.fromCode})`,
          },
        ]
      : [
          {
            depfrom: deal.fromCode,
            arrto: deal.toCode,
            depdate: depIso,
            depFromText: `${deal.fromName} (${deal.fromCode})`,
            arrToText: `${deal.toName} (${deal.toCode})`,
          },
        ];

    saveRecentSearch({
      tripType: isRoundTrip ? "roundway" : "oneway",
      fromCode: deal.fromCode,
      toCode: deal.toCode,
      fromLabel: `${deal.fromName} (${deal.fromCode})`,
      toLabel: `${deal.toName} (${deal.toCode})`,
      fromAddress: deal.fromName,
      toAddress: deal.toName,
      departureDate: depIso,
      ...(isRoundTrip ? { returnDate: retIso } : {}),
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      cabinClass: "1",
      segments,
    });

    navigate("/offers", {
      state: {
        faddress: deal.fromName,
        toAddress: deal.toName,
        fromSearchText: `${deal.fromName} (${deal.fromCode})`,
        toSearchText: `${deal.toName} (${deal.toCode})`,
        departureDate: format(depObj, "dd MMM yy"),
        arrivalDate: format(retObj, "dd MMM yy"),
        adultCount: 1,
        childCount: 0,
        infant: 0,
        tripType: isRoundTrip ? "roundway" : "oneway",
        fromSendData: deal.fromCode,
        toSendData: deal.toCode,
        className: "1",
        result: 1,
        valueBox: isRoundTrip ? "roundway" : "oneway",
        searchData: { segments },
      },
    });
  };

  const handleCopyPromo = async (code) => {
    try {
      await navigator.clipboard?.writeText(code);
      toast.success(`Promo code ${code} copied`);
    } catch {
      toast.info(`Use promo code: ${code}`);
    }
  };

  return (
    <Box
      component="section"
      aria-labelledby="hot-deals-heading"
      sx={{ py: { xs: 4, md: 5.5 } }}
    >
      <Container maxWidth="xl">
        <Box
          role="region"
          aria-roledescription="carousel"
          aria-label="Trending flight offers and promo deals"
          className="flyjatt-cq"
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Chip
                icon={<LocalOfferRoundedIcon sx={{ fontSize: 15 }} />}
                label="Verified Fare Picks"
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
                id="hot-deals-heading"
                component="h2"
                className="flyjatt-section-title"
              >
                Hot Deals &amp; Promo Corridors
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategory(category)}
                    className="flyjatt-touch-btn"
                    style={{
                      minHeight: "40px",
                      padding: "0 14px",
                      borderRadius: "999px",
                      border: active
                        ? "1px solid #0b4a82"
                        : "1px solid rgba(15, 39, 69, 0.14)",
                      background: active
                        ? "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)"
                        : "#ffffff",
                      color: active ? "#ffffff" : "#1e293b",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                    }}
                  >
                    {category}
                  </button>
                );
              })}

              <Box sx={{ display: "inline-flex", gap: 0.75, ml: 0.5 }}>
                <IconButton
                  type="button"
                  aria-label="Scroll deals backward"
                  onClick={() => scrollTrack(-1)}
                  className="flyjatt-touch-btn"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    border: "1px solid rgba(15, 39, 69, 0.14)",
                    bgcolor: "#ffffff",
                    color: "#0b2447",
                  }}
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  type="button"
                  aria-label="Scroll deals forward"
                  onClick={() => scrollTrack(1)}
                  className="flyjatt-touch-btn"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    border: "1px solid rgba(15, 39, 69, 0.14)",
                    bgcolor: "#ffffff",
                    color: "#0b2447",
                  }}
                >
                  <ArrowForwardRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>

          <Box
            ref={trackRef}
            className="flyjatt-snap-track flyjatt-deals-track"
            sx={{ pb: 1 }}
          >
            {visibleDeals.map((deal, idx) => {
              const fallbackSrc = resolveAssetSrc(
                LOCAL_DEAL_FALLBACKS[idx % LOCAL_DEAL_FALLBACKS.length]
              );
              const imgSrc = failedImages[deal.id]
                ? fallbackSrc
                : resolveAssetSrc(deal.image) || fallbackSrc;

              return (
                <Box
                  key={deal.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${visibleDeals.length}: ${deal.title}`}
                  className="flyjatt-snap-slide flyjatt-deals-grid"
                  sx={{
                    borderRadius: "20px",
                    overflow: "hidden",
                    bgcolor: "#ffffff",
                    border: "1px solid rgba(15, 39, 69, 0.09)",
                    boxShadow: "0 14px 32px rgba(15, 39, 69, 0.07)",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      aspectRatio: "16 / 10",
                      bgcolor: "#0b2447",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={deal.title}
                      width={480}
                      height={300}
                      loading="lazy"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [deal.id]: true }))
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
                        insetBlockStart: 12,
                        insetInline: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Chip
                        size="small"
                        label={deal.tag}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.94)",
                          color: "#0b2447",
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        size="small"
                        label={`Code: ${deal.promoCode}`}
                        sx={{
                          bgcolor: "rgba(6,28,57,0.84)",
                          color: "#ffffff",
                          fontWeight: 800,
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ p: 2.2, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        color: "#0077b6",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {deal.fromCode} -&gt; {deal.toCode} •{" "}
                      {deal.tripType === "roundway" ? "Round Trip" : "One Way"}
                    </Typography>
                    <Typography
                      component="h3"
                      sx={{
                        mt: 0.6,
                        fontWeight: 800,
                        fontSize: "1.06rem",
                        color: "#0b2447",
                        lineHeight: 1.3,
                      }}
                    >
                      {deal.title}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.9,
                        color: "#475569",
                        fontSize: "0.87rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {deal.description}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      px: 2.2,
                      pb: 2.2,
                      pt: 1.2,
                      borderTop: "1px solid rgba(15, 39, 69, 0.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDealModal(deal)}
                      className="flyjatt-touch-btn flyjatt-focus-ring"
                      style={{
                        minHeight: "44px",
                        padding: "0 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(15, 39, 69, 0.16)",
                        backgroundColor: "#ffffff",
                        color: "#0b2447",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      Deal Details
                    </button>

                    <button
                      type="button"
                      onClick={() => launchDealSearch(deal)}
                      className="flyjatt-touch-btn"
                      style={{
                        minHeight: "44px",
                        padding: "0 16px",
                        borderRadius: "10px",
                        border: "none",
                        background:
                          "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.84rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      See Deal
                      <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
                    </button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Container>

      <Dialog
        open={Boolean(activeDealModal)}
        onClose={() => setActiveDealModal(null)}
        maxWidth="xs"
        fullWidth
      >
        {activeDealModal ? (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: "#0b2447" }}>
              {activeDealModal.title}
            </DialogTitle>
            <DialogContent dividers>
              <Typography sx={{ color: "#334155", fontSize: "0.94rem", mb: 2 }}>
                {activeDealModal.description}
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: "#f0f8ff",
                  border: "1px dashed #0082c4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: "0.72rem", color: "#0369a1", fontWeight: 700 }}>
                    PROMO CODE
                  </Typography>
                  <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: "#0b2447" }}>
                    {activeDealModal.promoCode}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<ContentCopyRoundedIcon />}
                  onClick={() => handleCopyPromo(activeDealModal.promoCode)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Copy
                </Button>
              </Box>
              <Typography sx={{ mt: 1.5, fontSize: "0.82rem", color: "#64748b" }}>
                {activeDealModal.validity}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button onClick={() => setActiveDealModal(null)} sx={{ textTransform: "none" }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  const chosen = activeDealModal;
                  setActiveDealModal(null);
                  launchDealSearch(chosen);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#0b4a82",
                  "&:hover": { bgcolor: "#083a66" },
                }}
              >
                Search Corridor Fares
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
};

export default HotDeals;
