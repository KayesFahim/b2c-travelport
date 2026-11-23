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
import Slider from "react-slick";
import { readRecentSearches } from "../../utils/recentSearches";
import {
  createDefaultTravelportSearchFilters,
  normalizeTravelportSearchFilters,
} from "../../utils/travelportSearchCriteria";

const FLIGHT_BANNER_IMAGE_URL =
  "https://www.savethestudent.org/uploads/flights.jpg";

const Banner = ({ data, onTabChange }) => {
  const heroImage =
    data?.bannerimage?.imageUrl ||
    data?.bannerimageMobile?.imageUrl ||
    FLIGHT_BANNER_IMAGE_URL;

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
    "Compare flights in one place",
    "Up-to-date flight options",
    "Baggage and fare details",
  ];

  const heroStatCards = [
    { label: "Explore", value: "More choice", note: "Compare airlines and routes" },
    { label: "Plan with confidence", value: "Clear fares", note: "Review details before you book" },
    { label: "Travel together", value: "Here to help", note: "Contact our support team" },
  ];

  if (!data) return null;

  return (
    <Box className="flyjatt-home-banner">
      <TabContext value={value}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            backgroundImage: `linear-gradient(118deg, rgba(2, 16, 37, 0.9) 0%, rgba(5, 41, 79, 0.8) 46%, rgba(0, 154, 214, 0.44) 100%), url(${heroImage})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: { xs: "380px", md: "460px" },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.2,
              background:
                "radial-gradient(circle at 20% 16%, rgba(255,255,255,0.32), transparent 48%), radial-gradient(circle at 78% 38%, rgba(255,255,255,0.26), transparent 40%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: { xs: "-120px", md: "-180px" },
              right: { xs: "-120px", md: "-150px" },
              width: { xs: "260px", md: "380px" },
              height: { xs: "260px", md: "380px" },
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0))",
              pointerEvents: "none",
            }}
          />
          <Container sx={{ position: "relative", zIndex: 1 }}>
            <Box
              sx={{
                pt: { xs: 2.6, md: 4.1 },
                pb: { xs: 8.6, md: 11.6 },
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
                    p: "3px",
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <TabList
                    onChange={handleChange}
                    aria-label="home product tabs"
                    TabIndicatorProps={{ sx: { display: "none" } }}
                    sx={{
                      minHeight: 0,
                      "& .MuiTabs-flexContainer": { gap: 0.4 },
                    }}
                  >
                    <Tab
                      label="Flight"
                      value="flight"
                      sx={{
                        textTransform: "capitalize",
                        color: "rgba(255,255,255,0.9)",
                        opacity: 1,
                        minHeight: 0,
                        minWidth: { xs: "96px", md: "120px" },
                        py: 0.75,
                        px: 2,
                        fontSize: "14px",
                        fontWeight: 700,
                        borderRadius: "999px",
                        transition: "all 0.25s ease",
                        "&.MuiTab-root.Mui-selected": {
                          backgroundColor: "var(--primary-button)",
                          color: "var(--white)",
                          boxShadow: "0 6px 14px rgba(0,154,214,0.35)",
                        },
                      }}
                    />
                    <Tab
                      label="Stay"
                      value="stay"
                      sx={{
                        textTransform: "capitalize",
                        color: "rgba(255,255,255,0.9)",
                        opacity: 1,
                        minHeight: 0,
                        minWidth: { xs: "96px", md: "120px" },
                        py: 0.75,
                        px: 2,
                        fontSize: "14px",
                        fontWeight: 700,
                        borderRadius: "999px",
                        transition: "all 0.25s ease",
                        "&.MuiTab-root.Mui-selected": {
                          backgroundColor: "var(--primary-button)",
                          color: "var(--white)",
                          boxShadow: "0 6px 14px rgba(0,154,214,0.35)",
                        },
                      }}
                    />
                    <Tab
                      label="Package: Flight + Hotel"
                      value="package"
                      sx={{
                        textTransform: "none",
                        color: "rgba(255,255,255,0.9)",
                        opacity: 1,
                        minHeight: 0,
                        minWidth: { xs: "150px", md: "185px" },
                        py: 0.75,
                        px: 2,
                        fontSize: "14px",
                        fontWeight: 700,
                        borderRadius: "999px",
                        transition: "all 0.25s ease",
                        "&.MuiTab-root.Mui-selected": {
                          backgroundColor: "var(--primary-button)",
                          color: "var(--white)",
                          boxShadow: "0 6px 14px rgba(0,154,214,0.35)",
                        },
                      }}
                    />
                  </TabList>
                </Box>

                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.88)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "999px",
                    px: 1.2,
                    py: 0.5,
                    backgroundColor: "rgba(255,255,255,0.09)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Real-time fares from Travelport
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: { xs: 2.2, md: 3.6 },
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 330px" },
                  gap: { xs: 2.2, md: 2.6 },
                  alignItems: "start",
                }}
              >
                <Box sx={{ maxWidth: "680px" }}>
                  <Typography
                    component="h1"
                    sx={{
                      color: "var(--white)",
                      fontWeight: 800,
                      fontSize: { xs: "32px", sm: "40px", md: "52px" },
                      lineHeight: 1.12,
                      letterSpacing: "-0.035em",
                    }}
                  >
                    {data.mainTitle}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1.05,
                      color: "rgba(255,255,255,0.9)",
                      fontWeight: 500,
                      fontSize: { xs: "14px", md: "18px" },
                      maxWidth: "620px",
                      lineHeight: 1.5,
                    }}
                  >
                    {data.subTitle}
                  </Typography>
                  <Box
                    sx={{
                      mt: 1.8,
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
                          px: 1.2,
                          py: 0.6,
                          border: "1px solid rgba(255,255,255,0.28)",
                          bgcolor: "rgba(255,255,255,0.09)",
                          color: "#fff",
                          fontSize: { xs: "13px", md: "14px" },
                          fontWeight: 600,
                          backdropFilter: "blur(8px)",
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
                          "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
                        backdropFilter: "blur(10px)",
                        px: 1.4,
                        py: 1.15,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "13px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.78)",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.2,
                          color: "#fff",
                          fontSize: "28px",
                          lineHeight: 1.1,
                          fontWeight: 800,
                        }}
                      >
                        {item.value}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "14px",
                          color: "rgba(255,255,255,0.86)",
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
