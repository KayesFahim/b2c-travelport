import { Box, Grid, Skeleton } from "@mui/material";
import React from "react";

const SingleOneWaySelekton = () => {
  return (
    <Box>
      <Grid container spacing={5}>
        <Grid item xs={12} sm={12} md={1.9} lg={1.9}>
          <Box>
            <Box>
              <Skeleton variant="circular" width={25} height={25} />
            </Box>

            <Box>
              <Skeleton animation="wave" />

              <Skeleton animation="wave" />
            </Box>
          </Box>
        </Grid>
        <Grid item xs={4.5} sm={4.5} md={3.2} lg={3.2}>
          <Box>
            <Skeleton animation="wave" />
            <Skeleton animation="wave" />

            <Skeleton animation="wave" />

            {/* <Skeleton animation="wave" />

            <Skeleton animation="wave" /> */}
          </Box>
        </Grid>
        <Grid item xs={3} sm={3} md={1.7} lg={1.7}>
          <Box sx={{ textAlign: "center", mt: { md: 2 } }}>
            <Box>
              <Skeleton animation="wave" />
            </Box>
            {/* <Box>
              <Skeleton animation="wave" />
            </Box>
            <Box>
              <Skeleton animation="wave" />
            </Box> */}
          </Box>
        </Grid>
        <Grid item xs={4.5} sm={4.5} md={3.2} lg={3.2}>
          <Box sx={{ textAlign: "right" }}>
            <Skeleton animation="wave" />
            <Skeleton animation="wave" />

            <Skeleton animation="wave" />
            {/* <Skeleton animation="wave" />

            <Skeleton animation="wave" /> */}
          </Box>
        </Grid>
        <Grid item xs={12} sm={12} md={2} lg={2}>
          <Box
            sx={{
              display: "flex",
              flexDirection: {
                xs: "row",
                sm: "row",
                md: "column",
                lg: "column",
              },
              justifyContent: "end",
              // gap: "60px",
            }}
          >
            <Box sx={{ width: "100%" }}>
              <Skeleton animation="wave" />
            </Box>
            <Box sx={{ width: "100%" }}>
              <Skeleton animation="wave" />
            </Box>
          </Box>
        </Grid>
      </Grid>
      <Grid
        container
        spacing={4}
        pt={1}
        sx={{
          display: {
            xs: "none",
            sm: "none",
            md: "flex",
            lg: "flex",
          },
        }}
      >
        <Grid item md={2.3}>
          {/* <Box>
            <Skeleton animation="wave" />
          </Box> */}
        </Grid>
        <Grid
          xs={9}
          item
          md={7.7}
          sx={{
            display: "flex",
            justifyContent: { xs: "start", md: "center" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <Skeleton animation="wave" style={{ width: "100%" }} />
            <Skeleton animation="wave" style={{ width: "100%" }} />
            <Skeleton animation="wave" style={{ width: "100%" }} />
            <Skeleton animation="wave" style={{ width: "100%" }} />
          </Box>
        </Grid>
        <Grid item md={2}>
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: {
                  xs: "flex-start",
                  sm: "flex-start",
                  md: "end",
                },
                alignItems: "center",
              }}
            >
              <Skeleton animation="wave" style={{ width: "100%" }} />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SingleOneWaySelekton;
