import { Box } from "@mui/material";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import Banner from "./Banner";
import NavBar from "../../Shared/NavBar/NavBar";
import DiscountSlider from "./DiscountSlider";
import HotDeals from "../HotDeals/HotDeals";
import TopDestination from "./TopDestination";
import PartnerAirlines from "../../Shared/PartnerAirlines/PartnerAirlines";
import sliderData from "../../data/sliderData.json";

const Home = () => {
  const [selectedTab, setSelectedTab] = useState("flight");
  const [data, setData] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (!verified) return;
    // Remove the query param so refresh won't re-trigger the alert
    setSearchParams({}, { replace: true });
    if (verified === "success") {
      Swal.fire({
        icon: "success",
        title: "Email Verified!",
        text: "Your email has been successfully verified. You can now log in.",
        confirmButtonText: "Log In",
        confirmButtonColor: "#0ea5e9",
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Link Expired",
        text: "This verification link is invalid or has already been used. Please sign up again or request a new link.",
        confirmButtonText: "OK",
        confirmButtonColor: "#0ea5e9",
      });
    }
  }, []);

  useEffect(() => {
    fetch(`/api/homepage`)
      .then((response) => {
        if (!response.ok) throw new Error('API error');
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error('API returned non-JSON response');
        }
        return response.json();
      })
      .then((data) => setData(data))
      .catch((error) => {
        console.error("Error fetching data, using fallback:", error);
        setData(sliderData); // Use fallback data on error
      });
  }, []);

  const handleTabChange = (newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Box className="relative">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,163,224,0.20),_rgba(0,59,113,0)_70%)]" />
      <NavBar />
      <Banner onTabChange={handleTabChange} data={data || sliderData} />

      {selectedTab === "flight" && (
        <div className="relative space-y-1 pb-3">
          <DiscountSlider data={data || sliderData} />
          <TopDestination />
          <HotDeals />
          <PartnerAirlines />
        </div>
      )}
    </Box>
  );
};

export default Home;
