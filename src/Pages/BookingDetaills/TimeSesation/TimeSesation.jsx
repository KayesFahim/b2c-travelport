import { Box, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import reactSvg from "../../../utils/reactSvg";
import _TimimngIcons from "../../../asstes/img/timing.svg?react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useNavigate } from "react-router-dom";

const TimimngIcons = reactSvg(_TimimngIcons);
const MySwal = withReactContent(Swal);

const TimeSesation = (searchlimit) => {
  const [timeRemaining, setTimeRemaining] = useState(780);
  const navigate = useNavigate();

  useEffect(() => {
    if (timeRemaining <= 0) {
      MySwal.fire({
        title: "Your Session Time Is Expired",
        icon: "warning",
        confirmButtonText: "Search Again",
        confirmButtonColor: "var(--primary-color)",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/");
        }
      });
      return;
    }

    const intervalId = setInterval(() => {
      setTimeRemaining((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeRemaining]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  return (
    <Box sx={{ bgcolor: "#FFFFFF", py: "20px", px: "15px" }}>
      {searchlimit ? (
        <Box>
          {" "}
          <Typography
            sx={{
              fontSize: "16px",
              color: "var(--primary-button)",
              fontWeight: 600,
            }}
          >
            {formatTime(timeRemaining)}
          </Typography>{" "}
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Box>
            <Typography
              sx={{
                fontSize: "16px",
                color: "var(--primary-button)",
                fontWeight: 600,
              }}
            >
              Time Remaining {formatTime(timeRemaining)}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#71727C", pt: "5px" }}>
              For security reasons, your session will close automatically.
            </Typography>
          </Box>
          <Box>
            <TimimngIcons />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TimeSesation;
