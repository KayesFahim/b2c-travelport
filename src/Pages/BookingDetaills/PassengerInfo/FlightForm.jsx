import React, { useEffect, useState } from "react";
import {
  TextField,
  Grid,
  Button,
  Box,
  Autocomplete,
  Typography,
  FormControl,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  Divider,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
} from "@mui/material";
import DatePicker from "react-datepicker";
import { addMonths, format } from "date-fns"; // Assuming you're using date-fns for formatting dates
import secureLocalStorage from "react-secure-storage";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import CountryList from "../../fakeData/CountryList";
import SearchableDropDown from "../SearchableDropDown/SearchableDropDown";
import { config } from "../../../config";
import DateofBairthDatePicker from "./DateofBairthDatePicker";
import { FaPassport } from "react-icons/fa";
import { FaCcVisa } from "react-icons/fa";
import { FaIdCard } from "react-icons/fa"; // Add this import statement
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
const createPassenger = (
  passenger,
  isLead = false,
  email,
  phone,
  domestic
) => ({
  Title: passenger?.title,
  FirstName: passenger?.fName,
  LastName: passenger?.lName,
  PaxType: passenger?.type,
  DateOfBirth: moment(passenger?.dob).format("YYYY-MM-DDT00:00:00.000[Z]"), // corrction this line
  // DateOfBirth:passenger?.dob,
  Gender: passenger?.gender,
  PassportNumber: domestic ? passenger?.passNo : null,
  PassportExpiryDate: domestic
    ? moment(passenger?.passEx).format("YYYY-MM-DDT00:00:00.000[Z]")
    : null,
  PassportNationality: passenger?.passNation,
  passport: passenger?.PassCopy || "",
  visa: passenger?.VisaCopy || "",
  CountryCode: passenger?.passNation,
  Nationality: passenger?.passNation,
  FFNumber: passenger?.FFNumber,
  ContactNumber: phone, // Ensure ContactNumber is assigned
  Email: email, // Ensure Email is assigned
  Address1: "",
  IsLeadPassenger: isLead,
});

