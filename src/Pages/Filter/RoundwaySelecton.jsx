import React from "react";
import { Box, Skeleton } from "@mui/material";

const RoundwaySelecton = () => {
  return (
    <Box sx={{ p: "10px 15px" }}>
      <Box
        sx={{
          //   display: "flex",
          //   alignItems: "center",
          //   justifyContent: "space-between",
          borderBottom: "1px solid #D9D9D9",
          pb: "2px",
        }}
      >
        <Skeleton animation="wave" height={40} />
      </Box>

      <Box sx={{ py: "15px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>

      {/* Favourite */}
      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>

      {/* stops  */}

      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
      {/* Airlines  */}
      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
      {/* depature time */}

      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
      {/* Arrival Time */}
      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
      {/* depature time */}

      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
      {/* Arrival Time */}
      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
      {/* baggage  */}
      <Box sx={{ py: "10px" }}>
        <Skeleton animation="wave" height={40} />
      </Box>
    </Box>
  );
};

export default RoundwaySelecton;
