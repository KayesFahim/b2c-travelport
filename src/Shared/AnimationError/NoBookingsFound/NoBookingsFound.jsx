import React from "react";
import { motion } from "motion/react";
import FlightIcon from "@mui/icons-material/Flight";
import NavBar from "../../NavBar/NavBar";
import { Box } from "@mui/material";

const NoBookingsFound = () => {
  return (
    <Box>
      <NavBar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "100px",
          color: "#555",
          height: "400px",
        }}
      >

        <div
          style={{
            position: "relative",
            width: "200px",
            height: "200px",
            border: "3px solid var(--primary-button)",
            borderRadius: "50%",
          }}
        >

          <motion.div
            style={{
              position: "absolute",
              width: "20px",
              height: "20px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "var(--primary-color)",
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 4,
              ease: "linear",
              repeat: Infinity,
            }}
          >
            <FlightIcon
              style={{ fontSize: "3rem", transform: "translate(100px, 0)" }}
            />
          </motion.div>


          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              fontWeight: "600",
              color: "#555",
            }}
          >
            No bookings found
          </div>
        </div>
      </div>
    </Box>
  );
};

export default NoBookingsFound;
