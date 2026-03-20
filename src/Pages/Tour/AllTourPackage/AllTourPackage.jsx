import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Container, Tab, Typography } from "@mui/material";
import React, { useState } from "react";
import AllPack from "./AllPack";

const AllTourPackage = () => {
  const [value, setValue] = useState("all");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  return (
    <Box sx={{ my: "70px" }}>
      <Container>
        <Box>
          <Typography
            sx={{ fontSize: "30px", color: "var(--primary-text-color)" }}
          >
            Explore more destinations
          </Typography>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--primary-button)",
            }}
          >
            Find things to do in cities around the world
          </Typography>
        </Box>
        <Box>
          <TabContext value={value}>
            <Box sx={{ pt: "40px" }}>
              <TabList
                onChange={handleChange}
                aria-label="lab API tabs example"
                indicatorColor="none"
                textColor="var(--filter-text-color)"
              >
                <Tab
                  label="All"
                  value="all"
                  sx={{
                    textTransform: "Capitalize",
                    color: "var(--filter-text-color)",
                    opacity: "1",
                    width: "0%",
                    "&.MuiTab-root.Mui-selected": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--filter-text-color)",
                      borderRadius: "5px",
                      opacity: "1",
                      width: { lg: "80px", xs: "fit-content" },
                      minHeight: "45px",
                    },
                    fontSize: { xs: "8px", sm: "10px", md: "14px" },
                    fontWeight: 600,
                  }}
                />
                <Tab
                  label="Asia"
                  value="asia"
                  style={{ marginLeft: "5px" }}
                  sx={{
                    textTransform: "Capitalize",
                    color: "var(--filter-text-color)",
                    opacity: "1",
                    borderRadius: "5px",
                    "&.MuiTab-root.Mui-selected": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--filter-text-color)",
                      borderRadius: "5px",
                      opacity: "1",
                    },
                    width: { lg: "110px", xs: "fit-content" },
                    minHeight: "45px",
                    fontWeight: 600,
                    margin: { xs: "0px 0px" },
                    fontSize: { xs: "8px", sm: "10px", md: "14px" },
                  }}
                />
                <Tab
                  label="Middle East"
                  value="middleEast"
                  style={{ marginLeft: "5px" }}
                  sx={{
                    textTransform: "Capitalize",
                    "&.MuiTab-root.Mui-selected": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--filter-text-color)",
                      borderRadius: "5px",
                      opacity: "1",
                    },
                    color: "var(--filter-text-color)",
                    opacity: "1",
                    borderRadius: "5px",
                    width: { lg: "120px", xs: "fit-content" },
                    fontWeight: 600,
                    minHeight: "45px",
                    margin: { xs: "0px 0px" },
                    fontSize: { xs: "8px", sm: "10px", md: "14px" },
                  }}
                />

                <Tab
                  label="Europe"
                  value="europe"
                  style={{ marginLeft: "5px" }}
                  sx={{
                    textTransform: "Capitalize",
                    "&.MuiTab-root.Mui-selected": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--filter-text-color)",
                      borderRadius: "5px",
                      opacity: "1",
                    },
                    fontWeight: 600,
                    color: "var(--filter-text-color)",
                    opacity: "1",
                    borderRadius: "5px",
                    width: { lg: "100px", xs: "fit-content" },
                    minHeight: "45px",
                    margin: { xs: "0px 0px" },
                    fontSize: { xs: "8px", sm: "10px", md: "14px" },
                  }}
                />
                <Tab
                  label="Ameriaca"
                  value="ameriaca"
                  style={{ marginLeft: "5px" }}
                  sx={{
                    textTransform: "Capitalize",
                    "&.MuiTab-root.Mui-selected": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--filter-text-color)",
                      borderRadius: "5px",
                      opacity: "1",
                    },
                    fontWeight: 600,
                    color: "var(--filter-text-color)",
                    opacity: "1",
                    borderRadius: "5px",
                    width: { lg: "100px", xs: "fit-content" },
                    minHeight: "45px",
                    margin: { xs: "0px 0px" },
                    fontSize: { xs: "8px", sm: "10px", md: "14px" },
                  }}
                />
                <Tab
                  label="Africa"
                  value="africa"
                  style={{ marginLeft: "5px" }}
                  sx={{
                    textTransform: "Capitalize",
                    "&.MuiTab-root.Mui-selected": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--filter-text-color)",
                      borderRadius: "5px",
                      opacity: "1",
                    },
                    fontWeight: 600,
                    color: "var(--filter-text-color)",
                    opacity: "1",
                    borderRadius: "5px",
                    width: { lg: "100px", xs: "fit-content" },
                    minHeight: "45px",
                    margin: { xs: "0px 0px" },
                    fontSize: { xs: "8px", sm: "10px", md: "14px" },
                  }}
                />
              </TabList>
            </Box>

            <Box>
              <TabPanel value="all" sx={{ padding: "0px", width: "100%" }}>
                <AllPack />
              </TabPanel>
              <TabPanel value="asia" sx={{ width: "100%", padding: "0px" }}>
                <Typography>Asia Package Coming...Soon</Typography>
              </TabPanel>
              <TabPanel
                value="middleEast"
                sx={{ width: "100%", padding: "0px" }}
              >
                <Typography>middleEast Coming...Soon</Typography>
              </TabPanel>
              <TabPanel value="europe" sx={{ width: "100%", padding: "0px" }}>
                <Typography>europe Coming...Soon</Typography>
              </TabPanel>
              <TabPanel value="ameriaca" sx={{ width: "100%", padding: "0px" }}>
                <Typography>ameriaca Coming...Soon</Typography>
              </TabPanel>
              <TabPanel value="africa" sx={{ width: "100%", padding: "0px" }}>
                <Typography>africa Coming...Soon</Typography>
              </TabPanel>
            </Box>
          </TabContext>
        </Box>
      </Container>
    </Box>
  );
};

export default AllTourPackage;
