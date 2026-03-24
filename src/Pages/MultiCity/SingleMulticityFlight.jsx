import {
  Box,
  Grid,
  Tab,
  Typography,
  Button,
  Collapse,
  Divider,
  Stack,
  FormControlLabel,
  Checkbox,
  Tabs,
  TableContainer,
  Table,
  CircularProgress,
  Container,
  IconButton,
  Dialog,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Tooltip,
  Slide,
} from "@mui/material";
import React, { useState, useRef } from "react";
import biman from "../../asstes/img/HomeImage/flightIcons/biman.png";
import arrivalRocket from "../../asstes/img/HomeImage/flightIcons/duration.svg";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { TabContext, TabPanel } from "@mui/lab";
import OneWayFlightDetils from "../OneWayFlightDetils/OneWayFlightDetils";
import FareDetails from "../OneWayFlightDetils/FareDetails";
import FarePolicy from "../OneWayFlightDetils/FarePolicy";
import Baggage from "../OneWayFlightDetils/Baggage";
import { Segment, Title } from "@mui/icons-material";
import moment from "moment";
import { convertMinutesToHoursAndMinutes } from "../../Pages/common/funcation";
import commaNumber from "comma-number";
import RoundwayFlightDetails from "../RoundwayFlightDetails/RoundwayFlightDetails";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import { Link, useNavigate } from "react-router-dom";
import DateChange from "../OneWayFlightDetils/DateChange";
import Cancellation from "../OneWayFlightDetils/Cancellation";
import MulticityFlightDetails from "./MulticityFlightDetails/MulticityFlightDetails";
import MulticityBaggage from "./MulticityFlightDetails/MulticityBaggage";
import Swal from "sweetalert2";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import GoogleIcon from "@mui/icons-material/Google";
import PhoneIcon from "@mui/icons-material/Phone";
import secureLocalStorage from "react-secure-storage";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import axios from "axios";
import ShowDetails from "../ShowDetails/FlightDetails";
import { config } from "../../config";
import BrandWordmark from "../../Shared/BrandWordmark/BrandWordmark";
import { setBookingAuthToken } from "../../utils/bookingAuth";
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});
const isMobile = window.innerWidth <= 768;

