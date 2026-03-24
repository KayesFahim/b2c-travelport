import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
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

const isTicketedStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  return status === "ticketed" || status === "issued" || status === "ticket issue done";
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
  allLegsInfo,
  passengerList,
  priceBreakDown,
  grossFare,
  netFare,
  bookingDate,
}) => {
  return [
    {
      BookingId: bookingId || "N/A",
      BookingStatus: bookingStatus || "Booked",
      BookingDate: bookingDate || new Date().toISOString(),
      TripType: (Array.isArray(allLegsInfo) && allLegsInfo.length > 1) ? "Return" : "OneWay",
      PNR: pnr || "N/A",
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

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(
    () => new URLSearchParams(location.search || ""),
    [location.search]
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
  const [pnrRefreshTick, setPnrRefreshTick] = useState(0);
  const [issueTicketSubmitting, setIssueTicketSubmitting] = useState(false);
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
    toText(bookingPayload?.BookingStatus || bookingPayload?.bookingStatus) ||
    toText(finalCommitResponse?.BookingStatus || finalCommitResponse?.bookingStatus);
  const hasTicket = ticketNumbers.length > 0;
  const isAlreadyTicketed = hasTicket || isTicketedStatus(bookingStatusText);
  const ticketStatusLabel = isAlreadyTicketed ? "Ticketed" : "Pending";
  const ticketNumberText = hasTicket ? ticketNumbers.join(", ") : "N/A";
  const passengerTicketNumbers = useMemo(
    () => extractPassengerTicketNumbers(resolvedCommittedReservation, passengers.length),
    [resolvedCommittedReservation, passengers.length]
  );
  const bookingStatusForPdf = normalizeStatusForPdf(bookingStatusText, hasTicket);
  const canDownloadBookingCopy = ["booked", "hold"].includes(
    String(bookingStatusForPdf || "").trim().toLowerCase()
  );
  const canDownloadTicketCopy = isAlreadyTicketed;
  const bookingCopyPdfData = useMemo(
    () =>
      buildPdfPayload({
        bookingId: reservationId,
        bookingStatus: bookingStatusForPdf,
        pnr: locator,
        allLegsInfo: allLegs,
        passengerList: passengers,
        priceBreakDown: priceRows,
        grossFare: totals.total,
        netFare: totals.total,
        bookingDate: finalCommitResponse?.createdAt || new Date().toISOString(),
      }),
    [reservationId, bookingStatusForPdf, locator, allLegs, passengers, priceRows, totals.total, finalCommitResponse?.createdAt]
  );
  const passengerTicketDownloadRows = useMemo(() => {
    return passengers
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
        });

        return {
          index,
          ticketNumber,
          passengerName: passengerName || `Passenger ${index + 1}`,
          data: singlePassengerPdfData,
        };
      })
      .filter(Boolean);
  }, [passengers, passengerTicketNumbers, reservationId, locator, allLegs, priceRows, totals.total, finalCommitResponse?.createdAt]);

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

  const locator = finalCommitResponse?.locator || pnrFromQuery || "N/A";
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
            alignItems: "flex-start",
            gap: 1.5,
          }}
        >
          <CheckCircleOutlineRoundedIcon sx={{ color: "#84F3C3", fontSize: 36, flexShrink: 0, mt: 0.2 }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 20, md: 28 }, fontWeight: 800, fontFamily: FONT, lineHeight: 1.2 }}>
              Booking Confirmed!
            </Typography>
            <Typography sx={{ mt: 0.6, fontSize: 13.5, color: "#C9E6FF", fontFamily: FONT }}>
              Your booking has been committed successfully. Save your PNR for check-in and support.
            </Typography>
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
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Booking Reference
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>PNR / Locator</Typography>
              <Typography sx={{ fontSize: 32, fontWeight: 900, color: "#0A527A", fontFamily: FONT, lineHeight: 1, letterSpacing: 2 }}>
                {locator}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>Reservation ID</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1F344A", fontFamily: FONT, wordBreak: "break-all" }}>
                {reservationId}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>Offer ID</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1F344A", fontFamily: FONT, wordBreak: "break-all" }}>
                {offerId}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>Ticket Status</Typography>
              <Chip
                size="small"
                label={ticketStatusLabel}
                sx={{
                  background: hasTicket ? "#E7F7EE" : "#FFF7E8",
                  color: hasTicket ? "#12753C" : "#A26200",
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: FONT,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11, color: "#78909C", fontFamily: FONT, fontWeight: 600, mb: 0.4 }}>Ticket Number</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1F344A", fontFamily: FONT, wordBreak: "break-all" }}>
                {ticketNumberText}
              </Typography>
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
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                Change Policy
              </Typography>
              {changePolicies.length ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {changePolicies.map((policy, idx) => (
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
              {cancellationPolicies.length ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {cancellationPolicies.map((policy, idx) => (
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
              {amenitiesFromApi.length ? (
                <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                  {amenitiesFromApi.map((amenity) => (
                    <Chip key={`confirm-amenity-${amenity}`} size="small" label={amenity} />
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
            {passengers.map((passenger, index) => (
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

        {/* ── PDF Downloads ── */}
        <Box
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "16px",
            background: "#FFFFFF",
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#54697E", fontFamily: FONT, mb: 1.2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Download Documents
          </Typography>

          <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", mb: passengerTicketDownloadRows.length ? 1.5 : 0 }}>
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
                {({ loading }) => (loading ? "Preparing Booking Copy..." : "Download Booking Copy")}
              </PDFDownloadLink>
            ) : null}

            {canDownloadTicketCopy ? (
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
                {({ loading }) => (loading ? "Preparing Ticket Copy..." : "Download Ticket Copy")}
              </PDFDownloadLink>
            ) : null}
          </Box>

          {canDownloadTicketCopy && passengerTicketDownloadRows.length ? (
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                Download Per Passenger Ticket Copy
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.7 }}>
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
                      fontSize: 13,
                    }}
                  >
                    {({ loading }) =>
                      loading
                        ? `Preparing ${row.passengerName} ticket...`
                        : `Download ${row.passengerName} Ticket (${row.ticketNumber})`
                    }
                  </PDFDownloadLink>
                ))}
              </Box>
            </Box>
          ) : null}

          {!canDownloadBookingCopy && !canDownloadTicketCopy ? (
            <Typography sx={{ fontSize: 12, color: "#8A97A6", fontFamily: FONT }}>
              Download links will appear when status is Booked/Hold (booking copy) or Ticketed (ticket copy).
            </Typography>
          ) : null}
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
          {!isAlreadyTicketed ? (
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
            onClick={handleGoToPreviewBooking}
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

        {issueTicketFeedback?.message ? (
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
        ) : null}

        {issueTicketFeedback?.needsPreviewRecovery ? (
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
        ) : null}

      </Container>
    </Box>
  );
};

export default BookingConfirmation;
