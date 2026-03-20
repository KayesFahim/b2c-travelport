import {
  Box,
  Button,
  ClickAwayListener,
  Grid,
  Typography,
  Collapse,
  Stack,
  Tooltip,
} from "@mui/material";
import React, { useState } from "react";
import DepartureIcons from "../../asstes/img/HomeImage/flightIcons/deapature.svg?react";
import ArribalIcons from "../../asstes/img/HomeImage/flightIcons/arrival.svg?react";
import SwitchBtnIcons from "../../asstes/img/HomeImage/flightIcons/switchbtn.svg?react";
import DateIcons from "../../asstes/img/HomeImage/flightIcons/dateIcons.svg?react";
import TravlerIcons from "../../asstes/img/HomeImage/flightIcons/travlericons.svg?react";
import flightData from "../../../src/Pages/flightData";
import Alert from "@mui/material/Alert";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { format } from "date-fns";
import { Calendar } from "react-date-range";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { styled } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { saveRecentSearch } from "../../utils/recentSearches";
const isMobile = window.innerWidth <= 768;
const BpIcon = styled("span")(({ theme }) => ({
  borderRadius: "50%",
  width: 16,
  height: 16,
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 0 0 1px rgb(16 22 26 / 40%)"
      : "inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)",
  backgroundColor: theme.palette.mode === "dark" ? "#394b59" : "#f5f8fa",
  backgroundImage:
    theme.palette.mode === "dark"
      ? "linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))"
      : "linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))",
  ".Mui-focusVisible &": {
    outline: "2px auto var(--primary-color)",
    outlineOffset: 2,
  },
  "input:hover ~ &": {
    backgroundColor: theme.palette.mode === "dark" ? "#30404d" : "#ebf1f5",
  },
  "input:disabled ~ &": {
    boxShadow: "none",
    background:
      theme.palette.mode === "dark"
        ? "rgba(57,75,89,.5)"
        : "rgba(206,217,224,.5)",
  },
}));

const BpCheckedIcon = styled(BpIcon)({
  backgroundColor: "var(--primary-color)",
  backgroundImage:
    "linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))",
  "&:before": {
    display: "block",
    width: 16,
    height: 16,
    backgroundImage: "radial-gradient(#fff,#fff 28%,transparent 32%)",
    content: '""',
  },
  "input:hover ~ &": {
    backgroundColor: "var(--secondary-color)",
  },
});

// Inspired by blueprintjs
function BpRadio(props) {
  return (
    <Radio
      sx={{
        "&:hover": {
          bgcolor: "transparent",
        },
      }}
      disableRipple
      color="default"
      checkedIcon={<BpCheckedIcon />}
      icon={<BpIcon />}
      {...props}
    />
  );
}