const SingleMulticityFlight = ({ data }) => {
  const [flightDetails, setFlightDetails] = useState(false);
  const [value, setValue] = React.useState("1");
  const navigate = useNavigate();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  const [openSignIn, setOpenSignIn] = useState(false);
  const [openSignUpOtp, setOpenSignUpOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const [openPass, setOpenPass] = useState(false);
  const token = secureLocalStorage.getItem("access_token");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([0, 1, 2, 3, 4, 5].map(() => React.createRef()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOtpChange = (e, index) => {
    const newOtp = [...otp];
    newOtp[index] = e.target.value;
    setOtp(newOtp);

    // Move focus to the next input field
    if (index < otp.length - 1 && e.target.value !== "") {
      inputRefs.current[index + 1].current.focus();
    }
  };

  const handleEmailOtp = async () => {
    const otpValue = otp.join("");
    setOpenSignUpOtp(false);

    if (otpValue.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${config.baseUrl}/auth/verifyEmail?token=${otpValue}`
      );
      Swal.fire({
        icon: "success",
        title: "Email Verified Successfully",
        text: "Your email has been successfully verified.",
        confirmButtonText: "OK",
      }).then((result) => {
        if (result.isConfirmed) {
          setOpenSignIn(true);
          setOtp(["", "", "", "", "", ""]);
        }
      });
    } catch (err) {
      console.error("Error verifying OTP:", err.response?.data || err.message);
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };

  const handleClickSignInOpen = () => {
    setOpenSignIn(true);
    setOpenSignUp(false);
  };
  const handleClickPassOpen = () => {
    setOpenPass(true);
  };
  const handleClickSignUpOpen = () => {
    setOpenSignUp(true);
    setOpenSignIn(false);
  };
  const handleClickSignUpOpenOtp = () => {
    setOpenSignUpOtp(true);
    setOpenSignUp(false);
  };

  const handleSignInClose = () => {
    setOpenSignIn(false);
  };
  const handlePassClose = () => {
    setOpenPass(false);
  };
  const handleSignUpClose = () => {
    setOpenSignUp(false);
  };

  const handleSignUpOtpClose = () => {
    setOpenSignUpOtp(false);
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

  // password reset all funcation
  const [email, setEmail] = useState("");
  const handleForgetPassEmailOpen = () => {
    setOpenPass(true);
    setOpenSignIn(false);
  };
  const handlePassWordChangeEmail = async (e) => {
    e.preventDefault();

    const apiUrl = `${config.baseUrl}/auth/forgotPassword`;

    try {
      setIsLoading(true);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      setIsLoading(false);

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: data.message || "Your password reset code has been sent.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: data.message || "An error occurred while sending the email.",
        });
      }
      setOpenPass(false);
    } catch (error) {
      // Hide loader
      setIsLoading(false);
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: "Failed to send email. Please try again later.",
      });
    }
  };

  const handleSubmitUserSignInInfo = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let body = {
      email: String(userSignInInfo?.signInEmail),
      password: String(userSignInInfo?.signInPass),
    };
    try {
      const response = await fetch(`/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        secureLocalStorage.removeItem("access_token");
        if (data?.token) {
          setBookingAuthToken(data.token);
        }
        secureLocalStorage.setItem("userData", data?.user || data?.userData || {});
        secureLocalStorage.setItem("data", data);

        // Reset the form fields
        setUserSignInInfo({
          signInEmail: "",
          signInPass: "",
        });

        // Display success message
        Swal.fire({
          icon: "success",
          title: "Success",
          text: data.message || "User signed in successfully!",
        });
      } else {
        // Display dynamic error message
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Error signing in. Please try again.",
        }).then(() => {
          setOpenSignIn(true); // Reopen the dialog when user clicks OK
        });
      }
      setOpenSignIn(false);
    } catch (error) {
      console.error("Error signing in:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Please try again.",
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
    validateField(name, value);
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
  const [isChecked, setIsChecked] = useState(false);
  const [checkboxError, setCheckboxError] = useState("");

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked);
    if (e.target.checked) {
      setCheckboxError(""); // Clear error if checkbox is checked
    }
  };

  const validateForm = () => {
    if (!isChecked) {
      setCheckboxError("You must agree to the Terms & Conditions.");
      return false;
    }
    return true;
  };

  const handleUserSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Start loader

    if (!validateForm()) {
      setIsLoading(false); // Stop loader
      return;
    }
    const hasErrors = Object.values(errors).some((error) => error !== "");
    if (hasErrors) {
      setIsLoading(false); // Stop loader
      Swal.fire({
        icon: "error",
        title: "Sign up failed",
        text: "Please fix the errors in the form.",
        confirmButtonText: "Try Again",
      });
      return;
    }

    const body = {
      fullName: userInfo.userName,
      email: userInfo.userEmail,
      password: userInfo.userPass,
      phone: userInfo.userPhone,
    };

    try {
      const response = await fetch(
        `${config.baseUrl}/user/signUp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: data?.message || "User signed up successfully!",
          confirmButtonText: "OK",
        }).then(() => {
          setOpenSignUpOtp(true); // Open OTP dialog
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
            "There was an issue with the sign-up. Please try again.",
          confirmButtonText: "Try Again",
        });
      }
      setOpenSignUp(false);
    } catch (error) {
      console.error("Error signing up:", error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong. Please try again later.",
        confirmButtonText: "Try Again",
      });
    } finally {
      setIsLoading(false); // Stop loader
    }
  };
  const getCabinClass = (cabinCode) => {
    switch (cabinCode) {
      case "M":
      case "Y":
        return "Economy";
      case "C":
      case "I":
        return "Business";
      case "P":
        return "First";
      case "S":
      case "U":
        return "Premium Economy";
      default:
        return "";
    }
  };

  const convertWeight = (data) => {
    const rawValue = String(data ?? "").trim();
    if (!rawValue) {
      return "0";
    }
    const normalizedValue = rawValue.toLowerCase().replace(/\s+/g, " ");
    if (normalizedValue.includes("baggage charges data not available")) {
      return "0";
    }

    const mappings = {
      "1P": "23Kg",
      "2P": "46Kg",
      "1 N": "23 Kg",
      "2 N": "46 Kg",
    };
    return (
      mappings[rawValue] ||
      (rawValue.endsWith("Kg") ? rawValue : rawValue.replace("K", "Kg"))
    );
  };
  const handleBooking = (selectedOffer) => {
    const bookingState = {
      selectedOffer: selectedOffer || data || {},
      source: "search-results",
      selectedAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "flyjatt:selected_offer",
          JSON.stringify(bookingState)
        );
      }
    } catch (storageError) {
      console.warn("Unable to cache selected offer for booking flow", storageError);
    }

    navigate("/selectedflightdetails", { state: bookingState });
  };
  return (
    <Box
      sx={{
        background: "#fffff",
        boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
        borderRadius: {
          xs: "none",
          sm: "none",
          md: "10px",
          lg: "10px",
        },
        p: {
          xs: "10px 10px",
          sm: "10px 10px",
          md: "15px 20px",
          lg: "15px 20px",
        },
      }}
    >
      <Grid container spacing={{ xs: 1, sm: 1, md: 5, lg: 5 }}>
        <Grid item lg={10.1} container>
          {data?.AllLegsInfo?.map((info, i) => {
            return (
              <Grid
                sx={{
                  mb: 1,
                }}
                container
                key={i}
              >
                <Grid item xs={12} sm={12} md={2.5} lg={2.5}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: {
                          xs: "center",
                          sm: "center",
                          md: "flex-start",
                          lg: "flex-start",
                        },
                        flexDirection: {
                          xs: "row",
                          sm: "row",
                          md: "column",
                          lg: "column",
                        },
                        gap: {
                          xs: "20px",
                          sm: "20px",
                          md: "0px",
                          lg: "0px",
                        },
                      }}
                    >
                      <Box>
                        <img
                          style={{
                            height: isMobile ? "40px" : "40px",
                            width: isMobile ? "40px" : "40px",
                          }}
                          src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${data?.Carrier}.png`}
                        />
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "var(--primary-button)",
                            fontWeight: 600,
                            fontSize: {
                              xs: "10px",
                              sm: "10px",
                              md: "12px",
                              lg: "12px",
                            },
                            my: 0.5,
                          }}
                        >
                          {data?.CarrierName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: {
                              xs: "10px",
                              sm: "10px",
                              md: "12px",
                              lg: "12px",
                            },
                            color: "var(--meta-black)",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {info?.Segments?.map(
                            (Segment) =>
                              `${Segment?.MarketingCarrier}-${Segment?.MarketingFlightNumber}`
                          ).join(" & ")}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        textAlign: "right",
                        display: {
                          xs: "block",
                          sm: "block",
                          md: "none",
                          lg: "none",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          color: "var( --depature-color)",
                          fontSize: {
                            xs: "18px",
                            sm: "18px",
                            md: "22px",
                            lg: "22px",
                          },
                          fontWeight: 500,
                        }}
                      >
                        {commaNumber(data?.NetFare)}৳
                      </Typography>
                      <Typography
                        sx={{
                          color: "var( --depature-color)",
                          fontSize: {
                            xs: "16px",
                            sm: "16px",
                            md: "18px",
                            lg: "18px",
                          },
                          fontWeight: 500,
                        }}
                      >
                        <del>{commaNumber(data?.GrossFare)}৳</del>
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
                  <Box>
                    {/* <Typography
                      sx={{
                        color: "var(--flight-text-color)",
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "14px",
                          lg: "14px",
                        },
                      }}
                    >
                      Depart
                    </Typography> */}
                    <Typography
                      sx={{
                        color: "var(--depature-color)",
                        fontSize: {
                          xs: "16px",
                          sm: "16px",
                          md: "18px",
                          lg: "18px",
                        },
                        fontWeight: 600,
                      }}
                    >
                      {info?.DepFrom}
                      <span
                        style={{
                          color: "var(--primary-button)",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {" "}
                        {"-"} {moment(info?.DepDate).format("HH:mm")}
                      </span>
                    </Typography>

                    <Tooltip title={info?.Segments[0]?.DepAirPort || ""}>
                      <Typography
                        sx={{
                          color: "var(--airport-color)",
                          fontSize: "12px",
                          display: {
                            xs: "none",
                            sm: "none",
                            md: "block",
                            lg: "block",
                          },
                        }}
                        noWrap
                      >
                        {info?.Segments[0]?.DepAirPort
                          ? info?.Segments[0].DepAirPort.length > 30
                            ? info?.Segments[0].DepAirPort.slice(0, 30)
                            : info?.Segments[0].DepAirPort
                          : ""}
                      </Typography>
                    </Tooltip>

                    {/* <Typography
                      sx={{
                        color: "var(--airport-color)",
                        fontSize: {
                          xs: "10px",
                          sm: "10px",
                          md: "12px",
                          lg: "12px",
                        },
                      }}
                    >
                      {moment(info?.DepDate).format("HH:mm")}
                    </Typography> */}

                    <Typography
                      sx={{
                        color: "var(--flight-text-color)",
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "12px",
                          lg: "12px",
                        },
                      }}
                    >
                      {moment(info?.DepDate).format("ddd D MMM YYYY")}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3} sm={3} md={2.5} lg={2.5}>
                  <Box
                    sx={{
                      textAlign: {
                        xs: "left",
                        sm: "left",
                        md: "center",
                        lg: "center",
                      },
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: {
                            xs: "10px",
                            sm: "10px",
                            md: "12px",
                            lg: "12px",
                          },
                          color: "var(--flight-text-color)",
                        }}
                      >
                        {convertMinutesToHoursAndMinutes(info?.Duration)}
                      </Typography>
                    </Box>
                    <Box>
                      <svg
                        style={{ marginLeft: isMobile ? "-38px" : "0px" }}
                        width="127"
                        height="10"
                        viewBox="0 0 127 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M124.682 5C124.4 5 108.145 5 100.053 5H4"
                          stroke="#13406B"
                          strokeWidth="1"
                        />
                        <circle cx="3.5" cy="4.5" r="3.5" fill="#FCAF17" />
                        {info?.Segments?.length === 2 && (
                          <circle cx="63" cy="5" r="5" fill="#13406B" />
                        )}
                        {info?.Segments?.length === 3 && (
                          <>
                            <circle cx="50" cy="5" r="5" fill="#13406B" />
                            <circle cx="70" cy="5" r="5" fill="#13406B" />
                          </>
                        )}
                        <circle cx="123.5" cy="4.5" r="3.5" fill="#FCAF17" />
                      </svg>
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: {
                            xs: "10px",
                            sm: "10px",
                            md: "12px",
                            lg: "12px",
                          },
                        }}
                      >
                        {" "}
                        {info?.Segments?.length === 1
                          ? "Non Stop"
                          : info?.Segments?.length === 2
                            ? "One Stop"
                            : info?.Segments?.length === 3
                              ? "Two Stops"
                              : info?.Segments?.length === 4
                                ? "Three Stops"
                                : null}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
                  <Box sx={{ textAlign: "right" }}>
                    {/* <Typography
                      sx={{
                        color: "var(--flight-text-color)",
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "14px",
                          lg: "14px",
                        },
                      }}
                    >
                      Arrival
                    </Typography> */}
                    <Typography
                      sx={{
                        color: "var(--depature-color)",
                        fontSize: {
                          xs: "16px",
                          sm: "16px",
                          md: "18px",
                          lg: "18px",
                        },
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--primary-button)",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {moment(
                          info?.Segments[info?.Segments.length - 1]?.ArrTime
                        ).format("HH:mm")}{" "}
                        {"-"}{" "}
                      </span>
                      {info?.ArrTo}
                    </Typography>
                    <Tooltip
                      title={
                        info?.Segments[info?.Segments.length - 1]?.ArrAirPort
                      }
                    >
                      <Typography
                        sx={{
                          color: "var(--airport-color)",
                          fontSize: "12px",
                          display: {
                            xs: "none",
                            sm: "none",
                            md: "block",
                            lg: "block",
                          },
                        }}
                        noWrap
                      >
                        {info?.Segments[info?.Segments.length - 1]?.ArrAirPort
                          ? info?.Segments[info?.Segments.length - 1]
                            ?.ArrAirPort.length > 30
                            ? info?.Segments[
                              info?.Segments.length - 1
                            ]?.ArrAirPort.slice(0, 30)
                            : info?.Segments[info?.Segments.length - 1]
                              ?.ArrAirPort
                          : ""}
                      </Typography>
                    </Tooltip>

                    {/* <Typography
                      sx={{
                        color: "var(--airport-color)",
                        fontSize: {
                          xs: "10px",
                          sm: "10px",
                          md: "12px",
                          lg: "12px",
                        },
                      }}
                    >
                      {moment(
                        info?.Segments[info?.Segments.length - 1]?.ArrTime
                      ).format("HH:mm")}
                    </Typography> */}

                    <Typography
                      sx={{
                        color: "var(--flight-text-color)",
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "12px",
                          lg: "12px",
                        },
                      }}
                    >
                      {moment(
                        info?.Segments[info?.Segments.length - 1]?.ArrTime
                      ).format("ddd D MMM YYYY")}
                    </Typography>
                  </Box>
                </Grid>
                {/* Continue with the rest of your grid items as needed */}
              </Grid>
            );
          })}
        </Grid>
        <Grid item xs={12} sm={12} md={2} lg={1.9}>
          <Grid container>
            <Grid item xs={12} sm={12} md={12} lg={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: {
                    xs: "space-between",
                    sm: "space-between",
                    md: "right",
                    lg: "right",
                  },
                  borderTop: {
                    xs: "1px solid var(--primary-button)",
                    sm: "1px solid var(--primary-button)",
                    md: "none",
                    lg: "none",
                  },
                  pt: {
                    xs: "10px",
                    sm: "10px",
                    md: "0px",
                    lg: "0px",
                  },
                  mt: {
                    xs: "10px",
                    sm: "10px",
                    md: "0px",
                    lg: "0px",
                  },
                  flexDirection: {
                    xs: "row",
                    sm: "row",
                    md: "column",
                    lg: "column",
                  },
                  gap: {
                    xs: "0px",
                    sm: "0px",
                    md: "160px",
                    lg: "160px",
                  },
                }}
              >
                <Box
                  sx={{
                    display: {
                      xs: "block",
                      sm: "block",
                      md: "none",
                      lg: "none",
                    },

                    width: "100%",
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        data?.Refundable === true
                          ? "var(--refundable-color)"
                          : "red",
                      fontSize: {
                        xs: "12px",
                        sm: "12px",
                        md: "14px",
                        lg: "14px",
                      },
                      fontWeight: 500,
                    }}
                  >
                    {data?.Refundable === true
                      ? " Refundable"
                      : "Non-Refundable"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "var( --primary-button)",
                      fontSize: {
                        xs: "12px",
                        sm: "12px",
                        md: "14px",
                        lg: "14px",
                      },
                      fontWeight: 500,
                    }}
                  >
                    Baggage{" "}
                    {convertWeight(data?.PriceBreakDown[0].Bag[0].Allowance)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    textAlign: "center",
                    display: {
                      xs: "none",
                      sm: "none",
                      md: "block",
                      lg: "block",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--depature-color)",
                      fontSize: {
                        xs: "16px",
                        sm: "16px",
                        md: "18px",
                        lg: "18px",
                      },
                      fontWeight: 600,
                    }}
                  >
                    {commaNumber(data?.NetFare)}৳
                  </Typography>
                  <Typography
                    sx={{
                      color: "var( --depature-color)",
                      fontSize: {
                        xs: "16px",
                        sm: "16px",
                        // md: "18px",
                        // lg: "18px",
                      },
                      fontWeight: 500,
                    }}
                  >
                    <del>{commaNumber(data?.GrossFare)}৳</del>
                  </Typography>
                </Box>
                <Box sx={{ width: "100%", textAlign: "center" }}>
                  <Button
                    onClick={() => handleBooking(data || [])}
                    sx={{
                      bgcolor: "var(--primary-button)",
                      color: "var(--white)",
                      width: {
                        xs: "105px",
                        sm: "105px",
                        // md: "100%",
                        // lg: "100%",
                      },
                      ":hover": {
                        bgcolor: "var(--primary-button)",
                        color: "var(--white)",
                      },
                      py: 0.55,
                      minHeight: "36px",
                      textTransform: "capitalize",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    Book Now
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid container spacing={{ xs: 0, sm: 0, md: 5, lg: 5 }} pt={1.5}>
        <Grid
          item
          lg={2.3}
          sx={{
            display: {
              xs: "none",
              sm: "none",
              md: "block",
              lg: "block",
            },
          }}
        >
          <Box>
            <Typography sx={{ color: "var(--meta-black)", fontSize: "12px" }}>
              {getCabinClass(
                data?.AllLegsInfo[0]?.Segments[0].SegmentCode?.cabinCode
              )}
            </Typography>
          </Box>
        </Grid>
        <Grid item lg={7.7}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "100px" }}>
            <Typography
              sx={{
                color:
                  data?.Refundable === true ? "var(--refundable-color)" : "red",
                display: {
                  xs: "none",
                  sm: "none",
                  md: "block",
                  lg: "block",
                },

                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {data?.Refundable === true ? " Refundable" : "Non-Refundable"}
            </Typography>
            <Typography
              sx={{
                color: "var(--meta-black)",
                fontSize: "12px",
                display: {
                  xs: "none",
                  sm: "none",
                  md: "flex",
                  lg: "flex",
                },
                alignItems: "center",
              }}
            >
              {data?.AllLegsInfo[0]?.Segments[0]?.SegmentCode?.seatsAvailable}{" "}
              <EventSeatIcon
                sx={{
                  fontSize: "18px",
                  pl: "3px",
                  color: "var(--primary-button)",
                  cursor: "pointer",
                }}
              />
            </Typography>
            <Typography
              sx={{
                color: "var( --primary-button)",
                fontSize: "12px",
                display: {
                  xs: "none",
                  sm: "none",
                  md: "block",
                  lg: "block",
                },
                fontWeight: 500,
              }}
            >
              Baggage {convertWeight(data?.PriceBreakDown[0].Bag[0].Allowance)}
            </Typography>
          </Box>
        </Grid>
        <Grid item lg={2}>
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: {
                  xs: "flex-start",
                  sm: "flex-start",
                  md: "center",
                },
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  color: "var(--primary-color)",
                  fontWeight: 500,
                  textTransform: "capitalize",
                  width: "fit-content",
                  paddingRight: "0px",
                  fontSize: "12px",
                  cursor: "pointer",

                  // pl: "5px",
                }}
                onClick={() => setFlightDetails(!flightDetails)}
              >
                {!flightDetails ? (
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: { xs: "12px", sm: "12px", md: "12px" },
                      cursor: "pointer",
                    }}
                  >
                    Show Details
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: { xs: "12px", sm: "12px", md: "12px" },
                      cursor: "pointer",
                    }}
                  >
                    Hide Details
                  </Typography>
                )}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
      <ShowDetails
        multicity="multicity"
        data={data}
        flightDetails={flightDetails}
        value={value}
        handleChange={handleChange}
        onCloseDetails={() => setFlightDetails(false)}
      />
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
            padding: "30px 40px",
          }}
        >
          <Box
            sx={{
              width: "450px",
              borderRadius: "5px",
            }}
          >
            <Box
              component="a"
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

            <Box sx={{ pt: "20px" }}>
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
                          backgroundColor: "transparent",
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "black",
                          width: "100%",
                        }}
                      />
                    </Box>
                  </Box>
                  {errors.userName && (
                    <Typography sx={{ color: "red", fontSize: "12px" }}>
                      {errors.userName}
                    </Typography>
                  )}

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
                          background: "none",
                          backgroundColor: "transparent",
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "black",
                        }}
                      />
                    </Box>
                  </Box>
                  {errors.userEmail && (
                    <Typography sx={{ color: "red", fontSize: "12px" }}>
                      {errors.userEmail}
                    </Typography>
                  )}

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
                            backgroundColor: "transparent",
                            WebkitBoxShadow: "0 0 0 1000px white inset",
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
                  {errors.userPass && (
                    <Typography sx={{ color: "red", fontSize: "10px" }}>
                      {errors.userPass}
                    </Typography>
                  )}

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
                          backgroundColor: "transparent",
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "black",
                        }}
                      />
                    </Box>
                  </Box>
                  {errors.userPhone && (
                    <Typography sx={{ color: "red", fontSize: "12px" }}>
                      {errors.userPhone}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "20px",
                      gap: "20px",
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={handleCheckboxChange}
                      sx={{
                        color: "var(--icons-color)",
                        "&.Mui-checked": {
                          color: "var(--primary-button)",
                        },
                      }}
                    />
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
                  {checkboxError && (
                    <Typography sx={{ color: "red", fontSize: "12px" }}>
                      {checkboxError}
                    </Typography>
                  )}

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
                    {isLoading ? (
                      <>
                        <CircularProgress
                          sx={{ color: "var(--primary-color)" }}
                          size="27px"
                        />
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                  <Box sx={{ pt: "10px" }}>
                    <Typography
                      sx={{
                        color: "var(--primary-button)",
                        fontSize: "14px",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      Already have an Account?{" "}
                      <Link
                        onClick={handleClickSignInOpen}
                        style={{ textDecoration: "none", color: "#5F646C" }}
                      >
                        Sign In
                      </Link>
                    </Typography>
                  </Box>
                </Box>
              </form>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* sig otp  / otp dailog */}

      <Dialog
        open={openSignUpOtp}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleSignUpOtpClose}
        aria-describedby="alert-dialog-slide-description"
        maxWidth="xl"
        sx={{
          height: { xs: "100vh", sm: "100vh", md: "100%" },
        }}
      >
        <Box>
          <Box>
            <Container
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100%",
              }}
            >
              <Box
                sx={{
                  background: "#ffff",
                  width: "450px",
                  px: "20px",
                  borderRadius: "5px",
                  py: "15px",
                }}
              >
                <Box
                  sx={{
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    my: "10px",
                  }}
                >
                  <BrandWordmark width={100} height={100} fontSize={28} />
                </Box>
                <Typography
                  sx={{
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "var(--primary-button)",
                    textAlign: "center",
                  }}
                >
                  OTP Verification
                </Typography>
                <Typography
                  sx={{
                    fontSize: "14px",
                    py: "10px",
                    color: "var(--primary-button)",
                    textAlign: "center",
                    paddingBottom: "20px",
                  }}
                >
                  Enter the 6 digit ve code recived on your Email ID
                </Typography>
                <form>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "80%",
                      margin: "0 auto",
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        style={{
                          color: "var(--meta-black)",
                          outline: "none",
                          background: "none",
                          width: "35px",
                          textAlign: "center",
                          fontSize: "18px",
                          borderRadius: "5px",
                          padding: "10px 5px",
                          border: "2px solid var(--primary-button)",
                        }}
                        name={`otp${index}`}
                        value={otp[index]}
                        onChange={(e) => handleOtpChange(e, index)}
                        ref={inputRefs.current[index]}
                      />
                    ))}
                  </Box>
                  {error && <p style={{ color: "red" }}>{error}</p>}
                  <Button
                    onClick={handleEmailOtp}
                    disabled={isLoading}
                    sx={{
                      borderRadius: "6px",
                      backgroundColor: "var(--primary-button)",
                      color: "white",
                      width: "100%",
                      height: "45px",
                      textTransform: "capitalize",
                      fontSize: "15px",
                      mt: "20px",
                      ":hover": {
                        backgroundColor: "var(--primary-button)",
                      },
                    }}
                    type="submit"
                  >
                    {isLoading ? "Verifying..." : "Submit OTP"}
                  </Button>
                  <Typography
                    //   onClick={handleResend}
                    sx={{
                      color: "red",
                      cursor: "pointer",
                      fontSize: "15px",
                      my: "10px",
                      textAlign: "right",
                    }}
                  >
                    {isLoading ? "Please Wait..." : "  Resend OTP ?"}
                  </Typography>
                </form>
              </Box>
            </Container>
          </Box>
        </Box>
      </Dialog>
      {/* paswword rest email   dailog */}

      <Dialog
        open={openPass}
        TransitionComponent={Transition}
        keepMounted
        onClose={handlePassClose}
        aria-describedby="alert-dialog-slide-description"
        maxWidth="xl"
        sx={{
          height: { xs: "100vh", sm: "100vh", md: "100%" },
        }}
      >
        <Box>
          <Container
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                background: "#ffff",
                width: "450px",
                px: "20px",
                borderRadius: "5px",
                py: "15px",
              }}
            >
              <Box
                sx={{
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  my: "10px",
                }}
              >
                <BrandWordmark width={120} height={100} fontSize={30} />
              </Box>
              <Typography
                sx={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--primary-button)",
                  textAlign: "center",
                }}
              >
                Forget Your Email?
              </Typography>
              <Typography
                sx={{
                  fontSize: "14px",
                  py: "10px",
                  color: "var(--primary-button)",
                  textAlign: "center",
                  paddingBottom: "20px",
                }}
              >
                Please enter your email address and we'll send you a code to
                reset your password.
              </Typography>
              <form onSubmit={handlePassWordChangeEmail}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderBottom: "1px solid #D9D9D9",
                      width: "100%",
                    }}
                  >
                    <MailIcon
                      sx={{ color: "var(--icons-color)", fontSize: 20 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <input
                        required
                        placeholder="Enter Your Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          border: "none",
                          outline: "none",
                          color: "black",
                          padding: "8px 5px",
                          width: "100%",
                          fontSize: "14px",
                          backgroundColor: "transparent",
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "black",
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Button
                  sx={{
                    borderRadius: "6px",
                    backgroundColor: "var(--primary-button)",
                    color: "white",
                    width: "100%",
                    height: "40px",
                    textTransform: "capitalize",
                    fontSize: "15px",
                    mt: "20px",
                    ":hover": {
                      backgroundColor: "var(--primary-button)",
                    },
                  }}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <CircularProgress
                        sx={{ color: "var(--primary-color)" }}
                        size="27px"
                      />
                    </>
                  ) : (
                    "Send Email"
                  )}
                </Button>
              </form>
            </Box>
          </Container>
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
            padding: "30px 40px",
          }}
        >
          <Box
            sx={{
              width: "450px",
              borderRadius: "5px",
            }}
          >
            <Box
              component="a"
              // onClick={handleGoogleLogIn}
              sx={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #D9D9D9",
                justifyContent: "center",
                height: "40px",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              <GoogleIcon sx={{ color: "var(--primary-button)" }} />
              <Typography sx={{ color: "#5F6368", pl: "5px" }}>
                {" "}
                Login with Google
              </Typography>
            </Box>

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
                  {/* email input */}

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
                  {errors.userPass && (
                    <Typography sx={{ color: "red", fontSize: "12px" }}>
                      {errors.userPass}
                    </Typography>
                  )}
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
                  <Box sx={{ pt: "10px" }}>
                    <Typography
                      sx={{
                        color: "var(--primary-button)",
                        fontSize: "14px",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      Don’t have an Account?{" "}
                      <Link
                        onClick={handleClickSignUpOpen}
                        style={{ textDecoration: "none", color: "#5F646C" }}
                      >
                        Sign Up
                      </Link>
                    </Typography>
                  </Box>
                </Box>
              </form>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default SingleMulticityFlight;
