import {
  Box,
  Button,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import datas from "../../../Pages/fakeData/CountryList";
import { Calendar } from "react-date-range";
import moment from "moment";
import Swal from "sweetalert2";
import secureLocalStorage from "react-secure-storage";
import { useLocation, useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import axios from "axios";
import { config } from "../../../config";
const isMobile = window.innerWidth <= 768;

const UserProfileUpdated = () => {
  const location = useLocation();
  const { userInfo } = location.state || {};
  const resolveInitialDate = (value) => {
    if (!value) return null;
    const parsed = moment(value, ["DD-MM-YYYY", "YYYY-MM-DD", moment.ISO_8601], true);
    return parsed.isValid() ? parsed.toDate() : value;
  };
  const [openProfileDate, setOpenProfileDate] = useState(false);
  const [selectedProfileDate, setSelectedProfileDate] = useState(
    resolveInitialDate(userInfo?.dob)
  );
  const [openPassDate, setOpenPassDate] = useState(false);
  const [selectedPassDate, setSelectedPassDate] = useState(
    resolveInitialDate(
      userInfo?.passportexp || userInfo?.passportExp || userInfo?.passportExpiryDate
    )
  );
  const token = secureLocalStorage.getItem("access_token");
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(
    `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`
  );
  // const [lastName, setLastName] = useState(userInfo?.lastName || "");
  const [gender, setGender] = useState(userInfo?.gender || "");
  const [nation, setNation] = useState(userInfo?.nationality || "BD");
  const [address, setAddress] = useState(userInfo?.address || "");
  const [passportNumber, setPassportNumber] = useState(
    userInfo?.passport || userInfo?.passportNumber || ""
  );
  const [passportIssuingCountry, setPassportIssuingCountry] = useState(
    userInfo?.passportCountry || userInfo?.passportIssuingCountry || userInfo?.nationality || "BD"
  );
  const [email, setEmail] = useState(userInfo?.email || "");
  const [phone, setPhone] = useState(userInfo?.phone || "");
  const [preview, setPreview] = useState(
    userInfo?.profilePicture?.link || null
  );

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewURL = URL.createObjectURL(file);
      setPreview(previewURL);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(
          `${config.baseUrl}/upload/profilePicture`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        if (response.data.Message) {
          Swal.fire({
            icon: "success",
            title: "Image Uploaded!",
            text: response.data.Message,
            confirmButtonText: "OK",
            timer: 3000,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Upload Failed",
            text: "There was an issue uploading your image. Please try again.",
            confirmButtonText: "OK",
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "There was a problem with the upload. Please try again later.",
          confirmButtonText: "OK",
        });
        console.error("Error uploading image", error);
      }
    }
  };

  // Function to trigger file input
  const triggerFileInput = () => {
    document.getElementById("fileInput").click();
  };

  const countryName = datas;

  const handleSelectProfile = (date) => {
    setSelectedProfileDate(date);
    setOpenProfileDate(false);
  };

  const handleSelectPassDate = (date) => {
    setSelectedPassDate(date);
    setOpenPassDate(false);
  };

  const handleUpdatedProfile = async (e) => {
    e.preventDefault();

    const normalizeDateForApi = (value) => {
      if (!value) return "";
      const parsed = moment(value);
      if (!parsed.isValid()) return String(value);
      return parsed.format("DD-MM-YYYY");
    };

    const normalizeGenderForApi = (value) => {
      const text = String(value || "").trim().toLowerCase();
      if (text === "male" || text === "m") return "Male";
      if (text === "female" || text === "f") return "Female";
      return String(value || "").trim();
    };

    const body = {
      fullName: String(firstName || "").trim(),
      phone: String(phone || "").replace(/[^0-9]/g, ""),
      email: String(email || "").trim().toLowerCase(),
      address: String(address || "").trim(),
      dob: normalizeDateForApi(selectedProfileDate),
      gender: normalizeGenderForApi(gender),
      nationility: nation,
      nationality: nation,
      passport: passportNumber,
      passportCountry: passportIssuingCountry,
      passportIssuingCountry: passportIssuingCountry,
      passportexp: normalizeDateForApi(selectedPassDate),
      passportExp: normalizeDateForApi(selectedPassDate),
      passportExpiryDate: normalizeDateForApi(selectedPassDate),
    };

    const normalizedBaseUrl = String(config?.baseUrl || "").trim().replace(/\/+$/, "");
    const candidateUrls = [
      "/api/user/updateUserProfile",
      `${normalizedBaseUrl}/user/updateUserProfile`,
      "/user/updateUserProfile",
    ];

    try {
      let response = null;
      let lastError = null;

      for (const url of candidateUrls) {
        try {
          response = await fetch(url, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });

          // If same-origin endpoint is not available, try next candidate.
          if (response.status === 404 || response.status === 405) {
            response = null;
            continue;
          }
          break;
        } catch (error) {
          lastError = error;
          response = null;
        }
      }

      if (!response) {
        throw (
          lastError ||
          new Error("Profile update service is unavailable. Ensure backend is running on port 3001.")
        );
      }

      if (response.ok) {
        // Success alert
        Swal.fire({
          icon: "success",
          title: "Profile Updated!",
          text: "Your profile has been updated successfully.",
          confirmButtonText: "OK",
        });
        navigate("/userinfov2/userprofile");
      } else {
        const errorData = await response.json();
        // Error alert
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text:
            errorData.message || "There was an error updating your profile.",
          confirmButtonText: "Try Again",
        });
      }
    } catch (error) {
      // Network or other errors
      Swal.fire({
        icon: "error",
        title: "Update Service Unavailable",
        text:
          "Could not reach update profile API. Please make sure backend server is running on localhost:3001.",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <Box
    // sx={{
    //   p: {
    //     xs: "10px 30px 10px 40px",
    //     sm: "10px 30px 10px 40px",
    //     md: "30px",
    //     // lg: "30px 30px 40px 40px",
    //   },
    //   bgcolor: "white",
    //   borderRadius: "5px",
    // }}
    >
      <form onSubmit={handleUpdatedProfile}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",

            p: {
              xs: "15px",
              // sm: "10px 30px 10px 40px",
              md: "20px 30px",
              // lg: "30px 30px 40px 40px",
            },
            bgcolor: "white",
            borderRadius: "5px",
          }}
        >
          <Box>
            <input
              id="fileInput"
              type="file"
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleFileChange}
            />
            {preview ? (
              <img
                src={preview}
                alt="Profile Preview"
                style={{
                  height: isMobile ? "80px" : "105px",
                  width: isMobile ? "80px" : "108px",
                  cursor: "pointer",
                }}
                onClick={triggerFileInput}
              />
            ) : (
              <Box
                sx={{
                  border: "1px solid var(--primary-button)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "105px",
                  width: "108px",
                  cursor: "pointer",
                }}
                onClick={triggerFileInput}
              >
                <PersonIcon
                  sx={{
                    color: "var(--primary-button)",
                    height: isMobile ? "80px" : "105px",
                    width: isMobile ? "80px" : "108px",
                  }}
                />
              </Box>
            )}
          </Box>
          <Button
            type="submit"
            sx={{
              bgcolor: "var(--primary-button)",
              width: {
                xs: "120px",
                sm: "120px",
                md: "160px",
                lg: "160px",
              },
              height: "35px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textTransform: "capitalize",

              gap: "5px",
              ":hover": {
                bgcolor: "var(--primary-button)",
              },
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
                  xs: "12px",
                  sm: "12px",
                  md: "13px",
                  lg: "13px",
                },
              }}
            >
              Save Profile
            </Typography>
          </Button>
        </Box>

        <Box
          sx={{
            p: {
              xs: "15px",
              // sm: "10px 30px 10px 40px",
              md: "20px 30px",
              // lg: "30px 30px 40px 40px",
            },
            bgcolor: "white",
            borderRadius: "5px",
            mt: 2,
          }}
        >
          <Grid
            container
            spacing={{ xs: 1, sm: 1, md: 1 }}
            sx={{
              mb: {
                xs: "10px",
                sm: "20px",
                // md: "50px",
                // lg: "50px",
              },
            }}
          >
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  First Name & Last Name
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "10px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      // md: "80%",
                      // lg: "80%",
                    },
                    paddingBottom: "5px",
                  }}
                >
                  <input
                    placeholder="Enter First / Given Name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "12px",
                      background: "none",
                      color: "var(--primary-button)",
                    }}
                  />
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
                    mt: "4px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      // md: "80%",
                      // lg: "80%",
                    },
                  }}
                >
                  <FormControl sx={{ minWidth: 120 }}>
                    <Select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      displayEmpty
                      inputProps={{ "aria-label": "Select Gender" }}
                      sx={{
                        "& .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                        "& .MuiInputBase-input": {
                          padding: "2px 0",
                          fontSize: "12px",
                          color: "var(--primary-button)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                      }}
                    >
                      <MenuItem value="">Select Gender</MenuItem>
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box sx={{ position: "relative" }}>
                <Box onClick={() => setOpenProfileDate(true)}>
                  <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                    Enter Date of Birth
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      mt: "8px",
                      flexDirection: "column",
                      borderBottom: "1px solid #ACA6A6",
                      width: {
                        xs: "100%",
                        sm: "100%",
                        // md: "80%",
                        // lg: "80%",
                      },
                      paddingBottom: "5px",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "12px", color: "var(--primary-button)" }}
                    >
                      {selectedProfileDate
                        ? moment(selectedProfileDate).format("DD MMM YY")
                        : "Select Date"}
                    </Typography>
                  </Box>
                </Box>
                {openProfileDate && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "100%",
                      // left: 0,
                      right: "unset",
                      left: -100,
                      zIndex: 1000,
                      bgcolor: "white",
                      boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                    }}
                  >
                    <Calendar
                      color="var(--primary-color)"
                      date={selectedProfileDate || new Date()}
                      onChange={(date) => handleSelectProfile(date)}
                      months={1}
                      direction="horizontal"
                      style={{
                        fontSize: "11px",
                        padding: "0",
                        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={{ xs: 1, sm: 1, md: 1 }}>
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
                      // md: "80%",
                      // lg: "80%",
                    },
                  }}
                >
                  <FormControl sx={{ minWidth: "100%", height: "100%" }}>
                    <Select
                      value={nation}
                      onChange={(e) => setNation(e.target.value)}
                      displayEmpty
                      inputProps={{ "aria-label": "Select Nationality" }}
                      sx={{
                        width: "100%",
                        "& .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                        "& .MuiInputBase-input": {
                          padding: "2px 0",
                          fontSize: "12px",
                          color: "var(--primary-button)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 200,
                            width: 200,
                          },
                        },
                      }}
                    >
                      <MenuItem value="BD" sx={{ fontWeight: 600 }}>
                        Bangladesh (BD)
                      </MenuItem>
                      {countryName?.map((country, index) => (
                        <MenuItem key={index} value={`${country.code}`}>
                          {country.name} ({country.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                    mt: "10px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      // md: "80%",
                      // lg: "80%",
                    },
                    paddingBottom: "5px",
                  }}
                >
                  <input
                    placeholder="Enter Passport Number"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      color: "var(--primary-button)",
                    }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Passport Issuing Country
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
                    },
                  }}
                >
                  <FormControl sx={{ minWidth: "100%", height: "100%" }}>
                    <Select
                      value={passportIssuingCountry}
                      onChange={(e) => setPassportIssuingCountry(e.target.value)}
                      displayEmpty
                      inputProps={{ "aria-label": "Select Passport Issuing Country" }}
                      sx={{
                        width: "100%",
                        "& .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                        "& .MuiInputBase-input": {
                          padding: "2px 0",
                          fontSize: "12px",
                          color: "var(--primary-button)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 200,
                            width: 200,
                          },
                        },
                      }}
                    >
                      <MenuItem value="BD" sx={{ fontWeight: 600 }}>
                        Bangladesh (BD)
                      </MenuItem>
                      {countryName?.map((country, index) => (
                        <MenuItem key={`passport-country-${index}`} value={`${country.code}`}>
                          {country.name} ({country.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box sx={{ position: "relative" }}>
                <Box onClick={() => setOpenPassDate(true)}>
                  <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                    Enter Passport Expiry Date
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      mt: "9px",
                      flexDirection: "column",
                      borderBottom: "1px solid #ACA6A6",
                      width: {
                        xs: "100%",
                        sm: "100%",
                        // md: "80%",
                        // lg: "80%",
                      },
                      paddingBottom: "5px",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "12px", color: "var(--primary-button)" }}
                    >
                      {selectedPassDate
                        ? moment(selectedPassDate).format("DD MMM YY")
                        : "Select Date"}
                    </Typography>
                  </Box>
                </Box>
                {openPassDate && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "100%",
                      left: -100,
                      zIndex: 1000,
                      bgcolor: "white",
                      boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                    }}
                  >
                    <Calendar
                      color="var(--primary-color)"
                      date={selectedPassDate || new Date()}
                      onChange={(date) => handleSelectPassDate(date)}
                      months={1}
                      direction="horizontal"
                      style={{
                        fontSize: "11px",
                        padding: "0",
                        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid
            container
            spacing={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            sx={{
              mt: {
                xs: "10px",
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
                    mt: "10px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      // md: "80%",
                      // lg: "80%",
                    },
                    paddingBottom: "5px",
                  }}
                >
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Your Email"
                    required
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "12px",
                      background: "none",
                      color: "var(--primary-button)",
                    }}
                  />
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
                    mt: "10px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                      // md: "80%",
                      // lg: "80%",
                    },
                    paddingBottom: "5px",
                  }}
                >
                  <input
                    placeholder="Your Phone Number"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "12px",
                      background: "none",
                      color: "var(--primary-button)",
                    }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={4} lg={4}>
              <Box>
                <Typography sx={{ fontSize: "12px", color: "#444542" }}>
                  Address
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    mt: "10px",
                    flexDirection: "column",
                    borderBottom: "1px solid #ACA6A6",
                    width: {
                      xs: "100%",
                      sm: "100%",
                    },
                    paddingBottom: "5px",
                  }}
                >
                  <input
                    placeholder="Enter Your Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "12px",
                      background: "none",
                      color: "var(--primary-button)",
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </form>
    </Box>
  );
};

export default UserProfileUpdated;
