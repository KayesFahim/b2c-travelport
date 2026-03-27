import React, { useEffect, useMemo, useState } from "react";
// ── Seat Selection Dialog State ──
// (Placed at top for clarity)

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import commaNumber from "comma-number";
import { PDFDownloadLink } from "@react-pdf/renderer";
import NavBar from "../../Shared/NavBar/NavBar";
import FlightDetailsContent from "../ShowDetails/FlightDetailsContent";
import PdfPageDesign from "../AllPDF/BookingAllPdf/PdfPageDesign";
import RightSidebarInfo from "./RightSidebarInfo";

const FONT = '"Manrope", sans-serif';

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getValueByPathList = (obj, paths = []) => {
  for (const path of paths) {
    if (!path) continue;
    const keys = String(path).split(".");
    let current = obj;
    let isMissing = false;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object" ||
        !(key in current)
      ) {
        isMissing = true;
        break;
      }
      current = current[key];
    }

    if (!isMissing && current !== undefined && current !== null && current !== "") {
      return current;
    }
  }

  return undefined;
};

const toNumberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBooleanValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
};

const formatMoney = (value) =>
  commaNumber(Math.round(toNumberValue(value) * 100) / 100);

const paxLabel = (value) => {
  const code = String(value || "").toUpperCase();
  if (code === "ADT" || code === "ADULT") return "Adult";
  if (code === "CHD" || code === "CNN" || code === "CHILD") return "Child";
  if (code === "INF" || code === "INFANT") return "Infant";
  return value || "Passenger";
};

const normalizePaxTypeCode = (value) => {
  const code = String(value || "").trim().toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "ADT";
  if (["CHD", "CNN", "CHILD"].includes(code)) return "CHD";
  if (["INF", "INFANT"].includes(code)) return "INF";
  return "ADT";
};

const buildAncillaryRowKey = (row) =>
  [
    toText(row?.offerListIdentifier),
    toText(row?.offerId),
    toText(row?.productIdentifier),
    toText(row?.travelerId),
  ].join("::");

const isTicketedStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  return status === "ticketed" || status === "issued" || status === "ticket issue done";
};

const isCancelledStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  return status === "cancelled" || status === "canceled";
};

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toText(item);
      if (parsed) return parsed;
    }
    return "";
  }
  if (typeof value === "object") {
    return (
      toText(value?.value) ||
      toText(value?.Value) ||
      toText(value?.id) ||
      toText(value?.ID) ||
      ""
    );
  }
  return "";
};

const toStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toText(item)).filter(Boolean);
};

const uniqueTexts = (values) => Array.from(new Set(values.filter(Boolean)));

const collectTextsByLikelyKeys = (source, keys) => {
  if (!source || typeof source !== "object") return [];
  const rows = [];
  const visit = (node, depth = 0) => {
    if (!node || depth > 6) return;
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof node !== "object") return;

    Object.entries(node).forEach(([key, val]) => {
      const normalizedKey = String(key || "").toLowerCase();
      if (keys.some((k) => normalizedKey.includes(k))) {
        if (Array.isArray(val)) {
          rows.push(...toStringList(val));
        } else if (val && typeof val === "object") {
          rows.push(
            toText(val?.description) ||
            toText(val?.Description) ||
            toText(val?.text) ||
            toText(val?.Text) ||
            toText(val?.value) ||
            toText(val?.Value) ||
            ""
          );
        } else {
          rows.push(toText(val));
        }
      }
      if (val && typeof val === "object") {
        visit(val, depth + 1);
      }
    });
  };

  visit(source, 0);
  return uniqueTexts(rows);
};

const extractAmenitiesFromApi = (...sources) => {
  const amenities = [];
  sources.forEach((source) => {
    amenities.push(
      ...collectTextsByLikelyKeys(source, ["amenit", "feature", "brandfeature"]),
      ...toStringList(source?.brand?.amenities),
      ...toStringList(source?.brand?.features),
      ...toStringList(source?.Brand?.Amenities),
      ...toStringList(source?.Brand?.Features)
    );
  });
  return uniqueTexts(amenities);
};

const toReadableBaggageItem = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return toText(value);
  }
  if (Array.isArray(value)) {
    return uniqueTexts(value.map((item) => toReadableBaggageItem(item)).filter(Boolean)).join(", ");
  }
  if (typeof value !== "object") return "";

  const pieces = [];
  const desc =
    toText(value?.description) ||
    toText(value?.Description) ||
    toText(value?.text) ||
    toText(value?.Text) ||
    toText(value?.value) ||
    toText(value?.Value);
  if (desc) pieces.push(desc);

  const quantity =
    toText(value?.quantity) ||
    toText(value?.Quantity) ||
    toText(value?.pieceCount) ||
    toText(value?.PieceCount) ||
    toText(value?.pieces) ||
    toText(value?.Pieces);
  const weight =
    toText(value?.weight) ||
    toText(value?.Weight) ||
    toText(value?.maxWeight) ||
    toText(value?.MaxWeight);
  const unit =
    toText(value?.unit) ||
    toText(value?.Unit) ||
    toText(value?.weightUnit) ||
    toText(value?.WeightUnit);
  const allowanceRef =
    toText(value?.BaggageAllowanceRef?.value) ||
    toText(value?.BaggageAllowanceRef) ||
    toText(value?.baggageAllowanceRef?.value) ||
    toText(value?.baggageAllowanceRef);

  if (quantity) {
    pieces.push(unit ? `${quantity} ${unit}` : quantity);
  } else if (weight) {
    pieces.push(unit ? `${weight} ${unit}` : weight);
  }

  if (allowanceRef) {
    pieces.push(`Ref: ${allowanceRef}`);
  }

  return uniqueTexts(pieces).join(" | ");
};

const extractBaggageFromApi = (...sources) => {
  const baggage = [];

  sources.forEach((source) => {
    baggage.push(...collectTextsByLikelyKeys(source, ["baggage", "allowance", "checkedbag", "carryon"]));

    const candidateValues = [
      getValueByPathList(source, [
        "ReservationResponse.Reservation.Offer.0.Product.0.PassengerFlight.0.FlightProduct.0.BaggageAllowance",
        "ReservationResponse.Reservation.Offer.0.Product.0.PassengerFlight.0.FlightProduct.0.BaggageAllowances",
        "Reservation.Offer.0.Product.0.PassengerFlight.0.FlightProduct.0.BaggageAllowance",
        "Reservation.Offer.0.Product.0.PassengerFlight.0.FlightProduct.0.BaggageAllowances",
        "Offer.0.Product.0.PassengerFlight.0.FlightProduct.0.BaggageAllowance",
        "Offer.0.Product.0.PassengerFlight.0.FlightProduct.0.BaggageAllowances",
        "selectedAirPrice.BaggageAllowance",
        "selectedAirPrice.BaggageAllowances",
        "selectedOffer.BaggageAllowance",
        "selectedOffer.BaggageAllowances",
        "baggage",
        "Baggage",
      ]),
    ];

    candidateValues.forEach((value) => {
      if (Array.isArray(value)) {
        baggage.push(...value.map((item) => toReadableBaggageItem(item)).filter(Boolean));
      } else {
        const parsed = toReadableBaggageItem(value);
        if (parsed) baggage.push(parsed);
      }
    });
  });

  return uniqueTexts(baggage);
};

const extractBrandDetailsFromApi = (...sources) => {
  const brandName =
    toText(
      sources
        .map((source) =>
          getValueByPathList(source, [
            "brand.name",
            "Brand.Name",
            "selectedAirPrice.BrandName",
            "selectedAirPrice.brandName",
            "selectedOffer.BrandName",
            "selectedOffer.brandName",
            "ReservationResponse.Reservation.Offer.0.Brand.Name",
            "Reservation.Offer.0.Brand.Name",
            "Offer.0.Brand.Name",
            "BrandName",
            "brandName",
          ])
        )
        .find(Boolean)
    ) || "";

  const brandCode =
    toText(
      sources
        .map((source) =>
          getValueByPathList(source, [
            "brand.code",
            "Brand.Code",
            "selectedAirPrice.BrandCode",
            "selectedAirPrice.brandCode",
            "selectedOffer.BrandCode",
            "selectedOffer.brandCode",
            "ReservationResponse.Reservation.Offer.0.Brand.Code",
            "Reservation.Offer.0.Brand.Code",
            "Offer.0.Brand.Code",
            "BrandCode",
            "brandCode",
          ])
        )
        .find(Boolean)
    ) || "";

  return { brandName, brandCode };
};

const extractChangeCancelPoliciesFromApi = (...sources) => {
  const allPolicyTexts = [];
  sources.forEach((source) => {
    allPolicyTexts.push(
      ...collectTextsByLikelyKeys(source, ["policy", "penalt", "refund", "cancel", "change", "reissue"])
    );
  });

  const unique = uniqueTexts(allPolicyTexts);
  const changePolicies = unique.filter((line) => {
    const text = line.toLowerCase();
    return text.includes("change") || text.includes("reissue") || text.includes("exchange");
  });
  const cancellationPolicies = unique.filter((line) => {
    const text = line.toLowerCase();
    return text.includes("cancel") || text.includes("refund") || text.includes("void");
  });

  return { changePolicies, cancellationPolicies };
};

const resolveReservationFromPnrPayload = (payload) => {
  const reservationResponse =
    payload?.ReservationResponse && typeof payload.ReservationResponse === "object"
      ? payload.ReservationResponse
      : payload;
  const reservation =
    reservationResponse?.Reservation && typeof reservationResponse.Reservation === "object"
      ? reservationResponse.Reservation
      : null;
  return reservation;
};

const extractPrimaryFlightProduct = (reservation) => {
  return (
    reservation?.Offer?.[0]?.Product?.[0]?.PassengerFlight?.[0]?.FlightProduct?.[0] ||
    reservation?.Product?.[0]?.PassengerFlight?.[0]?.FlightProduct?.[0] ||
    null
  );
};

const mapReservationToFlightInfoSource = (reservation) => {
  if (!reservation || typeof reservation !== "object") return null;
  const offers = Array.isArray(reservation?.Offer) ? reservation.Offer : [];
  if (!offers.length) return null;

  const firstOffer = offers[0] || {};
  const products = Array.isArray(firstOffer?.Product) ? firstOffer.Product : [];
  const allLegsInfo = products
    .map((product) => {
      const segments = Array.isArray(product?.FlightSegment) ? product.FlightSegment : [];
      if (!segments.length) return null;

      const mappedSegments = segments
        .map((segment) => {
          const flight = segment?.Flight || {};
          const departure = flight?.Departure || {};
          const arrival = flight?.Arrival || {};
          const depDate = toText(departure?.date);
          const depTime = toText(departure?.time);
          const arrDate = toText(arrival?.date);
          const arrTime = toText(arrival?.time);

          return {
            MarketingCarrierName: toText(flight?.carrier),
            MarketingCarrier: toText(flight?.carrier),
            MarketingFlightNumber: toText(flight?.number),
            DepFrom: toText(departure?.location),
            ArrTo: toText(arrival?.location),
            DepTime:
              depDate && depTime
                ? `${depDate}T${depTime}`
                : depDate || depTime || "",
            ArrTime:
              arrDate && arrTime
                ? `${arrDate}T${arrTime}`
                : arrDate || arrTime || "",
            SegmentCode: {
              cabinCode: toText(
                (Array.isArray(product?.PassengerFlight) ? product.PassengerFlight[0] : {})
                  ?.FlightProduct?.[0]?.cabin
              ),
            },
          };
        })
        .filter(Boolean);

      if (!mappedSegments.length) return null;
      return {
        DepFrom: mappedSegments[0]?.DepFrom || "",
        ArrTo: mappedSegments[mappedSegments.length - 1]?.ArrTo || "",
        Segments: mappedSegments,
      };
    })
    .filter(Boolean);

  const priceBreakDownRaw = Array.isArray(firstOffer?.Price?.PriceBreakdown)
    ? firstOffer.Price.PriceBreakdown
    : [];
  const mappedPriceBreakDown = priceBreakDownRaw.map((row) => {
    const amount = row?.Amount || {};
    const currencyCode =
      toText(amount?.CurrencyCode?.value) ||
      toText(firstOffer?.Price?.CurrencyCode?.value) ||
      "USD";
    const baseFare = toNumberValue(amount?.Base);
    const taxes = toNumberValue(amount?.Taxes?.TotalTaxes);
    const totalFare = toNumberValue(amount?.Total) || baseFare + taxes;
    const paxType = toText(row?.requestedPassengerType) || "ADT";
    const paxCount = toNumberValue(row?.quantity) || 1;
    const currencySource =
      toText(amount?.currencySource) || toText(amount?.CurrencySource);
    const approximateInd = toBooleanValue(
      amount?.approximateInd ?? amount?.ApproximateInd
    );

    return {
      PaxType: paxType,
      CurrencyCode: currencyCode,
      BaseFare: baseFare,
      Taxes: taxes,
      TotalFare: totalFare,
      PaxCount: paxCount,
      Bag: [],
      CurrencySource: currencySource || "",
      ApproximateInd: approximateInd,
    };
  });
  const chargedPriceBreakDown = mappedPriceBreakDown.filter(
    (row) => String(row?.CurrencySource || "").trim().toLowerCase() === "charged"
  );
  const priceBreakDown = chargedPriceBreakDown.length
    ? chargedPriceBreakDown
    : mappedPriceBreakDown;
  const totalFromRows = priceBreakDown.reduce(
    (sum, row) => sum + toNumberValue(row?.TotalFare),
    0
  );
  const offerLevelTotal = toNumberValue(firstOffer?.Price?.TotalPrice);

  return {
    CurrencyCode:
      toText(firstOffer?.Price?.CurrencyCode?.value) ||
      priceBreakDown?.[0]?.CurrencyCode ||
      "USD",
    NetFare: chargedPriceBreakDown.length
      ? totalFromRows || offerLevelTotal
      : offerLevelTotal || totalFromRows,
    PriceBreakDown: priceBreakDown,
    AllLegsInfo: allLegsInfo,
  };
};

