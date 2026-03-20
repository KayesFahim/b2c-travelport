import { Box, Grid, Skeleton, Typography } from "@mui/material";
import React from "react";

const BookingQueDetailsSlikton = () => {
  return (
    <>
      <Grid container spacing={0.5}>
        {/* Booking ID */}
        <Grid item xs={5} md={2.1}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Booking ID
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>

        {/* Route */}
        <Grid item xs={3} md={1.2}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Route
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>

        {/* Type */}
        <Grid item xs={4} md={1.1}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Type
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>

        {/* Fare Type */}
        <Grid item xs={3} md={1.4}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Fare Type
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>

        {/* Booked At */}
        <Grid item xs={4} md={1.9}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Booked At
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>

        {/* Booked By */}
        <Grid item xs={5} md={2}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Booked By
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>

        {/* Expired In */}
        <Grid item xs={5} md={2.3}>
          <Box
            sx={{
              bgcolor: "var(--white)",
              p: 0.4,
              borderRadius: "4px",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                color: "var(--primary-button)",
              }}
            >
              Expired In
            </Typography>
            <Skeleton variant="text" width={60} height={20} />
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default BookingQueDetailsSlikton;
