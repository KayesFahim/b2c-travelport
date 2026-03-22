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
import React, { useEffect, useState } from "react";
import reactSvg from "../../utils/reactSvg";
import _DepartureIcons from "../../asstes/img/HomeImage/flightIcons/deapature.svg?react";
import _ArribalIcons from "../../asstes/img/HomeImage/flightIcons/arrival.svg?react";
import _SwitchBtnIcons from "../../asstes/img/HomeImage/flightIcons/switchbtn.svg?react";
import _DateIcons from "../../asstes/img/HomeImage/flightIcons/dateIcons.svg?react";
import _TravlerIcons from "../../asstes/img/HomeImage/flightIcons/travlericons.svg?react";
import flightData from "../../../src/Pages/flightData";
import Alert from "@mui/material/Alert";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { format } from "date-fns";
import { Calendar } from "react-date-range";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FormControl from "@mui/material/FormControl";
import { styled } from "@mui/material/styles";
import GroupsIcon from "@mui/icons-material/Groups";
import { Link, useNavigate } from "react-router-dom";
import { saveRecentSearch } from "../../utils/recentSearches";

const DepartureIcons = reactSvg(_DepartureIcons);
const ArribalIcons = reactSvg(_ArribalIcons);
const SwitchBtnIcons = reactSvg(_SwitchBtnIcons);
const DateIcons = reactSvg(_DateIcons);
const TravlerIcons = reactSvg(_TravlerIcons);

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

