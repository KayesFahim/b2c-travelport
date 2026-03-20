import { Box, Container, Typography } from "@mui/material";
import React, { useMemo, useRef, useState } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import SouthEastRoundedIcon from "@mui/icons-material/SouthEastRounded";
import Slider from "react-slick";
import { TOP_DESTINATION_CITY_IMAGES } from "../../data/topDestinationCities";

const chepestImage = TOP_DESTINATION_CITY_IMAGES.Bangkok;
const dubaiImage = TOP_DESTINATION_CITY_IMAGES.Dubai;
const groupImage = TOP_DESTINATION_CITY_IMAGES["Kuala Lumpur"];
const hotelImage = TOP_DESTINATION_CITY_IMAGES.Singapore;
const malaysiaImage = TOP_DESTINATION_CITY_IMAGES["Kuala Lumpur"];
const bangkokImage = TOP_DESTINATION_CITY_IMAGES.Bangkok;
const singaporeImage = TOP_DESTINATION_CITY_IMAGES.Singapore;
const istanbulImage = TOP_DESTINATION_CITY_IMAGES.Istanbul;
const beachImage = TOP_DESTINATION_CITY_IMAGES.Bangkok;
const cityImage = TOP_DESTINATION_CITY_IMAGES.Istanbul;

const HotDeals = () => {
  const dealCollections = useMemo(
    () => ({
      all: [
        {
          category: "Flight",
          title: "Dubai city break saver",
          route: "Dhaka to Dubai",
          description:
            "Short-haul premium inventory with flexible weekday departures and stronger bag allowance.",
          price: "BDT 45,900",
          tag: "Flash airfare",
          meta: "Travel window: Mar to May",
          image: dubaiImage,
        },
        {
          category: "Group Fare",
          title: "Kuala Lumpur corporate block",
          route: "12 seats together",
          description:
            "Locked group inventory for team travel, student movement, and conference bookings.",
          price: "BDT 28,400",
          tag: "Best for groups",
          meta: "Held for 72 hours",
          image: malaysiaImage,
        },
        {
          category: "Hotel",
          title: "Singapore skyline weekend",
          route: "4-star stay + breakfast",
          description:
            "Downtown properties with airport access and faster check-in for short city itineraries.",
          price: "BDT 16,800",
          tag: "Stay package",
          meta: "Free date change",
          image: hotelImage,
        },
        {
          category: "Tour",
          title: "Phuket beach recharge",
          route: "3 nights curated leisure",
          description:
            "Popular island package with airport transfer, resort stay, and add-on excursion slots.",
          price: "BDT 34,200",
          tag: "Leisure pick",
          meta: "Couple friendly",
          image: beachImage,
        },
      ],
      flight: [
        {
          category: "Flight",
          title: "Cheapest flight deals",
          route: "Dhaka to Bangkok",
          description:
            "High-frequency departures with fast turnaround times for shoppers and quick escapes.",
          price: "BDT 27,800",
          tag: "High demand",
          meta: "Updated every day",
          image: chepestImage,
        },
        {
          category: "Flight",
          title: "Dubai after-hours fare",
          route: "Dhaka to Dubai",
          description:
            "Late-night departures built for better onward connections and smoother transit windows.",
          price: "BDT 45,900",
          tag: "Evening departures",
          meta: "Flexible baggage options",
          image: dubaiImage,
        },
        {
          category: "Flight",
          title: "Singapore premium economy watch",
          route: "Dhaka to Singapore",
          description:
            "Best current fare band for travelers comparing cabin comfort against business-heavy routes.",
          price: "BDT 51,500",
          tag: "Cabin upgrade value",
          meta: "Strong lounge access",
          image: singaporeImage,
        },
        {
          category: "Flight",
          title: "Istanbul long-haul connector",
          route: "Dhaka to Istanbul",
          description:
            "Useful gateway pricing for Europe-bound passengers who want a single-stop itinerary.",
          price: "BDT 63,200",
          tag: "Europe access",
          meta: "One-ticket connection",
          image: istanbulImage,
        },
      ],
      groupFare: [
        {
          category: "Group Fare",
          title: "Student movement special",
          route: "10 to 20 passengers",
          description:
            "Locked blocks for education travel with faster name submission and simpler fare control.",
          price: "BDT 29,900",
          tag: "Campus travel",
          meta: "Seat hold available",
          image: groupImage,
        },
        {
          category: "Group Fare",
          title: "Corporate summit bundle",
          route: "Singapore and Kuala Lumpur",
          description:
            "Built for team movement with aligned schedules and cleaner arrival windows for events.",
          price: "BDT 31,500",
          tag: "Business group",
          meta: "Shared itinerary support",
          image: malaysiaImage,
        },
        {
          category: "Group Fare",
          title: "Family celebration block",
          route: "Dhaka to Dubai",
          description:
            "Better value for multi-family departures traveling together during busy holiday demand.",
          price: "BDT 43,800",
          tag: "Holiday crowd",
          meta: "Priority seat pairing",
          image: dubaiImage,
        },
        {
          category: "Group Fare",
          title: "Pilgrim support fare",
          route: "Managed fare window",
          description:
            "Useful for faith travel and community movements that need predictable inventory and baggage.",
          price: "BDT 39,600",
          tag: "Community booking",
          meta: "Assisted ticketing",
          image: cityImage,
        },
      ],
      hotel: [
        {
          category: "Hotel",
          title: "Marina-view city stay",
          route: "Dubai 4-star collection",
          description:
            "Well-rated central hotels with breakfast, airport transfer options, and short-stay flexibility.",
          price: "BDT 16,800",
          tag: "Popular stay",
          meta: "Pay later option",
          image: hotelImage,
        },
        {
          category: "Hotel",
          title: "Singapore business stay",
          route: "CBD and airport corridor",
          description:
            "Properties selected for clean transport links and reliable early check-in potential.",
          price: "BDT 21,300",
          tag: "Business ready",
          meta: "Breakfast included",
          image: singaporeImage,
        },
        {
          category: "Hotel",
          title: "Bangkok shopping district rooms",
          route: "Central lifestyle hotels",
          description:
            "Mid-range favorites near retail and nightlife with competitive nightly price movement.",
          price: "BDT 11,900",
          tag: "Best seller",
          meta: "Weekend dates open",
          image: bangkokImage,
        },
        {
          category: "Hotel",
          title: "Istanbul old city heritage stay",
          route: "Boutique and comfort mix",
          description:
            "Ideal for culture-first itineraries with quick access to historic sites and tram routes.",
          price: "BDT 14,700",
          tag: "Historic district",
          meta: "Flexible cancellation",
          image: istanbulImage,
        },
      ],
      tour: [
        {
          category: "Tour",
          title: "Phuket easy beach package",
          route: "3 nights and airport transfer",
          description:
            "A clean leisure bundle for couples and families who want a fast bookable beach plan.",
          price: "BDT 34,200",
          tag: "Beach escape",
          meta: "Transfers included",
          image: beachImage,
        },
        {
          category: "Tour",
          title: "Dubai stopover explorer",
          route: "City, desert, marina",
          description:
            "Balanced short itinerary with headline attractions and time left for shopping or rest.",
          price: "BDT 49,500",
          tag: "City combo",
          meta: "Best for 4 days",
          image: dubaiImage,
        },
        {
          category: "Tour",
          title: "Bangkok and Pattaya combo",
          route: "Urban pace + seaside downtime",
          description:
            "The classic Thailand pairing with strong value for first-time outbound travelers.",
          price: "BDT 38,600",
          tag: "Fast seller",
          meta: "Visa-friendly routing",
          image: bangkokImage,
        },
        {
          category: "Tour",
          title: "Singapore family city pass",
          route: "Theme parks and skyline",
          description:
            "A dependable family package anchored on transport convenience and attraction access.",
          price: "BDT 56,400",
          tag: "Family package",
          meta: "School break fit",
          image: singaporeImage,
        },
      ],
    }),
    []
  );

  const filters = [
    {
      value: "all",
      label: "All",
      summary: "A quick read on the strongest live picks across flights, stays, tours, and group inventory.",
    },
    {
      value: "flight",
      label: "Flight",
      summary: "Shortlisted airfares with better timing, healthier availability, and real booking momentum.",
    },
    {
      value: "groupFare",
      label: "Group Fare",
      summary: "Held inventory for teams, students, and family movements that need aligned schedules.",
    },
    {
      value: "hotel",
      label: "Hotel",
      summary: "Stay offers centered on airport access, city convenience, and flexible check-in value.",
    },
    {
      value: "tour",
      label: "Tour",
      summary: "Packaged leisure options for travelers who want a cleaner path from search to booking.",
    },
  ];

  const [value, setValue] = useState("all");
  const sliderRef = useRef(null);

  const activeFilter = filters.find((item) => item.value === value) || filters[0];
  const activeDeals = dealCollections[value];

  const settings = {
    dots: false,
    infinite: activeDeals.length > 3,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 700,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <Box sx={{ py: { xs: 3, md: 6 } }}>
      <Container>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: { xs: "28px", md: "36px" },
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 4 },
            background:
              "linear-gradient(135deg, #009ad6 0%, #007eaf 58%, #00618b 100%)",
            boxShadow: "0 28px 70px rgba(0, 122, 170, 0.24)",
          }}
        >
          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", lg: "row" },
                justifyContent: "space-between",
                gap: 3,
              }}
            >
              <Box
                sx={{
                  maxWidth: "620px",
                }}
              >
                <Typography
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: "999px",
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                    color: "var(--primary-color)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    mb: 2,
                  }}
                >
                  <LocalOfferRoundedIcon sx={{ fontSize: "16px" }} />
                  Hot deals
                </Typography>
                <Box>
                  <Typography
                    sx={{
                      fontSize: { xs: "14px", md: "16px" },
                      lineHeight: 1.7,
                      color: "rgba(255, 255, 255, 0.78)",
                      maxWidth: "560px",
                    }}
                  >
                    {activeFilter.summary}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      mt: 2.5,
                    }}
                  >
                    {[
                      `${activeDeals.length} live offers`,
                      "Daily fare scan",
                      "Flexible options",
                    ].map((item) => (
                      <Box
                        key={item}
                        sx={{
                          px: 1.5,
                          py: 0.9,
                          borderRadius: "999px",
                          bgcolor: "rgba(255, 255, 255, 0.1)",
                          color: "white",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {item}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignItems: { xs: "stretch", lg: "flex-end" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: { xs: "flex-start", lg: "flex-end" },
                    gap: 1,
                  }}
                >
                  {filters.map((filter) => {
                    const isActive = filter.value === value;

                    return (
                      <Box
                        key={filter.value}
                        component="button"
                        type="button"
                        onClick={() => setValue(filter.value)}
                        sx={{
                          border: 0,
                          px: 2,
                          py: 1.15,
                          borderRadius: "999px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 700,
                          transition: "all 0.2s ease",
                          bgcolor: isActive
                            ? "var(--primary-color)"
                            : "rgba(255, 255, 255, 0.1)",
                          color: "white",
                          boxShadow: isActive
                            ? "0 16px 30px rgba(0, 122, 170, 0.3)"
                            : "none",
                          "&:hover": {
                            bgcolor: isActive
                              ? "var(--primary-button)"
                              : "rgba(255, 255, 255, 0.18)",
                          },
                        }}
                      >
                        {filter.label}
                      </Box>
                    );
                  })}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    justifyContent: { xs: "flex-start", lg: "flex-end" },
                  }}
                >
                  {[
                    {
                      label: "Previous deals",
                      icon: <ArrowBackRoundedIcon />,
                      onClick: () => sliderRef.current?.slickPrev(),
                    },
                    {
                      label: "Next deals",
                      icon: <ArrowForwardRoundedIcon />,
                      onClick: () => sliderRef.current?.slickNext(),
                    },
                  ].map((control) => (
                    <Box
                      key={control.label}
                      component="button"
                      type="button"
                      aria-label={control.label}
                      onClick={control.onClick}
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "16px",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        bgcolor: "rgba(255, 255, 255, 0.08)",
                        color: "white",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "var(--primary-color)",
                          border: "1px solid var(--primary-color)",
                        },
                      }}
                    >
                      {control.icon}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 4,
              "& .slick-track": {
                display: "flex",
              },
              "& .slick-slide": {
                height: "inherit",
              },
              "& .slick-slide > div": {
                height: "100%",
                paddingRight: { xs: 0, md: "18px" },
              },
              "& .slick-list": {
                overflow: "hidden",
              },
            }}
          >
            <Slider ref={sliderRef} {...settings}>
              {activeDeals.map((deal) => (
                <Box key={`${deal.category}-${deal.title}`} sx={{ height: "100%" }}>
                  <Box
                    sx={{
                      height: "100%",
                      minHeight: 430,
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: "26px",
                      overflow: "hidden",
                      bgcolor: "rgba(255, 255, 255, 0.96)",
                      boxShadow: "0 24px 50px rgba(6, 16, 28, 0.14)",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        height: 220,
                      }}
                    >
                      <Box
                        component="img"
                        src={deal.image}
                        alt={deal.title}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(11, 26, 44, 0.1) 0%, rgba(11, 26, 44, 0.72) 100%)",
                          p: 2.25,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          sx={{
                            alignSelf: "flex-start",
                            px: 1.4,
                            py: 0.7,
                            borderRadius: "999px",
                            bgcolor: "rgba(255, 255, 255, 0.14)",
                            backdropFilter: "blur(10px)",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {deal.category}
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "12px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "rgba(255, 255, 255, 0.72)",
                              mb: 0.75,
                            }}
                          >
                            {deal.route}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "24px",
                              lineHeight: 1.15,
                              fontWeight: 800,
                              color: "white",
                            }}
                          >
                            {deal.title}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        p: 2.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                        flex: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "14px",
                          lineHeight: 1.7,
                          color: "var(--text-color)",
                        }}
                      >
                        {deal.description}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: "auto",
                        }}
                      >
                        {[deal.tag, deal.meta].map((item) => (
                          <Box
                            key={item}
                            sx={{
                              px: 1.2,
                              py: 0.75,
                              borderRadius: "999px",
                              bgcolor: "rgba(0, 154, 214, 0.12)",
                              color: "var(--primary-color)",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {item}
                          </Box>
                        ))}
                      </Box>

                      <Box
                        sx={{
                          pt: 2,
                          borderTop: "1px solid rgba(0, 154, 214, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--text-color)",
                              mb: 0.4,
                            }}
                          >
                            Starting from
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "24px",
                              fontWeight: 800,
                              color: "var(--primary-button)",
                            }}
                          >
                            {deal.price}
                          </Typography>
                        </Box>

                        <Box
                          component="button"
                          type="button"
                          sx={{
                            border: 0,
                            px: 1.4,
                            py: 1,
                            borderRadius: "14px",
                            bgcolor: "var(--primary-color)",
                            color: "white",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 700,
                            transition: "all 0.2s ease",
                            "&:hover": {
                              bgcolor: "var(--primary-button)",
                            },
                          }}
                        >
                          See deal
                          <SouthEastRoundedIcon sx={{ fontSize: "18px" }} />
                        </Box>
                      </Box>
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

export default HotDeals;
