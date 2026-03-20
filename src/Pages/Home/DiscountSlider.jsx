import { Box, Container } from "@mui/material";
import React, { useEffect, useState } from "react";
import Slider from "react-slick";

// Unsplash placeholder images for flights/travel
const UNSPLASH_IMAGES_DESKTOP = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&h=700&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&h=700&fit=crop",
  "https://images.unsplash.com/photo-1500382017468-f049863256fe?w=1400&h=700&fit=crop",
  "https://images.unsplash.com/photo-1434725039859-f7d4570e60d5?w=1400&h=700&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&h=700&fit=crop",
];

const UNSPLASH_IMAGES_MOBILE = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&h=900&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&h=900&fit=crop",
  "https://images.unsplash.com/photo-1500382017468-f049863256fe?w=900&h=900&fit=crop",
  "https://images.unsplash.com/photo-1434725039859-f7d4570e60d5?w=900&h=900&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=900&fit=crop",
];

const DiscountSlider = ({ data }) => {
  const [images, setImages] = useState(UNSPLASH_IMAGES_DESKTOP);
  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

  useEffect(() => {
    setImages(isMobile ? UNSPLASH_IMAGES_MOBILE : UNSPLASH_IMAGES_DESKTOP);
  }, [isMobile, data]);

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
        pt: 10,
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      <Container>
        <div className="slider-container">
          <Slider {...settings} style={{ position: "relative", zIndex: 1 }}>
            {images.map((image, index) => (
              <div key={index}>
                <Box
                  sx={{
                    height: {
                      xs: "100%",
                      sm: "100%",
                      md: "245px",
                      lg: "245px",
                    },
                  }}
                >
                  <img
                    src={image}
                    onError={(e) => {
                      const fallbackImages = isMobile
                        ? UNSPLASH_IMAGES_MOBILE
                        : UNSPLASH_IMAGES_DESKTOP;
                      const randomIndex = Math.floor(
                        Math.random() * fallbackImages.length
                      );
                      e.currentTarget.src = fallbackImages[randomIndex];
                    }}
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: "10px !important",
                      objectFit: "cover",
                    }}
                    alt="Travel deal"
                  />
                </Box>
              </div>
            ))}
          </Slider>
        </div>
      </Container>
    </Box>
  );
};

export default DiscountSlider;
