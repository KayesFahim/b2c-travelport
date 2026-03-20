import { Box, Typography } from "@mui/material";
import React from "react";
import bannerImg from "../../asstes/img/Blog/blogBanner.png";
import right from "../../asstes/img/footer img/rightlogo.svg";

const BlogBanner = () => {
  const banner = {
    background: `url(${bannerImg})`,
    // backgroundRepeat: "no-repeat",
    // backgroundSize: "cover",
    height: "200px",
    // width: "100%",
  };
  return (
    <Box
      style={banner}
      sx={{
        width: "100%",
        py: 4,
        background: "linear-gradient(180deg, #151F29 0%, #2A3248 100%)",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          bottom: 130,
          right: 0,
          // left:0,
          zIndex: 1,
          justifyContent: "end",
          display: { xs: "none", sm: "flex" },
        }}
      >
        <img
          src={right}
          style={{
            width: "30%",
            height: "10%",
          }}
        />
      </Box>
      <Box sx={{
        px: 3,
        mt: "10%"
      }}>
        <Typography
          sx={{
            textAlign: "end",
            color: "var(--white)",
            fontSize: "25px"
          }}
          // variant="h3"
          fontWeight="bold"
        >
          Explore travel moments <br /> that inspire stories
        </Typography>
      </Box>

    </Box>
  );
};

export default BlogBanner;
