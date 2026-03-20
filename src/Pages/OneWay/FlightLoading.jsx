import { Box, Grid } from "@mui/material";
import React from "react";
import AirlinesSliderSkeleton from "../AirlinesSlider/AirlinesSliderSlikton";
import RoundwaySelecton from "../Filter/RoundwaySelecton";
import SingleOneWaySelekton from "./SingleOneWaySelekton";

const FlightLoading = ({ onAirlineClick } = {}) => {
  return (
    <Box
      sx={{
        boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Grid container spacing={1}>
        <Grid
          item
          xs={0}
          sm={0}
          md={2.5}
          lg={2.5}
          sx={{
            display: {
              xs: "none",
              sm: "none",
              md: "block",
              lg: "block",
            },
            boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
          }}
        >
          <Box>
            <RoundwaySelecton />
          </Box>
        </Grid>
        <Grid item xs={12} sm={12} md={9.5} lg={9.5}>
          <Box mt={{ xs: 2, md: 0 }}>
            <AirlinesSliderSkeleton />
            <Box mt={1}>
              {[...Array(8)].map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    borderRadius: "10px",
                    boxSizing: "border-box",
                    width: "100%",
                    mb: 1,
                    p: 2,
                    boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
                  }}
                >
                  <SingleOneWaySelekton />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FlightLoading;
