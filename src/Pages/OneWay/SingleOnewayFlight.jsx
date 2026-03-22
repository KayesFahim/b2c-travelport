import {
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
} from "@mui/material";
import React, { useState } from "react";
import { TabContext, TabPanel } from "@mui/lab";
import OneWayFlightDetils from "../OneWayFlightDetils/OneWayFlightDetils";
import FareDetails from "../OneWayFlightDetils/FareDetails";
import FarePolicy from "../OneWayFlightDetils/FarePolicy";
import Baggage from "../OneWayFlightDetils/Baggage";
import { Segment } from "@mui/icons-material";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import GoogleIcon from "@mui/icons-material/Google";
import PhoneIcon from "@mui/icons-material/Phone";
import moment from "moment";
import { convertMinutesToHoursAndMinutes } from "../../Pages/common/funcation";
import commaNumber from "comma-number";
import { Link, useLocation, useNavigate } from "react-router-dom";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import Cancellation from "../OneWayFlightDetils/Cancellation";
import DateChange from "../OneWayFlightDetils/DateChange";
import Swal from "sweetalert2";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import secureLocalStorage from "react-secure-storage";
import { calculateTransitTime } from "../../Pages/common/funcation";
import ShowDetails from "../ShowDetails/FlightDetails";
import { config } from "../../config";
const isMobile = window.innerWidth <= 768;
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const SingleOnewayFlight = ({ data, className }) => {
  const [flightDetails, setFlightDetails] = useState(false);
  const token = secureLocalStorage.getItem("access_token");
  const navigate = useNavigate();
  const [value, setValue] = React.useState("1");
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

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

  // const handleBooking = (data) => {
  //   navigate("/selectedflightdetails", { state: data });

  //   // if (!token) {
  //   //   Swal.fire({
  //   //     icon: "warning",
  //   //     title: "Please, Log in first",
  //   //     text: "Please log in first to book the flight.",
  //   //     confirmButtonText: "OK",
  //   //     confirmButtonColor: "#6A4ABC",
  //   //     customClass: {
  //   //       popup: "swal-wide",
  //   //     },
  //   //   }).then((result) => {
  //   //     if (result.isConfirmed) {
  //   //       setOpenSignIn(true);

  //   //     }
  //   //   });
  //   // }
  // };
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

  const location = useLocation();
  const [openSignIn, setOpenSignIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const user = secureLocalStorage.getItem("userData");

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

  const handleSubmitUserSignInInfo = async (e) => {
    e.preventDefault();
    setOpenSignIn(false);

    let body = {
      email: String(userSignInInfo?.signInEmail),
      password: String(userSignInInfo?.signInPass),
    };

    try {
      const response = await fetch(
        `${config.baseUrl}/auth/signInUser`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const datas = await response.json();

      if (response.ok) {
        secureLocalStorage.setItem("access_token", datas?.access_token);
        secureLocalStorage.setItem("userData", datas?.userData);
        secureLocalStorage.setItem("data", datas);

        // Reset the form fields
        setUserSignInInfo({
          signInEmail: "",
          signInPass: "",
        });

        // Display success message and then navigate
        Swal.fire({
          icon: "success",
          title: "Success",
          text: datas.message || "User signed in successfully!",
        }).then(() => {
          navigate("/selectedflightdetails", {
            state: {
              selectedOffer: data || {},
              source: "search-results",
              selectedAt: new Date().toISOString(),
            },
          });
        });
      } else {
        // Display dynamic error message
        Swal.fire({
          icon: "error",
          title: "Error",
          text: datas.message || "Error signing in. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error signing in:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Please try again.",
      });
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
  const transitTimes = data?.AllLegsInfo[0]?.Segments?.reduce(
    (accumulator, segment, i, arr) => {
      const arrTime = arr[i]?.ArrTime;
      const depTime = arr[i + 1]?.DepTime;
      if (arrTime && depTime) {
        const transitTime = calculateTransitTime(arrTime, depTime);
        accumulator.individualTransitTimes.push(transitTime);
        accumulator.totalTransit += transitTime;
      }

      return accumulator;
    },
    {
      totalTransit: 0,
      individualTransitTimes: [],
    }
  );
  const parseTime = (timeString) => {
    const [hours, minutes] = timeString
      .split(" ")
      .map((part) => parseInt(part.replace(/\D/g, "")));

    return { hours, minutes };
  };

  // Function to sum the transit times
  const sumTransitTimes = (transitTimes) => {
    let totalHours = 0;
    let totalMinutes = 0;

    // Loop over each time and sum hours and minutes separately
    transitTimes.forEach((time) => {
      const { hours, minutes } = parseTime(time);
      totalHours += hours;
      totalMinutes += minutes;
    });

    // Convert minutes to hours if more than 60 minutes
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;

    return `${totalHours}H ${totalMinutes}Min`;
  };

  // Function to sum time durations given as two time strings in "XH YMin" format
  const sumTimeDurations = (timeString1, timeString2) => {
    const { hours: hours1, minutes: minutes1 } = parseTime(timeString1);
    const { hours: hours2, minutes: minutes2 } = parseTime(timeString2);

    // Sum hours and minutes separately
    let totalHours = hours1 + hours2;
    let totalMinutes = minutes1 + minutes2;

    // Convert minutes to hours if more than 60 minutes
    if (totalMinutes >= 60) {
      totalHours += Math.floor(totalMinutes / 60);
      totalMinutes = totalMinutes % 60;
    }

    return `${totalHours}H ${totalMinutes}Min`;
  };

  // Example Usage:
  const totalTransitTime = sumTransitTimes(transitTimes.individualTransitTimes); // "XH YMin" format
  // const duration = convertMinutesToHoursAndMinutes(
  //   data?.AllLegsInfo[0]?.Duration
  // ); // "XH YMin" format

  // Now sum the two durations
  // const totalTransitDuration = sumTimeDurations(totalTransitTime, duration);
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
          md: "15px 10px",
          lg: "15px 20px",
        },
      }}
    >
      <Grid container>
        {data?.AllLegsInfo?.map((alllegs, i) => (
          <Grid
            // item
            key={i}
            container
            spacing={{ xs: 1, sm: 1, md: 1, lg: 0 }}
            md={10}
          >
            <Grid item xs={12} sm={12} md={1.9} lg={2.4}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                        height: isMobile ? "20px" : "25px",
                        width: isMobile ? "20px" : "25px",
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
                        // my: 0.5,
                      }}
                      nowrap
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
                      {alllegs?.Segments?.map(
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
            <Grid item xs={4.5} sm={4.5} md={3.1} lg={3.7}>
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
                  {alllegs?.DepFrom}
                  <span
                    style={{
                      color: "var(--primary-button)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    {"-"} {moment(alllegs?.DepDate).format("HH:mm")}
                  </span>
                </Typography>

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
                  {alllegs?.Segments[0]?.DepAirPort}
                </Typography>

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
         {moment(data?.AllLegsInfo[0]?.DepDate).format("HH:mm")}
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
                  {moment(alllegs?.DepDate).format("ddd D MMM YYYY")}
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={3}
              sm={3}
              md={2.1}
              lg={2.2}
              sx={
                {
                  // display: "flex",
                  // justifyContent: "center",
                }
              }
            >
              <Box
                sx={{
                  textAlign: {
                    xs: "left",
                    sm: "left",
                    md: "center",
                    lg: "center",
                  },
                  mt: 2,
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
                      textAlign: {
                        xs: "left",
                        sm: "left",
                        md: "center",
                        lg: "center",
                      },
                      paddingLeft: {
                        xs: "0px",
                        sm: "0px",
                        md: "10px",
                        lg: "10px",
                      },
                    }}
                  >
                    {convertMinutesToHoursAndMinutes(alllegs?.Duration)}
                    {/* {totalTransitDuration} */}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: {
                      xs: "left",
                      sm: "left",
                      md: "center",
                      lg: "center",
                    },
                  }}
                >
                  <svg
                    width="127"
                    height="10"
                    style={{ marginLeft: isMobile ? "-38px" : "0px" }}
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
                    {alllegs?.Segments?.length === 2 && (
                      <circle cx="63" cy="5" r="5" fill="#13406B" />
                    )}
                    {alllegs?.Segments?.length === 3 && (
                      <>
                        <circle cx="35" cy="5" r="5" fill="#13406B" />
                        <circle cx="85" cy="5" r="5" fill="#13406B" />
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
                      textAlign: {
                        xs: "left",
                        sm: "left",
                        md: "center",
                        lg: "center",
                      },
                      paddingLeft: {
                        xs: "0px",
                        sm: "0px",
                        md: "10px",
                        lg: "10px",
                      },
                    }}
                  >
                    {alllegs?.Segments?.length === 1
                      ? "Non Stop"
                      : alllegs?.Segments?.length === 2
                      ? "One Stop"
                      : alllegs?.Segments?.length === 3
                      ? "Two Stops"
                      : alllegs?.Segments?.length === 4
                      ? "Three Stops"
                      : null}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.1} lg={3.7}>
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
                      alllegs?.Segments[alllegs?.Segments.length - 1]?.ArrTime
                    ).format("HH:mm")}{" "}
                    {"-"}
                  </span>{" "}
                  {alllegs?.ArrTo}
                </Typography>

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
                  {alllegs?.Segments[alllegs?.Segments.length - 1]?.ArrAirPort}
                </Typography>

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
           data?.AllLegsInfo[0]?.Segments[
             data?.AllLegsInfo[0]?.Segments.length - 1
           ]?.ArrTime
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
                    alllegs?.Segments[alllegs?.Segments.length - 1]?.ArrTime
                  ).format("ddd D MMM YYYY")}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        ))}
        <Grid
          container
          xs={12}
          sm={12}
          md={1.7}
          lg={1.9}
          sx={{
            display: "flex",
            // alignItems: "center",
            justifyContent: "end",
            border: "1px solid black",
          }}
        >
          <Grid item md={12}>
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
                  // md: "60px",
                  // lg: "60px",
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
                  {data?.Refundable === true ? " Refundable" : "Non-Refundable"}
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
                      xs: "12px",
                      sm: "13px",
                      // md: "18px",
                      // lg: "18px",
                    },
                    fontWeight: 500,
                  }}
                >
                  <del>{commaNumber(data?.GrossFare)}৳</del>
                </Typography>
              </Box>

              <Box
                sx={{
                  // width: "100%",
                  display: {
                    xs: "block",
                    sm: "block",
                    md: "block",
                    lg: "block",
                  },
                  textAlign: "center",
                }}
              >
                <Button
                  onClick={() => handleBooking(data || [])}
                  sx={{
                    bgcolor: "var(--primary-button)",
                    color: "var(--white)",
                    width: {
                      xs: "105px",
                      sm: "84px",
                      // md: "100%",
                      // lg: "100%",
                    },
                    ":hover": {
                      bgcolor: "var(--primary-button)",
                      color: "var(--white)",
                    },
                    py: 0.33,
                    minHeight: "34px",
                    textTransform: "capitalize",
                    fontSize: "12px",
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

      <Grid
        container
        spacing={{ xs: 0, sm: 0, md: 5, lg: 4 }}
        pt={1}
        sx={{
          display: {
            xs: "flex",
            sm: "flex",
            md: "flex",
            lg: "flex",
          },
          px: "10px",
        }}
      >
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
            {/* <Typography sx={{ color: "var(--meta-black)", fontSize: "12px" }}>
              {getCabinClass(
                data?.AllLegsInfo[0]?.Segments[0].SegmentCode?.cabinCode
              )}
            </Typography> */}
          </Box>
        </Grid>
        <Grid
          item
          lg={7.7}
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <Typography sx={{ color: "var(--meta-black)", fontSize: "12px" }}>
              {getCabinClass(
                data?.AllLegsInfo[0]?.Segments[0].SegmentCode?.cabinCode
              )}
            </Typography>
            <Typography
              sx={{
                display: {
                  xs: "none",
                  sm: "none",
                  md: "block",
                  lg: "block",
                },
                color:
                  data?.Refundable === true ? "var(--refundable-color)" : "red",
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
                fontWeight: 500,
                display: {
                  xs: "none",
                  sm: "none",
                  md: "block",
                  lg: "block",
                },
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
                display: {
                  xs: "flex",
                  sm: "flex",
                  md: "flex",
                  lg: "flex",
                },
                justifyContent: {
                  xs: "flex-start",
                  sm: "flex-start",
                  md: "end",
                },
                alignItems: {
                  xs: "flex-start",
                  sm: "flex-start",
                  md: "center",
                  lg: "center",
                },
              }}
            >
              <Typography
                sx={{
                  color: "var(--primary-color)",
                  fontWeight: 500,
                  textTransform: "capitalize",
                  width: "fit-content",
                  // paddingRight: "0px",
                  fontSize: "12px",
                  cursor: "pointer",

                  // pl: "5px",
                }}
                onClick={() => setFlightDetails(!flightDetails)}
              >
                {!flightDetails ? (
                  <Typography
                    sx={{
                      color: "var( --primary-button)",
                      display: "flex",
                      justifyContent: {
                        xs: "flex-start",
                        sm: "flex-start",
                        md: "center",
                        lg: "center",
                      },
                      alignItems: {
                        xs: "flex-start",
                        sm: "flex-start",
                        md: "center",
                        lg: "center",
                      },
                      fontSize: { xs: "12px", sm: "12px", md: "12px" },
                      cursor: "pointer",
                    }}
                  >
                    Show Details
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      color: "var( --primary-button)",
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
            padding: "30px 0px",
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
                Sign In
              </Typography>

              <form onSubmit={handleSubmitUserSignInInfo}>
                <Box sx={{ pt: "20px" }}>
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
                        required
                        placeholder="example@Email.com"
                        type="email"
                        name="signInEmail"
                        value={userSignInInfo?.signInEmail}
                        onChange={handleUserSignInInfo}
                        style={{
                          border: "none",
                          outline: "none",
                          color: "black",
                          paddingTop: "5px",
                          paddingBottom: "8px",
                        }}
                      />
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
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography
                        sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                      >
                        Password
                      </Typography>
                      <input
                        placeholder="**********"
                        type="password"
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
                        }}
                      />
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "20px",
                    }}
                  >
                    <Link style={{ textDecoration: "none" }} to="">
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
                    Sign In
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

export default SingleOnewayFlight;
