import {
  Box,
  Button,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import moment from "moment";
import React, { useState } from "react";
import { Calendar } from "react-date-range";
import secureLocalStorage from "react-secure-storage";
import datas from "../../../Pages/fakeData/CountryList";
import { config } from "../../../config";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
const AddTraveler = () => {
  const [openProfileDate, setOpenProfileDate] = useState(false);
  const [openPassDate, setOpenPassDate] = useState(false);
  const countryName = datas;
  const navigate = useNavigate();
  const [trvelInfo, setTravelInfo] = useState({
    title: "",
    firstName: "",
    lastName: "",
    paxtype: "",
    gender: "",
    nationility: "BD",
    dateOfBirth: "",
    passportNumber: "",
    passportExpireDate: "",
  });
  const token = secureLocalStorage.getItem("access_token");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTravelInfo((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const getValidDateRange = () => {
    const currentDate = moment();
    let minDate, maxDate;

    if (trvelInfo.paxtype === "Adult") {
      minDate = currentDate.clone().subtract(100, "years"); // Assuming max age 100 years
      maxDate = currentDate.clone().subtract(12, "years");
    } else if (trvelInfo.paxtype === "Child") {
      minDate = currentDate.clone().subtract(12, "years");
      maxDate = currentDate.clone().subtract(2, "years");
    } else if (trvelInfo.paxtype === "Infant") {
      minDate = currentDate.clone().subtract(2, "years");
      maxDate = currentDate;
    } else {
      minDate = currentDate.clone().subtract(100, "years");
      maxDate = currentDate;
    }

    return { minDate, maxDate };
  };

  const handleSelectProfile = (date) => {
    const selectedDate = moment(date);
    const { minDate, maxDate } = getValidDateRange();

    if (selectedDate.isBefore(minDate) || selectedDate.isAfter(maxDate)) {
      Swal.fire({
        title: "Error!",
        text: `Date of birth must be between ${minDate.format(
          "YYYY-MM-DD"
        )} and ${maxDate.format("YYYY-MM-DD")}.`,
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    setTravelInfo((prevState) => ({
      ...prevState,
      dateOfBirth: selectedDate.format("YYYY-MM-DD"),
    }));
    setOpenProfileDate(false);
  };

  const handleSelectPassDate = (date) => {
    const selectedDate = moment(date);
    const today = moment();

    if (selectedDate.isBefore(today, "day")) {
      Swal.fire({
        title: "Error!",
        text: "Passport expiry date cannot be before today's date.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    setTravelInfo((prevState) => ({
      ...prevState,
      passportExpireDate: selectedDate.format("YYYY-MM-DD"),
    }));
    setOpenPassDate(false);
  };

  const handleAddTraveler = async () => {
    // Construct the request body with traveler information
    const body = {
      title: trvelInfo.title,
      firstName: trvelInfo.firstName,
      lastName: trvelInfo.lastName,
      gender: trvelInfo.gender,
      nationality: trvelInfo.nationility,
      dob: trvelInfo.dateOfBirth,
      passport: trvelInfo.passportNumber,
      passportexp: trvelInfo.passportExpireDate,
      paxtype: trvelInfo.paxtype,
    };
    try {
      // Send the POST request with the token in the Authorization header
      const response = await fetch(
        `${config.baseUrl}/travel-buddy/saveTravelBuddy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Passing token in header
          },
          body: JSON.stringify(body), // Convert the body to JSON
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      // Show success alert
      Swal.fire({
        title: "Success!",
        text: "Traveler added successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });
      navigate("/userinfov2/usertraveler");

      // Optionally, clear form fields or redirect
      setTravelInfo({
        title: "",
        firstName: "",
        lastName: "",
        gender: "",
        nationility: "",
        dateOfBirth: "",
        passportNumber: "",
        passportExpireDate: "",
      });
    } catch (error) {
      console.error("Error adding traveler:", error);

      // Show error alert
      Swal.fire({
        title: "Error!",
        text: "There was an error adding the traveler. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <Box
      sx={{
        p: {
          xs: "10px 30px 10px 40px",
          sm: "20px 30px 20px 40px",
          // md: "30px 30px 40px 40px",
          // lg: "30px 30px 40px 40px",
        },
        bgcolor: "white",
        // mt: "15px",
        borderRadius: "5px",
      }}
    >
      <form>
        <Grid container spacing={3}>
          {/* Title */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box
              sx={{
                borderBottom: "1px solid #13406B",
                pb: "5px",
                width: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Title
              </Typography>
              <FormControl sx={{ mt: "5px" }}>
                <Select
                  name="title"
                  value={trvelInfo.title}
                  onChange={handleInputChange}
                  required
                  displayEmpty
                  inputProps={{ "aria-label": "Select Title" }}
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    "& .MuiInputBase-input": {
                      padding: "2px 0",
                      fontSize: "13px",
                      color: "#444542",
                      width: "100%",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                  }}
                >
                  <MenuItem value="">Select Title</MenuItem>
                  <MenuItem value="Mr">Mr</MenuItem>
                  <MenuItem value="Ms">Ms</MenuItem>
                  <MenuItem value="Mrs">Mrs</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box
              sx={{
                borderBottom: "1px solid #13406B",
                pb: "5px",
                width: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Pax Type
              </Typography>
              <FormControl sx={{ mt: "5px" }}>
                <Select
                  name="paxtype"
                  value={trvelInfo.paxtype}
                  onChange={handleInputChange}
                  required
                  displayEmpty
                  inputProps={{ "aria-label": "Select Pax type" }}
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    "& .MuiInputBase-input": {
                      padding: "2px 0",
                      fontSize: "13px",
                      color: "#444542",
                      width: "100%",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                  }}
                >
                  <MenuItem value="">Select Pax type</MenuItem>
                  <MenuItem value="Adult">Adult</MenuItem>
                  <MenuItem value="Child">Child</MenuItem>
                  <MenuItem value="Infant">Infant</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>

          {/* First Name */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                First Name
              </Typography>
              <Box sx={{ mt: "10px" }}>
                <input
                  name="firstName"
                  value={trvelInfo.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter Your First Name"
                  style={{
                    outline: "none",
                    border: "none",
                    width: "100%",
                    padding: "4px 0",
                    backgroundColor: "transparent",
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "black",
                    fontSize: "12px",
                    color: "#444542",
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Last Name */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Last Name
              </Typography>
              <Box sx={{ mt: "10px" }}>
                <input
                  name="lastName"
                  value={trvelInfo.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter Your Last Name"
                  style={{
                    outline: "none",
                    border: "none",
                    width: "100%",
                    padding: "4px 0",
                    backgroundColor: "transparent",
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "black",
                    fontSize: "12px",
                    color: "#444542",
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Gender */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Select Gender
              </Typography>
              <FormControl sx={{ mt: "5px" }}>
                <Select
                  name="gender"
                  value={trvelInfo.gender}
                  onChange={handleInputChange}
                  required
                  displayEmpty
                  inputProps={{ "aria-label": "Select Gender" }}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    "& .MuiInputBase-input": {
                      padding: "2px 0",
                      fontSize: "12px",
                      color: "#444542",
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
          </Grid>

          {/* Nationality */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Nationality
              </Typography>

              <Box sx={{ mt: "5px" }}>
                <Select
                  name="nationility"
                  value={trvelInfo?.nationility || "BD"}
                  onChange={handleInputChange}
                  displayEmpty
                  inputProps={{ "aria-label": "Select Nationality" }}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiInputBase-input": {
                      padding: "2px 0",
                      fontSize: "12px",
                      color: "#444542",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                      width: "100%",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 200,
                        width: 200,
                      },
                    },
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "center",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "center",
                    },
                  }}
                >
                  <MenuItem value="BD">Bangladesh (BD)</MenuItem>
                  {countryName?.map((country, index) => (
                    <MenuItem key={index} value={`${country?.code}`}>
                      {country.name} ({country.code})
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>
          </Grid>

          {/* Date of Birth */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box
              sx={{
                borderBottom: "1px solid #13406B",
                pb: "5px",
                position: "relative",
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Date of Birth
              </Typography>
              <Box
                sx={{
                  mt: "5px",
                  fontSize: "12px",
                  color: "#444542",
                  py: "6px",
                }}
                onClick={() => setOpenProfileDate(true)}
              >
                {trvelInfo.dateOfBirth
                  ? moment(trvelInfo.dateOfBirth).format("ddd/MM/YYYY")
                  : "Select Date"}
              </Box>
              {openProfileDate && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    zIndex: 1000,
                    bgcolor: "white",
                    boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                  }}
                >
                  <Calendar
                    date={new Date()}
                    onChange={(date) => handleSelectProfile(date)}
                    minDate={getValidDateRange().minDate.toDate()} // Convert moment to Date
                    maxDate={getValidDateRange().maxDate.toDate()} // Convert moment to Date
                  />
                </Box>
              )}
            </Box>
          </Grid>

          {/* Passport Number */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Passport Number
              </Typography>
              <Box sx={{ mt: "10px" }}>
                <input
                  name="passportNumber"
                  value={trvelInfo.passportNumber}
                  onChange={handleInputChange}
                  placeholder="Enter Passport Number"
                  style={{
                    outline: "none",
                    border: "none",
                    width: "100%",
                    padding: "4px 0",
                    backgroundColor: "transparent",
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "black",
                    fontSize: "12px",
                    color: "#444542",
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Passport Expiry Date */}
          <Grid item xs={12} sm={12} md={4} lg={4}>
            <Box
              sx={{
                borderBottom: "1px solid #13406B",
                pb: "5px",
                position: "relative",
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--primary-button)",
                }}
              >
                Passport Expiry Date
              </Typography>
              <Box
                sx={{ mt: "10px", py: "2px" }}
                onClick={() => setOpenPassDate(true)}
              >
                {trvelInfo.passportExpireDate
                  ? moment(trvelInfo.passportExpireDate).format("ddd/MM/YYYY")
                  : "Select Date"}
              </Box>
              {openPassDate && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 1000,
                    bgcolor: "white",
                    boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                  }}
                >
                  <Calendar
                    date={new Date()}
                    onChange={(date) => handleSelectPassDate(date)}
                    minDate={moment().toDate()}
                  />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Submit Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mt: {
              xs: "20px",
              sm: "20px",
              md: "40px",
              // lg: "100px",
            },
          }}
        >
          <Button
            onClick={handleAddTraveler}
            sx={{
              background: "#444542",
              color: "white",
              textTransform: "capitalize",
              width: { xs: "100%", md: "40%" },
              ":hover": { background: "#444542", color: "white" },
            }}
          >
            Add This Traveller
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AddTraveler;
