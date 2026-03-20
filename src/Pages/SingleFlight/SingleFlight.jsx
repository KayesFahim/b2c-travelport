import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Grid,
  Tab,
  Typography,
  Button,
  Collapse,
  Checkbox,
  Tabs,
  Dialog,
  Slide,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import GoogleIcon from "@mui/icons-material/Google";
import PhoneIcon from "@mui/icons-material/Phone";
import moment from "moment";
import commaNumber from "comma-number";
import { Link, useLocation, useNavigate } from "react-router-dom";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import Swal from "sweetalert2";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import secureLocalStorage from "react-secure-storage";
import { convertMinutesToHoursAndMinutes } from "../common/funcation";
import ShowDetails from "../ShowDetails/ShowDetails";
import FlightLayout from "./FlightLayout";
import { config } from "../../config";
import SignInWithGoogle from "../GoogleLogIn";
import { toast } from "react-toastify";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import AirlineSeatReclineNormalRoundedIcon from "@mui/icons-material/AirlineSeatReclineNormalRounded";
import PowerRoundedIcon from "@mui/icons-material/PowerRounded";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import FlightRoundedIcon from "@mui/icons-material/FlightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { resolveAirportInfo } from "../../utils/travelLookup";
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const extractAmenityItem = (item) => {
  if (typeof item === "string") {
    return {
      category: "General",
      text: item.trim(),
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const text =
    (typeof item.text === "string" && item.text.trim()) ||
    (item.Text &&
      typeof item.Text === "object" &&
      typeof item.Text.value === "string" &&
      item.Text.value.trim()) ||
    (typeof item.headline === "string" && item.headline.trim()) ||
    "";

  if (!text) {
    return null;
  }

  return {
    category:
      (typeof item.category === "string" && item.category.trim()) ||
      (typeof item.Category === "string" && item.Category.trim()) ||
      "General",
    text,
  };
};

const getFlightAmenities = (flightData) => {
  const legs = Array.isArray(flightData?.AllLegsInfo) ? flightData.AllLegsInfo : [];
  const collected = [];

  for (const leg of legs) {
    const segments = Array.isArray(leg?.Segments) ? leg.Segments : [];

    for (const segment of segments) {
      const amenitiesObj = segment?.Amenities || segment?.amenities || {};

      const amenityItems = Array.isArray(amenitiesObj?.items)
        ? amenitiesObj.items
        : Array.isArray(amenitiesObj?.amenities)
        ? amenitiesObj.amenities
        : Array.isArray(amenitiesObj)
        ? amenitiesObj
        : [];

      for (const item of amenityItems) {
        const amenity = extractAmenityItem(item);
        if (amenity) {
          collected.push(amenity);
        }
      }

      const universalItems = Array.isArray(
        amenitiesObj?.universalProductAttributes
      )
        ? amenitiesObj.universalProductAttributes
        : [];

      for (const item of universalItems) {
        const amenity = extractAmenityItem(item);
        if (amenity) {
          collected.push(amenity);
        }
      }

      const byCategory = amenitiesObj?.byCategory || segment?.amenitiesByCategory;
      if (byCategory && typeof byCategory === "object") {
        for (const [category, values] of Object.entries(byCategory)) {
          if (Array.isArray(values)) {
            for (const value of values) {
              const amenity = extractAmenityItem(value);
              if (amenity) {
                collected.push({
                  category: amenity.category || category || "General",
                  text: amenity.text,
                });
              }
            }
          }
        }
      }
    }
  }

  const uniqueAmenities = Array.from(
    new Set(
      collected
        .map((item) => ({
          category: String(item.category || "General").trim(),
          text: String(item.text || "").replace(/\s+/g, " ").trim(),
        }))
        .filter((item) => item.text.length > 0)
        .map((item) => JSON.stringify(item))
    )
  ).map((item) => JSON.parse(item));

  return uniqueAmenities.slice(0, 10);
};

const getAmenityIcon = (category = "") => {
  const normalized = String(category).toLowerCase();

  if (normalized.includes("wifi")) {
    return <WifiRoundedIcon sx={{ fontSize: "18px" }} />;
  }
  if (normalized.includes("food") || normalized.includes("meal") || normalized.includes("beverage")) {
    return <RestaurantRoundedIcon sx={{ fontSize: "18px" }} />;
  }
  if (normalized.includes("seat") || normalized.includes("layout")) {
    return <AirlineSeatReclineNormalRoundedIcon sx={{ fontSize: "18px" }} />;
  }
  if (normalized.includes("power")) {
    return <PowerRoundedIcon sx={{ fontSize: "18px" }} />;
  }
  if (normalized.includes("entertainment")) {
    return <LiveTvRoundedIcon sx={{ fontSize: "18px" }} />;
  }
  if (normalized.includes("bag")) {
    return <LuggageRoundedIcon sx={{ fontSize: "18px" }} />;
  }
  if (normalized.includes("aircraft")) {
    return <FlightRoundedIcon sx={{ fontSize: "18px" }} />;
  }

  return <InfoOutlinedIcon sx={{ fontSize: "18px" }} />;
};

const getBrandName = (flightData) => {
  return (
    flightData?.AllLegsInfo?.[0]?.BrandName ||
    flightData?.AllLegsInfo?.[0]?.BrandFeatures?.name ||
    flightData?.FareType ||
    "Standard"
  );
};

const getBrandFeatureSummary = (flightData) => {
  const features = flightData?.AllLegsInfo?.[0]?.BrandFeatures || {};
  const primary = Array.isArray(features?.BrandAttribute)
    ? features.BrandAttribute
    : [];
  const additional = Array.isArray(features?.AdditionalBrandAttribute)
    ? features.AdditionalBrandAttribute
    : [];

  const allFeatures = [...primary, ...additional]
    .map((item) => ({
      name: item?.classification || item?.Classification || "",
      inclusion: item?.inclusion || item?.Inclusion || "",
    }))
    .filter((item) => item.name);

  const included = Array.from(
    new Set(
      allFeatures
        .filter((item) => String(item.inclusion).toLowerCase() === "included")
        .map((item) => item.name)
    )
  );

  const chargeable = Array.from(
    new Set(
      allFeatures
        .filter((item) => String(item.inclusion).toLowerCase() === "chargeable")
        .map((item) => item.name)
    )
  );

  const notOffered = Array.from(
    new Set(
      allFeatures
        .filter((item) =>
          ["not offered", "notoffered"].includes(
            String(item.inclusion).toLowerCase().replace(/\s+/g, "")
          )
        )
        .map((item) => item.name)
    )
  );

  return {
    included: included.slice(0, 3),
    chargeable: chargeable.slice(0, 2),
    notOffered: notOffered.slice(0, 2),
  };
};

const getFareOptionKey = (option, index = 0) =>
  String(
    option?.ResultId ||
      `${option?.SearchId || "search"}-${option?.Carrier || "carrier"}-${
        option?.NetFare || 0
      }-${index}`
  );

const getLayoverDetails = (segments = []) => {
  if (!Array.isArray(segments) || segments.length < 2) return [];

  return segments.slice(0, -1).map((segment, index) => {
    const nextSegment = segments[index + 1] || {};
    const arrTime = moment(segment?.ArrTime);
    const depTime = moment(nextSegment?.DepTime);
    const connectionMinutes =
      arrTime.isValid() && depTime.isValid()
        ? Math.max(depTime.diff(arrTime, "minutes"), 0)
        : null;

    const layoverCode = segment?.ArrTo || nextSegment?.DepFrom || "";
    const layoverNameFallback =
      segment?.ArrAirPort || nextSegment?.DepAirPort || "";
    const layoverAddressFallback =
      segment?.ArrLocation || nextSegment?.DepLocation || "";
    const layoverAirportInfo = resolveAirportInfo(
      layoverCode,
      layoverNameFallback,
      layoverAddressFallback
    );

    return {
      code: layoverAirportInfo.code || layoverCode || "--",
      name: layoverAirportInfo.name || layoverNameFallback || "Transit airport",
      address: layoverAirportInfo.address || layoverAddressFallback,
      duration:
        connectionMinutes === null
          ? "N/A"
          : convertMinutesToHoursAndMinutes(connectionMinutes),
    };
  });
};

const SingleFlight = ({ data, groupedFlights = [] }) => {
  const [flightDetails, setFlightDetails] = useState(false);
  const token = secureLocalStorage.getItem("access_token");
  const navigate = useNavigate();
  const [value, setValue] = React.useState("1");
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  console.log("dataA", data);
  const fareOptions = (
    Array.isArray(groupedFlights) && groupedFlights.length > 0
      ? groupedFlights
      : [data]
  )
    .filter(Boolean)
    .sort((a, b) => Number(a?.NetFare || 0) - Number(b?.NetFare || 0));
  const fareOptionKeys = fareOptions.map((option, index) =>
    getFareOptionKey(option, index)
  );
  const [selectedFareKey, setSelectedFareKey] = useState(
    fareOptionKeys[0] || ""
  );
  const [isBrandedFareExpanded, setIsBrandedFareExpanded] = useState(true);

  useEffect(() => {
    if (fareOptionKeys.length === 0) {
      setSelectedFareKey("");
      return;
    }
    setSelectedFareKey((prevKey) =>
      fareOptionKeys.includes(prevKey) ? prevKey : fareOptionKeys[0]
    );
  }, [fareOptionKeys.join("|")]);

  const selectedFareOption =
    fareOptions.find(
      (option, index) => getFareOptionKey(option, index) === selectedFareKey
    ) || fareOptions[0] || data;

  const flightAmenities = getFlightAmenities(data);

  const getCabinClass = (cabinCode) => {
    switch (cabinCode) {
      case "M":
      case "Y":
      case "Economy":
        return "Economy";
      case "C":
      case "I":
      case "Business":
        return "Business";
      case "P":
      case "First":
        return "First";
      case "S":
      case "U":
        return "Premium Economy";
      default:
        return "Economy";
    }
  };

  const convertWeight = (data) => {
    const rawValue = String(data ?? "").trim();
    if (!rawValue) {
      return "N/A";
    }

    const mappings = {
      "1P": "23Kg",
      "2P": "46Kg",
      "1 N": "23 Kg",
      "2 N": "46 Kg",
    };
    return (
      mappings[rawValue] ||
      (rawValue.endsWith("Kg")
        ? rawValue
        : rawValue.replace(/K$/i, "Kg"))
    );
  };

  const handleBooking = (data) => {
    navigate("/bookingdetails", { state: data });
  };
  const [openPass, setOpenPass] = useState(false);
  const location = useLocation();
  const [openSignIn, setOpenSignIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const user = secureLocalStorage.getItem("userData");
  const [isLoading, setIsLoading] = useState(false);
  const datas = secureLocalStorage.getItem("data");
  const togglePasswordVisibility = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };

  const handleClickSignInOpen = () => {
    setOpenSignIn(true);
    setOpenSignUp(false);
  };
  const handleClickSignUpOpen = () => {
    setOpenSignUp(true);
    setOpenSignIn(false);
  };

  const handleSignInClose = () => {
    setOpenSignIn(false);
  };
  const handleSignUpClose = () => {
    setOpenSignUp(false);
  };

  // login funcatinolity
  const [lodaing, setLoading] = useState(false);
  const [userSignInInfo, setUserSignInInfo] = useState({
    signInEmail: "",
    signInPass: "",
  });

  const handleUserSignInInfo = (e) => {
    const { name, value } = e.target;
    setUserSignInInfo((prevSignInfo) => ({
      ...prevSignInfo,
      [name]: value,
    }));
  };

  if (lodaing) {
    <Typography>loading</Typography>;
  }
  const handleForgetPassEmailOpen = () => {
    setOpenPass(true);
    setOpenSignIn(false);
  };

  const handleSubmitUserSignInInfo = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let body = {
      email: String(userSignInInfo?.signInEmail),
      password: String(userSignInInfo?.signInPass),
    };
    try {
      const response = await fetch(`${config.baseUrl}/auth/signInUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        secureLocalStorage.setItem("access_token", data?.access_token);
        secureLocalStorage.setItem("userData", data?.userData);
        secureLocalStorage.setItem("data", data);

        // Reset the form fields
        setUserSignInInfo({
          signInEmail: "",
          signInPass: "",
        });

        toast.success(data.message || "User signed in successfully!", {
          position: "top-right",
          autoClose: 5000,
          closeOnClick: false,
        });
        setOpenSignIn(false); // Reopen the dialog when user clicks OK
      } else {
        toast.error(data.message || "Error signing in. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          closeOnClick: false,
        });
      }
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Something went wrong. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        closeOnClick: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // signUp and register
  const [userInfo, setUserInfo] = useState({
    userName: "",
    userEmail: "",
    userPass: "",
    userPhone: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prevUserInfo) => ({
      ...prevUserInfo,
      [name]: value,
    }));
    validateField(name, value); // Validate field while typing
  };

  const validateField = (name, value) => {
    let errorMessage = "";

    switch (name) {
      case "userName":
        if (!value.trim()) {
          errorMessage = "Name cannot be empty.";
        }
        break;
      case "userEmail":
        if (!value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          errorMessage = "The email address field must be a valid email.";
        }
        break;
      case "userPass":
        if (!value.match(/^(?=.*[A-Za-z])[A-Za-z\d]{6,}$/)) {
          // Updated regex for 6 characters
          errorMessage =
            "Password must be at least 6 characters long, and contain at least one letter.";
        }
        break;
      case "userPhone":
        if (!value.match(/^\d{11}$/)) {
          errorMessage =
            "Please enter a valid 11-digit phone number without country code.";
        }
        break;
      default:
        break;
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: errorMessage,
    }));
  };

  const handleUserSignUp = async (e) => {
    e.preventDefault();
    setOpenSignUp(false);

    const hasErrors = Object.values(errors).some((error) => error !== "");
    if (hasErrors) {
      Swal.fire({
        icon: "error",
        title: "Sign up failed",
        text: "Please fix the errors in the form.",
        confirmButtonText: "Try Again",
      });
      return;
    }

    let body = {
      fullName: userInfo.userName,
      email: userInfo.userEmail,
      password: userInfo.userPass,
      phone: userInfo.userPhone,
    };

    try {
      const response = await fetch(`${config.baseUrl}/user/signUp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: data?.message || "User signed up successfully!",
          confirmButtonText: "OK",
        });

        setUserInfo({
          userName: "",
          userEmail: "",
          userPass: "",
          userPhone: "",
        });
        setErrors({});
      } else {
        Swal.fire({
          icon: "error",
          title: "Sign up failed",
          text:
            data.message ||
            "There was an issue with the sign up. Please try again.",
          confirmButtonText: "Try Again",
        });
      }
    } catch (error) {
      console.error("Error signing up:", error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong. Please try again later.",
        confirmButtonText: "Try Again",
      });
    }
  };

  const primaryLeg =
    selectedFareOption?.AllLegsInfo?.[0] || data?.AllLegsInfo?.[0];
  const seatAvailability =
    primaryLeg?.Segments?.[0]?.SegmentCode?.seatsAvailable ?? null;
  const baggageAllowance = convertWeight(
    selectedFareOption?.PriceBreakDown?.[0]?.Bag?.[0]?.Allowance ||
      data?.PriceBreakDown?.[0]?.Bag?.[0]?.Allowance
  );
  const cabinClassLabel = getCabinClass(
    primaryLeg?.Segments?.[0]?.SegmentCode?.cabinCode
  );
  const totalStops = Math.max((primaryLeg?.Segments?.length || 1) - 1, 0);
  const stopLabel = totalStops === 0 ? "Non-stop" : `${totalStops} Stop${totalStops > 1 ? "s" : ""}`;
  const layoverDetails = getLayoverDetails(primaryLeg?.Segments || []);
  const hasLayoverDetails = layoverDetails.length > 0;
  const journeyDuration = convertMinutesToHoursAndMinutes(primaryLeg?.Duration || 0);
  const fareCurrencyCode = getFlightCurrencyCode(selectedFareOption);
  const fareCurrencySymbol = getCurrencySymbol(fareCurrencyCode);
  const formatFare = (amount, currencyCode = fareCurrencyCode, currencySymbol = fareCurrencySymbol) => {
    const normalizedAmount = commaNumber(Number(amount || 0));
    if (!currencySymbol || currencySymbol === currencyCode) {
      return `${currencyCode} ${normalizedAmount}`;
    }
    return `${currencySymbol}${normalizedAmount}`;
  };
  const netFareLabel = formatFare(selectedFareOption?.NetFare);
  const grossFareLabel = formatFare(selectedFareOption?.GrossFare);
  const brandName = getBrandName(selectedFareOption);

  return (
    <Box
      sx={{
        border: "1px solid rgba(0, 154, 214, 0.24)",
        borderRadius: { xs: "14px", md: "18px" },
        backgroundColor: "#fff",
        boxShadow: "0 14px 34px rgba(12, 40, 70, 0.09)",
        overflow: "hidden",
      }}
    >
      <Grid container>
        <Grid item xs={12} md={8.7}>
          <Box
            sx={{
              p: { xs: 1.1, md: 1.35 },
              background:
                "linear-gradient(180deg, rgba(248,253,255,1) 0%, rgba(244,250,255,0.9) 100%)",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.7, mb: 1 }}>
              <Tooltip
                arrow
                placement="bottom"
                disableHoverListener={!hasLayoverDetails}
                title={
                  hasLayoverDetails ? (
                    <Box sx={{ py: 0.3 }}>
                      {layoverDetails.map((layover, index) => (
                        <Box
                          key={`summary-layover-${index}`}
                          sx={{ mb: index === layoverDetails.length - 1 ? 0 : 0.7 }}
                        >
                          <Typography
                            sx={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#fff",
                              lineHeight: 1.25,
                            }}
                          >
                            Connection {index + 1}: {layover.duration}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#E4EEFF",
                              lineHeight: 1.25,
                            }}
                          >
                            {layover.code} - {layover.name}
                          </Typography>
                          {layover.address ? (
                            <Typography
                              sx={{
                                fontSize: "10px",
                                color: "#C7DAF5",
                                lineHeight: 1.2,
                              }}
                            >
                              {layover.address}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    ""
                  )
                }
              >
                <Box
                  sx={{
                    px: 1,
                    py: 0.45,
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    bgcolor: "rgba(0,154,214,0.12)",
                    color: "var(--primary-color)",
                    cursor: hasLayoverDetails ? "help" : "default",
                    textDecoration: hasLayoverDetails ? "underline dotted" : "none",
                    textUnderlineOffset: "2px",
                  }}
                >
                  {stopLabel}
                </Box>
              </Tooltip>
              <Box
                sx={{
                  px: 1,
                  py: 0.45,
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  bgcolor: "rgba(15,35,60,0.08)",
                  color: "var(--meta-black)",
                }}
              >
                {journeyDuration}
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.45,
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  bgcolor: "rgba(0,154,214,0.12)",
                  color: "var(--primary-color)",
                }}
              >
                {cabinClassLabel}
              </Box>
            </Box>

            <Box
              sx={{
                border: "1px solid rgba(0,154,214,0.16)",
                borderRadius: "14px",
                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              {data?.AllLegsInfo?.map((alllegs, i, arr) => (
                <Box
                  key={i}
                  sx={{
                    px: { xs: 0.9, md: 1.15 },
                    py: { xs: 0.75, md: 0.95 },
                    borderBottom:
                      i === (data?.AllLegsInfo?.length || 1) - 1
                        ? "none"
                        : "1px dashed rgba(0,154,214,0.18)",
                  }}
                >
                  <FlightLayout data={data} alllegs={alllegs} arr={arr} i={i} />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={3.3}>
          <Box
            sx={{
              height: "100%",
              borderLeft: { xs: "none", md: "1px solid rgba(0,154,214,0.18)" },
              borderTop: { xs: "1px solid rgba(0,154,214,0.18)", md: "none" },
              background:
                "linear-gradient(165deg, rgba(255,255,255,1) 0%, rgba(238,248,255,0.95) 100%)",
              p: { xs: 1.2, md: 1.4 },
              display: "flex",
              flexDirection: "column",
              gap: 1.05,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--text-color)",
                  mb: 0.3,
                }}
              >
                Total Fare
              </Typography>
              <Typography
                sx={{
                  color: "var(--depature-color)",
                  fontSize: { xs: "24px", md: "28px" },
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {netFareLabel}
              </Typography>
              <Typography
                sx={{
                  color: "var(--text-color)",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                <del>{grossFareLabel}</del>
              </Typography>
              <Typography
                sx={{
                  mt: 0.45,
                  color: "#5D7590",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                noWrap
              >
                {brandName} fare
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.7 }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.45,
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  bgcolor:
                    selectedFareOption?.Refundable === true
                      ? "rgba(15,139,88,0.12)"
                      : "rgba(214,31,52,0.12)",
                  color:
                    selectedFareOption?.Refundable === true
                      ? "var(--refundable-color)"
                      : "var(--darak-red-color)",
                }}
              >
                {selectedFareOption?.Refundable === true
                  ? "Refundable"
                  : "Non Refundable"}
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.45,
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  bgcolor: "rgba(0,154,214,0.12)",
                  color: "var(--primary-color)",
                }}
              >
                Bag {baggageAllowance}
              </Box>
              {seatAvailability !== null && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.45,
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    bgcolor: "rgba(15,35,60,0.08)",
                    color: "var(--meta-black)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.4,
                  }}
                >
                  {seatAvailability} Seats
                  <EventSeatIcon sx={{ fontSize: "14px" }} />
                </Box>
              )}
            </Box>

            <Button
              onClick={() => handleBooking(selectedFareOption || data || [])}
              sx={{
                bgcolor: "var(--primary-button)",
                color: "var(--white)",
                width: "100%",
                mt: "auto",
                ":hover": {
                  bgcolor: "var(--primary-button)",
                  color: "var(--white)",
                },
                py: 0.9,
                borderRadius: "11px",
                textTransform: "capitalize",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: "0 8px 18px rgba(0,154,214,0.24)",
              }}
            >
              Book Now • {netFareLabel}
            </Button>
          </Box>
        </Grid>
      </Grid>
      {fareOptions.length > 1 && (
        <Accordion
          expanded={isBrandedFareExpanded}
          onChange={(_, expanded) => setIsBrandedFareExpanded(expanded)}
          disableGutters
          sx={{
            borderTop: "1px dashed #DCE4EF",
            backgroundColor: "#FBFDFF",
            boxShadow: "none",
            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRoundedIcon sx={{ color: "#2E597D" }} />}
            sx={{
              px: { xs: 1.1, md: 1.35 },
              minHeight: "unset",
              "& .MuiAccordionSummary-content": {
                my: 1.05,
                display: "flex",
                alignItems: { xs: "flex-start", md: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", md: "row" },
                gap: 0.6,
              },
            }}
          >
            <Box
              sx={{
                color: "#27496A",
                fontSize: { xs: "11px", md: "12px" },
                fontWeight: 700,
              }}
            >
              Branded Fare Options ({fareOptions.length})
            </Box>
            <Typography
              sx={{
                fontSize: "12px",
                color: "#4C657F",
                fontWeight: 700,
              }}
            >
              Selected: {getBrandName(selectedFareOption)} • {netFareLabel}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.1, md: 1.35 }, pb: 1.2, pt: 0 }}>
            <Box
              sx={{
                direction: "rtl",
                overflowX: "auto",
                overflowY: "hidden",
                pb: 0.35,
                "&::-webkit-scrollbar": {
                  height: "7px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(0,154,214,0.28)",
                  borderRadius: "999px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "rgba(15,35,60,0.06)",
                  borderRadius: "999px",
                },
              }}
            >
              <Box
                sx={{
                  direction: "ltr",
                  display: "flex",
                  alignItems: "stretch",
                  gap: 0.85,
                  minWidth: "max-content",
                  pr: 0.2,
                }}
              >
                {fareOptions.map((option, index) => {
                  const optionKey = getFareOptionKey(option, index);
                  const isSelected = selectedFareKey === optionKey;
                  const brandSummary = getBrandFeatureSummary(option);
                  const optionCurrencyCode = getFlightCurrencyCode(option);
                  const optionCurrencySymbol = getCurrencySymbol(optionCurrencyCode);
                  const optionFareLabel = formatFare(
                    option?.NetFare,
                    optionCurrencyCode,
                    optionCurrencySymbol
                  );
                  const featureLine = [
                    brandSummary.included.length > 0
                      ? `Included: ${brandSummary.included.join(", ")}`
                      : "",
                    brandSummary.chargeable.length > 0
                      ? `Chargeable: ${brandSummary.chargeable.join(", ")}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setSelectedFareKey(optionKey)}
                      key={optionKey}
                      sx={{
                        border: isSelected
                          ? "1px solid var(--primary-button)"
                          : "1px solid #E2E9F4",
                        borderRadius: "10px",
                        px: 1.15,
                        py: 0.85,
                        minWidth: { xs: "240px", md: "286px" },
                        maxWidth: { xs: "240px", md: "286px" },
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                        backgroundColor: isSelected ? "#E9F6FF" : "#FFFFFF",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "var(--primary-button)",
                          boxShadow: "0 8px 18px rgba(0,154,214,0.14)",
                        },
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: { xs: "11px", md: "12px" },
                            fontWeight: 700,
                            color: "#1E3B5A",
                            lineHeight: 1.2,
                          }}
                        >
                          {getBrandName(option)}
                          {index === 0 ? " • Best Price" : ""}
                        </Typography>
                        {featureLine ? (
                          <Typography
                            sx={{
                              fontSize: { xs: "10px", md: "11px" },
                              color: "#526B86",
                              lineHeight: 1.2,
                              mt: 0.2,
                              maxWidth: { xs: "138px", md: "175px" },
                            }}
                          >
                            {featureLine}
                          </Typography>
                        ) : (
                          <Typography
                            sx={{
                              fontSize: { xs: "10px", md: "11px" },
                              color: "#7C8FA3",
                              lineHeight: 1.2,
                              mt: 0.2,
                            }}
                          >
                            Fare details available
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography
                          sx={{
                            fontSize: { xs: "12px", md: "13px" },
                            color: "#0C3F68",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {optionFareLabel}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.25,
                            fontSize: "10px",
                            fontWeight: 700,
                            color: isSelected ? "var(--primary-button)" : "#6F8296",
                          }}
                        >
                          {isSelected ? "Selected Fare" : "Tap to Select"}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <Typography
              sx={{
                mt: 0.8,
                fontSize: "11px",
                color: "#5F7389",
                fontWeight: 600,
              }}
            >
              Choose any branded fare above. Book Now will continue with selected fare.
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}
      {flightAmenities.length > 0 && (
        <Box
          sx={{
            px: { xs: 1.1, md: 1.35 },
            pt: 1,
            pb: 0.75,
            borderTop: "1px dashed #DCE4EF",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.8,
            }}
          >
            {flightAmenities.map((amenity, index) => (
              <Tooltip
                key={`${amenity?.category}-${amenity?.text}-${index}`}
                title={`${amenity?.category}: ${amenity?.text}`}
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: "1px solid #D9E5F5",
                    backgroundColor: "#F7FAFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1F4D78",
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "#EEF5FF",
                    },
                  }}
                >
                  {getAmenityIcon(amenity?.category)}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          px: { xs: 1.1, md: 1.35 },
          py: 1,
          borderTop: "1px dashed rgba(0,154,214,0.2)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.9 }}>
          <Box
            sx={{
              px: 1,
              py: 0.45,
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              bgcolor: "rgba(15,35,60,0.08)",
              color: "var(--meta-black)",
            }}
          >
            {cabinClassLabel}
          </Box>
          <Box
            sx={{
              px: 1,
              py: 0.45,
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              bgcolor: "rgba(0,154,214,0.12)",
              color: "var(--primary-color)",
            }}
          >
            Baggage {baggageAllowance}
          </Box>
          {seatAvailability !== null && (
            <Box
              sx={{
                px: 1,
                py: 0.45,
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                bgcolor: "rgba(15,35,60,0.08)",
                color: "var(--meta-black)",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
              }}
            >
              {seatAvailability}
              <EventSeatIcon sx={{ fontSize: "14px", color: "var(--primary-button)" }} />
            </Box>
          )}
        </Box>

        <Button
          onClick={() => setFlightDetails(!flightDetails)}
          sx={{
            textTransform: "none",
            fontSize: { xs: "12px", md: "13px" },
            fontWeight: 700,
            color: "var(--primary-button)",
            border: "1px solid rgba(0,154,214,0.24)",
            borderRadius: "999px",
            px: 1.8,
            py: 0.5,
            "&:hover": {
              borderColor: "var(--primary-color)",
              background: "rgba(0,154,214,0.08)",
            },
          }}
        >
          {flightDetails ? "Hide Details" : "Show Details"}
        </Button>
      </Box>
      {flightDetails && (
        <ShowDetails
          data={data}
          flightDetails={flightDetails}
          value={value}
          handleChange={handleChange}
          onCloseDetails={() => setFlightDetails(false)}
        />
      )}

      {/* sigUp / Register dailog */}
      <Dialog
        open={openSignUp}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleSignUpClose}
        aria-describedby="alert-dialog-slide-description"
        maxWidth="xl"
        sx={{
          height: { xs: "100vh", sm: "100vh", md: "100vh" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px 0px",
          }}
        >
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 1)",
              boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
              // height: "",
              width: "450px",
              borderRadius: "5px",
              padding: "20px 60px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #D9D9D9",
                justifyContent: "center",
                height: "40px",
                borderRadius: "3px",
              }}
            >
              <GoogleIcon sx={{ color: "var(--primary-button)" }} />
              <Typography sx={{ color: "#5F6368", pl: "5px" }}>
                {" "}
                Login with Google
              </Typography>
            </Box>

            <Box sx={{ py: "20px" }}>
              <Typography
                sx={{
                  color: "var(--primary-button)",
                  fontWeight: 600,
                  fontSize: "16px",
                }}
              >
                Sign Up
              </Typography>

              <form onSubmit={handleUserSignUp}>
                <Box sx={{ pt: "20px" }}>
                  {/* name input */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      borderBottom: "1px solid #D9D9D9",
                    }}
                  >
                    <PersonIcon sx={{ color: "var(--icons-color)" }} />
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                      >
                        Your Name
                      </Typography>
                      <input
                        name="userName"
                        required
                        value={userInfo.userName}
                        onChange={handleInputChange}
                        onBlur={(e) =>
                          validateField(e.target.name, e.target.value)
                        }
                        placeholder="Type Your Name"
                        style={{
                          border: "none",
                          outline: "none",
                          color: "black",
                          paddingTop: "5px",
                          paddingBottom: "8px",
                        }}
                      />
                      {errors.userName && (
                        <Typography sx={{ color: "red", fontSize: "12px" }}>
                          {errors.userName}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* email input */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "20px",
                      gap: "20px",
                      borderBottom: "1px solid #D9D9D9",
                    }}
                  >
                    <MailIcon sx={{ color: "var(--icons-color)" }} />
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                      >
                        Email
                      </Typography>
                      <input
                        placeholder="example@email.com"
                        type="email"
                        required
                        name="userEmail"
                        value={userInfo.userEmail}
                        onChange={handleInputChange}
                        onBlur={(e) =>
                          validateField(e.target.name, e.target.value)
                        }
                        style={{
                          border: "none",
                          outline: "none",
                          color: "black",
                          paddingTop: "5px",
                          paddingBottom: "8px",
                        }}
                      />
                      {errors.userEmail && (
                        <Typography sx={{ color: "red", fontSize: "12px" }}>
                          {errors.userEmail}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* password input */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "20px",
                      gap: "20px",
                      borderBottom: "1px solid #D9D9D9",
                    }}
                  >
                    <LockIcon sx={{ color: "var(--icons-color)" }} />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                      }}
                    >
                      <Typography
                        sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                      >
                        Password
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          position: "relative",
                        }}
                      >
                        <input
                          placeholder="**********"
                          type={showPassword ? "text" : "password"}
                          required
                          name="userPass"
                          value={userInfo.userPass}
                          onChange={handleInputChange}
                          onBlur={(e) =>
                            validateField(e.target.name, e.target.value)
                          }
                          style={{
                            border: "none",
                            outline: "none",
                            color: "black",
                            paddingTop: "5px",
                            paddingBottom: "8px",
                            width: "100%",
                          }}
                        />
                        <IconButton
                          onClick={togglePasswordVisibility}
                          sx={{ position: "absolute", right: 0 }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </Box>
                      {errors.userPass && (
                        <Typography sx={{ color: "red", fontSize: "12px" }}>
                          {errors.userPass}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Phone input */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "20px",
                      gap: "20px",
                      borderBottom: "1px solid #D9D9D9",
                    }}
                  >
                    <PhoneIcon sx={{ color: "var(--icons-color)" }} />
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                      >
                        Mobile
                      </Typography>
                      <input
                        placeholder="Type your Phone Number"
                        type="text"
                        name="userPhone"
                        required
                        value={userInfo.userPhone}
                        onChange={handleInputChange}
                        onBlur={(e) =>
                          validateField(e.target.name, e.target.value)
                        }
                        style={{
                          border: "none",
                          outline: "none",
                          color: "black",
                          paddingTop: "5px",
                          paddingBottom: "8px",
                        }}
                      />
                      {errors.userPhone && (
                        <Typography sx={{ color: "red", fontSize: "12px" }}>
                          {errors.userPhone}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "20px",
                      gap: "20px",
                    }}
                  >
                    <Checkbox checked sx={{ color: "var(--icons-color)" }} />
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        sx={{
                          fontSize: "12px",
                          color: "var(--primary-button)",
                          fontWeight: 600,
                        }}
                      >
                        By creating an account you agree to our Terms &
                        Conditions
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "var(--primary-button)",
                      mt: "20px",
                      width: "100%",
                      textTransform: "capitalize",
                      fontSize: "16px",
                      height: "40px",
                      color: "var(--white)",
                      ":hover": {
                        bgcolor: "var(--primary-button)",
                        color: "var(--white)",
                      },
                    }}
                  >
                    Sign Up
                  </Button>
                  <Box
                    sx={{
                      pt: "10px",
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "var(--primary-button)",
                        fontSize: "14px",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      Already have an Account?{" "}
                    </Typography>
                    <Box
                      onClick={handleClickSignInOpen}
                      style={{
                        textDecoration: "none",
                        color: "#5F646C",
                        fontSize: "14px",
                      }}
                    >
                      Sign In
                    </Box>
                  </Box>
                </Box>
              </form>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* sigIn / login dailog */}

      <Dialog
        open={openSignIn}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleSignInClose}
        aria-describedby="alert-dialog-slide-description"
        maxWidth="xl"
        sx={{
          height: { xs: "100vh", sm: "100vh", md: "100vh" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 1)",
              boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
              width: "450px",
              borderRadius: "5px",
              padding: "20px 60px",
            }}
          >
            <Box>
              <SignInWithGoogle closeModal={() => setOpenSignIn(false)} />{" "}
            </Box>

            <Box>
              <Box sx={{ pt: "20px" }}>
                <Typography
                  sx={{
                    color: "var(--primary-button)",
                    fontWeight: 600,
                    fontSize: "16px",
                  }}
                >
                  Sign In
                </Typography>

                <form onSubmit={handleSubmitUserSignInInfo}>
                  <Box sx={{ pt: "20px" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        borderBottom: "1px solid #D9D9D9",

                        gap: 1,
                      }}
                    >
                      <MailIcon
                        sx={{ color: "var(--icons-color)", fontSize: 20 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <input
                          required
                          placeholder="Enter Email"
                          type="email"
                          name="signInEmail"
                          value={userSignInInfo?.signInEmail || ""}
                          onChange={handleUserSignInInfo}
                          style={{
                            border: "none",
                            outline: "none",
                            color: "black",
                            padding: "8px 5px",
                            width: "100%",
                            fontSize: "14px",
                            backgroundColor: "transparent", // Makes the background transparent initially
                            WebkitBoxShadow: "0 0 0 1000px white inset", // Covers autofill background
                            WebkitTextFillColor: "black", // Ensures autofill text matches the text color
                          }}
                        />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        pt: "20px",
                        gap: 1,
                        borderBottom: "1px solid #D9D9D9",
                      }}
                    >
                      <LockIcon
                        sx={{
                          color: "var(--icons-color)",
                          fontSize: 20,
                          pb: 0.5,
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          width: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            position: "relative",
                          }}
                        >
                          <input
                            placeholder="Enter Password"
                            type={showPassword ? "text" : "password"}
                            required
                            name="signInPass"
                            value={userSignInInfo?.signInPass}
                            onChange={handleUserSignInInfo}
                            style={{
                              border: "none",
                              outline: "none",
                              color: "black",
                              paddingTop: "5px",
                              paddingBottom: "8px",
                              backgroundColor: "transparent",
                              width: "100%",
                              WebkitBoxShadow: "0 0 0 1000px white inset", // Covers autofill background
                              WebkitTextFillColor: "black",
                            }}
                          />
                          <IconButton
                            onClick={togglePasswordVisibility}
                            sx={{ position: "absolute", right: 0 }}
                          >
                            {showPassword ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        pt: "20px",
                      }}
                    >
                      <Link
                        style={{ textDecoration: "none" }}
                        onClick={handleForgetPassEmailOpen}
                      >
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "var(--primary-button)",
                            fontWeight: 600,
                          }}
                        >
                          Forgot Password ?
                        </Typography>
                      </Link>
                    </Box>
                    {/* Phone input */}

                    <Button
                      // disabled={isLoading}
                      type="submit"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "var(--primary-button)",
                        mt: "20px",
                        width: "100%",
                        textTransform: "capitalize",
                        fontSize: "16px",
                        height: "40px",
                        color: "var(--white)",
                        ":hover": {
                          bgcolor: "var(--primary-button)",
                          color: "var(--white)",
                        },
                      }}
                    >
                      {isLoading ? (
                        <>
                          <CircularProgress
                            sx={{ color: "var(--primary-color)" }}
                            size="27px"
                          />
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    <Box
                      sx={{
                        display: "flex",
                        pt: "10px",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "var(--primary-button)",
                          fontSize: "14px",
                          fontWeight: 600,
                          textAlign: "center",
                        }}
                      >
                        Don’t have an Account?{" "}
                      </Typography>{" "}
                      <Box
                        onClick={handleClickSignUpOpen}
                        style={{
                          textDecoration: "none",
                          color: "#5F646C",
                          fontSize: "14px",
                        }}
                      >
                        Sign Up
                      </Box>
                    </Box>
                  </Box>
                </form>
              </Box>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default SingleFlight;
