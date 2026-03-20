import React, { useEffect, useMemo, useState } from "react";
import Slider from "react-slick";
import { Box, Stack } from "@mui/material";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import commaNumber from "comma-number";

const AirlinesSlider = ({ uniqueCarriers, selectedAirlins, handleAirLine }) => {
  const carriers = Array.isArray(uniqueCarriers) ? uniqueCarriers : [];
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const resolveSlidesToShow = (width, count) => {
    const safeCount = Math.max(1, count || 0);
    if (width <= 480) return Math.min(2, safeCount);
    if (width <= 600) return Math.min(2, safeCount);
    if (width <= 1000) return Math.min(3, safeCount);
    if (width <= 1200) return Math.min(4, safeCount);
    return Math.min(4, safeCount);
  };

  const slidesToShow = useMemo(
    () => resolveSlidesToShow(viewportWidth, carriers.length),
    [viewportWidth, carriers.length]
  );
  const canSlide = carriers.length > slidesToShow;

  const formatCarrierPrice = (item) => {
    const priceText = commaNumber(Number(item?.price || 0));
    const currencyCode = String(item?.currencyCode || "").trim();
    const currencySymbol = String(item?.currencySymbol || "").trim();
    if (currencySymbol && currencyCode && currencySymbol !== currencyCode) {
      return `${currencySymbol}${priceText}`;
    }
    if (currencyCode) {
      return `${currencyCode} ${priceText}`;
    }
    return priceText;
  };
  const settings = {
    dots: false,
    infinite: canSlide,
    speed: 500,
    slidesToShow,
    slidesToScroll: 1,
    swipeToSlide: true,
    draggable: true,
    arrows: false,
    initialSlide: 0,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: Math.min(4, Math.max(1, carriers.length)),
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 1100,
        settings: {
          slidesToShow: Math.min(3, Math.max(1, carriers.length)),
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 1000,
        settings: {
          slidesToShow: Math.min(3, Math.max(1, carriers.length)),
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: Math.min(2, Math.max(1, carriers.length)),
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: Math.min(2, Math.max(1, carriers.length)),
          slidesToScroll: 1,
        },
      },
    ],
  };
  const sliderRef = React.useRef(null);

  useEffect(() => {
    if (!sliderRef.current) return;
    sliderRef.current.slickGoTo(0, true);
  }, [carriers.length, slidesToShow]);

  const goToNext = () => {
    sliderRef.current?.slickNext();
  };

  const goToPrev = () => {
    sliderRef.current?.slickPrev();
  };

  return (
    <Box
      className="airlines-slider"
      sx={{
        width: { xs: "90vw", sm: "90vw", md: "100%", lg: "100%" },
        button: {
          border: "none",
          outline: "none",
          backgroundColor: "var(--primary-color)",
          color: "var(--primary-button)",
          cursor: "pointer",
          borderRadius: "50%",
          height: "25px",
          width: "25px",
          margin: "auto",
          marginLeft: "5px",
          marginRight: { xs: "1px", md: "1px" },
          overflow: "hidden",
          paddingTop: "4px",
          "@media (max-width:600px)": {
            backgroundColor: "transparent",
          },
          "&:hover": {
            color: "var(--black)",
            backgroundColor: "var(--bgcolor)",
          },
        },
        ".slick-next": {
          display: "none !important",
        },
        ".slick-prev": {
          display: "none !important",
        },

        ".slick-track": {
          marginLeft: 0,
        },
        ".slick-slide > div": {
          margin: "1px 5px",
          width: "auto",
        },
        ".slick-list": {
          margin: "0px -10px",
        },
        px: 0,
        pb: .5,
      }}
      position="relative"
    >
      <Box
       
        sx={{
          background: "#FFFFFF",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
          borderRadius: "10px",
          px: "10px",
          overflow: "hidden",
        }}
      >
        <Slider
          key={`${carriers.length}-${slidesToShow}`}
          ref={sliderRef}
          {...settings}
        >
          {carriers.map((item, i) => {
            const isEven = i % 2 === 0;
            const boxColor = isEven ? "even-color" : "odd-color";
            const inputId = `airline-slider-${String(item.code || i)}`;
            return (
              <Box
                key={String(item.code || i)}
                sx={{ borderRadius: "6px" }}
                className={`${boxColor}`}
              >
                <input
                  type="checkbox"
                  id={inputId}
                  checked={selectedAirlins.includes(item.code)}
                  onChange={() => handleAirLine(item.code)}
                  style={{
                    position: "absolute",
                    zIndex: "-1",
                    visibility: "hidden",
                  }}
                />
                <label htmlFor={inputId}>
                  <div>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          zIndex: 2,
                          cursor: "pointer",
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: "6px",
                          p: 1,
                          backgroundColor: selectedAirlins.includes(item.code)
                            ? "var(--primary-color)"
                            : "initial",
                          color: selectedAirlins.includes(item.code)
                            ? "var(--white)"
                            : "var(--secondary-color)",
                        }}
                      >
                        <Box
                          sx={{
                            fontSize: { xs: 11, md: 14 },
                          }}
                        >
                          {item.code}
                        </Box>
                        <Box sx={{ width: "25px" }}>
                          <img
                            src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${item.code}.png`}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              border: "1px solid var(--text-color)",
                              borderRadius: "50%",
                              padding: "2px",
                            }}
                          />
                        </Box>
                        <Stack direction="column">
                          <Box
                            sx={{
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            {formatCarrierPrice(item)}
                          </Box>
                        </Stack>
                        </Stack>
                  </div>
                </label>
              </Box>
            );
          })}
        </Slider>
      </Box>
      <Box
        sx={{
          position: "absolute",
          left: { xs: -2, md: -1 },
          top: "50%",
          transform: "translateY(-50%)",
          display: canSlide ? "flex" : "none",
          height: "100%",
        }}
      >
        <button onClick={goToPrev} aria-label="Previous airlines">
          <ArrowForwardIosRoundedIcon
            sx={{ transform: "rotate(180deg)", fontSize: 16, py: 0.1 }}
          />
        </button>
      </Box>
      <Box
        sx={{
          position: "absolute",
          right: { xs: -3, md: -2 },
          top: "50%",
          transform: "translateY(-50%)",
          display: canSlide ? "flex" : "none",
          height: "100%",
        }}
      >
        <button onClick={goToNext} aria-label="Next airlines">
          <ArrowForwardIosRoundedIcon sx={{ fontSize: 16, py: 0.1 }} />
        </button>
      </Box>
    </Box>
    // <Box
    //   sx={{
    //     background: "#FFFFFF",
    //     boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
    //     borderRadius: "10px",
    //     px: "30px",
    //     overflow: "hidden",
    //   }}
    // >
    //   <div className="slider-container">
    //     <Slider {...settings}>
    //       {airlineNames?.map((flight, index) => (
    //         <div key={index}>
    //           <Box
    //             sx={{
    //               display: "flex",
    //               alignItems: "center",
    //               msLineBreak: "30px",
    //               // width: "90%",
    //               p: "5px",
    //               // mx: "30px",
    //               gap: "10px",
    //               ":hover": {
    //                 background: "#FFE9BD",
    //                 cursor: "pointer",
    //                 width: "100%",
    //               },
    //             }}
    //             onClick={() => onAirlineClick(flight?.career)}
    //           >
    //             <img
    //               src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${flight?.career}.png`}
    //               alt={flight?.careerName}
    //               style={{ width: "40px", height: "40px" }}
    //             />
    //             <Box>
    //               <Typography sx={{ color: "#B6B6CC", fontSize: "12px" }}>
    //                 {flight?.career}
    //               </Typography>
    //               <Typography sx={{ color: "#3C4258", fontSize: "15px" }}>
    //                 ৳ {flight?.clientPrice}
    //               </Typography>
    //             </Box>
    //           </Box>
    //         </div>
    //       ))}
    //     </Slider>
    //   </div>
    // </Box>
  );
};

export default AirlinesSlider;
