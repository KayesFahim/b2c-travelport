import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Pagination,
  Drawer,
  IconButton,
  Slider,
  Checkbox,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import AfterSearchBanner from "../../AfterSearch/AfterSearchBanner";
import TourAfterSearchBanner from "../TourAfterSearchBanner/TourAfterSearchBanner";
import TourFilter from "../TourFliter/TourFilter";
import SingleTourPack from "../SingleTourPack/SingleTourPack";
import NavBar from "../../../Shared/NavBar/NavBar";
import bgimage from "../../../asstes/img/tour/subBanner.png";
import SingleTourPackage from "../SingleTourPack/SingleTourPackage";
import { useLocation } from "react-router-dom";
import filter1 from "../../../asstes/img/tour/TourFilter/Asset 15left.png";
import filter2 from "../../../asstes/img/tour/TourFilter/Asset 16left.png";
import filter3 from "../../../asstes/img/tour/TourFilter/Asset 17left.png";
import filter4 from "../../../asstes/img/tour/TourFilter/Asset 18left.png";
import FilterAltIcon from "@mui/icons-material/FilterAlt"; // Import filter icon
import CloseIcon from "@mui/icons-material/Close";

const TourSearchResultNew = () => {
  const location = useLocation();
  const searchResult = location.state?.searchResult; // Ensure searchResult is always an array
  const searchParams = location.state?.searchParams || {}; // Extract search parameters
  console.log("Search Result in TourSearchResultNew:", searchResult); // Debug log
  console.log("Search Parameters in TourSearchResultNew:", searchParams); // Debug log
  const [tourPackages, setTourPackages] = useState(searchResult);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = (open) => () => {
    setIsDrawerOpen(open);
  };

  useEffect(() => {
    if (searchResult.length > 0) {
      setTourPackages(searchResult);
      setTotalPages(Math.ceil(searchResult.length / 10)); // Example pagination logic
    }
  }, [searchResult]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };
  const [pricevalue, setPriceValue] = useState([20, 37]);
  const [checked, setChecked] = useState(true);
  // const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleChange = (event, newValue) => {
    setPriceValue(newValue);
  };

  const handleChanges = (event) => {
    setChecked(event.target.checked);
  };

  return (
    <Box>
      <NavBar />
      <Box
        sx={{
          backgroundImage: `url(${bgimage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          height: "180px",
        }}
      />

      <Container>
        {/* Drawer for Filter */}
        <Drawer
          anchor="right"
          open={isDrawerOpen}
          onClose={toggleDrawer(false)}
        >
          <Box sx={{ width: 300, p: 2 }}>
            <TourFilter />
          </Box>
        </Drawer>

        {/* Destination Header Section */}
        <Box
          sx={{
            position: "relative",
            top: "-50px", // Further adjusted to remove the gap
            display: "flex",
            justifyContent: "center",
            marginBottom: 0, // Ensure no extra margin
          }}
        >
          <Box
            sx={{
              backgroundColor: "white",
              borderRadius: "10px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
              px: 3,
              py: 2,
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" color="textSecondary">
                Destination / Tour Package
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {tourPackages.length > 0
                  ? `${searchParams.city}, ${searchParams.country}` // Display city and country
                  : "No Results Found"}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              sx={{
                backgroundColor: "var(--card-bg)",
                color: "black",
                borderRadius: "8px",
                height: "50px",
                fontWeight: "bold",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "var(--border)",
                },
              }}
            >
              Modify Search
            </Button>
          </Box>
        </Box>

        {/* Main Grid */}
        <Grid container sx={{ mt: "-50px" }} spacing={2}>
          {" "}
          {/* Adjusted margin-top to overlap */}
          <Grid item xs={12} sm={12} md={2.4} lg={2.5}>
            <Box
              sx={{
                bgcolor: "white",
                boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
                height: "100%",
                borderRadius: "10px",
              }}
            >
              <TourFilter />
            </Box>
          </Grid>
          <Grid item xs={12} sm={12} md={9.5}>
            <Grid container>
              <Grid item md={12}>
                {/* Category Filter Row */}
                <Grid
                  container
                  spacing={{ xs: 3, sm: 2 }}
                  sx={{
                    mb: { xs: 4, md: 2 },
                    // overflowX: { xs: "auto", sm: "unset" },
                    // flexWrap: { xs: "nowrap", sm: "wrap" },
                  }}
                >
                  {[
                    { label: "Outdoor & Adventure Activities", icon: filter1 },
                    { label: "City Tours & Sightseeing", icon: filter2 },
                    { label: "Getaway & Leisure Packages", icon: filter3 },
                    { label: "Extreme & Sports Adventures", icon: filter4 },
                  ].map((item, index) => (
                    <Grid
                      item
                      xs={6}
                      sm={6}
                      md={3}
                      key={index}
                      sx={{
                        display: "inline-block",
                        width: { xs: "auto", sm: "100%" },
                        height: { xs: 40, sm: 60 },
                        // minWidth: { xs: 180, sm: "unset" }, // Ensure horizontal scroll on mobile
                        // flex: { xs: "0 0 auto", sm: "1 1 0%" },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: { xs: 2, md: 2 },
                          py: 1,
                          bgcolor: "white",
                          borderRadius: "10px",
                          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          height: "100%", // Make Box fill the Grid item height
                          "&:hover": {
                            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={item.icon}
                          alt={item.label}
                          sx={{
                            width: { xs: "20px", sm: "30px" },
                            height: { xs: "20px", sm: "30px" },
                          }}
                        />
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ fontSize: { xs: "0.5rem", sm: "0.75rem" } }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                  {/* Sticky Filter Button for mobile */}
                  <Box
                    sx={{
                      display: { xs: "flex", sm: "none" },
                      position: "fixed",
                      bottom: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "100px",
                      zIndex: 1101, // above Drawer
                      p: 2,
                      justifyContent: "center",
                      // background: "rgba(255,255,255,0.95)",
                      // boxShadow: "0px -2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={toggleDrawer(true)}
                      sx={{
                        backgroundColor: "var(--primary-color)",
                        color: "var(--primary-button)",
                        textTransform: "none",
                        fontWeight: "bold",
                        width: "100%",
                        height: 50,
                        fontSize: "12px",
                        display: "flex",
                        // flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        px:.5
                      }}
                    >
                      <FilterAltIcon sx={{ fontSize: "20px", mb: 0.5 }} />
                      Filter
                    </Button>
                  </Box>
                  {/* End Sticky Filter Button */}
                  {/* Hide original filter button on xs */}
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={3}
                    sx={{
                      display: { xs: "none", sm: "inline-block" },
                      width: { xs: "100%", sm: "100%" },
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={toggleDrawer(true)}
                      sx={{
                        backgroundColor: "white",
                        color: "var(--primary-button)",
                        textTransform: "none",
                        fontWeight: "bold",
                        width: "100%",
                        height: { xs: 50 },
                        fontSize: "12px",
                        display: { xs: "flex", sm: "none" }, // Only show on xs devices
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        mt: 2,
                      }}
                    >
                      <FilterAltIcon sx={{ fontSize: "20px", mb: 0.5 }} />{" "}
                      {/* Add filter icon */}
                      Filter
                    </Button>
                  </Grid>
                  {/* Drawer for Filter */}
                  <Drawer
                    anchor="right"
                    open={isDrawerOpen}
                    onClose={toggleDrawer(false)}
                  >
                    <Box sx={{ width: 300, p: 2,zIndex: 1200 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          Filters
                        </Typography>
                        <IconButton onClick={toggleDrawer(false)}>
                          <CloseIcon />
                        </IconButton>
                      </Box>
                      {/* Filter Content */}
                      <Box sx={{ p: "10px 15px" }}>
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
                            sx={{
                              fontSize: "14px",
                              color: "#63686D",
                              cursor: "pointer",
                            }}
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
                            sx={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#3D3A49",
                            }}
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
                            options: [
                              "Included Transport",
                              "Pickup & Drop-off Available",
                            ],
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
                                  sx={{
                                    fontSize: "13px",
                                    color: "var(--filter-color)",
                                  }}
                                >
                                  {option}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Drawer>
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                {tourPackages.map((packageData, index) => (
                  <Grid item xs={12} key={index}>
                    <SingleTourPackage packageData={packageData} />
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TourSearchResultNew;
