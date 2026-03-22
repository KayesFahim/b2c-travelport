import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import commaNumber from "comma-number";
import NavBar from "../../Shared/NavBar/NavBar";

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
  }, [pnrFromQuery]);

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

  return (
    <Box>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            border: "1px solid #D8E4F5",
            borderRadius: "14px",
            background:
              "linear-gradient(120deg, rgba(6,32,58,0.97), rgba(2,105,148,0.92))",
            color: "#fff",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.1, mb: 0.6 }}>
            <CheckCircleOutlineRoundedIcon sx={{ color: "#84F3C3", fontSize: 30 }} />
            <Typography sx={{ fontSize: { xs: 21, md: 27 }, fontWeight: 800 }}>
              Congratulations, Booking Confirmed
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13.5, color: "#C9E6FF" }}>
            Your booking has been committed successfully. Keep your locator for check-in and support.
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.1 }}>
            Booking Reference
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 12, color: "#63748E" }}>PNR / Locator</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#0A527A" }}>
                {locator}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 12, color: "#63748E" }}>Reservation ID</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#253E58", wordBreak: "break-all" }}>
                {reservationId}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 12, color: "#63748E" }}>Offer ID</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#253E58", wordBreak: "break-all" }}>
                {offerId}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {pnrFromQuery ? (
          <Paper
            elevation={0}
            sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.1 }}>
              Post-Commit Offers & Services
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>Offers</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#16395C" }}>
                  {reservationSummary.offerCount}
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>Products</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#16395C" }}>
                  {reservationSummary.productCount}
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>Segments</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#16395C" }}>
                  {reservationSummary.flightSegmentCount}
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                  Passenger Flights
                </Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#16395C" }}>
                  {reservationSummary.passengerFlightCount}
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                  Services/Ancillaries
                </Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#16395C" }}>
                  {reservationSummary.serviceCount}
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>Tickets</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#16395C" }}>
                  {reservationSummary.ticketCount}
                </Typography>
              </Grid>
            </Grid>
            {reservationByPnrError ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {reservationByPnrError}
              </Alert>
            ) : null}
          </Paper>
        ) : null}

        {pnrFromQuery ? (
          <Paper
            elevation={0}
            sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.1 }}>
              Ancillary & Service Details
            </Typography>
            {ancillaryServiceRows.length ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
                {ancillaryServiceRows.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      border: "1px solid #E8EEF7",
                      borderRadius: "10px",
                      p: 1.15,
                      bgcolor: "#FCFEFF",
                    }}
                  >
                    <Grid container spacing={0.8}>
                      <Grid item xs={12} md={4}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Service</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#16395C" }}>
                          {row.serviceName}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#50657E", mt: 0.2 }}>
                          {row.serviceType}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={1.5}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Status</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#16395C" }}>
                          {row.status}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={1.5}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Amount</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#16395C" }}>
                          {row.amountValue > 0
                            ? `${formatMoney(row.amountValue)} ${row.currencyCode || currency}`
                            : "Included / N/A"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Offer</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#16395C", wordBreak: "break-all" }}>
                          {row.offerIdentifier}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={1.5}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Product</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#16395C", wordBreak: "break-all" }}>
                          {row.productIdentifier}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={1.5}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Traveler</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#16395C", wordBreak: "break-all" }}>
                          {row.travelerRef}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={1.5}>
                        <Typography sx={{ fontSize: 11, color: "#63748E" }}>Segment</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#16395C", wordBreak: "break-all" }}>
                          {row.segmentRef}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12, color: "#607489", fontWeight: 600 }}>
                No ancillary/service rows returned for this post-commit reservation.
              </Typography>
            )}
          </Paper>
        ) : null}

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.5 }}>
            Flight Details
          </Typography>
          {allLegs.map((leg, legIndex) => {
            const segments = getArrayByKeys(leg, ["Segments", "segments"]);
            const legFrom = leg?.DepFrom || leg?.depFrom || segments?.[0]?.DepFrom || segments?.[0]?.depFrom || "";
            const legTo =
              leg?.ArrTo ||
              leg?.arrTo ||
              segments?.[segments.length - 1]?.ArrTo ||
              segments?.[segments.length - 1]?.arrTo ||
              "";

            return (
              <Box key={`booking-leg-${legIndex}`} sx={{ mb: 1.6 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#1F3E62", mb: 0.8 }}>
                  Leg {legIndex + 1}: {legFrom} - {legTo}
                </Typography>
                {segments.map((segment, segmentIndex) => {
                  const depTime = segment?.DepTime || segment?.depTime;
                  const arrTime = segment?.ArrTime || segment?.arrTime;
                  const carrierName =
                    segment?.MarketingCarrierName ||
                    segment?.marketingCarrierName ||
                    segment?.OperatingCarrierName ||
                    segment?.operatingCarrierName ||
                    segment?.MarketingCarrier ||
                    segment?.marketingCarrier ||
                    "";
                  const flightNo =
                    segment?.MarketingFlightNumber || segment?.marketingFlightNumber || "";

                  return (
                    <Box
                      key={`booking-segment-${legIndex}-${segmentIndex}`}
                      sx={{
                        border: "1px solid #E8EEF7",
                        borderRadius: "10px",
                        p: 1.25,
                        bgcolor: "#FCFEFF",
                        mb: 1,
                      }}
                    >
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <Typography sx={{ fontSize: 12, color: "#63748E" }}>Flight</Typography>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#173A5C" }}>
                            {carrierName} {flightNo}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography sx={{ fontSize: 12, color: "#63748E" }}>Departure</Typography>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#173A5C" }}>
                            {(segment?.DepFrom || segment?.depFrom || "").toUpperCase()} {depTime ? moment(depTime).format("DD MMM YYYY, HH:mm") : ""}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography sx={{ fontSize: 12, color: "#63748E" }}>Arrival</Typography>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#173A5C" }}>
                            {(segment?.ArrTo || segment?.arrTo || "").toUpperCase()} {arrTime ? moment(arrTime).format("DD MMM YYYY, HH:mm") : ""}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <Typography sx={{ fontSize: 12, color: "#63748E" }}>Cabin</Typography>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#173A5C" }}>
                            {segment?.SegmentCode?.cabinCode ||
                              segment?.segmentCode?.cabinCode ||
                              "N/A"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.2 }}>
            Passenger Details
          </Typography>
          <Grid container spacing={1.2}>
            {passengers.map((passenger, index) => (
              <Grid item xs={12} md={6} key={`confirm-pax-${index}`}>
                <Box
                  sx={{
                    border: "1px solid #E8EEF7",
                    borderRadius: "10px",
                    p: 1.2,
                    bgcolor: "#FCFEFF",
                  }}
                >
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#16395C" }}>
                    {passenger?.Title ? `${passenger.Title} ` : ""}
                    {passenger?.FirstName || ""} {passenger?.LastName || ""}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    {paxLabel(passenger?.PaxType)} | {passenger?.Gender || "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    DOB: {passenger?.DateOfBirth ? moment(passenger.DateOfBirth).format("DD MMM YYYY") : "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    Passport: {passenger?.PassportNumber || "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    Nationality: {passenger?.PassportNationality || passenger?.Nationality || "N/A"}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.2 }}>
            Fare & Baggage
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 0.7fr 1fr 1fr 1fr 1.2fr" },
              gap: 1,
              pb: 1,
              borderBottom: "1px solid #E3E8EF",
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Pax Type</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: { md: "right" } }}>
              Count
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: { md: "right" } }}>
              Base
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: { md: "right" } }}>
              Tax
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: { md: "right" } }}>
              Total
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Baggage</Typography>
          </Box>

          {priceRows.map((row, idx) => {
            const bags = Array.isArray(row?.Bag || row?.bag) ? row?.Bag || row?.bag : [];
            const baggageText = bags.length
              ? Array.from(
                  new Set(
                    bags.map(
                      (bag) =>
                        bag?.Allowance || bag?.allowance || bag?.Baggage || bag?.baggage || "N/A"
                    )
                  )
                ).join(" | ")
              : "N/A";

            return (
              <Box
                key={`confirm-fare-${idx}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 0.7fr 1fr 1fr 1fr 1.2fr" },
                  gap: 1,
                  py: 1,
                  borderBottom: "1px dashed #EBEEF3",
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                  {paxLabel(row?.PaxType || row?.paxType)}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: { md: "right" } }}>
                  {toNumberValue(row?.PaxCount ?? row?.paxCount) || 1}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: { md: "right" } }}>
                  {formatMoney(row?.BaseFare ?? row?.baseFare)} {currency}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: { md: "right" } }}>
                  {formatMoney(row?.Taxes ?? row?.taxes)} {currency}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: { md: "right" } }}>
                  {formatMoney(row?.TotalFare ?? row?.totalFare)} {currency}
                </Typography>
                <Box>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>{baggageText}</Typography>
                  {row?.CurrencySource ||
                  row?.currencySource ||
                  row?.ApproximateInd !== undefined ||
                  row?.approximateInd !== undefined ? (
                    <Typography sx={{ fontSize: 11, color: "#4F6781", mt: 0.2 }}>
                      Source: {row?.CurrencySource || row?.currencySource || "N/A"}
                      {row?.ApproximateInd !== undefined ||
                      row?.approximateInd !== undefined
                        ? ` • Approximate: ${
                            row?.ApproximateInd ?? row?.approximateInd
                              ? "Yes"
                              : "No"
                          }`
                        : ""}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            );
          })}

          <Divider sx={{ my: 1.2 }} />
          <Grid container spacing={1}>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 13, color: "#63748E" }}>
                Total Base: <strong>{formatMoney(totals.base)} {currency}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 13, color: "#63748E" }}>
                Total Tax: <strong>{formatMoney(totals.taxes)} {currency}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 13, color: "#123d66" }}>
                Grand Total: <strong>{formatMoney(totals.total)} {currency}</strong>
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2, borderRadius: "12px" }}>
          <Typography sx={{ fontSize: 14, color: "#445B74" }}>
            For any assistance visit <strong>support center</strong> or write to us at <strong>support</strong>.
          </Typography>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate("/offers")}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 700,
              bgcolor: "var(--primary-button)",
              ":hover": { bgcolor: "var(--primary-button)" },
            }}
          >
            Search More Flights
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default BookingConfirmation;
