import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Tab, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { Box, Button, Grid, Typography } from "@mui/material";
import biman from "../../asstes/img/HomeImage/flightIcons/biman.png";
import arrivalRocket from "../../asstes/img/HomeImage/flightIcons/duration.svg";
import moment from "moment-timezone";
import { calculateTransitTime } from "../../Pages/common/funcation";
import { convertMinutesToHoursAndMinutes } from "../../Pages/common/funcation";
const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

const RoundwayFlightDetails = ({ data }) => {
  const [value, setValue] = useState("0" || []);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

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
    <Box>
      <Box className="table-wrapper">
        <TabContext value={value.toString()}>
          {data?.AllLegsInfo?.map((info, i) => (
            <TabPanel
              key={i}
              value={i.toString()}
              style={{ padding: isMobile ? "0px 0px" : "20px 0px" }}
            >
              <Box sx={{ width: "100%", py: { xs: "10px", md: "30px" } }}>
                {info.Segments?.map((segment, index, arr) => (
                  <Box key={index}>
                    <Grid container spacing={{ xs: 1, sm: 1, md: 5, lg: 5 }}>
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
                            <Tooltip title={segment?.MarketingCarrierName}>
                              <Typography
                                sx={{
                                  color: "var(--primary-button)",
                                  fontWeight: 500,
                                  fontSize: {
                                    xs: "12px",
                                    sm: "12px",
                                    md: "14px",
                                    lg: "14px",
                                  },
                                }}
                              >
                                {segment?.MarketingCarrierName
                                  ? segment.MarketingCarrierName.length > 22
                                    ? segment.MarketingCarrierName.slice(0, 16)
                                    : segment.MarketingCarrierName
                                  : ""}
                              </Typography>
                            </Tooltip>
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
                                {getCabinClass(segment?.SegmentCode?.cabinCode)}{" "}
                                : {segment?.SegmentCode?.bookingCode}
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
                              style={{
                                color: "var(--primary-button)",
                                fontWeight: 600,
                              }}
                            >
                              {moment
                                .tz(segment?.DepTime, "UTC")
                                .format("HH:mm")}
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
                            {moment
                              .tz(segment?.DepTime, "UTC")
                              .format("ddd D MMM YYYY")}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3} sm={3} md={2.5} lg={2.5}>
                        <Box sx={{ textAlign: "center" }}>
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "12px",
                                color: "var(--flight-text-color)",
                              }}
                            >
                              {convertMinutesToHoursAndMinutes(
                                segment?.Duration
                              )}
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
                              style={{
                                marginLeft: isMobile ? "-28px" : "0px",
                              }}
                              viewBox="0 0 127 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M124.682 5C124.4 5 108.145 5 100.053 5H4"
                                stroke="#13406B"
                                strokeWidth="2"
                              />
                              <circle
                                cx="3.5"
                                cy="4.5"
                                r="3.5"
                                fill="#FCAF17"
                              />
                              <circle
                                cx="123.5"
                                cy="4.5"
                                r="3.5"
                                fill="#FCAF17"
                              />
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
                              style={{
                                color: "var(--primary-button)",
                                fontWeight: 600,
                              }}
                            >
                              {moment
                                .tz(segment?.ArrTime, "UTC")
                                .format("HH:mm")}
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
                            {moment
                              .tz(segment?.ArrTime, "UTC")
                              .format("ddd D MMM YYYY")}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    {index < arr?.length - 1 && (
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
                            bgcolor: "#E3E7EE",
                            borderRadius: "5px",
                            width: {
                              xs: "100%",
                              sm: "100%",
                              md: "78%",
                              lg: "78%",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "12px",
                              textAlign: "center",
                              py: "6px",
                            }}
                          >
                            Change planes at {segment?.ArrAirPort}
                            &nbsp; | &nbsp;
                            {segment?.ArrLocation} |Connecting Time:{" "}
                            {calculateTransitTime(
                              arr[index]?.ArrTime,
                              arr[index + 1]?.DepTime
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </TabPanel>
          ))}

          <Box
            sx={{
              width: "100%",
              height: {
                md: "fit-content",
                sm: "100%",
                xs: "100%",
              },
              display: "flex",
              justifyContent: {
                md: "flex-start",
                sm: "start",
                xs: "start",
              },

              alignItems: "flex-start",
              opacity: "1",
              "& .MuiTabs-flexContainer": {
                flexWrap: "wrap",
                gap: "5px",
              },
              ".MuiTabs-root": {
                minHeight: "fit-content",
                marginLeft: "-40px",
              },
              "& button": {
                opacity: "1",
                background: "transparent",
                color: "var(--primary-color)",
                border: "1px solid var(--primary-color)",
                width: "fit-content",
                minHeight: "fit-content",
                padding: " 8px 10px",
                fontSize: "12px",
                borderRadius: "3px",
              },
              "& button.Mui-selected,& button.Mui-selected >svg": {
                background: "var(--primary-color) !important",
                color: "var(--white) !important",
              },
            }}
          >
            <TabList
              variant="scrollable"
              scrollButtons
              allowScrollButtonsMobile
              value={value}
              onChange={handleChange}
              aria-label="agent-tabs"
              TabIndicatorProps={{
                style: { display: "none" },
              }}
            >
              {data?.AllLegsInfo?.map((info, i) => (
                <Tab
                  key={i}
                  sx={{ mb: "10px" }}
                  label={`${info.DepFrom}-${info.ArrTo}`}
                  value={i.toString()}
                />
              ))}
            </TabList>
          </Box>
        </TabContext>
      </Box>
    </Box>
  );
};

export default RoundwayFlightDetails;
