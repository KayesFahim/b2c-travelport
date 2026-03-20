import { Box, Container, Typography } from "@mui/material";
import React from "react";
import Slider from "react-slick";
import bestDestination1 from "../../../asstes/img/tour/destinataino/best1.png";
import bestDestination2 from "../../../asstes/img/tour/destinataino/best2.png";
import bestDestination3 from "../../../asstes/img/tour/destinataino/best3.png";
import bestDestination4 from "../../../asstes/img/tour/destinataino/best4.png";
import bestDestination5 from "../../../asstes/img/tour/destinataino/best5.png";
import bestDestination6 from "../../../asstes/img/tour/destinataino/best6.png";
import bestDestination7 from "../../../asstes/img/tour/destinataino/best7.png";
import bestDestination8 from "../../../asstes/img/tour/destinataino/best8.png";

const destinations = [
  { img: bestDestination1, name: "Singapore", price: "BDT 50,000" },
  { img: bestDestination2, name: "Thailand", price: "BDT 45,000" },
  { img: bestDestination3, name: "Malaysia", price: "BDT 40,000" },
  { img: bestDestination4, name: "Bali", price: "BDT 55,000" },
  { img: bestDestination5, name: "Maldives", price: "BDT 60,000" },
  { img: bestDestination6, name: "Dubai", price: "BDT 70,000" },
  { img: bestDestination7, name: "Paris", price: "BDT 80,000" },
  { img: bestDestination8, name: "London", price: "BDT 90,000" },
];

const TourBestDestination = () => {
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
    responsive: [
      {
        breakpoint: 1200, // For screens smaller than 1200px
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768, // For screens smaller than 768px
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <Box sx={{ my: "130px" }}>
      <Container>
        <Typography
          sx={{
            fontSize: "40px",
            // color: "var(--primary-text-color)"
          }}
        >
          Best Destinations
        </Typography>
        <Box sx={{ pt: "30px" }}>
          <Slider {...settings}>
            {destinations.map((destination, index) => (
              <Box key={index} sx={{ px: 0 }}>
                {" "}
                {/* Reduced padding from 2 to 1 */}
                <Box sx={{ position: "relative" }}>
                  <Box>
                    <img
                      src={destination.img}
                      alt={destination.name}
                      style={{ width: "95%", height: "auto" }} // Increased image size
                    />
                  </Box>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: "10%",
                      p: "0px 20px",
                      color: "var(--white)",
                    }}
                  >
                    <Typography sx={{ fontSize: "22px", fontWeight: 600 }}>
                      {" "}
                      {/* Increased font size from 18px to 20px */}
                      {destination.name}
                    </Typography>
                    <Typography
                      sx={{ fontSize: "13px", pt: "7px", display: "inline" }}
                    >
                      Starts From
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        fontWeight: 600,
                        pt: "5px",
                        display: "inline",
                        ml: "5px", // Add some spacing between the text
                        color: "var(--primary-color)", // Set font color to primary-color
                      }}
                    >
                      {destination.price}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Slider>
        </Box>
      </Container>
    </Box>
  );
};

const SampleNextArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <Box
      sx={{
        top: { xs: "300px", md: "360px", lg: "300px" }, // Adjust top position for md devices
      }}
      className={className}
      style={{
        ...style,
        display: "block",
        position: "absolute",
        bottom: "-10px", // Position at the bottom of the slider
        right: "10px", // Slightly offset from the right edge
        zIndex: 1,
        // top: "300px", // Default top position
      }}
      onClick={onClick}
    ></Box>
  );
};

const SamplePrevArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <Box
      sx={{
        left: { xs: "300px", md: "850px", lg: "1100px" }, // Slightly offset from the left edge
        top: { xs: "300px", md: "360px", lg: "300px" }, // Adjust top position for md devices
      }}
      className={className}
      style={{
        ...style,
        display: "block",
        position: "absolute",
        bottom: "0px", // Position at the bottom of the slider
        zIndex: 1,
      }}
      onClick={onClick}
    />
  );
};

export default TourBestDestination;
