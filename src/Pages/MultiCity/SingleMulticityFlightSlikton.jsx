import React from "react";
import { Box, Grid, Skeleton } from "@mui/material";

const SingleMulticityFlightSlikton = () => {
  return (
    <Box
    sx={{
      background: "#fffff",
      boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
      borderRadius: "10px",
      p: "15px 20px",
    }}
  >
    <Grid container spacing={5}>
      <Grid item xs={12} sm={12} md={10} lg={10} container>
        <Grid container>
          <Grid item xs={12} sm={12} md={2.5} lg={2.5}>
            <Box>
              <Box>
                <Skeleton variant="circular" width={50} height={50} />
              </Box>

              <Box>
                <Skeleton animation="wave" width={"100%"} />
                
                <Skeleton animation="wave" width={"100%"} />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
            <Box>
              <Skeleton animation="wave" width={"100%"} />
              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />
            </Box>
          </Grid>
          <Grid item xs={3} sm={3} md={2.5} lg={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
            <Box sx={{ textAlign: "right" }}>
              <Skeleton animation="wave" width={"100%"} />
              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />
              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />
            </Box>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item xs={12} sm={12} md={2.5} lg={2.5}>
            <Box>
              <Box>
                <Skeleton variant="circular" width={50} height={50} />
              </Box>
              <Box>
                <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
            <Box>
              <Skeleton animation="wave" width={"100%"} />
              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />
            </Box>
          </Grid>
          <Grid item xs={3} sm={3} md={2.5} lg={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
            <Box sx={{ textAlign: "right" }}>
              <Skeleton animation="wave" width={"100%"} />
              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />
              <Skeleton animation="wave" width={"100%"} />

              <Skeleton animation="wave" width={"100%"} />
            </Box>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12} sm={12} md={2} lg={2}>
        <Grid container>
          <Grid item xs={12} sm={12} md={12} lg={12}>
            <Box
              sx={{
                textAlign: "right",
                display: "flex",
                flexDirection: {
                  xs: "row",
                  sm: "row",
                  md: "column",
                  lg: "column",
                },
                gap: {
                  xs: "60px",
                  sm: "60px",
                  md: "200px",
                  lg: "200px",
                },
              }}
            >
              <Box sx={{ width: "100%" }}>
                <Skeleton animation="wave" width={"100%"} />
                <Skeleton animation="wave" width={"100%"} />
              </Box>
              <Box sx={{ width: "100%" }}>
                <Skeleton animation="wave" width={"100%"} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
    <Grid
      container
      sx={{
        display: {
          xs: "none",
          sm: "none",
          md: "flex",
          lg: "flex",
        },
      }}
      spacing={5}
      pt={1.5}
    >
      <Grid item lg={2.3}>
        <Box>
          <Box>
            <Skeleton animation="wave" width={"100%"} />
          </Box>
        </Box>
      </Grid>
      <Grid item lg={7.7}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "100px" }}>
          <Skeleton animation="wave" width={"100%"} />
          <Skeleton animation="wave" width={"100%"} />
          <Skeleton animation="wave" width={"100%"} />
        </Box>
      </Grid>
      <Grid item lg={2}>
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: {
                xs: "flex-start",
                sm: "flex-start",
                md: "center",
              },
              alignItems: "center",
            }}
          >
            <Skeleton animation="wave" width={"100%"} />
          </Box>
        </Box>
      </Grid>
    </Grid>
  </Box>
  );
};

export default SingleMulticityFlightSlikton;
