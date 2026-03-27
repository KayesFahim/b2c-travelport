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
import { getHomepageData, getHomepageFallbackData } from "../../utils/homepageApi";

const Home = () => {
  const [selectedTab, setSelectedTab] = useState("flight");
  const [data, setData] = useState(() => getHomepageFallbackData());
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
    let isMounted = true;
    getHomepageData()
      .then((payload) => {
        if (!isMounted) return;
        setData(payload);
      })
      .catch((error) => {
        console.error("Error fetching data, using fallback:", error);
        if (isMounted) {
          setData(getHomepageFallbackData());
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Box className="travelport-page travelport-home-page relative">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,163,224,0.20),_rgba(0,59,113,0)_70%)]" />
      <NavBar />
      <Banner onTabChange={handleTabChange} data={data} />

      {selectedTab === "flight" && (
        <div className="relative space-y-1 pb-4 md:pb-6">
          <DiscountSlider data={data} />
          <TopDestination />
          <HotDeals />
          <PartnerAirlines />
        </div>
      )}
    </Box>
  );
};

export default Home;
