import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import BookingCard from "./BookingCard"; // Import the BookingCard component
import { Typography, Tabs, Tab, Box, CircularProgress } from "@mui/material";
import secureLocalStorage from "react-secure-storage";
import { config } from "../../../config";

const Booking = () => {
  const [bookingData, setBookingData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [loading, setLoading] = useState(true);
  const [totalBookings, setTotalBookings] = useState(0);
  const [selectedTab, setSelectedTab] = useState("Booked"); // Tab state
  const token = secureLocalStorage.getItem("access_token");
  const fetchBookings = async () => {
    try {
      const api = `${config.baseUrl}/user/bookings/${selectedTab}?page=${currentPage}&limit=${itemsPerPage}`;
      const response = await axios.get(api, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        const data = response.data;
        setBookingData(data?.bookings || []);
        setTotalBookings(data?.total || 0);
      } else {
        setBookingData([]);
        setTotalBookings(0);
      }
    } catch (error) {
      setBookingData([]);
      setTotalBookings(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token, selectedTab, currentPage]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setCurrentPage(1); // Reset to the first page when the tab changes
  };
  const handlePageChange = (_, value) => {
    setCurrentPage(value);
  };
  return (
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
          mb:2
        }}
        
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
           
          }}
        >
          Booking List
        </Typography>
      
      </Box>
 <Box
      sx={{
        p: {
          xs: "15px",
          md: "20px 30px",
        },
        bgcolor: "white",
        borderRadius: "5px",
      }}
    >
      <Box
        mb={2}
        sx={{
          ".MuiTabs-root": {
            minHeight: "20px !important",
          },
        }}
      >
        {/* tabs for md device */}
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Booking status tabs"
          sx={{
            color: "white",
            bgcolor: "var(--primary-button)",
            width: "fit-content",
            margin: { xs: "0px 0px" },
            "& .MuiTab-root": {
              fontSize: { xs: "8px", sm: "10px", md: "12px" },
              textTransform: "capitalize",
              color: "white",
              minHeight: "20px", // Custom minimum height for tabs
              padding: { xs: "8px 6px", md: "8px 16px" }, // Custom padding for better spacing
              "&.Mui-selected": {
                backgroundColor: "var(--primary-color)",
                color: "#13406B",
                fontWeight: "bold",
                padding: { xs: "8px 6px", md: "8px 16px" },
              },
            },
            display: { xs: "none", md: "block" },
          }}
        >
          <Tab label="Booked" value="Booked" />
          <Tab label="Issue In Process" value="IssueInProcess" />
          <Tab label="Ticketed" value="Ticketed" />
          <Tab label="Cancelled" value="Cancelled" />
        </Tabs>
        {/* tabs for sx device */}
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Booking status tabs"
          sx={{
            bgcolor: "var(--primary-button)",
            width: "100%", // Ensure tabs take full width on small devices
            margin: { xs: "0 auto" }, // Center tabs on small screens
            "& .MuiTab-root": {
              fontSize: { xs: "10px", sm: "12px", md: "14px" }, // Adjust font size for devices
              textTransform: "capitalize",
              color: "white",
              minHeight: "30px", // Increase minimum height for better touch targets
              padding: { xs: "8px 4px", md: "10px 16px" }, // Reduce padding on smaller screens
              "&.Mui-selected": {
                backgroundColor: "var(--primary-color)",
                color: "#13406B",
                fontWeight: "bold",
                padding: { xs: "8px 4px", md: "10px 16px" },
              },
            },
            display: {xs:"block",md:"none"}, // Always ensure visibility
            overflowX: "auto", // Prevent content overflow on small screens
          }}
        >
          <Tab label="Booked" value="Booked" />
          <Tab label="Issue In Process" value="IssueInProcess" />
          <Tab label="Ticketed" value="Ticketed" />
          <Tab label="Cancelled" value="Cancelled" />
        </Tabs>
      </Box>
      {loading ? (
        <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "20vh",
        }}
      >
        <CircularProgress />
      </Box>
      ) : (
        <BookingCard
          bookingData={bookingData}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalBookings={totalBookings}
          onPageChange={handlePageChange}
        />
      )}
    </Box>
    </Box>
   
  );
};

export default Booking;
