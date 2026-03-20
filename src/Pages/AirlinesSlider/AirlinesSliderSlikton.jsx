import { Box, Skeleton } from "@mui/material";
import React from "react";
import Slider from "react-slick";

const AirlinesSliderSkeleton = ({ onAirlineClick }) => {
  // Slider settings
  const settings = {
    dots: false,
    arrows: false,
    infinite: false,
    speed: 500,
    autoplay: false,
    autoplaySpeed: 1000,
    slidesToShow: 4,
    slidesToScroll: 4,
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
          slidesToShow: 2,
          slidesToScroll: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
        },
      },
    ],
  };

  return (
    <Box
      sx={{
        background: "#FFFFFF",
        boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
        borderRadius: "10px",
        px: "10px",
        overflow: "hidden",
      }}
    >
      <div className="slider-container">
        <Slider {...settings}>
          {[...Array(6)].map((_, index) => (
            <div key={index}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: "5px",
                  gap: "10px",
                  ":hover": {
                    background: "#FFE9BD",
                    cursor: "pointer",
                    width: "90%",
                  },
                }}
              >
                <Skeleton
                  variant="circular"
                  animation="wave"
                  width={50}
                  height={50}
                />
                <Box>
                  <Skeleton
                    animation="wave"
                    style={{ height: "20px", width: "150px" }}
                  />
                  <Skeleton
                    animation="wave"
                    style={{ height: "20px", width: "150px" }}
                  />
                </Box>
              </Box>
            </div>
          ))}
        </Slider>
      </div>
    </Box>
  );
};

export default AirlinesSliderSkeleton;
