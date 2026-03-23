import React, { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import moment from "moment";
import CountryList from "../../fakeData/CountryList";
import { config } from "../../../config";
import DateofBairthDatePicker from "./DateofBairthDatePicker";
import { FaPassport } from "react-icons/fa";
import { FaCcVisa } from "react-icons/fa";
import { FaCamera } from "react-icons/fa";
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
  MiddleName: passenger?.mName || "",
  LastName: passenger?.lName,
  PaxType: passenger?.type,
  DateOfBirth: moment(passenger?.dob).format("YYYY-MM-DDT00:00:00.000[Z]"), // corrction this line
  // DateOfBirth:passenger?.dob,
  Gender: passenger?.gender,
  PassportNumber: passenger?.passNo || null,
  PassportExpiryDate: passenger?.passEx
    ? moment(passenger?.passEx).format("YYYY-MM-DDT00:00:00.000[Z]")
    : null,
  PassportIssueDate: passenger?.passIssueDate
    ? moment(passenger?.passIssueDate).format("YYYY-MM-DD")
    : null,
  PassportNationality: passenger?.passNation,
  PassportIssuingCountry: passenger?.passIssueCountry || null,
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
  mName: "",
  title: "",
  lName: "",
  gender: "",
  // dob: format(new Date(), "dd MMM yyyy"),
  dob: "",
  passNation: "BD",
  passIssueCountry: "BD",
  passIssueDate: "",
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

const getStringValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = getStringValue(item);
      if (parsed) return parsed;
    }
    return "";
  }
  if (typeof value === "object") {
    const possibleKeys = ["value", "text", "name", "code", "number", "id"];
    for (const key of possibleKeys) {
      if (value?.[key] !== undefined) {
        const parsed = getStringValue(value[key]);
        if (parsed) return parsed;
      }
    }
  }
  return "";
};

const pickFirstValue = (source, keys = []) => {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    if (source?.[key] !== undefined) {
      const parsed = getStringValue(source[key]);
      if (parsed) return parsed;
    }
  }
  return "";
};

const normalizeGender = (rawGender) => {
  const value = getStringValue(rawGender).toLowerCase();
  if (!value) return "";
  if (["m", "male", "man"].includes(value)) return "Male";
  if (["f", "female", "woman"].includes(value)) return "Female";
  return "";
};

const normalizeTitle = (rawTitle, gender, paxType) => {
  const title = getStringValue(rawTitle);
  const allowedTitles = ["Mr", "Mrs", "Ms", "Mstr", "Miss"];
  if (allowedTitles.includes(title)) return title;

  const isChildPax = ["Child", "Infant"].includes(paxType);
  if (gender === "Male") return isChildPax ? "Mstr" : "Mr";
  if (gender === "Female") return isChildPax ? "Miss" : "Ms";
  return "";
};

const normalizeCountryCode = (rawValue, fallbackValue = "") => {
  const value = getStringValue(rawValue);
  if (!value) return fallbackValue || "";

  const upper = value.toUpperCase();
  if (upper.length === 2) {
    const directCode = CountryList.find((item) => item.code === upper);
    if (directCode) return directCode.code;
  }
  if (upper.length === 3) {
    const directAlpha3 = CountryList.find((item) => item.alpha3 === upper);
    if (directAlpha3) return directAlpha3.code;
  }

  const lower = value.toLowerCase();
  const byNameExact = CountryList.find(
    (item) => item.name.toLowerCase() === lower
  );
  if (byNameExact) return byNameExact.code;

  const byNameIncludes = CountryList.find((item) =>
    item.name.toLowerCase().includes(lower)
  );
  if (byNameIncludes) return byNameIncludes.code;

  return fallbackValue || "";
};

const getCountryDisplayLabel = (country) =>
  `${country.name} (${country.alpha3 || country.code})`;

const parseDateValue = (rawDate) => {
  const value = getStringValue(rawDate);
  if (!value) return null;

  const strictFormats = [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "DD-MM-YYYY",
    "YYYY/MM/DD",
    "DD MMM YYYY",
    "DD MMMM YYYY",
    "YYMMDD",
    "YYYYMMDD",
  ];

  const strictDate = moment(value, strictFormats, true);
  if (strictDate.isValid()) return strictDate.toDate();

  const looseDate = moment(value);
  if (looseDate.isValid()) return looseDate.toDate();

  return null;
};

