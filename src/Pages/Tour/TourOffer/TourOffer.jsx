import { Box, Container, Grid, Typography } from "@mui/material";
import React from "react";
import banner1 from "../../../asstes/img/tour/offers/banner1.png";
import banner2 from "../../../asstes/img/tour/offers/banner2.png";
const TourOffer = () => {
  return (
    <Box>
      <Container>
        <Typography
          sx={{ fontSize: "35px", color: "var(--primary-text-color)" }}
        >
          Offers
        </Typography>
        <Grid container spacing={15} sx={{ pt: "10px" }}>
          <Grid item md={6}>
            <Box sx={{ position: "relative" }}>
              <Box>
                <img src={banner1} />
              </Box>
              <Box sx={{ position: "absolute", bottom: "22%", p: "0px 20px" }}>
                <Typography
                  sx={{
                    color: "var(--white)",
                    fontSize: "25px",
                    fontWeight: 600,
                  }}
                >
                  Save 15% with Late Escape Deals
                </Typography>
                <Typography
                  sx={{ color: "var(--white)", pt: "20px", fontSize: "17px" }}
                >
                  Explore thousands of destinations worldwide and <br /> save
                  15% or more
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item md={6}>
            <Box sx={{ position: "relative" }}>
              <Box>
                <img src={banner2} />
              </Box>
              <Box sx={{ position: "absolute", bottom: "22%", p: "0px 20px" }}>
                <Typography
                  sx={{
                    color: "var(--white)",
                    fontSize: "25px",
                    fontWeight: 600,
                  }}
                >
                  Save 15% with Late Escape Deals
                </Typography>
                <Typography
                  sx={{ color: "var(--white)", pt: "20px", fontSize: "17px" }}
                >
                  Explore thousands of destinations worldwide and <br /> save
                  15% or more
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TourOffer;
