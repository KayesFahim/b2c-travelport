import { Box, Button, Grid, Typography, Collapse } from "@mui/material";
import React, { useState } from "react";
import DepartureIcons from "../../../asstes/img/HomeImage/flightIcons/deapature.svg?react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { Link, useNavigate } from "react-router-dom";
import { Calendar } from "react-date-range";

const TourSearchBox = () => {
  const [date, setDate] = useState("2025-01-01");
  const [city, setCity] = useState("Kathmandu");
  const [country, setCountry] = useState("Nepal");
  const [openDestination, setOpenDestination] = useState(false); // State for destination dropdown
  const [openDate, setOpenDate] = useState(false); // State for date dropdown
  const navigate = useNavigate();

  const destinations = [
    { city: "Kathmandu", country: "Nepal" },
    { city: "Pokhara", country: "Nepal" },
    { city: "Delhi", country: "India" },
    { city: "Bangkok", country: "Thailand" },
    { city: "Dubai", country: "UAE" },
  ];

  const handleDestinationSelect = (selectedCity, selectedCountry) => {
    setCity(selectedCity);
    setCountry(selectedCountry);
    setOpenDestination(false);
    setOpenDate(true); // Open date dropdown after selecting a destination
  };

  const handleDateSelect = (selectedDate) => {
    const adjustedDate = new Date(
      selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000
    ); // Adjust for timezone offset
    setDate(adjustedDate.toISOString().split("T")[0]); // Format date as yyyy-MM-dd
    setOpenDate(false);
  };

  const toggleDestinationDropdown = () => {
    setOpenDestination((prev) => {
      if (!prev) setOpenDate(false); // Close date dropdown if opening destination dropdown
      return !prev;
    });
  };

  const toggleDateDropdown = () => {
    setOpenDate((prev) => {
      if (!prev) setOpenDestination(false); // Close destination dropdown if opening date dropdown
      return !prev;
    });
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(``);
      const result = await response.json();
      console.log("Search result before navigation:", result); // Debug log
      navigate("/toursearchresult", {
        state: {
          searchResult: result?.data || [], // Ensure `data` is passed correctly
          searchParams: { date, city, country }, // Pass search parameters
        },
      });
    } catch (error) {
      console.error("Error fetching search results:", error);
      navigate("/toursearchresult", {
        state: {
          searchResult: [], // Pass an empty array in case of an error
          searchParams: { date, city, country },
        },
      });
    }
  };

  return (
    <Box>
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
          py: 2,
          margin: { xs: "40px 0", md: "40px 30px" },
        }}
      >
        <Box onClick={toggleDestinationDropdown} sx={{ cursor: "pointer" }}>
          <Typography
            sx={{ fontSize: "12px", color: "#6c757d", fontWeight: 500 }}
          >
            Destination / Tour Package
          </Typography>
          <Typography
            sx={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#1f1f1f",
              position: "relative",
            }}
          >
            {city}
          </Typography>
        </Box>
        <Collapse in={openDestination} timeout="auto" unmountOnExit>
          <Box
            sx={{
              position: "absolute",
              // top: "60px", // Move dropdown slightly down from present position
              left: { xs: "50px", md: "150px" },
              width: "250px",
              backgroundColor: "var(--white)",
              border: "1px solid var(--button-color)",
              borderRadius: "0px 0px 5px 5px",
              zIndex: 999,
              maxHeight: "200px",
              overflowY: "auto",
              boxShadow:
                "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
            }}
          >
            {destinations.map((destination, index) => (
              <Box
                key={index}
                onClick={() =>
                  handleDestinationSelect(destination.city, destination.country)
                }
                sx={{
                  padding: "10px",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "var(--button-color)",
                    color: "var(--white)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--flight-color)",
                  }}
                >
                  {destination.city}, {destination.country}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>

        <Button
          variant="contained"
          onClick={handleSearch}
          sx={{
            backgroundColor: "#f1f3f5",
            color: "#1f1f1f",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: "8px",
            minWidth: "80px",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#e2e6ea",
              boxShadow: "none",
            },
          }}
        >
          Search
        </Button>
      </Box>

      {/* <Grid
        container
        spacing={2}
        sx={{
          flexDirection: { xs: "column", md: "row" }, // Stack columns on small screens
          mb: { xs: "20px", md: "0" },
        }}
      >
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            mb: { xs: "10px", md: "0" }, // Add margin for small screens
          }}
        >
          <Box>
            <Box onClick={toggleDestinationDropdown} sx={{ cursor: "pointer" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexDirection: { xs: "column", sm: "row" }, // Adjust layout for small screens
                }}
              >
                <Typography
                  sx={{ color: "var(--text-color)", fontSize: "14px" }}
                >
                  Destinations
                </Typography>
                <DepartureIcons />
              </Box>
              <Box sx={{ pt: "5px" }}>
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--flight-color)",
                    textAlign: { xs: "center", sm: "left" }, // Center text on small screens
                  }}
                >
                  {city}, {country}
                </Typography>
              </Box>
            </Box>
            <Collapse in={openDestination} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  position: "absolute",
                  top: { xs: "65%", md: "85%", lg: "74%" }, // Adjust position for small screens
                  left: { xs: "50px", lg: "100px" },
                  width: "250px",
                  backgroundColor: "var(--white)",
                  border: "1px solid var(--button-color)",
                  borderRadius: "0px 0px 5px 5px",
                  zIndex: 999,
                  maxHeight: "200px",
                  overflowY: "auto",
                  boxShadow:
                    "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
                }}
              >
                {destinations.map((destination, index) => (
                  <Box
                    key={index}
                    onClick={() =>
                      handleDestinationSelect(
                        destination.city,
                        destination.country
                      )
                    }
                    sx={{
                      padding: "10px",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "var(--button-color)",
                        color: "var(--white)",
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--flight-color)",
                      }}
                    >
                      {destination.city}, {destination.country}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        </Grid>
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            borderLeft: { xs: "none", md: "1px solid var(--text-color)" }, // Remove border on small screens
            pl: { xs: "0", md: "20px" }, // Adjust padding for small screens
          }}
        >
          <Box>
            <Box onClick={toggleDateDropdown} sx={{ cursor: "pointer" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexDirection: { xs: "column", sm: "row" }, // Adjust layout for small screens
                }}
              >
                <Typography
                  sx={{ color: "var(--text-color)", fontSize: "14px" }}
                >
                  Select Date
                </Typography>
                <CalendarMonthIcon
                  sx={{ fontSize: "18px", color: "var(--text-color)" }}
                />
              </Box>
              <Box sx={{ pt: "5px" }}>
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--flight-color)",
                    textAlign: { xs: "center", sm: "left" }, // Center text on small screens
                  }}
                >
                  {date}
                </Typography>
              </Box>
            </Box>
            <Collapse in={openDate} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  position: "absolute",
                  top: { xs: "80%", md: "85%", lg: "74%" }, // Adjust position for small screens
                  left: { xs: "5%", md: "40%" },
                  width: "100%", // Full width on small screens
                  maxWidth: "353px", // Limit width on larger screens
                  backgroundColor: "var(--white)",
                  border: "1px solid var(--button-color)",
                  borderRadius: "0px 0px 5px 5px",
                  zIndex: 999,
                  boxShadow:
                    "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
                }}
              >
                <Calendar
                  date={new Date(date)}
                  onChange={handleDateSelect}
                  minDate={new Date()}
                  color="var(--primary-color)"
                />
              </Box>
            </Collapse>
          </Box>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            onClick={handleSearch}
            sx={{
              color: "var(--primary-text-color)",
              textTransform: "capitalize",
              borderRadius: "10px",
              fontWeight: 600,
              width: "100%",
              bgcolor: "var(--button-color)",
              ":hover": {
                bgcolor: "var(--button-color)",
              },
              mt: { xs: "10px", md: "0" }, // Add margin on small screens
            }}
          >
            Search
          </Button>
        </Grid>
      </Grid> */}
    </Box>
  );
};

export default TourSearchBox;