const mapReservationTravelersToPassengers = (reservation) => {
  const travelers = Array.isArray(reservation?.Traveler) ? reservation.Traveler : [];
  return travelers.map((traveler) => {
    const name = traveler?.PersonName || {};
    const travelDoc = Array.isArray(traveler?.TravelDocument)
      ? traveler.TravelDocument[0] || {}
      : {};
    return {
      PaxType: toText(traveler?.passengerTypeCode) || "ADT",
      Title: toText(name?.Prefix),
      FirstName: toText(name?.Given),
      LastName: toText(name?.Surname),
      Gender: toText(traveler?.gender),
      DateOfBirth: toText(traveler?.birthDate),
      PassportNumber: toText(travelDoc?.docNumber),
      PassportNationality: toText(travelDoc?.issueCountry),
      Nationality: toText(travelDoc?.issueCountry),
    };
  });
};

const extractTicketNumbersFromReservation = (reservation) => {
  if (!reservation || typeof reservation !== "object") return [];

  const pickTicketNumbersFromDocuments = (documents) => {
    const numbers = [];
    documents.forEach((doc) => {
      const docType = toText(doc?.["@type"] || doc?.type).toLowerCase();
      const ticketNumber = toText(doc?.Number || doc?.number);
      if (ticketNumber && (docType.includes("documentticket") || docType.includes("ticket"))) {
        numbers.push(ticketNumber);
      }
    });
    return Array.from(new Set(numbers));
  };

  const receipts = Array.isArray(reservation?.Receipt) ? reservation.Receipt : [];
  const allDocuments = receipts.flatMap((receipt) =>
    (Array.isArray(receipt?.Document) ? receipt.Document : [])
  );

  return pickTicketNumbersFromDocuments(allDocuments);
};

const extractPassengerTicketNumbers = (reservation, passengerCount) => {
  if (!reservation || typeof reservation !== "object") return [];

  const travelers = Array.isArray(reservation?.Traveler) ? reservation.Traveler : [];
  const fromTravelers = travelers.map((traveler) => {
    const travelerDocs = [
      ...getArrayByKeys(traveler, ["Ticket", "ticket", "TicketDocument", "ticketDocument", "eTicket", "ETicket"]),
      ...getArrayByKeys(traveler, ["Document", "document"]),
    ];

    const ticketNumbers = travelerDocs
      .map((doc) => toText(doc?.Number || doc?.number || doc?.ticketNumber || doc?.TicketNumber))
      .filter(Boolean);

    return Array.from(new Set(ticketNumbers)).join(", ");
  });

  if (fromTravelers.some(Boolean)) {
    return fromTravelers;
  }

  const fallback = extractTicketNumbersFromReservation(reservation);
  const normalizedCount = Math.max(passengerCount || 0, fallback.length);
  return Array.from({ length: normalizedCount }, (_, idx) => fallback[idx] || "");
};

const extractAirlinesPnrFromReservation = (reservation) => {
  if (!reservation || typeof reservation !== "object") return "";

  const receipts = Array.isArray(reservation?.Receipt) ? reservation.Receipt : [];

  // Explicit path requested: ReservationResponse.Reservation.Receipt[4].Confirmation.Locator.value
  const explicit = toText(receipts?.[4]?.Confirmation?.Locator?.value);
  if (explicit) return explicit;

  for (const receipt of receipts) {
    const candidate =
      toText(receipt?.Confirmation?.Locator?.value) ||
      toText(receipt?.Confirmation?.Locator) ||
      toText(receipt?.Locator?.value) ||
      toText(receipt?.Locator);
    if (candidate) return candidate;
  }

  return "";
};

const mergePassengerWithDbFallback = (basePassenger, dbPassenger, ticketNumber) => {
  const pick = (...values) => values.map((value) => toText(value)).find(Boolean) || "";

  return {
    ...basePassenger,
    Title: pick(basePassenger?.Title, basePassenger?.title, dbPassenger?.Title, dbPassenger?.title),
    FirstName: pick(basePassenger?.FirstName, basePassenger?.firstName, dbPassenger?.FirstName, dbPassenger?.firstName),
    LastName: pick(basePassenger?.LastName, basePassenger?.lastName, dbPassenger?.LastName, dbPassenger?.lastName),
    PaxType: pick(basePassenger?.PaxType, basePassenger?.paxType, dbPassenger?.PaxType, dbPassenger?.paxType),
    Gender: pick(basePassenger?.Gender, basePassenger?.gender, dbPassenger?.Gender, dbPassenger?.gender),
    DateOfBirth: pick(basePassenger?.DateOfBirth, basePassenger?.dateOfBirth, dbPassenger?.DateOfBirth, dbPassenger?.dateOfBirth),
    PassportNumber: pick(basePassenger?.PassportNumber, basePassenger?.passportNumber, dbPassenger?.PassportNumber, dbPassenger?.passportNumber),
    PassportNationality: pick(
      basePassenger?.PassportNationality,
      basePassenger?.passportNationality,
      basePassenger?.Nationality,
      basePassenger?.nationality,
      dbPassenger?.PassportNationality,
      dbPassenger?.passportNationality,
      dbPassenger?.Nationality,
      dbPassenger?.nationality
    ),
    TicketNumber: pick(basePassenger?.TicketNumber, basePassenger?.ticketNumber, dbPassenger?.TicketNumber, dbPassenger?.ticketNumber, ticketNumber),
  };
};

const normalizeStatusForPdf = (statusText, hasTicket) => {
  const status = String(statusText || "").trim().toLowerCase();
  if (status === "booked") return "Booked";
  if (status === "hold") return "Hold";
  if (status === "cancelled") return "Cancelled";
  if (hasTicket || status === "ticketed" || status === "issued") return "Ticketed";
  return "Booked";
};

const buildPdfPayload = ({
  bookingId,
  bookingStatus,
  pnr,
  airlinesPnr,
  allLegsInfo,
  passengerList,
  priceBreakDown,
  grossFare,
  netFare,
  bookingDate,
  brandName,
  amenities,
  changePolicies,
  cancellationPolicies,
}) => {
  return [
    {
      BookingId: bookingId || "N/A",
      BookingStatus: bookingStatus || "Booked",
      BookingDate: bookingDate || new Date().toISOString(),
      TripType: (Array.isArray(allLegsInfo) && allLegsInfo.length > 1) ? "Return" : "OneWay",
      PNR: pnr || "N/A",
      AirlinesPNR: airlinesPnr || pnr || "N/A",
      BrandName: brandName || "",
      Amenities: Array.isArray(amenities) ? amenities : [],
      ChangePolicies: Array.isArray(changePolicies) ? changePolicies : [],
      CancellationPolicies: Array.isArray(cancellationPolicies) ? cancellationPolicies : [],
      AllLegsInfo: Array.isArray(allLegsInfo) ? allLegsInfo : [],
      PassengerList: Array.isArray(passengerList) ? passengerList : [],
      PriceBreakDown: Array.isArray(priceBreakDown) ? priceBreakDown : [],
      GrossFare: toNumberValue(grossFare),
      NetFare: toNumberValue(netFare),
    },
  ];
};

const summarizePostCommitReservation = (reservation) => {
  if (!reservation || typeof reservation !== "object") {
    return {
      offerCount: 0,
      productCount: 0,
      flightSegmentCount: 0,
      passengerFlightCount: 0,
      serviceCount: 0,
      ticketCount: 0,
    };
  }

  const offers = Array.isArray(reservation?.Offer) ? reservation.Offer : [];
  let productCount = 0;
  let flightSegmentCount = 0;
  let passengerFlightCount = 0;
  let serviceCount = 0;
  let ticketCount = 0;

  offers.forEach((offer) => {
    const offerServices = getArrayByKeys(offer, [
      "Service",
      "service",
      "Ancillary",
      "ancillary",
      "AncillaryOffer",
      "ancillaryOffer",
    ]);
    serviceCount += offerServices.length;

    const products = Array.isArray(offer?.Product) ? offer.Product : [];
    productCount += products.length;

    products.forEach((product) => {
      const flightSegments = Array.isArray(product?.FlightSegment)
        ? product.FlightSegment
        : [];
      const passengerFlights = Array.isArray(product?.PassengerFlight)
        ? product.PassengerFlight
        : [];
      const productServices = getArrayByKeys(product, [
        "Service",
        "service",
        "Ancillary",
        "ancillary",
        "AncillaryOffer",
        "ancillaryOffer",
      ]);

      flightSegmentCount += flightSegments.length;
      passengerFlightCount += passengerFlights.length;
      serviceCount += productServices.length;
    });
  });

  const travelers = Array.isArray(reservation?.Traveler) ? reservation.Traveler : [];
  travelers.forEach((traveler) => {
    const travelerTickets = getArrayByKeys(traveler, [
      "Ticket",
      "ticket",
      "TicketDocument",
      "ticketDocument",
      "eTicket",
      "ETicket",
    ]);
    ticketCount += travelerTickets.length;
  });

  return {
    offerCount: offers.length,
    productCount,
    flightSegmentCount,
    passengerFlightCount,
    serviceCount,
    ticketCount,
  };
};

const collectServiceEntries = (source) =>
  getArrayByKeys(source, [
    "Service",
    "service",
    "Ancillary",
    "ancillary",
    "AncillaryOffer",
    "ancillaryOffer",
  ]).filter(Boolean);

const resolveServiceAmount = (service, fallbackCurrency = "") => {
  const amountValue = toNumberValue(
    getValueByPathList(service, [
      "Amount.Total",
      "Amount.value",
      "Amount",
      "Price.Total",
      "Price.TotalPrice",
      "Price.value",
      "Total",
      "total",
      "Value",
      "value",
      "AmountBreakdown.Total",
      "PriceBreakdown.Total",
    ])
  );
  const currencyCode =
    toText(
      getValueByPathList(service, [
        "Amount.CurrencyCode.value",
        "Amount.CurrencyCode",
        "CurrencyCode.value",
        "CurrencyCode",
        "Price.CurrencyCode.value",
        "Price.CurrencyCode",
        "currencyCode",
        "currency",
      ])
    ) || fallbackCurrency;

  return {
    amountValue,
    currencyCode,
  };
};

const resolveServiceName = (service) =>
  toText(
    getValueByPathList(service, [
      "Name",
      "name",
      "Description",
      "description",
      "Text",
      "text",
      "Type",
      "type",
      "SubType",
      "subType",
      "Classification",
      "classification",
      "@type",
    ])
  ) || "Service";

