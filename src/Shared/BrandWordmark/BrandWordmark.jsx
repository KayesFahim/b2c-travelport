import React from "react";
import { Box, Typography } from "@mui/material";

const BrandWordmark = ({
  width = 120,
  height = 100,
  fontSize = 34,
}) => {
  return (
    <Box
      sx={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        border: "1px solid rgba(0, 154, 214, 0.28)",
        background:
          "linear-gradient(140deg, rgba(0,154,214,0.14), rgba(0,154,214,0.04))",
      }}
    >
      <Typography
        sx={{
          fontSize: { xs: Math.max(22, Number(fontSize) - 6), md: fontSize },
          fontWeight: 900,
          letterSpacing: "0.5px",
          lineHeight: 1,
          background:
            "linear-gradient(120deg, #0a2846 0%, #0f4d7b 50%, #009ad6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textTransform: "none",
          userSelect: "none",
        }}
      >
        Fly Jatt
      </Typography>
    </Box>
  );
};

export default BrandWordmark;
