import React from "react";
import bannerImge from "../../../asstes/img/HomeImage/subBanner.png";
import { Box, Container, Typography } from "@mui/material";
import { useState } from "react";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import { addDays, format } from "date-fns";
import { useRef } from "react";
import { useLocation } from "react-router-dom";
import NavBar from "../../../Shared/NavBar/NavBar";
import FlightSearchBox from "../../HomeSearchBox/FlightSearchBox";
import TourSearchBox from "../TourHome/TourSearchBox";

const TourAfterSearchBanner = () => {
  const banner = {
    background: `url(${bannerImge})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    height: "400px",
  };
  const location = useLocation();

  const [value, setValue] = useState("tour");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  //todo: state for retrigger useEffect
  const [changeState, setChangeState] = useState(null);
  //todo: End for retrigger useEffect

  //todo: state for from date change
  const [changeFrom, setChangeFrom] = useState(false);
  const [changeTo, setChangeTo] = useState(false);
  //todo: End state for from date change

  const [type, setType] = useState("tour");
  const [fromSearchText, setFromSearchText] = useState(
    "Hazrat Shahjalal Intl Airport (DAC)"
  );
  const [toSearchText, setToSearchText] = useState("Cox's Bazar Airport(CXB)");

  const [departureDate, setDepartureDate] = useState(
    format(addDays(new Date(), 1), "dd MMM yy")
  );
  const [returningDate, setReturningDate] = useState(
    format(addDays(new Date(departureDate), 3), "dd MMM yy")
  );
  const [travelDate, setTravelDate] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 3),
      key: "selection",
    },
  ]);
  // for multiCity
  const now = useRef(new Date());
  const [from, setFrom] = useState(addDays(now.current, 1));
  const [to, setTo] = useState(addDays(now.current, 3));

  const [faddress, setfaddress] = useState("Dhaka,BANGLADESH");
  const [toAddress, setToAddress] = useState("Cox's Bazar,Bangladesh");
  const [fromSendData, setFromSendData] = useState("DAC");
  const [toSendData, setToSendData] = useState("CXB");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infant, setInfant] = useState(0);
  const [result, setResult] = useState(1);
  const [className, setClassName] = useState("Economy");

  const handleTypeChange = (event, newValue) => {
    setType(newValue);
  };
  const handleClassName = (event, newValue) => {
    setClassName(newValue);
  };

  const [searchData, setSearchData] = useState({
    adultCount: adultCount,
    childCount: childCount,
    infantCount: infant,
    CityCount: 2,
    segments: [
      {
        id: 0,
        openFrom: false,
        DepFrom: fromSendData.trim(),
        depFromText: fromSearchText,
        ArrTo: toSendData.trim(),
        arrToText: toSearchText,
        openTo: false,
        Date: new Date().toLocaleDateString("sv"),
        openDate: false,
        open: false,
      },
      {
        id: 1,
        openFrom: false,
        DepFrom: toSendData.trim(),
        depFromText: toSearchText,
        ArrTo: "DXB",
        arrToText: "Dubai Intl Airport (DXB)",
        openTo: false,
        Date: new Date().toLocaleDateString("sv"),
        openDate: false,
        open: false,
      },
    ],
  });
  return (
    <Box style={banner}>
      <NavBar />
      <Container>
        <TabContext value={value}>
          <Box sx={{ pt: "20px" }}>
            <TabList
              onChange={handleChange}
              aria-label="lab API tabs example"
              indicatorColor="none"
            >
              <Tab
                label="Flight"
                value="flight"
                sx={{
                  textTransform: "Capitalize",
                  color: "var(--white)",
                  opacity: "1",
                  width: "0%",
                  "&.MuiTab-root.Mui-selected": {
                    border: "1px solid var(--button-color)",
                    color: "var(--button-color)",
                    borderRadius: "30px",
                    opacity: "1",
                    width: { lg: "110px", xs: "fit-content" },
                    minHeight: "40px",
                  },
                  fontSize: { xs: "8px", sm: "10px", md: "14px" },
                  fontWeight: 600,
                }}
              />
              <Tab
                label="Hotel"
                value="hotel"
                style={{ marginLeft: "5px" }}
                sx={{
                  textTransform: "Capitalize",
                  color: "var(--white)",
                  opacity: "1",
                  borderRadius: "5px",
                  "&.MuiTab-root.Mui-selected": {
                    border: "1px solid var(--button-color)",
                    color: "var(--button-color)",
                    borderRadius: "30px",
                    opacity: "1",
                  },
                  width: { lg: "110px", xs: "fit-content" },
                  minHeight: "45px",
                  fontWeight: 600,
                  margin: { xs: "0px 0px" },
                  fontSize: { xs: "8px", sm: "10px", md: "14px" },
                }}
              />
              <Tab
                label="Airport Taxi"
                value="airportTaxi"
                style={{ marginLeft: "5px" }}
                sx={{
                  textTransform: "Capitalize",
                  "&.MuiTab-root.Mui-selected": {
                    border: "1px solid var(--button-color)",
                    color: "var(--button-color)",
                    borderRadius: "30px",
                    opacity: "1",
                  },
                  color: "var(--white)",
                  opacity: "1",
                  borderRadius: "5px",
                  width: { lg: "120px", xs: "fit-content" },
                  fontWeight: 600,
                  minHeight: "45px",
                  margin: { xs: "0px 0px" },
                  fontSize: { xs: "8px", sm: "10px", md: "14px" },
                }}
              />
              <Tab
                label="Tour"
                value="tour"
                style={{ marginLeft: "5px" }}
                sx={{
                  textTransform: "Capitalize",
                  "&.MuiTab-root.Mui-selected": {
                    border: "1px solid var(--button-color)",
                    color: "var(--button-color)",
                    borderRadius: "30px",
                    opacity: "1",
                  },
                  fontWeight: 600,
                  color: "var(--white)",
                  opacity: "1",
                  borderRadius: "5px",
                  width: { lg: "100px", xs: "fit-content" },
                  minHeight: "30px",
                  margin: { xs: "0px 0px" },
                  fontSize: { xs: "8px", sm: "10px", md: "14px" },
                }}
              />
            </TabList>
          </Box>

          <Box sx={{ py: "50px" }}>
            <Typography
              sx={{
                color: "var(--white)",
                fontWeight: 600,
                fontSize: "40px",
              }}
            >
              Where to next, Mr. XYZ
            </Typography>
            <Typography
              sx={{
                color: "var(--white)",
                fontWeight: 500,
                fontSize: "18px",
              }}
            >
              Finds Exclusive rewards in every corner of the world
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: "var(--white)",
              border: "1px solid var(--button-color)",
              borderRadius: "5px",
              padding: "10px 20px",
            }}
          >
            <TabPanel value="flight" sx={{ padding: "0px" }}>
              <FlightSearchBox
                type={type}
                setType={setType}
                value={value}
                setValue={setValue}
                fromSearchText={fromSearchText}
                setFromSearchText={setFromSearchText}
                toSearchText={toSearchText}
                setToSearchText={setToSearchText}
                departureDate={departureDate}
                setDepartureDate={setDepartureDate}
                returningDate={returningDate}
                setReturningDate={setReturningDate}
                travelDate={travelDate}
                setTravelDate={setTravelDate}
                from={from}
                setFrom={setFrom}
                to={to}
                setTo={setTo}
                faddress={faddress}
                setfaddress={setfaddress}
                toAddress={toAddress}
                setToAddress={setToAddress}
                fromSendData={fromSendData}
                setFromSendData={setFromSendData}
                toSendData={toSendData}
                setToSendData={setToSendData}
                adultCount={adultCount}
                setAdultCount={setAdultCount}
                childCount={childCount}
                setChildCount={setChildCount}
                infant={infant}
                setInfant={setInfant}
                result={result}
                setResult={setResult}
                className={className}
                setClassName={setClassName}
                handleClassName={handleClassName}
                setChangeState={setChangeState}
                changeState={changeState}
                changeFrom={changeFrom}
                setChangeFrom={setChangeFrom}
                changeTo={changeTo}
                setChangeTo={setChangeTo}
                searchData={searchData}
                setSearchData={setSearchData}
              />
            </TabPanel>
            <TabPanel value="hotel" sx={{ width: "100%", padding: "0px" }}>
              <Typography>Hotel Coming...Soon</Typography>
            </TabPanel>
            <TabPanel
              value="airportTaxi"
              sx={{ width: "100%", padding: "0px" }}
            >
              <Typography>Airport Taxi Coming...Soon</Typography>
            </TabPanel>
            <TabPanel value="tour" sx={{ width: "100%", padding: "0px" }}>
              <TourSearchBox />
            </TabPanel>
          </Box>
        </TabContext>
      </Container>
    </Box>
  );
};

export default TourAfterSearchBanner;
