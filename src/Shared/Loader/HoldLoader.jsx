import React from "react";
import { Box, Typography } from "@mui/material";

const HoldLoader = () => {
  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: "var(--primary-button)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          width: 100,
          height: 100,
          bgcolor: "white",
          borderRadius: "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#e00028",
          }}
        >
          e
        </Typography>
      </Box>

      {/* Text Below Logo */}
      <Typography
        variant="body1"
        sx={{
          textAlign: "center",
          letterSpacing: 1,
          fontWeight: "bold",
        }}
      >
        HOLD ON TIGHTLY!
      </Typography>
    </Box>
  );
};

export default HoldLoader;
