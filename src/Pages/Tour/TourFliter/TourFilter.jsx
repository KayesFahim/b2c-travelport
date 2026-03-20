import {
  Box,
  Checkbox,
  Slider,
  Typography,
  Button,
  IconButton,
  Drawer,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import React, { useState } from "react";

const TourFilter = () => {
  const [pricevalue, setPriceValue] = useState([20, 37]);
  const [checked, setChecked] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleChange = (event, newValue) => {
    setPriceValue(newValue);
  };

  const handleChanges = (event) => {
    setChecked(event.target.checked);
  };

  const toggleDrawer = (open) => () => {
    setIsDrawerOpen(open);
  };

  return (
    <Box>
      

      {/* Filter Content for larger devices */}
      <Box sx={{ display: { xs: "none", sm: "block" }, p: "10px 15px" }}>
        {/* Header */}
        <Box
          sx={{
            borderBottom: "1px solid #D9D9D9",
            pb: "5px",
            mb: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#3D3A49",
              textAlign: "center",
            }}
          >
            20 Results Found
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: "5px",
            mb: 1,
          }}
        >
          <Typography
            sx={{ fontSize: "14px", color: "#63686D", cursor: "pointer" }}
          >
            Filter
          </Typography>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset
          </Typography>
        </Box>

        {/* Price Range */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{ fontSize: "14px", fontWeight: 600, color: "#3D3A49" }}
          >
            Price Range
          </Typography>
          <Box sx={{ pt: 1 }}>
            <Slider
              style={{ color: "var(--primary-color)" }}
              value={pricevalue}
              onChange={handleChange}
              valueLabelDisplay="auto"
              min={5000}
              max={50000}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                color: "#3D3A49",
                fontWeight: 500,
              }}
            >
              <Typography>৳ 5000</Typography>
              <Typography>৳ 50,000</Typography>
            </Box>
          </Box>
        </Box>

        {/* Reusable filter section */}
        {[
          {
            title: "Tour type",
            options: [
              "Private",
              "Group Tour",
              "Self-Guided",
              "Budget Tour",
              "Luxury",
            ],
          },
          {
            title: "Meal Plan",
            options: [
              "Breakfast only",
              "Half Board",
              "Half Food Available",
              "All-Inclusive",
            ],
          },
          {
            title: "Activities & Experiences",
            options: ["Adventure", "Cultural", "Relaxation"],
          },
          {
            title: "Transportation",
            options: ["Included Transport", "Pickup & Drop-off Available"],
          },
          {
            title: "Group Size & Age",
            options: [
              "Solo Traveler",
              "Couple-friendly",
              "Family-friendly",
              "Children-friendly",
              "Women-friendly",
              "Small Group (2 - 10)",
              "Large Group (10 - 100)",
            ],
          },
        ].map((section, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--filter-text-color)",
                mb: 1,
              }}
            >
              {section.title}
            </Typography>
            {section.options.map((option, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  mb: 1,
                }}
              >
                <Checkbox
                  size="small"
                  style={{
                    color: "var(--primary-button)",
                  }}
                  checked={checked}
                  onChange={handleChanges}
                  sx={{
                    "&.Mui-checked": {
                      color: "gray",
                      "& .MuiSvgIcon-root": {
                        color: "gray",
                        borderRadius: "50%",
                      },
                    },
                  }}
                  inputProps={{ "aria-label": option }}
                />
                <Typography
                  sx={{ fontSize: "13px", color: "var(--filter-color)" }}
                >
                  {option}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TourFilter;
