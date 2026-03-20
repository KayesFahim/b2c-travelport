import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import NavBar from "../../../Shared/NavBar/NavBar";
import PropTypes from "prop-types";
import {
  Box,
  Container,
  Typography,
  Grid,
  Chip,
  Stack,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import GroupIcon from "@mui/icons-material/Group";
import SunnyIcon from "@mui/icons-material/WbSunny";
import GroupsIcon from "@mui/icons-material/Groups";
import LuggageIcon from "@mui/icons-material/Luggage";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import EventIcon from "@mui/icons-material/Event";
import PhoneIcon from "@mui/icons-material/Phone";
import BedtimeIcon from "@mui/icons-material/Bedtime";
import ExploreIcon from "@mui/icons-material/Explore";
import ArticleIcon from "@mui/icons-material/Article";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import icon1 from "../../../asstes/img/tour/TourFilter/Asset 8left.png";
import icon2 from "../../../asstes/img/tour/TourFilter/Asset 9left.png";
import icon3 from "../../../asstes/img/tour/TourFilter/Asset 10left.png";
import icon4 from "../../../asstes/img/tour/TourFilter/Asset 11left.png";
import icon5 from "../../../asstes/img/tour/TourFilter/Asset 12left.png";
import icon6 from "../../../asstes/img/tour/TourFilter/Asset 13left.png";
import icon7 from "../../../asstes/img/tour/TourFilter/Asset 14left.png";

import {
  CalendarMonth,
  Phone,
  Info,
  Place,
  AccessTime,
  TipsAndUpdates,
  Group,
} from "@mui/icons-material";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontSize: "13px", color: "var(--primary-button)" }}>
            {children}
          </Typography>
        </Box>
      )}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const TourDetails = () => {
  const location = useLocation();
  const packagedata = location.state?.packagedata;

  console.log("Received packagedata:", packagedata);

  const [dayTab, setDayTab] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const [sliderIndex, setSliderIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setDayTab(newValue);
  };

  const toggleSectionVisibility = (section) => {
    setVisibleSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSliderNext = () => {
    setSliderIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleSliderPrev = () => {
    setSliderIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const { tourPlans = [] } = packagedata;

  const {
    introduction,
    mainImage = [],
    overView,
    objective,
    accommodation,
  } = packagedata;

  const mainTitle = introduction?.mainTitle || "Tour Details";
  const subTitle = introduction?.subTitle;
  const images = mainImage;

  return (
    <Box sx={{ backgroundColor: "#f4f7fb", minHeight: "100vh" }}>
      <NavBar />
      <Container sx={{ pt: "40px", pb: "40px" }}>
        {/* Image Gallery */}
        <Grid container spacing={2} mb={3}>
          {/* Slider for xs devices */}
          <Grid item xs={12} sx={{ display: { xs: "block", md: "none" } }}>
            <Box
              sx={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Box
                component="img"
                src={images[sliderIndex]?.imageUrl}
                alt={`Slide ${sliderIndex + 1}`}
                sx={{
                  width: "100%",
                  height: "300px",
                  objectFit: "cover",
                  borderRadius: "20px",
                }}
              />
              {images.length > 1 && (
                <>
                  <Button
                    onClick={handleSliderPrev}
                    sx={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "1px solid white", // Add white border
                      color: "white",
                      minWidth: "20px", // Reduce size
                      height: "20px", // Reduce size
                      borderRadius: "50%",
                    }}
                  >
                    {"<"}
                  </Button>
                  <Button
                    onClick={handleSliderNext}
                    sx={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "1px solid white", // Add white border
                      color: "white",
                      minWidth: "20px", // Reduce size
                      height: "20px", // Reduce size
                      borderRadius: "50%",
                    }}
                  >
                    {">"}
                  </Button>
                </>
              )}
            </Box>
          </Grid>

          {/* Main Image and Thumbnails for md and larger devices */}
          <Grid
            item
            xs={12}
            md={8}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box
              component="img"
              src={images[0]?.imageUrl}
              alt="Main Tour"
              sx={{
                width: "100%",
                height: "400px",
                objectFit: "cover",
                borderRadius: "10px",
              }}
            />
          </Grid>
          <Grid
            item
            xs={12}
            md={4}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Grid container spacing={2}>
              {images.slice(1, 3).map((img, index) => (
                <Grid item xs={12} key={index}>
                  <Box
                    component="img"
                    src={img.imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    sx={{
                      width: "100%",
                      height: "190px",
                      objectFit: "cover",
                      borderRadius: "10px",
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        <Box
          sx={{
            bgcolor: "white",
            p: { xs: 1, md: 3 },
            borderRadius: "10px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "row", md: "row" },
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              mb: 3,
              gap: { xs: 2, md: 0 },
            }}
          >
            {/* Left: Title + Tags */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                mb: 0,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "16px", md: "22px" }, // Reduced for xs
                  color: "var(--primary-button)",
                }}
              >
                {packagedata?.introduction?.mainTitle || "Tour Details"}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                mt={1}
                // Remove flexWrap="nowrap" to allow wrapping
                sx={{
                  gap: { xs: 1, md: 0 },
                  flexWrap: { xs: "nowrap", md: "wrap" }, // Allow wrap for xs
                }}
              >
                <Chip
                  label={
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "9px", md: "13px" },
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <SunnyIcon
                        sx={{
                          fontSize: { xs: "11px", md: "16px" },
                          color: "var(--primary-button)",
                        }}
                      />
                      {packagedata?.introduction?.journeyDuration || "N/A"}
                      <BedtimeIcon
                        sx={{
                          fontSize: { xs: "9px", md: "16px" },
                          color: "var(--primary-button)",
                        }}
                      />
                      {packagedata?.accommodation?.nights || 0} nights
                    </Typography>
                  }
                  sx={{
                    borderRadius: "20px",
                    px: { xs: 0.2, md: 1.5 }, // Reduced px for xs
                    color: "var(--primary-button)",
                    backgroundColor: "var(--footer-text-color-heading)",
                  }}
                />
                <Chip
                  icon={
                    <GroupsIcon
                      sx={{
                        fontSize: {
                          xs: "11px",
                          md: "18px",
                          color: "var(--primary-button)",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "9px", md: "13px" },
                      }}
                    >
                      {`Minimum ${
                        packagedata?.introduction?.minimumPerson || "N/A"
                      } person`}
                    </Typography>
                  }
                  sx={{
                    borderRadius: "20px",
                    px: { xs: 0.2, md: 1.5 }, // Reduced px for xs
                    color: "var(--primary-button)",
                    backgroundColor: "var(--footer-text-color-heading)",
                  }}
                />
              </Stack>
            </Box>

            {/* Right: Location */}
            <Box
              sx={{
                textAlign: "right",
                mt: 0,
                minWidth: { xs: "140px", md: "auto" },
                ml: { xs: 2, md: 0 },
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: { xs: "flex-end", md: "flex-end" },
                justifyContent: "flex-start",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "11px", md: "13px" }, // Reduced for xs
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "flex-start", md: "flex-end" },
                  gap: 0.5,
                  color: "var(--primary-button)",
                }}
              >
                <LocationOnIcon fontSize="small" />{" "}
                {packagedata?.introduction?.journeyLocationCity ||
                  "Unknown City"}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "11px", md: "13px" },
                  color: "var(--primary-button)",
                }} // Reduced for xs
              >
                {packagedata?.introduction?.journeyLocationCountry ||
                  "Unknown Country"}
              </Typography>
            </Box>
          </Box>
          <Typography
            sx={{ mt: 1, fontSize: "13px", color: "var(--primary-button)" }}
          >
            {packagedata?.overView?.packageOverView}
          </Typography>

          <Grid container spacing={3} mt={5}>
            {/* Left: Itinerary */}
            <Grid item xs={12} md={8}>
              <Box
                sx={{
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("itinerary")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon1}
                      alt="Itinerary Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    Itinerary
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.itinerary
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.itinerary && (
                  <>
                    <Tabs
                      value={dayTab}
                      onChange={handleTabChange}
                      sx={{
                        mt: 2,
                        "& .MuiTab-root": {
                          backgroundColor: "var(--footer-text-color-heading)",
                          color: "var(--primary-button)",
                          borderRadius: "10px",
                          textTransform: "none",
                          fontWeight: "normal", // Reduce font weight
                          fontSize: "13px", // Reduce font size
                          mx: 0.5,
                          px: 2,
                          py: 0, // Remove y-axis padding
                          height: "30px", // Reduce button height
                          minHeight: "30px", // Ensure consistent height
                        },
                        "& .Mui-selected": {
                          border: "1px solid var(--primary-button)",
                          backgroundColor: "var(--primary-button)",
                          color: "white", // Ensure selected tab text color is white
                        },
                        "& .MuiTabs-indicator": {
                          display: "none", // Remove underline
                        },
                      }}
                    >
                      {tourPlans.map((plan, index) => (
                        <Tab
                          key={index}
                          label={`Day ${index + 1}`}
                          sx={{
                            minWidth: "auto",
                          }}
                        />
                      ))}
                    </Tabs>

                    {tourPlans.map((plan, index) => (
                      <CustomTabPanel key={index} value={dayTab} index={index}>
                        <Typography
                          fontWeight={700}
                          // mb={1}
                          sx={{
                            fontSize: "13px",
                            color: "var(--primary-button)",
                          }}
                        >
                          {plan.title || `Day ${index + 1}`}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "var(--primary-button)",
                          }}
                        >
                          {plan.plan || "Details not available"}
                        </Typography>
                      </CustomTabPanel>
                    ))}
                  </>
                )}
              </Box>

              {/* What's Included */}
              <Box
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("whatsIncluded")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon2}
                      alt="What's Included Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    What's Included
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.whatsIncluded
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.whatsIncluded && (
                  <>
                    <Typography
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        color: "var(--primary-button)",
                        mt: 2,
                      }}
                    >
                      Included
                    </Typography>
                    <ul>
                      {packagedata?.overView?.packageInclude?.map(
                        (item, index) => (
                          <li key={index}>
                            <Typography
                              sx={{
                                fontSize: "13px",
                                color: "var(--primary-button)",
                              }}
                            >
                              {item}
                            </Typography>
                          </li>
                        )
                      )}
                    </ul>
                    <Typography
                      fontWeight={600}
                      sx={{
                        fontSize: "13px",
                        color: "var(--primary-button)",
                      }}
                    >
                      Not Included
                    </Typography>
                    <ul>
                      <li>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "var(--primary-button)",
                          }}
                        >
                          {packagedata?.objective?.exclusion ||
                            "Details not available"}
                        </Typography>
                      </li>
                    </ul>
                  </>
                )}
              </Box>

              {/* Destination Details */}
              <Box
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("destinationDetails")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon3}
                      alt="Destination Details Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    Destination Details
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.destinationDetails
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.destinationDetails && (
                  <ul>
                    {packagedata?.overView?.destinationDetails?.map(
                      (detail, index) => (
                        <li key={index}>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              color: "var(--primary-button)",
                            }}
                          >
                            {detail}
                          </Typography>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </Box>

              {/* Traveler Info */}
              <Box
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("travelerInfo")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon4}
                      alt="Traveler Info Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    Traveler Info
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.travelerInfo
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.travelerInfo && (
                  <>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        color: "var(--primary-button)",
                        mt: 2,
                      }}
                    >
                      <strong>Age Requirement:</strong>{" "}
                      {packagedata?.introduction?.minimumAge || "N/A"}–
                      {packagedata?.introduction?.maximumAge || "N/A"} years
                    </Typography>
                    <Typography
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      <strong>Group Size:</strong> Max{" "}
                      {packagedata?.introduction?.totalSeat || "N/A"} persons
                    </Typography>
                    <Typography
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      <strong>Flights Included:</strong>{" "}
                      {packagedata?.introduction?.withAirFare ? "Yes" : "No"}
                    </Typography>
                    <Typography
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      <strong>Hotel Included:</strong>{" "}
                      {packagedata?.introduction?.withHotel ? "Yes" : "No"}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Schedule & Duration */}
              <Box
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("scheduleDuration")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon5}
                      alt="Schedule & Duration Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    Schedule & Duration
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.scheduleDuration
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.scheduleDuration && (
                  <>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        color: "var(--primary-button)",
                        mt: 2,
                      }}
                    >
                      <strong>Start Date:</strong>{" "}
                      {packagedata?.introduction?.journeyStartDate || "N/A"}
                    </Typography>
                    <Typography
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      <strong>End Date:</strong>{" "}
                      {packagedata?.introduction?.journeyEndDate || "N/A"}
                    </Typography>
                    <Typography
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      <strong>Duration:</strong>{" "}
                      {packagedata?.introduction?.journeyDuration || "N/A"}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Travel Tips */}
              <Box
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("travelTips")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon6}
                      alt="Travel Tips Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    Travel Tips
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.travelTips
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.travelTips && (
                  <ul>
                    {packagedata?.objective?.travelTips?.map((tip, index) => (
                      <li key={index}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "var(--primary-button)",
                          }}
                        >
                          {tip}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                )}
              </Box>

              {/* Booking & Refund Policy */}
              <Box
                sx={{
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSectionVisibility("bookingPolicy")}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <Box
                      component="img"
                      src={icon7}
                      alt="Booking & Refund Policy Icon"
                      sx={{ width: "24px", height: "24px" }}
                    />
                    Booking & Refund Policy
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: "24px",
                      color: "var(--primary-button)",
                      transform: visibleSections.bookingPolicy
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </Typography>

                {visibleSections.bookingPolicy && (
                  <>
                    {/* Booking Terms */}
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "16px",
                        mb: 1,
                        color: "var(--primary-button)",
                      }}
                    >
                      Booking Terms
                    </Typography>
                    <Typography
                      sx={{
                        mb: 2,
                        fontSize: "13px",
                        color: "var(--primary-button)",
                      }}
                    >
                      {packagedata?.objective?.bookingPolicy?.map(
                        (term, index) => (
                          <div key={index}>• {term}</div>
                        )
                      )}
                    </Typography>

                    {/* Refund Policy */}
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "16px",
                        mb: 1,
                        color: "var(--primary-button)",
                      }}
                    >
                      Refund Policy
                    </Typography>
                    <Typography
                      sx={{
                        mb: 2,
                        whiteSpace: "pre-line",
                        fontSize: "13px",
                        color: "var(--primary-button)",
                      }}
                    >
                      {packagedata?.objective?.refundPolicy ||
                        "Details not available"}
                    </Typography>

                    {/* Cancellation Policy */}
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "16px",
                        mb: 1,
                        color: "var(--primary-button)",
                      }}
                    >
                      Cancellation Policy
                    </Typography>
                    <Typography
                      sx={{
                        mb: 2,
                        whiteSpace: "pre-line",
                        fontSize: "13px",
                        color: "var(--primary-button)",
                      }}
                    >
                      {packagedata?.objective?.cancellationPolicy ||
                        "Details not available"}
                    </Typography>
                  </>
                )}
              </Box>
            </Grid>

            {/* Right: Consultation Form */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  backgroundColor: "#0B3B65",
                  borderRadius: "10px",
                  pt: 3,
                  px: 0.5,
                  pb: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  Free Consultation
                </Typography>
                <Typography
                  sx={{
                    fontSize: "13px",
                    mb: 2,
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  Let’s Plan Your Tour
                </Typography>

                <Box
                  sx={{ backgroundColor: "white", p: 2, borderRadius: "10px" }}
                >
                  <TextField fullWidth label="First Name" margin="dense" />
                  <TextField fullWidth label="Last Name" margin="dense" />
                  <TextField fullWidth label="Email" margin="dense" />
                  <TextField
                    fullWidth
                    label="Phone Number"
                    margin="dense"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">+880</InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="When Would You Like to Travel?"
                    margin="dense"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <EventIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Anything Special You Need?"
                    margin="dense"
                    multiline
                    rows={3}
                  />
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      // fullWidth
                      variant="contained"
                      sx={{
                        backgroundColor: "#0B3B65",
                        color: "white",
                        mt: 2,
                        borderRadius: "8px",
                        textTransform: "none",
                      }}
                    >
                      Submit
                    </Button>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  backgroundColor: "#0B3B65",
                  borderRadius: "12px",
                  pt: 3,
                  pb: 0.5,
                  px: 0.5,
                  mt: 2,
                }}
              >
                <Typography
                  sx={{ color: "white", fontSize: "20px", fontWeight: 700 }}
                  textAlign="center"
                  mb={2}
                >
                  Contact Us
                </Typography>

                <Box
                  sx={{
                    backgroundColor: "white",
                    p: 3,
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  {/* Call Section */}
                  <Box
                    sx={{
                      textAlign: "center",
                      flex: 1,
                      // minWidth: "150px"
                    }}
                  >
                    <Box sx={{ mb: 1 }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="32"
                        viewBox="0 0 24 24"
                        width="32"
                        fill="#0B3B65"
                      >
                        <path d="M0 0h24v24H0V0z" fill="none" />
                        <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.05-.24c1.12.37 2.33.57 3.54.57.55 0 1 .45 1 1v3.5a1 1 0 01-1 1C10.07 22 2 13.93 2 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.21.2 2.42.57 3.54a1 1 0 01-.24 1.05l-2.2 2.2z" />
                      </svg>
                    </Box>
                    <Typography
                      fontWeight={600}
                      mb={0.5}
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      Call
                    </Typography>
                    <Typography
                      fontSize="13px"
                      color="text.secondary"
                      mb={0.5}
                      sx={{ color: "var(--primary-button)" }}
                    >
                      Can't reach us over the call Center?
                    </Typography>
                    <Typography
                      fontWeight={600}
                      fontSize="13px"
                      color="#0B3B65"
                      sx={{ color: "var(--primary-button)" }}
                    >
                      +880 1736-987906
                    </Typography>
                  </Box>

                  {/* Chat Section */}
                  <Box
                    sx={{
                      textAlign: "center",
                      flex: 1,
                      // minWidth: "150px"
                    }}
                  >
                    <Box sx={{ mb: 1 }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="32"
                        viewBox="0 0 24 24"
                        width="32"
                        fill="#0B3B65"
                      >
                        <path d="M0 0h24v24H0V0z" fill="none" />
                        <path d="M4 4h16v12H5.17L4 17.17V4zm0-2c-1.1 0-2 .9-2 2v20l4-4h14c1.1 0 2-.9 2-2V4a2 2 0 00-2-2H4z" />
                      </svg>
                    </Box>
                    <Typography
                      fontWeight={600}
                      mb={0.5}
                      sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                    >
                      Chat with us
                    </Typography>
                    <Typography
                      fontSize="13px"
                      color="text.secondary"
                      mb={0.5}
                      sx={{ color: "var(--primary-button)" }}
                    >
                      Our team is here to help.
                    </Typography>
                    <Typography
                      fontWeight={600}
                      fontSize="13px"
                      color="#0B3B65"
                      sx={{ color: "var(--primary-button)" }}
                    >
                      m.me/flyjatt
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default TourDetails;
