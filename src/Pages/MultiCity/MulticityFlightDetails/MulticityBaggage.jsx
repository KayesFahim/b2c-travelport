import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
  Box,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

const MulticityBaggage = ({ data }) => {
  const [value, setValue] = useState("0");
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  return (
    <Box>
      <Box
        sx={{
          display: {
            xs: "block",
            sm: "block",
            md: "none",
            lg: "none",
          },
          // width: "80%",
        }}
      >
        {data.TripType === "Return" ? (
          <TabContext value={value}>
            <TabPanel value={0}>
              <Box
                sx={{
                  width: "100%",
                  border: "1px solid var(--primary-button)",
                  borderRadius: "1px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    bgcolor: "var(--primary-button)",
                    color: "var(--white)",
                    py: 0.6,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      textAlign: "center",
                      width: "33%",
                      borderRight: "1px solid var(--primary-button)",
                    }}
                  >
                    Baggage
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      width: "33%",
                      textAlign: "center",
                      borderRight: "1px solid var(--primary-button)",
                    }}
                  >
                    Check-In
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      width: "33%",
                      textAlign: "center",
                    }}
                  >
                    Cabin
                  </Typography>
                </Box>
                {data?.PriceBreakDown?.map((price, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      borderTop: "1px solid var(--primary-button)",
                      alignItems: "center",
                      width: "100%",
                      py: 0.6,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "black",
                        fontSize: "10px",
                        fontWeight: 600,
                        textAlign: "center",
                        width: "33%",
                        // borderRight: "1px solid var(--primary-button)",
                      }}
                    >
                      {price?.PaxType}
                    </Typography>
                    <Typography
                      sx={{
                        color: "black",
                        fontSize: "10px",
                        fontWeight: 600,
                        width: "33%",
                        textAlign: "center",
                        // borderRight: "1px solid var(--primary-button)",
                      }}
                    >
                      {price.Bag[0]?.Allowance || "0 kg"}
                    </Typography>
                    <Typography
                      sx={{
                        color: "black",
                        fontSize: "10px",
                        fontWeight: 600,
                        width: "33%",
                        textAlign: "center",
                      }}
                    >
                      7 Kg
                    </Typography>
                  </Box>
                ))}
              </Box>
            </TabPanel>
            <TabPanel value={1}>
              <Box
                sx={{
                  width: "100%",
                  border: "1px solid var(--primary-button)",
                  borderRadius: "1px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    bgcolor: "var(--primary-button)",
                    color: "var(--white)",
                    py: 0.6,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      textAlign: "center",
                      width: "33%",
                      borderRight: "1px solid var(--primary-button)",
                    }}
                  >
                    Baggage
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      width: "33%",
                      textAlign: "center",
                      borderRight: "1px solid var(--primary-button)",
                    }}
                  >
                    Check-In
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      width: "33%",
                      textAlign: "center",
                    }}
                  >
                    Cabin
                  </Typography>
                </Box>
                {data?.PriceBreakDown?.map((price, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      borderTop: "1px solid var(--primary-button)",
                      alignItems: "center",
                      width: "100%",
                      py: 0.6,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "black",
                        fontSize: "10px",
                        fontWeight: 600,
                        textAlign: "center",
                        width: "33%",
                        // borderRight: "1px solid var(--primary-button)",
                      }}
                    >
                      {price?.PaxType}
                    </Typography>
                    <Typography
                      sx={{
                        color: "black",
                        fontSize: "10px",
                        fontWeight: 600,
                        width: "33%",
                        textAlign: "center",
                        // borderRight: "1px solid var(--primary-button)",
                      }}
                    >
                      {price.Bag[1]?.Allowance || "0 kg"}
                    </Typography>
                    <Typography
                      sx={{
                        color: "black",
                        fontSize: "10px",
                        fontWeight: 600,
                        width: "33%",
                        textAlign: "center",
                      }}
                    >
                      7 Kg
                    </Typography>
                  </Box>
                ))}
              </Box>
            </TabPanel>
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
                  marginLeft: "-15px",
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
                  background: "var(--primary-color)",
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
                <Tab
                  sx={{ mb: "10px" }}
                  label={`
                ${data?.AllLegsInfo[0]?.DepFrom}-${data?.AllLegsInfo[0]?.ArrTo}
              `}
                  value={0}
                />
                <Tab
                  sx={{ mb: "10px" }}
                  label={`
                ${data?.AllLegsInfo[1]?.DepFrom}-${data?.AllLegsInfo[1]?.ArrTo}
              `}
                  value={1}
                />
              </TabList>
            </Box>
          </TabContext>
        ) : (
          <Box
            sx={{
              width: "100%",
              border: "1px solid var(--primary-button)",
              borderRadius: "1px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                color: "white",
                bgcolor: "var(--primary-button)",
                py: 0.6,
              }}
            >
              <Typography
                sx={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textAlign: "center",
                  width: "33%",
                  borderRight: "1px solid var(--primary-button)",
                }}
              >
                Baggage
              </Typography>
              <Typography
                sx={{
                  fontSize: "10px",
                  fontWeight: 600,
                  width: "33%",
                  textAlign: "center",
                  borderRight: "1px solid var(--primary-button)",
                }}
              >
                Check-In
              </Typography>
              <Typography
                sx={{
                  fontSize: "10px",
                  fontWeight: 600,
                  width: "33%",
                  textAlign: "center",
                }}
              >
                Cabin
              </Typography>
            </Box>
            {data?.PriceBreakDown?.map((price, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  borderTop: "1px solid var(--primary-button)",
                  alignItems: "center",
                  width: "100%",
                  py: 0.6,
                }}
              >
                <Typography
                  sx={{
                    color: "black",
                    fontSize: "10px",
                    fontWeight: 600,
                    textAlign: "center",
                    width: "33%",
                    // borderRight: "1px solid var(--primary-button)",
                  }}
                >
                  {price?.PaxType}
                </Typography>
                <Typography
                  sx={{
                    color: "black",
                    fontSize: "10px",
                    fontWeight: 600,
                    width: "33%",
                    textAlign: "center",
                    // borderRight: "1px solid var(--primary-button)",
                  }}
                >
                  {price.Bag[0]?.Allowance || "0 kg"}
                </Typography>
                <Typography
                  sx={{
                    color: "black",
                    fontSize: "10px",
                    fontWeight: 600,
                    width: "33%",
                    textAlign: "center",
                  }}
                >
                  7 Kg
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: { xs: "none", sm: "none", md: "block", lg: "block" },
          // width: "800px",
          // width: "full",
        }}
      >
        <TabContext value={value.toString()}>
          {data?.AllLegsInfo?.map((info, i) => (
            <TabPanel key={i} value={i.toString()}>
              <TableContainer component={Paper} sx={{ boxShadow: "0" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        "th:not([scope='row'])": {
                          color: "white",
                          background: "var(--primary-button)",
                          fontSize: "12px",
                          fontFamily: "DM Sans !important",
                        },
                      }}
                    >
                      <TableCell align="center">Baggage</TableCell>
                      <TableCell align="center">Check-In</TableCell>
                      <TableCell align="center">Cabin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      "& td, & th": {
                        color: "var(--secondary-color)",
                        fontSize: "12px",
                      },
                    }}
                  >
                    {data?.PriceBreakDown?.map((price, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          "&:last-child td, &:last-child th": {
                            border: 0,
                          },
                        }}
                      >
                        <TableCell align="center">{price.PaxType}</TableCell>
                        <TableCell align="center">
                          {price.Bag[0]?.Allowance || "0 kg"}
                        </TableCell>
                        <TableCell align="center">7 Kg</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          ))}
          {data.TripType === "Oneway" ? (
            ""
          ) : (
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
                  marginLeft: "-15px",
                },
                "& button": {
                  opacity: "1",
                  background: "transparent",
                  color: "var(--primary-color)",
                  border: "1px solid var(--primary-color)",
                  width: "fit-content",
                  minHeight: "fit-content",
                  padding: " 8px 10px",
                  fontSize: {
                    xs: "8px",
                    sm: "8px",
                    md: "12px",
                    lg: "12px",
                  },
                  borderRadius: "3px",
                },
                "& button.Mui-selected,& button.Mui-selected >svg": {
                  background: "var(--primary-color)",
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
          )}
        </TabContext>
      </Box>
    </Box>
  );
};

export default MulticityBaggage;
