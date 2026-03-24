import React, { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  Drawer,
  Grid,
  Slide,
  Typography,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import secureLocalStorage from "react-secure-storage";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TourIcon from "@mui/icons-material/Tour";
import Swal from "sweetalert2";
import AnimationIcon from "@mui/icons-material/Animation";
import { toast } from "react-toastify";
import {
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  Divider,
} from "@mui/material";
import { AccountCircle, ExitToApp, Bookmark } from "@mui/icons-material";
import axios from "axios";
// import GoogleLogIn from "../../Pages/GoogleLogIn";
import { config } from "../../config";
import SignInWithGoogle from "../../Pages/GoogleLogIn";
import BrandWordmark from "../BrandWordmark/BrandWordmark";
import { setBookingAuthToken } from "../../utils/bookingAuth";
const isMobile = window.innerWidth <= 768;

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const NavBar = () => {
  const location = useLocation();
  const [openSignIn, setOpenSignIn] = useState(false);
  const [openSignUpOtp, setOpenSignUpOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const [openPass, setOpenPass] = useState(false);
  const user = secureLocalStorage.getItem("userData");
  const data = secureLocalStorage.getItem("data");
  const navigate = useNavigate();
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
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(otpValue)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Failed to verify email");

      toast.success(
        "Email Verified Successfully. Your email has been successfully verified.",
        {
          position: "top-right",
          autoClose: 5000,
        }
      );

      // Optionally, you can handle any additional logic after the success message
      setOpenSignIn(true);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      console.error("Error verifying OTP:", err.response?.data || err.message);
      setError("Failed to verify OTP. Please try again.");

      toast.error("Failed to verify OTP. Please try again.", {
        position: "top-right",
        autoClose: 5000,
      });
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
  const handleClickSignUpOpen = () => {
    setOpenSignUp(true);
    setOpenSignIn(false);
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

  // password reset all funcation
  const [email, setEmail] = useState("");
  const handleForgetPassEmailOpen = () => {
    setOpenPass(true);
    setOpenSignIn(false);
  };
  const handlePassWordChangeEmail = async (e) => {
    e.preventDefault();

    const apiUrl = `/api/auth/forgot-password`;

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
        // Display success message using toast
        toast.success(
          data.message || "Your password reset code has been sent.",
          {
            position: "top-right",
            autoClose: 5000,
            closeOnClick: false,
          }
        );
      } else {
        // Display error message using toast
        toast.error(
          data.message || "An error occurred while sending the email.",
          {
            position: "top-right",
            autoClose: 5000,
            closeOnClick: false,
          }
        );
      }
      setOpenPass(false);
    } catch (error) {
      // Hide loader
      setIsLoading(false);
      console.error("Error:", error);

      // Display error message using toast
      toast.error("Failed to send email. Please try again later.", {
        position: "top-right",
        autoClose: 5000,
        closeOnClick: false,
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
      let loginSucceeded = false;
      let lastErrorMessage = "Error signing in. Please try again.";

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
          secureLocalStorage.setItem("data", data || {});

          loginSucceeded = true;
        } else {
          lastErrorMessage = data?.message || lastErrorMessage;
        }
      } catch (networkError) {
        // Retry local login once more below if initial attempt fails.
      }

      if (!loginSucceeded) {
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
          secureLocalStorage.setItem("userData", data?.user || {});
          secureLocalStorage.setItem("data", {
            ...data,
            authSource: "local-session",
            expireIn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
          loginSucceeded = true;
        } else {
          lastErrorMessage = data?.message || lastErrorMessage;
        }
      }

      if (!loginSucceeded) {
        toast.error(lastErrorMessage, {
          position: "top-right",
          autoClose: 5000,
          closeOnClick: false,
        });
        return;
      }

      setUserSignInInfo({
        signInEmail: "",
        signInPass: "",
      });

      toast.success("User signed in successfully!", {
        position: "top-right",
        autoClose: 5000,
        closeOnClick: false,
      });
      setOpenSignIn(false);
    } catch (error) {
      toast.error("Unable to sign in. Please check server and try again.", {
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
      const response = await fetch(`/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userInfo.userName,
          email: userInfo.userEmail,
          password: userInfo.userPass,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Registered!",
          text: "A verification link has been sent to your email. Please check your inbox to complete sign-up.",
          confirmButtonText: "OK",
        });
        setUserInfo({ userName: "", userEmail: "", userPass: "", userPhone: "" });
        setErrors({});
        setOpenSignUp(false);
      } else {
        Swal.fire({
          icon: "error",
          title: "Sign up failed",
          text: data?.message || "There was an issue with the sign-up. Please try again.",
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
    } finally {
      setIsLoading(false); // Stop loader
    }
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // logOut function
  const handleLogout = () => {
    const token = String(secureLocalStorage.getItem("access_token") || "").trim();
    secureLocalStorage.removeItem("access_token");
    secureLocalStorage.removeItem("userData");
    secureLocalStorage.removeItem("data");
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(
      () => { }
    );

    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out successfully!",
    }).then(() => {
      navigate("/");
    });
  };

  useEffect(() => {
    if (!data?.expireIn) return;
    const expirationDate = new Date(data.expireIn);
    const now = new Date();

    if (expirationDate <= now) {
      handleLogout();
    } else {
      const remainingTime = expirationDate.getTime() - now.getTime();

      const timer = setTimeout(() => {
        handleLogout();
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [data, handleLogout]);

  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const darkHeaderPaths = new Set([
    "/",
    "/tour",
    "/toursearchresult",
    "/nobooking",
    "/about",
    "/blog",
    "/contact",
    "/hotel",
    "/terms",
    "/privacypolicy",
    "/selectedflightdetails",
    "/bookingdetails",
    "/OtpVerification",
    "/paymentsuccess",
    "/resetpassword",
    "/paymentcancelled",
    "/paymentfailed",
    "/bookingquedetails",
    "/userinfov2/userwallet",
    "/userinfov2/usertransctions",
    "/userinfov2/usertraveler",
    "/userinfov2/addtravler",
    "/userinfov2/adddeposite",

    "/paymentgateway",
    "/userinfov2/updateprofilev2",
    "/my-account",
    "*",
    "/tourdetails",
  ]);
  const searchResultPaths = new Set([
    "/offers",
    "/flightsresult",
    "/onewaysearchresult",
    "/roundwaysearchresult",
    "/roundsearchresult",
    "/multicitysearchresult",
  ]);
  const isDarkHeader =
    darkHeaderPaths.has(location?.pathname) ||
    (isMobile && searchResultPaths.has(location?.pathname));
  const navIconColor = isDarkHeader ? "#EAF2FF" : "#0F2745";
  const primaryNavItems = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Blog", to: "/blog" },
    { label: "Contact", to: "/contact" },
  ];

  const isNavItemActive = (path) =>
    location?.pathname === path ||
    (path !== "/" && String(location?.pathname || "").startsWith(path));

  return (
    <Box
      sx={{
        background: isDarkHeader
          ? "linear-gradient(180deg, rgba(18, 26, 36, 0.92) 0%, rgba(30, 41, 59, 0.88) 100%)"
          : "rgba(248, 252, 255, 0.82)",
        backdropFilter: "blur(10px)",
        borderBottom: isDarkHeader
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(15, 39, 69, 0.1)",
        boxShadow: isDarkHeader
          ? "0px 12px 28px rgba(0, 0, 0, 0.24)"
          : "0px 8px 24px rgba(16, 42, 67, 0.08)",
        minHeight: { xs: "76px", md: "88px" },
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      <Box>
        <Container>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              py: { xs: 1.1, md: 1.4 },
            }}
          >
            <Box>
              <Link
                style={{ textDecoration: "none", cursor: "pointer" }}
                to="/"
              >
                <Typography
                  sx={{
                    fontSize: { xs: "28px", md: "34px" },
                    letterSpacing: "0.4px",
                    lineHeight: 1,
                    background:
                      "linear-gradient(120deg, #ffffff 0%, #d7e9ff 48%, #8fd6ff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: isDarkHeader
                      ? "0 8px 24px rgba(0,0,0,0.28)"
                      : "0 6px 20px rgba(15,39,69,0.12)",
                  }}
                >
                  Fly Jatt
                </Typography>
              </Link>
            </Box>

            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 0.8,
                px: 1,
                py: 0.8,
                borderRadius: "999px",
                background: isDarkHeader
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(255, 255, 255, 0.9)",
                border: isDarkHeader
                  ? "1px solid rgba(255,255,255,0.14)"
                  : "1px solid rgba(15,39,69,0.1)",
                boxShadow: isDarkHeader
                  ? "none"
                  : "0 8px 20px rgba(15, 39, 69, 0.08)",
              }}
            >
              {primaryNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    textDecoration: "none",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: isNavItemActive(item.to)
                      ? "#ffffff"
                      : isDarkHeader
                        ? "#e9f2ff"
                        : "#15324f",
                    background: isNavItemActive(item.to)
                      ? "linear-gradient(120deg, var(--primary-color) 0%, var(--primary-button) 100%)"
                      : "transparent",
                    transition: "all 0.18s ease",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </Box>

            <Box>
              {user?.name ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Box>
                    <Box
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
                        <IconButton
                          onClick={handleClick}
                          size="small"
                          aria-controls={open ? "account-menu" : undefined}
                          aria-haspopup="true"
                          aria-expanded={open ? "true" : undefined}
                        >
                          <AccountCircle
                            sx={{
                              color: navIconColor,
                              fontSize: "40px",
                            }}
                          />
                          <KeyboardArrowDownIcon
                            sx={{
                              color: navIconColor,
                              fontSize: "30px",
                            }}
                          />
                        </IconButton>
                      </Box>

                      <Menu
                        anchorEl={anchorEl}
                        id="account-menu"
                        open={open}
                        onClose={handleClose}
                        onClick={handleClose}
                        PaperProps={{
                          elevation: 0,
                          sx: {
                            overflow: "visible",
                            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                            mt: 1.5,
                            "& .MuiAvatar-root": {
                              width: 32,
                              height: 32,
                              ml: -0.5,
                              mr: 1,
                            },
                            "&:before": {
                              content: '""',
                              display: "block",
                              position: "absolute",
                              top: 0,
                              right: 14,
                              width: 10,
                              height: 10,
                              bgcolor: "background.paper",
                              transform: "translateY(-50%) rotate(45deg)",
                              zIndex: 0,
                            },
                          },
                        }}
                        transformOrigin={{
                          horizontal: "right",
                          vertical: "top",
                        }}
                        anchorOrigin={{
                          horizontal: "right",
                          vertical: "bottom",
                        }}
                      >
                        <MenuItem>
                          <ListItemIcon>
                            <AccountCircle
                              sx={{
                                fontSize: "30px",
                                color: "var(--primary-button)",
                              }}
                            />
                          </ListItemIcon>
                          <Box sx={{ pl: "10px" }}>
                            <Typography
                              sx={{
                                fontSize: "14px",
                                textTransform: "capitalize",
                                color: "var(--primary-button)",
                              }}
                            >
                              {user?.name}
                            </Typography>
                            <Typography sx={{ fontSize: "12px" }}>
                              {" "}
                              {user?.email}
                            </Typography>
                          </Box>
                        </MenuItem>
                        <Divider />
                        <MenuItem>
                          <Link
                            style={{
                              textDecoration: "none",
                              color: "var(--primary-button)",
                              fontWeight: 500,
                              fontSize: "18px",
                            }}
                            to="/my-account/profile"
                          >
                            <ListItemIcon>
                              <AccountCircle
                                sx={{
                                  color: "var(--primary-button)",
                                }}
                                fontSize="small"
                              />
                            </ListItemIcon>
                            My Account
                          </Link>
                        </MenuItem>

                        <MenuItem>
                          <Link
                            style={{
                              textDecoration: "none",
                              color: "var(--primary-button)",
                              fontWeight: 500,
                            }}
                            to="/my-account/booking"
                          >
                            <ListItemIcon>
                              <Bookmark
                                sx={{
                                  color: "var(--primary-button)",
                                }}
                                fontSize="small"
                              />
                            </ListItemIcon>
                            Booking History
                          </Link>
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout}>
                          <ListItemIcon>
                            <ExitToApp fontSize="small" />
                          </ListItemIcon>
                          Sign Out
                        </MenuItem>
                      </Menu>
                    </Box>

                    <Box
                      sx={{
                        display: {
                          xs: "block",
                          sm: "block",
                          md: "none",
                          lg: "none",
                        },
                      }}
                    >
                      <div>
                        <Box>
                          <MenuIcon
                            onClick={toggleDrawer(true)}
                            sx={{ color: navIconColor, fontSize: "25px" }}
                          />
                        </Box>
                        <Drawer
                          anchor="left"
                          open={isDrawerOpen}
                          onClose={toggleDrawer(false)}
                        >
                          <Box sx={{ px: "20px", py: "25px" }}>
                            <Box
                              sx={{ width: 250 }}
                              role="presentation"
                              onClick={toggleDrawer(false)}
                              onKeyDown={toggleDrawer(false)}
                            >
                              <Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexDirection: "column",
                                    gap: "10px",
                                  }}
                                >
                                  <Box>
                                    <MenuItem>
                                      <ListItemIcon>
                                        <AccountCircle
                                          sx={{
                                            fontSize: "30px",
                                            color: "var(--primary-button)",
                                          }}
                                        />
                                      </ListItemIcon>
                                      <Box sx={{ pl: "10px" }}>
                                        <Typography
                                          sx={{
                                            fontSize: "14px",
                                            textTransform: "capitalize",
                                            color: "var(--primary-button)",
                                          }}
                                        >
                                          {user?.name}
                                        </Typography>
                                        <Typography sx={{ fontSize: "12px" }}>
                                          {" "}
                                          {user?.email}
                                        </Typography>
                                      </Box>
                                    </MenuItem>
                                    <Divider />
                                    <Box>
                                      <Grid container spacing={3}>
                                        <Grid
                                          item
                                          xs={12}
                                          sm={12}
                                          md={8}
                                          lg={3}
                                        >
                                          <Grid
                                            container
                                            sx={{
                                              bgcolor: "white",
                                              borderRadius: "5px",
                                            }}
                                          >
                                            <Grid
                                              item
                                              xs={12}
                                              sx={{ pb: "30px" }}
                                            >
                                              <Box>
                                                <Box>
                                                  {/* profile info  */}
                                                  <Link
                                                    style={{
                                                      textDecoration: "none",
                                                      backgroundColor:
                                                        location?.pathname ===
                                                          "/my-account"
                                                          ? "var(--primary-color)"
                                                          : "#E6ECF5",
                                                      display: "flex",
                                                      color:
                                                        location?.pathname ===
                                                          "/my-account"
                                                          ? "#3D3A49"
                                                          : "#003E6B",
                                                      alignItems: "center",
                                                      height: "40px",
                                                      paddingLeft: "20px",
                                                      paddingRight: "20px",
                                                      marginTop: "5px",
                                                      gap: "10px",
                                                      cursor: "pointer",
                                                    }}
                                                    to="/my-account/profile"
                                                  >
                                                    <PersonIcon
                                                      sx={{ fontSize: "20px" }}
                                                    />
                                                    <Typography
                                                      sx={{
                                                        fontSize: "13px",
                                                        fontWeight: 500,
                                                      }}
                                                    >
                                                      Profile Information
                                                    </Typography>
                                                  </Link>
                                                </Box>
                                                {/* bookings */}
                                                <Box>
                                                  <Link
                                                    to="/my-account/booking"
                                                    style={{
                                                      textDecoration: "none",
                                                      backgroundColor:
                                                        location?.pathname ===
                                                          "/my-account"
                                                          ? "var(--primary-color)"
                                                          : "#E6ECF5",
                                                      display: "flex",
                                                      color:
                                                        location.pathname ===
                                                          "/my-account"
                                                          ? "#3D3A49"
                                                          : "#003E6B",
                                                      alignItems: "center",
                                                      height: "40px",
                                                      paddingLeft: "20px",
                                                      paddingRight: "20px",
                                                      marginTop: "5px",
                                                      gap: "10px",
                                                      cursor: "pointer",
                                                    }}
                                                  >
                                                    <AnimationIcon
                                                      sx={{ fontSize: "20px" }}
                                                    />
                                                    <Typography
                                                      sx={{
                                                        fontSize: "13px",
                                                        fontWeight: 500,
                                                      }}
                                                    >
                                                      My Bookings
                                                    </Typography>
                                                  </Link>
                                                </Box>

                                                {/* transactions */}
                                                <Link
                                                  to="/userinfov2/usertransctions"
                                                  style={{
                                                    textDecoration: "none",
                                                    backgroundColor:
                                                      location.pathname ===
                                                        "/userinfov2/usertransctions"
                                                        ? "var(--primary-color)"
                                                        : "#E6ECF5",
                                                    display: "flex",
                                                    color:
                                                      location.pathname ===
                                                        "/userinfov2/usertransctions"
                                                        ? "#3D3A49"
                                                        : "#003E6B",
                                                    alignItems: "center",
                                                    height: "40px",
                                                    paddingLeft: "20px",
                                                    paddingRight: "20px",
                                                    marginTop: "5px",
                                                    gap: "10px",
                                                    cursor: "pointer",
                                                  }}
                                                >
                                                  <AccountBalanceIcon
                                                    sx={{ fontSize: "20px" }}
                                                  />
                                                  <Typography
                                                    sx={{
                                                      fontSize: "13px",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    My Transactions
                                                  </Typography>
                                                </Link>
                                                {/* travel buddy */}
                                                <Link
                                                  to="/userinfov2/usertraveler"
                                                  style={{
                                                    textDecoration: "none",
                                                    backgroundColor:
                                                      location?.pathname ===
                                                        "/userinfov2/usertraveler"
                                                        ? "var(--primary-color)"
                                                        : "#E6ECF5",
                                                    display: "flex",
                                                    color:
                                                      location?.pathname ===
                                                        "/userinfov2/usertraveler"
                                                        ? "#3D3A49"
                                                        : "#003E6B",
                                                    alignItems: "center",
                                                    height: "40px",
                                                    paddingLeft: "20px",
                                                    paddingRight: "20px",
                                                    marginTop: "5px",
                                                    gap: "10px",
                                                    cursor: "pointer",
                                                  }}
                                                >
                                                  <TourIcon
                                                    sx={{ fontSize: "20px" }}
                                                  />
                                                  <Typography
                                                    sx={{
                                                      fontSize: "13px",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    My Travel Buddy
                                                  </Typography>
                                                </Link>
                                              </Box>
                                            </Grid>
                                          </Grid>
                                        </Grid>
                                      </Grid>
                                    </Box>

                                    <Divider />

                                    <MenuItem onClick={handleLogout}>
                                      <ListItemIcon>
                                        <ExitToApp fontSize="small" />
                                      </ListItemIcon>
                                      Sign Out
                                    </MenuItem>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </Drawer>
                      </div>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Button
                  onClick={handleClickSignInOpen}
                  sx={{
                    bgcolor: "var(--primary-color)",
                    textTransform: "capitalize",
                    color: "#FFFFFF",
                    width: "112px",
                    fontSize: "13px",
                    fontWeight: 700,
                    borderRadius: "999px",
                    boxShadow: "0 8px 20px rgba(0, 154, 214, 0.3)",
                    ":hover": {
                      bgcolor: "var(--primary-button)",
                      color: "#FFFFFF",
                      opacity: 1,
                    },
                  }}
                >
                  Sign In
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

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
                          width: "200%", // Increased width
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
                          width: "200%", // Increased width
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
            <SignInWithGoogle
              closeModal={() => setOpenSignIn(false)}
              onLoginSuccess={() => {
                setOpenSignIn(false);
              }}
            />

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

export default NavBar;
