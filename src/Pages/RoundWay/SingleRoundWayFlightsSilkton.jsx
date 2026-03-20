import { Box, Grid, Skeleton } from "@mui/material";
import React from "react";

const SingleRoundWayFlightsSilkton = () => {
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
            <Grid item xs={12} sm={12} md={2.4} lg={2.4}>
              <Box>
                <Box>
                  <Skeleton variant="circular" width={25} height={25} />
                </Box>

                <Box>
                  <Skeleton animation="wave" width={"100%"} />

                  <Skeleton animation="wave" width={"100%"} />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.7} lg={3.7}>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
                <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} />

                {/* <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} /> */}
              </Box>
            </Grid>
            <Grid item xs={3} sm={3} md={2.2} lg={2.2}>
              <Box sx={{ textAlign: "center", mt: { md: 2 } }}>
                <Box>
                  <Skeleton animation="wave" width={"100%"} />
                </Box>
                {/* <Box>
                  <Skeleton animation="wave" width={"100%"} />
                </Box>
                <Box>
                  <Skeleton animation="wave" width={"100%"} />
                </Box> */}
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
              <Box sx={{ textAlign: "right" }}>
                <Skeleton animation="wave" width={"100%"} />
                <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} />
                {/* <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} /> */}
              </Box>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item xs={12} sm={12} md={2.4} lg={2.4}>
              <Box>
                <Box>
                  <Skeleton variant="circular" width={25} height={25} />
                </Box>

                <Box>
                  <Skeleton animation="wave" width={"100%"} />

                  <Skeleton animation="wave" width={"100%"} />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.7} lg={3.7}>
              <Box>
                <Skeleton animation="wave" width={"100%"} />
                <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} />

                {/* <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} /> */}
              </Box>
            </Grid>
            <Grid item xs={3} sm={3} md={2.2} lg={2.2}>
              <Box sx={{ textAlign: "center", mt: { md: 2 } }}>
                <Box>
                  <Skeleton animation="wave" width={"100%"} />
                </Box>
                {/* <Box>
                  <Skeleton animation="wave" width={"100%"} />
                </Box>
                <Box>
                  <Skeleton animation="wave" width={"100%"} />
                </Box> */}
              </Box>
            </Grid>
            <Grid item xs={4.5} sm={4.5} md={3.5} lg={3.5}>
              <Box sx={{ textAlign: "right" }}>
                <Skeleton animation="wave" width={"100%"} />
                <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} />
                {/* <Skeleton animation="wave" width={"100%"} />

                <Skeleton animation="wave" width={"100%"} /> */}
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
                  // gap: {
                  //   xs: "60px",
                  //   sm: "60px",
                  //   md: "200px",
                  //   lg: "200px",
                  // },
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

export default SingleRoundWayFlightsSilkton;
