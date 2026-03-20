import { Box, Button, Grid, Typography } from "@mui/material";
import React from "react";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupIcon from "@mui/icons-material/Group";
import { Link } from "react-router-dom";

const SingleTourPackage = ({ packageData }) => {
  const { introduction, mainImage, overView, accommodation, packageType } =
    packageData;
  console.log(packageData, "packageData");
  return (
    <Box
      sx={{
        background: "#FFFFFF",
        boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
        borderRadius: "10px",
        p: 1,
      }}
    >
      <Grid container alignItems="center" spacing={2}>
        {/* Image & Star Badge */}
        <Grid item xs={12} md={2.5}>
          <Box sx={{ position: "relative" }}>
            <Box
              component="img"
              src={
                mainImage?.[0]?.imageUrl || "https://via.placeholder.com/150"
              }
              alt="Tour Image"
              sx={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                borderRadius: "10px",
                bgcolor: "#E3EAF2",
              }}
            />
            {packageType === "stared" && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 2,
                  borderRadius: "50%",
                  width: 20, // Increased size
                  height: 20, // Increased size
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFD700", // Darker yellow color
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "white", fontWeight: "bold", fontSize: 15 }} // Darker yellow color
                >
                  ★
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Title, Location, Duration, Info */}
        <Grid item xs={12} md={6} ml={4}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ fontSize: "1.25rem" }}
          >
            {introduction?.mainTitle || "Tour Package"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <LocationOnIcon sx={{ fontSize: 18, color: "#9C9797" }} />
            <Typography variant="body2" color="text.secondary">
              {introduction?.journeyLocationCity &&
              introduction?.journeyLocationCountry
                ? `${introduction.journeyLocationCity}, ${introduction.journeyLocationCountry}`
                : "Location not available"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: "#9C9797" }} />
              <Typography variant="body2" color="text.secondary">
                {introduction?.journeyDuration || "Duration not available"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {accommodation?.nights || "0"} Nights
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <GroupIcon sx={{ fontSize: 18, color: "#9C9797" }} />
              <Typography variant="body2" color="text.secondary">
                {`Minimum ${introduction?.minimumPerson || "N/A"} Person`}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Price, Accommodation & Button */}
        <Grid item xs={12} md={2.5}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end", // Ensure alignment to the right
              height: "100%",
              justifyContent: "flex-end", // Align both price and button at the bottom
              gap: 1, // Add spacing between price and button
            }}
          >
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">
                Starting From
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: "1.5rem" }}
              >
                {introduction?.packagePrice || "N/A"}{" "}
                <span style={{ fontSize: "14px" }}>BDT</span>
              </Typography>
            </Box>
            <Link to="/tourdetails" state={{ packagedata: packageData }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#0D2955",
                  color: "#fff",
                  borderRadius: "8px",
                  textTransform: "none",
                  width: "150px", // Ensure consistent width
                  ":hover": {
                    bgcolor: "#0D2955",
                  },
                }}
              >
                View Details
              </Button>
            </Link>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SingleTourPackage;
