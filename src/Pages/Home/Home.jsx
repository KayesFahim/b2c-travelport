import { Box } from "@mui/material";
import React, { useState, useEffect } from "react";
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