const OneWay = ({
  tripType,
  valueBox,
  setValueBox,
  iconColor,
  bgColor,
  borderColor,
  faddress,
  setfaddress,
  toAddress,
  setToAddress,
  fromSearchText,
  setFromSearchText,
  fromSendData,
  setFromSendData,
  toSendData,
  setToSendData,
  toSearchText,
  setToSearchText,
  departureDate,
  setDepartureDate,
  value,
  setValue,
  adultCount,
  setAdultCount,
  childCount,
  setChildCount,
  infant,
  setInfant,
  result,
  setResult,
  className,
  handleClassName,
  travelDate,
  setTravelDate,
  to,
  setTo,
  from,
  setFrom,
  setChangeState,
  changeState,
  changeFrom,
  setChangeFrom,
  searchData,
  toggleBanner,
  modifySearch,
  onSearchCommitted,
}) => {
  const data = flightData; // json data from flight Data

  const initialData = [
    {
      code: "DAC",
      name: "Hazrat Shahjalal Intl Airport",
      Address: "Dhaka,BANGLADESH",
    },
    {
      code: "DXB",
      name: "Dubai Intl Airport",
      Address: "Dubai,UNITED ARAB EMIRATES",
    },
    {
      code: "CXB",
      name: "Cox's Bazar Airport",
      Address: "Cox's Bazar,Bangladesh",
    },
    {
      code: "JSR",
      name: "Jashore Airport",
      Address: "Jashore,Bangladesh",
    },
    {
      code: "BZL",
      name: "Barishal Airport",
      Address: "Barishal,Bangladesh",
    },
    {
      code: "RJH",
      name: "Shah Makhdum Airport",
      Address: "Rajshahi,Bangladesh",
    },
    {
      code: "SPD",
      name: "Saidpur Airport",
      Address: "Saidpur,Bangladesh",
    },
  ];
  const [click, setClick] = useState(false);
  //todo: end of click state
  const [fromSuggest, setFromSuggest] = useState(initialData);
  const [toSuggest, setToSuggest] = useState(initialData);

  const [open, setOpen] = useState(false);
  const [openDate, setOpenDate] = useState(false);

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const handleClickAway = () => {
    setOpenFrom(false);
    setOpenTo(false);
    setOpenDate(false);
    setOpen(false);
    setResult(adultCount + childCount + infant);
  };
  const handleSelect = (date) => {
    setFrom(date);
    setChangeFrom(true);
    setOpenDate(false);
    setTimeout(() => setOpen(true), 200);
  };

  const formOnChange = (e) => {
    setOpen(false);
    const searchvalue = e.target.value;

    if (searchvalue.length > 2) {
      const suggestion = data.filter((item) =>
        item.code.toLowerCase().includes(searchvalue.toLowerCase())
      );
      setFromSuggest(suggestion);
      if (suggestion.length === 0) {
        const suggestion = data.filter(
          (item) =>
            item.code.toLowerCase().includes(searchvalue.toLowerCase()) ||
            item.Address.toLowerCase().includes(searchvalue.toLowerCase())
        );
        setFromSuggest(suggestion);
      }
    } else {
      setFromSuggest(initialData);
    }
  };

  const fromSuggestedText = (name, code, address) => {
    setFromSendData(code);
    setFromSearchText(`${name} (${code})`);
    setFromSuggest([]);
    setfaddress(address);
    setOpen(false);
    setOpenFrom(false);
    setOpenTo(true);
  };

  const toOnChange = (e) => {
    const searchvalue = e.target.value;
    if (searchvalue.length > 2) {
      const suggestion = data.filter((item) =>
        item.code.toLowerCase().includes(searchvalue.toLowerCase())
      );
      setToSuggest(suggestion);
      if (suggestion.length === 0) {
        const suggestion = data.filter(
          (item) =>
            item.code.toLowerCase().includes(searchvalue.toLowerCase()) ||
            item.Address.toLowerCase().includes(searchvalue.toLowerCase())
        );
        setToSuggest(suggestion);
      }
    } else {
      setToSuggest(initialData);
    }
  };
  const toSuggestedText = (name, code, address) => {
    setToSendData(code);
    setToSearchText(`${name} (${code})`);
    setToSuggest([]);
    setToAddress(address);
    setOpenTo(false);
    setTimeout(() => setOpenDate(true), 200);
  };

  const fromGetSuggetion = () => {
    return (
      <Box
        sx={{
          height: "fit-content",
          position: "relative",
          width: "100%",
          zIndex: "100",
        }}
      >
        <Box
          sx={{
            maxHeight: "230px",
            overflowY: "auto",
            background: "transparent",
            boxShadow:
              "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
            "&::-webkit-scrollbar": { width: "0px" },
          }}
        >
          {fromSuggest.length !== 0 ? (
            fromSuggest.map((item, index) => {
              return (
                <Box
                  key={index}
                  sx={{
                    paddingLeft: "10px",
                    paddingRight: "5px",
                    backgroundColor: "var(--white)",
                    transition: "all .5s ease-in-out",
                    "&:hover": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--text-color)",
                    },
                    "&:hover .address": { color: "var(--white)" },
                  }}
                >
                  <Box
                    sx={{
                      margin: "0px 0px",
                      padding: "5px 0px",
                      cursor: "pointer",
                      display: "flex",
                      // width: "100%",
                      justifyContent: "space-between",
                    }}
                    onClick={() => {
                      fromSuggestedText(
                        `${item.name} `,
                        `${item.code}`,
                        `${item.Address}`
                      );
                    }} //suggest to display name select with multiple data pass parameter
                  >
                    <Box>
                      <Typography
                        className="address"
                        sx={{
                          fontSize: "12px",
                          color: "var(--flight-color)",
                          display: "block",
                          textAlign: "left",
                          fontWeight: 400,
                        }}
                      >
                        {item.Address}
                      </Typography>
                      <Typography
                        style={{
                          fontSize: "11px",
                          display: "block",
                          textAlign: "left",

                          color: "var(--text-color)",
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        style={{
                          fontSize: "13px",
                          display: "block",
                          textAlign: "left",
                          paddingRight: "5px",
                          color: "var(--button-color)",
                          fontWeight: 400,
                        }}
                      >
                        {item.code}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box>
              <Typography
                variant="subtitle-2"
                style={{
                  color: "red",
                  fontWidth: "bold",
                  paddingLeft: "10px",
                }}
              >
                Not found
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const toGetSuggetion = () => {
    return (
      <Box
        style={{
          height: "fit-content",
          position: "relative",
          width: "100%",
          zIndex: "100",
        }}
      >
        <Box
          sx={{
            boxShadow:
              "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
            maxHeight: "230px",
            overflowY: "auto",
            background: "#fff",
            "&::-webkit-scrollbar": { width: "0px" },
          }}
        >
          {toSuggest.length !== 0 ? (
            toSuggest.map((item, index) => {
              return (
                <Box
                  key={index}
                  sx={{
                    paddingLeft: "10px",
                    paddingRight: "5px",
                    backgroundColor: "var(--white)",
                    transition: "all .5s ease-in-out",
                    "&:hover": {
                      backgroundColor: "var(--button-color)",
                      color: "var(--text-color)",
                    },
                    "&:hover .address": { color: "var(--white)" },
                  }}
                >
                  <Box
                    sx={{
                      margin: "0px 0px",
                      padding: "5px 0px",
                      cursor: "pointer",
                      display: "flex",
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                    onClick={() =>
                      toSuggestedText(
                        `${item.name} `,
                        `${item.code}`,
                        `${item.Address}`
                      )
                    } //suggest to display name select with multiple data pass parameter
                  >
                    <Box>
                      <Typography
                        className="address"
                        sx={{
                          fontSize: "12px",
                          color: "var(--flight-color)",
                          display: "block",
                          textAlign: "left",
                          fontWeight: 400,
                        }}
                      >
                        {item.Address}
                      </Typography>
                      <span
                        style={{
                          fontSize: "11px",
                          display: "block",
                          color: "var(--text-color)",
                          textAlign: "left",
                        }}
                      >
                        {item.name}
                      </span>
                    </Box>
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          paddingRight: "10px",
                          display: "block",
                          textAlign: "left",
                          fontWeight: 400,
                          color: "var(--button-color)",
                        }}
                      >
                        {item.code}
                      </span>
                    </Box>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box>
              <Typography
                variant="subtitle2"
                style={{
                  color: "RED",
                  fontWidth: "bold",
                  paddingLeft: "10px",
                }}
              >
                Not found
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };
  // SearchingField End

  // Opens the dialog when the user clicks.
  const handleClickOpen = () => {
    setOpen((prev) => !prev);
    setOpenFrom(false);
    setOpenTo(false);
    setOpenDate(false);
  };

  // Closes the child process.
  const handleClose = () => {
    setOpen(false);
    setOpenFrom(false);
    setOpenTo(false);
    setOpenDate(false);
    setResult(adultCount + childCount + infant);
  };
  const handleSwapBtn = () => {
    setfaddress(toAddress);
    setToAddress(faddress);
    setFromSendData(toSendData);
    setToSendData(fromSendData);
    setToSearchText(fromSearchText);
    setFromSearchText(toSearchText);
    // setOpenFrom(true);
  };
  // Sets the number of children.
  const adultInclement = (e) => {
    e.preventDefault();
    if (adultCount < 9 - (childCount + infant)) {
      setAdultCount(adultCount + 1);
    }
  };

  // Decrement the count of children.
  const adultDecrement = (e) => {
    e.preventDefault();
    if (adultCount > 1) {
      setAdultCount(adultCount - 1);
      if (infant === adultCount) {
        if (infant > 1) {
          setInfant(infant - 1);
        }
      }
    }
  };

  const adult2Inclement = (e) => {
    e.preventDefault();
    if (childCount < 9 - (adultCount + infant)) {
      setChildCount(childCount + 1);
    }
  };

  const adult2Decrement = (e) => {
    e.preventDefault();
    if (childCount > 0) {
      setChildCount(childCount - 1);
    }
  };

  // Increment the default value if the value is not a child.
  const infantIncrement = (e) => {
    e.preventDefault();
    if (infant < 9 - (adultCount + childCount)) {
      if (infant < adultCount) {
        setInfant(infant + 1);
      }
    }
  };

  // Decrement the infant by 1.
  const infantDecrement = (e) => {
    e.preventDefault();
    if (infant > 0) {
      setInfant(infant - 1);
    }
  };
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    handleClose();
    setChangeState((prev) => !prev);
    const departureDateIso = format(new Date(from), "yyyy-MM-dd");
    const formattedDepartureDate = format(new Date(from), "dd MMM yy");
    const formattedArrivalDate = format(new Date(to), "dd MMM yy");
    const { segments } = searchData;

    saveRecentSearch({
      tripType: valueBox || "oneway",
      fromCode: fromSendData,
      toCode: toSendData,
      fromLabel: fromSearchText,
      toLabel: toSearchText,
      fromAddress: faddress,
      toAddress: toAddress,
      departureDate: departureDateIso,
      returnDate: "",
      adultCount,
      childCount,
      infantCount: infant,
      cabinClass: className,
      segments: [
        {
          depfrom: fromSendData,
          arrto: toSendData,
          depdate: departureDateIso,
          depFromText: fromSearchText,
          arrToText: toSearchText,
        },
      ],
    });

    if (typeof onSearchCommitted === "function") {
      onSearchCommitted();
    }

    navigate("/onewaysearchresult", {
      state: {
        faddress,
        toAddress,
        fromSearchText,
        toSearchText,
        departureDate: formattedDepartureDate,
        arrivalDate: formattedArrivalDate,
        adultCount,
        childCount,
        infant,
        tripType,
        fromSendData,
        toSendData,
        className,
        result,
        valueBox,
        value,
        changeState,
        searchData,
        segments,
      },
    });
    if (modifySearch && window.innerWidth <= 768) {
      toggleBanner();
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <form onSubmit={handleSearch}>
        <Box sx={{ position: "relative" }}>
          <Grid container spacing={{ xs: 2, sm: 2, md: 1, lg: 1 }}>
            {/* deapaturte airport  */}
            <Grid item xs={12} sm={12} md={3} lg={3}>
              <Box>
                <Box
                  onClick={() => {
                    setOpenFrom((prev) => !prev);
                    setOpenTo(false);
                    setOpenDate(false);
                    setOpen(false);
                    // window.scrollTo({
                    //   top: 200,
                    //   behavior: "smooth",
                    // });
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: "12px" }}
                  >
                    <Typography
                      sx={{ color: "var(--text-color)", fontSize: "14px" }}
                    >
                      Departure
                    </Typography>
                    <DepartureIcons sx={{ fontSize: "20px" }} />
                  </Box>
                  <Typography>
                    {faddress?.split(",")[0] === toAddress?.split(",")[0] && (
                      <Stack
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: "0",
                          width: "230px",
                        }}
                      >
                        <Alert
                          icon={<ErrorOutlineIcon fontSize="inherit" />}
                          severity="error"
                          sx={{ fontSize: "11px" }}
                        >
                          Can't choose same place!
                        </Alert>
                      </Stack>
                    )}
                  </Typography>
                  <Box sx={{ mt: "5px" }}>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--flight-color)",
                      }}
                      noWrap
                    >
                      {fromSearchText}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  onClick={handleSwapBtn}
                  sx={{
                    bgcolor: "white",
                    cursor: "pointer",
                    position: "absolute",
                    border: {
                      xs: "1px solid var(--primary-color)",
                      sm: "1px solid var(--primary-color)",
                      md: "none",
                      lg: "none",
                    },
                    p: {
                      xs: "5px",
                      sm: "5px",
                      md: "0px",
                      lg: "0px",
                    },
                    borderRadius: {
                      xs: "50%",
                      sm: "50%",
                      md: "none",
                      lg: "none",
                    },
                    transform: {
                      xs: "rotate(90deg)",
                      sm: "rotate(90deg)",
                      md: "rotate(0deg)",
                      lg: "rotate(0deg)",
                    },
                    top: {
                      xs: "17.3%",
                      sm: "18%",
                      md: "40%",
                      lg: "40%",
                    },
                    left: { xs: "90%", sm: "83%", md: "22%", lg: "22%" },
                  }}
                >
                  <SwitchBtnIcons />
                </Box>
                <Collapse
                  in={openFrom}
                  timeout="auto"
                  unmountOnExit
                  sx={{ width: "250px" }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: {
                        xs: "20%",
                        sm: "100%",
                        md: "100%",
                        lg: "100%",
                      },
                      left: "0",
                      right: "0",
                      width: {
                        xs: "230px",
                        sm: "230px",
                        md: "230px",
                        lg: "230px",
                      },
                      backgroundColor: "var(--white)",
                      border: "1px solid var(--button-color)",
                      height: "fit-content",
                      borderRadius: "0px 0px 5px 5px",
                      zIndex: "999",
                      padding: "3px 5px 0px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "var(--white)",
                        zIndex: 10,
                      }}
                      backgroundColor="#fff"
                    >
                      <input
                        autoComplete="off"
                        autoFocus
                        onChange={formOnChange}
                        placeholder="Search a airport..."
                        className="customPlaceholder"
                        style={{
                          color: "var(--black)",
                          fontWeight: 400,
                          paddingLeft: "20px",
                          width: "100%",
                          height: "40px",
                          backgroundColor: "transparent",
                          border: "none",
                          outline: "none",
                        }}
                      />
                    </Box>
                    <Box>{fromGetSuggetion()}</Box>
                  </Box>
                </Collapse>
              </Box>
            </Grid>

            <Grid item xs={12} sm={12} md={3} lg={3}>
              <Box
                onClick={() => {
                  setOpenFrom(false);
                  setOpenTo((prev) => !prev);
                  setOpenDate(false);
                  setOpen(false);
                  // window.scrollTo({
                  //   top: 200,
                  //   behavior: "smooth",
                  // });
                }}
                sx={{
                  pl: { xs: "0px", sm: "0px", md: "20px", lg: "20px" },
                  borderTop: {
                    xs: "1px solid var(--primary-color)",
                    sm: "1px solid var(--primary-color)",
                    md: "none",
                    lg: "none",
                  },
                  pt: { xs: "15px", sm: "15px", md: "0px", lg: "0px" },
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Typography
                    sx={{ color: "var(--text-color)", fontSize: "14px" }}
                  >
                    Arrival
                  </Typography>
                  <ArribalIcons sx={{ fontSize: "20px" }} />
                </Box>
                <Typography>
                  {faddress?.split(",")[0] === toAddress?.split(",")[0] && (
                    <Stack
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "0",
                        width: "100%",
                      }}
                    >
                      <Alert
                        icon={<ErrorOutlineIcon fontSize="inherit" />}
                        severity="error"
                        sx={{ fontSize: "11px" }}
                      >
                        Can't choose same place!
                      </Alert>
                    </Stack>
                  )}
                </Typography>
                <Box sx={{ mt: "5px" }}>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--flight-color)",
                    }}
                    noWrap
                  >
                    {toSearchText}
                  </Typography>
                </Box>
              </Box>
              <Collapse
                in={openTo}
                timeout="auto"
                unmountOnExit
                sx={{ width: "230px" }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: {
                      xs: "42%",
                      sm: "42%",
                      md: "100%",
                      lg: "100%",
                    },
                    left: { xs: "0%", sm: "0%", md: "25%", lg: "25%" },
                    width: "230px",
                    backgroundColor: "var(--white)",
                    height: "fit-content",
                    border: "1px solid var(--button-color)",
                    borderRadius: "0px 0px 5px 5px",
                    zIndex: "999",
                    padding: "5px 5px 0",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "var(--secondary-color)",
                      zIndex: 10,
                    }}
                    backgroundColor="var(--white)"
                  >
                    <input
                      autoComplete="off"
                      autoFocus
                      onChange={toOnChange}
                      className="customPlaceholder"
                      placeholder="Search a airport..."
                      style={{
                        color: "var(--secondary-color)",
                        fontWeight: 400,
                        paddingLeft: "20px",
                        width: "100%",
                        height: "40px",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                      }}
                    />
                  </Box>
                  <Box>{toGetSuggetion()}</Box>
                </Box>
              </Collapse>
            </Grid>

            <Grid
              item
              xs={12}
              sm={12}
              md={2.3}
              lg={2.3}
              sx={{ position: "relative" }}
            >
              <Box
                sx={{
                  borderLeft: isMobile ? "none" : "1px solid var(--text-color)",
                  pl: { xs: "0px", sm: "0px", md: "20px", lg: "20px" },
                  borderTop: {
                    xs: "1px solid var(--primary-color)",
                    sm: "1px solid var(--primary-color)",
                    md: "none",
                    lg: "none",
                  },
                  pt: { xs: "15px", sm: "15px", md: "0px", lg: "0px" },
                  cursor: "pointer",
                }}
                onClick={() => {
                  setTimeout(() => setOpenDate((prev) => !prev), 200);
                  setOpenFrom(false);
                  setOpenTo(false);
                  setOpen(false);
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Typography
                    sx={{ color: "var(--text-color)", fontSize: "14px" }}
                  >
                    Depart Date
                  </Typography>
                  <CalendarMonthIcon
                    sx={{ fontSize: "18px", color: "var(--text-color)" }}
                  />
                </Box>
                <Box sx={{ mt: "5px" }}>
                  <Typography
                    sx={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--flight-color)",
                    }}
                  >
                    {`${moment(from).format("DD MMM YY")}`}
                  </Typography>
                </Box>
              </Box>
              {openDate && (
                <Box
                  sx={{
                    position: "absolute",
                    zIndex: { md: 10, xs: 1000 },
                    top: "100%",
                    left: { xs: "auto", md: "auto", lg: "18px" },
                    boxShadow: "0px 8px 8px rgba(0, 0, 0, 0.2)", // Adjusted shadow to be darker
                    border: "1px solid var(--button-color)",
                    borderRadius: "0px 0px 5px 5px",
                    bgcolor: "var(--white)",
                    display: "flex",
                  }}
                >
                  <Calendar
                    color="var(--primary-color)"
                    date={new Date(from)}
                    onChange={handleSelect}
                    months={1}
                    direction="horizontal"
                    minDate={new Date()}
                    style={{
                      fontSize: "11px",
                      padding: "0",
                      boxShadow: "0px 8px 8px rgba(0, 0, 0, 0.2)", // Adjusted shadow to be darker
                    }}
                  />
                </Box>
              )}
            </Grid>
            {/* <Grid item xs={12} sm={12} md={3} lg={1.7}>
              <Box
                sx={{ borderLeft: "1px solid var(--text-color)", pl: "20px" }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Typography
                    sx={{ color: "var(--text-color)", fontSize: "14px" }}
                  >
                    Onward Date
                  </Typography>
                  <CalendarMonthIcon
                    sx={{ fontSize: "18px", color: "var(--text-color)" }}
                  />
                </Box>
                <Box sx={{ mt: "5px" }}>
                  <Typography
                    sx={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--flight-color)",
                    }}
                  >
                    Add+
                  </Typography>
                </Box>
              </Box>
            </Grid> */}
            <Grid item xs={12} sm={12} md={2.2} lg={2.2}>
              <Box
                onClick={handleClickOpen}
                sx={{
                  borderLeft: isMobile ? "none" : "1px solid var(--text-color)",
                  pl: { xs: "0px", sm: "0px", md: "20px", lg: "20px" },
                  borderTop: {
                    xs: "1px solid var(--primary-color)",
                    sm: "1px solid var(--primary-color)",
                    md: "none",
                    lg: "none",
                  },
                  pt: { xs: "15px", sm: "15px", md: "0px", lg: "0px" },
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Typography
                    sx={{ color: "var(--text-color)", fontSize: "14px" }}
                  >
                    Passenger & Class
                  </Typography>
                  <TravlerIcons sx={{ fontSize: "20px" }} />
                </Box>
                <Box sx={{ mt: "5px" }}>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--flight-color)",
                    }}
                  >
                    {result} Traveler,{" "}
                    {className === "1"
                      ? "Economy"
                      : className === "2"
                        ? "Premium Economy"
                        : className === "3"
                          ? "Business"
                          : className === "4"
                            ? "First Class"
                            : className}
                  </Typography>
                </Box>
              </Box>
              {open && (
                <Box
                  sx={{
                    position: "absolute",
                    top: { lg: "100%", md: "100%", sm: "100%", xs: "87%" },
                    right: {
                      xs: "5%",
                      sm: "10%",
                      md: "0px",
                      lg: "30px",
                    },
                    // left: { lg: "0px", md: "0px", sm: "0%", xs: "0%" },
                    zIndex: 10000,
                    // borderRadius: "5px",
                    backgroundColor: "var(--white)",
                    boxShadow:
                      "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
                    "&::-webkit-scrollbar": { width: "0px" },
                    // boxShadow: "0px 8px 8px rgba(0, 0, 0, 0.2)", // Adjusted shadow to be darker
                    border: "1px solid var(--button-color)",
                    borderRadius: "0px 0px 5px 5px",
                    bgcolor: "var(--white)",
                  }}
                >
                  <Box width="250px" p={2}>
                    <Typography
                      style={{
                        textAlign: "left",
                        marginBottom: "5px",
                        color: "var(--flight-color)",

                        fontWeight: 500,
                      }}
                    >
                      Passenger
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={4}
                      justifyContent="space-between"
                      alignItems="center"
                      pb={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="space-between"
                        width="40%"
                      >
                        <button
                          onClick={adultDecrement}
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                            border: "none",
                            width: "25px",
                            height: "25px",
                            fontSize: "20px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "2px",
                          }}
                        >
                          -
                        </button>
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "var(--flight-color)",
                          }}
                        >
                          {adultCount}
                        </Typography>
                        <button
                          onClick={adultInclement}
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                            border: "none",
                            width: "25px",
                            height: "25px",
                            fontSize: "20px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "2px",
                          }}
                        >
                          +
                        </button>
                      </Stack>
                      <Box width="60%">
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "var(--flight-color)",
                          }}
                        >
                          Adult
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--flight-color)",
                          }}
                        >
                          12+ yrs
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={4}
                      justifyContent="space-between"
                      alignItems="center"
                      pb={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="space-between"
                        width="40%"
                      >
                        <button
                          onClick={adult2Decrement}
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                            border: "none",
                            width: "25px",
                            height: "25px",
                            fontSize: "20px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "2px",
                          }}
                        >
                          -
                        </button>
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "var(--flight-color)",
                          }}
                        >
                          {childCount}
                        </Typography>
                        <button
                          onClick={adult2Inclement}
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                            border: "none",
                            width: "25px",
                            height: "25px",
                            fontSize: "20px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "2px",
                          }}
                        >
                          +
                        </button>
                      </Stack>
                      <Box width="60%">
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "var(--flight-color)",
                          }}
                        >
                          Child
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--flight-color)",
                          }}
                        >
                          2- less than 12 yrs
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={4}
                      justifyContent="space-between"
                      alignItems="center"
                      pb={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="space-between"
                        width="40%"
                      >
                        <button
                          onClick={infantDecrement}
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                            border: "none",
                            width: "25px",
                            height: "25px",
                            fontSize: "20px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "2px",
                          }}
                        >
                          -
                        </button>
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "var(--flight-color)",
                          }}
                        >
                          {infant}
                        </Typography>
                        <button
                          onClick={infantIncrement}
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                            border: "none",
                            width: "25px",
                            height: "25px",
                            fontSize: "20px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: "2px",
                          }}
                        >
                          +
                        </button>
                      </Stack>
                      <Box width="60%">
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "var(--flight-color)",
                          }}
                        >
                          Infant
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--flight-color)",
                          }}
                        >
                          0 - 23 month
                        </Typography>
                      </Box>
                    </Stack>
                    <Box my={1}>
                      <hr />
                    </Box>
                    <Box>
                      <FormControl>
                        <RadioGroup
                          value={className}
                          onChange={handleClassName}
                        >
                          <Stack direction="row">
                            <FormControlLabel
                              value="1"
                              control={<BpRadio />}
                              label={
                                <Typography
                                  sx={{
                                    color: "var(--flight-color)",
                                    fontSize: 12,
                                  }}
                                >
                                  Economy
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              value="3"
                              control={<BpRadio />}
                              label={
                                <Typography
                                  sx={{
                                    color: "var(--flight-color)",
                                    fontSize: 12,
                                  }}
                                >
                                  Business
                                </Typography>
                              }
                            />
                          </Stack>
                          <Stack direction="row">
                            <FormControlLabel
                              value="4"
                              control={<BpRadio sx={{ py: 0 }} />}
                              label={
                                <Typography
                                  sx={{
                                    color: "var(--flight-color)",
                                    fontSize: 12,
                                  }}
                                >
                                  First Class
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              value="2"
                              control={<BpRadio sx={{ py: 0 }} />}
                              label={
                                <Typography
                                  sx={{
                                    color: "var(--flight-color)",
                                    fontSize: 12,
                                  }}
                                >
                                  Premium Economy
                                </Typography>
                              }
                            />
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      <Box mt={2} style={{ textAlign: "right" }}>
                        <Button
                          size="small"
                          onClick={handleClose}
                          className="shine-effect"
                          style={{
                            backgroundColor: "var(--primary-color)",
                            color: "var(--white)",
                          }}
                        >
                          DONE
                        </Button>
                      </Box>
                    </Box>
                  </Box>

                  {/* -----------new passenger- */}
                </Box>
              )}
            </Grid>
            <Grid item xs={12} sm={12} md={1.5} lg={1.5}>
              <Button
                type="submit"
                sx={{
                  color: "var(--primary-text-color)",
                  textTransform: "capitalize",
                  borderRadius: "10px",
                  fontWeight: 600,
                  width: "100%",
                  bgcolor: "var(--button-color)",
                  ":hover": {
                    bgcolor: "var(--button-color)",
                  },
                }}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </Box>
      </form>
    </ClickAwayListener>
  );
};

export default OneWay;
