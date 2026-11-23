import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import PublishedWithChangesRoundedIcon from "@mui/icons-material/PublishedWithChangesRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import { useLocation, useNavigate } from "react-router-dom";
import OneWay from "../OneWay/OneWay";
import RoundWay from "../RoundWay/RoundWay";
import MultiCity from "../MultiCity/MultiCity";
import SearchCriteriaFilter from "./SearchCriteriaFilter";
import {
  createDefaultTravelportSearchFilters,
  normalizeTravelportSearchFilters,
} from "../../utils/travelportSearchCriteria";
const FlightSearchBox = ({
  segments,
  type,
  setType,
  fromSearchText,
  setFromSearchText,
  toSearchText,
  setToSearchText,
  departureDate,
  setDepartureDate,
  returningDate,
  setReturningDate,
  travelDate,
  setTravelDate,
  value,
  setValue,
  from,
  setFrom,
  to,
  setTo,
  faddress,
  setfaddress,
  toAddress,
  setToAddress,
  fromSendData,
  setFromSendData,
  toSendData,
  setToSendData,
  adultCount,
  setAdultCount,
  childCount,
  setChildCount,
  infant,
  setInfant,
  result,
  setResult,
  className,
  setClassName,
  handleClassName,
  setChangeState,
  changeState,
  changeFrom,
  setChangeFrom,
  changeTo,
  setChangeTo,
  valueBox,
  setValueBox,
  searchData,
  setSearchData,
  toggleBanner,
  modifySearch,
  onSearchCommitted,
  searchFilters,
  onSearchFiltersChange,
}) => {
  const totalPassengers =
    Number(adultCount || 0) + Number(childCount || 0) + Number(infant || 0);
  const [manageBookingPnr, setManageBookingPnr] = useState("");
  const [manageBookingError, setManageBookingError] = useState("");
  const [openManageBookingDialog, setOpenManageBookingDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [internalSearchFilters, setInternalSearchFilters] = useState(() =>
    createDefaultTravelportSearchFilters(
      searchFilters || location?.state?.searchFilters || {}
    )
  );

  useEffect(() => {
    if (searchFilters && typeof searchFilters === "object") {
      setInternalSearchFilters(normalizeTravelportSearchFilters(searchFilters));
    }
  }, [searchFilters]);

  useEffect(() => {
    if (!searchFilters && location?.state?.searchFilters) {
      setInternalSearchFilters(
        normalizeTravelportSearchFilters(location.state.searchFilters)
      );
    }
  }, [location?.state?.searchFilters, searchFilters]);

  const effectiveSearchFilters =
    searchFilters && typeof searchFilters === "object"
      ? normalizeTravelportSearchFilters(searchFilters)
      : internalSearchFilters;

  const handleSearchFiltersChange = (nextFilters) => {
    const normalized = normalizeTravelportSearchFilters(nextFilters);
    if (typeof onSearchFiltersChange === "function") {
      onSearchFiltersChange(normalized);
    } else {
      setInternalSearchFilters(normalized);
    }
  };

  const handleOpenManageBookingDialog = () => {
    setManageBookingError("");
    setOpenManageBookingDialog(true);
  };

  const handleCloseManageBookingDialog = () => {
    setOpenManageBookingDialog(false);
    setManageBookingError("");
  };

  const handleManageBooking = () => {
    const pnr = String(manageBookingPnr || "").trim().toUpperCase();
    if (!pnr) {
      setManageBookingError("Please enter a valid PNR / Locator.");
      return;
    }
    setManageBookingError("");
    setOpenManageBookingDialog(false);
    navigate(`/bookingconfirmation?pnr=${encodeURIComponent(pnr)}`);
  };
  const tripOptions = [
    {
      value: "oneway",
      label: "One Way",
      icon: <FlightTakeoffRoundedIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "roundway",
      label: "Round Trip",
      icon: <PublishedWithChangesRoundedIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: "multicity",
      label: "Multi City",
      icon: <HubRoundedIcon sx={{ fontSize: 18 }} />,
    },
  ];

  const currentTripLabel =
    tripOptions.find((item) => item.value === valueBox)?.label || "One Way";

  const renderSearchForm = () => {
    if (valueBox === "roundway") {
      return (
        <RoundWay
          type={type}
          setType={setType}
          valueBox={valueBox}
          setValueBox={setValueBox}
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
          handleClassName={handleClassName}
          setClassName={setClassName}
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
          modifySearch={modifySearch}
          onSearchCommitted={onSearchCommitted}
          searchFilters={effectiveSearchFilters}
        />
      );
    }

    if (valueBox === "multicity") {
      return (
        <MultiCity
          type={type}
          setType={setType}
          valueBox={valueBox}
          setValueBox={setValueBox}
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
          handleClassName={handleClassName}
          setClassName={setClassName}
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
          modifySearch={modifySearch}
          onSearchCommitted={onSearchCommitted}
          searchFilters={effectiveSearchFilters}
        />
      );
    }

    return (
      <OneWay
        type={type}
        valueBox={valueBox}
        setValueBox={setValueBox}
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
        handleClassName={handleClassName}
        setClassName={setClassName}
        setChangeState={setChangeState}
        changeState={changeState}
        changeFrom={changeFrom}
        setChangeFrom={setChangeFrom}
        searchData={searchData}
        setSearchData={setSearchData}
        segments={segments}
        toggleBanner={toggleBanner}
        modifySearch={modifySearch}
        onSearchCommitted={onSearchCommitted}
        searchFilters={effectiveSearchFilters}
      />
    );
  };

  return (
    <Box
      sx={{
        borderRadius: "20px",
        border: "1px solid rgba(0, 154, 214, 0.22)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,250,255,0.96) 100%)",
        boxShadow: "0 18px 36px rgba(8, 49, 85, 0.12)",
        p: { xs: 1.6, md: 2.2 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          flexDirection: { xs: "column", md: "row" },
          gap: 1.2,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "var(--depature-color)",
              fontWeight: 800,
              fontSize: { xs: "18px", md: "20px" },
            }}
          >
            Search Flights
          </Typography>
          <Typography
            sx={{
              color: "var(--filter-color)",
              fontSize: "13px",
              fontWeight: 500,
              mt: 0.3,
            }}
          >
            Organized booking flow with live fare response.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={currentTripLabel}
            sx={{
              bgcolor: "rgba(0,154,214,0.12)",
              color: "var(--airport-color)",
              fontWeight: 700,
            }}
          />
          <Chip
            size="small"
            icon={<PersonRoundedIcon sx={{ fontSize: "16px !important" }} />}
            label={`${totalPassengers || 1} Traveler${(totalPassengers || 1) > 1 ? "s" : ""}`}
            sx={{
              bgcolor: "rgba(20,184,166,0.12)",
              color: "#0f736c",
              fontWeight: 700,
            }}
          />
          <Button
            size="small"
            startIcon={<ManageSearchRoundedIcon sx={{ fontSize: "16px !important" }} />}
            onClick={handleOpenManageBookingDialog}
            sx={{
              textTransform: "none",
              borderRadius: "999px",
              px: 1.4,
              minHeight: 26,
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "12px",
              background: "linear-gradient(120deg, var(--primary-color), #007bb0)",
              boxShadow: "0 8px 16px rgba(0, 122, 175, 0.24)",
              "&:hover": {
                background: "linear-gradient(120deg, #008fc6, #006f9f)",
              },
            }}
          >
            Manage Booking
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          p: "4px",
          borderRadius: "14px",
          background:
            "linear-gradient(120deg, rgba(5,56,92,0.08), rgba(0,154,214,0.09))",
          border: "1px solid rgba(0,154,214,0.2)",
          display: "flex",
          gap: 0.7,
          flexWrap: "wrap",
          mb: 1.8,
        }}
      >
        {tripOptions.map((option) => {
          const isActive = valueBox === option.value;
          return (
            <Button
              key={option.value}
              onClick={() => setValueBox(option.value)}
              startIcon={option.icon}
              sx={{
                flex: { xs: "1 1 100%", sm: "1 1 0" },
                minWidth: 0,
                borderRadius: "10px",
                py: 1,
                fontWeight: 700,
                fontSize: "13px",
                textTransform: "none",
                color: isActive ? "#ffffff" : "var(--depature-color)",
                background: isActive
                  ? "linear-gradient(120deg, var(--primary-color), #007bb0)"
                  : "rgba(255,255,255,0.75)",
                border: isActive
                  ? "1px solid transparent"
                  : "1px solid rgba(0, 78, 126, 0.16)",
                boxShadow: isActive
                  ? "0 10px 18px rgba(0, 122, 175, 0.26)"
                  : "none",
                "&:hover": {
                  background: isActive
                    ? "linear-gradient(120deg, #008fc6, #006f9f)"
                    : "rgba(255,255,255,0.92)",
                },
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.1,
          mb: 1.5,
        }}
      >
        <SearchCriteriaFilter
          filters={effectiveSearchFilters}
          onChange={handleSearchFiltersChange}
        />
      </Box>

      <Box
        sx={{
          borderRadius: "16px",
          border: "1px solid rgba(12, 65, 107, 0.14)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
          p: { xs: 1.2, md: 1.5 },
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
        }}
      >
        {renderSearchForm()}
      </Box>

      <Dialog
        open={openManageBookingDialog}
        onClose={handleCloseManageBookingDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700, color: "var(--depature-color)" }}>
          Manage Booking
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Enter PNR / Locator"
            value={manageBookingPnr}
            error={Boolean(manageBookingError)}
            helperText={manageBookingError || " "}
            onChange={(event) => {
              setManageBookingPnr(event.target.value);
              if (manageBookingError) setManageBookingError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleManageBooking();
              }
            }}
            sx={{
              mt: 0.6,
              "& .MuiInputBase-root": {
                bgcolor: "#ffffff",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.2 }}>
          <Button
            onClick={handleCloseManageBookingDialog}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleManageBooking}
            startIcon={<ManageSearchRoundedIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(120deg, var(--primary-color), #007bb0)",
            }}
          >
            View Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlightSearchBox;
