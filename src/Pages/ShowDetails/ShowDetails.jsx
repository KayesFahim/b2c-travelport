import { TabContext, TabPanel } from "@mui/lab";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Dialog, IconButton, Tab, Tabs, Typography } from "@mui/material";
import React from "react";
import FareDetails from "../OneWayFlightDetils/FareDetails";
import FarePolicy from "../OneWayFlightDetils/FarePolicy";
import Cancellation from "../OneWayFlightDetils/Cancellation";
import DateChange from "../OneWayFlightDetils/DateChange";
import MulticityBaggage from "../MultiCity/MulticityFlightDetails/MulticityBaggage";
import FlightDetails from "./FlightDetails";

const ShowDetails = ({
  data,
  flightDetails,
  value,
  handleChange,
  round,
  multicity,
  onCloseDetails,
}) => {
  const handleCloseDetails = () => {
    if (typeof onCloseDetails === "function") {
      onCloseDetails();
    }
  };
  const firstLeg = data?.AllLegsInfo?.[0];
  const routeSummary =
    firstLeg?.DepFrom && firstLeg?.ArrTo
      ? `${firstLeg.DepFrom} to ${firstLeg.ArrTo}`
      : "Itinerary details";
  const panelCardSx = {
    width: "100%",
    background: "#FFFFFF",
    borderRadius: "14px",
    border: "1px solid #DFE7EF",
    p: { xs: "12px", md: "18px" },
  };

  return (
    <Dialog
      open={flightDetails}
      onClose={handleCloseDetails}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: "calc(100% - 12px)", md: "1320px" },
          height: { xs: "94vh", md: "92vh" },
          maxWidth: { xs: "calc(100% - 12px)", md: "1320px" },
          maxHeight: { xs: "94vh", md: "92vh" },
          borderRadius: { xs: "16px", md: "18px" },
          background: "linear-gradient(180deg, #F7FAFE 0%, #EFF4FA 100%)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          bgcolor: "#F4F7FB",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FFFFFF",
            borderBottom: "1px solid #DFE7EF",
            p: { xs: "12px 14px", md: "14px 18px" },
            position: "sticky",
            top: 0,
            zIndex: 6,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: { xs: "14px", md: "16px" },
                color: "var(--meta-black)",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Flight Details
            </Typography>
            <Typography
              sx={{
                mt: "2px",
                fontSize: { xs: "11px", md: "12px" },
                color: "#5A6B7D",
                fontWeight: 500,
              }}
            >
              {routeSummary}
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseDetails}
            size="small"
            sx={{
              border: "1px solid #DFE7EF",
              background: "#FFFFFF",
              flexShrink: 0,
              ml: 2,
              zIndex: 7,
              boxShadow: "0 2px 8px rgba(16, 40, 72, 0.08)",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            p: { xs: "10px", md: "14px 16px 16px" },
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "1240px",
              mx: "auto",
            }}
          >
            <TabContext value={value}>
            <Box
              sx={{
                width: "100%",
                background: "#FFFFFF",
                border: "1px solid #DFE7EF",
                borderRadius: "10px",
                p: "6px",
                mb: "10px",
              }}
            >
              <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: "unset",
                  "& .MuiTabs-flexContainer": {
                    gap: "6px",
                  },
                  "& .MuiTab-root": {
                    minHeight: "34px",
                    px: "12px",
                    borderRadius: "7px",
                    textTransform: "capitalize",
                    fontSize: { xs: "11px", md: "12px" },
                    fontWeight: 600,
                    color: "#4B5A69",
                  },
                  "& .MuiTab-root.Mui-selected": {
                    background: "var(--primary-button)",
                    color: "#FFFFFF",
                  },
                  "& .MuiTabs-indicator": {
                    display: "none",
                  },
                }}
              >
                <Tab label="Flight Details" value="1" />
                <Tab label="Fare Details" value="2" />
                <Tab label="Baggage" value="5" />
                <Tab label="Cancellation" value="6" />
                <Tab label="Date Change" value="7" />
                <Tab
                  sx={{
                    display: {
                      // xs: "none",
                      // sm: "none",
                      md: "block",
                      lg: "block",
                    },
                  }}
                  label="Fare Policy"
                  value="4"
                />
              </Tabs>
            </Box>
            {/* //todo:Flight Details */}
            <TabPanel
              value="1"
              sx={{
                p: 0,
                width: "100%",
              }}
            >
              <Box sx={panelCardSx}>
                <FlightDetails data={data} />
              </Box>
            </TabPanel>
            {/* //todo:Fare Details */}
            <TabPanel
              value="2"
              sx={{
                p: 0,
                width: "100%",
              }}
            >
              <Box
                sx={{
                  ...panelCardSx,
                  p: { xs: "12px", md: "18px" },
                }}
              >
                <FareDetails data={data} />
              </Box>
            </TabPanel>
            {/*  //todo: Policy*/}
            <TabPanel
              value="4"
              sx={{
                p: 0,
                width: "100%",
              }}
            >
              <Box sx={panelCardSx}>
                <FarePolicy
                  searchId={data?.SearchId}
                  resultId={data?.ResultId}
                />{" "}
              </Box>
            </TabPanel>

            {/*  //todo: Baggage*/}
            <TabPanel
              value="5"
              sx={{
                p: 0,
                width: "100%",
              }}
            >
              <Box sx={panelCardSx}>
                <MulticityBaggage data={data} />
              </Box>
            </TabPanel>
            {/* cancellation   */}
            <TabPanel
              value="6"
              sx={{
                p: 0,
                width: "100%",
              }}
            >
              <Box sx={panelCardSx}>
                <Cancellation
                  searchId={data?.SearchId}
                  resultId={data?.ResultId}
                />{" "}
              </Box>
            </TabPanel>
            {/* Date Change   */}
            <TabPanel
              value="7"
              sx={{
                p: 0,
                width: "100%",
              }}
            >
              <Box sx={panelCardSx}>
                <DateChange
                  searchId={data?.SearchId}
                  resultId={data?.ResultId}
                />
              </Box>
            </TabPanel>
            </TabContext>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default ShowDetails;
