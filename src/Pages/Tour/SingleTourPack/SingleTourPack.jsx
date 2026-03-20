import { Box, Button, Grid, Typography } from "@mui/material";
import React from "react";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupIcon from "@mui/icons-material/Group";
import { Link } from "react-router-dom";

const SingleTourPack = ({ packageData }) => {
  const { introduction, mainImage, overView, accommodation, packageId } =
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
              src={mainImage?.[0]?.imageUrl || ""}
              alt="Tour Image"
              sx={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                borderRadius: "10px",
                bgcolor: "#E3EAF2",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                backgroundColor: "#FFD361",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⭐
            </Box>
          </Box>
        </Grid>

        {/* Title, Location, Duration, Info */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ fontSize: { xs: "12px", md: "inherit" } }} // Further reduced font size for xs
          >
            {introduction?.mainTitle || "Tour Package"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <LocationOnIcon
              sx={{ fontSize: { xs: 12, md: 18 }, color: "#9C9797" }}
            />{" "}
            {/* Further reduced icon size */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "8px", md: "inherit" } }} // Further reduced font size for xs
            >
              {introduction?.journeyLocation
                ?.map((loc) => `${loc.city}, ${loc.country}`)
                .join(" | ") || "Location not available"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <AccessTimeIcon
                sx={{ fontSize: { xs: 12, md: 18 }, color: "#9C9797" }}
              />{" "}
              {/* Further reduced icon size */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "8px", md: "inherit" } }} // Further reduced font size for xs
              >
                {introduction?.journeyDuration || "Duration not available"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <GroupIcon
                sx={{ fontSize: { xs: 12, md: 18 }, color: "#9C9797" }}
              />{" "}
              {/* Further reduced icon size */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "8px", md: "inherit" } }} // Further reduced font size for xs
              >
                {`Minimum ${introduction?.minimumAge || "N/A"} Age`}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Price & Button */}
        <Grid item xs={12} md={2.5}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textAlign: "right",
                  fontSize: { xs: "6px", md: "inherit" },
                }} // Further reduced font size for xs
              >
                Starting From
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: { xs: "14px", md: "inherit" } }} // Further reduced font size for xs
              >
                {introduction?.packagePrice || "N/A"}{" "}
                <span style={{ fontSize: "8px" }}>BDT</span>{" "}
                {/* Further reduced inline font size */}
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
                  mt: 1,
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

export default SingleTourPack;
