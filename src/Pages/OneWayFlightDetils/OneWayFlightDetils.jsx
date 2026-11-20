import { Box, Button, Grid, Typography } from "@mui/material";
import React from "react";
import biman from "../../asstes/img/HomeImage/flightIcons/biman.png";
import arrivalRocket from "../../asstes/img/HomeImage/flightIcons/duration.svg";
import moment from "moment-timezone";
import { calculateTransitTime } from "../../Pages/common/funcation";
import { convertMinutesToHoursAndMinutes } from "../../Pages/common/funcation";
const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

const OneWayFlightDetils = ({ data }) => {
  const getCabinClass = (cabinCode) => {
    switch (cabinCode) {
      case "M":
      case "Y":
      case "Economy":
        return "Economy";
      case "C":
      case "I":
      case "Business":
        return "Business";
      case "P":
      case "First":
        return "First";
      case "S":
      case "U":
        return "Premium Economy";
      default:
        return "Economy";
    }
  };
  return (
    <Box
      sx={{
        width: "100%",
        py: {
          xs: "10px",
          sm: "10px",
          md: "30px",
          lg: "30px",
        },
      }}
    >
      {data?.AllLegsInfo?.[0]?.Segments?.map((segment, i, arr) => (
        <Box>
          <Grid container spacing={{ xs: 1, sm: 1, md: 5, lg: 5 }} key={i}>
            <Grid item xs={12} sm={12} md={2.5} lg={2.5}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: {
                    xs: "flex-start",
                    sm: "flex-start",
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
                    xs: "10px",
                    sm: "10px",
                    md: "0px",
                    lg: "0px",
                  },
                }}
              >
                <Box>
                  <img
                    style={{ height: "50px", width: "50px" }}
                    src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${segment?.OperatingCarrier}.png`}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: "var(--primary-button)",
                      fontWeight: 600,
                      fontSize: {
                        xs: "12px",
                        sm: "12px",
                        md: "14px",
                        lg: "14px",
                      },
                    }}
                  >
                    {segment?.MarketingCarrierName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "11px",
                        sm: "11px",
                        md: "12px",
                        lg: "12px",
                      },
                      color: "var(--meta-black)",
                    }}
                  >
                    {`${segment?.MarketingCarrier} ${segment?.MarketingFlightNumber}`}
                  </Typography>
                  <Box sx={{ py: "5px" }}>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "12px",
                          lg: "12px",
                        },
                        color: "var(--meta-black)",
                      }}
                    >
                      Operated by: {segment?.OperatingCarrier}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "12px",
                          lg: "12px",
                        },
                        color: "var(--meta-black)",
                        pt: "5px",
                      }}
                    >
                      {getCabinClass(segment?.SegmentCode?.cabinCode)} :{" "}
                      {segment?.SegmentCode?.bookingCode}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
              <Box>
                <Typography
                  sx={{
                    color: "var(--flight-text-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "14px",
                      lg: "14px",
                    },
                  }}
                >
                  Depart
                </Typography>
                <Typography
                  sx={{
                    color: "var(--depature-color)",
                    fontSize: {
                      xs: "15px",
                      sm: "15px",
                      md: "25px",
                      lg: "25px",
                    },
                    fontWeight: 600,
                  }}
                >
                  {segment?.DepFrom}
                </Typography>
                <Typography
                  sx={{
                    color: "var(--airport-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "15px",
                      lg: "15px",
                    },
                  }}
                >
                  {segment?.DepLocation} |{" "}
                  <span
                    style={{ color: "var(--primary-button)", fontWeight: 600 }}
                  >
                    {moment.tz(segment?.DepTime, "UTC").format("HH:mm")}
                  </span>
                </Typography>
                <Typography
                  sx={{
                    color: "var(--airport-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "15px",
                      lg: "15px",
                    },
                  }}
                >
                  Terminal, {segment?.DepAirPort}
                </Typography>
                <Typography
                  sx={{
                    color: "var(--flight-text-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "15px",
                      lg: "15px",
                    },
                  }}
                >
                  {moment.tz(segment?.DepTime, "UTC").format("ddd D MMM YYYY")}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3} sm={3} md={2.5} lg={2.5}>
              <Box sx={{ textAlign: "center" }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "11px",
                        sm: "11px",
                        md: "12px",
                        lg: "12px",
                      },
                      color: "var(--flight-text-color)",
                    }}
                  >
                    {convertMinutesToHoursAndMinutes(segment?.Duration)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: {
                      xs: "left",
                      sm: "left",
                      md: "center",
                      lg: "center",
                    },
                  }}
                >
                  <svg
                    width="127"
                    height="10"
                    style={{ marginLeft: isMobile ? "-28px" : "0px" }}
                    viewBox="0 0 127 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M124.682 5C124.4 5 108.145 5 100.053 5H4"
                      stroke="#13406B"
                      strokeWidth="2"
                    />
                    <circle cx="3.5" cy="4.5" r="3.5" fill="#FCAF17" />
                    <circle cx="123.5" cy="4.5" r="3.5" fill="#FCAF17" />
                  </svg>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "11px",
                        sm: "11px",
                        md: "12px",
                        lg: "12px",
                      },
                    }}
                  >
                    Non Stop
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  sx={{
                    color: "var(--flight-text-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "14px",
                      lg: "14px",
                    },
                  }}
                >
                  Arrival
                </Typography>
                <Typography
                  sx={{
                    color: "var(--depature-color)",
                    fontSize: {
                      xs: "15px",
                      sm: "15px",
                      md: "25px",
                      lg: "25px",
                    },
                    fontWeight: 600,
                  }}
                >
                  {segment?.ArrTo}
                </Typography>
                <Typography
                  sx={{
                    color: "var(--airport-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "15px",
                      lg: "15px",
                    },
                  }}
                >
                  {segment?.ArrLocation} |{" "}
                  <span
                    style={{ color: "var(--primary-button)", fontWeight: 600 }}
                  >
                    {moment.tz(segment?.ArrTime, "UTC").format("HH:mm")}
                  </span>
                </Typography>
                <Typography
                  sx={{
                    color: "var(--airport-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "15px",
                      lg: "15px",
                    },
                  }}
                >
                  Terminal, {segment?.ArrAirPort}
                </Typography>
                <Typography
                  sx={{
                    color: "var(--flight-text-color)",
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "15px",
                      lg: "15px",
                    },
                  }}
                >
                  {moment.tz(segment?.ArrTime, "UTC").format("ddd D MMM YYYY")}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          {i < arr?.length - 1 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                py: "30px",
              }}
            >
              <Box
                sx={{
                  // bgcolor: "#E3E7EE",
                  background: "var(--primary-button)",
                  // border: "1px solid var(--primary-button)",
                  borderRadius: "5px",
                  width: "78%",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    textAlign: "center",
                    py: "6px",
                    color: "white",
                  }}
                >
                  Change planes at {segment?.ArrAirPort}
                  &nbsp; | &nbsp;
                  {segment?.ArrLocation} |Connecting Time:{" "}
                  {calculateTransitTime(arr[i]?.ArrTime, arr[i + 1]?.DepTime)}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default OneWayFlightDetils;
