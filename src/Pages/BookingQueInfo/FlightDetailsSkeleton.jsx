import { Box, Grid, Skeleton } from "@mui/material";
import React from "react";
const isMobile = window.innerWidth <= 768;

const FlightDetailsSkeleton = () => {
  return (
    <Grid container spacing={{ xs: 1, sm: 1, md: 0, lg: 0 }}>
      <Grid item xs={12} sm={12} md={2.4} lg={2.4}>
        <Skeleton
          variant="rectangular"
          width={isMobile ? 20 : 25}
          height={isMobile ? 20 : 25}
        />
        <Skeleton variant="text" width={100} height={20} />
        <Skeleton variant="text" width={100} height={20} />
      </Grid>
      <Grid item xs={4.5} sm={4.5} md={3.7} lg={3.7}>
        <Skeleton variant="text" width={150} height={30} />
        <Skeleton variant="text" width={100} height={20} />
        <Skeleton variant="text" width={100} height={20} />
      </Grid>
      <Grid item xs={3} sm={3} md={2.2} lg={2.2}>
        <Skeleton variant="text" width={50} height={20} />
        <Skeleton variant="rectangular" width="95%" height={10} />
        <Skeleton variant="text" width={50} height={20} />
      </Grid>
      <Grid item xs={4.5} sm={4.5} md={3.7} lg={3.7}>
        <Skeleton variant="text" width={150} height={30} />
        <Skeleton variant="text" width={100} height={20} />
        <Skeleton variant="text" width={100} height={20} />
      </Grid>
    </Grid>
  );
};

export default FlightDetailsSkeleton;