const collectTextValues = (value, bucket = []) => {
  if (value === null || value === undefined) return bucket;
  if (typeof value === "string" || typeof value === "number") {
    bucket.push(String(value));
    return bucket;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, bucket));
    return bucket;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectTextValues(item, bucket));
  }
  return bucket;
};

const parseMrzDate = (rawValue, type = "generic") => {
  const value = getStringValue(rawValue).replace(/[^0-9]/g, "");
  if (!/^\d{6}$/.test(value)) return null;

  const yy = Number(value.slice(0, 2));
  const mm = Number(value.slice(2, 4));
  const dd = Number(value.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentYear = new Date().getFullYear();
  let fullYear = 2000 + yy;

  if (type === "dob" && fullYear > currentYear) {
    fullYear -= 100;
  }
  if (type === "expiry" && fullYear < currentYear - 1) {
    fullYear += 100;
  }

  const date = new Date(fullYear, mm - 1, dd);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const parseMrzLines = (line1 = "", line2 = "") => {
  const l1 = getStringValue(line1).replace(/\s+/g, "");
  const l2 = getStringValue(line2).replace(/\s+/g, "");
  if (
    l1.length !== 44 ||
    l2.length !== 44 ||
    !/^P<[A-Z0-9<]{42}$/.test(l1) ||
    !/^[A-Z0-9<]{44}$/.test(l2)
  ) {
    return null;
  }

  const issuer = l1.slice(2, 5).replace(/</g, "").trim();
  const namesField = l1.slice(5);
  const [surnamePart = "", givenPart = ""] = namesField.split("<<");
  const surname = surnamePart.replace(/</g, " ").replace(/\s+/g, " ").trim();
  const givenNames = givenPart.replace(/</g, " ").replace(/\s+/g, " ").trim();
  const firstName = givenNames || "";
  const lastName = surname || "";

  const passportNo = l2.slice(0, 9).replace(/</g, "").trim();
  const nationality = l2.slice(10, 13).replace(/</g, "").trim();
  const dob = parseMrzDate(l2.slice(13, 19), "dob");
  const genderChar = l2.slice(20, 21);
  const expiryDate = parseMrzDate(l2.slice(21, 27), "expiry");

  return {
    fName: firstName,
    lName: lastName,
    passNo: passportNo,
    dob,
    passEx: expiryDate,
    rawGender: genderChar === "F" ? "Female" : genderChar === "M" ? "Male" : "",
    passNationRaw: nationality,
    passIssueCountryRaw: issuer || nationality,
  };
};

const extractMrzFromPayload = (payload = {}) => {
  const directMrz = pickFirstValue(payload, [
    "mrz",
    "mrzText",
    "machineReadableZone",
    "rawMrz",
  ]);
  const directLinesRaw = Array.isArray(payload?.mrzLines)
    ? payload.mrzLines
    : Array.isArray(payload?.machineReadableLines)
      ? payload.machineReadableLines
      : [];

  const allText = [
    ...collectTextValues(payload),
    directMrz,
    ...directLinesRaw,
  ]
    .filter(Boolean)
    .flatMap((value) =>
      String(value)
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\s+/g, ""))
    )
    .filter(Boolean);

  for (let i = 0; i < allText.length; i += 1) {
    const line = allText[i];
    const next = allText[i + 1] || "";
    const parsedPair = parseMrzLines(line, next);
    if (parsedPair) return parsedPair;

    if (/^P<[A-Z0-9<]{42}[A-Z0-9<]{44}$/.test(line)) {
      const parsedCombined = parseMrzLines(line.slice(0, 44), line.slice(44, 88));
      if (parsedCombined) return parsedCombined;
    }
  }

  return null;
};

