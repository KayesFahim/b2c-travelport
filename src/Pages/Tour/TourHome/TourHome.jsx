import React from "react";
import NavBar from "../../../Shared/NavBar/NavBar";
import TourBanner from "./TourBanner";
import TourBestDestination from "../TourBestDestination/TourBestDestination";
import TourOffer from "../TourOffer/TourOffer";
import AllTourPackage from "../AllTourPackage/AllTourPackage";
import TourExpert from "../TourExpert/TourExpert";
import { Box, Container, Tab, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import bannerImg from "../../../asstes/img/HomeImage/banner.png";
import { useState } from "react";

const TourHome = () => {
  const banner = {
    background: `url(${bannerImg})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    height: "330px",
  };
  const [value, setValue] = useState("hotel");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  return (
    <Box>
      <NavBar />
      <TourBanner />
      <TourBestDestination />
      {/* <TourOffer/> */}
      {/* <TourBestDestination/>
      <TourOffer/>
      <AllTourPackage/>
      <TourExpert/> */}

      {/* <div>
        <NavBar />
        <Box>
          <Box style={banner}>
            <Container>
              <TabContext value={value}>
                <Box sx={{ pt: "40px" }}>
                  <TabList
                    onChange={handleChange}
                    aria-label="lab API tabs example"
                    indicatorColor="none"
                  >
                    <Link to="/" style={{ textDecoration: "none" }}>
                      <Tab
                        label="Flight"
                        value="flight"
                        sx={{
                          textTransform: "Capitalize",
                          color: "var(--white)",
                          opacity: "1",
                          width: "0%",
                          "&.MuiTab-root.Mui-selected": {
                            backgroundColor: "var(--button-color)",
                            color: "var(--primary-text-color)",
                            borderRadius: "5px",
                            opacity: "1",
                            width: { lg: "110px", xs: "fit-content" },
                            minHeight: "45px",
                          },
                          fontSize: { xs: "10px", sm: "10px", md: "14px" },
                          fontWeight: 600,
                        }}
                      />
                    </Link>

                    <Link to="/hotel" style={{ textDecoration: "none" }}>
                      <Tab
                        label="Hotel"
                        value="hotel"
                        style={{ marginLeft: "5px" }}
                        sx={{
                          textTransform: "Capitalize",
                          color: "var(--white)",
                          opacity: "1",
                          borderRadius: "5px",
                          "&.MuiTab-root.Mui-selected": {
                            backgroundColor: "var(--button-color)",
                            color: "var(--primary-text-color)",
                            borderRadius: "5px",
                            opacity: "1",
                          },
                          width: { lg: "110px", xs: "fit-content" },
                          minHeight: "45px",
                          fontWeight: 600,
                          margin: { xs: "0px 0px" },
                          fontSize: { xs: "10px", sm: "10px", md: "14px" },
                        }}
                      />
                    </Link>

                    <Tab
                      label="Visa"
                      value="visa"
                      style={{ marginLeft: "5px" }}
                      sx={{
                        textTransform: "Capitalize",
                        "&.MuiTab-root.Mui-selected": {
                          backgroundColor: "var(--button-color)",
                          color: "var(--primary-text-color)",
                          borderRadius: "5px",
                          opacity: "1",
                        },
                        color: "var(--white)",
                        opacity: "1",
                        borderRadius: "5px",
                        width: { lg: "120px", xs: "fit-content" },
                        fontWeight: 600,
                        minHeight: "45px",
                        margin: { xs: "0px 0px" },
                        fontSize: { xs: "10px", sm: "10px", md: "14px" },
                      }}
                    />
                    <Link to="/tour" style={{ textDecoration: "none" }}>
                      <Tab
                        label="Tour"
                        value="tour"
                        style={{ marginLeft: "5px" }}
                        sx={{
                          textTransform: "Capitalize",
                          "&.MuiTab-root.Mui-selected": {
                            backgroundColor: "var(--button-color)",
                            color: "var(--primary-text-color)",
                            borderRadius: "5px",
                            opacity: "1",
                          },
                          fontWeight: 600,
                          color: "var(--white)",
                          opacity: "1",
                          borderRadius: "5px",
                          width: { lg: "100px", xs: "fit-content" },
                          minHeight: "45px",
                          margin: { xs: "0px 0px" },
                          fontSize: { xs: "10px", sm: "10px", md: "14px" },
                        }}
                      />
                    </Link>
                  </TabList>
                </Box>
              </TabContext>
            </Container>
          </Box>

          <Container
            sx={{
              mt: -8,
            }}
          >
            <TabContext value={value}>
              <Box
                sx={{
                  bgcolor: "var(--white)",
                  border: "1px solid var(--button-color)",
                  borderRadius: "5px",
                  padding: "10px 20px",
                }}
              >
                <TabPanel value="hotel" sx={{ width: "100%", padding: "0px" }}>
                  <Typography>
                    For Development Reason Hotel is disabled. Thank you for your
                    Cooperation.
                  </Typography>
                </TabPanel>
               
                <TabPanel value="visa" sx={{ width: "100%", padding: "0px" }}>
                  <Typography>
                    For Development Reasons Visa Processing is disabled Thank
                    you for your Cooperation.
                  </Typography>
                </TabPanel>
                <TabPanel value="tour" sx={{ width: "100%", padding: "0px" }}>
                  <Typography>Tour Coming...Soon</Typography>
                </TabPanel>
              </Box>
            </TabContext>
          </Container>
        </Box>
      </div> */}
    </Box>
  );
};

export default TourHome;
