import { Box, Button, Container, Grid, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import NavBar from "../../Shared/NavBar/NavBar";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TourIcon from "@mui/icons-material/Tour";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import Swal from "sweetalert2";
import AnimationIcon from "@mui/icons-material/Animation";
import { AccountCircle } from "@mui/icons-material";

const UserInfoV2 = () => {
  const [userSidebar, setUserSideBar] = useState("profile");
  const [manageBookingPnr, setManageBookingPnr] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isProfileRoute = (suffix) =>
    location?.pathname === `/userinfov2/${suffix}` ||
    location?.pathname === `/myprofile/${suffix}`;
  const user = secureLocalStorage.getItem("userData");

  const handleSideBar = (section) => {
    setUserSideBar(section);
  };

  const getSidebarItemStyle = (section) => ({
    backgroundColor:
      userSidebar === section ? "var(--primary-color)" : "#E6ECF5",
    display: "flex",
    color: userSidebar === section ? "#3D3A49" : "#003E6B",
    alignItems: "center",
    height: "40px",
    px: "20px",
    mt: "5px",
    gap: "10px",
    cursor: "pointer",
  });

  const handleLogout = () => {
    secureLocalStorage.removeItem("access_token");
    secureLocalStorage.removeItem("userData");

    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out successfully!",
    }).then(() => {
      navigate("/");
    });
  };

  const handleManageBooking = () => {
    const pnr = String(manageBookingPnr || "").trim().toUpperCase();
    if (!pnr) {
      Swal.fire({
        icon: "warning",
        title: "PNR Required",
        text: "Please paste a valid PNR/Locator to continue.",
      });
      return;
    }

    navigate(`/bookingconfirmation?pnr=${encodeURIComponent(pnr)}`);
  };

  return (
    <Box
      sx={{
        bgcolor: "#f2f2f2",
        height: {
          xs: "100%",
          sm: "100%",
          md: "800px",
          // lg: "100vh",
        },
      }}
    >
      <Box>
        <NavBar />
      </Box>

      <Container
        sx={{
          my: {
            xs: "20px",
            sm: "20px",
            // md: "50px",
            // lg: "50px",
          },
        }}
      >
        <Grid container spacing={3}>
          <Grid
            item
            xs={12}
            sm={12}
            md={3}
            lg={3}
            sx={{
              display: {
                xs: "none",
                sm: "none",
                md: "block",
                lg: "block",
              },
            }}
          >
            <Grid container sx={{ bgcolor: "white", borderRadius: "5px" }}>
              <Grid
                item
                xs={12}
                sx={{
                  py: "10px",
                  px: "10px",
                  display: "flex",
                  justifyContent: "center",
                  borderBottom: "1px solid var(--primary-button)",
                  mb: 2,
                  // borderRadius: "5px"
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                  }}
                >
                  <AccountCircle
                    sx={{ fontSize: "30px", color: "var(--primary-button)", pt: .5 }}
                  />
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
                </Box>
              </Grid>
              <Grid item xs={12} sx={{ pb: "50px", px: "10px" }}>
                <Box>
                  <Box>
                    {/* profile info  */}
                    <Link
                      style={{
                        textDecoration: "none",
                        backgroundColor: isProfileRoute("userprofile")
                          ? "var(--primary-color)"
                          : "#E6ECF5",
                        display: "flex",
                        color: isProfileRoute("userprofile")
                          ? "#3D3A49"
                          : "#003E6B",
                        alignItems: "center",
                        marginTop: "5px",
                        padding: "10px 10px",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                      to="userprofile"
                    >
                      <PersonIcon sx={{ fontSize: "20px" }} />
                      <Typography sx={{ fontSize: "13px", fontWeight: 500 }}>
                        Profile Information
                      </Typography>
                    </Link>
                  </Box>
                  {/* bookings */}
                  <Box>
                    <Link
                      to="userbooking"
                      style={{
                        textDecoration: "none",
                        backgroundColor: isProfileRoute("userbooking")
                          ? "var(--primary-color)"
                          : "#E6ECF5",
                        display: "flex",
                        color: isProfileRoute("userbooking")
                          ? "#3D3A49"
                          : "#003E6B",
                        alignItems: "center",
                        marginTop: "5px",
                        padding: "10px 10px",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <AnimationIcon sx={{ fontSize: "20px" }} />
                      <Typography sx={{ fontSize: "13px", fontWeight: 500 }}>
                        My Bookings
                      </Typography>
                    </Link>
                  </Box>

                  {/* wallet */}
                  {/* <Link
                    to="userwallet"
                    style={{
                      textDecoration: "none",
                      backgroundColor:
                        location?.pathname === "/userinfov2/userwallet"
                          ? "var(--primary-color)"
                          : "#E6ECF5",
                      display: "flex",
                      color:
                        location?.pathname === "/userinfov2/userwallet"
                          ? "#3D3A49"
                          : "#003E6B",
                      alignItems: "center",
                      marginTop: "5px",
                      padding: "10px 10px",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ fontSize: "20px" }} />
                    <Typography sx={{ fontSize: "13px", fontWeight: 500 }}>
                      My Wallet
                    </Typography>
                  </Link> */}
                  {/* transactions */}
                  <Link
                    to="usertransctions"
                    style={{
                      textDecoration: "none",
                      backgroundColor: isProfileRoute("usertransctions")
                        ? "var(--primary-color)"
                        : "#E6ECF5",
                      display: "flex",
                      color: isProfileRoute("usertransctions")
                        ? "#3D3A49"
                        : "#003E6B",
                      alignItems: "center",
                      marginTop: "5px",
                      padding: "10px 10px",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <AccountBalanceIcon sx={{ fontSize: "20px" }} />
                    <Typography sx={{ fontSize: "13px", fontWeight: 500 }}>
                      My Transactions
                    </Typography>
                  </Link>
                  {/* travel buddy */}
                  <Link
                    to="usertraveler"
                    style={{
                      textDecoration: "none",
                      backgroundColor: isProfileRoute("usertraveler")
                        ? "var(--primary-color)"
                        : "#E6ECF5",
                      display: "flex",
                      color: isProfileRoute("usertraveler")
                        ? "#3D3A49"
                        : "#003E6B",
                      alignItems: "center",
                      // height: "40px",
                      // paddingLeft: "20px",
                      // paddingRight: "20px",
                      marginTop: "5px",
                      padding: "10px 10px",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <TourIcon sx={{ fontSize: "20px" }} />
                    <Typography sx={{ fontSize: "13px", fontWeight: 500 }}>
                      My Travel Buddy
                    </Typography>
                  </Link>

                  <Box
                    sx={{
                      mt: 2,
                      p: 1.25,
                      border: "1px solid #d6e0ec",
                      borderRadius: "8px",
                      backgroundColor: "#f7fbff",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#003E6B",
                        mb: 0.8,
                      }}
                    >
                      Manage Booking
                    </Typography>
                    <TextField
                      size="small"
                      placeholder="Paste PNR / Locator"
                      value={manageBookingPnr}
                      onChange={(event) => setManageBookingPnr(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleManageBooking();
                        }
                      }}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: "12px",
                          py: "8px",
                        },
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "#fff",
                        },
                      }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 1, fontSize: "11px", fontWeight: 700 }}
                      onClick={handleManageBooking}
                    >
                      Show Booking Details
                    </Button>
                  </Box>
                  {/* logout
                  <Box
                    sx={{
                      display: "flex",
                      color: "#3D3A49",
                      alignItems: "center",
                      gap: "20px",
                      px: "20px",
                      pt: "50px",
                      cursor: "pointer",
                    }}
                    onClick={handleLogout}
                  >
                    <LogoutIcon
                      sx={{
                        fontSize: "30px",
                        color: "var(--primary-button)",
                      }}
                    />    
                    <Typography
                      sx={{
                        fontSize: "17px",
                        fontWeight: 500,
                        color: "#3D3A49",
                      }}
                    >
                      Logout
                    </Typography>
                  </Box> */}
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} sm={12} md={9} lg={9}>
            <Grid container>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <Box
                  sx={{
                    mb: {
                      // xs: "20px",
                      // sm: "20px",
                      // md: "0px",
                      // lg: "0px",
                    },
                  }}
                >
                  <Outlet />
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default UserInfoV2;
