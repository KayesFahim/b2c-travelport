import { Skeleton, Grid, Box } from "@mui/material";

export default function Loading() {
  return (
    <div>
      <Grid container spacing={1}>
        <Grid item xs={12} md={4}>
          <Box>
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box>
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box>
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
          </Box>
        </Grid>
      </Grid>
    </div>
  );
}
