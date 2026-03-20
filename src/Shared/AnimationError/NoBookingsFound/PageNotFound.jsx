import PageNotFounds from "../../../asstes/img/NotFound/404_transparrent .gif";
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
  TextField,
  Typography,
} from "@mui/material";
import logo from "../../../asstes/img/flyjattlogo.svg";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import GoogleIcon from "@mui/icons-material/Google";
import PhoneIcon from "@mui/icons-material/Phone";
import secureLocalStorage from "react-secure-storage";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MenuIcon from "@mui/icons-material/Menu";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TourIcon from "@mui/icons-material/Tour";
import Swal from "sweetalert2";
import AnimationIcon from "@mui/icons-material/Animation";
import {
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  Divider,
} from "@mui/material";
import { AccountCircle, ExitToApp, Bookmark } from "@mui/icons-material";
import commaNumber from "comma-number";
import BrandWordmark from "../../BrandWordmark/BrandWordmark";

import axios from "axios";
import { config } from "../../../config";
const isMobile = window.innerWidth <= 768;

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const PageNotFound = () => {
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
  // blanced funcatinolity
  const [isEditing, setIsEditing] = useState(false);
  const [balance, setBlance] = useState([]);
  const token = secureLocalStorage.getItem("access_token");
  const handleIconClick = () => {
    setIsEditing((prev) => !prev);
  };
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.baseUrl}/deposit/user/wallet`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBlance(data);
        } else {
          console.error("Failed to fetch data:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [token]);

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
      const response = await fetch(
        // "http://192.168.10.91:8080/auth/signInUser",
        `${config.baseUrl}/auth/signInUser`,
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
        secureLocalStorage.setItem("access_token", data?.access_token);
        secureLocalStorage.setItem("userData", data?.userData);
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

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUserinfo = () => {
    navigate("/userinfo");
  };

  // logOut function
  const handleLogout = () => {
    secureLocalStorage.removeItem("access_token");
    secureLocalStorage.removeItem("userData");
    secureLocalStorage.removeItem("data");

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
    const remainingTimes = expirationDate.getTime() - now.getTime();

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

  //   const handleGoogleLogIn = () => {
  //     window.location.href = "https://<backend-api>/social-site/google";

  // };

  const handleGoogleLogIn = () => {
    const authWindow = window.open(
      `${config.baseUrl}/social-site/google`,
      "_blank",
      "width=500,height=600"
    );

    // Listen for a message from the auth window
    window.addEventListener("message", (event) => {
      // Check if the message contains expected data
      if (event.origin === `${config.baseUrl}`) {
        const data = event.data;
        if (data.user && data.user.access_token) {
          const accessToken = data.user.access_token;
          const userData = data.user.userData;
          const expireIn = data.user.expireIn;

          // Save data to local storage
          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("expire_in", expireIn);

          // Close the auth window
          authWindow.close();

          // Show success alert with user details
          Swal.fire({
            icon: "success",
            title: "Login Successful",
            html: `
            <p>You are now logged in!</p>
            <p><strong>Name:</strong> ${userData.name}</p>
            <p><strong>Email:</strong> ${userData.email}</p>
          `,
            confirmButtonText: "Go to Home",
          }).then(() => {
            navigate("/");
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Login Failed",
            text: "Failed to retrieve access token.",
          });
        }
      }
    });

    // Fallback if auth window is closed without response
    const pollAuthWindow = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(pollAuthWindow);
        Swal.fire({
          icon: "error",
          title: "Login Cancelled",
          text: "The login window was closed before authentication completed.",
        });
      }
    }, 500);
  };
  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(180deg, #151F29 0%, #2A3248 100%)",

          height: "100px",
          width: "100%",
          position: "sticky",
        }}
      >
        <Box>
          <Container>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "100%",
                padding: "25px 0px",
              }}
            >
              <Box>
                <Link
                  style={{ textDecoration: "none", cursor: "pointer" }}
                  to="/"
                >
                  <img
                    style={{ width: isMobile ? "70%" : "100%" }}
                    src={logo}
                  />
                </Link>
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
                    <Box
                      sx={{
                        bgcolor: "var(--primary-color)",
                        width: "100%",
                        height: "32px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "start",
                        px: "6px",
                        gap: "5px",
                        borderRadius: "5px",
                      }}
                      onClick={handleIconClick}
                    >
                      <AccountBalanceWalletIcon
                        sx={{
                          color: "var(--primary-button)",
                          fontSize: "25px",
                        }}
                      />
                      {isEditing && (
                        <Typography
                          sx={{
                            color: "var(--meta-black)",
                            fontWeight: 600,
                            fontSize: "20px",
                          }}
                        >
                          {commaNumber(balance?.ammount)}
                          TK
                        </Typography>
                      )}
                    </Box>
                    {/* <Button
                    // onClick={handleUserinfo}
                    sx={{
                      bgcolor: "var(--button-color)",
                      textTransform: "capitalize",
                      color: "black",
                      width: "100%",
                      fontSize: {
                        xs: "10px",
                        sm: "10px",
                        md: "13px",
                        lg: "13px",
                      },
                      fontWeight: 500,
                      ":hover": {
                        bgcolor: "var(--button-color)",
                        color: "black",
                      },
                      textTransform: "capitalize !important",
                    }}
                  >
                    {user?.name}
                  </Button> */}
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
                            // sx={{ bgcolor: "white", borderRadius: "10px",width:"100%",}}
                            onClick={handleClick}
                            size="small"
                            aria-controls={open ? "account-menu" : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? "true" : undefined}
                          >
                            <AccountCircle
                              sx={{
                                color: "var(--primary-color)",
                                fontSize: "40px",
                              }}
                            />
                            <KeyboardArrowDownIcon
                              sx={{
                                color: "var(--primary-color)",
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
                              filter:
                                "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
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
                              <AccountCircle sx={{ fontSize: "30px" }} />
                            </ListItemIcon>
                            <Box sx={{ pl: "10px" }}>
                              <Typography
                                sx={{
                                  fontSize: "14px",
                                  textTransform: "capitalize",
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
                              }}
                              to="/userinfov2/userprofile"
                            >
                              <ListItemIcon>
                                <AccountCircle fontSize="small" />
                              </ListItemIcon>
                              Profile
                            </Link>
                          </MenuItem>

                          <MenuItem>
                            <Link
                              style={{
                                textDecoration: "none",
                                color: "var(--primary-button)",
                                fontWeight: 500,
                              }}
                              to="/userinfov2/userbooking"
                            >
                              <ListItemIcon>
                                <Bookmark fontSize="small" />
                              </ListItemIcon>
                              My Booking
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
                              sx={{ color: "white", fontSize: "30px" }}
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
                                            sx={{ fontSize: "30px" }}
                                          />
                                        </ListItemIcon>
                                        <Box sx={{ pl: "10px" }}>
                                          <Typography
                                            sx={{
                                              fontSize: "14px",
                                              textTransform: "capitalize",
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
                                                sx={{ py: "50px" }}
                                              >
                                                <Box>
                                                  <Box>
                                                    {/* profile info  */}
                                                    <Link
                                                      style={{
                                                        textDecoration: "none",
                                                        backgroundColor:
                                                          location?.pathname ===
                                                          "/userinfov2/userprofile"
                                                            ? "var(--primary-color)"
                                                            : "#E6ECF5",
                                                        display: "flex",
                                                        color:
                                                          location?.pathname ===
                                                          "/userinfov2/userprofile"
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
                                                      to="/userinfov2/userprofile"
                                                    >
                                                      <PersonIcon
                                                        sx={{
                                                          fontSize: "30px",
                                                        }}
                                                      />
                                                      <Typography
                                                        sx={{
                                                          fontSize: "17px",
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
                                                      to="/userinfov2/userbooking"
                                                      style={{
                                                        textDecoration: "none",
                                                        backgroundColor:
                                                          location?.pathname ===
                                                          "/userinfov2/userbooking"
                                                            ? "var(--primary-color)"
                                                            : "#E6ECF5",
                                                        display: "flex",
                                                        color:
                                                          location.pathname ===
                                                          "/userinfov2/userbooking"
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
                                                        sx={{
                                                          fontSize: "30px",
                                                        }}
                                                      />
                                                      <Typography
                                                        sx={{
                                                          fontSize: "17px",
                                                          fontWeight: 500,
                                                        }}
                                                      >
                                                        My Bookings
                                                      </Typography>
                                                    </Link>
                                                  </Box>

                                                  {/* wallet */}
                                                  <Link
                                                    to="/userinfov2/userwallet"
                                                    style={{
                                                      textDecoration: "none",
                                                      backgroundColor:
                                                        location?.pathname ===
                                                        "/userinfov2/userwallet"
                                                          ? "var(--primary-color)"
                                                          : "#E6ECF5",
                                                      display: "flex",
                                                      color:
                                                        location?.pathname ===
                                                        "/userinfov2/userwallet"
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
                                                    <AccountBalanceWalletIcon
                                                      sx={{ fontSize: "30px" }}
                                                    />
                                                    <Typography
                                                      sx={{
                                                        fontSize: "17px",
                                                        fontWeight: 500,
                                                      }}
                                                    >
                                                      My Wallet
                                                    </Typography>
                                                  </Link>
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
                                                      sx={{ fontSize: "30px" }}
                                                    />
                                                    <Typography
                                                      sx={{
                                                        fontSize: "17px",
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
                                                      sx={{ fontSize: "30px" }}
                                                    />
                                                    <Typography
                                                      sx={{
                                                        fontSize: "17px",
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
                      bgcolor: "var(--button-color)",
                      textTransform: "capitalize",
                      color: "#4C4B4B",
                      width: "100px",
                      fontSize: "14px",
                      ":hover": {
                        bgcolor: "var(--button-color)",
                        color: "#4C4B4B",
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
                onClick={handleGoogleLogIn}
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

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <img
          style={{ height: "200px" }}
          src={PageNotFounds}
          alt="404 Not Found"
        />
        <Box>
          <Link to="/">
            <Button
              sx={{
                background: "var(--primary-button)",
                color: "white",
                fontWeight: 600,
                height: "40px",
                width: "150px",
                fontSize: "15px",
                mt: "70px",
                ":hover": {
                  background: "var(--primary-button)",
                  color: "white",
                },
                textTransform: "capitalize",
              }}
            >
              Back To Home
            </Button>
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default PageNotFound;
