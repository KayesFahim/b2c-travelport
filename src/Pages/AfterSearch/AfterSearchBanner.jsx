import React from "react";
const FLIGHT_BANNER_IMAGE_URL =
  "https://www.savethestudent.org/uploads/flights.jpg";
import { Box, Container, IconButton, Typography } from "@mui/material";
import { useState } from "react";
import FlightSearchBox from "../HomeSearchBox/FlightSearchBox";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import { addDays, format, set } from "date-fns";
import { useRef } from "react";
import NavBar from "../../Shared/NavBar/NavBar";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import CloseIcon from "@mui/icons-material/Close";

const AfterSearchBanner = ({
  searchDatas,
  segments,
  fromSearch,
  toSearch,
  faddressText,
  toAddressText,
  depDate,
  arrDate,
  fromSend,
  toSend,
  adult,
  child,
  infantCount,
  classNa,
  paxResult,
  typeValue,
  valueBoxs,
  toggleBanner,
}) => {
  const userData = secureLocalStorage.getItem("userData");
  const banner = {
    backgroundImage: `linear-gradient(110deg, rgba(6, 28, 57, 0.74), rgba(6, 28, 57, 0.4)), url(${FLIGHT_BANNER_IMAGE_URL})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center",
    height: "200px",
  };
  const location = useLocation();
  const [value, setValue] = useState("flight");

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
  const [fromSearchText, setFromSearchText] = useState(fromSearch);
  const [toSearchText, setToSearchText] = useState(toSearch);

  const [departureDate, setDepartureDate] = useState(depDate);
  const [returningDate, setReturningDate] = useState(arrDate);
  const [travelDate, setTravelDate] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 3),
      key: "selection",
    },
  ]);
  // for multiCity
  const now = useRef(new Date());
  const [from, setFrom] = useState(depDate);
  const [to, setTo] = useState(arrDate);
  const [valueBox, setValueBox] = useState(valueBoxs);
  const [faddress, setfaddress] = useState(faddressText);
  const [toAddress, setToAddress] = useState(toAddressText);
  const [fromSendData, setFromSendData] = useState(fromSend);
  const [toSendData, setToSendData] = useState(toSend);
  const [adultCount, setAdultCount] = useState(adult);
  const [childCount, setChildCount] = useState(child);
  const [infant, setInfant] = useState(infantCount);
  const [result, setResult] = useState(paxResult);
  const [className, setClassName] = useState(classNa);
  const [showBanner, setShowBanner] = useState(true);

  const handleTypeChange = (event, newValue) => {
    setType(newValue);
  };
  const handleClassName = (event, newValue) => {
    setClassName(newValue);
  };
  const [searchData, setSearchData] = useState(searchDatas);
  const navigate = useNavigate();

  return (
    <>
      <Box>
        <Box style={{ position: "relative" }}>
          <Box
            sx={{
              xs: "none",
              md: "block",
            }}
            style={banner}
          >
            <NavBar />
          </Box>
          {showBanner && (
            <IconButton
              sx={{
                position: "absolute",
                top: "120px",
                right: "20px",
                zIndex: 2000,
                display: { xs: "block", sm: "none" }, // Show only on xs devices
                backgroundColor: "white",
                transition: "background-color 0.3s, transform 0.3s",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  transform: "scale(1.1)",
                },
                "&:active": {
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  transform: "scale(0.9)",
                },
              }}
              onClick={toggleBanner}
            >
              <CloseIcon sx={{ fontSize: "20px", color: "black" }} />
            </IconButton>
          )}
        </Box>

        <Container
          sx={{
            mt: -10,
          }}
        >
          <TabContext value={value}>
            <Box
              sx={{
                bgcolor: "var(--white)",
                border: "1px solid var(--button-color)",
                borderRadius: "5px",
                padding: "10px 20px",
                position: "relative",
                zIndex: 1000,
              }}
            >
              <TabPanel value="flight" sx={{ padding: "0px" }}>
                <FlightSearchBox
                  type={type}
                  setType={setType}
                  value={value}
                  valueBox={valueBox}
                  setValueBox={setValueBox}
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
                  segments={segments}
                  toggleBanner={toggleBanner}
                  modifySearch="modifySearch"
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
                <Typography>Tour Coming...Soon</Typography>
              </TabPanel>
            </Box>
          </TabContext>
        </Container>
      </Box>
    </>
  );
};

export default AfterSearchBanner;