const parsePassportExtractionPayload = (payload = {}) => {
  const mrzData = extractMrzFromPayload(payload);
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
    payload?.payload,
    payload?.document,
    payload?.passport,
    payload?.extractedData,
    payload?.data?.data,
    payload?.data?.result,
  ].filter(Boolean);

  const hasExtractionLikeFields = (item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const keys = [
      "firstName",
      "firstname",
      "givenNames",
      "givenName",
      "lastName",
      "surname",
      "passportNumber",
      "passportNo",
      "passport",
      "dateOfBirth",
      "dob",
      "passportExpiryDate",
      "passportexp",
      "nationality",
      "passportIssuingCountry",
      "issuingCountry",
    ];
    return keys.some((key) => {
      const value = item?.[key];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
  };

  let source =
    candidates.find((item) => hasExtractionLikeFields(item)) ||
    candidates.find((item) => typeof item === "object") ||
    {};
  if (Array.isArray(source)) {
    source = source.find((item) => item && typeof item === "object") || {};
  }

  const firstNameRaw = pickFirstValue(source, [
    "givenNames",
    "given_name",
    "givenName",
    "firstName",
    "firstname",
    "first_name",
  ]);
  const lastNameRaw = pickFirstValue(source, [
    "lastName",
    "lastname",
    "last_name",
    "surname",
    "familyName",
    "family_name",
  ]);
  const fullNameRaw = pickFirstValue(source, ["fullName", "name"]);
  const fullNameParts = fullNameRaw ? fullNameRaw.split(/\s+/).filter(Boolean) : [];

  const firstName =
    firstNameRaw ||
    mrzData?.fName ||
    (fullNameParts.length > 1 ? fullNameParts[0] : "");
  const lastName =
    lastNameRaw ||
    mrzData?.lName ||
    (fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : "");

  const passNo =
    pickFirstValue(source, [
      "passportNumber",
      "passportNo",
      "passport",
      "documentNumber",
      "documentNo",
      "number",
    ]) || mrzData?.passNo;

  const passEx =
    parseDateValue(
      pickFirstValue(source, [
        "passportExpiryDate",
        "passportexp",
        "expiryDate",
        "expiry",
        "expirationDate",
        "dateOfExpiry",
      ])
    ) || mrzData?.passEx;

  const dob =
    parseDateValue(
      pickFirstValue(source, ["dateOfBirth", "dob", "birthDate", "birthdate"])
    ) || mrzData?.dob;

  return {
    fName: firstName,
    lName: lastName,
    passNo,
    passEx,
    dob,
    rawGender: pickFirstValue(source, ["gender", "sex"]) || mrzData?.rawGender,
    rawTitle: pickFirstValue(source, ["title"]),
    passNationRaw:
      pickFirstValue(source, [
        "nationality",
        "nationalityCode",
        "citizenship",
        "countryCode",
      ]) || mrzData?.passNationRaw,
    passIssueCountryRaw:
      pickFirstValue(source, [
        "passportIssuingCountry",
        "issuingCountry",
        "issuer",
        "issuingState",
        "issuingAuthority",
        "countryOfIssue",
      ]) || mrzData?.passIssueCountryRaw,
  };
};

const hasExtractedPassportFields = (extracted = {}) =>
  Boolean(
    extracted?.passNo ||
    extracted?.fName ||
    extracted?.lName ||
    extracted?.passEx ||
    extracted?.dob ||
    extracted?.passNationRaw ||
    extracted?.passIssueCountryRaw
  );

const parseStoredUserData = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const FlightForm = ({ data, airPriceData, selectedAirPrice, seatSelections = [] }) => {
  const token = secureLocalStorage.getItem("access_token");
  const userData = parseStoredUserData(secureLocalStorage.getItem("userData"));
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
  const [passportScanState, setPassportScanState] = useState({});

  const getScanKey = (type, index) => `${type}-${index}`;
  const setScanStatus = (type, index, nextState) => {
    const key = getScanKey(type, index);
    setPassportScanState((prevState) => ({
      ...prevState,
      [key]: {
        ...(prevState[key] || {}),
        ...nextState,
      },
    }));
  };

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
        } else if (["Mrs", "Miss", "Ms"].includes(value)) {
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
          !passenger.passIssueCountry ||
          !passenger.title ||
          !passenger.gender ||
          !passenger.passNo ||
          !passenger.passEx ||
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
      const previewPayload = {
        bookingBody: body,
        passengers,
        selectedAirPrice: activeAirPrice,
        selectedOffer: data,
        seatSelections: Array.isArray(seatSelections) && seatSelections.length
          ? seatSelections
          : Array.isArray(data?.seatSelections)
            ? data.seatSelections
            : Array.isArray(activeAirPrice?.seatSelections)
              ? activeAirPrice.seatSelections
              : [],
      };

      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "flyjatt:preview_booking",
            JSON.stringify(previewPayload)
          );
        }
      } catch (storageError) {
        console.warn("Unable to cache preview booking payload", storageError);
      }

      navigate("/previewbooking", {
        state: previewPayload,
      });
    } else {
      console.log("Form has errors");
    }
  };

  const handleAutoPassVisaCopy = async (file, index, type, category) => {
    if (!file) return null;
    let uploadedLink = null;
    let responsePayload = {};

    const formData = new FormData();
    formData.append("file", file);

    try {
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
          responsePayload = data || {};
          uploadedLink = data?.link || data?.url || null;
        }
      } catch (uploadError) {
        // External upload API may be unavailable in local dev.
      }

      if (!uploadedLink) {
        // Keep scan/autofill functional even when document upload service is down.
        uploadedLink = URL.createObjectURL(file);
      }

      // Update the passenger data with the uploaded file link
      setFlightPassengerData((prevState) => {
        const updatedPassengers = { ...prevState };

        // Update the appropriate passenger category
        if (type === "passport") {
          updatedPassengers[category] = updatedPassengers[category].map(
            (passenger, i) =>
              i === index
                ? { ...passenger, PassCopy: uploadedLink } // For PassCopy
                : passenger
          );
        } else if (type === "visa") {
          updatedPassengers[category] = updatedPassengers[category].map(
            (passenger, i) =>
              i === index
                ? { ...passenger, VisaCopy: uploadedLink } // For VisaCopy
                : passenger
          );
        }

        return updatedPassengers;
      });
      return {
        link: uploadedLink,
        payload: responsePayload,
      };
    } catch (error) {
      // Avoid hard failure in UI for optional upload service failures.
      return null;
    }
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read image file."));
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });

  const requestTesseractMrzExtraction = async (file, uploadedPassportUrl = "") => {
    try {
      const imageBase64 = await fileToDataUrl(file);
      const response = await fetch("/api/passport/extract-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          fileUrl: uploadedPassportUrl || "",
        }),
      });

      if (!response.ok) return null;
      const payload = await response.json();
      const parsed = parsePassportExtractionPayload(payload);
      return hasExtractedPassportFields(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const applyExtractedPassportData = (
    category,
    index,
    extracted = {},
    uploadedPassportUrl = ""
  ) => {
    setFlightPassengerData((prevState) => {
      const updatedPassengers = { ...prevState };
      const currentPassenger = updatedPassengers?.[category]?.[index];
      if (!currentPassenger) return prevState;

      const gender = normalizeGender(extracted.rawGender) || currentPassenger.gender;
      const passNation = normalizeCountryCode(
        extracted.passNationRaw,
        currentPassenger.passNation
      );
      const passIssueCountry = normalizeCountryCode(
        extracted.passIssueCountryRaw,
        currentPassenger.passIssueCountry || passNation
      );
      const title = normalizeTitle(
        extracted.rawTitle || currentPassenger.title,
        gender,
        currentPassenger.type
      );

      const nextPassenger = {
        ...currentPassenger,
        PassCopy: uploadedPassportUrl || currentPassenger.PassCopy,
        fName: extracted.fName || currentPassenger.fName,
        lName: extracted.lName || currentPassenger.lName,
        passNo: extracted.passNo || currentPassenger.passNo,
        passEx: extracted.passEx || currentPassenger.passEx,
        dob: extracted.dob || currentPassenger.dob,
        passNation,
        passIssueCountry,
        gender,
        title: title || currentPassenger.title,
      };

      updatedPassengers[category] = updatedPassengers[category].map(
        (passenger, passengerIndex) =>
          passengerIndex === index ? nextPassenger : passenger
      );

      return updatedPassengers;
    });
  };

  const handlePassportScanAndAutofill = async (event, category, index) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const key = getScanKey(category, index);
    setScanStatus(category, index, {
      loading: true,
      error: "",
      success: "",
    });

    try {
      const uploadResult = await handleAutoPassVisaCopy(
        file,
        index,
        "passport",
        category
      );
      const uploadedPassportUrl =
        (typeof uploadResult === "string"
          ? uploadResult
          : uploadResult?.link) || "";

      // Prefer local Tesseract MRZ extraction first for consistent passport parsing.
      let extractedData = await requestTesseractMrzExtraction(
        file,
        uploadedPassportUrl || ""
      );
      if (!hasExtractedPassportFields(extractedData)) {
        extractedData = parsePassportExtractionPayload(
          uploadResult?.payload || uploadResult || {}
        );
      }

      if (hasExtractedPassportFields(extractedData || {})) {
        applyExtractedPassportData(
          category,
          index,
          extractedData,
          uploadedPassportUrl || ""
        );
        setScanStatus(category, index, {
          loading: false,
          error: "",
          success: "Passport scanned and fields auto-filled.",
        });
      } else {
        setScanStatus(category, index, {
          loading: false,
          error: "",
          success: "Passport uploaded. Tesseract MRZ could not extract fields.",
        });
      }
    } catch (error) {
      setScanStatus(category, index, {
        loading: false,
        success: "",
        error:
          "Could not extract passport fields. You can still fill details manually.",
      });
    } finally {
      if (event?.target) {
        event.target.value = "";
      }
      setTimeout(() => {
        setPassportScanState((prevState) => ({
          ...prevState,
          [key]: {
            ...(prevState[key] || {}),
            success: "",
          },
        }));
      }, 4000);
    }
  };

  return (
    <Box
      sx={{
        "& .MuiTypography-subtitle1": {
          fontSize: "12px",
          color: "#5a6b85",
          fontWeight: 600,
        },
        "& .MuiInputBase-root": {
          minHeight: 36,
          borderRadius: "10px",
        },
        "& .MuiInputBase-input": {
          fontSize: "12px",
          py: "8px",
        },
        "& .MuiFormHelperText-root": {
          fontSize: "11px",
          mt: "3px",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        {counts
          .filter(({ count }) => count > 0)
          .map(({ category }) => (
            <Box
              key={category}
              sx={{
                mb: 2.5,
                p: { xs: 1.2, md: 1.6 },
                borderRadius: "14px",
                border: "1px solid #E3EBF7",
                background:
                  "linear-gradient(180deg, #FBFDFF 0%, #FFFFFF 100%)",
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#D4DFEF",
                  },
                  "&:hover fieldset": {
                    borderColor: "var(--primary-button)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "var(--primary-button)",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#5a6b85",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "var(--primary-button)",
                },
                ".react-datepicker-wrapper": {
                  width: "100%",
                },
              }}
            >
              <Box
                key={category}
                sx={{
                  fontSize: { xs: 14, md: 16 },
                  borderBottom: "1px solid #E3EBF7",
                  pb: 0.8,
                  mb: 1.4,
                  color: "#123d66",
                  fontWeight: 700,
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
                    mb: 1.6,
                    p: { xs: 1.1, md: 1.4 },
                    borderRadius: "12px",
                    border: "1px solid #E8EEF8",
                    backgroundColor: "#FDFEFF",
                  }}
                >
                  <Grid
                    item
                    xs={12}
                    container
                    sx={{
                      position: "relative",
                      alignItems: "center",
                      mb: 0.5,
                      minHeight: 24,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: "var(--primary-button)",
                        color: "var(--white)",
                        py: 0.45,
                        px: 1.2,
                        borderRadius: "999px",
                        position: "absolute",
                        right: 0,
                        top: { xs: "42%", md: "48%" },
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}{" "}
                      {index + 1}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={12}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: { xs: 14, md: 15 },
                          color: "#123d66",
                          fontWeight: 700,
                        }}
                      >
                        Personal Details
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Button
                          component="label"
                          variant="outlined"
                          size="small"
                          startIcon={<FaCamera />}
                          sx={{
                            borderColor: "var(--primary-button)",
                            color: "var(--primary-button)",
                            textTransform: "none",
                            borderRadius: "9px",
                            fontWeight: 600,
                            fontSize: "11px",
                            px: 1.2,
                            py: 0.2,
                            ":hover": {
                              borderColor: "var(--primary-button)",
                              backgroundColor: "rgba(0,0,0,0.03)",
                            },
                          }}
                        >
                          {passportScanState[getScanKey(category, index)]?.loading
                            ? "Scanning..."
                            : "Scan Passport"}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            capture="environment"
                            onChange={(event) =>
                              handlePassportScanAndAutofill(event, category, index)
                            }
                            disabled={
                              passportScanState[getScanKey(category, index)]?.loading
                            }
                          />
                        </Button>
                      </Box>
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
                    {passportScanState[getScanKey(category, index)]?.error ? (
                      <Typography
                        sx={{
                          mb: 1,
                          fontSize: 11,
                          color: "#d32f2f",
                          fontWeight: 500,
                        }}
                      >
                        {passportScanState[getScanKey(category, index)]?.error}
                      </Typography>
                    ) : null}
                    {passportScanState[getScanKey(category, index)]?.success ? (
                      <Typography
                        sx={{
                          mb: 1,
                          fontSize: 11,
                          color: "#2e7d32",
                          fontWeight: 500,
                        }}
                      >
                        {passportScanState[getScanKey(category, index)]?.success}
                      </Typography>
                    ) : null}
                    <FormControl fullWidth>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "14px", color: "gray" }}
                      >
                        Select Title *
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {["Mr", "Mrs", "Ms", "Mstr", "Miss"].map((option) => (
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
                              borderRadius: "8px",
                              fontWeight: 600,
                              fontSize: "11px",
                              minHeight: 30,
                              px: 1.1,
                              py: 0.1,
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
                                fontSize: "12px",
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

                  <Grid item xs={12} md={12}>
                    <Box
                      sx={{
                        fontSize: { xs: 14, md: 15 },
                        color: "#123d66",
                        fontWeight: 700,
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
                        Nationality *
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
                          Select Nationality
                        </MenuItem>
                        {CountryList.map((country) => (
                          <MenuItem key={country.code} value={country.code}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors[category][index] && !passenger.passNation && (
                        <FormHelperText error>
                          Nationality is required
                        </FormHelperText>
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
                        Passport Issuing Country *
                      </Typography>
                      <Select
                        value={passenger.passIssueCountry || ""}
                        onChange={(event) =>
                          handleInputChange(
                            { target: { value: event.target.value } },
                            category,
                            index,
                            "passIssueCountry"
                          )
                        }
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        sx={{
                          height: 40,
                          borderRadius: 2,
                          borderColor: "lightgray",
                          fontSize: "11px",
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              border: "1px solid lightgray",
                            },
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select Issuing Country
                        </MenuItem>
                        {CountryList.map((country) => (
                          <MenuItem key={country.code} value={country.code}>
                            {getCountryDisplayLabel(country)}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors[category][index] &&
                        !passenger.passIssueCountry && (
                          <FormHelperText error>
                            Passport issuing country is required
                          </FormHelperText>
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
                            height: 40,
                            borderRadius: 2,
                            borderColor: "lightgray",
                            fontSize: "12px",
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
                        Passport Expiry Date *
                      </Typography>
                      <DatePicker
                        selected={
                          passenger?.passEx ? new Date(passenger.passEx) : null
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
                            error={errors[category][index] && !passenger?.passEx}
                            helperText={
                              errors[category][index] && !passenger?.passEx
                                ? "Passport Expiry Date is required"
                                : ""
                            }
                            InputProps={{
                              sx: {
                                height: 40,
                                borderRadius: 2,
                                borderColor: "lightgray",
                                fontSize: "12px",
                              },
                            }}
                          />
                        }
                        minDate={new Date()}
                        popperPlacement={"bottom-start"}
                      />
                    </FormControl>
                  </Grid>

                  <Grid container spacing={{ xs: 1, md: 1.4 }} p={1}>
                    {domestic && (
                      <Grid item xs={12} sm={6} md={6}>
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
                              borderRadius: "10px",
                              width: { xs: "100%", md: "78%" },
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
                                    fontSize: 52,
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
                      <Grid item xs={12} sm={6} md={6}>
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
                              borderRadius: "10px",
                              width: { xs: "100%", md: "78%" },
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
                                    fontSize: 52,
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
        <Grid
          container
          spacing={1.4}
          mt={1.8}
          sx={{
            borderTop: "1px solid #E3EBF7",
            pt: 1.5,
          }}
        >
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
                  fontSize: "12px",
                  color: "#36577b",
                  fontWeight: 600,
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
          sx={{
            bgcolor: "var(--primary-button)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            py: "9px",
            width: "100%",
            fontSize: "13px",
            letterSpacing: 0.2,
            color: "#ffffff",
            fontWeight: 600,
            ":hover": {
              bgcolor: "var(--primary-button)",
              color: "#ffffff",
            },
          }}
        >
          Preview Booking
        </Button>
      </form>
    </Box>
  );
};

export default FlightForm;