const resolveServiceStatus = (service) =>
  toText(
    getValueByPathList(service, [
      "Status",
      "status",
      "FulfillmentStatus",
      "fulfillmentStatus",
      "Action",
      "action",
      "inclusion",
      "Inclusion",
    ])
  ) || "N/A";

const buildPostCommitAncillaryServiceRows = (reservation) => {
  if (!reservation || typeof reservation !== "object") return [];

  const rows = [];
  const offers = Array.isArray(reservation?.Offer) ? reservation.Offer : [];

  const pushRows = (services, context = {}) => {
    services.forEach((service, index) => {
      const { amountValue, currencyCode } = resolveServiceAmount(
        service,
        context.currencyCode || ""
      );
      const serviceName = resolveServiceName(service);
      const status = resolveServiceStatus(service);
      const travelerRef =
        toText(
          getValueByPathList(service, [
            "TravelerIdentifierRef.value",
            "TravelerIdentifierRef",
            "TravelerRef",
            "travelerRef",
            "PassengerRef",
            "passengerRef",
          ])
        ) || context.travelerRef;
      const segmentRef =
        toText(
          getValueByPathList(service, [
            "FlightRef",
            "flightRef",
            "SegmentRef",
            "segmentRef",
            "FlightSegmentRef",
            "flightSegmentRef",
          ])
        ) || context.segmentRef;

      rows.push({
        id: `${context.offerIdentifier || "offer"}-${context.productIdentifier || "product"}-${index}-${rows.length}`,
        serviceName,
        serviceType: toText(service?.["@type"] || service?.type || "Service"),
        status,
        amountValue,
        currencyCode,
        offerIdentifier: context.offerIdentifier || "N/A",
        productIdentifier: context.productIdentifier || "N/A",
        travelerRef: travelerRef || "N/A",
        segmentRef: segmentRef || "N/A",
      });
    });
  };

  const reservationLevelServices = collectServiceEntries(reservation);
  if (reservationLevelServices.length) {
    pushRows(reservationLevelServices, {
      offerIdentifier: "Reservation",
      productIdentifier: "N/A",
    });
  }

  offers.forEach((offer, offerIndex) => {
    const offerIdentifier =
      toText(
        getValueByPathList(offer, [
          "Identifier.value",
          "Identifier",
          "id",
          "ID",
          "OfferIdentifier.value",
          "OfferIdentifier",
        ])
      ) || `Offer-${offerIndex + 1}`;
    const offerCurrency = toText(
      getValueByPathList(offer, [
        "Price.CurrencyCode.value",
        "Price.CurrencyCode",
        "CurrencyCode.value",
        "CurrencyCode",
      ])
    );

    pushRows(collectServiceEntries(offer), {
      offerIdentifier,
      productIdentifier: "Offer",
      currencyCode: offerCurrency,
    });

    const products = Array.isArray(offer?.Product) ? offer.Product : [];
    products.forEach((product, productIndex) => {
      const productIdentifier =
        toText(
          getValueByPathList(product, [
            "Identifier.value",
            "Identifier",
            "id",
            "ID",
            "ProductRef",
            "productRef",
          ])
        ) || `Product-${productIndex + 1}`;

      pushRows(collectServiceEntries(product), {
        offerIdentifier,
        productIdentifier,
        currencyCode: offerCurrency,
      });

      const passengerFlights = Array.isArray(product?.PassengerFlight)
        ? product.PassengerFlight
        : [];

      passengerFlights.forEach((passengerFlight) => {
        const travelerRef = toText(
          getValueByPathList(passengerFlight, [
            "TravelerIdentifierRef.value",
            "TravelerIdentifierRef",
            "TravelerRef",
            "travelerRef",
          ])
        );
        const segmentRef = toText(
          getValueByPathList(passengerFlight, [
            "FlightSegmentRef",
            "flightSegmentRef",
            "SegmentRef",
            "segmentRef",
            "FlightRef",
            "flightRef",
          ])
        );

        pushRows(collectServiceEntries(passengerFlight), {
          offerIdentifier,
          productIdentifier,
          travelerRef,
          segmentRef,
          currencyCode: offerCurrency,
        });
      });
    });
  });

  return rows;
};

