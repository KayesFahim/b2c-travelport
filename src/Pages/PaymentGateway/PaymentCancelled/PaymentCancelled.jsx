import React from "react";
import NavBar from "../../../Shared/NavBar/NavBar";
import { Box, Button, Container, Typography } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import { Link } from "react-router-dom";

const PaymentCancelled = () => {
  return (
    <Box>
      <NavBar />
      <Container
        sx={{
          boxShadow: "rgba(17, 12, 46, 0.15) 0px 48px 100px 0px",
          background: "white",
          height: "600px",
          borderRadius: "5px",
          my: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box>
          <CancelIcon
            sx={{
              border: "3px solid var(--primary-button)",
              borderRadius: "50%",
              height: "170px",
              width: "170px",
              color: "red",
            }}
          />

          <Box sx={{ my: "10px" }}>
            <Typography sx={{ fontSize: "22px", color: "#4B5865" }}>
              Payment Cancelled
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#818A93", my: "5px" }}>
              Your payment has been cancelled.
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Link style={{ textDecoration: "none" }} to="/">
              <Button
                sx={{
                  bgcolor: "var(--primary-button)",
                  color: "white",
                  width: "150px",
                  ":hover": {
                    bgcolor: "var(--primary-button)",
                    color: "white",
                  },
                }}
              >
                Home
              </Button>
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PaymentCancelled;
