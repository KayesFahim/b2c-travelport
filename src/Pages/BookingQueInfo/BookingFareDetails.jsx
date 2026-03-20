import { Box } from "@mui/material";
import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import commaNumber from "comma-number";

const BookingFareDetails = ({ quesData }) => {
  console.log("Ques",quesData)
  return (
    <Box>
      <Box sx={{ bgcolor: "#ED1C24", borderRadius: "3px" }}>
        <Typography
          sx={{
            fontSize: "12px",
            color: "white",
            py: 1,
            px: "20px",
            fontWeight: 600,
          }}
        >
          Fare Details
        </Typography>
      </Box>
      <Box
        sx={{
          bgcolor: "white",
          // p: "12px",
          px: {xs:"10px",md:"13px",lg:"16px"},
          py: "20px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
          }}
        >
          <Typography
            sx={{ color: "var(--black-daimond)", fontSize: "12px", py: "5px" }}
          >
            Payable Amount
          </Typography>
          <Typography
            sx={{
              color: "var(--black-daimond)",
              fontSize: { xs: "16px", lg: "20px" },
              fontWeight: 600,
              // py: "5px",
            }}
          >
            {commaNumber(quesData[0]?.NetFare)}৳
          </Typography>
        </Box>
        <Box sx={{ bgcolor: "#D9D9D9", my: "20px" }}>
          <Typography
            sx={{
              fontSize: "12px",
              color: "#2D669B",
              px: "10px",
              py: "3px",
              fontWeight: 600,
            }}
          >
            Price Breakdown
          </Typography>
        </Box>
        {quesData[0]?.PriceBreakDown?.map((item, index) => (
          <Box key={index} sx={{ marginBottom: "16px" }}>
            <Typography
              // variant="h6"
              component="div"
              sx={{ fontWeight: "bold", fontSize: { xs: "16px" } }}
            >
              {item?.PaxType} x {item?.PaxCount}
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "12px",
                }}
                color="textSecondary"
              >
                Base Fare x {item?.PaxCount}
              </Typography>
              <Typography
                sx={{ color: "var(--primary-button)", fontSize: "12px" }}
              >
                {item?.BaseFare?.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: "12px",
                }}
                color="textSecondary"
              >
                Tax x {item?.PaxCount}
              </Typography>
              <Typography
                sx={{ color: "var(--primary-button)", fontSize: "12px" }}
              >
                {item?.Taxes.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        ))}
        <Box 
        // sx={{ marginBottom: "16px" }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography sx={{
              fontSize: "12px",
            }} color="textSecondary">
              Total Base & Tax
            </Typography>
            <Typography  sx={{ color: "var(--primary-button)",fontSize: "12px", }}>
              {(
                quesData[0]?.BaseFare +
                quesData[0]?.Taxes +
                quesData[0]?.SerViceFee
              )?.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        <Box 
        sx={{ 
          marginBottom: "16px" 
          
        }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography 
            sx={{
              fontSize: "12px",
            }}
            color="textSecondary">
              Discount
            </Typography>
            <Typography  sx={{ color: "var(--primary-button)",fontSize: "12px", }}>
              {commaNumber(quesData[0]?.GrossFare - quesData[0]?.NetFare)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ marginBottom: "16px" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography sx={{
              fontSize: "12px",
            }} color="textSecondary">
              Customer Invoice Total
            </Typography>
            <Typography  sx={{ color: "var(--primary-button)",fontSize: "12px", }}>
              {commaNumber(quesData[0]?.NetFare)}৳
            </Typography>
          </Box>
        </Box>
        {/* <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Agent Invoice Total
            </Typography>
            <Typography variant="body2" sx={{ color: "#13406B" }}>
              {total.toLocaleString()}
            </Typography>
          </Box>
        </Box> */}
      </Box>
    </Box>
  );
};

export default BookingFareDetails;
