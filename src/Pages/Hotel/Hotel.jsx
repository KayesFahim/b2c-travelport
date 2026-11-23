import React, { useState } from "react";
import NavBar from "../../Shared/NavBar/NavBar";
import { Box, Container, Tab, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import bannerImg from "../../asstes/img/HomeImage/banner.png";
import HotelSearchBox from "./HotelSearchBox";

const Hotel = () => {
  const banner = {
    background: `linear-gradient(118deg, rgba(2, 16, 37, 0.88) 0%, rgba(5, 41, 79, 0.78) 52%, rgba(0, 154, 214, 0.42) 100%), url(${bannerImg})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: "300px",
  };
  const [value, setValue] = useState("hotel");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <div>
      <NavBar />
      <Box sx={{ pb: 8 }}>
        <Box style={banner}>
          <Container>
            <TabContext value={value}>
              <Box sx={{ pt: "40px" }}>
                <TabList
                  onChange={handleChange}
                  aria-label="Travel product tabs"
                  TabIndicatorProps={{ sx: { display: "none" } }}
                >
                  <Link to="/" style={{ textDecoration: "none" }}>
                    <Tab
                      label="Flight"
                      value="flight"
                      sx={{
                        textTransform: "capitalize",
                        color: "var(--white)",
                        opacity: 1,
                        minHeight: "42px",
                        minWidth: "110px",
                        borderRadius: "999px",
                        fontSize: { xs: "12px", md: "14px" },
                        fontWeight: 700,
                      }}
                    />
                  </Link>

                  <Link to="/hotel" style={{ textDecoration: "none" }}>
                    <Tab
                      label="Stay"
                      value="hotel"
                      sx={{
                        textTransform: "capitalize",
                        color: "var(--white)",
                        opacity: 1,
                        borderRadius: "999px",
                        "&.MuiTab-root.Mui-selected": {
                          backgroundColor: "var(--primary-button)",
                          color: "var(--white)",
                          boxShadow: "0 6px 14px rgba(0,154,214,0.35)",
                        },
                        minWidth: "110px",
                        minHeight: "42px",
                        fontWeight: 700,
                        fontSize: { xs: "12px", md: "14px" },
                      }}
                    />
                  </Link>
                </TabList>
              </Box>

              <Box sx={{ py: { xs: 2.5, md: 4 } }}>
                <Typography
                  component="h1"
                  sx={{
                    color: "var(--white)",
                    fontWeight: 800,
                    fontSize: { xs: "28px", md: "42px" },
                    lineHeight: 1.15,
                  }}
                >
                  Find Your Ideal Stay with Travelport Stays
                </Typography>
                <Typography
                  sx={{
                    mt: 0.8,
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: 500,
                    fontSize: { xs: "14px", md: "17px" },
                  }}
                >
                  Search live hotel inventory, room availability, rate rules, and instant reservations.
                </Typography>
              </Box>
            </TabContext>
          </Container>
        </Box>

        <Container sx={{ mt: -7, position: "relative", zIndex: 2 }}>
          <TabContext value={value}>
            <TabPanel value="hotel" sx={{ width: "100%", padding: "0px" }}>
              <HotelSearchBox />
            </TabPanel>
          </TabContext>
        </Container>
      </Box>
    </div>
  );
};

export default Hotel;
