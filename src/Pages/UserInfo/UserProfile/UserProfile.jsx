import {
  Box,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import secureLocalStorage from "react-secure-storage";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import PersonIcon from "@mui/icons-material/Person";
import { config } from "../../../config";
const isMobile = window.innerWidth <= 768;

const UserProfile = () => {
  const [userInfo, setUserInfo] = useState([]);
  const token = secureLocalStorage.getItem("access_token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const api = `${config.baseUrl}/user/profileInfo`;

      try {
        if (token) {
          const response = await fetch(api, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
            return;
          }
        }

        // Fallback to local Next.js auth session when external API is unavailable.
        const sessionResponse = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (sessionResponse.ok) {
          const payload = await sessionResponse.json().catch(() => ({}));
          const sessionUser = payload?.user || {};
          setUserInfo({
            firstName: String(sessionUser?.name || "").split(" ")[0] || "",
            lastName: String(sessionUser?.name || "").split(" ").slice(1).join(" "),
            email: sessionUser?.email || "",
            phone: "",
            nationality: "BD",
            passport: "",
          });
          return;
        }

        navigate("/");
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchUserProfile();
  }, [token, navigate]);

  const [editMode, setEditMode] = useState(false);
  const handleEditClick = () => {
    navigate("/userinfov2/updateprofilev2", {
      state: { userInfo },
    });
  };
  return (
    <Box
      sx={
        {
          // p: {
          //   xs: "10px 30px 10px 40px",
          //   sm: "20px 30px 10px 40px",
          //   md: "30px",
          //   // lg: "30px 30px 40px 40px",
          // },
          // bgcolor: "white",
          // borderRadius:"5px"
        }
      }
    >
      <Box>
        <Box
          sx={{
            bgcolor: "var(--primary-color)",
            borderRadius: "3px",
            px: "30px",
            display: "flex",
            alignItems: "center",
            py: "10px",
            justifyContent: "space-between",
            cursor: "pointer",
            mb: 2,
          }}
        // onClick={handleAddDepositClick}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: {
                xs: "12px",
                sm: "12px",
                md: "14px",
                lg: "14px",
              },
              textTransform: "capitalize",
            }}
          >
            {userInfo?.firstName}'s Information
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            p: {
              xs: "15px",
              // sm: "20px 30px 10px 40px",
              md: "20px 30px",
              // lg: "30px 30px 40px 40px",
            },
            bgcolor: "white",
            borderRadius: "5px",
          }}
        >
          <Box sx={{}}>
            {userInfo?.profilePicture?.link ? (
              <img
                src={userInfo?.profilePicture?.link}
                style={{
                  height: isMobile ? "80px" : "105px",
                  width: isMobile ? "80px" : "105px",
                  borderRadius: "3px",
                }}
              />
            ) : (
              <Box sx={{ border: "1px solid var(--primary-button)" }}>
                <PersonIcon
                  sx={{
                    color: "var(--primary-button)",
                    height: isMobile ? "80px" : "105px",
                    width: isMobile ? "80px" : "105px",
                  }}
                />
              </Box>
            )}
          </Box>

          <Box
            onClick={handleEditClick}
            sx={{
              bgcolor: "var(--primary-button)",
              // width: {
              //   xs: "120px",
              //   sm: "120px",
              //   md: "150px",
              //   lg: "150px",
              // },
              // height: "35px",
              width: "fit-content",
              height: "fit-content",
              px: 1.5,
              py: 1,
              borderRadius: "3px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
            }}
          >
            <EditIcon
              sx={{
                color: "white",
                fontSize: {
                  xs: "15px",
                  sm: "15px",
                  md: "15px",
                  lg: "15px",
                },
              }}
            />
            <Typography
              sx={{
                color: "white",
                fontSize: {
                  xs: "10px",
                  sm: "10px",
                  md: "13px",
                  lg: "13px",
                },
              }}
            >
              Edit Information
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            p: {
              xs: "15px",
              // sm: "20px 30px 10px 40px",
              md: "30px",
              // lg: "30px 30px 40px 40px",
            },
            bgcolor: "white",
            borderRadius: "5px",
            mt: 2,
          }}
        >
          <Grid
            container
            spacing={{ xs: 1, sm: 1, md: 0, lg: 0 }}
            sx={{
              mb: {
                xs: "20px",
                sm: "20px",
                // md: "50px",
                // lg: "50px",
              },
            }}
          >
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Name
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                    // paddingBottom: "5px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {`${userInfo?.firstName} ${userInfo?.lastName}`}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Select Gender
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.gender ? userInfo?.gender : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Enter Date of Birth
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                    // paddingBottom: "5px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.dob
                      ? moment(userInfo?.dob).format("DD MMM YY")
                      : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Grid container spacing={{ xs: 1, sm: 1, md: 0, lg: 0 }}>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Select Nationality
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.nationality ? userInfo?.nationality : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Enter Passport Number
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                    // paddingBottom: "5px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.passport ? userInfo?.passport : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Enter Passport ExpiryDate
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                    // paddingBottom: "5px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.passportExpiryDate
                      ? moment(userInfo?.passportExpiryDate).format("DD MMM YY")
                      : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Grid
            spacing={{ xs: 1, sm: 1, md: 0, lg: 0 }}
            container
            sx={{
              mt: {
                xs: "20px",
                sm: "20px",
                // md: "50px",
                // lg: "50px",
              },
            }}
          >
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Email
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                    // paddingBottom: "5px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.email ? userInfo?.email : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Phone Number
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "5px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      md: "90%",
                      lg: "90%",
                    },
                    // paddingBottom: "5px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {userInfo?.phone ? userInfo?.phone : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default UserProfile;
