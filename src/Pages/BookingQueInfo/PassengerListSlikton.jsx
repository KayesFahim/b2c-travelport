import { Skeleton, Grid, Box, Typography } from "@mui/material";
import React from "react";

const PassengerListSlikton = () => {
  return (
    <>
      <Grid container spacing={4} sx={{ pb: 4 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Name :
            </Typography>
            <Skeleton animation="wave" width="60%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Gender :
            </Typography>
            <Skeleton animation="wave" width="40%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              DOB :
            </Typography>
            <Skeleton animation="wave" width="50%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Passport Copy :
            </Typography>
            <Skeleton animation="wave" width="70%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Visa Copy :
            </Typography>
            <Skeleton animation="wave" width="70%" />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Pax :
            </Typography>
            <Skeleton animation="wave" width="30%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Passport No :
            </Typography>
            <Skeleton animation="wave" width="50%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Expire Date :
            </Typography>
            <Skeleton animation="wave" width="50%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Booking Date :
            </Typography>
            <Skeleton animation="wave" width="60%" />
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default PassengerListSlikton;