const AncillaryOfferingsDialogContent = ({
  data,
  passengers = [],
  passengerSelectionMap = {},
  onPassengerSelectionChange = () => {},
  onAddAncillary = () => {},
  loadingRowKey = "",
}) => {
  const flightSegmentMap = (() => {
    const map = {};
    const referenceLists = Array.isArray(data?.CatalogOfferingsAncillaryListResponse?.ReferenceList)
      ? data.CatalogOfferingsAncillaryListResponse.ReferenceList
      : [];

    referenceLists.forEach((referenceItem) => {
      const flights = Array.isArray(referenceItem?.Flight) ? referenceItem.Flight : [];
      flights.forEach((flight) => {
        const id = toText(flight?.id);
        if (!id) return;
        map[id] = {
          from: toText(flight?.Departure?.location) || "-",
          to: toText(flight?.Arrival?.location) || "-",
        };
      });
    });

    return map;
  })();

  const passengerOptions = Array.isArray(passengers)
    ? passengers.map((passenger, index) => {
      const fullName = [passenger?.Title, passenger?.FirstName, passenger?.LastName]
        .map((value) => toText(value))
        .filter(Boolean)
        .join(" ");
      const paxType = normalizePaxTypeCode(passenger?.PaxType);
      return {
        index,
        label: `${fullName || `Passenger ${index + 1}`} (${paxLabel(paxType)})`,
      };
    })
    : [];

  const buildFullLegLabel = (refs) => {
    const orderedRefs = Array.from(new Set((Array.isArray(refs) ? refs : []).map((ref) => toText(ref)).filter(Boolean)));
    const segments = orderedRefs.map((ref) => flightSegmentMap[ref]).filter(Boolean);
    if (!segments.length) return "All Routes";

    const points = [];
    segments.forEach((segment, index) => {
      if (index === 0 && segment.from) points.push(segment.from);
      if (segment.to) points.push(segment.to);
    });

    return points.filter(Boolean).join(" -> ") || "All Routes";
  };

  const offerings = (() => {
    const root =
      data?.CatalogOfferingsAncillaryListResponse &&
        typeof data.CatalogOfferingsAncillaryListResponse === "object"
        ? data.CatalogOfferingsAncillaryListResponse
        : {};
    const rootOfferListIdentifier = toText(
      root?.CatalogOfferingsIdentifier ||
      root?.Identifier ||
      root?.id
    );
    const travelerRows = root?.CatalogOfferingsID;
    if (!Array.isArray(travelerRows)) return [];

    const flat = [];
    travelerRows.forEach((travelerItem) => {
      const travelerId = toText(travelerItem?.id);
      const travelerOfferListIdentifier =
        toText(
          travelerItem?.CatalogOfferingsIdentifier ||
          travelerItem?.catalogOfferingsIdentifier ||
          travelerItem?.Identifier
        ) || rootOfferListIdentifier;
      const travelerOffers = Array.isArray(travelerItem?.CatalogOffering)
        ? travelerItem.CatalogOffering
        : [];

      travelerOffers.forEach((offer) => {
        const price = offer?.Price || {};
        const currency = toText(price?.CurrencyCode?.value || price?.CurrencyCode);
        const totalPrice = Number(price?.TotalPrice ?? 0);
        const offerId = toText(offer?.id || offer?.Identifier);
        const termsAndConditions = offer?.TermsAndConditions || {};
        const productOptions = Array.isArray(offer?.ProductOptions) ? offer.ProductOptions : [];
        const directProducts = Array.isArray(offer?.Product) ? offer.Product : [];
        const products = [
          ...productOptions.flatMap((option) =>
            Array.isArray(option?.Product) ? option.Product : []
          ),
          ...directProducts,
        ];

        products.forEach((product) => {
          const ancillary = product?.Ancillary || {};
          const descriptionRow = Array.isArray(ancillary?.Description)
            ? ancillary.Description[0] || {}
            : {};
          const weight = ancillary?.Measurement?.[0] || {};
          const productIdentifier = toText(
            product?.Identifier?.value ||
            product?.Identifier ||
            product?.id ||
            product?.ID
          );

          flat.push({
            travelerId,
            offerListIdentifier: travelerOfferListIdentifier,
            offerId,
            productIdentifier,
            ancillaryType: toText(ancillary?.["@type"] || product?.["@type"]),
            subCode: toText(descriptionRow?.subCode),
            ssrCode: toText(descriptionRow?.ssrCode),
            description:
              toText(descriptionRow?.value) ||
              toText(product?.name || product?.Name) ||
              toText(offer?.name || offer?.Name) ||
              "Ancillary",
            totalPrice: Number.isFinite(totalPrice) ? totalPrice : 0,
            currency,
            quantity: toText(product?.Quantity || "1") || "1",
            flightRefs: Array.isArray(ancillary?.FlightRef) ? ancillary.FlightRef : [],
            refundability:
              toText(termsAndConditions?.Refundability?.value) ||
              toText(termsAndConditions?.refundability?.value) ||
              "N/A",
            allowance:
              toText(weight?.value) && toText(weight?.unit)
                ? `${toText(weight?.value)} ${toText(weight?.unit)}`
                : "",
            isSelectable: Boolean(
              travelerOfferListIdentifier && offerId && productIdentifier
            ),
          });
        });
      });
    });

    return flat;
  })();

  if (!offerings.length) {
    return (
      <Typography sx={{ fontSize: 13, color: "#607890", py: 1.5, textAlign: "center" }}>
        No ancillary offerings available for this booking.
      </Typography>
    );
  }

  const groupedByRoute = offerings.reduce((acc, row) => {
    const routeKey = buildFullLegLabel(row.flightRefs);
    if (!acc[routeKey]) acc[routeKey] = [];
    acc[routeKey].push(row);
    return acc;
  }, {});

  const orderedRouteGroups = Object.entries(groupedByRoute)
    .map(([routeKey, rows]) => {
      const sortedRows = [...rows].sort((a, b) => a.totalPrice - b.totalPrice);
      return {
        routeKey,
        rows: sortedRows,
      };
    })
    .sort((a, b) => {
      const minA = a.rows[0]?.totalPrice ?? Number.MAX_SAFE_INTEGER;
      const minB = b.rows[0]?.totalPrice ?? Number.MAX_SAFE_INTEGER;
      return minA - minB;
    });

  const labeledRouteGroups = orderedRouteGroups.map((group, index, allGroups) => {
    const firstPoints = String(allGroups[0]?.routeKey || "").split(" -> ").map((item) => item.trim()).filter(Boolean);
    const currentPoints = String(group.routeKey || "").split(" -> ").map((item) => item.trim()).filter(Boolean);
    const firstOrigin = firstPoints[0] || "";
    const firstDestination = firstPoints[firstPoints.length - 1] || "";
    const currentOrigin = currentPoints[0] || "";
    const currentDestination = currentPoints[currentPoints.length - 1] || "";

    let label = `Leg ${index + 1}`;
    if (index === 0) {
      label = "Outbound";
    } else if (
      firstOrigin &&
      firstDestination &&
      currentOrigin === firstDestination &&
      currentDestination === firstOrigin
    ) {
      label = "Return";
    }

    return {
      ...group,
      label,
    };
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
      {labeledRouteGroups.map((group) => (
        <Box
          key={`anc-route-group-${group.routeKey}`}
          sx={{ border: "1px solid #DCE7F3", borderRadius: "10px", p: 1.2, bgcolor: "#FCFEFF" }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#10355b", mb: 0.2 }}>
            {group.label}: {group.routeKey}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#6D8299", mb: 0.8 }}>
            {group.rows.length} option{group.rows.length > 1 ? "s" : ""} | Cheapest first
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.7 }}>
            {group.rows.map((row, idx) => {
              const displayPrice =
                Number.isFinite(row.totalPrice) && row.totalPrice > 0
                  ? `${row.totalPrice.toLocaleString()}${row.currency ? ` ${row.currency}` : ""}`
                  : "N/A";
              const rowKey = buildAncillaryRowKey(row);
              const selectedPassengerIndexRaw = Number(
                passengerSelectionMap?.[rowKey]
              );
              const selectedPassengerIndex =
                Number.isFinite(selectedPassengerIndexRaw) &&
                  selectedPassengerIndexRaw >= 0 &&
                  selectedPassengerIndexRaw < passengerOptions.length
                  ? selectedPassengerIndexRaw
                  : 0;
              const isLoading = loadingRowKey === rowKey;
              const canAdd = row?.isSelectable && passengerOptions.length > 0;

              return (
                <Box
                  key={`anc-row-${group.routeKey}-${idx}`}
                  sx={{
                    border: "1px dashed #D5E2F0",
                    borderRadius: "8px",
                    px: 1,
                    py: 0.8,
                    bgcolor: "#F7FBFF",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 0.35,
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: "#4A607A", gridColumn: { xs: "1", md: "1 / span 2" } }}>
                    Description: <strong>{row.description || "N/A"}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                    Price: <strong>{displayPrice}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                    Offer ID: <strong>{row.offerId || "N/A"}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                    Product ID: <strong>{row.productIdentifier || "N/A"}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                    Type: <strong>{row.ancillaryType || "N/A"}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                    Quantity: <strong>{row.quantity || "1"}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                    Refundability: <strong>{row.refundability || "N/A"}</strong>
                  </Typography>
                  {row.allowance ? (
                    <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                      Allowance: <strong>{row.allowance}</strong>
                    </Typography>
                  ) : null}
                  {row.travelerId ? (
                    <Typography sx={{ fontSize: 12, color: "#4A607A" }}>
                      Traveler: <strong>{row.travelerId}</strong>
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      gridColumn: { xs: "1", md: "1 / span 2" },
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                      mt: 0.4,
                    }}
                  >
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id={`ancillary-passenger-label-${rowKey}`}>
                        Add For
                      </InputLabel>
                      <Select
                        labelId={`ancillary-passenger-label-${rowKey}`}
                        label="Add For"
                        value={selectedPassengerIndex}
                        onChange={(event) =>
                          onPassengerSelectionChange(
                            rowKey,
                            Number(event.target.value)
                          )
                        }
                        sx={{ fontSize: 12, background: "#FFFFFF" }}
                      >
                        {passengerOptions.map((option) => (
                          <MenuItem key={`${rowKey}-pax-${option.index}`} value={option.index}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!canAdd || isLoading}
                      onClick={() =>
                        onAddAncillary(row, selectedPassengerIndex)
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        bgcolor: "#0A527A",
                        ":hover": { bgcolor: "#0A527A" },
                      }}
                    >
                      {isLoading ? "Adding..." : "Add To Booking"}
                    </Button>
                    {!row?.isSelectable ? (
                      <Typography sx={{ fontSize: 11, color: "#B3261E" }}>
                        Missing catalog references for this option.
                      </Typography>
                    ) : null}
                  </Box>
                  {row.flightRefs.length ? (
                    <Typography sx={{ fontSize: 12, color: "#4A607A", gridColumn: { xs: "1", md: "1 / span 2" } }}>
                      Flight Refs: <strong>{row.flightRefs.join(", ")}</strong>
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const BookingConfirmation = () => {
  // ── Seat Selection Dialog State ──
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [seatDialogSegmentIdx, setSeatDialogSegmentIdx] = useState(0);
  const [seatDialogPassengerIdx, setSeatDialogPassengerIdx] = useState(0);
  const [seatEligibilityLoading, setSeatEligibilityLoading] = useState(false);
  const [seatEligibilityResult, setSeatEligibilityResult] = useState(null);
  const [seatEligibilityError, setSeatEligibilityError] = useState("");
  const [seatDialogSelections, setSeatDialogSelections] = useState([]);
  const [seatDialogAutoOpenKey, setSeatDialogAutoOpenKey] = useState(0);
  const [seatAddLoading, setSeatAddLoading] = useState(false);
  const [seatAddResult, setSeatAddResult] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(
    () => new URLSearchParams(location.search || ""),
    [location.search]
  );
  const bookingLookupFromQuery = toText(
    queryParams.get("id") ||
    queryParams.get("bookingId") ||
    queryParams.get("pnr") ||
    queryParams.get("locator") ||
    queryParams.get("reservationId")
  );
  const pnrFromQuery = toText(
    queryParams.get("pnr") || queryParams.get("locator") || queryParams.get("reservationId")
  );

  const [bookingPayload, setBookingPayload] = useState(
    location?.state?.previewPayload || null
  );
  const [finalCommitResponse, setFinalCommitResponse] = useState(
    location?.state?.finalCommitResponse || null
  );
  const [reservationByPnrPayload, setReservationByPnrPayload] = useState(null);
  const [reservationByPnrLoading, setReservationByPnrLoading] = useState(false);
  const [reservationByPnrError, setReservationByPnrError] = useState("");
  const [bookingDetailsDbPayload, setBookingDetailsDbPayload] = useState(null);
  const [bookingStatusOverride, setBookingStatusOverride] = useState("");
  const [pnrRefreshTick, setPnrRefreshTick] = useState(0);
  const [issueTicketSubmitting, setIssueTicketSubmitting] = useState(false);
  const [cancelBookingSubmitting, setCancelBookingSubmitting] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [showPassengerTicketDownloads, setShowPassengerTicketDownloads] = useState(false);
  const [ancillaryShopLoading, setAncillaryShopLoading] = useState(false);
  const [ancillaryShopOpen, setAncillaryShopOpen] = useState(false);
  const [ancillaryShopData, setAncillaryShopData] = useState(null);
  const [ancillaryShopError, setAncillaryShopError] = useState("");
  const [ancillaryPassengerSelectionMap, setAncillaryPassengerSelectionMap] = useState({});
  const [ancillaryAddLoadingKey, setAncillaryAddLoadingKey] = useState("");
  const [ancillaryAddResult, setAncillaryAddResult] = useState(null);
  const [issueTicketFeedback, setIssueTicketFeedback] = useState({
    severity: "",
    message: "",
    needsPreviewRecovery: false,
  });

  useEffect(() => {
    if (bookingPayload && finalCommitResponse) return;

    try {
      if (typeof window === "undefined") return;

      if (!bookingPayload) {
        const previewRaw = window.sessionStorage.getItem("flyjatt:preview_booking");
        if (previewRaw) {
          const parsed = JSON.parse(previewRaw);
          if (parsed) {
            setBookingPayload(parsed);
          }
        }
      }

      if (!finalCommitResponse) {
        const finalRaw = window.sessionStorage.getItem(
          "flyjatt:last_book_hold_response"
        );
        if (finalRaw) {
          const parsed = JSON.parse(finalRaw);
          if (parsed) {
            setFinalCommitResponse(parsed);
          }
        }
      }
    } catch (error) {
      console.warn("Unable to read booking confirmation cache", error);
    }
  }, [bookingPayload, finalCommitResponse]);

  useEffect(() => {
    if (!pnrFromQuery) return;

    let isMounted = true;
    const loadReservationByPnr = async () => {
      setReservationByPnrLoading(true);
      setReservationByPnrError("");
      try {
        const response = await fetch(
          `/api/travelport/reservation-by-pnr?pnr=${encodeURIComponent(
            pnrFromQuery
          )}&detailViewInd=true&viewBrandCompleteInfoInd=true`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message ||
            payload?.details ||
            `Reservation retrieve failed (${response.status})`
          );
        }
        if (!isMounted) return;
        setReservationByPnrPayload(payload || null);
      } catch (error) {
        if (!isMounted) return;
        setReservationByPnrError(
          error instanceof Error
            ? error.message
            : "Unable to load reservation by PNR."
        );
      } finally {
        if (isMounted) setReservationByPnrLoading(false);
      }
    };

    loadReservationByPnr();
    return () => {
      isMounted = false;
    };
  }, [pnrFromQuery, pnrRefreshTick]);

  useEffect(() => {
    const dbLookupId =
      toText(bookingLookupFromQuery) ||
      toText(pnrFromQuery) ||
      toText(finalCommitResponse?.locator) ||
      toText(finalCommitResponse?.reservationId);

    if (!dbLookupId) return;

    let isMounted = true;
    const loadBookingDetailsFromDb = async () => {
      try {
        const response = await fetch(
          `/api/user/booking-details?id=${encodeURIComponent(dbLookupId)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !isMounted) return;
        setBookingDetailsDbPayload(payload || null);
      } catch {
        // Keep confirmation flow resilient when DB detail fetch is unavailable.
      }
    };

    loadBookingDetailsFromDb();
    return () => {
      isMounted = false;
    };
  }, [bookingLookupFromQuery, pnrFromQuery, finalCommitResponse?.locator, finalCommitResponse?.reservationId, pnrRefreshTick]);

  const reservationFromPnr = useMemo(
    () => resolveReservationFromPnrPayload(reservationByPnrPayload),
    [reservationByPnrPayload]
  );
  const reservationFromFinalCommit = useMemo(
    () => resolveReservationFromPnrPayload(finalCommitResponse),
    [finalCommitResponse]
  );
  const resolvedCommittedReservation = reservationFromPnr || reservationFromFinalCommit;
  const reservationSummary = useMemo(
    () => summarizePostCommitReservation(resolvedCommittedReservation),
    [resolvedCommittedReservation]
  );
  const ancillaryServiceRows = useMemo(
    () => buildPostCommitAncillaryServiceRows(resolvedCommittedReservation),
    [resolvedCommittedReservation]
  );

  const passengersFromBooking = Array.isArray(bookingPayload?.passengers)
    ? bookingPayload.passengers
    : Array.isArray(bookingPayload?.bookingBody?.Passengers)
      ? bookingPayload.bookingBody.Passengers
      : [];
  const passengersFromPnr = mapReservationTravelersToPassengers(
    resolvedCommittedReservation
  );
  const passengers =
    passengersFromPnr.length > 0 ? passengersFromPnr : passengersFromBooking;

  const selectedAirPrice = bookingPayload?.selectedAirPrice || {};
  const selectedOffer = bookingPayload?.selectedOffer || {};
  const flightInfoSourceFromBooking =
    selectedAirPrice && Object.keys(selectedAirPrice).length
      ? selectedAirPrice
      : selectedOffer;
  const flightInfoSourceFromPnr = mapReservationToFlightInfoSource(
    resolvedCommittedReservation
  );
  const flightInfoSource =
    flightInfoSourceFromPnr && Object.keys(flightInfoSourceFromPnr).length
      ? flightInfoSourceFromPnr
      : flightInfoSourceFromBooking && Object.keys(flightInfoSourceFromBooking).length
        ? flightInfoSourceFromBooking
        : {};
  const amenitiesFromApi = useMemo(
    () =>
      extractAmenitiesFromApi(
        flightInfoSource,
        resolvedCommittedReservation,
        reservationByPnrPayload,
        bookingPayload
      ),
    [flightInfoSource, resolvedCommittedReservation, reservationByPnrPayload, bookingPayload]
  );
  const baggageFromApi = useMemo(
    () =>
      extractBaggageFromApi(
        flightInfoSource,
        resolvedCommittedReservation,
        reservationByPnrPayload,
        bookingPayload
      ),
    [flightInfoSource, resolvedCommittedReservation, reservationByPnrPayload, bookingPayload]
  );
  const { changePolicies, cancellationPolicies } = useMemo(
    () =>
      extractChangeCancelPoliciesFromApi(
        flightInfoSource,
        resolvedCommittedReservation,
        reservationByPnrPayload,
        bookingPayload
      ),
    [flightInfoSource, resolvedCommittedReservation, reservationByPnrPayload, bookingPayload]
  );
  const { changePolicies: dbChangePolicies, cancellationPolicies: dbCancellationPolicies } = useMemo(
    () =>
      extractChangeCancelPoliciesFromApi(
        bookingDetailsDbPayload?.booking || {},
        bookingDetailsDbPayload || {}
      ),
    [bookingDetailsDbPayload]
  );
  const finalChangePolicies = dbChangePolicies.length ? dbChangePolicies : changePolicies;
  const finalCancellationPolicies = dbCancellationPolicies.length
    ? dbCancellationPolicies
    : cancellationPolicies;
  const { brandName, brandCode } = useMemo(
    () =>
      extractBrandDetailsFromApi(
        flightInfoSource,
        resolvedCommittedReservation,
        reservationByPnrPayload,
        bookingPayload,
        selectedAirPrice,
        selectedOffer
      ),
    [
      flightInfoSource,
      resolvedCommittedReservation,
      reservationByPnrPayload,
      bookingPayload,
      selectedAirPrice,
      selectedOffer,
    ]
  );
  const reservationFlightProduct = useMemo(
    () => extractPrimaryFlightProduct(resolvedCommittedReservation),
    [resolvedCommittedReservation]
  );
  const pathBrandName =
    toText(reservationFlightProduct?.Brand?.name) ||
    toText(reservationFlightProduct?.Brand?.Name);
  const pathFareBasisCode =
    toText(reservationFlightProduct?.fareBasisCode) ||
    toText(reservationFlightProduct?.FareBasisCode);
  const pathCabinClass =
    toText(reservationFlightProduct?.cabin) ||
    toText(reservationFlightProduct?.Cabin);
  const dbBrand = useMemo(
    () => (bookingDetailsDbPayload?.brand && typeof bookingDetailsDbPayload.brand === "object"
      ? bookingDetailsDbPayload.brand
      : {}),
    [bookingDetailsDbPayload]
  );
  const finalBrandName =
    pathBrandName ||
    toText(dbBrand?.name) ||
    toText(bookingDetailsDbPayload?.booking?.BrandName || bookingDetailsDbPayload?.booking?.brandName) ||
    brandName;
  const finalBrandCode =
    toText(dbBrand?.code) ||
    toText(bookingDetailsDbPayload?.booking?.BrandCode || bookingDetailsDbPayload?.booking?.brandCode) ||
    brandCode;
  const amenitiesFromDb = useMemo(
    () =>
      uniqueTexts(
        (Array.isArray(dbBrand?.amenities) ? dbBrand.amenities : [])
          .map((item) => toText(item))
          .filter(Boolean)
      ),
    [dbBrand]
  );
  const finalAmenities = amenitiesFromDb.length ? amenitiesFromDb : amenitiesFromApi;
  const finalFareBasisCode =
    pathFareBasisCode ||
    toText(bookingDetailsDbPayload?.booking?.fareBasisCode || bookingDetailsDbPayload?.booking?.FareBasisCode) ||
    toText(selectedAirPrice?.fareBasisCode || selectedOffer?.fareBasisCode);
  const finalCabinClass =
    pathCabinClass ||
    toText(bookingDetailsDbPayload?.booking?.cabin || bookingDetailsDbPayload?.booking?.Cabin) ||
    toText(selectedAirPrice?.cabin || selectedOffer?.cabin);

  const allLegs = getArrayByKeys(flightInfoSource, ["AllLegsInfo", "allLegsInfo"]);
  const priceRows = getArrayByKeys(flightInfoSource, ["PriceBreakDown", "priceBreakDown"]);
  const currency =
    flightInfoSource?.CurrencyCode ||
    flightInfoSource?.currencyCode ||
    priceRows?.[0]?.CurrencyCode ||
    priceRows?.[0]?.currencyCode ||
    "USD";

  const totals = useMemo(() => {
    const base = priceRows.reduce(
      (sum, row) => sum + toNumberValue(row?.BaseFare ?? row?.baseFare),
      0
    );
    const taxes = priceRows.reduce(
      (sum, row) => sum + toNumberValue(row?.Taxes ?? row?.taxes),
      0
    );
    const total =
      toNumberValue(flightInfoSource?.NetFare ?? flightInfoSource?.netFare) ||
      priceRows.reduce(
        (sum, row) => sum + toNumberValue(row?.TotalFare ?? row?.totalFare),
        0
      );

    return { base, taxes, total };
  }, [priceRows, flightInfoSource]);

  const ticketNumbers = extractTicketNumbersFromReservation(
    resolvedCommittedReservation
  );
  const bookingStatusText =
    toText(bookingStatusOverride) ||
    toText(
      bookingDetailsDbPayload?.booking?.BookingStatus ||
      bookingDetailsDbPayload?.booking?.bookingStatus ||
      bookingDetailsDbPayload?.source?.status
    ) ||
    toText(bookingPayload?.BookingStatus || bookingPayload?.bookingStatus) ||
    toText(finalCommitResponse?.BookingStatus || finalCommitResponse?.bookingStatus);
  const hasTicket = ticketNumbers.length > 0;
  const isAlreadyTicketed = hasTicket || isTicketedStatus(bookingStatusText);
  const isAlreadyCancelled = isCancelledStatus(bookingStatusText);
  const canCancelBooking = !isAlreadyTicketed && !isAlreadyCancelled;
  const ticketStatusLabel = isAlreadyCancelled
    ? "Cancelled"
    : isAlreadyTicketed
      ? "Ticketed"
      : "Pending";
  const ticketNumberText = hasTicket ? ticketNumbers.join(", ") : "N/A";
  const passengerTicketNumbers = useMemo(
    () => extractPassengerTicketNumbers(resolvedCommittedReservation, passengers.length),
    [resolvedCommittedReservation, passengers.length]
  );
  const dbPassengers = useMemo(
    () => (Array.isArray(bookingDetailsDbPayload?.passengers) ? bookingDetailsDbPayload.passengers : []),
    [bookingDetailsDbPayload]
  );
  const passengersWithDbFallback = useMemo(
    () =>
      passengers.map((passenger, index) =>
        mergePassengerWithDbFallback(
          passenger,
          dbPassengers[index] || {},
          passengerTicketNumbers[index]
        )
      ),
    [passengers, dbPassengers, passengerTicketNumbers]
  );
  const travelerSelectionRows = useMemo(() => {
    const countsByType = {
      ADT: 0,
      CHD: 0,
      INF: 0,
    };
    return passengersWithDbFallback.map((passenger, index) => {
      const travelerTypeCode = normalizePaxTypeCode(passenger?.PaxType);
      countsByType[travelerTypeCode] =
        (countsByType[travelerTypeCode] || 0) + 1;
      const travelerNumber = countsByType[travelerTypeCode] || 1;
      const fullName = [passenger?.Title, passenger?.FirstName, passenger?.LastName]
        .map((value) => toText(value))
        .filter(Boolean)
        .join(" ");
      return {
        index,
        travelerTypeCode,
        travelerNumber,
        label: `${fullName || `Passenger ${index + 1}`} (${paxLabel(travelerTypeCode)})`,
      };
    });
  }, [passengersWithDbFallback]);
  const bookingStatusForPdf = normalizeStatusForPdf(bookingStatusText, hasTicket);
  const canDownloadBookingCopy = ["booked", "hold"].includes(
    String(bookingStatusForPdf || "").trim().toLowerCase()
  );
  const canDownloadTicketCopy = isAlreadyTicketed;
  const confirmationTitle = isAlreadyCancelled
    ? "Booking Cancelled"
    : isAlreadyTicketed
      ? "Ticket Confirmed!"
      : "Booking Confirmed!";
  const confirmationSubtitle = isAlreadyCancelled
    ? "This booking has been cancelled."
    : isAlreadyTicketed
      ? "Your ticket is issued successfully. Save your PNR for check-in and support."
      : "Your booking has been committed successfully. Save your PNR for check-in and support.";
  const locator = finalCommitResponse?.locator || pnrFromQuery || "N/A";
  const airlinesPnr =
    extractAirlinesPnrFromReservation(resolvedCommittedReservation) ||
    toText(bookingDetailsDbPayload?.booking?.AirlinesPNR || bookingDetailsDbPayload?.booking?.airlinesPnr) ||
    locator;
  const reservationId =
    finalCommitResponse?.reservationId ||
    toText(resolvedCommittedReservation?.Identifier?.value) ||
    toText(resolvedCommittedReservation?.Identifier) ||
    "N/A";
  const offerId = Array.isArray(finalCommitResponse?.offerIdentifiers)
    ? finalCommitResponse.offerIdentifiers[0] || "N/A"
    : toText(
      (Array.isArray(resolvedCommittedReservation?.Offer)
        ? resolvedCommittedReservation.Offer[0]
        : {})
        ?.Identifier?.value
    ) || "N/A";
  const bookingCopyPdfData = useMemo(
    () =>
      buildPdfPayload({
        bookingId: reservationId,
        bookingStatus: bookingStatusForPdf,
        pnr: locator,
        airlinesPnr,
        allLegsInfo: allLegs,
        passengerList: passengersWithDbFallback,
        priceBreakDown: priceRows,
        grossFare: totals.total,
        netFare: totals.total,
        bookingDate: finalCommitResponse?.createdAt || new Date().toISOString(),
        brandName: finalBrandName,
        amenities: finalAmenities,
        changePolicies: finalChangePolicies,
        cancellationPolicies: finalCancellationPolicies,
      }),
    [reservationId, bookingStatusForPdf, locator, airlinesPnr, allLegs, passengersWithDbFallback, priceRows, totals.total, finalCommitResponse?.createdAt, finalBrandName, finalAmenities, finalChangePolicies, finalCancellationPolicies]
  );
  const passengerTicketDownloadRows = useMemo(() => {
    return passengersWithDbFallback
      .map((passenger, index) => {
        const ticketNumber = toText(passengerTicketNumbers[index]);
        if (!ticketNumber) return null;
        const passengerName = [passenger?.Title, passenger?.FirstName, passenger?.LastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const singlePassengerPdfData = buildPdfPayload({
          bookingId: reservationId,
          bookingStatus: "Ticketed",
          pnr: locator,
          airlinesPnr,
          allLegsInfo: allLegs,
          passengerList: [
            {
              ...passenger,
              TicketNumber: ticketNumber,
            },
          ],
          priceBreakDown: priceRows,
          grossFare: totals.total,
          netFare: totals.total,
          bookingDate: finalCommitResponse?.createdAt || new Date().toISOString(),
          brandName: finalBrandName,
          amenities: finalAmenities,
          changePolicies: finalChangePolicies,
          cancellationPolicies: finalCancellationPolicies,
        });

        return {
          index,
          ticketNumber,
          passengerName: passengerName || `Passenger ${index + 1}`,
          data: singlePassengerPdfData,
        };
      })
      .filter(Boolean);
  }, [passengersWithDbFallback, passengerTicketNumbers, reservationId, locator, airlinesPnr, allLegs, priceRows, totals.total, finalCommitResponse?.createdAt, finalBrandName, finalAmenities, finalChangePolicies, finalCancellationPolicies]);
  const seatDialogSeatAvailabilityRequest = useMemo(() => {
    const offerListIdentifier =
      toText(
        getValueByPathList(seatEligibilityResult, [
          "seatAvailabilityResponse.CatalogOfferingsAncillaryListResponse.CatalogOfferingsIdentifier.Identifier.value",
          "seatAvailabilityResponse.CatalogOfferingsAncillaryListResponse.CatalogOfferingsIdentifier.Identifier",
          "seatAvailabilityResponse.CatalogOfferingsAncillaryListResponse.CatalogOfferingsIdentifier.value",
          "seatAvailabilityResponse.CatalogOfferingsAncillaryListResponse.CatalogOfferingsIdentifier",
        ])
      ) || "";
    const offerIdentifier = toText(seatEligibilityResult?.offerIdentifier);
    const productIdentifiers = Array.isArray(seatEligibilityResult?.productIdentifiers)
      ? seatEligibilityResult.productIdentifiers.map((item) => toText(item)).filter(Boolean)
      : [];

    return {
      offerListIdentifier,
      offerIdentifier,
      productIdentifiers,
    };
  }, [seatEligibilityResult]);
  const seatDialogTravelerTypeCode =
    travelerSelectionRows?.[seatDialogPassengerIdx]?.travelerTypeCode ||
    normalizePaxTypeCode(passengersWithDbFallback?.[seatDialogPassengerIdx]?.PaxType);
  const seatDialogTravelerData = useMemo(
    () => ({
      PriceBreakDown: [
        {
          PaxType: seatDialogTravelerTypeCode || "ADT",
          PaxCount: 1,
        },
      ],
    }),
    [seatDialogTravelerTypeCode]
  );
  const selectedSeatOption = useMemo(() => {
    const selectedRow = Array.isArray(seatDialogSelections) ? seatDialogSelections[0] : null;
    if (!selectedRow) return null;

    const seatNumber = toText(selectedRow?.seatAssignment);
    if (!seatNumber) return null;

    return {
      seatNumber,
      offerListIdentifier:
        toText(selectedRow?.offerListIdentifier) ||
        toText(seatDialogSeatAvailabilityRequest?.offerListIdentifier),
      offerIdentifier:
        toText(selectedRow?.offerIdentifier) ||
        toText(seatDialogSeatAvailabilityRequest?.offerIdentifier),
      productIdentifier: toText(selectedRow?.productIdentifier),
      travelerIdentifier: toText(seatEligibilityResult?.travelerIdentifier),
      segmentRef: toText(selectedRow?.segmentRef),
    };
  }, [seatDialogSelections, seatDialogSeatAvailabilityRequest, seatEligibilityResult]);
  const selectedSeatPassengerName = useMemo(() => {
    const passenger = passengersWithDbFallback?.[seatDialogPassengerIdx] || {};
    const fullName = [passenger?.Title, passenger?.FirstName, passenger?.LastName]
      .map((value) => toText(value))
      .filter(Boolean)
      .join(" ");
    return fullName || `Passenger ${seatDialogPassengerIdx + 1}`;
  }, [passengersWithDbFallback, seatDialogPassengerIdx]);

  useEffect(() => {
    if (!seatDialogOpen) return;
    if (seatDialogSegmentIdx >= allLegs.length) {
      setSeatDialogSegmentIdx(0);
    }
  }, [seatDialogOpen, seatDialogSegmentIdx, allLegs.length]);

  useEffect(() => {
    if (!seatDialogOpen) return;
    if (seatDialogPassengerIdx >= passengersWithDbFallback.length) {
      setSeatDialogPassengerIdx(0);
    }
  }, [seatDialogOpen, seatDialogPassengerIdx, passengersWithDbFallback.length]);

  if (reservationByPnrLoading) {
    return (
      <Box>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #E3EBF7",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 13, color: "#4A607A", fontWeight: 600 }}>
              Loading booking details by PNR...
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!Object.keys(flightInfoSource || {}).length) {
    return (
      <Box>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Booking confirmation data not found. Please complete booking from preview page.
          </Alert>
          {reservationByPnrError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reservationByPnrError}
            </Alert>
          ) : null}
          <Button
            variant="contained"
            onClick={() => navigate("/previewbooking")}
            sx={{ bgcolor: "var(--primary-button)", textTransform: "none" }}
          >
            Go To Preview Booking
          </Button>
        </Container>
      </Box>
    );
  }

  const issueTicketReference = {
    reservationRef:
      toText(
        getValueByPathList(finalCommitResponse, [
          "reservationId",
          "ReservationResponse.Reservation.Identifier.value",
          "ReservationResponse.Reservation.Identifier",
          "Reservation.Identifier.value",
          "Reservation.Identifier",
          "commitResponse.ReservationResponse.Reservation.Identifier.value",
          "commitResponse.ReservationResponse.Reservation.Identifier",
          "commitResponse.Reservation.Identifier.value",
          "commitResponse.Reservation.Identifier",
          "workbenchResponse.ReservationResponse.Reservation.Identifier.value",
          "workbenchResponse.ReservationResponse.Reservation.Identifier",
        ])
      ) ||
      toText(resolvedCommittedReservation?.Identifier?.value) ||
      toText(resolvedCommittedReservation?.Identifier) ||
      "",
    flowKey: toText(finalCommitResponse?.bookingFlowKey),
    offerKey: toText(finalCommitResponse?.bookingOfferKey),
    expiresAt:
      toNumberValue(finalCommitResponse?.bookingFlowExpiresAt) || Date.now() + 600000,
  };

  const handleIssueTicket = async () => {
    const issueTicketPnr =
      toText(pnrFromQuery) ||
      toText(locator) ||
      toText(issueTicketReference?.reservationRef);
    if (!issueTicketPnr) {
      setIssueTicketFeedback({
        severity: "warning",
        message:
          "PNR not found for Issue Ticket. Please reload this confirmation page.",
        needsPreviewRecovery: false,
      });
      return;
    }

    setIssueTicketSubmitting(true);
    setIssueTicketFeedback({ severity: "", message: "", needsPreviewRecovery: false });

    try {
      const response = await fetch(
        `/api/travelport/issue-ticket?pnr=${encodeURIComponent(issueTicketPnr)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pnr: issueTicketPnr,
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        let resolvedMessage =
          payload?.message ||
          payload?.details ||
          `Issue ticket failed (${response.status})`;

        if (payload?.requiresLogin || response.status === 401) {
          resolvedMessage =
            "Login required for Issue Ticket. Please sign in again and retry.";
        }

        throw new Error(resolvedMessage);
      }

      const issuedLocator =
        toText(payload?.locator) || toText(locator) || toText(pnrFromQuery) || "N/A";
      const issuedReservation =
        toText(payload?.reservationId) || issueTicketPnr;

      setIssueTicketFeedback({
        severity: "success",
        message: `Ticket issue flow completed. Reservation ${issuedReservation} | PNR ${issuedLocator}`,
        needsPreviewRecovery: false,
      });
      setPnrRefreshTick((prev) => prev + 1);
    } catch (error) {
      setIssueTicketFeedback({
        severity: "error",
        message:
          error instanceof Error ? error.message : "Unable to issue ticket right now.",
        needsPreviewRecovery: false,
      });
    } finally {
      setIssueTicketSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    const bookingDbId = toText(bookingDetailsDbPayload?.source?.bookingDbId);

    setCancelBookingSubmitting(true);
    setIssueTicketFeedback({ severity: "", message: "", needsPreviewRecovery: false });

    try {
      const response = await fetch("/api/user/cancel-booking", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: bookingDbId,
          locator: toText(locator),
          reservationId: toText(reservationId),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message ||
          payload?.details ||
          `Cancel booking failed (${response.status})`
        );
      }

      setBookingStatusOverride("Cancelled");
      setCancelDialogOpen(false);
      setIssueTicketFeedback({
        severity: "success",
        message: "Booking cancelled successfully.",
        needsPreviewRecovery: false,
      });
      setPnrRefreshTick((prev) => prev + 1);
    } catch (error) {
      setIssueTicketFeedback({
        severity: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to cancel booking right now.",
        needsPreviewRecovery: false,
      });
    } finally {
      setCancelBookingSubmitting(false);
    }
  };

  const handleOpenSeatDialog = () => {
    setSeatDialogOpen(true);
    setSeatEligibilityError("");
    setSeatEligibilityResult(null);
    setSeatDialogSelections([]);
    setSeatAddResult(null);
    setSeatDialogAutoOpenKey((prev) => prev + 1);
    void handleCheckSeatEligibility();
  };

  const handleCloseSeatDialog = () => {
    setSeatDialogOpen(false);
  };

  const handleCheckSeatEligibility = async () => {
    const activePnr = toText(locator) || toText(pnrFromQuery);
    if (!activePnr || activePnr === "N/A") {
      setSeatEligibilityError("PNR not found. Reload booking confirmation and try again.");
      return;
    }
    if (!allLegs.length) {
      setSeatEligibilityError("No flight segments available for seat selection.");
      return;
    }
    if (!passengersWithDbFallback.length) {
      setSeatEligibilityError("No passengers available for seat selection.");
      return;
    }

    setSeatEligibilityLoading(true);
    setSeatEligibilityError("");
    setSeatEligibilityResult(null);
    setSeatDialogSelections([]);
    setSeatAddResult(null);
    setSeatDialogAutoOpenKey((prev) => prev + 1);

    try {
      const response = await fetch("/api/travelport/seat-eligibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          pnr: activePnr,
          segmentId: seatDialogSegmentIdx,
          passengerId: seatDialogPassengerIdx,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message ||
          payload?.details ||
          `Seat eligibility failed (${response.status})`
        );
      }
      setSeatEligibilityResult(payload || {});
    } catch (error) {
      setSeatEligibilityError(
        error instanceof Error
          ? error.message
          : "Unable to check seat eligibility right now."
      );
    } finally {
      setSeatEligibilityLoading(false);
    }
  };

  const handleAddSeat = async () => {
    const activePnr = toText(locator) || toText(pnrFromQuery);
    if (!activePnr || activePnr === "N/A") {
      setSeatAddResult({
        success: false,
        message: "PNR not found. Reload booking confirmation and try again.",
      });
      return;
    }
    if (!selectedSeatOption?.seatNumber) {
      setSeatAddResult({
        success: false,
        message: "Select a seat first.",
      });
      return;
    }

    setSeatAddLoading(true);
    setSeatAddResult(null);
    try {
      const response = await fetch("/api/travelport/seat-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          pnr: activePnr,
          segmentId: seatDialogSegmentIdx,
          passengerId: seatDialogPassengerIdx,
          seatAssignment: selectedSeatOption.seatNumber,
          seatNumber: selectedSeatOption.seatNumber,
          offerListIdentifier: toText(selectedSeatOption?.offerListIdentifier),
          offerIdentifier: toText(selectedSeatOption?.offerIdentifier),
          productIdentifier: toText(selectedSeatOption?.productIdentifier),
          travelerIdentifier: toText(selectedSeatOption?.travelerIdentifier),
          segmentRef: toText(selectedSeatOption?.segmentRef),
          travelerTypeCode:
            travelerSelectionRows?.[seatDialogPassengerIdx]?.travelerTypeCode ||
            normalizePaxTypeCode(passengersWithDbFallback?.[seatDialogPassengerIdx]?.PaxType),
          travelerNumber:
            travelerSelectionRows?.[seatDialogPassengerIdx]?.travelerNumber || 1,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message ||
          payload?.details ||
          `Seat add failed (${response.status})`
        );
      }
      const success = payload?.success !== false;
      setSeatAddResult({
        success,
        message:
          toText(payload?.message) ||
          (success
            ? `Seat ${selectedSeatOption?.seatNumber} added successfully.`
            : "Seat add request was not successful."),
      });
      if (success) {
        setPnrRefreshTick((prev) => prev + 1);
        setSeatDialogSelections([]);
      }
    } catch (error) {
      setSeatAddResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to add seat right now.",
      });
    } finally {
      setSeatAddLoading(false);
    }
  };

  const handleShopAncillaries = async () => {
    const shopPnr =
      toText(pnrFromQuery) ||
      toText(locator) ||
      toText(finalCommitResponse?.locator) ||
      toText(finalCommitResponse?.reservationId);

    if (!shopPnr) {
      setAncillaryShopError("PNR/Locator not found for ancillary shopping.");
      setAncillaryShopOpen(true);
      return;
    }

    try {
      setAncillaryShopLoading(true);
      setAncillaryShopError("");
      setAncillaryShopData(null);
      setAncillaryAddResult(null);
      setAncillaryAddLoadingKey("");

      const response = await fetch(
        `/api/travelport/ancillary-shop-by-pnr?pnr=${encodeURIComponent(shopPnr)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.details || payload?.message || "Ancillary shop failed.");
      }

      setAncillaryShopData(payload);
      setAncillaryPassengerSelectionMap({});
      setAncillaryShopOpen(true);
    } catch (error) {
      setAncillaryShopError(
        error instanceof Error ? error.message : "Unable to load ancillary offerings."
      );
      setAncillaryShopOpen(true);
    } finally {
      setAncillaryShopLoading(false);
    }
  };

  const handleAncillaryPassengerSelectionChange = (rowKey, passengerIndex) => {
    setAncillaryPassengerSelectionMap((previous) => ({
      ...previous,
      [rowKey]: Number.isFinite(Number(passengerIndex))
        ? Number(passengerIndex)
        : 0,
    }));
  };

  const handleAddAncillary = async (row, passengerIndex) => {
    const activePnr = toText(locator) || toText(pnrFromQuery);
    if (!activePnr || activePnr === "N/A") {
      setAncillaryAddResult({
        success: false,
        message: "PNR not found. Reload booking confirmation and try again.",
      });
      return;
    }

    const rowKey = buildAncillaryRowKey(row);
    const travelerRow =
      travelerSelectionRows?.[Number(passengerIndex)] || travelerSelectionRows?.[0] || null;
    if (
      !toText(row?.offerListIdentifier) ||
      !toText(row?.offerId) ||
      !toText(row?.productIdentifier)
    ) {
      setAncillaryAddResult({
        success: false,
        message: "This ancillary row is missing catalog references.",
      });
      return;
    }

    try {
      setAncillaryAddLoadingKey(rowKey);
      setAncillaryAddResult(null);

      const response = await fetch("/api/travelport/ancillary-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          pnr: activePnr,
          offerListIdentifier: toText(row?.offerListIdentifier),
          offerIdentifier: toText(row?.offerId),
          productIdentifier: toText(row?.productIdentifier),
          travelerIdentifier: toText(row?.travelerId),
          passengerId: Number(passengerIndex),
          travelerTypeCode: travelerRow?.travelerTypeCode || "ADT",
          travelerNumber: travelerRow?.travelerNumber || 1,
          quantity: Math.max(1, toNumberValue(row?.quantity) || 1),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message ||
          payload?.details ||
          `Ancillary add failed (${response.status})`
        );
      }

      setAncillaryAddResult({
        success: payload?.success !== false,
        message:
          toText(payload?.message) ||
          "Ancillary was added successfully.",
      });
      setPnrRefreshTick((prev) => prev + 1);
    } catch (error) {
      setAncillaryAddResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to add ancillary right now.",
      });
    } finally {
      setAncillaryAddLoadingKey("");
    }
  };

  const handleGoToPreviewBooking = () => {
    let previewPayload =
      bookingPayload && bookingPayload?.bookingBody ? bookingPayload : null;

    if (!previewPayload && typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem("flyjatt:preview_booking");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.bookingBody) {
            previewPayload = parsed;
          }
        }
      } catch (error) {
        console.warn("Unable to restore preview booking payload", error);
      }
    }

    if (typeof window !== "undefined" && previewPayload?.bookingBody) {
      try {
        window.sessionStorage.setItem(
          "flyjatt:preview_booking",
          JSON.stringify(previewPayload)
        );
      } catch (error) {
        console.warn("Unable to persist preview booking payload", error);
      }

      navigate("/previewbooking", { state: previewPayload });
      return;
    }

    navigate("/previewbooking");
  };

  return (
    <Box sx={{ fontFamily: FONT, backgroundColor: "#EBF0F4", minHeight: "100vh" }}>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 3 }}>

        {/* ── Confirmed banner ── */}
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: "16px",
            background: "linear-gradient(120deg, rgba(6,32,58,0.97), rgba(2,105,148,0.92))",
            color: "#fff",
            mb: 2.5,
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flex: 1, minWidth: 260 }}>
            <CheckCircleOutlineRoundedIcon sx={{ color: "#84F3C3", fontSize: 36, flexShrink: 0, mt: 0.2 }} />
            <Box>
              <Typography sx={{ fontSize: { xs: 20, md: 28 }, fontWeight: 800, fontFamily: FONT, lineHeight: 1.2 }}>
                {confirmationTitle}
              </Typography>
              <Typography sx={{ mt: 0.6, fontSize: 13.5, color: "#C9E6FF", fontFamily: FONT }}>
                {confirmationSubtitle}
              </Typography>
            </Box>
          </Box>

        </Box>

        {/* ── Booking Reference ── */}
        <Box
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "16px",
            background: "#FFFFFF",
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
              mb: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Booking Reference
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.7, alignItems: { xs: "flex-start", md: "flex-end" }, textAlign: { xs: "left", md: "right" } }}>
              <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" }, alignItems: "center" }}>
                {canDownloadBookingCopy ? (
                  <PDFDownloadLink
                    document={<PdfPageDesign SingleBooking={bookingCopyPdfData} />}
                    fileName={`${locator || reservationId || "booking"}_booking_copy.pdf`}
                    style={{
                      textDecoration: "none",
                      background: "#0A527A",
                      color: "#fff",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontFamily: FONT,
                      fontSize: 13,
                    }}
                  >
                    {({ loading }) => (loading ? "Preparing Booking..." : "Booking Copy")}
                  </PDFDownloadLink>
                ) : null}

                {canDownloadTicketCopy ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6, alignItems: { xs: "flex-start", md: "flex-end" } }}>
                    <PDFDownloadLink
                      document={<PdfPageDesign SingleBooking={bookingCopyPdfData} />}
                      fileName={`${locator || reservationId || "booking"}_ticket_copy.pdf`}
                      style={{
                        textDecoration: "none",
                        background: "#1A7A41",
                        color: "#fff",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontFamily: FONT,
                        fontSize: 13,
                      }}
                    >
                      {({ loading }) => (loading ? "Preparing Ticket..." : "Download Ticket Voucher")}
                    </PDFDownloadLink>

                    {passengerTicketDownloadRows.length ? (
                      <Button
                        variant="text"
                        onClick={() => setShowPassengerTicketDownloads((prev) => !prev)}
                        sx={{
                          textTransform: "none",
                          p: 0,
                          minWidth: 0,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#10355b",
                          fontFamily: FONT,
                          border: "1px solid #D7E3F1",
                          borderRadius: "10px",
                          px: 1,
                          py: 0.5,
                          lineHeight: 1.2,
                        }}
                      >
                        {`Per Passenger ${showPassengerTicketDownloads ? "▲" : "▼"}`}
                      </Button>
                    ) : null}
                  </Box>
                ) : null}
              </Box>

              {canDownloadTicketCopy && passengerTicketDownloadRows.length && showPassengerTicketDownloads ? (
                <Box
                  sx={{
                    mt: 0.2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.45,
                    alignItems: { xs: "flex-start", md: "flex-end" },
                  }}
                >
                  {passengerTicketDownloadRows.map((row) => (
                    <PDFDownloadLink
                      key={`pax-ticket-${row.index}`}
                      document={<PdfPageDesign SingleBooking={row.data} />}
                      fileName={`${locator || reservationId || "booking"}_${row.ticketNumber}_ticket_copy.pdf`}
                      style={{
                        textDecoration: "none",
                        color: "#0A527A",
                        fontWeight: 600,
                        fontFamily: FONT,
                        fontSize: 12,
                      }}
                    >
                      {({ loading }) =>
                        loading
                          ? `${row.passengerName} (${row.ticketNumber})…`
                          : `${row.passengerName} (${row.ticketNumber})`
                      }
                    </PDFDownloadLink>
                  ))}
                </Box>
              ) : null}

              {!canDownloadBookingCopy && !canDownloadTicketCopy ? (
                <Typography sx={{ fontSize: 11, color: "#8A97A6", fontFamily: FONT }}>
                  Not available yet
                </Typography>
              ) : null}
            </Box>
          </Box>

          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={6} md={4}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>PNR / Locator</Typography>
              <Typography sx={{ fontSize: 32, fontWeight: 900, color: "#0A527A", fontFamily: FONT, lineHeight: 1, letterSpacing: 2 }}>
                {locator}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>Airlines PNR</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1F344A", fontFamily: FONT, wordBreak: "break-all" }}>
                {airlinesPnr || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>Ticket Status</Typography>
              <Chip
                size="small"
                label={ticketStatusLabel}
                sx={{
                  background:
                    ticketStatusLabel === "Cancelled"
                      ? "#FDECEA"
                      : hasTicket
                        ? "#E7F7EE"
                        : "#FFF7E8",
                  color:
                    ticketStatusLabel === "Cancelled"
                      ? "#B71C1C"
                      : hasTicket
                        ? "#12753C"
                        : "#A26200",
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: FONT,
                }}
              />
            </Grid>
          </Grid>

          {reservationByPnrError ? (
            <Alert severity="warning" sx={{ mt: 1.5, fontFamily: FONT }}>
              {reservationByPnrError}
            </Alert>
          ) : null}
        </Box>

        {/* ── Flight Details ── */}
        <Box
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "16px",
            background: "#FFFFFF",
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Flight Details
          </Typography>
          <FlightDetailsContent data={flightInfoSource} />
        </Box>

        {/* ── Policies & Amenities ── */}
        <Box
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "16px",
            background: "#FFFFFF",
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Cancellation, Change Policy & Amenities (API)
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.5 }}>
                Brand Name
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#5A6B7D", fontFamily: FONT }}>
                {finalBrandName || "N/A"}
                {finalBrandCode ? ` (${finalBrandCode})` : ""}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.5 }}>
                Fare Basis Code
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#5A6B7D", fontFamily: FONT }}>
                {finalFareBasisCode || "N/A"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.5 }}>
                Cabin Class
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#5A6B7D", fontFamily: FONT }}>
                {finalCabinClass || "N/A"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                Change Policy
              </Typography>
              {finalChangePolicies.length ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {finalChangePolicies.map((policy, idx) => (
                    <Typography key={`change-policy-${idx}`} sx={{ fontSize: 12, color: "#5A6B7D", fontFamily: FONT }}>
                      • {policy}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "#8A97A6", fontFamily: FONT }}>N/A</Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                Cancellation Policy
              </Typography>
              {finalCancellationPolicies.length ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {finalCancellationPolicies.map((policy, idx) => (
                    <Typography key={`cancel-policy-${idx}`} sx={{ fontSize: 12, color: "#5A6B7D", fontFamily: FONT }}>
                      • {policy}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "#8A97A6", fontFamily: FONT }}>N/A</Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                Amenities
              </Typography>
              {finalAmenities.length ? (
                <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                  {finalAmenities.map((amenity) => (
                    <Chip key={`confirm-amenity-${amenity}`} size="small" label={amenity} />
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "#8A97A6", fontFamily: FONT }}>N/A</Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                Baggage (API)
              </Typography>
              {baggageFromApi.length ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {baggageFromApi.map((baggage, idx) => (
                    <Typography key={`confirm-baggage-${idx}`} sx={{ fontSize: 12, color: "#5A6B7D", fontFamily: FONT }}>
                      • {baggage}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "#8A97A6", fontFamily: FONT }}>N/A</Typography>
              )}
            </Grid>
          </Grid>
        </Box>

        {/* ── Passengers ── */}
        <Box
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "16px",
            background: "#FFFFFF",
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Passengers
          </Typography>
          <Grid container spacing={1.5}>
            {passengersWithDbFallback.map((passenger, index) => (
              <Grid item xs={12} sm={6} md={4} key={`confirm-pax-${index}`}>
                <Box
                  sx={{
                    border: "1px solid #DFE7EF",
                    borderRadius: "12px",
                    background: "linear-gradient(180deg, rgba(22,85,147,0.04) 0%, #FFFFFF 100%)",
                    p: 1.8,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.8 }}>
                    <Chip
                      size="small"
                      label={paxLabel(passenger?.PaxType)}
                      sx={{ background: "#EEF4FB", color: "#13406B", fontSize: 10, fontWeight: 700, fontFamily: FONT, height: 20 }}
                    />
                    {passenger?.Gender ? (
                      <Chip
                        size="small"
                        label={passenger.Gender}
                        sx={{ background: "#F4F7FB", color: "#4B5A69", fontSize: 10, fontWeight: 600, fontFamily: FONT, height: 20 }}
                      />
                    ) : null}
                  </Box>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: "#1F344A", fontFamily: FONT, lineHeight: 1.2 }}>
                    {[passenger?.Title, passenger?.FirstName, passenger?.LastName].filter(Boolean).join(" ")}
                  </Typography>
                  <Box sx={{ mt: 0.8, display: "flex", flexDirection: "column", gap: 0.3 }}>
                    {passenger?.DateOfBirth ? (
                      <Typography sx={{ fontSize: 11.5, color: "#5A6B7D", fontFamily: FONT, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CalendarTodayRoundedIcon sx={{ fontSize: 12 }} />
                        {moment(passenger.DateOfBirth).format("DD MMM YYYY")}
                      </Typography>
                    ) : null}
                    {passenger?.PassportNumber ? (
                      <Typography sx={{ fontSize: 11.5, color: "#5A6B7D", fontFamily: FONT }}>
                        Passport: <strong>{passenger.PassportNumber}</strong>
                      </Typography>
                    ) : null}
                    {(passenger?.PassportNationality || passenger?.Nationality) ? (
                      <Typography sx={{ fontSize: 11.5, color: "#5A6B7D", fontFamily: FONT }}>
                        Nationality: <strong>{passenger?.PassportNationality || passenger?.Nationality}</strong>
                      </Typography>
                    ) : null}
                    <Typography sx={{ fontSize: 11.5, color: "#5A6B7D", fontFamily: FONT }}>
                      Ticket Number: <strong>{passengerTicketNumbers[index] || "N/A"}</strong>
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ── Fare Summary ── */}
        <Box
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "16px",
            background: "#FFFFFF",
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Fare Summary
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "2fr 0.6fr 1fr 1fr 1fr" },
              gap: 1,
              pb: 0.8,
              borderBottom: "2px solid #EBF0F4",
              mb: 0.5,
            }}
          >
            {["Passenger", "Qty", "Base Fare", "Taxes", "Total"].map((h) => (
              <Typography key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#78909C", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {h}
              </Typography>
            ))}
          </Box>
          {priceRows.map((row, idx) => (
            <Box
              key={`confirm-fare-${idx}`}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", md: "2fr 0.6fr 1fr 1fr 1fr" },
                gap: 1,
                py: 0.9,
                borderBottom: "1px dashed #EBF0F4",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1F344A", fontFamily: FONT }}>
                {paxLabel(row?.PaxType || row?.paxType)}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#4B5A69", fontFamily: FONT }}>
                {toNumberValue(row?.PaxCount ?? row?.paxCount) || 1}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#4B5A69", fontFamily: FONT }}>
                {formatMoney(row?.BaseFare ?? row?.baseFare)}{" "}
                <span style={{ fontSize: 10, color: "#78909C" }}>{currency}</span>
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#4B5A69", fontFamily: FONT }}>
                {formatMoney(row?.Taxes ?? row?.taxes)}{" "}
                <span style={{ fontSize: 10, color: "#78909C" }}>{currency}</span>
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#0A527A", fontFamily: FONT }}>
                {formatMoney(row?.TotalFare ?? row?.totalFare)}{" "}
                <span style={{ fontSize: 10, color: "#78909C" }}>{currency}</span>
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              mt: 1.5,
              p: { xs: 1.5, md: 2 },
              borderRadius: "12px",
              background: "linear-gradient(100deg, rgba(6,32,58,0.96), rgba(2,105,148,0.9))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 12, color: "#C9E6FF", fontFamily: FONT }}>
                Base:{" "}
                <strong style={{ color: "#fff" }}>
                  {formatMoney(totals.base)} {currency}
                </strong>
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#C9E6FF", fontFamily: FONT }}>
                Tax:{" "}
                <strong style={{ color: "#fff" }}>
                  {formatMoney(totals.taxes)} {currency}
                </strong>
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF", fontFamily: FONT }}>
              {formatMoney(totals.total)} {currency}
            </Typography>
          </Box>
        </Box>

        {/* ── Actions ── */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mb: 4, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={handleShopAncillaries}
            disabled={ancillaryShopLoading || isAlreadyCancelled}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontFamily: FONT,
              borderColor: "#0A527A",
              color: "#0A527A",
            }}
          >
            {ancillaryShopLoading ? "Loading Ancillaries..." : "Shop Ancillaries"}
          </Button>

          {/* ── Select Seats Button ── */}
          <Button
            variant="contained"
            color="secondary"
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontFamily: FONT,
              bgcolor: "#1976d2",
              ":hover": { bgcolor: "#115293" },
            }}
            onClick={handleOpenSeatDialog}
            disabled={!allLegs.length || !passengersWithDbFallback.length || isAlreadyCancelled}
          >
            Select Seats
          </Button>

          {canCancelBooking ? (
            <Button
              variant="outlined"
              onClick={() => setCancelDialogOpen(true)}
              disabled={cancelBookingSubmitting}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                fontWeight: 700,
                fontFamily: FONT,
                borderColor: "#C62828",
                color: "#C62828",
                ":hover": { borderColor: "#C62828", backgroundColor: "#FFF4F4" },
              }}
            >
              {cancelBookingSubmitting ? "Cancelling..." : "Cancel Booking"}
            </Button>
          ) : null}

          {!isAlreadyTicketed && !isAlreadyCancelled ? (
            <Button
              variant="contained"
              onClick={handleIssueTicket}
              disabled={issueTicketSubmitting}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                fontWeight: 700,
                fontFamily: FONT,
                bgcolor: "#0A527A",
                ":hover": { bgcolor: "#0A527A" },
              }}
            >
              {issueTicketSubmitting ? "Issuing Ticket..." : "Issue Ticket"}
            </Button>
          ) : null}
          <Button
            onClick={() => navigate("/")}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontFamily: FONT,
              borderColor: "var(--primary-button)",
              color: "var(--primary-button)",
            }}
          >
            Go To Home
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate("/offers")}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontFamily: FONT,
              bgcolor: "var(--primary-button)",
              ":hover": { bgcolor: "var(--primary-button)" },
            }}
          >
            Search More Flights
          </Button>
        </Box>

        {
          issueTicketFeedback?.message ? (
            <Alert
              severity={
                issueTicketFeedback.severity === "success"
                  ? "success"
                  : issueTicketFeedback.severity === "error"
                    ? "error"
                    : "warning"
              }
              sx={{ mb: 3, fontFamily: FONT }}
            >
              {issueTicketFeedback.message}
            </Alert>
          ) : null
        }

        {
          issueTicketFeedback?.needsPreviewRecovery ? (
            <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-start" }}>
              <Button
                variant="contained"
                onClick={handleGoToPreviewBooking}
                sx={{
                  textTransform: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontFamily: FONT,
                  bgcolor: "#0A527A",
                  ":hover": { bgcolor: "#0A527A" },
                }}
              >
                Re-Run Preview Flow
              </Button>
            </Box>
          ) : null
        }

        <Dialog
          open={cancelDialogOpen}
          onClose={() => {
            if (!cancelBookingSubmitting) setCancelDialogOpen(false);
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#982020", fontFamily: FONT }}>
            Cancel This Booking?
          </DialogTitle>
          <DialogContent dividers>
            <Typography sx={{ fontSize: 13, color: "#4A607A", fontFamily: FONT, mb: 1 }}>
              This will mark the booking as cancelled in your account.
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#8A5060", fontFamily: FONT }}>
              PNR: <strong>{locator || "N/A"}</strong>
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelBookingSubmitting}
            >
              Keep Booking
            </Button>
            <Button
              variant="contained"
              onClick={handleCancelBooking}
              disabled={cancelBookingSubmitting}
              sx={{
                bgcolor: "#C62828",
                ":hover": { bgcolor: "#B71C1C" },
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {cancelBookingSubmitting ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={seatDialogOpen}
          onClose={handleCloseSeatDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#0f4b7d", fontSize: 16 }}>
            Seat Selection - {locator || pnrFromQuery || "N/A"}
          </DialogTitle>
          <DialogContent dividers>
            <Box
              sx={{
                border: "1px solid #D7E5F4",
                borderRadius: "12px",
                p: "11px",
                background: "linear-gradient(165deg, #FBFDFF 0%, #F1F7FF 100%)",
                mb: "10px",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#1C3E60",
                      lineHeight: 1.2,
                    }}
                  >
                    Seat Map Overview
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#5E768E",
                      lineHeight: 1.2,
                    }}
                  >
                    {`Select seat for ${selectedSeatPassengerName}`}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  <FormControl size="small" sx={{ minWidth: 185 }}>
                    <InputLabel id="seat-segment-label">Segment</InputLabel>
                    <Select
                      labelId="seat-segment-label"
                      value={seatDialogSegmentIdx}
                      label="Segment"
                      onChange={(event) => setSeatDialogSegmentIdx(Number(event.target.value))}
                      sx={{ fontSize: 12, background: "#FFFFFF" }}
                    >
                      {allLegs.map((leg, index) => {
                        const dep = toText(leg?.DepFrom) || "N/A";
                        const arr = toText(leg?.ArrTo) || "N/A";
                        return (
                          <MenuItem key={`seat-segment-${index}`} value={index}>
                            {`Leg ${index + 1}: ${dep} -> ${arr}`}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 230 }}>
                    <InputLabel id="seat-passenger-label">Passenger</InputLabel>
                    <Select
                      labelId="seat-passenger-label"
                      value={seatDialogPassengerIdx}
                      label="Passenger"
                      onChange={(event) => setSeatDialogPassengerIdx(Number(event.target.value))}
                      sx={{ fontSize: 12, background: "#FFFFFF" }}
                    >
                      {passengersWithDbFallback.map((passenger, index) => {
                        const name = [passenger?.Title, passenger?.FirstName, passenger?.LastName]
                          .map((value) => toText(value))
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <MenuItem key={`seat-passenger-${index}`} value={index}>
                            {name || `Passenger ${index + 1}`}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleCheckSeatEligibility}
                    disabled={seatEligibilityLoading}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: "#0A527A",
                      ":hover": { bgcolor: "#0A527A" },
                    }}
                  >
                    {seatEligibilityLoading ? "Loading..." : "Refresh Seat Map"}
                  </Button>
                </Box>
              </Box>
            </Box>

            {seatEligibilityError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {seatEligibilityError}
              </Alert>
            ) : null}

            {seatEligibilityResult?.eligible === false ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {toText(seatEligibilityResult?.reason) || "Seat selection is not allowed."}
              </Alert>
            ) : null}

            {seatEligibilityResult?.seatAvailabilityResponse ? (
              <RightSidebarInfo
                data={seatDialogTravelerData}
                seatAvailabilityData={seatEligibilityResult?.seatAvailabilityResponse || null}
                seatAvailabilityLoading={seatEligibilityLoading}
                seatAvailabilityError=""
                seatAvailabilityRequest={{
                  offerListIdentifier: toText(
                    seatDialogSeatAvailabilityRequest?.offerListIdentifier
                  ),
                  offerIdentifier: toText(
                    seatDialogSeatAvailabilityRequest?.offerIdentifier
                  ),
                  productIdentifiers: Array.isArray(
                    seatDialogSeatAvailabilityRequest?.productIdentifiers
                  )
                    ? seatDialogSeatAvailabilityRequest.productIdentifiers
                    : [],
                }}
                enablePostBuildFetch={false}
                autoOpenSeatMap={seatDialogOpen}
                autoOpenSeatMapKey={seatDialogAutoOpenKey}
                seatMapOnly
                seatSelections={seatDialogSelections}
                onSeatSelectionsChange={(rows) => {
                  setSeatDialogSelections(Array.isArray(rows) ? rows.slice(-1) : []);
                  setSeatAddResult(null);
                }}
              />
            ) : null}

            {selectedSeatOption?.seatNumber ? (
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <Alert severity="info">
                  Selected Seat: <strong>{selectedSeatOption.seatNumber}</strong> | Passenger:{" "}
                  <strong>{selectedSeatPassengerName}</strong>
                </Alert>
                <Box>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleAddSeat}
                    disabled={seatAddLoading}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    {seatAddLoading ? "Adding Seat..." : "Confirm Seat Selection"}
                  </Button>
                </Box>
              </Box>
            ) : null}

            {seatAddResult?.message ? (
              <Alert
                severity={seatAddResult?.success ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {seatAddResult.message}
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSeatDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={ancillaryShopOpen} onClose={() => setAncillaryShopOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: "#0f4b7d", fontSize: 16 }}>
            Ancillary Offerings - {locator || pnrFromQuery || "N/A"}
          </DialogTitle>
          <DialogContent dividers>
            {ancillaryAddResult?.message ? (
              <Alert
                severity={ancillaryAddResult?.success ? "success" : "error"}
                sx={{ mb: 1.2 }}
              >
                {ancillaryAddResult.message}
              </Alert>
            ) : null}
            {ancillaryShopError ? (
              <Alert severity="error">{ancillaryShopError}</Alert>
            ) : ancillaryShopData ? (
              <AncillaryOfferingsDialogContent
                data={ancillaryShopData}
                passengers={passengersWithDbFallback}
                passengerSelectionMap={ancillaryPassengerSelectionMap}
                onPassengerSelectionChange={handleAncillaryPassengerSelectionChange}
                onAddAncillary={handleAddAncillary}
                loadingRowKey={ancillaryAddLoadingKey}
              />
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAncillaryShopOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

      </Container >
    </Box >
  );
};

export default BookingConfirmation;
