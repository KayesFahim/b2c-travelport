import { Box, Container, Typography } from "@mui/material";
import React from "react";
import Slider from "react-slick";

const BlogExplore = () => {
  var settings = {
    dots: true,
    infinite: true,
    speed: 500,
    autoplaySpeed: 2000,
    autoplay: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    initialSlide: 0,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          initialSlide: 0,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  return (
    <Box
      sx={{
        // pt: 10,
        overflow: "hidden",
      }}
    >
      <Container>
        <Box
          sx={{
            bgcolor: "var(--primary-button)",
            borderRadius: "4px",
          }}
        >
          <Typography
            sx={{
              px: 2,
              py: 6,
            }}
          >
            <span
              style={{
                color: "var(--primary-color)",
                fontsize: "20px",
                fontWeight: "600px",
              }}
            >
              Explore
            </span>{" "}
            <br /> Our Newest offer
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default BlogExplore;
