import React, { useEffect, useState } from "react";
import axios from "axios";
import { Typography, Tabs, Tab, Box, CircularProgress, Button } from "@mui/material";
import secureLocalStorage from "react-secure-storage";
import { useNavigate } from "react-router-dom";
import { config } from "../../../config";

const BOOKING_STATUS_TABS = [
  { label: "Booked", value: "Booked" },
  { label: "Issue In Process", value: "IssueInProcess" },
  { label: "Ticketed", value: "Ticketed" },
  { label: "Cancelled", value: "Cancelled" },
];

const Booking = () => {
  const [bookingData, setBookingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [totalBookings, setTotalBookings] = useState(0);
  const [selectedTab, setSelectedTab] = useState("All"); // Tab state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [tabCounts, setTabCounts] = useState({
    Booked: 0,
    IssueInProcess: 0,
    Ticketed: 0,
    Cancelled: 0,
  });
  const token = secureLocalStorage.getItem("access_token");
  const navigate = useNavigate();

  const formatDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getBookingDateKey = (booking) => {
    return formatDateKey(
      booking?.laginfo?.[0]?.DepDate ||
      booking?.travelDate ||
      booking?.createdAt ||
      booking?.updatedAt
    );
  };

  const openBookingDetails = (booking) => {
    const pnr = String(
      booking?.locator || booking?.PNR || booking?.reservationId || booking?.bookingId || ""
    ).trim();
    if (!pnr) return;
    navigate(`/bookingconfirmation?pnr=${encodeURIComponent(pnr)}`);
  };

  const requestBookings = async ({ status, page, limit, headers }) => {
    try {
      return await axios.get(`/api/user/bookings/${status}?page=${page}&limit=${limit}`, {
        headers,
      });
    } catch (error) {
      const statusCode = error?.response?.status;
      if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
        const normalizedBaseUrl = String(config?.baseUrl || "").trim().replace(/\/+$/, "");
        return axios.get(`${normalizedBaseUrl}/user/bookings/${status}?page=${page}&limit=${limit}`, {
          headers,
        });
      }
      throw error;
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    if (!token) {
      setBookingData([]);
      setTotalBookings(0);
      setErrorText("");
      setLoading(false);
      return;
    }

    try {
      setErrorText("");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      if (selectedTab === "All") {
        const responses = await Promise.all(
          BOOKING_STATUS_TABS.map((tab) =>
            requestBookings({ status: tab.value, page: 1, limit: 300, headers })
              .then((response) => ({ tab: tab.value, response }))
          )
        );

        const counts = {
          Booked: 0,
          IssueInProcess: 0,
          Ticketed: 0,
          Cancelled: 0,
        };

        const merged = [];
        responses.forEach(({ tab, response }) => {
          const data = response?.data || {};
          counts[tab] = Number(data?.total || 0);
          const rows = Array.isArray(data?.bookings) ? data.bookings : [];
          rows.forEach((row) => {
            merged.push({
              ...row,
              bookingStatus: row?.bookingStatus || tab,
            });
          });
        });

        const deduped = [];
        const seen = new Set();
        merged.forEach((row) => {
          const key = String(
            row?.id || row?.bookingId || row?.locator || row?.reservationId || ""
          );
          if (!key || seen.has(key)) return;
          seen.add(key);
          deduped.push(row);
        });

        deduped.sort((a, b) => {
          const aTime = Date.parse(a?.createdAt || a?.updatedAt || "") || 0;
          const bTime = Date.parse(b?.createdAt || b?.updatedAt || "") || 0;
          return bTime - aTime;
        });

        setTabCounts(counts);
        setTotalBookings(deduped.length);
        setBookingData(deduped);
      } else {
        const response = await requestBookings({
          status: selectedTab,
          page: 1,
          limit: 300,
          headers,
        });

        if (response.status === 200) {
          const data = response.data;
          setBookingData(data?.bookings || []);
          setTotalBookings(data?.total || 0);
          setTabCounts((prev) => ({
            ...prev,
            [selectedTab]: Number(data?.total || 0),
          }));
        } else {
          setBookingData([]);
          setTotalBookings(0);
        }
      }
    } catch (error) {
      setBookingData([]);
      setTotalBookings(0);
      setErrorText("Unable to load bookings right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token, selectedTab]);

  useEffect(() => {
    if (!Array.isArray(bookingData) || bookingData.length === 0) {
      setSelectedDateKey("");
      return;
    }
    const hasSelection = bookingData.some(
      (row) => getBookingDateKey(row) && getBookingDateKey(row) === selectedDateKey
    );
    if (hasSelection) return;

    const firstValidDate = bookingData
      .map((row) => getBookingDateKey(row))
      .find((key) => Boolean(key));
    setSelectedDateKey(firstValidDate || "");
  }, [bookingData, selectedDateKey]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const currentMonthYearLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const todayKey = formatDateKey(new Date());

  const monthStartWeekday = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const bookingsByDate = bookingData.reduce((acc, booking) => {
    const key = getBookingDateKey(booking);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(booking);
    return acc;
  }, {});

  const selectedDateBookings = selectedDateKey ? bookingsByDate[selectedDateKey] || [] : [];

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
          mb: 2
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
            <Tab label={`All (${totalBookings})`} value="All" />
            {BOOKING_STATUS_TABS.map((tab) => (
              <Tab
                key={tab.value}
                label={`${tab.label} (${tabCounts?.[tab.value] || 0})`}
                value={tab.value}
              />
            ))}
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
              display: { xs: "block", md: "none" }, // Always ensure visibility
              overflowX: "auto", // Prevent content overflow on small screens
            }}
          >
            <Tab label={`All (${totalBookings})`} value="All" />
            {BOOKING_STATUS_TABS.map((tab) => (
              <Tab
                key={`mobile-${tab.value}`}
                label={`${tab.label} (${tabCounts?.[tab.value] || 0})`}
                value={tab.value}
              />
            ))}
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
        ) : errorText ? (
          <Typography sx={{ color: "#B3261E", textAlign: "center" }}>
            {errorText}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                border: "1px solid #D9E3EE",
                borderRadius: "10px",
                p: 1.6,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Button size="small" onClick={goToPreviousMonth}>
                  Prev
                </Button>
                <Typography sx={{ fontWeight: 700, color: "var(--primary-button)" }}>
                  {currentMonthYearLabel}
                </Typography>
                <Button size="small" onClick={goToNextMonth}>
                  Next
                </Button>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.3,
                }}
              >
                <Typography sx={{ fontSize: 12, color: "#5C6B7A", fontWeight: 700 }}>
                  Legend:
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#5C6B7A" }}>
                  Number = total flights on that day
                </Typography>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#f59e0b",
                  }}
                />
                <Typography sx={{ fontSize: 11, color: "#5C6B7A" }}>Today</Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0,1fr))",
                  gap: 1,
                  mb: 1,
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <Typography
                    key={day}
                    sx={{ textAlign: "center", fontSize: 12, color: "#5C6B7A", fontWeight: 700 }}
                  >
                    {day}
                  </Typography>
                ))}
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0,1fr))",
                  gap: 1,
                }}
              >
                {Array.from({ length: monthStartWeekday }).map((_, index) => (
                  <Box key={`empty-${index}`} sx={{ minHeight: 66 }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dateKey = formatDateKey(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  );
                  const dayBookings = bookingsByDate[dateKey] || [];
                  const isActive = selectedDateKey === dateKey;
                  const isToday = dateKey === todayKey;
                  return (
                    <Button
                      key={dateKey}
                      onClick={() => setSelectedDateKey(dateKey)}
                      sx={{
                        minHeight: 66,
                        borderRadius: "10px",
                        border: isToday ? "1px solid #f59e0b" : "1px solid #D8E1EA",
                        color: "#0f2f4a",
                        backgroundColor: isActive
                          ? "rgba(19,64,107,0.12)"
                          : isToday
                            ? "rgba(245,158,11,0.12)"
                            : "#fff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.2,
                        textTransform: "none",
                        p: 0.4,
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{day}</Typography>
                      <Typography sx={{ fontSize: 10, color: "#b46900", fontWeight: 700 }}>
                        {isToday ? "Today" : ""}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#2b7a4b", fontWeight: 700 }}>
                        {dayBookings.length > 0 ? dayBookings.length : ""}
                      </Typography>
                    </Button>
                  );
                })}
              </Box>
            </Box>

            <Box
              sx={{
                border: "1px solid #D9E3EE",
                borderRadius: "10px",
                p: 1.6,
                maxHeight: { xs: "none", lg: 560 },
                overflow: "auto",
              }}
            >
              <Typography sx={{ fontWeight: 700, color: "var(--primary-button)", mb: 1.2 }}>
                {selectedDateKey
                  ? `Bookings on ${new Date(selectedDateKey).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`
                  : "Select a date to view bookings"}
              </Typography>

              {selectedDateBookings.length === 0 ? (
                <Typography sx={{ color: "#6B7B8C", fontSize: 13 }}>
                  No bookings found for this date.
                </Typography>
              ) : (
                selectedDateBookings.map((booking) => (
                  <Box
                    key={booking?.id || booking?.bookingId}
                    sx={{
                      border: "1px solid #E2E8EF",
                      borderRadius: "8px",
                      p: 1.2,
                      mb: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0f2f4a" }}>
                      {booking?.laginfo?.[0]?.DepFrom || "N/A"} to {booking?.laginfo?.[0]?.ArrTo || "N/A"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#5A6C7C", mt: 0.4 }}>
                      Booking ID: {booking?.bookingId || "N/A"} | Status: {booking?.bookingStatus || "N/A"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#5A6C7C", mt: 0.3 }}>
                      PNR: {booking?.locator || booking?.PNR || booking?.reservationId || "N/A"}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1, textTransform: "none" }}
                      onClick={() => openBookingDetails(booking)}
                    >
                      View Booking Details
                    </Button>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>

  );
};

export default Booking;
