import { Box, Container, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import FlightSearchBox from "../HomeSearchBox/FlightSearchBox";
import HotelSearchBox from "../Hotel/HotelSearchBox";
import PackageSearchBox from "../Package/PackageSearchBox";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import { addDays, format } from "date-fns";
import { useRef } from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import CardTravelRoundedIcon from "@mui/icons-material/CardTravelRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import Slider from "react-slick";
import { readRecentSearches } from "../../utils/recentSearches";
import {
  createDefaultTravelportSearchFilters,
  normalizeTravelportSearchFilters,
} from "../../utils/travelportSearchCriteria";

const FLIGHT_BANNER_IMAGE_URL = "/images/hero-airplane.jpg";

const Banner = ({ data, onTabChange }) => {
  const cmsBannerUrl = String(
    data?.bannerimage?.imageUrl || data?.bannerimageMobile?.imageUrl || ""
  ).trim();
  // Prefer local high-res airplane hero unless CMS defines a bespoke non-placeholder image
  const heroImage =
    cmsBannerUrl &&
    !cmsBannerUrl.includes("unsplash.com/photo-1488646953014") &&
    !cmsBannerUrl.includes("savethestudent.org")
      ? cmsBannerUrl
      : FLIGHT_BANNER_IMAGE_URL;

  //todo: state for retrigger useEffect
  const [changeState, setChangeState] = useState(null);
  //todo: End for retrigger useEffect

  //todo: state for from date change
  const [changeFrom, setChangeFrom] = useState(false);
  const [changeTo, setChangeTo] = useState(false);
  //todo: End state for from date change
  const [valueBox, setValueBox] = useState("oneway");
  const [type, setType] = useState("flight");

  const [fromSearchText, setFromSearchText] = useState(
    "Dubai Intl Airport (DXB)"
  );
  const [toSearchText, setToSearchText] = useState(
    "John F Kennedy Intl (JFK)"
  );

  const [departureDate, setDepartureDate] = useState(
    format(addDays(new Date(), 1), "dd MMM yy")
  );
  const [returningDate, setReturningDate] = useState(
    format(addDays(new Date(), 4), "dd MMM yy")
  );
  const [travelDate, setTravelDate] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 3),
      key: "selection",
    },
  ]);
  // for multiCity
  const now = useRef(new Date());
  const recentSliderRef = useRef(null);
  const [from, setFrom] = useState(addDays(now.current, 1));
  const [to, setTo] = useState(addDays(now.current, 3));

  const [faddress, setfaddress] = useState("Dubai,UNITED ARAB EMIRATES");
  const [toAddress, setToAddress] = useState("New York,UNITED STATES");
  const [fromSendData, setFromSendData] = useState("DXB");
  const [toSendData, setToSendData] = useState("JFK");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infant, setInfant] = useState(0);

  const [result, setResult] = useState(1);
  const [className, setClassName] = useState("1");

  // const handleChangess = (event, newValue) => {
  //   setValueBox(newValue);
  // };
  const handleClassName = (event, newValue) => {
    setClassName(newValue);
  };

  const [searchData, setSearchData] = useState({
    adultCount: adultCount,
    childCount: childCount,
    infantCount: infant,
    CityCount: 2,
    segments: [
      {
        id: 0,
        openFrom: false,
        DepFrom: fromSendData.trim(),
        depFromText: fromSearchText,
        ArrTo: toSendData.trim(),
        arrToText: toSearchText,
        openTo: false,
        Date: new Date().toLocaleDateString("sv"),
        openDate: false,
        open: false,
      },
      {
        id: 1,
        openFrom: false,
        DepFrom: toSendData.trim(),
        depFromText: toSearchText,
        ArrTo: fromSendData.trim(),
        arrToText: fromSearchText,
        openTo: false,
        Date: new Date().toLocaleDateString("sv"),
        openDate: false,
        open: false,
      },
    ],
  });

  const [value, setValue] = useState("flight");
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchFilters, setSearchFilters] = useState(() =>
    createDefaultTravelportSearchFilters()
  );

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  const handleRecentSearchesUpdated = () => {
    setRecentSearches(readRecentSearches());
  };

  const formatRecentDate = (dateValue) => {
    if (!dateValue) {
      return "Flexible";
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return "Flexible";
    }

    return format(parsed, "dd MMM yy");
  };

  const applyRecentSearch = (item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const segments = Array.isArray(item.segments) ? item.segments : [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    if (!firstSegment) {
      return;
    }

    const normalizedTripType = String(item.tripType || "oneway").toLowerCase();
    const tripType =
      normalizedTripType === "roundway" || normalizedTripType === "multicity"
        ? normalizedTripType
        : "oneway";

    setValueBox(tripType);
    setAdultCount(Math.max(1, Number(item.adultCount || 1)));
    setChildCount(Math.max(0, Number(item.childCount || 0)));
    setInfant(Math.max(0, Number(item.infantCount || 0)));
    setClassName(String(item.cabinClass || "1"));

    setFromSendData(String(firstSegment.depfrom || item.fromCode || "DXB"));
    setToSendData(String(lastSegment.arrto || item.toCode || "JFK"));

    setFromSearchText(
      String(item.fromLabel || firstSegment.depFromText || firstSegment.depfrom || "")
    );
    setToSearchText(
      String(item.toLabel || lastSegment.arrToText || lastSegment.arrto || "")
    );

    if (item.fromAddress) {
      setfaddress(String(item.fromAddress));
    }
    if (item.toAddress) {
      setToAddress(String(item.toAddress));
    }

    const departureIso = String(item.departureDate || firstSegment.depdate || "");
    const returnIso =
      String(item.returnDate || "") ||
      (segments.length > 1 ? String(lastSegment.depdate || "") : "");

    if (departureIso) {
      const departureObj = new Date(departureIso);
      if (!Number.isNaN(departureObj.getTime())) {
        setFrom(departureObj);
        setDepartureDate(format(departureObj, "dd MMM yy"));
      }
    }

    if (returnIso) {
      const returnObj = new Date(returnIso);
      if (!Number.isNaN(returnObj.getTime())) {
        setTo(returnObj);
        setReturningDate(format(returnObj, "dd MMM yy"));
      }
    }

    const mappedSegments = segments.map((segment, index) => ({
      id: index,
      openFrom: false,
      DepFrom: String(segment?.depfrom || ""),
      depFromText: String(segment?.depFromText || segment?.depfrom || ""),
      ArrTo: String(segment?.arrto || ""),
      arrToText: String(segment?.arrToText || segment?.arrto || ""),
      openTo: false,
      Date: String(segment?.depdate || ""),
      openDate: false,
      open: false,
    }));

    if (mappedSegments.length > 0) {
      setSearchData((prevData) => ({
        ...prevData,
        segments: mappedSegments,
      }));
    }

    if (item.searchFilters && typeof item.searchFilters === "object") {
      setSearchFilters(normalizeTravelportSearchFilters(item.searchFilters));
    } else {
      setSearchFilters(createDefaultTravelportSearchFilters());
    }
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  const recentSlidesToShow = Math.min(
    5,
    Math.max(1, Number(recentSearches.length || 1))
  );
  const recentSlidesToShowTablet = Math.min(
    4,
    Math.max(1, Number(recentSearches.length || 1))
  );

  const recentSliderSettings = {
    dots: false,
    arrows: false,
    infinite: recentSearches.length > recentSlidesToShow,
    speed: 400,
    slidesToShow: recentSlidesToShow,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1100,
        settings: {
          slidesToShow: recentSlidesToShowTablet,
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: Math.min(
            2,
            Math.max(1, Number(recentSearches.length || 1))
          ),
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

  const heroHighlights = [
    "Live Global GDS Airlines",
    "Hotels Quoted in USD",
    "Multi-City Split-Stay Packages",
  ];

  const heroStatCards = [
    { label: "Flight Network", value: "400+ Airlines", note: "Real-time schedules & branded fares" },
    { label: "Stays Worldwide", value: "USD Pricing", note: "Live rooms, taxes & instant rules" },
    { label: "Custom Trips", value: "Split Stays", note: "Combine flights + multi-city hotels" },
  ];

  if (!data) return null;

  return (
    <Box className="flyjatt-home-banner">
      <TabContext value={value}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            bgcolor: "#04142b",
            minHeight: { xs: "430px", md: "510px" },
          }}
        >
          {/* Real LCP-optimized hero airplane image (modern-web-guidance: optimize-image-priority) */}
          <img
            src={heroImage}
            alt="Commercial wide-body airplane gleaming against a golden sunrise sky"
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
            className="flyjatt-hero-media"
          />
          {/* Directional luxury-aviation gradient scrim for crisp left typography & clear airplane visibility on right */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(102deg, rgba(3, 15, 34, 0.94) 0%, rgba(5, 29, 62, 0.82) 42%, rgba(7, 41, 82, 0.36) 72%, rgba(4, 18, 38, 0.44) 100%)",
            }}
          />
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(4, 16, 36, 0.32) 0%, rgba(4, 16, 36, 0.05) 55%, rgba(4, 16, 36, 0.72) 100%)",
            }}
          />
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              top: { xs: "-120px", md: "-160px" },
              left: { xs: "-90px", md: "-120px" },
              width: { xs: "280px", md: "440px" },
              height: { xs: "280px", md: "440px" },
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,180,240,0.22), rgba(0,180,240,0))",
              pointerEvents: "none",
            }}
          />
          <Container sx={{ position: "relative", zIndex: 1 }}>
            <Box
              sx={{
                pt: { xs: 2.8, md: 4.4 },
                pb: { xs: 9.2, md: 12.4 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", md: "center" },
                  flexDirection: { xs: "column", md: "row" },
                  gap: 1.4,
                }}
              >
                <Box
                  sx={{
                    border: "1px solid rgba(255,255,255,0.28)",
                    borderRadius: "999px",
                    p: "4px",
                    background: "rgba(4, 20, 44, 0.56)",
                    backdropFilter: "blur(14px)",
                    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.24)",
                  }}
                >
                  <TabList
                    onChange={handleChange}
                    aria-label="home product tabs"
                    TabIndicatorProps={{ sx: { display: "none" } }}
                    sx={{
                      minHeight: 0,
                      "& .MuiTabs-flexContainer": { gap: 0.45, flexWrap: "wrap" },
                    }}
                  >
                    <Tab
                      icon={<FlightTakeoffRoundedIcon sx={{ fontSize: 17 }} />}
                      iconPosition="start"
                      label="Flight"
                      value="flight"
                      sx={{
                        textTransform: "none",
                        color: "rgba(255,255,255,0.92)",
                        opacity: 1,
                        minHeight: 40,
                        minWidth: { xs: "96px", md: "118px" },
                        py: 0.65,
                        px: 2,
                        fontSize: "14px",
                        fontWeight: 800,
                        borderRadius: "999px",
                        transition: "all 0.22s ease",
                        "&.MuiTab-root.Mui-selected": {
                          background: "linear-gradient(120deg, #00b0f0 0%, #0077b6 100%)",
                          color: "#ffffff",
                          boxShadow: "0 8px 18px rgba(0,154,214,0.42)",
                        },
                      }}
                    />
                    <Tab
                      icon={<HotelRoundedIcon sx={{ fontSize: 17 }} />}
                      iconPosition="start"
                      label="Stay"
                      value="stay"
                      sx={{
                        textTransform: "none",
                        color: "rgba(255,255,255,0.92)",
                        opacity: 1,
                        minHeight: 40,
                        minWidth: { xs: "96px", md: "118px" },
                        py: 0.65,
                        px: 2,
                        fontSize: "14px",
                        fontWeight: 800,
                        borderRadius: "999px",
                        transition: "all 0.22s ease",
                        "&.MuiTab-root.Mui-selected": {
                          background: "linear-gradient(120deg, #00b0f0 0%, #0077b6 100%)",
                          color: "#ffffff",
                          boxShadow: "0 8px 18px rgba(0,154,214,0.42)",
                        },
                      }}
                    />
                    <Tab
                      icon={<CardTravelRoundedIcon sx={{ fontSize: 17 }} />}
                      iconPosition="start"
                      label="Package: Flight + Hotel"
                      value="package"
                      sx={{
                        textTransform: "none",
                        color: "rgba(255,255,255,0.92)",
                        opacity: 1,
                        minHeight: 40,
                        minWidth: { xs: "155px", md: "198px" },
                        py: 0.65,
                        px: 2,
                        fontSize: "14px",
                        fontWeight: 800,
                        borderRadius: "999px",
                        transition: "all 0.22s ease",
                        "&.MuiTab-root.Mui-selected": {
                          background: "linear-gradient(120deg, #00b0f0 0%, #0077b6 100%)",
                          color: "#ffffff",
                          boxShadow: "0 8px 18px rgba(0,154,214,0.42)",
                        },
                      }}
                    />
                  </TabList>
                </Box>

                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#e0f2fe",
                    border: "1px solid rgba(125, 211, 252, 0.36)",
                    borderRadius: "999px",
                    px: 1.5,
                    py: 0.65,
                    backgroundColor: "rgba(4, 22, 48, 0.56)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <VerifiedRoundedIcon sx={{ fontSize: 16, color: "#38bdf8" }} />
                  <span>Real-time fares powered by Travelport+</span>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: { xs: 2.4, md: 4 },
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 310px" },
                  gap: { xs: 2.2, md: 3 },
                  alignItems: "end",
                }}
              >
                <Box sx={{ maxWidth: "650px" }}>
                  <Typography
                    component="h1"
                    className="flyjatt-hero-heading"
                    sx={{
                      color: "#ffffff",
                      fontWeight: 900,
                      fontSize: { xs: "32px", sm: "42px", md: "54px" },
                      lineHeight: 1.08,
                      letterSpacing: "-0.035em",
                      textShadow: "0 8px 28px rgba(0, 0, 0, 0.42)",
                    }}
                  >
                    {data.mainTitle}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1.2,
                      color: "rgba(232, 244, 255, 0.94)",
                      fontWeight: 500,
                      fontSize: { xs: "14.5px", md: "18px" },
                      maxWidth: "580px",
                      lineHeight: 1.5,
                      textShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
                    }}
                  >
                    {data.subTitle}
                  </Typography>
                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.9,
                    }}
                  >
                    {heroHighlights.map((item) => (
                      <Box
                        key={item}
                        sx={{
                          borderRadius: "999px",
                          px: 1.4,
                          py: 0.6,
                          border: "1px solid rgba(255,255,255,0.28)",
                          bgcolor: "rgba(4, 20, 44, 0.52)",
                          color: "#f0f9ff",
                          fontSize: { xs: "12.5px", md: "13.5px" },
                          fontWeight: 700,
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        {item}
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: { xs: "none", md: "grid" },
                    gap: 1,
                  }}
                >
                  {heroStatCards.map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.24)",
                        background:
                          "linear-gradient(135deg, rgba(5, 22, 48, 0.68) 0%, rgba(11, 56, 98, 0.46) 100%)",
                        backdropFilter: "blur(14px)",
                        px: 1.6,
                        py: 1.15,
                        boxShadow: "0 12px 24px rgba(0, 0, 0, 0.22)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontWeight: 800,
                          color: "#7dd3fc",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.15,
                          color: "#ffffff",
                          fontSize: "22px",
                          lineHeight: 1.15,
                          fontWeight: 900,
                        }}
                      >
                        {item.value}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "12.5px",
                          color: "rgba(226, 240, 255, 0.88)",
                          fontWeight: 500,
                        }}
                      >
                        {item.note}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>
        <Container
          sx={{
            mt: { xs: -8, md: -11 },
            position: "relative",
            zIndex: 3,
          }}
        >
          <Box
            sx={{
              borderRadius: { xs: "16px", md: "20px" },
              border: "1px solid rgba(255,255,255,0.8)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(242,249,255,0.95) 100%)",
              boxShadow: "0 24px 48px rgba(6, 34, 60, 0.22)",
              px: { xs: 1.1, md: 2.2 },
              py: { xs: 1.1, md: 1.4 },
              backdropFilter: "blur(10px)",
            }}
          >
            <TabPanel value="flight" sx={{ padding: "0px" }}>
              <FlightSearchBox
                type={type}
                valueBox={valueBox}
                setValueBox={setValueBox}
                setType={setType}
                value={value}
                setValue={setValue}
                fromSearchText={fromSearchText}
                setFromSearchText={setFromSearchText}
                toSearchText={toSearchText}
                setToSearchText={setToSearchText}
                departureDate={departureDate}
                setDepartureDate={setDepartureDate}
                returningDate={returningDate}
                setReturningDate={setReturningDate}
                travelDate={travelDate}
                setTravelDate={setTravelDate}
                from={from}
                setFrom={setFrom}
                to={to}
                setTo={setTo}
                faddress={faddress}
                setfaddress={setfaddress}
                toAddress={toAddress}
                setToAddress={setToAddress}
                fromSendData={fromSendData}
                setFromSendData={setFromSendData}
                toSendData={toSendData}
                setToSendData={setToSendData}
                adultCount={adultCount}
                setAdultCount={setAdultCount}
                childCount={childCount}
                setChildCount={setChildCount}
                infant={infant}
                setInfant={setInfant}
                result={result}
                setResult={setResult}
                className={className}
                setClassName={setClassName}
                handleClassName={handleClassName}
                setChangeState={setChangeState}
                changeState={changeState}
                changeFrom={changeFrom}
                setChangeFrom={setChangeFrom}
                changeTo={changeTo}
                setChangeTo={setChangeTo}
                searchData={searchData}
                setSearchData={setSearchData}
                searchFilters={searchFilters}
                onSearchFiltersChange={setSearchFilters}
                onSearchCommitted={handleRecentSearchesUpdated}
              />
            </TabPanel>
            <TabPanel value="stay" sx={{ padding: "0px" }}>
              <HotelSearchBox />
            </TabPanel>
            <TabPanel value="package" sx={{ padding: "0px" }}>
              <PackageSearchBox />
            </TabPanel>
          </Box>
        </Container>

        <Container sx={{ mt: 1.6, position: "relative", zIndex: 2 }}>
          {recentSearches.length > 0 ? (
            <Box
              sx={{
                borderRadius: "14px",
                border: "1px solid rgba(0,154,214,0.24)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,250,255,0.96) 100%)",
                boxShadow: "0 14px 30px rgba(8,49,85,0.1)",
                px: { xs: 1.3, md: 1.8 },
                py: { xs: 1.3, md: 1.5 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <HistoryRoundedIcon
                    sx={{ fontSize: "18px", color: "var(--primary-color)" }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: "var(--depature-color)",
                      fontSize: { xs: "14px", md: "15px" },
                    }}
                  >
                    Recent Searches
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: "14px", color: "var(--text-color)" }}>
                    Click to apply
                  </Typography>
                  {recentSearches.length > 1 ? (
                    <Box sx={{ display: "flex", gap: 0.6 }}>
                      <Box
                        component="button"
                        type="button"
                        aria-label="Previous recent search"
                        onClick={() => recentSliderRef.current?.slickPrev?.()}
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "10px",
                          border: "1px solid rgba(0,154,214,0.24)",
                          background: "white",
                          color: "var(--primary-color)",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "rgba(0,154,214,0.08)",
                          },
                        }}
                      >
                        <ArrowBackRoundedIcon sx={{ fontSize: "16px" }} />
                      </Box>
                      <Box
                        component="button"
                        type="button"
                        aria-label="Next recent search"
                        onClick={() => recentSliderRef.current?.slickNext?.()}
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "10px",
                          border: "1px solid rgba(0,154,214,0.24)",
                          background: "white",
                          color: "var(--primary-color)",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "rgba(0,154,214,0.08)",
                          },
                        }}
                      >
                        <ArrowForwardRoundedIcon sx={{ fontSize: "16px" }} />
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </Box>

              <Box
                sx={{
                  "& .slick-track": {
                    display: "flex",
                  },
                  "& .slick-slide": {
                    height: "inherit",
                  },
                  "& .slick-slide > div": {
                    height: "100%",
                    padding: "0 4px",
                  },
                  "& .slick-list": {
                    margin: "0 -4px",
                    overflow: "hidden",
                  },
                }}
              >
                <Slider ref={recentSliderRef} {...recentSliderSettings}>
                  {recentSearches.map((item) => {
                    const passengerCount =
                      Number(item?.adultCount || 0) +
                      Number(item?.childCount || 0) +
                      Number(item?.infantCount || 0);
                    const tripText =
                      item?.tripType === "roundway"
                        ? "Round trip"
                        : item?.tripType === "multicity"
                        ? "Multi city"
                        : "One way";

                    return (
                      <Box key={item.id} sx={{ height: "100%" }}>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => applyRecentSearch(item)}
                          sx={{
                            textAlign: "left",
                            width: "100%",
                            height: "100%",
                            border: "1px solid rgba(0,154,214,0.2)",
                            borderRadius: "12px",
                            background: "white",
                            px: 1.2,
                            py: 1.1,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              transform: "translateY(-1px)",
                              borderColor: "var(--primary-color)",
                              boxShadow: "0 10px 18px rgba(0,122,175,0.16)",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "var(--primary-color)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {tripText}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 0.4,
                              fontSize: "16px",
                              fontWeight: 800,
                              color: "var(--flight-color)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 0.6,
                            }}
                          >
                            {String(item?.fromCode || "DXB")} to{" "}
                            {String(item?.toCode || "JFK")}
                            <ArrowOutwardRoundedIcon sx={{ fontSize: "18px" }} />
                          </Typography>
                          <Box
                            sx={{
                              mt: 0.6,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.6,
                              color: "var(--text-color)",
                            }}
                          >
                            <CalendarMonthRoundedIcon sx={{ fontSize: "14px" }} />
                            <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                              {formatRecentDate(item?.departureDate)}
                              {item?.returnDate
                                ? ` - ${formatRecentDate(item?.returnDate)}`
                                : ""}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              mt: 0.5,
                              fontSize: "14px",
                              color: "var(--text-color)",
                              fontWeight: 500,
                            }}
                          >
                            {passengerCount || 1} traveler
                            {(passengerCount || 1) > 1 ? "s" : ""}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Slider>
              </Box>
            </Box>
          ) : null}
        </Container>
      </TabContext>
    </Box>
  );
};

export default Banner;
