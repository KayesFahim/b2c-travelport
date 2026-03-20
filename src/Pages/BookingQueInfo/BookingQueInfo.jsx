import { Box, Container, Grid, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import BookingQueDetails from "./BookingQueDetails";
import NavBar from "../../Shared/NavBar/NavBar";
import OneWayQueFlightInfo from "./OneWayQueFlightInfo";
import PassengerDetails from "./PassengerDetails/PassengerDetails";
import BookingFareDetails from "./BookingFareDetails";
import PNRHistory from "./PNRHistory";
import BookingAllPdf from "../AllPDF/BookingAllPdf/BookingAllPdf";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import commaNumber from "comma-number";
import axios from "axios";
import Swal from "sweetalert2";
import HoldLoader from "../../Shared/Loader/HoldLoader";
import FlightLayout from "../SingleFlight/FlightLayout";
import { config } from "../../config";
import FlightDetails from "../ShowDetails/FlightDetails";
import FlightDetailsLayout from "./FlightDetailsLayout";
import FlightDetailsSkeleton from "./FlightDetailsSkeleton";

const BookingQueInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId, booking } = location?.state || {};

  const [quesData, setQuesData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);

  const [loading, setLoading] = useState(false);
  const token = secureLocalStorage.getItem("access_token");

  useEffect(() => {
    const api = `${config.baseUrl}/booking/api2/airRetrive`;

    const body = {
      BookingID: bookingId,
    };

    const fetchData = async () => {
      setLoading(true); // Start loader here
      try {
        const response = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Data fetched successfully:", data);
          setPaymentData(data || []);
          setQuesData(data?.bookingData || []);
        } else {
          console.error("Error fetching data:", data.message);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false); // Ensure the loader stops here
      }
    };

    fetchData();
  }, [bookingId, token]);

  const handleBookingCancel = async () => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to cancel this flight booking?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, cancel it!",
      cancelButtonText: "No, keep it",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Processing cancellation...",
          text: "Please wait while we process your request.",
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // API endpoint and request body
        const api = `${config.baseUrl}/booking/api2/cancelBooking`;
        const body = {
          BookingID: bookingId, // Replace with the actual booking ID variable
        };

        try {
          // Make the cancellation API call
          const response = await axios.post(api, body, {
            headers: {
              Authorization: `Bearer ${token}`, // Replace with the actual token variable
            },
          });

          // Success alert
          Swal.fire(
            "Cancelled!",
            "Your flight booking has been canceled successfully.",
            "success"
          );
        } catch (error) {
          // Error handling with specific error messages if available
          let errorMessage =
            "There was an issue canceling your flight. Please try again later.";
          if (
            error.response &&
            error.response.data &&
            error.response.data.message
          ) {
            errorMessage = error.response.data.message;
          }

          Swal.fire("Error!", errorMessage, "error");
        }
      }
    });
  };

  const handlePaymentClick = () => {
    navigate("/paymentgateway", {
      state: { paymentData }, // Pass paymentData as an object
    });
  };
  console.log("payment", quesData[0]);
  return (
    <Box>
      <Box>
        <NavBar />
        <Box sx={{ bgcolor: "#f2f2f2", height: "100%", pb: "20px" }}>
          <Container>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={12} md={9} lg={9}>
                <Grid container>
                  <Grid xs={12} sm={12} md={12} lg={12}>
                    <Box>
                      <Box
                      // sx={{ py: "40px" }}
                      >
                        <Box sx={{ py: "15px" }}>
                          <Typography
                            sx={{
                              fontSize: "17px",
                              fontWeight: 500,
                              color: "var(--meta-black)",
                            }}
                          >
                            {/* Booking Details */}
                          </Typography>
                        </Box>
                        <BookingQueDetails
                          loading={loading}
                          quesData={quesData}
                        />
                      </Box>
                      <Box sx={{ my: 8 }}>
                        <Box
                          sx={{
                            py: 1,
                            px: 2,
                            bgcolor: "var(--label-bg)",
                            mb: 2,
                            borderRadius: "2px",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--primary-text-color)",
                            }}
                          >
                            Flight Details
                          </Typography>
                        </Box>
                        {loading ? (
                          <FlightDetailsSkeleton />
                        ) : (
                          quesData[0]?.AllLegsInfo?.map((leg, legIndex) =>
                            leg?.Segments.map((flight, segmentIndex) => (
                              <Box key={`${legIndex}-${segmentIndex}`}>
                                <FlightDetailsLayout
                                  alllegs={leg}
                                  flight={flight}
                                  booking="booking"
                                />
                              </Box>
                            ))
                          )
                        )}
                      </Box>
                      <Box sx={{ my: 8 }}>
                        <Box
                          sx={{
                            py: 1,
                            px: 2,
                            bgcolor: "var(--label-bg)",
                            mb: 2,
                            borderRadius: "2px",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--primary-text-color)",
                            }}
                          >
                            Passenger Details
                          </Typography>
                        </Box>
                        <PassengerDetails
                          loading={loading}
                          booking={booking}
                          quesData={quesData}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sm={12} md={3} lg={3}>
                <Grid container>
                  <Grid
                    xs={12}
                    sm={12}
                    md={12}
                    lg={12}
                    sx={{
                      // pt: "95px"
                      pt: 4,
                    }}
                  >
                    <Box>
                      <BookingFareDetails quesData={quesData} />
                    </Box>
                  </Grid>
                  <Grid xs={12} sm={12} md={12} lg={12} sx={{ py: "15px" }}>
                    <Box>
                      <PNRHistory quesData={quesData} />
                    </Box>
                  </Grid>
                  <Grid xs={12} sm={12} md={12} lg={12}>
                    <Box>
                      <BookingAllPdf quesData={quesData} />
                    </Box>
                  </Grid>
                  <Grid xs={12} sm={12} md={12} lg={12} sx={{ pt: "15px" }}>
                    {quesData[0]?.BookingStatus === "Booked" && (
                      <>
                        <Box
                          onClick={handlePaymentClick}
                          sx={{
                            background: "#C32126",
                            borderRadius: "5px",
                            height: "45px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "18px",
                              fontWeight: 600,
                              color: "white",
                              borderRadius: "5px",
                              textAlign: "center",
                            }}
                          >
                            Pay BDT {commaNumber(quesData[0]?.NetFare)} ৳
                          </Typography>
                        </Box>

                        <Box
                          onClick={handleBookingCancel}
                          sx={{
                            background: "green",
                            borderRadius: "5px",
                            height: "45px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mt: "10px",
                            gap: "10px",
                            cursor: "pointer",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "18px",
                              fontWeight: 600,
                              color: "white",
                              borderRadius: "5px",
                              textAlign: "center",
                              textTransform: "uppercase",
                              cursor: "pointer",
                            }}
                          >
                            cancel
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default BookingQueInfo;