// Helper function to generate default passenger data
const generatePassengerData = (type, date) => ({
  type,
  fName: "",
  title: "",
  lName: "",
  gender: "",
  // dob: format(new Date(), "dd MMM yyyy"),
  dob: "",
  passNation: "BD",
  passNo: "",
  passEx: "",
  PassCopy: null,
  VisaCopy: null,
  FFNumber: "",
});

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const FlightForm = ({ data, airPriceData, selectedAirPrice }) => {
  const token = secureLocalStorage.getItem("access_token");
  const userData = secureLocalStorage.getItem("userData");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigate = useNavigate();
  const activeAirPrice = selectedAirPrice || airPriceData?.[0] || {};
  const itineraryData =
    activeAirPrice?.AllLegsInfo || activeAirPrice?.allLegsInfo
      ? activeAirPrice
      : data || {};
  const priceBreakDownSource = getArrayByKeys(activeAirPrice, [
    "PriceBreakDown",
    "priceBreakDown",
  ]).length
    ? getArrayByKeys(activeAirPrice, ["PriceBreakDown", "priceBreakDown"])
    : getArrayByKeys(data, ["PriceBreakDown", "priceBreakDown"]);

  const adultPriceBreakdown = priceBreakDownSource.find(
    (price) => ["Adult", "ADT"].includes(price?.PaxType || price?.paxType)
  );
  const childPriceBreakdown = priceBreakDownSource.find(
    (price) => ["Child", "CHD", "CNN"].includes(price?.PaxType || price?.paxType)
  );
  const infantPriceBreakdown = priceBreakDownSource.find(
    (price) => ["Infant", "INF"].includes(price?.PaxType || price?.paxType)
  );
  const adultCount = adultPriceBreakdown?.PaxCount || adultPriceBreakdown?.paxCount || 1;
  const childCount = childPriceBreakdown?.PaxCount || childPriceBreakdown?.paxCount || 0;
  const infantCount = infantPriceBreakdown?.PaxCount || infantPriceBreakdown?.paxCount || 0;
  const domestic =
    activeAirPrice?.PassportMadatory ??
    activeAirPrice?.PassportMandatory ??
    data?.PassportMadatory ??
    data?.PassportMandatory;

  const departureDate =
    itineraryData?.AllLegsInfo?.[0]?.DepDate ||
    itineraryData?.AllLegsInfo?.[0]?.departureDate ||
    itineraryData?.allLegsInfo?.[0]?.depDate ||
    itineraryData?.allLegsInfo?.[0]?.departureDate ||
    "";

  const dateAfterSixMonths = departureDate
    ? addMonths(new Date(departureDate), 6)
    : null;

  const dateBeforeTwelveYears = departureDate
    ? addMonths(new Date(departureDate), -144)
    : null;

  const dateBeforeTwoYears = departureDate
    ? addMonths(new Date(departureDate), -24)
    : null;
  // Initialize state using the helper function
  const [flightPassengerData, setFlightPassengerData] = useState({
    adult: [...new Array(parseInt(adultCount || 0))].map(() =>
      generatePassengerData("Adult", dateAfterSixMonths)
    ),
    child: [...new Array(parseInt(childCount || 0))].map(() =>
      generatePassengerData("Child", dateBeforeTwelveYears)
    ),
    infant: [...new Array(parseInt(infantCount || 0))].map(() =>
      generatePassengerData("Infant", dateBeforeTwoYears)
    ),
    email: userData?.email || "",
    phone: userData?.phone || "",
    tripType: "oneway",
  });

  const [errors, setErrors] = useState({
    adult: Array(adultCount).fill(false),
    child: Array(childCount).fill(false),
    infant: Array(infantCount).fill(false),
    email: false,
    phone: false,
  });

  // Handle input changes for text and select fields
  const handleInputChange = (e, type, index, field) => {
    const { value } = e.target;
    setFlightPassengerData((prevState) => {
      const updatedState = { ...prevState };
      updatedState[type][index][field] = value;

      // Automatically set gender based on title
      if (field === "title") {
        if (["Mr", "Mstr"].includes(value)) {
          updatedState[type][index]["gender"] = "Male";
        } else if (["Mrs", "Miss","Ms"].includes(value)) {
          updatedState[type][index]["gender"] = "Female";
        }
      }

      return updatedState;
    });
  };
  const handleEmailInputChange = (e, field) => {
    const { value } = e.target;
    setFlightPassengerData((prevState) => {
      const updatedState = { ...prevState };
      updatedState[field] = value;
      return updatedState;
    });
  };

  // Handle date changes for DatePicker fields
  const handleDateChange = (newDate, type, index, field) => {
    // console.log(newDate )
    // const utcDate = moment(newDate)
    // .utc()
    // .toDate();
    // const formattedDate = moment.utc(newDate).format("YYYY-MM-DDT00:00:00.000[Z]");
    setFlightPassengerData((prevState) => {
      const updatedState = { ...prevState };
      updatedState[type][index][field] = newDate;
      return updatedState;
    });
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Validate passenger fields (including gender, passport, and visa for domestic)
    ["adult", "child", "infant"].forEach((category) => {
      newErrors[category] = flightPassengerData[category].map((passenger) => {
        return (
          !passenger.fName ||
          !passenger.lName ||
          !passenger.passNation ||
          !passenger.title ||
          !passenger.gender ||
          (domestic && (!passenger.passNo || !passenger.passEx)) ||
          (domestic && (!passenger.PassCopy || !passenger.VisaCopy))
        );
      });
    });

    // Validate email and phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{11}$/; // Ensure phone is numeric and 11 digits
    newErrors.email =
      !flightPassengerData.email || !emailRegex.test(flightPassengerData.email);
    newErrors.phone =
      !flightPassengerData.phone || !phoneRegex.test(flightPassengerData.phone);

    setErrors(newErrors);

    // Check if all errors are false (form is valid)
    Object.values(newErrors).forEach((error) => {
      if (Array.isArray(error)) {
        error.forEach((e) => {
          if (e) isValid = false;
        });
      } else if (error) {
        isValid = false;
      }
    });

    return isValid;
  };

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
            data?.travelBuddies?.map((item) => [item["passport"], item])
          ).values(),
        ];
        setTravellers(uniqueTravelers);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);
  console.log("passenger", travellers);
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

    const updatedPassengerData = { ...flightPassengerData };

    if (updatedPassengerData[category]) {
      updatedPassengerData[category] = updatedPassengerData[category].map(
        (passenger, idx) => {
          if (idx === index) {
            return {
              ...passenger,
              fName: firstName || passenger.fName,
              title: title || passenger.title,
              lName: lastName || passenger.lName,
              gender: gender || passenger.gender,
              dob: moment(dob?.split("Z")[0]) || passenger.dob, // corrction this line
              passNation: nationality || passenger.passNation,
              passNo: passport || passenger.passNo,
              passEx: moment(passportexp?.split("Z")[0]) || passenger.passEx, // corrction this line
              PassCopy: passenger.PassCopy,
              VisaCopy: passenger.VisaCopy,
              FFNumber: passenger.FFNumber,
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
        label: `Name:${x.title} ${x.firstName} ${x.lastName} Gender:${
          x.gender
        }  Dob:${moment(x.dob?.split("Z")[0]).format("YYYY-MM-DD")}`, // corrction this line
      };
    }
  });
  //Child Traveler
  const childTravelers = travellers.filter((item) => item.paxtype === "Child");

  const optionChilds = childTravelers.map((x, index) => {
    if (x.paxtype === "Child") {
      return {
        value: x,
        label: `Name:${x.title} ${x.firstName} ${x.lastName} Gender:${
          x.gender
        }  Dob:${moment(x.dob?.split("Z")[0]).format("YYYY-MM-DD")}`, // corrction this line
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
        label: `Name:${x.title} ${x.firstName} ${x.lastName} Gender:${
          x.gender
        }  Dob:${moment(x.dob?.split("Z")[0]).format("YYYY-MM-DD")}`, // corrction this line
      };
    }
  });

  const counts = [
    { category: "adult", count: adultCount },
    { category: "child", count: childCount },
    { category: "infant", count: infantCount },
  ];

  console.log("dataaaaaaa", flightPassengerData);
  const ResultId = activeAirPrice?.ResultId || data?.ResultId;
  const SearchId = activeAirPrice?.SearchId || data?.SearchId;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      const passengers = [
        ...flightPassengerData.adult.map((adult, index) =>
          createPassenger(
            adult,
            index === 0,
            flightPassengerData.email,
            flightPassengerData.phone,
            domestic
          )
        ),
        ...flightPassengerData.child.map((child) =>
          createPassenger(
            child,
            false,
            flightPassengerData.email,
            flightPassengerData.phone,
            domestic
          )
        ),
        ...flightPassengerData.infant.map((infant) =>
          createPassenger(
            infant,
            false,
            flightPassengerData.email,
            flightPassengerData.phone,
            domestic
          )
        ),
      ];

      const body = { ResultId, SearchId, Passengers: passengers };
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
          allowOutsideClick: false, // Prevent closing the modal by clicking outside
          allowEscapeKey: false, // Prevent closing the modal with the Escape key
          allowEnterKey: false, // Prevent submitting or closing with the Enter key
          showConfirmButton: false, // Hide the confirm button
          showCancelButton: false, // Hide the cancel button
          didOpen: () => {
            Swal.showLoading(); // Show a loading spinner
          },
        });

        try {
          const response = await fetch(
            `${config.baseUrl}/booking/api2/booking`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(body),
            }
          );

          const data = await response.json();

          if (response.ok) {
            Swal.fire(
              "Booked!",
              "Your flight has been booked.",
              "success"
            ).then(() => {
              navigate("/paymentgateway", {
                state: { paymentData: data },
              });
            });
          } else {
            Swal.fire("Error!", `Booking failed: ${data.message}`, "error");
          }
        } catch (error) {
          Swal.fire(
            "Error!",
            "There was an error booking your flight.",
            "error"
          );
          console.error("Error:", error);
        }
      }
    } else {
      console.log("Form has errors");
    }
  };

  const handleAutoPassVisaCopy = async (file, index, type, category) => {
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

      if (!response.ok) {
        console.error("File upload failed", response.statusText);
        return;
      }

      const data = await response.json();

      // Update the passenger data with the uploaded file link
      setFlightPassengerData((prevState) => {
        const updatedPassengers = { ...prevState };

        // Update the appropriate passenger category
        if (type === "passport") {
          updatedPassengers[category] = updatedPassengers[category].map(
            (passenger, i) =>
              i === index
                ? { ...passenger, PassCopy: data.link } // For PassCopy
                : passenger
          );
        } else if (type === "visa") {
          updatedPassengers[category] = updatedPassengers[category].map(
            (passenger, i) =>
              i === index
                ? { ...passenger, VisaCopy: data.link } // For VisaCopy
                : passenger
          );
        }

        return updatedPassengers;
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        {counts
          .filter(({ count }) => count > 0)
          .map(({ category }) => (
            <Box
              key={category}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "var(--border)", // Border color
                  },
                  "&:hover fieldset": {
                    borderColor: "var(--primary-button)", // Border color on hover
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "var(--border)", // Border color when focused
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "var(--border)", // Label color
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "var(--border)", // Label color when focused
                },
                ".react-datepicker-wrapper": {
                  width: "100%",
                },
              }}
            >
              <Box
                key={category}
                sx={{
                  fontSize: { xs: 16, md: 20 },
                  borderBottom: "1px solid #ccc", // Add border bottom
                  pb: 1, // Add padding bottom for spacing
                  mb: 2, // Add margin bottom for spacing
                  color: "var(--primary-button)", // Change color to primary-button
                  fontWeight: "600", // Make font weight bold
                }}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}s
                {category === "adult" && ` (${adultCount})`}
                {category === "child" && ` (${childCount})`}
                {category === "infant" && ` (${infantCount})`}
              </Box>
              {flightPassengerData[category].map((passenger, index) => (
                <Grid
                  container
                  spacing={{ xs: 1, md: 2 }}
                  key={index}
                  sx={{
                    mb: 2,
                  }}
                >
                  <Grid
                    item
                    xs={12}
                    container
                    sx={{
                      position: "relative",
                    }}
                  >
                    <Grid item xs={8.5} md={3.8}>
                      <Typography
                        sx={{
                          fontSize: {
                            xs: "11px",
                            md: "13px",
                          },
                          // color: "#444542",
                          color: "var(--primary-button)",
                        }}
                      >
                        Search From your Favorite Traveler List
                      </Typography>
                      <SearchableDropDown
                        index={index}
                        handler={handleAutoFill}
                        options={
                          category === "adult"
                            ? optionAdults
                            : category === "infant"
                            ? optionInfants
                            : optionChilds
                        }
                        placeholder="Select Traveller"
                        type={category}
                      />
                    </Grid>
                    <Box
                      sx={{
                        bgcolor: "var(--primary-button)",
                        color: "var(--white)",
                        py: 1,
                        px: 2,
                        borderRadius: 1,
                        position: "absolute",
                        right: 0,
                        top: { xs: "45%", md: "50%" },
                      }}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}{" "}
                      {index + 1}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={12}>
                    <Box
                      sx={{
                        fontSize: { xs: 16, md: 20 },
                        color: "var(--primary-button)",
                        fontWeight: "600",
                        mb: 1,
                      }}
                    >
                      Personal Details
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <ErrorOutlineIcon
                        style={{
                          color: "var(--primary-button)",
                          marginRight: 6,
                        }}
                        sx={{ fontSize: { xs: 15, md: 20 } }}
                      />
                      <Typography
                        sx={{
                          fontSize: { xs: 11, md: 13 },
                          color: "var(--primary-button)",
                        }}
                      >
                        As Mentioned on Your Passport or government Approved IDs
                      </Typography>
                    </Box>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Select Title *
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {["Mr","Mrs","Ms", "Mstr",  "Miss"].map((option) => (
                          <Button
                            key={option}
                            variant={
                              passenger.title === option
                                ? "contained"
                                : "outlined"
                            }
                            onClick={() =>
                              handleInputChange(
                                { target: { value: option } },
                                category,
                                index,
                                "title"
                              )
                            }
                            sx={{
                              borderColor:
                                passenger.title === option
                                  ? "var(--primary-button)"
                                  : "#ccc",
                              color:
                                passenger.title === option
                                  ? "white"
                                  : "var(--primary-button)",
                              borderRadius: 2, // Add border radius
                              fontWeight: "600", // Make text weight bolder
                            }}
                          >
                            {option}
                          </Button>
                        ))}
                      </Box>
                      {errors[category][index] && !passenger.title && (
                        <FormHelperText error>Title is required</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        First Name *
                      </Typography>
                      <TextField
                        value={passenger.fName}
                        onChange={(e) =>
                          handleInputChange(e, category, index, "fName")
                        }
                        fullWidth
                        error={errors[category][index] && !passenger.fName}
                        helperText={
                          errors[category][index] && !passenger.fName
                            ? "First Name is required"
                            : ""
                        }
                        InputProps={{
                          sx: {
                            height: 40, // Reduce field height
                            borderRadius: 2, // Add border radius
                            borderColor: "lightgray", // Set border color to light gray
                            fontSize: "12px", // Set font size to 12px
                          },
                        }}
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Last Name *
                      </Typography>
                      <TextField
                        value={passenger.lName}
                        onChange={(e) =>
                          handleInputChange(e, category, index, "lName")
                        }
                        fullWidth
                        error={errors[category][index] && !passenger.lName}
                        helperText={
                          errors[category][index] && !passenger.lName
                            ? "Last Name is required"
                            : ""
                        }
                        InputProps={{
                          sx: {
                            height: 40, // Reduce field height
                            borderRadius: 2, // Add border radius
                            borderColor: "lightgray", // Set border color to light gray
                            fontSize: "12px", // Set font size to 12px
                          },
                        }}
                      />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Date of Birth *
                      </Typography>
                      <DateofBairthDatePicker
                        handleDateChange={handleDateChange}
                        value={passenger?.dob}
                        category={category}
                        error={errors[category][index] && !passenger?.dob}
                        helperText={
                          errors[category][index] && !passenger?.dob
                            ? "Date of Birth is required"
                            : ""
                        }
                        field={"dob"}
                        index={index}
                        depdate={departureDate}
                      />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Gender *
                      </Typography>
                      <RadioGroup
                        row
                        value={passenger.gender || ""}
                        onChange={(event) =>
                          handleInputChange(
                            { target: { value: event.target.value } },
                            category,
                            index,
                            "gender"
                          )
                        }
                      >
                        {["Male", "Female"].map((option) => (
                          <FormControlLabel
                            key={option}
                            value={option}
                            control={<Radio />}
                            label={option}
                            sx={{
                              "& .MuiFormControlLabel-label": {
                                fontSize: "14px", // Adjust font size if needed
                              },
                            }}
                          />
                        ))}
                      </RadioGroup>
                      {errors[category][index] && !passenger.gender && (
                        <FormHelperText error>
                          Gender is required
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid tem xs={12} md={6} sx={{ p: { xs: 1, md: 2 }, my: 2 }}>
                    <Box
                      sx={{
                        fontSize: { xs: 16, md: 20 },
                        color: "var(--primary-button)",
                        fontWeight: "600",
                        mb: 1,
                      }}
                    >
                      Frequent Flyer
                    </Box>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Frequent Flyer Number (If Any)
                      </Typography>
                      <TextField
                        value={passenger.FFNumber}
                        onChange={(e) =>
                          handleInputChange(e, category, index, "FFNumber")
                        }
                        fullWidth
                        InputProps={{
                          sx: {
                            height: 40, // Reduce field height
                            borderRadius: 2, // Add border radius
                            borderColor: "lightgray", // Set border color to light gray
                            fontSize: "12px", // Set font size to 12px
                          },
                        }}
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={12}>
                    <Box
                      sx={{
                        fontSize: { xs: 16, md: 20 },
                        color: "var(--primary-button)",
                        fontWeight: "600",
                        // mb: 1,
                      }}
                    >
                      Passport Information
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Select Country *
                      </Typography>
                      <Select
                        value={passenger.passNation || ""}
                        onChange={(event) =>
                          handleInputChange(
                            { target: { value: event.target.value } },
                            category,
                            index,
                            "passNation"
                          )
                        }
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        sx={{
                          height: 40, // Reduce field height
                          borderRadius: 2, // Add border radius
                          borderColor: "lightgray", // Set border color to light gray
                          fontSize: "11px",
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200, // Reduce popup height
                              border: "1px solid lightgray", // Add gray border to the popup
                            },
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select Country
                        </MenuItem>
                        {CountryList.map((country) => (
                          <MenuItem key={country.code} value={country.code}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors[category][index] && !passenger.passNation && (
                        <FormHelperText error>
                          Country is required
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {/* Passport Number (conditionally required) */}
                  {domestic && (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <Typography
                          variant="subtitle1"
                          gutterBottom
                          sx={{ fontSize: "14px", color: "gray" }}
                        >
                          Passport Number *
                        </Typography>
                        <TextField
                          value={passenger.passNo}
                          onChange={(e) =>
                            handleInputChange(e, category, index, "passNo")
                          }
                          fullWidth
                          error={errors[category][index] && !passenger.passNo}
                          helperText={
                            errors[category][index] && !passenger.passNo
                              ? "Passport Number is required"
                              : ""
                          }
                          InputProps={{
                            sx: {
                              height: 40, // Reduce field height
                              borderRadius: 2, // Add border radius
                              borderColor: "lightgray", // Set border color to light gray
                              fontSize: "12px", // Set font size to 12px
                            },
                          }}
                        />
                      </FormControl>
                    </Grid>
                  )}

                  {/* Passport Expiry Date (conditionally required) */}

                  {domestic && (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <Typography
                          variant="subtitle1"
                          gutterBottom
                          sx={{ fontSize: "14px", color: "gray" }}
                        >
                          Passport Expiry Date *
                        </Typography>
                        <DatePicker
                          selected={
                            passenger?.passEx
                              ? new Date(passenger.passEx)
                              : null
                          }
                          onChange={(date) =>
                            handleDateChange(date, category, index, "passEx")
                          }
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          dateFormat="dd MMM yyyy"
                          customInput={
                            <TextField
                              variant="outlined"
                              fullWidth
                              error={
                                errors[category][index] && !passenger?.passEx
                              }
                              helperText={
                                errors[category][index] && !passenger?.passEx
                                  ? "Passport Expiry Date is required"
                                  : ""
                              }
                              InputProps={{
                                sx: {
                                  height: 40, // Reduce field height
                                  borderRadius: 2, // Add border radius
                                  borderColor: "lightgray", // Set border color to light gray
                                  fontSize: "12px", // Set font size to 12px
                                },
                              }}
                            />
                          }
                          minDate={new Date()}
                          popperPlacement={"bottom-start"}
                        />
                      </FormControl>
                    </Grid>
                  )}

                  <Grid container spacing={{ xs: 1, md: 2 }} p={2}>
                    {domestic && (
                      <Grid item xs={6} md={6}>
                        <Box sx={{ mx: "auto" }}>
                          <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={{ fontSize: "14px", color: "gray" }}
                          >
                            Passport Image
                          </Typography>
                          <Box
                            variant="outlined"
                            sx={{
                              border: "1px dashed var(--border)",
                              textAlign: "center",
                              p: 1,
                              borderRadius: 1,
                              width: { xs: "90%", md: "60%" },
                            }}
                          >
                            <Box>
                              {passenger?.PassCopy ? (
                                typeof passenger.PassCopy === "string" ? (
                                  <img
                                    src={passenger.PassCopy}
                                    alt="Passport Preview"
                                    style={{
                                      width: "100%",
                                      maxHeight: "200px",
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={URL.createObjectURL(
                                      passenger.PassCopy
                                    )}
                                    alt="Passport Preview"
                                    style={{
                                      width: "100%",
                                      maxHeight: "200px",
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

                              <FormControl
                                required
                                fullWidth
                                error={
                                  errors[category][index] &&
                                  !passenger?.PassCopy
                                }
                              >
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
                                  {passenger?.PassCopy
                                    ? "Change"
                                    : "Select Photo"}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/jpeg, image/png"
                                    onChange={(e) =>
                                      handleAutoPassVisaCopy(
                                        e.target.files[0],
                                        index,
                                        "passport",
                                        category
                                      )
                                    }
                                  />
                                </Button>
                                <Typography sx={{ mt: 1, fontSize: 12 }}>
                                  JPG/JPEG/PNG
                                </Typography>
                                {errors[category][index] &&
                                  !passenger?.PassCopy && (
                                    <FormHelperText error>
                                      Passport copy is required
                                    </FormHelperText>
                                  )}
                              </FormControl>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {domestic && (
                      <Grid item xs={6} md={6}>
                        <Box sx={{ mx: "auto" }}>
                          <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={{ fontSize: "14px", color: "gray" }}
                          >
                            Visa Image
                          </Typography>
                          <Box
                            variant="outlined"
                            sx={{
                              border: "1px dashed var(--border)",
                              textAlign: "center",
                              p: 1,
                              borderRadius: 1,
                              width: { xs: "90%", md: "60%" },
                            }}
                          >
                            <Box>
                              {passenger?.VisaCopy ? (
                                typeof passenger.VisaCopy === "string" ? (
                                  <img
                                    src={passenger.VisaCopy}
                                    alt="Visa Preview"
                                    style={{
                                      width: "100%",
                                      maxHeight: "200px",
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={URL.createObjectURL(
                                      passenger.VisaCopy
                                    )}
                                    alt="Visa Preview"
                                    style={{
                                      width: "100%",
                                      maxHeight: "200px",
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

                              <FormControl
                                required
                                fullWidth
                                error={
                                  errors[category][index] &&
                                  !passenger?.VisaCopy
                                }
                              >
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
                                  {passenger?.VisaCopy
                                    ? "Change"
                                    : "Select Photo"}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/jpeg, image/png"
                                    onChange={(e) =>
                                      handleAutoPassVisaCopy(
                                        e.target.files[0],
                                        index,
                                        "visa",
                                        category
                                      )
                                    }
                                  />
                                </Button>
                                <Typography sx={{ mt: 1, fontSize: 12 }}>
                                  JPG/JPEG/PNG
                                </Typography>
                                {errors[category][index] &&
                                  !passenger?.VisaCopy && (
                                    <FormHelperText error>
                                      Visa copy is required
                                    </FormHelperText>
                                  )}
                              </FormControl>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              ))}
            </Box>
          ))}

        {/* Email and Phone */}
        <Grid container spacing={2} mt={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontSize: "14px", color: "gray" }}
              >
                Email *
              </Typography>
              <TextField
                value={flightPassengerData.email}
                onChange={(e) => handleEmailInputChange(e, "email")}
                fullWidth
                error={errors.email}
                helperText={errors.email ? "Enter a valid email address" : ""}
                InputProps={{
                  sx: {
                    height: 40, // Reduce field height
                    borderRadius: 2, // Add border radius
                    borderColor: "lightgray", // Set border color to light gray
                    fontSize: "12px", // Set font size to 12px
                  },
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontSize: "14px", color: "gray" }}
              >
                Phone *
              </Typography>
              <TextField
                value={flightPassengerData.phone}
                onChange={(e) => handleEmailInputChange(e, "phone")}
                fullWidth
                error={errors.phone}
                helperText={
                  errors.phone ? "Phone must be numeric and 11 digits" : ""
                }
                InputProps={{
                  sx: {
                    height: 40, // Reduce field height
                    borderRadius: 2, // Add border radius
                    borderColor: "lightgray", // Set border color to light gray
                    fontSize: "12px", // Set font size to 12px
                  },
                }}
              />
            </FormControl>
          </Grid>
        </Grid>
        <Box
          sx={{
            my: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                name="agreeToTerms"
                // color="primary"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                sx={{
                  color: "var(--primary-button)",
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontSize: {
                    xs: "12px",
                    sm: "12px",
                    md: "13px",
                    lg: "13px",
                  },
                  color: "var(--primary-button)",
                  fontWeight: "600",
                }}
              >
                By completing this booking, you agree to our Terms & Conditions
              </Typography>
            }
          />
        </Box>
        <Button
          variant="contained"
          type="submit"
          // sx={{
          //   bgcolor: "var(--primary-button)",
          //   my: 3,
          //   width: "100%",
          // }}
          sx={{
            bgcolor: "var(--primary-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "5px",
            py: "6px",
            width: { xs: "95%", sm: "100%" },
            fontSize: "13px",

            color: "var(--meta-black)",
            fontWeight: 600,
            ":hover": {
              bgcolor: "var(--primary-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "5px",
              py: "6px",
              width: "100%",
              fontSize: "13px",
              color: "var(--meta-black)",
              fontWeight: 600,
            },
          }}
        >
          Book & Hold
        </Button>
      </form>
    </Box>
  );
};

export default FlightForm;
