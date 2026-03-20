import { Box, Grid } from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  Typography,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { format } from "date-fns";
import secureLocalStorage from "react-secure-storage";
import BookingQueDetailsSlikton from "./BookingQueDetailsSlikton";

const BookingQueDetails = ({ loading, quesData }) => {
  const userData = secureLocalStorage.getItem("userData");

  const [remainingTime, setRemainingTime] = useState("Calculating...");

  const getRemainingTime = () => {
    if (!quesData || !quesData[0] || !quesData[0].TimeLimit) {
      return "No Time Limit Set";
    }
    const timeWithoutZ = (quesData[0].TimeLimit).slice(0, -1);
    const timeLimit = new Date(timeWithoutZ);
    const now = new Date();
    const diffInSeconds = Math.floor((timeLimit - now) / 1000);

    if (diffInSeconds <= 0) return "Expired";

    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    return `${minutes} Min : ${seconds} Sec`;
  };

  useEffect(() => {
    // Update remaining time every second
    const timer = setInterval(() => {
      const time = getRemainingTime();
      setRemainingTime(time);

      // Clear the interval if the time has expired
      if (time === "Expired") {
        clearInterval(timer);
      }
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, [quesData]);

  return (
    <Box>
      {loading ? (
        <BookingQueDetailsSlikton />
      ) : (
        <Box
          sx={
            {
              // display: "flex",
              // gap: 2,
            }
          }
        >
          <Grid container spacing={.5}>
            <Grid item xs={5} md={2.1}
            >
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "var(--primary-button)",
                   
                  }}
                >
                  Booking ID
                </Typography>
                <Typography sx={{ fontSize: "11px", fontWeight: 600, }}>
                  {quesData[0]?.BookingId}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3} md={1.2}>
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "var(--primary-button)",
                   
                  }}
                >
                  Route
                </Typography>
                <Typography sx={{ fontSize: "11px", fontWeight: 600, }}>
                  {quesData[0]?.AllLegsInfo[0]?.DepFrom}-
                  {quesData[0]?.AllLegsInfo[0]?.ArrTo}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4} md={1.1}>
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "var(--primary-button)",
                   
                  }}
                >
                  Type
                </Typography>{" "}
                <Typography sx={{ fontSize: "11px", fontWeight: 600, }}>
                  {quesData[0]?.TripType}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3} md={1.4}>
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "var(--primary-button)",
                   
                  }}
                >
                  Fare Type
                </Typography>
                <Typography
                  sx={{ color: "#388e3c", fontWeight: 600, fontSize: "11px" }}
                >
                  {quesData[0]?.Refundable === true
                    ? " Refundable"
                    : "Non-Refundable"}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4} md={1.9}>
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "var(--primary-button)",
                   
                  }}
                >
                  Booked At
                </Typography>
                <Typography sx={{ fontSize: "11px", fontWeight: 600, }}>
                  {quesData[0]?.BookingDate
                    ? format(new Date(quesData[0]?.BookingDate), "dd MMMM yyyy")
                    : "N/A"}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={5} md={2}>
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "var(--primary-button)",
                    
                  }}
                >
                  Booked By
                </Typography>
                <Typography sx={{ fontSize: "11px",fontWeight: 600, }}>
                  {userData?.name}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={5} md={2.3}>
            <Box sx={{
              bgcolor:"var(--white)",
              p:.4,
              borderRadius:"4px"
            }}>
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
                
              }}
            >
              Expired In
            </Typography>
            <Typography sx={{ fontSize: "11px",fontWeight: 600, }}>{remainingTime}</Typography>
          </Box>
            </Grid>
          </Grid>

          
        </Box>
      )}
      {/* <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: "2px" }}
      >
        <Table aria-label="booking details">
          <TableHead
            sx={{ backgroundColor: "var(--primary-button)", color: "white" }}
          >
            <TableRow sx={{ color: "white" }}>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Booking ID
              </Typography>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Route
              </Typography>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Type
              </Typography>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Fare Type
              </Typography>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Booked At
              </Typography>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Booked By
              </Typography>
              <Typography sx={{ fontWeight: "bold", color: "white" }}>
                Expired In
              </Typography>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <BookingQueDetailsSlikton />
            ) : (
              <TableRow
                hover
                sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}
              >
                <Typography>{quesData[0]?.BookingId}</Typography>
                <Typography>
                  {quesData[0]?.AllLegsInfo[0]?.DepFrom}-
                  {quesData[0]?.AllLegsInfo[0]?.ArrTo}
                </Typography>
                <Typography>{quesData[0]?.TripType}</Typography>
                <Typography sx={{ color: "#388e3c", fontWeight: 500 }}>
                  {quesData[0]?.Refundable === true
                    ? " Refundable"
                    : "Non-Refundable"}
                </Typography>
                <Typography>
                  {quesData[0]?.BookingDate
                    ? format(new Date(quesData[0]?.BookingDate), "dd MMMM yyyy")
                    : "N/A"}
                </Typography>
                <Typography>{userData?.name}</Typography>
                <Typography>{remainingTime}</Typography>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer> */}
    </Box>
  );
};

export default BookingQueDetails;
