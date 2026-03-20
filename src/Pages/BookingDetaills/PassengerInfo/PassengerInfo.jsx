import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import datas from "../../../Pages/fakeData/CountryList";
import { addDays, addMonths, format, subYears } from "date-fns";
import { Calendar } from "react-date-range";
import PhoneInput from "react-phone-input-2";
import Swal from "sweetalert2";
import { extractCountryDetails } from "../../../Pages/common/funcation";
import secureLocalStorage from "react-secure-storage";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { FaPassport } from "react-icons/fa";
import { FaCcVisa } from "react-icons/fa";
import HoldLoader from "../../../Shared/Loader/HoldLoader";
import SearchableDropDown from "../SearchableDropDown/SearchableDropDown";
import { config } from "../../../config";

const PassengerInfo = ({ data, airPriceData }) => {
  const token = secureLocalStorage.getItem("access_token");
  const userData = secureLocalStorage.getItem("userData");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const countryName = datas;
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const dateAfterSixMonths = data?.AllLegsInfo?.[0]?.DepDate
    ? addMonths(new Date(data.AllLegsInfo[0].DepDate), 6)
    : null; // Handle undefined case

  const dateBeforeTwelveYears = data?.AllLegsInfo?.[0]?.DepDate
    ? addMonths(new Date(data.AllLegsInfo[0].DepDate), -144)
    : null;

  const dateBeforeTwoYears = data?.AllLegsInfo?.[0]?.DepDate
    ? addMonths(new Date(data.AllLegsInfo[0].DepDate), -24)
    : null;

  // dob state adt
  const [openAdtDate, setAdtOpenDate] = useState(false);
  const [selectedAdtDate, setSelectedAdtDate] = useState(null);
  // dob state child
  const [openChildDate, setChildOpenDate] = useState(false);
  const [selectedchildDob, setSelectedchildDob] = useState(null);

  // dob infant state
  const [openInfantDate, setInfantpenDate] = useState(false);
  const [selectedInfantDob, setSelectedInfantDob] = useState(null);

  // pass state adt
  const [openAdtDatePassExp, setAdtOpenDatePassExp] = useState(false);
  const [adtDatePassExp, setAdtDatePassExp] = useState(null);
  // pass state child
  const [openChildDatePassExp, setChildOpenDatePassExp] = useState(false);
  const [childDatePassExp, setChildDatePassExp] = useState(null);

  // pass state infant
  const [openInfantDatePassExp, setInfantOpenDatePassExp] = useState(false);
  const [infantDatePassExp, setInfantDatePassExp] = useState(null);

  const safeDate = (date) => {
    const newDate = new Date(date);
    return isNaN(newDate.getTime()) ? new Date() : newDate;
  };

  const formattedDateAfterSixMonths =
    safeDate(dateAfterSixMonths).toLocaleDateString("sv");
  const formattedDateBeforeTwelveYears = safeDate(
    dateBeforeTwelveYears
  ).toLocaleDateString("sv");
  const formattedDateBeforeTwoYears =
    safeDate(dateBeforeTwoYears).toLocaleDateString("sv");
  const now = useRef(new Date());

  const adultPriceBreakdown = data?.PriceBreakDown?.find(
    (price) => price.PaxType === "Adult"
  );
  const childPriceBreakdown = data?.PriceBreakDown?.find(
    (price) => price.PaxType === "Child"
  );
  const infantPriceBreakdown = data?.PriceBreakDown?.find(
    (price) => price.PaxType === "Infant"
  );

  const [error, setError] = useState("");
  const [errorVisa, setErrorVisa] = useState("");

  const [flightPassengerData, setFlightPassengerData] = useState({
    adult: [...new Array(parseInt(adultPriceBreakdown?.PaxCount || 0))].map(
      (_, index) => ({
        type: "Adult",
        afName: "",
        atitle: "Mr",
        alName: "",
        agender: "",
        adob: format(new Date(), "dd MMM yyyy"),
        apassNation: "BD",
        apassNo: "",
        apassEx: formattedDateAfterSixMonths,
        aPassCopy: null,
        aVisaCopy: null,
        aFFNumber: "",
      })
    ),
    child: [...new Array(parseInt(childPriceBreakdown?.PaxCount || 0))].map(
      (_, index) => ({
        type: "Child",
        cfName: "",
        ctitle: "Mstr",
        clName: "",
        cgender: "",
        cdob: format(new Date(), "dd MMM yyyy"),
        cpassNation: "BD",
        cpassNo: "",
        cpassEx: formattedDateBeforeTwelveYears,
        cPassCopy: null,
        cVisaCopy: null,
        cFFNumber: "",
      })
    ),
    infant: [...new Array(parseInt(infantPriceBreakdown?.PaxCount || 0))].map(
      (_, index) => ({
        type: "Infant",
        ititle: "Mstr",
        ifName: "",
        ilName: "",
        igender: "",
        idob: format(new Date(), "dd MMM yyyy"),
        ipassNation: "BD",
        ipassNo: "",
        ipassEx: formattedDateBeforeTwoYears,
        iPassCopy: null,
        iVisaCopy: null,
        iFFNumber: "",
      })
    ),
    email: userData?.email || "",
    phone: userData?.phone || "",
    tripType: "oneway",
  });
  // adult pass and dob date funcation
  const handleSelect = (date, index) => {
    setSelectedAdtDate(date);
    setAdtOpenDate(false);

    const updatedData = [...flightPassengerData.adult];
    if (updatedData[index]) {
      updatedData[index].adob = date;
      setFlightPassengerData({
        ...flightPassengerData,
        adult: updatedData,
      });
    }
  };

  const handleSelectAdtPassExp = (date, index) => {
    setAdtDatePassExp(date);
    setAdtOpenDatePassExp(false);

    const updatedData = [...flightPassengerData.adult];
    if (updatedData[index]) {
      updatedData[index].apassEx = date;
      setFlightPassengerData({
        ...flightPassengerData,
        adult: updatedData,
      });
    }
  };

  // child dob and pass funcation
  const handleSelectChildDob = (date, index) => {
    setSelectedchildDob(date);
    setChildOpenDate(false);

    const updatedData = [...flightPassengerData.child];
    if (updatedData[index]) {
      updatedData[index].cdob = date;
      setFlightPassengerData({
        ...flightPassengerData,
        child: updatedData,
      });
    }
  };
  const handleSelectChildPassExp = (date, index) => {
    setChildDatePassExp(date);
    setChildOpenDatePassExp(false);
    const updatedData = [...flightPassengerData.child];
    if (updatedData[index]) {
      updatedData[index].cpassEx = date;
      setFlightPassengerData({
        ...flightPassengerData,
        child: updatedData,
      });
    }
  };

  // handle adult passportCopy and visacopy
  const handleAdultVisaPassCopy = async (file, index, type) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${config.baseUrl}/upload/uploadDocuments`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update the flightPassengerData with the uploaded link
        setFlightPassengerData((prevData) => {
          const updatedAdults = prevData.adult.map((adult, i) => {
            if (i === index) {
              return {
                ...adult,
                ...(type === "passport"
                  ? { aPassCopy: data.link }
                  : { aVisaCopy: data.link }),
              };
            }
            return adult;
          });
          return { ...prevData, adult: updatedAdults };
        });
      } else {
        console.error("File upload failed", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleFileAdultChange = (e, index, type) => {
    const file = e.target.files[0];

    if (file) {
      handleAdultVisaPassCopy(file, index, type);
    }
  };
  // handle chaild passportCopy and visacopy

  const handleChildVisaPassCopy = async (file, index, type) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${config.baseUrl}/upload/uploadDocuments`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update the flightPassengerData with the uploaded link
        setFlightPassengerData((prevData) => {
          const updatedAdults = prevData.child.map((child, i) => {
            if (i === index) {
              return {
                ...child,
                ...(type === "passport"
                  ? { cPassCopy: data.link }
                  : { cVisaCopy: data.link }),
              };
            }
            return child;
          });
          return { ...prevData, child: updatedAdults };
        });
      } else {
        console.error("File upload failed", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleFileChildChange = (e, index, type) => {
    const file = e.target.files[0];

    if (file) {
      handleChildVisaPassCopy(file, index, type);
    }
  };

  // handle Infant passportCopy and visacopy
  const handleInfantVisaPassCopy = async (file, index, type) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${config.baseUrl}/upload/uploadDocuments`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update the flightPassengerData with the uploaded link
        setFlightPassengerData((prevData) => {
          const updatedAdults = prevData.infant.map((infant, i) => {
            if (i === index) {
              return {
                ...infant,
                ...(type === "passport"
                  ? { iPassCopy: data.link }
                  : { iVisaCopy: data.link }),
              };
            }
            return infant;
          });
          return { ...prevData, infant: updatedAdults };
        });
      } else {
        console.error("File upload failed", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleFileInfantChange = (e, index, type) => {
    const file = e.target.files[0];

    if (file) {
      handleInfantVisaPassCopy(file, index, type);
    }
  };

  // infant dob and pass
  const handleSelectInfantDob = (date, index) => {
    setSelectedInfantDob(date);
    setInfantpenDate(false);

    const updatedData = [...flightPassengerData.infant];
    if (updatedData[index]) {
      updatedData[index].idob = date;
      setFlightPassengerData({
        ...flightPassengerData,
        infant: updatedData,
      });
    }
  };
  const handleSelectInfantPassExp = (date, index) => {
    setInfantDatePassExp(date);
    setInfantOpenDatePassExp(false);
    const updatedData = [...flightPassengerData.infant];
    if (updatedData[index]) {
      updatedData[index].ipassEx = date;
      setFlightPassengerData({
        ...flightPassengerData,
        infant: updatedData,
      });
    }
  };

  // adt pax tile
  const handleTitleChange = (index, title) => {
    const updatedData = [...flightPassengerData.adult];
    updatedData[index].atitle = title;
    setFlightPassengerData({
      ...flightPassengerData,
      adult: updatedData,
    });
  };
  // handleChildPax title
  const handleChildTitleChange = (index, title) => {
    const updatedData = [...flightPassengerData.child];
    updatedData[index].ctitle = title;
    setFlightPassengerData({
      ...flightPassengerData,
      child: updatedData,
    });
  };
  // handleInfantPax
  const handleInfantTitleChange = (index, title) => {
    const updatedData = [...flightPassengerData.infant];
    updatedData[index].ititle = title;
    setFlightPassengerData({
      ...flightPassengerData,
      infant: updatedData,
    });
  };

  const handleNationalityChange = (index, nationality) => {
    const updatedData = [...flightPassengerData.adult];
    updatedData[index].apassNation = nationality;
    setFlightPassengerData({
      ...flightPassengerData,
      adult: updatedData,
    });
  };

  // handlechild pax natinality
  const handleNationalityChildChange = (index, nationality) => {
    const updatedData = [...flightPassengerData.child];
    updatedData[index].cpassNation = nationality;
    setFlightPassengerData({
      ...flightPassengerData,
      child: updatedData,
    });
  };
  // handleInfant pax natinality
  const handleNationalityInfantChange = (index, nationality) => {
    const updatedData = [...flightPassengerData.infant];
    updatedData[index].ipassNation = nationality;
    setFlightPassengerData({
      ...flightPassengerData,
      infant: updatedData,
    });
  };

  const ResultId = data?.ResultId;
  const SearchId = data?.SearchId;

  const passportCopy = airPriceData[0]?.PassportMadatory;

  const handleFlightBooking = async (e) => {
    e.preventDefault();

    if (!agreeToTerms) {
      Swal.fire({
        title: "Error!",
        text: "You must agree to the Terms & Conditions before booking.",
        icon: "error",
      });
      return;
    }

    const passengers = [
      ...flightPassengerData.adult.map((adult, index) => {
        return {
          Title: adult.atitle,
          FirstName: adult.afName,
          LastName: adult.alName,
          PaxType: adult.type,
          DateOfBirth: adult.adob,
          Gender: adult.agender,
          PassportNumber: adult.apassNo,
          PassportExpiryDate: adult.apassEx,
          PassportNationality: adult?.apassNation,
          passport: adult.aPassCopy,
          visa: adult.aVisaCopy,
          CountryCode: adult?.apassNation,
          Nationality: adult?.apassNation,
          FFNumber: adult?.aFFNumber,
          ContactNumber: flightPassengerData?.phone,
          Email: flightPassengerData?.email,
          Address1: " ",
          IsLeadPassenger: index === 0 ? true : false,
        };
      }),
      ...flightPassengerData.child.map((child) => {
        return {
          Title: child.ctitle,
          FirstName: child.cfName,
          LastName: child.clName,
          PaxType: child.type,
          DateOfBirth: child.cdob,
          Gender: child.cgender,
          PassportNumber: child.cpassNo,
          PassportExpiryDate: child.cpassEx,
          PassportNationality: child?.cpassNation,
          passport: child.cPassCopy,
          visa: child.cVisaCopy,
          CountryCode: child?.cpassNation,
          Nationality: child?.cpassNation,
          FFNumber: child?.cFFNumber,
          ContactNumber: flightPassengerData?.phone,
          Email: flightPassengerData?.email,
          Address1: "",
          IsLeadPassenger: false,
        };
      }),
      ...flightPassengerData.infant.map((infant) => {
        return {
          Title: infant.ititle,
          FirstName: infant.ifName,
          LastName: infant.ilName,
          PaxType: infant.type,
          DateOfBirth: infant.idob,
          Gender: infant.igender,
          PassportNumber: infant.ipassNo,
          PassportExpiryDate: infant.ipassEx,
          PassportNationality: infant?.ipassNation,
          CountryCode: infant?.ipassNation,
          Nationality: infant?.ipassNation,
          passport: infant.iPassCopy,
          visa: infant.iVisaCopy,
          FFNumber: infant?.iFFNumber,
          ContactNumber: flightPassengerData?.phone,
          Email: flightPassengerData?.email,
          Address1: "",
          IsLeadPassenger: false,
        };
      }),
    ];

    const body = {
      ResultId: ResultId,
      SearchId: SearchId,
      Passengers: passengers,
    };
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to book this flight?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, book it!",
      cancelButtonText: "No, cancel!",
    });

    if (confirmResult.isConfirmed) {
      Swal.fire({
        title: "Booking in progress...",
        text: "Please wait while we process your booking.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const response = await fetch(`${config.baseUrl}/booking/api2/booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
          Swal.fire("Booked!", "Your flight has been booked.", "success").then(
            () => {
              navigate("/paymentgateway", {
                state: { paymentData: data }, // Pass the response data here
              });
            }
          );
        } else {
          Swal.fire(
            "Error!",
            `There was an error booking your flight: ${data.message}`,
            "error"
          );
        }
      } catch (error) {
        Swal.fire("Error!", "There was an error booking your flight.", "error");
        console.error("Error:", error);
      }
    }
  };

  //todo: select traveler section
  const [travellers, setTravellers] = useState([]);

  useEffect(() => {
    let url = `${config.baseUrl}/user/findAllTravelBuddy`;

    fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        let uniqueTravelers = [
          ...new Map(
            data?.travelBuddies?.map((item) => [item["document"], item])
          ).values(),
        ];
        setTravellers(uniqueTravelers);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        // Handle the error, show a message, or perform other actions
      });
  }, []);
  const handleAutoFill = (obj, index, category) => {
    const {
      dob,
      firstName,
      gender,
      lastName,
      nationality,
      passport,
      passportexp,
      paxtype,
      title,
    } = obj;

    // Clone the flightPassengerData state
    const updatedPassengerData = { ...flightPassengerData };

    // Update the appropriate category (adult, child, or infant) based on the 'category' argument
    if (updatedPassengerData[category]) {
      updatedPassengerData[category] = updatedPassengerData[category].map(
        (passenger, idx) => {
          // Check if the index matches, then update the passenger data
          if (idx === index) {
            return {
              ...passenger,
              dob: dob || passenger.dob,
              firstName: firstName || passenger.firstName,
              gender: gender || passenger.gender,
              lastName: lastName || passenger.lastName,
              nationality: nationality || passenger.nationality,
              passport: passport || passenger.passport,
              passportexp: passportexp || passenger.passportexp,
              paxtype: paxtype || passenger.paxtype,
              title: title || passenger.title,
            };
          }
          return passenger;
        }
      );
    }

    // Update email and phone if provided in the autofill object
    if (obj.email) updatedPassengerData.email = obj.email;
    if (obj.phone) updatedPassengerData.phone = obj.phone;

    // Update the state with the new passenger data
    setFlightPassengerData(updatedPassengerData);
  };

  //Adult Traveler
  const adultTravelers = travellers.filter((item) => item.paxtype === "Adult");

  const optionAdults = adultTravelers.map((x, index) => {
    if (x.paxtype === "Adult") {
      return {
        value: x,
        label: `Name:${x.title} ${x.firstName} ${x.lastName} Gender:${x.gender}  Dob:${x.dob}`,
      };
    }
  });
  //Child Traveler
  const childTravelers = travellers.filter((item) => item.paxtype === "Child");

  const optionChilds = childTravelers.map((x, index) => {
    if (x.paxtype === "Child") {
      return {
        value: x,
        label: `Name:${x.title} ${x.firstName} ${x.lastName} Gender:${x.gender}  Dob:${x.dob}`,
      };
    }
  });
  //Infant Traveler
  const infantTravelers = travellers.filter(
    (item) => item.paxtype === "Infant"
  );

  const optionInfants = infantTravelers.map((x, index) => {
    if (x.paxtype === "Infant") {
      return {
        value: x,
        label: `Name:${x.title} ${x.firstName} ${x.lastName} Gender:${x.gender}  Dob:${x.dob}`,
      };
    }
  });
  return (
    <Box>
      <Grid container>
        {loading ? (
          <Grid item xs={12} sm={12}>
            <HoldLoader />
          </Grid>
        ) : (
          <form onSubmit={handleFlightBooking}>
            {flightPassengerData?.adult?.map((adultPax, index) => (
              <Box
                key={index}
                sx={{
                  // bgcolor: "#FFFFFF",
                  // p: "30px",
                  // borderRadius: "5px",
                  mb: 2,
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={8.5} sm={8.5} md={10} lg={10}>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "13px",
                          lg: "13px",
                        },
                        color: "#444542",
                      }}
                    >
                      Search From your Favorite Traveler List
                    </Typography>
                    {travellers.length !== 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          // borderBottom: "2px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <SearchableDropDown
                          index={index}
                          handler={handleAutoFill}
                          options={optionAdults}
                          placeholder="select Traveller"
                        />
                        {/* <Select
                          placeholder="Select Traveler"
                          onChange={(item) => {
                            handleAutoFill(item.value, index);
                          }}
                          options={optionAdults}
                          className="custom-select"
                        /> */}
                        {/* <SearchableDropDown/> */}
                        {/* <input style={{ border: "none", outline: "none" }} /> */}
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={3.5} md={2} lg={2}>
                    <Box
                      sx={{
                        bgcolor: "#13406B",
                        borderRadius: "5px",
                        p: "5px",
                        // width: {xs:"20%",sm:"70%",md:"80%"},
                        width: "fit-content",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          px: "5px",
                          fontSize: {
                            xs: "11px",
                            sm: "11px",
                            md: "14px",
                            lg: "14px",
                          },
                        }}
                      >
                        ADULT #{index + 1}
                      </Typography>
                      <Typography
                        sx={{
                          bgcolor: "white",
                          px: "5px",
                          borderRadius: "50%",
                        }}
                      ></Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container spacing={2} mt={2}>
                  <Grid item xs={12} sm={12} md={12} lg={12}>
                    <Box>
                      <Button
                        sx={{
                          color:
                            adultPax.atitle === "Mr"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            adultPax.atitle === "Mr"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleTitleChange(index, "Mr")}
                      >
                        Mr
                      </Button>
                      <Button
                        sx={{
                          ml: "10px",
                          color:
                            adultPax.atitle === "Ms"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            adultPax.atitle === "Ms"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleTitleChange(index, "Ms")}
                      >
                        Ms
                      </Button>
                      <Button
                        sx={{
                          ml: "10px",
                          color:
                            adultPax.atitle === "Mrs"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            adultPax.atitle === "Mrs"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleTitleChange(index, "Mrs")}
                      >
                        Mrs
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container mt={{ xs: 2, sm: 2, md: 4, lg: 4 }} spacing={2}>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter First / Given Name
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <input
                          placeholder="Enter First / Given Name"
                          required
                          value={adultPax?.afName}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.adult];
                            updatedData[index].afName = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              adult: updatedData,
                            });
                          }}
                          style={{
                            border: "none",
                            outline: "none",
                            //   width: {
                            //   xs: "50%",
                            //   sm: "100%",
                            //   md: "80%",
                            //   lg: "80%",
                            // },
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter Last / Surname
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <input
                          placeholder="Enter Last / Surname"
                          required
                          value={adultPax?.alName}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.adult];
                            updatedData[index].alName = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              adult: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    sx={{ position: "relative" }}
                    key={index}
                  >
                    <Box onClick={() => setAdtOpenDate(index)}>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter Date of Birth
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <label
                          style={{
                            color: "#444542",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {adultPax.adob
                            ? format(new Date(adultPax.adob), "dd MMM yyy")
                            : "Select Your Date"}
                        </label>
                      </Box>
                    </Box>
                    {openAdtDate === index && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          zIndex: 1000,
                          bgcolor: "white",
                          boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                        }}
                      >
                        <Calendar
                          color="var(--primary-color)"
                          date={selectedAdtDate || new Date()}
                          onChange={(date) => handleSelect(date, index)}
                          maxDate={dateBeforeTwelveYears}
                          months={1}
                          direction="horizontal"
                          style={{
                            fontSize: "11px",
                            padding: "0",
                            boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                          }}
                        />
                      </Box>
                    )}
                  </Grid>
                </Grid>
                <Grid container mt={{ xs: 1, sm: 1, md: 4, lg: 4 }} spacing={2}>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Select Gender
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <FormControl sx={{ minWidth: 120 }}>
                          <Select
                            value={adultPax.agender}
                            required
                            onChange={(e) => {
                              const updatedData = [
                                ...flightPassengerData.adult,
                              ];
                              updatedData[index].agender = e.target.value;
                              setFlightPassengerData({
                                ...flightPassengerData,
                                adult: updatedData,
                              });
                            }}
                            displayEmpty
                            inputProps={{ "aria-label": "Select Gender" }}
                            sx={{
                              "& .MuiOutlinedInput-notchedOutline": {
                                border: "none",
                              },
                              "& .MuiInputBase-input": {
                                padding: "2px 0",
                                fontSize: "12px",
                                color: "#444542",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                          >
                            <MenuItem value="" disabled>
                              Select Gender
                            </MenuItem>
                            <MenuItem value="male">Male</MenuItem>
                            <MenuItem value="female">Female</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Select Nationality
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <FormControl>
                          <Select
                            required
                            value={adultPax.apassNation}
                            onChange={(e) =>
                              handleNationalityChange(index, e.target.value)
                            }
                            displayEmpty
                            inputProps={{ "aria-label": "Select Nationality" }}
                            sx={{
                              "& .MuiOutlinedInput-notchedOutline": {
                                border: "none",
                              },
                              "& .MuiInputBase-input": {
                                padding: "2px 0",
                                fontSize: "12px",
                                color: "#444542",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 200,
                                  width: 200,
                                },
                              },
                              anchorOrigin: {
                                vertical: "bottom",
                                horizontal: "center",
                              },
                              transformOrigin: {
                                vertical: "top",
                                horizontal: "center",
                              },
                            }}
                          >
                            <MenuItem value={adultPax.apassNation}>
                              {adultPax.apassNation === "BD"
                                ? "Bangladesh (BD)"
                                : "Bangladesh (BD)"}
                            </MenuItem>
                            {countryName?.map((country, index) => (
                              <MenuItem key={index} value={country?.code}>
                                {country?.name} ({country?.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>
                  {passportCopy === true && (
                    <>
                      <Grid item xs={12} sm={12} md={4} lg={4} mb={0.5}>
                        <Box>
                          <Typography
                            sx={{ fontSize: "13px", color: "#444542" }}
                          >
                            Enter Passport Number
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              mt: "12px",
                              flexDirection: "column",
                              borderBottom: "1px solid #ACA6A6",
                              width: {
                                xs: "100%",
                                sm: "100%",
                                md: "80%",
                                lg: "80%",
                              },
                              paddingBottom: "5px",
                            }}
                          >
                            <input
                              placeholder="Enter Passport Number"
                              required
                              value={adultPax.apassNo}
                              onChange={(e) => {
                                const updatedData = [
                                  ...flightPassengerData.adult,
                                ];
                                updatedData[index].apassNo = e.target.value;
                                setFlightPassengerData({
                                  ...flightPassengerData,
                                  adult: updatedData,
                                });
                              }}
                              style={{
                                border: "none",
                                outline: "none",
                              }}
                            />
                          </Box>
                        </Box>
                      </Grid>
                      <Grid
                        item
                        xs={12}
                        sm={12}
                        md={4}
                        lg={4}
                        mt={2}
                        sx={{ position: "relative" }}
                        key={index}
                      >
                        <Box onClick={() => setAdtOpenDatePassExp(index)}>
                          <Typography
                            sx={{ fontSize: "13px", color: "#444542" }}
                          >
                            Enter Passport Expire Date
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              mt: "10px",
                              flexDirection: "column",
                              borderBottom: "1px solid #ACA6A6",
                              paddingBottom: "5px",
                              width: {
                                xs: "100%",
                                sm: "100%",
                                md: "80%",
                                lg: "80%",
                              },
                            }}
                          >
                            <label
                              style={{
                                color: "#444542",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {adultPax.apassEx
                                ? format(
                                    new Date(adultPax.apassEx),
                                    "dd MMM yyy"
                                  )
                                : "Select Date"}
                            </label>
                          </Box>
                        </Box>
                        {openAdtDatePassExp === index && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              zIndex: 1000,
                              bgcolor: "white",
                              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                            }}
                          >
                            <Calendar
                              color="var(--primary-color)"
                              date={adtDatePassExp || new Date()}
                              onChange={(date) =>
                                handleSelectAdtPassExp(date, index)
                              }
                              months={1}
                              direction="horizontal"
                              style={{
                                fontSize: "11px",
                                padding: "0",
                                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                              }}
                            />
                          </Box>
                        )}
                      </Grid>
                    </>
                  )}

                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    mt={passportCopy === true ? 2 : 0.5}
                  >
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Frequent Flyer Number (Optional)
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "4px",
                        }}
                      >
                        <input
                          placeholder="Enter Your FF Number"
                          value={adultPax?.aFFNumber}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.adult];
                            updatedData[index].aFFNumber = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              adult: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
                {passportCopy === true && (
                  <Grid
                    container
                    spacing={2}
                    mt={{ xs: 1, sm: 1, md: 4, lg: 2 }}
                  >
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      mt={2}
                      key={index}
                      mb={0.5}
                    >
                      <Box sx={{ mx: "auto" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "#444542",
                            mb: "10px",
                          }}
                        >
                          Photo of Passport
                        </Typography>
                        <Card
                          variant="outlined"
                          sx={{ borderStyle: "dashed", textAlign: "center" }}
                        >
                          <CardContent>
                            {adultPax.aPassCopy ? (
                              // If aPassCopy is already a URL (from the uploaded image), use it directly
                              typeof adultPax.aPassCopy === "string" ? (
                                <img
                                  src={adultPax.aPassCopy}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              ) : (
                                // If aPassCopy is a file, use createObjectURL
                                <img
                                  src={URL.createObjectURL(adultPax.aPassCopy)}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              )
                            ) : (
                              <FaPassport
                                style={{
                                  fontSize: 64,
                                  color: "var(--primary-button)",
                                  mb: 2,
                                  mt: 2,
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                mb: 1,
                                mt: 2,
                                fontSize: "13px",
                                color: "#444542",
                              }}
                            >
                              Upload a photo of the front page of your passport
                            </Typography>
                            <Button
                              sx={{
                                mt: 2,
                                background: "var(--primary-button)",
                                color: "white",
                                ":hover": {
                                  background: "var(--primary-button)",
                                  color: "white",
                                },
                                textTransform: "capitalize",
                              }}
                              component="label"
                            >
                              {adultPax.aPassCopy ? "Change" : "Select Photo"}
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg, image/png,image/jpg"
                                onChange={(e) =>
                                  handleFileAdultChange(e, index, "passport")
                                }
                              />
                            </Button>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              JPG/JPEG/PNG
                            </Typography>
                          </CardContent>
                        </Card>

                        {error && (
                          <Typography
                            color="error"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {error}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      mt={2}
                      key={index}
                      mb={0.5}
                    >
                      <Box sx={{ mx: "auto" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "#444542",
                            mb: "10px",
                          }}
                        >
                          Photo of Visa
                        </Typography>
                        <Card
                          variant="outlined"
                          sx={{ borderStyle: "dashed", textAlign: "center" }}
                        >
                          <CardContent>
                            {adultPax.aVisaCopy ? (
                              // If aPassCopy is already a URL (from the uploaded image), use it directly
                              typeof adultPax.aVisaCopy === "string" ? (
                                <img
                                  src={adultPax.aVisaCopy}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              ) : (
                                // If aPassCopy is a file, use createObjectURL
                                <img
                                  src={URL.createObjectURL(adultPax.aVisaCopy)}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              )
                            ) : (
                              <FaCcVisa
                                style={{
                                  fontSize: 64,
                                  color: "var(--primary-button)",
                                  mb: 2,
                                  mt: 2,
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                mb: 1,
                                mt: 2,
                                fontSize: "13px",
                                color: "#444542",
                              }}
                            >
                              Upload a photo of the front page of your Visa Copy
                            </Typography>
                            <Button
                              sx={{
                                mt: 2,
                                background: "var(--primary-button)",
                                color: "white",
                                ":hover": {
                                  background: "var(--primary-button)",
                                  color: "white",
                                },
                                textTransform: "capitalize",
                              }}
                              component="label"
                            >
                              {adultPax.aVisaCopy ? "Change" : "Select Photo"}
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg, image/png"
                                onChange={(e) =>
                                  handleFileAdultChange(e, index, "visa")
                                }
                              />
                            </Button>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              JPG/JPEG/PNG
                            </Typography>
                          </CardContent>
                        </Card>

                        {errorVisa && (
                          <Typography
                            color="error"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {errorVisa}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Box>
            ))}

            {flightPassengerData?.child?.map((childPax, index) => (
              <Box
                key={index}
                sx={{
                  // bgcolor: "#FFFFFF",
                  // p: "30px",
                  // borderRadius: "5px",
                  mb: 2,
                }}
              >
                <Grid container spacing={2}>
                  <Grid
                    xs={8.5}
                    sm={8.5}
                    md={10}
                    lg={10}
                    sx={{
                      px: "20px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "13px",
                          lg: "13px",
                        },
                        color: "#444542",
                      }}
                    >
                      Search From your Favorite Traveler List
                    </Typography>
                    {travellers.length !== 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          // borderBottom: "2px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <SearchableDropDown
                          index={index}
                          handler={handleAutoFill}
                          options={optionChilds}
                          placeholder="select Traveller"
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={3.5} md={2} lg={2}>
                    <Box
                      sx={{
                        bgcolor: "#13406B",
                        borderRadius: "5px",
                        p: "5px",
                        width: "fit-content",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          px: "5px",
                          fontSize: {
                            xs: "11px",
                            sm: "11px",
                            md: "14px",
                            lg: "14px",
                          },
                        }}
                      >
                        CHILD #{index + 1}
                      </Typography>
                      <Typography
                        sx={{
                          bgcolor: "white",
                          px: "5px",
                          borderRadius: "50%",
                        }}
                      ></Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container spacing={2} mt={2}>
                  <Grid item xs={12} sm={12} md={12} lg={12}>
                    <Box>
                      <Button
                        sx={{
                          color:
                            childPax.ctitle === "Mstr"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            childPax.ctitle === "Mstr"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleChildTitleChange(index, "Mstr")}
                      >
                        Mstr
                      </Button>
                      <Button
                        sx={{
                          ml: "10px",
                          color:
                            childPax.ctitle === "Miss"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            childPax.ctitle === "Miss"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleChildTitleChange(index, "Miss")}
                      >
                        Miss
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container mt={{ xs: 2, sm: 2, md: 4, lg: 4 }} spacing={2}>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter First / Given Name
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <input
                          placeholder="Enter First / Given Name"
                          required
                          value={childPax?.cfName}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.child];
                            updatedData[index].cfName = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              child: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter Last / Surname
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <input
                          placeholder="Enter Last / Surname"
                          required
                          value={childPax?.clName}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.child];
                            updatedData[index].clName = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              child: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    sx={{ position: "relative" }}
                    key={index}
                  >
                    <Box onClick={() => setChildOpenDate(index)}>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter Date of Birth
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <label
                          style={{
                            color: "#444542",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {format(new Date(childPax.cdob), "dd MMM yyy")}
                        </label>
                      </Box>
                    </Box>
                    {openChildDate === index && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          zIndex: 1000,
                          bgcolor: "white",
                          boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                        }}
                      >
                        <Calendar
                          color="var(--primary-color)"
                          date={selectedchildDob || new Date()}
                          onChange={(date) => handleSelectChildDob(date, index)}
                          months={1}
                          direction="horizontal"
                          maxDate={dateBeforeTwoYears}
                          minDate={dateBeforeTwelveYears}
                          style={{
                            fontSize: "11px",
                            padding: "0",
                            boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                          }}
                        />
                      </Box>
                    )}
                  </Grid>
                </Grid>
                <Grid container mt={{ xs: 1, sm: 1, md: 4, lg: 4 }} spacing={2}>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Select Gender
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <FormControl sx={{ minWidth: 120 }}>
                          <Select
                            value={childPax.cgender}
                            required
                            onChange={(e) => {
                              const updatedData = [
                                ...flightPassengerData.child,
                              ];
                              updatedData[index].cgender = e.target.value;
                              setFlightPassengerData({
                                ...flightPassengerData,
                                child: updatedData,
                              });
                            }}
                            displayEmpty
                            inputProps={{ "aria-label": "Select Gender" }}
                            sx={{
                              "& .MuiOutlinedInput-notchedOutline": {
                                border: "none",
                              },
                              "& .MuiInputBase-input": {
                                padding: "2px 0",
                                fontSize: "12px",
                                color: "#444542",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                          >
                            <MenuItem value="" disabled>
                              Select Gender
                            </MenuItem>
                            <MenuItem value="male">Male</MenuItem>
                            <MenuItem value="female">Female</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Select Nationality
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <FormControl>
                          <Select
                            required
                            value={childPax.cpassNation}
                            onChange={(e) =>
                              handleNationalityChildChange(
                                index,
                                e.target.value
                              )
                            }
                            displayEmpty
                            inputProps={{ "aria-label": "Select Nationality" }}
                            sx={{
                              "& .MuiOutlinedInput-notchedOutline": {
                                border: "none",
                              },
                              "& .MuiInputBase-input": {
                                padding: "2px 0",
                                fontSize: "12px",
                                color: "#444542",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 200,
                                  width: 200,
                                },
                              },
                              anchorOrigin: {
                                vertical: "bottom",
                                horizontal: "center",
                              },
                              transformOrigin: {
                                vertical: "top",
                                horizontal: "center",
                              },
                            }}
                          >
                            <MenuItem value={childPax.cpassNation}>
                              {childPax.cpassNation === "BD"
                                ? "Bangladesh (BD)"
                                : "Bangladesh (BD)"}
                            </MenuItem>
                            {countryName?.map((country, index) => (
                              <MenuItem
                                key={index}
                                value={`${country.name} (${country?.code})`}
                              >
                                {country?.name} ({country?.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>

                  {passportCopy === true && (
                    <>
                      <Grid item xs={12} sm={12} md={4} lg={4} mb={0.5}>
                        <Box>
                          <Typography
                            sx={{ fontSize: "13px", color: "#444542" }}
                          >
                            Enter Passport Number
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              mt: "12px",
                              flexDirection: "column",
                              borderBottom: "1px solid #ACA6A6",
                              width: {
                                xs: "100%",
                                sm: "100%",
                                md: "80%",
                                lg: "80%",
                              },
                              paddingBottom: "5px",
                            }}
                          >
                            <input
                              placeholder="Enter Passport Number"
                              required
                              value={childPax.cpassNo}
                              onChange={(e) => {
                                const updatedData = [
                                  ...flightPassengerData.child,
                                ];
                                updatedData[index].cpassNo = e.target.value;
                                setFlightPassengerData({
                                  ...flightPassengerData,
                                  child: updatedData,
                                });
                              }}
                              style={{
                                border: "none",
                                outline: "none",
                              }}
                            />
                          </Box>
                        </Box>
                      </Grid>

                      <Grid
                        item
                        xs={12}
                        sm={12}
                        md={4}
                        lg={4}
                        mt={2}
                        sx={{ position: "relative" }}
                        key={index}
                      >
                        <Box onClick={() => setChildOpenDatePassExp(index)}>
                          <Typography
                            sx={{ fontSize: "13px", color: "#444542" }}
                          >
                            Enter Passport Expire Date
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              mt: "10px",
                              flexDirection: "column",
                              borderBottom: "1px solid #ACA6A6",
                              paddingBottom: "5px",
                              width: {
                                xs: "100%",
                                sm: "100%",
                                md: "80%",
                                lg: "80%",
                              },
                            }}
                          >
                            <label
                              style={{
                                color: "#444542",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {format(new Date(childPax.cpassEx), "dd MMM yyy")}
                            </label>
                          </Box>
                        </Box>
                        {openChildDatePassExp === index && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              zIndex: 1000,
                              bgcolor: "white",
                              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                            }}
                          >
                            <Calendar
                              color="var(--primary-color)"
                              date={childDatePassExp || new Date()}
                              onChange={(date) =>
                                handleSelectChildPassExp(date, index)
                              }
                              months={1}
                              direction="horizontal"
                              style={{
                                fontSize: "11px",
                                padding: "0",
                                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                              }}
                            />
                          </Box>
                        )}
                      </Grid>
                    </>
                  )}

                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    mt={passportCopy === true ? 2 : 0.5}
                  >
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Frequent Flyer Number (Optional)
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "4px",
                        }}
                      >
                        <input
                          placeholder="Enter Your FF Number"
                          value={childPax?.cFFNumber}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.child];
                            updatedData[index].cFFNumber = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              child: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
                {passportCopy === true && (
                  <Grid
                    container
                    spacing={2}
                    mt={{ xs: 1, sm: 1, md: 4, lg: 2 }}
                  >
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      mt={2}
                      key={index}
                      mb={0.5}
                    >
                      <Box sx={{ mx: "auto" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "#444542",
                            mb: "10px",
                          }}
                        >
                          Photo of Passport
                        </Typography>
                        <Card
                          variant="outlined"
                          sx={{ borderStyle: "dashed", textAlign: "center" }}
                        >
                          <CardContent>
                            {childPax.cPassCopy ? (
                              // If aPassCopy is already a URL (from the uploaded image), use it directly
                              typeof childPax.cPassCopy === "string" ? (
                                <img
                                  src={childPax.cPassCopy}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              ) : (
                                // If aPassCopy is a file, use createObjectURL
                                <img
                                  src={URL.createObjectURL(childPax.cPassCopy)}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              )
                            ) : (
                              <FaPassport
                                style={{
                                  fontSize: 64,
                                  color: "var(--primary-button)",
                                  mb: 2,
                                  mt: 2,
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                mb: 1,
                                mt: 2,
                                fontSize: "13px",
                                color: "#444542",
                              }}
                            >
                              Upload a photo of the front page of your passport
                            </Typography>
                            <Button
                              sx={{
                                mt: 2,
                                background: "var(--primary-button)",
                                color: "white",
                                ":hover": {
                                  background: "var(--primary-button)",
                                  color: "white",
                                },
                                textTransform: "capitalize",
                              }}
                              component="label"
                            >
                              {childPax.cPassCopy ? "Change" : "Select Photo"}
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg, image/png,image/jpg"
                                onChange={(e) =>
                                  handleFileChildChange(e, index, "passport")
                                }
                              />
                            </Button>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              JPG/JPEG/PNG
                            </Typography>
                          </CardContent>
                        </Card>

                        {error && (
                          <Typography
                            color="error"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {error}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      mt={2}
                      key={index}
                      mb={0.5}
                    >
                      <Box sx={{ mx: "auto" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "#444542",
                            mb: "10px",
                          }}
                        >
                          Photo of Visa
                        </Typography>
                        <Card
                          variant="outlined"
                          sx={{ borderStyle: "dashed", textAlign: "center" }}
                        >
                          <CardContent>
                            {childPax.cVisaCopy ? (
                              typeof childPax.cVisaCopy === "string" ? (
                                <img
                                  src={childPax.cVisaCopy}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              ) : (
                                <img
                                  src={URL.createObjectURL(childPax.cVisaCopy)}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              )
                            ) : (
                              <FaCcVisa
                                style={{
                                  fontSize: 64,
                                  color: "var(--primary-button)",
                                  mb: 2,
                                  mt: 2,
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                mb: 1,
                                mt: 2,
                                fontSize: "13px",
                                color: "#444542",
                              }}
                            >
                              Upload a photo of the front page of your Visa Copy
                            </Typography>
                            <Button
                              sx={{
                                mt: 2,
                                background: "var(--primary-button)",
                                color: "white",
                                ":hover": {
                                  background: "var(--primary-button)",
                                  color: "white",
                                },
                                textTransform: "capitalize",
                              }}
                              component="label"
                            >
                              {childPax.cVisaCopy ? "Change" : "Select Photo"}
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg, image/png"
                                onChange={(e) =>
                                  handleFileChildChange(e, index, "visa")
                                }
                              />
                            </Button>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              JPG/JPEG/PNG
                            </Typography>
                          </CardContent>
                        </Card>

                        {errorVisa && (
                          <Typography
                            color="error"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {errorVisa}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Box>
            ))}
            {flightPassengerData?.infant?.map((infantPax, index) => (
              <Box
                key={index}
                sx={{
                  // bgcolor: "#FFFFFF",
                  // p: "30px",
                  // borderRadius: "5px",
                  mb: 2,
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={8.5} sm={8.5} md={10} lg={10}>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "13px",
                          lg: "13px",
                        },
                        color: "#444542",
                      }}
                    >
                      Search From your Favorite Traveler List
                    </Typography>
                    {travellers.length !== 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          // borderBottom: "2px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <SearchableDropDown
                          index={index}
                          handler={handleAutoFill}
                          options={optionInfants}
                          placeholder="select Traveller"
                        />
                      </Box>
                    )}
                    {/* <Box
                      sx={{
                        display: "flex",
                        mt: "10px",
                        flexDirection: "column",
                        borderBottom: "2px solid #ACA6A6",
                        width: {
                          xs: "100%",
                          sm: "100%",
                          md: "80%",
                          lg: "80%",
                        },
                      }}
                    >
                      <input style={{ border: "none", outline: "none" }} />
                    </Box> */}
                  </Grid>
                  <Grid item xs={12} sm={3.5} md={2} lg={2}>
                    <Box
                      sx={{
                        bgcolor: "#13406B",
                        borderRadius: "5px",
                        p: "5px",
                        width: "fit-content",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          px: "5px",
                          fontSize: {
                            xs: "11px",
                            sm: "11px",
                            md: "14px",
                            lg: "14px",
                          },
                        }}
                      >
                        INFANT #{index + 1}
                      </Typography>
                      <Typography
                        sx={{
                          bgcolor: "white",
                          px: "5px",
                          borderRadius: "50%",
                        }}
                      ></Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container spacing={2} mt={2}>
                  <Grid item xs={12} sm={12} md={12} lg={12}>
                    <Box>
                      <Button
                        sx={{
                          color:
                            infantPax.ititle === "Mstr"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            infantPax.ititle === "Mstr"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleInfantTitleChange(index, "Mstr")}
                      >
                        Mstr
                      </Button>
                      <Button
                        sx={{
                          ml: "10px",
                          color:
                            infantPax.ititle === "Miss"
                              ? "white"
                              : "var(--primary-button)",
                          border: "1px solid var(--primary-button)",
                          textTransform: "capitalize",
                          bgcolor:
                            infantPax.ititle === "Miss"
                              ? "var(--primary-button)"
                              : "transparent",
                          ":hover": {
                            bgcolor: "var(--primary-button)",
                            color: "white",
                          },
                        }}
                        onClick={() => handleInfantTitleChange(index, "Miss")}
                      >
                        Miss
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container mt={{ xs: 2, sm: 2, md: 4, lg: 4 }} spacing={2}>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter First / Given Name
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <input
                          placeholder="Enter First / Given Name"
                          required
                          value={infantPax?.ifName}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.infant];
                            updatedData[index].ifName = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              infant: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter Last / Surname
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <input
                          placeholder="Enter Last / Surname"
                          required
                          value={infantPax?.ilName}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.infant];
                            updatedData[index].ilName = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              infant: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    sx={{ position: "relative" }}
                    key={index}
                  >
                    <Box onClick={() => setInfantpenDate(index)}>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Enter Date of Birth
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "5px",
                        }}
                      >
                        <label
                          style={{
                            color: "#444542",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {format(new Date(infantPax.idob), "dd MMM yyy")}
                        </label>
                      </Box>
                    </Box>
                    {openInfantDate === index && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          zIndex: 1000,
                          bgcolor: "white",
                          boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                        }}
                      >
                        <Calendar
                          color="var(--primary-color)"
                          date={selectedInfantDob || new Date()}
                          onChange={(date) =>
                            handleSelectInfantDob(date, index)
                          }
                          maxDate={new Date(data.AllLegsInfo[0].DepDate)}
                          minDate={dateBeforeTwoYears}
                          months={1}
                          direction="horizontal"
                          style={{
                            fontSize: "11px",
                            padding: "0",
                            boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                          }}
                        />
                      </Box>
                    )}
                  </Grid>
                </Grid>
                <Grid container mt={{ xs: 1, sm: 1, md: 4, lg: 4 }} spacing={2}>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Select Gender
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <FormControl sx={{ minWidth: 120 }}>
                          <Select
                            value={infantPax.igender}
                            required
                            onChange={(e) => {
                              const updatedData = [
                                ...flightPassengerData.infant,
                              ];
                              updatedData[index].igender = e.target.value;
                              setFlightPassengerData({
                                ...flightPassengerData,
                                infant: updatedData,
                              });
                            }}
                            displayEmpty
                            inputProps={{ "aria-label": "Select Gender" }}
                            sx={{
                              "& .MuiOutlinedInput-notchedOutline": {
                                border: "none",
                              },
                              "& .MuiInputBase-input": {
                                padding: "2px 0",
                                fontSize: "12px",
                                color: "#444542",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                          >
                            <MenuItem value="" disabled>
                              Select Gender
                            </MenuItem>
                            <MenuItem value="male">Male</MenuItem>
                            <MenuItem value="female">Female</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4}>
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Select Nationality
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                        }}
                      >
                        <FormControl>
                          <Select
                            required
                            value={infantPax.ipassNation}
                            onChange={(e) =>
                              handleNationalityInfantChange(
                                index,
                                e.target.value
                              )
                            }
                            displayEmpty
                            inputProps={{ "aria-label": "Select Nationality" }}
                            sx={{
                              "& .MuiOutlinedInput-notchedOutline": {
                                border: "none",
                              },
                              "& .MuiInputBase-input": {
                                padding: "2px 0",
                                fontSize: "12px",
                                color: "#444542",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  border: "none",
                                },
                            }}
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 200,
                                  width: 200,
                                },
                              },
                              anchorOrigin: {
                                vertical: "bottom",
                                horizontal: "center",
                              },
                              transformOrigin: {
                                vertical: "top",
                                horizontal: "center",
                              },
                            }}
                          >
                            <MenuItem value={infantPax.ipassNation}>
                              {infantPax.ipassNation === "BD"
                                ? "Bangladesh (BD)"
                                : "Bangladesh (BD)"}
                            </MenuItem>
                            {countryName?.map((country, index) => (
                              <MenuItem
                                key={index}
                                value={`${country.name} (${country?.code})`}
                              >
                                {country?.name} ({country?.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>

                  {passportCopy === true && (
                    <>
                      <Grid item xs={12} sm={12} md={4} lg={4} mb={0.5}>
                        <Box>
                          <Typography
                            sx={{ fontSize: "13px", color: "#444542" }}
                          >
                            Enter Passport Number
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              mt: "12px",
                              flexDirection: "column",
                              borderBottom: "1px solid #ACA6A6",
                              width: {
                                xs: "100%",
                                sm: "100%",
                                md: "80%",
                                lg: "80%",
                              },
                              paddingBottom: "5px",
                            }}
                          >
                            <input
                              placeholder="Enter Passport Number"
                              required
                              value={infantPax.ipassNo}
                              onChange={(e) => {
                                const updatedData = [
                                  ...flightPassengerData.infant,
                                ];
                                updatedData[index].ipassNo = e.target.value;
                                setFlightPassengerData({
                                  ...flightPassengerData,
                                  infant: updatedData,
                                });
                              }}
                              style={{
                                border: "none",
                                outline: "none",
                              }}
                            />
                          </Box>
                        </Box>
                      </Grid>

                      <Grid
                        item
                        xs={12}
                        sm={12}
                        md={4}
                        lg={4}
                        mt={2}
                        sx={{ position: "relative" }}
                        key={index}
                      >
                        <Box onClick={() => setInfantOpenDatePassExp(index)}>
                          <Typography
                            sx={{ fontSize: "13px", color: "#444542" }}
                          >
                            Enter Passport Expire Date
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              mt: "10px",
                              flexDirection: "column",
                              borderBottom: "1px solid #ACA6A6",
                              paddingBottom: "5px",
                              width: {
                                xs: "100%",
                                sm: "100%",
                                md: "80%",
                                lg: "80%",
                              },
                            }}
                          >
                            <label
                              style={{
                                color: "#444542",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {format(
                                new Date(infantPax.ipassEx),
                                "dd MMM yyy"
                              )}
                            </label>
                          </Box>
                        </Box>
                        {openInfantDatePassExp === index && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              zIndex: 1000,
                              bgcolor: "white",
                              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                            }}
                          >
                            <Calendar
                              color="var(--primary-color)"
                              date={infantDatePassExp || new Date()}
                              onChange={(date) =>
                                handleSelectInfantPassExp(date, index)
                              }
                              months={1}
                              direction="horizontal"
                              style={{
                                fontSize: "11px",
                                padding: "0",
                                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                              }}
                            />
                          </Box>
                        )}
                      </Grid>
                    </>
                  )}

                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                    mt={passportCopy === true ? 2 : 0.5}
                  >
                    <Box>
                      <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                        Frequent Flyer Number (Optional)
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          mt: "10px",
                          flexDirection: "column",
                          borderBottom: "1px solid #ACA6A6",
                          width: {
                            xs: "100%",
                            sm: "100%",
                            md: "80%",
                            lg: "80%",
                          },
                          paddingBottom: "4px",
                        }}
                      >
                        <input
                          placeholder="Enter Your FF Number"
                          value={infantPax?.iFFNumber}
                          onChange={(e) => {
                            const updatedData = [...flightPassengerData.infant];
                            updatedData[index].iFFNumber = e.target.value;
                            setFlightPassengerData({
                              ...flightPassengerData,
                              iFFNumber: updatedData,
                            });
                          }}
                          style={{ border: "none", outline: "none" }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
                {passportCopy === true && (
                  <Grid
                    container
                    spacing={2}
                    mt={{ xs: 1, sm: 1, md: 4, lg: 2 }}
                  >
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      mt={2}
                      key={index}
                      mb={0.5}
                    >
                      <Box sx={{ mx: "auto" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "#444542",
                            mb: "10px",
                          }}
                        >
                          Photo of Passport
                        </Typography>
                        <Card
                          variant="outlined"
                          sx={{ borderStyle: "dashed", textAlign: "center" }}
                        >
                          <CardContent>
                            {infantPax.iPassCopy ? (
                              typeof infantPax.iPassCopy === "string" ? (
                                <img
                                  src={infantPax.iPassCopy}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              ) : (
                                <img
                                  src={URL.createObjectURL(infantPax.iPassCopy)}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              )
                            ) : (
                              <FaPassport
                                style={{
                                  fontSize: 64,
                                  color: "var(--primary-button)",
                                  mb: 2,
                                  mt: 2,
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                mb: 1,
                                mt: 2,
                                fontSize: "13px",
                                color: "#444542",
                              }}
                            >
                              Upload a photo of the front page of your passport
                            </Typography>
                            <Button
                              sx={{
                                mt: 2,
                                background: "var(--primary-button)",
                                color: "white",
                                ":hover": {
                                  background: "var(--primary-button)",
                                  color: "white",
                                },
                                textTransform: "capitalize",
                              }}
                              component="label"
                            >
                              {infantPax.iPassCopy ? "Change" : "Select Photo"}
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg, image/png,image/jpg"
                                onChange={(e) =>
                                  handleFileInfantChange(e, index, "passport")
                                }
                              />
                            </Button>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              JPG/JPEG/PNG
                            </Typography>
                          </CardContent>
                        </Card>

                        {error && (
                          <Typography
                            color="error"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {error}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={4}
                      lg={4}
                      mt={2}
                      key={index}
                      mb={0.5}
                    >
                      <Box sx={{ mx: "auto" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: "#444542",
                            mb: "10px",
                          }}
                        >
                          Photo of Visa
                        </Typography>
                        <Card
                          variant="outlined"
                          sx={{ borderStyle: "dashed", textAlign: "center" }}
                        >
                          <CardContent>
                            {infantPax.iVisaCopy ? (
                              // If aPassCopy is already a URL (from the uploaded image), use it directly
                              typeof infantPax.iVisaCopy === "string" ? (
                                <img
                                  src={infantPax.iVisaCopy}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              ) : (
                                // If aPassCopy is a file, use createObjectURL
                                <img
                                  src={URL.createObjectURL(infantPax.iVisaCopy)}
                                  alt="Passport Preview"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    marginBottom: "16px",
                                  }}
                                />
                              )
                            ) : (
                              <FaCcVisa
                                style={{
                                  fontSize: 64,
                                  color: "var(--primary-button)",
                                  mb: 2,
                                  mt: 2,
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                mb: 1,
                                mt: 2,
                                fontSize: "13px",
                                color: "#444542",
                              }}
                            >
                              Upload a photo of the front page of your Visa Copy
                            </Typography>
                            <Button
                              sx={{
                                mt: 2,
                                background: "var(--primary-button)",
                                color: "white",
                                ":hover": {
                                  background: "var(--primary-button)",
                                  color: "white",
                                },
                                textTransform: "capitalize",
                              }}
                              component="label"
                            >
                              {infantPax.iVisaCopy ? "Change" : "Select Photo"}
                              <input
                                type="file"
                                hidden
                                accept="image/jpeg, image/png"
                                onChange={(e) =>
                                  handleFileInfantChange(e, index, "visa")
                                }
                              />
                            </Button>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              JPG/JPEG/PNG
                            </Typography>
                          </CardContent>
                        </Card>

                        {errorVisa && (
                          <Typography
                            color="error"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {errorVisa}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Box>
            ))}

            <Grid
              container
              my={2}
              sx={{
                bgcolor: "#FFFFFF",
                p: { md: "30px" },
                borderRadius: "5px",

                mb: { xs: 1, sm: 1, md: 2, lg: 2 },
              }}
            >
              <Grid
                item
                xs={12}
                sm={12}
                md={12}
                lg={12}
                mb={{ xs: 1, sm: 1, md: 3, lg: 3 }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "18px",
                    color: "var(--primary-button)",
                  }}
                >
                  Contact Details
                </Typography>
              </Grid>
              <Grid
                item
                xs={12}
                sm={12}
                md={4}
                lg={4}
                mt={{ xs: 1, sm: 1, md: 3, lg: 3 }}
              >
                <Box>
                  <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                    Enter Email
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      mt: "10px",
                      flexDirection: "column",
                      borderBottom: "1px solid #ACA6A6",
                      width: {
                        xs: "90%",
                        sm: "100%",
                        md: "70%",
                        lg: "70%",
                      },
                      paddingBottom: "5px",
                    }}
                  >
                    <input
                      type="email"
                      placeholder="Enter Your Email"
                      value={flightPassengerData.email}
                      onChange={(e) => {
                        const { value } = e.target;
                        setFlightPassengerData((prevData) => ({
                          ...prevData,
                          email: value,
                        }));
                      }}
                      style={{
                        border: "none",
                        outline: "none",
                        fontSize: "12px",
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={4} lg={4} mt={2}>
                <Box>
                  <Typography sx={{ fontSize: "13px", color: "#444542" }}>
                    Enter Phone Number
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      mt: "0px",
                      flexDirection: "column",
                      borderBottom: "1px solid #ACA6A6",
                      width: {
                        xs: "90%",
                        sm: "100%",
                        md: "70%",
                        lg: "70%",
                      },
                    }}
                  >
                    <PhoneInput
                      style={{
                        border: "none !important",
                        outline: "none",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                      inputStyle={{
                        border: "none",
                        boxShadow: "none",
                        outline: "none",
                        fontSize: "12px",
                      }}
                      buttonStyle={{
                        border: "none",
                        boxShadow: "none",
                        background: "none",
                      }}
                      country={"bd"}
                      inputProps={{
                        name: "phone",
                      }}
                      value={flightPassengerData.phone.replace(/\s/g, "")}
                      onChange={(phone) =>
                        setFlightPassengerData((prevData) => ({
                          ...prevData,
                          phone: phone.replace(/\s/g, ""),
                        }))
                      }
                    />
                  </Box>
                </Box>
              </Grid>

              <Grid
                item
                xs={12}
                sm={12}
                md={12}
                lg={12}
                mt={4}
                sx={
                  {
                    // width:{xs:"65%"}
                  }
                }
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      name="agreeToTerms"
                      color="primary"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "14px",
                          lg: "14px",
                        },
                      }}
                    >
                      By completing this booking, you agree to our Terms &
                      Conditions
                    </Typography>
                  }
                />
              </Grid>
              <Grid container my={2}>
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <Button
                    type="submit"
                    sx={{
                      bgcolor: "var(--primary-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "5px",
                      py: "10px",
                      width: { xs: "95%", sm: "100%" },
                      fontSize: "15px",

                      color: "var(--meta-black)",
                      fontWeight: 600,
                      ":hover": {
                        bgcolor: "var(--primary-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "5px",
                        py: "10px",
                        width: "100%",
                        fontSize: "15px",
                        color: "var(--meta-black)",
                        fontWeight: 600,
                      },
                    }}
                  >
                    Book & Hold
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            {/* <Grid container my={2}>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <Button
                  type="submit"
                  sx={{
                    bgcolor: "var(--primary-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "5px",
                    py: "10px",
                    width: {xs:"95%",sm:"100%"},
                    fontSize: "15px",

                    color: "var(--meta-black)",
                    fontWeight: 600,
                    ":hover": {
                      bgcolor: "var(--primary-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "5px",
                      py: "10px",
                      width: "100%",
                      fontSize: "15px",
                      color: "var(--meta-black)",
                      fontWeight: 600,
                    },
                  }}
                >
                  Book & Hold
                </Button>
              </Grid>
            </Grid> */}
          </form>
        )}
      </Grid>
    </Box>
  );
};

export default PassengerInfo;