const MultiCity = ({
  tripType,
  iconColor,
  bgColor,
  valueBox,
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
  searchData,
  setSearchData,
  changeFrom,
  setChangeFrom,
  changeTo,
  setChangeTo,
  toggleBanner,
  modifySearch,
  onSearchCommitted,
}) => {
  const MAX_MULTI_CITY_SEGMENTS = 4;
  const data = flightData;

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

  // todo: end of users section
  //todo: is Click state
  const [click, setClick] = useState(false);
  //todo: end of click state
  const [fromSuggest, setFromSuggest] = useState(initialData);
  const [toSuggest, setToSuggest] = useState(initialData);

  const [open, setOpen] = useState(false);
  const [openDate, setOpenDate] = useState(false);

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  // const handleOpenFrom = (index) => {
  //   setSearchData((prevData) => ({
  //     ...prevData,
  //     segments: prevData.segments.map((segment, i) =>
  //       i === index
  //         ? {
  //             ...segment,
  //             openFrom: !segment.openFrom,
  //             openTo: false,
  //             openDate: false,
  //             open: false,
  //           }
  //         : { ...segment, openFrom: false }
  //     ),
  //   }));
  // };

  const handleOpenFrom = (index) => {
    setSearchData((prevData) => ({
      ...prevData,
      segments: prevData.segments.map((segment, i) => ({
        ...segment,
        openFrom: i === index ? !segment.openFrom : false, // Toggle openFrom for clicked index
        openTo: false, // Reset openTo for all other segments
        openDate: false, // Reset openDate for all other segments
        open: false, // Reset open for all other segments (if necessary)
      })),
    }));
  };

  const handleOpenTo = (index) => {
    setSearchData((prevData) => ({
      ...prevData,
      segments: prevData.segments.map((segment, i) => ({
        ...segment,
        openTo: i === index ? !segment.openTo : false, // Toggle openTo for clicked index
        openFrom: false, // Reset openFrom for all other segments
        openDate: false, // Reset openDate for all other segments
        open: false, // Reset open for all other segments (if necessary)
      })),
    }));
  };

  const handleOpenDate = (index) => {
    setSearchData((prevData) => ({
      ...prevData,
      segments: prevData.segments.map((segment, i) => ({
        ...segment,
        openDate: i === index ? !segment.openDate : false, // Toggle openDate for clicked index
        openFrom: false, // Reset openFrom for all other segments
        openTo: false, // Reset openTo for all other segments
        open: false, // Reset open for all other segments (if necessary)
      })),
    }));
  };

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!Array.isArray(searchData?.segments)) {
      return;
    }

    if (searchData.segments.length <= MAX_MULTI_CITY_SEGMENTS) {
      return;
    }

    setSearchData((prevData) => ({
      ...prevData,
      segments: Array.isArray(prevData?.segments)
        ? prevData.segments.slice(0, MAX_MULTI_CITY_SEGMENTS)
        : [],
    }));
    setErrorMessage(
      `Multi-city supports up to ${MAX_MULTI_CITY_SEGMENTS} destinations.`
    );
  }, [searchData?.segments?.length, setSearchData, MAX_MULTI_CITY_SEGMENTS]);

  const addCity = () => {
    const currentSegments = Array.isArray(searchData?.segments)
      ? searchData.segments
      : [];

    if (currentSegments.length >= MAX_MULTI_CITY_SEGMENTS) {
      setErrorMessage(
        `You can only add up to ${MAX_MULTI_CITY_SEGMENTS} destinations.`
      );
      return;
    }
    setErrorMessage("");
    const lastSegment = currentSegments[currentSegments.length - 1];
    const lastDate = lastSegment ? new Date(lastSegment.Date) : new Date();
    const nextDate = new Date(
      lastDate.setDate(lastDate.getDate() + 3)
    ).toLocaleDateString("sv");

    setSearchData((prevData) => ({
      ...prevData,
      segments: (() => {
        const previousSegments = Array.isArray(prevData?.segments)
          ? prevData.segments.slice(0, MAX_MULTI_CITY_SEGMENTS)
          : [];

        if (previousSegments.length >= MAX_MULTI_CITY_SEGMENTS) {
          return previousSegments;
        }

        return [
          ...previousSegments,
          {
            id: previousSegments.length,
            openFrom: false,
            DepFrom: toSendData.trim(),
            depFromText: toSearchText,
            ArrTo: "DXB",
            arrToText: "Dubai Intl Airport (DXB)",
            openTo: false,
            Date: nextDate,
            openDate: false,
            open: false,
          },
        ];
      })(),
    }));
  };

  const removeCity = (index) => {
    setSearchData((prevData) => {
      if (prevData.segments.length <= 2) {
        setErrorMessage("You must have at least 2 segments.");
        return prevData;
      } else {
        setErrorMessage("");
        return {
          ...prevData,
          segments: prevData.segments.filter((_, i) => i !== index),
        };
      }
    });
  };
  const fromSuggestedText = (index, name, code, address) => {
    setSearchData((prevData) => ({
      ...prevData,
      segments: prevData.segments.map((segment, i) =>
        i === index
          ? {
              ...segment,
              DepFrom: code,
              depFromText: `${name} (${code})`,
              openFrom: false,
              openTo: true,
            }
          : segment
      ),
    }));
  };

  const toSuggestedText = (index, name, code, address) => {
    setSearchData((prevData) => {
      const updatedSegments = prevData.segments.map((segment, i) => {
        if (i === index) {
          return {
            ...segment,
            ArrTo: code,
            arrToText: `${name} (${code})`,
            openTo: false,
            openDate: true,
          };
        } else if (i > index) {
          // Update all subsequent segments' departure to match the current segment's arrival
          return {
            ...segment,
            DepFrom: code,
            depFromText: `${name} (${code})`,
          };
        }
        return segment;
      });
      return { ...prevData, segments: updatedSegments };
    });
  };

  const handleClose = () => {
    setSearchData((prevData) => ({
      ...prevData,
      segments: prevData.segments.map((segment) => ({
        ...segment,
        open: false,
        openDate: false,
        openFrom: false,
        openTo: false,
      })),
    }));
    setResult(adultCount + childCount + infant);
  };

  const formOnChange = (e, index) => {
    setOpen(false);
    const searchvalue = e.target.value;

    if (searchvalue.length > 2) {
      const suggestion = data.filter((item) =>
        item.code.toLowerCase().includes(searchvalue.toLowerCase())
      );
      updateSegmentSuggestion(index, "fromSuggest", suggestion);
      if (suggestion.length === 0) {
        const suggestion = data.filter(
          (item) =>
            item.code.toLowerCase().includes(searchvalue.toLowerCase()) ||
            item.Address.toLowerCase().includes(searchvalue.toLowerCase())
        );
        updateSegmentSuggestion(index, "fromSuggest", suggestion);
      }
    } else {
      updateSegmentSuggestion(index, "fromSuggest", initialData);
    }
  };

  const toOnChange = (e, index) => {
    const searchvalue = e.target.value;

    if (searchvalue.length > 2) {
      const suggestion = data.filter((item) =>
        item.code.toLowerCase().includes(searchvalue.toLowerCase())
      );
      updateSegmentSuggestion(index, "toSuggest", suggestion);
      if (suggestion.length === 0) {
        const suggestion = data.filter(
          (item) =>
            item.code.toLowerCase().includes(searchvalue.toLowerCase()) ||
            item.Address.toLowerCase().includes(searchvalue.toLowerCase())
        );
        updateSegmentSuggestion(index, "toSuggest", suggestion);
      }
    } else {
      updateSegmentSuggestion(index, "toSuggest", initialData);
    }
  };
  const updateSegmentSuggestion = (index, key, suggestion) => {
    const updatedSegments = [...searchData.segments];
    updatedSegments[index] = {
      ...updatedSegments[index],
      [key]: suggestion,
    };
    setSearchData({ ...searchData, segments: updatedSegments });
  };
  //   setToSendData(code);
  //   setToSearchText(`${name} (${code})`);
  //   setToSuggest([]);
  //   setToAddress(address);
  //   setOpenTo(false);
  //   setTimeout(() => setOpenDate(true), 200);
  // };

  const fromGetSuggetion = (index) => {
    const fromSuggest = searchData.segments[index]?.fromSuggest || [];

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
            fromSuggest.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  paddingLeft: "10px",
                  paddingRight: "5px",
                  backgroundColor: "var( --secondary-color)",
                  transition: "all .5s ease-in-out",
                  "&:hover": {
                    backgroundColor: "var(--primary-color)",
                    color: "var(--white)",
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
                    justifyContent: "space-between",
                  }}
                  onClick={() =>
                    fromSuggestedText(index, item.name, item.code, item.Address)
                  }
                >
                  <Box>
                    <Typography
                      className="address"
                      sx={{
                        fontSize: "12px",
                        color: "var(--primary-color)",
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
                        color: "var(--white)",
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                  <Box style={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      style={{
                        fontSize: "13px",
                        display: "block",
                        textAlign: "left",
                        paddingRight: "5px",
                        color: "#fff",
                        fontWeight: 400,
                      }}
                    >
                      {item.code}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <Box>
              <Typography
                variant="subtitle2"
                style={{
                  color: "var(--primary-color)",
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

  const toGetSuggetion = (index) => {
    const toSuggest = searchData.segments[index]?.toSuggest || [];

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
            toSuggest.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  paddingLeft: "10px",
                  paddingRight: "0px",
                  backgroundColor: "var( --secondary-color)",
                  transition: "all .5s ease-in-out",
                  "&:hover": {
                    backgroundColor: "var(--primary-color)",
                    color: "var(--white)",
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
                    justifyContent: "space-between",
                  }}
                  onClick={() => {
                    toSuggestedText(index, item.name, item.code, item.Address);
                    handleOpenTo(index);
                  }}
                >
                  <Box>
                    <Typography
                      className="address"
                      sx={{
                        fontSize: "12px",
                        color: "var(--primary-color)",
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
                        color: "var(--white)",
                        textAlign: "left",
                      }}
                    >
                      {item.name}
                    </span>
                  </Box>
                  <Box style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        paddingRight: "10px",
                        display: "block",
                        textAlign: "left",
                        color: "#fff",
                        fontWeight: 400,
                      }}
                    >
                      {item.code}
                    </span>
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <Box>
              <Typography
                variant="subtitle2"
                style={{
                  color: "var(--primary-color)",
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

  const handleClickOpen = (index) => {
    setSearchData((prevData) => ({
      ...prevData,
      segments: prevData.segments.map((segment, i) =>
        i === index
          ? {
              ...segment,
              open: !segment.open,
              openDate: false,
              openFrom: false,
              openTo: false,
            }
          : { ...segment, open: false }
      ),
    }));
  };

  // Sets the number of children.
  function adultInclement(e) {
    e.preventDefault();
    if (adultCount < 9 - (childCount + infant)) {
      setAdultCount(adultCount + 1);
    }
  }

  // Decrement the count of children.
  function adultDecrement(e) {
    e.preventDefault();
    if (adultCount > 1) {
      setAdultCount(adultCount - 1);
      if (infant === adultCount) {
        if (infant > 1) {
          setInfant(infant - 1);
        }
      }
    }
  }

  function adult2Inclement(e) {
    e.preventDefault();
    if (childCount < 9 - (adultCount + infant)) {
      setChildCount(childCount + 1);
    }
  }

  function adult2Decrement(e) {
    e.preventDefault();
    if (childCount > 0) {
      setChildCount(childCount - 1);
    }
  }

  // Increment the default value if the value is not a child.
  function infantIncrement(e) {
    e.preventDefault();
    if (infant < 9 - (adultCount + childCount)) {
      if (infant < adultCount) {
        setInfant(infant + 1);
      }
    }
  }

  // Decrement the infant by 1.
  function infantDecrement(e) {
    e.preventDefault();
    if (infant > 0) {
      setInfant(infant - 1);
    }
  }

  const handleSelectDate = (index, date) => {
    setSearchData((prevData) => {
      const newDate = new Date(date);
      let updatedSegments = prevData.segments.map((segment, i) => {
        if (i === index) {
          const prevSegmentDate =
            i > 0 ? new Date(prevData.segments[i - 1].Date) : null;
          if (prevSegmentDate && newDate < prevSegmentDate) {
            return segment; // Do not update if the selected date is earlier than the previous segment's date
          }
          return { ...segment, Date: newDate, openDate: false };
        }
        return segment;
      });

      // Update all subsequent segments if their date is before the previous segment's date
      for (let i = index + 1; i < updatedSegments.length; i++) {
        const prevDate = new Date(updatedSegments[i - 1].Date);
        const currDate = new Date(updatedSegments[i].Date);
        if (currDate < prevDate) {
          // Set to prevDate + 1 day
          const nextDate = new Date(prevDate);
          nextDate.setDate(prevDate.getDate() + 1);
          updatedSegments[i] = { ...updatedSegments[i], Date: nextDate };
        }
      }

      // Optionally, update all previous segments if their date is after the next segment's date (rare, but for consistency)
      for (let i = index - 1; i >= 0; i--) {
        const nextDate = new Date(updatedSegments[i + 1].Date);
        const currDate = new Date(updatedSegments[i].Date);
        if (currDate > nextDate) {
          // Set to nextDate - 1 day
          const prevDate = new Date(nextDate);
          prevDate.setDate(nextDate.getDate() - 1);
          updatedSegments[i] = { ...updatedSegments[i], Date: prevDate };
        }
      }

      return { ...prevData, segments: updatedSegments };
    });
  };

  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    handleClose(); // Use handleClose to close all popups
    setChangeState((prev) => !prev);
    const segments = Array.isArray(searchData?.segments)
      ? searchData.segments.slice(0, MAX_MULTI_CITY_SEGMENTS)
      : [];
    const normalizedSegments = segments
      .map((segment) => {
        const depfrom = String(segment?.DepFrom ?? "").trim().toUpperCase();
        const arrto = String(segment?.ArrTo ?? "").trim().toUpperCase();
        if (!depfrom || !arrto) {
          return null;
        }

        return {
          depfrom,
          arrto,
          depdate: format(new Date(segment?.Date), "yyyy-MM-dd"),
          depFromText: String(segment?.depFromText ?? depfrom),
          arrToText: String(segment?.arrToText ?? arrto),
        };
      })
      .filter(Boolean);
    const limitedSearchData = {
      ...searchData,
      segments,
    };

    if (normalizedSegments.length > 0) {
      const firstSegment = normalizedSegments[0];
      const lastSegment = normalizedSegments[normalizedSegments.length - 1];

      saveRecentSearch({
        tripType: valueBox || "multicity",
        fromCode: firstSegment.depfrom,
        toCode: lastSegment.arrto,
        fromLabel: firstSegment.depFromText,
        toLabel: lastSegment.arrToText,
        fromAddress: faddress,
        toAddress: toAddress,
        departureDate: firstSegment.depdate,
        returnDate:
          normalizedSegments.length > 1 ? lastSegment.depdate : "",
        adultCount,
        childCount,
        infantCount: infant,
        cabinClass: className,
        segments: normalizedSegments,
      });

      if (typeof onSearchCommitted === "function") {
        onSearchCommitted();
      }
    }

    navigate("/offers", {
      state: {
        searchData: limitedSearchData,
        segments,
        faddress,
        toAddress,
        fromSearchText,
        toSearchText,
        departureDate: format(new Date(from), "dd MMM yy"),
        arrivalDate: format(new Date(to), "dd MMM yy"),
        adultCount,
        childCount,
        infant,
        tripType,
        fromSendData,
        toSendData,
        className,
        result,
        valueBox,
        changeState,
      },
    });
    if (modifySearch && window.innerWidth <= 768) {
      toggleBanner();
    }
  };
  console.log("searchData", searchData?.segments);
  return (
    <ClickAwayListener onClickAway={handleClose}>
      <form onSubmit={handleSearch}>
        <Box>
          {searchData?.segments?.map((segment, index) => (
            <Grid container key={index} pt={{ xs: 0, sm: 0, md: 2, lg: 2 }}>
              <Grid item xs={12} sm={12} md={6} lg={6}>
                <Grid container spacing={{ xs: 3, sm: 3, md: 0, lg: 0 }}>
                  <Grid item xs={12} sm={12} md={6} lg={6}>
                    <Box
                      sx={{
                        position: "relative",
                        pt: {
                          xs: "15px",
                          sm: "15px",
                          md: "0px",
                          lg: "0px",
                        },
                      }}
                    >
                      <Box
                        onClick={() => handleOpenFrom(index)}
                        sx={{ cursor: "pointer" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "var(--text-color)",
                              fontSize: "14px",
                            }}
                          >
                            Departure
                          </Typography>
                          <DepartureIcons sx={{ fontSize: "20px" }} />
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "var(--flight-color)",
                            }}
                          >
                            {segment?.depFromText}
                          </Typography>
                        </Box>
                      </Box>
                      <Collapse
                        in={segment.openFrom}
                        timeout="auto"
                        unmountOnExit
                        sx={{ width: "100%" }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: "100%",
                            left: "0",
                            right: "0",
                            bottom: "0%",
                            width: "230px",
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
                              onChange={(e) => formOnChange(e, index)}
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
                          <Box>{fromGetSuggetion(index)}</Box>
                        </Box>
                      </Collapse>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={6} lg={6}>
                    <Box
                      onClick={() => handleOpenTo(index)}
                      sx={{
                        cursor: "pointer",
                        position: "relative",
                        borderTop: {
                          xs: "1px solid var(--primary-color)",
                          sm: "1px solid var(--primary-color)",
                          md: "none",
                          lg: "none",
                        },

                        py: { xs: "15px", sm: "15px", md: "0px", lg: "0px" },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <Typography
                          sx={{ color: "var(--text-color)", fontSize: "14px" }}
                        >
                          Arrival
                        </Typography>
                        <ArribalIcons sx={{ fontSize: "20px" }} />
                      </Box>
                      <Box sx={{ mt: "5px" }}>
                        <Typography
                          sx={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--flight-color)",
                          }}
                        >
                          {segment?.arrToText}
                        </Typography>
                      </Box>
                      <Collapse
                        in={segment.openTo}
                        timeout="auto"
                        unmountOnExit
                        sx={{ width: "230px" }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: "100%",
                            left: "0",
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
                              onChange={(e) => toOnChange(e, index)}
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
                          <Box>{toGetSuggetion(index)}</Box>
                        </Box>
                      </Collapse>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid xs={12} sm={12} md={6} lg={6}>
                <Grid
                  container
                  sx={{ pt: { xs: "15px", sm: "15px", md: "0px", lg: "0px" } }}
                >
                  <Grid item xs={12} sm={12} md={6} lg={6}>
                    <Box sx={{ position: "relative" }}>
                      <Box
                        sx={{
                          cursor: "pointer",
                          borderLeft: {
                            xs: "none",
                            sm: "none",
                            md: "1px solid var(--text-color)",
                            lg: "1px solid var(--text-color)",
                          },
                          borderTop: {
                            xs: "1px solid var(--primary-color)",
                            sm: "1px solid var(--primary-color)",
                            md: "none",
                            lg: "none",
                          },
                          borderBottom: {
                            xs:
                              index === searchData.segments.length - 1 &&
                              "1px solid var(--primary-color)",
                            sm:
                              index === searchData.segments.length - 1 &&
                              "1px solid var(--primary-color)",
                            md: "none",
                            lg: "none",
                          },
                          py: {
                            xs: "15px",
                            sm: "15px",
                            md: "0px",
                            lg: "0px",
                          },
                          pl: {
                            xs: "none",
                            sm: "none",
                            md: "20px",
                            lg: "20px",
                          },
                        }}
                        onClick={() => handleOpenDate(index)}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "var(--text-color)",
                              fontSize: "14px",
                            }}
                          >
                            Depart Date
                          </Typography>
                          <CalendarMonthIcon
                            sx={{
                              fontSize: "18px",
                              color: "var(--text-color)",
                            }}
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
                            {segment?.Date
                              ? `${format(
                                  new Date(segment?.Date),
                                  "dd MMM yy"
                                )}`
                              : "Invalid Date"}
                          </Typography>
                        </Box>
                      </Box>
                      {segment?.openDate && (
                        <Box
                          sx={{
                            position: "absolute",
                            // zIndex: 10,
                            zIndex: { md: 10, xs: 1000 },
                            top: "100%",
                            left: { xs: "auto", md: "auto", lg: "8px" },
                            // boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
                            display: "flex",
                            boxShadow: "0px 8px 8px rgba(0, 0, 0, 0.2)", // Adjusted shadow to be darker
                            border: "1px solid var(--button-color)",
                            borderRadius: "0px 0px 5px 5px",
                            bgcolor: "var(--white)",
                          }}
                        >
                          <Calendar
                            color="var(--primary-color)"
                            date={new Date(segment?.Date)}
                            onChange={(date) => handleSelectDate(index, date)}
                            months={1}
                            direction="horizontal"
                            minDate={
                              index > 0
                                ? new Date(searchData.segments[index - 1].Date)
                                : new Date()
                            }
                            style={{
                              fontSize: "11px",
                              padding: "0",
                              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  {index === 0 ? (
                    <Grid item xs={12} sm={12} md={6} lg={6}>
                      <Box
                        onClick={() => handleClickOpen(index)}
                        sx={{
                          cursor: "pointer",
                          borderLeft: {
                            xs: "none",
                            sm: "none",
                            md: "1px solid var(--text-color)",
                            lg: "1px solid var(--text-color)",
                          },
                          borderTop: {
                            xs: "1px solid var(--primary-color)",
                            sm: "1px solid var(--primary-color)",
                            md: "none",
                            lg: "none",
                          },
                          borderBottom: {
                            xs: "1px solid var(--primary-color)",
                            sm: "1px solid var(--primary-color)",
                            md: "none",
                            lg: "none",
                          },

                          pl: {
                            xs: "0px",
                            sm: "0px",
                            md: "20px",
                            lg: "20px",
                          },
                          py: {
                            xs: "15px",
                            sm: "15px",
                            md: "0px",
                            lg: "0px",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "var(--text-color)",
                              fontSize: "14px",
                            }}
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

                      {segment?.open && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: {
                              lg: "55%",
                              md: "100%",
                              sm: "100%",
                              xs: "100%",
                            },
                            right: "20.5%",
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
                                  onClick={handleClose} // Remove index argument
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
                  ) : (
                    <Grid item xs={12} sm={12} md={6} lg={6} key={segment.id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: {
                            xs: "flex-start",
                            sm: "flex-start",
                            md: "center",
                            lg: "center",
                          },
                          flexDirection: {
                            xs: "column",
                            sm: "column",
                            md: "row",
                            lg: "row",
                          },
                          gap: "30px",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: {
                              xs: "flex-start",
                              sm: "flex-start",
                              md: "center",
                              lg: "center",
                            },
                            justifyContent: "space-between",
                            gap: "10px",
                            pt: {
                              xs: "15px",
                              sm: "15px",
                              md: "0px",
                              lg: "0px",
                            },
                            width: "100%",
                          }}
                        >
                          <Tooltip title="Add City">
                            <Button
                              sx={{
                                backgroundColor: "var(--primary-button)",
                                visibility:
                                  index === searchData.segments.length - 1
                                    ? "visible"
                                    : "hidden",
                                "&:hover": {
                                  backgroundColor: "var(--primary-button)",
                                },
                                p: 0,
                              }}
                              onClick={addCity}
                            >
                              {" "}
                              <AddIcon
                                sx={{
                                  color: "white",
                                  fontSize: "23px",
                                  cursor: "pointer",
                                }}
                              />
                            </Button>
                          </Tooltip>
                          <Tooltip title="Remove City">
                            <Button
                              sx={{
                                backgroundColor: "var(--primary-button)",
                                "&:hover": {
                                  backgroundColor: "var(--primary-button)",
                                },
                                p: 0,
                              }}
                              onClick={() => removeCity(index)}
                            >
                              {" "}
                              <RemoveIcon
                                sx={{
                                  color: "white",
                                  fontSize: "23px",
                                  cursor: "pointer",
                                }}
                              />
                            </Button>
                          </Tooltip>
                        </Box>

                        {index === searchData.segments.length - 1 && (
                          <Button
                            type="submit"
                            sx={{
                              width: "100%",
                              background: "var(--primary-color)",
                              color: "var(--primary-text-color)",
                              textTransform: "capitalize",
                              borderRadius: "8px",
                              fontWeight: 600,
                              ":hover": {
                                background: "var(--primary-color)",
                                color: "var(--primary-text-color)",
                              },
                            }}
                          >
                            Search
                          </Button>
                        )}
                      </Box>
                      {errorMessage && (
                        <Typography color="error" variant="body2">
                          {errorMessage}
                        </Typography>
                      )}
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          ))}
        </Box>
      </form>
    </ClickAwayListener>
  );
};

export default MultiCity;
