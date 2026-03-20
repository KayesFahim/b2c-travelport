import React, { useRef } from "react";
import Slider from "react-slick";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import best1 from "../../asstes/img/tour/destinataino/best8.png";
import best2 from "../../asstes/img/tour/destinataino/best7.png";
import best3 from "../../asstes/img/tour/destinataino/best6.png";

const BlogMostread = () => {
  const sliderRef = useRef(null);

  const articles = [
    {
      title: "নিউ ইয়র্ক এর স্ট্যাচু অফ লিবার্টি ভ্রমণ",
      image: best1,
    },
    {
      title: "হোটেল বুকিং করার সহজ উপায়",
      image: best2,
    },
    {
      title: "চীন এর গাংঝু টাওয়ারে রাতের ভ্রমণ",
      image: best3,
    },
    {
      title: "নিউ ইয়র্ক এর স্ট্যাচু অফ লিবার্টি ভ্রমণ",
      image: best3,
    },
    {
      title: "হোটেল বুকিং করার সহজ উপায়",
      image: best2,
    },
    {
      title: "চীন এর গাংঝু টাওয়ারে রাতের ভ্রমণ",
      image: best1,
    },
  ];

  // Slick Slider Settings
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false, // Disable default arrows
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <Box sx={{ padding: 4, position: "relative" }}>
      {/* Title */}
      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontWeight: "bold", marginBottom: 2 }}
      >
        Most Reads
      </Typography>

      {/* Slick Slider */}
      <Box
        sx={{
          ".slick-slide": {
            // padding: "0 8px", // Adds gap between slides
          },
        }}
      >
        <Slider ref={sliderRef} {...settings}>
          {articles.map((article, index) => (
            <Box
              key={index}
              sx={{
                backgroundColor: "#fff",
                pl: 3,
              }}
            >
              {/* Image */}
              <Box
                sx={{
                //   position: "absolute",
                }}
              >
                <Box
                  component="img"
                  src={article.image}
                  alt={article.title}
                  sx={{
                    width: "100%",
                    height: "180px",
                    objectFit: "cover",
                    //   position:"absolute"
                  }}
                />
              </Box>

              {/* Title */}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: "bold",
                  fontSize: "1rem",
                  margin: "8px",
                  color: "#333",
                  position:"relative"
                }}
              >
                {article.title}
              </Typography>
            </Box>
          ))}
        </Slider>
      </Box>

      {/* Custom Navigation Arrows at the end */}
      <Box
        sx={{
          position: "absolute",
          top: "95%",
          right: " 5%",
          //   transform: "translateY(-50%)",
          display: "flex",
          //   flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => sliderRef.current.slickPrev()}
          sx={{
            backgroundColor: "#fff",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            "&:hover": { backgroundColor: "#f0f0f0" },
            pointerEvents: "all",
          }}
        >
          <ArrowBackIosIcon sx={{ fontSize: "10px" }} />
        </IconButton>
        <IconButton
          onClick={() => sliderRef.current.slickNext()}
          sx={{
            backgroundColor: "#fff",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            marginBottom: 1,
            "&:hover": { backgroundColor: "#f0f0f0" },
            pointerEvents: "all",
            mt: 1,
          }}
        >
          <ArrowForwardIosIcon sx={{ fontSize: "10px" }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default BlogMostread;
