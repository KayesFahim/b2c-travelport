import { Box, Pagination, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const BookingCard = ({
  bookingData,
  currentPage,
  itemsPerPage,
  totalBookings,
  onPageChange,
}) => {
  const navigate = useNavigate();

  const handleBookQueDetails = (bookingId, booking) => {
    navigate("/bookingquedetails", {
      state: { bookingId, booking },
    });
  };

  return (
    <Box>
      {bookingData.length > 0 ? (
        bookingData.map((booking) => (
          <Box key={booking?.id || booking?.bookingId}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid #D9D9D9",
                p: 1,
                mb: 1,
                borderRadius: "5px",
              }}
            >
              <Box>
                <Box
                  sx={{
                    bgcolor: "var(--primary-button)",
                    p: "5px",
                    height: "20px",
                    borderRadius: "5px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    border: "1px solid ",
                    width: "fit-content",
                  }}
                  onClick={() =>
                    handleBookQueDetails(booking?.bookingId, booking)
                  }
                >
                  <Typography
                    sx={{ color: "white", fontSize: { xs: 11, md: 14 } }}
                  >
                    Booking ID: {booking?.bookingId || "N/A"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontSize: "13px",
                      fontWeight: 600,
                      pt: "10px",
                    }}
                  >
                    {booking?.laginfo?.[0]?.DepFrom} to{" "}
                    {booking?.laginfo?.[0]?.ArrTo} {booking?.TripType || "N/A"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "var(--meta-black)",
                      fontSize: "12px",
                      fontWeight: 500,
                      pt: "5px",
                    }}
                  >
                    {booking?.paxCount || 0} Traveler,{" "}
                    {booking?.laginfo?.[0]?.DepDate &&
                      new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(booking?.laginfo?.[0]?.DepDate))}
                  </Typography>
                  <Typography
                    sx={{
                      color: "var(--meta-black)",
                      fontSize: "12px",
                      fontWeight: 500,
                      pt: "5px",
                    }}
                  >
                    Status: {booking?.bookingStatus || "Unknown"}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "40px",
                    width: "40px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    style={{
                      height: "auto",
                      width: "100%",
                      objectFit: "contain",
                    }}
                    src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${
                      booking?.CurrierCode || "default"
                    }.png`}
                    alt={`${booking?.CurrierCode || "Default"} logo`}
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "var(--meta-black)",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {booking?.Curriername || "Unknown Airline"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#9C9797",
                      fontWeight: 500,
                      fontSize: "11px",
                    }}
                  >
                    {booking?.CurrierCode || "N/A"}{" "}
                    {booking?.flightNumber || "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        ))
      ) : (
        <Typography
          sx={{
            textAlign: "center",
            height: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          No bookings found.
        </Typography>
      )}

      {totalBookings > itemsPerPage && (
        <Stack
          spacing={2}
          sx={{ mt: 2, display: "flex", justifyContent: "center" }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Pagination
              count={Math.ceil(totalBookings / itemsPerPage)}
              page={currentPage}
              onChange={onPageChange}
              color="primary"
              variant="outlined"
              size="small"
            />
            {/* <Pagination
                count={Math.ceil(totalBookings / itemsPerPage)}
                page={currentPage}
                onChange={onPageChange}
                color="primary"
                variant="outlined"
              /> */}
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default BookingCard;
