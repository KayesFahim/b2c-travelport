import { Box, Grid, Typography } from "@mui/material";
import commaNumber from "comma-number";
import moment from "moment";
import React from "react";
import { convertMinutesToHoursAndMinutes } from "../common/funcation";
const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

const FlightDetailsLayout = ({ alllegs, flight, booking }) => {
  return (
    <Grid container spacing={{ xs: 1, sm: 1, md: 0, lg: 0 }}>
      <Grid item xs={12} sm={12} md={2.4} lg={2.4}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: {
                xs: "center",
                sm: "center",
                md: "flex-start",
                lg: "flex-start",
              },
              flexDirection: {
                xs: "row",
                sm: "row",
                md: "column",
                lg: "column",
              },
              gap: {
                xs: "15px",
                sm: "15px",
                md: "0px",
                lg: "0px",
              },
            }}
          >
            <Box>
              <img
                style={{
                  height: isMobile ? "20px" : "25px",
                  width: isMobile ? "20px" : "25px",
                }}
                src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${flight?.MarketingCarrier}.png`}
                alt={`${flight?.MarketingCarrierName || "Airline"} logo`}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: "var(--primary-button)",
                  fontWeight: 500,
                  fontSize: {
                    xs: "10px",
                    sm: "10px",
                    md: "12px",
                    lg: "12px",
                  },
                  maxWidth: { lg: "120px", md: "100px" },
                }}
                noWrap
              >
                {flight?.MarketingCarrierName}
              </Typography>

              <Typography
                sx={{
                  fontSize: {
                    xs: "10px",
                    sm: "10px",
                    md: "12px",
                    lg: "12px",
                  },
                  color: "var(--meta-black)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {flight?.MarketingCarrier}-{flight?.MarketingFlightNumber}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={4.5} sm={4.5} md={3.7} lg={3.7}>
        <Box>
          <Typography
            sx={{
              color: "var(--depature-color)",
              fontSize: {
                xs: "14px",
                sm: "14px",
                md: "18px",
                lg: "18px",
              },
              fontWeight: 600,
            }}
          >
            {flight?.DepFrom}
            <span
              style={{
                color: "var(--primary-button)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {" "}
              {"-"} {moment(flight?.DepTime).format("HH:mm")}
            </span>
          </Typography>

          <Typography
            sx={{
              color: "var(--airport-color)",
              fontSize: "12px",
              display: {
                xs: "none",
                sm: "none",
                md: "block",
                lg: "block",
              },
            }}
            noWrap
          >
            {flight?.DepAirPort}
          </Typography>

          <Typography
            sx={{
              color: "var(--flight-text-color)",
              fontSize: {
                xs: "11px",
                sm: "11px",
                md: "12px",
                lg: "12px",
              },
            }}
          >
            {moment(flight?.DepTime).format("ddd D MMM YYYY")}
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={3} sm={3} md={2.2} lg={2.2}>
        <Box
          sx={{
            textAlign: {
              xs: "center",
              sm: "center",
              md: "center",
              lg: "center",
            },
            mt: { md: 2 },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: "8px",
                  sm: "8px",
                  md: "12px",
                  lg: "12px",
                },
                color: "var(--flight-text-color)",
                textAlign: {
                  xs: "center",
                  sm: "center",
                  md: "center",
                  lg: "center",
                },
                marginLeft: {
                  xs: "10px",
                  sm: "10px",
                  md: "12px",
                  lg: "12px",
                },
                marginRight: { xs: 3 },
              }}
            >
              {convertMinutesToHoursAndMinutes(flight?.Duration)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              placeItems: {
                xs: "center",
                sm: "center",
                md: "center",
                lg: "center",
              },
            }}
          >
            <svg
              width="95%"
              height="10"
              style={{ marginLeft: isMobile ? "-25px" : "0px" }}
              viewBox="0 0 127 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M124.682 5C124.4 5 108.145 5 100.053 5H4"
                stroke="#13406B"
                strokeWidth="1"
              />
              <circle cx="3.5" cy="4.5" r="3.5" fill="#FCAF17" />
              {/* {alllegs?.Segments?.length === 2 && (
                <circle cx="63" cy="5" r="5" fill="#13406B" />
              )}
              {alllegs?.Segments?.length === 3 && (
                <>
                  <circle cx="35" cy="5" r="5" fill="#13406B" />
                  <circle cx="85" cy="5" r="5" fill="#13406B" />
                </>
              )} */}
              <circle cx="123.5" cy="4.5" r="3.5" fill="#FCAF17" />
            </svg>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: "8px",
                  sm: "8px",
                  md: "12px",
                  lg: "12px",
                },
                textAlign: {
                  xs: "center",
                  sm: "center",
                  md: "center",
                  lg: "center",
                },
                marginLeftLeft: {
                  xs: "14px",
                  sm: "14px",
                  md: "10px",
                  lg: "10px",
                },
                marginRight: { xs: 2 },
              }}
            >
              {alllegs?.Segments?.length === 1
                ? "Non Stop"
                : alllegs?.Segments?.length === 2
                ? "One Stop"
                : alllegs?.Segments?.length === 3
                ? "Two Stops"
                : alllegs?.Segments?.length === 4
                ? "Three Stops"
                : null}
            </Typography>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={4.5} sm={4.5} md={3.7} lg={3.7}>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            sx={{
              color: "var(--depature-color)",
              fontSize: {
                xs: "14px",
                sm: "14px",
                md: "18px",
                lg: "18px",
              },
              fontWeight: 600,
            }}
          >
            <span
              style={{
                color: "var(--primary-button)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {moment(flight?.ArrTime).format("HH:mm")} {"-"}
            </span>{" "}
            {flight?.ArrTo}
          </Typography>

          <Typography
            sx={{
              color: "var(--airport-color)",
              fontSize: "12px",
              display: {
                xs: "none",
                sm: "none",
                md: "block",
                lg: "block",
              },
            }}
            noWrap
          >
            {flight?.ArrAirPort}
          </Typography>

          <Typography
            sx={{
              color: "var(--flight-text-color)",
              fontSize: {
                xs: "11px",
                sm: "1px",
                md: "12px",
                lg: "12px",
              },
            }}
          >
            {moment(flight?.ArrTime).format("ddd D MMM YYYY")}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

export default FlightDetailsLayout;
