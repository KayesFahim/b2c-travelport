import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import commaNumber from "comma-number";
import Swal from "sweetalert2";
import NavBar from "../../Shared/NavBar/NavBar";
import {
  commitTravelportBookHold,
  prepareTravelportBookHold,
} from "../../utils/travelportBookHold";
import { addTravelportSpecialServices } from "../../utils/travelportSpecialServices";
import {
  fetchBookingAuthMe,
  loginBookingUser,
  registerBookingUser,
} from "../../utils/bookingAuth";
import FlightDetailsContent from "../ShowDetails/FlightDetailsContent";

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
  }
  return [];
};

const toNumberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => commaNumber(Math.round(toNumberValue(value) * 100) / 100);
const toSafeText = (value) => String(value ?? "").trim();
const normalizeIdentifier = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeIdentifier(item);
      if (normalized) return normalized;
    }
    return "";
  }
  if (typeof value === "object") {
    return (
      normalizeIdentifier(value.value) ||
      normalizeIdentifier(value.Value) ||
      normalizeIdentifier(value.id) ||
      normalizeIdentifier(value.ID) ||
      normalizeIdentifier(value.identifier) ||
      normalizeIdentifier(value.Identifier) ||
      ""
    );
  }
  return "";
};
const dedupeIdentifiers = (rows = []) =>
  Array.from(new Set(rows.map((item) => normalizeIdentifier(item)).filter(Boolean)));

const extractOfferIdentifiersFromAddOfferResponse = (addOfferResponse) => {
  if (!addOfferResponse || typeof addOfferResponse !== "object") return [];
  const offerListResponse =
    addOfferResponse?.OfferListResponse && typeof addOfferResponse.OfferListResponse === "object"
      ? addOfferResponse.OfferListResponse
      : addOfferResponse?.offerListResponse && typeof addOfferResponse.offerListResponse === "object"
      ? addOfferResponse.offerListResponse
      : addOfferResponse;
  const offerRows = getArrayByKeys(offerListResponse, ["OfferID", "offerID", "offerId"]);
  return dedupeIdentifiers(
    offerRows.map((row) =>
      row && typeof row === "object"
        ? row?.Identifier || row?.identifier || row?.id || row?.ID
        : row
    )
  );
};

const extractTravelerIdentifiersFromTravelerResponse = (travelerResponse) => {
  if (!travelerResponse || typeof travelerResponse !== "object") return [];
  const identifiers = [];

  const pushTravelerIdentifier = (traveler) => {
    if (!traveler || typeof traveler !== "object") return;
    const identifier = normalizeIdentifier(
      traveler?.Identifier || traveler?.identifier || traveler?.id || traveler?.ID
    );
    if (identifier) identifiers.push(identifier);
  };

  const travelerListResponse =
    travelerResponse?.TravelerListResponse &&
    typeof travelerResponse.TravelerListResponse === "object"
      ? travelerResponse.TravelerListResponse
      : travelerResponse?.travelerListResponse &&
          typeof travelerResponse.travelerListResponse === "object"
        ? travelerResponse.travelerListResponse
        : travelerResponse;

  const referenceLists = getArrayByKeys(travelerListResponse, ["ReferenceList", "referenceList"]);
  referenceLists.forEach((referenceList) => {
    getArrayByKeys(referenceList, ["Traveler", "traveler"]).forEach((traveler) =>
      pushTravelerIdentifier(traveler)
    );
  });

  const travelerResponseList = getArrayByKeys(travelerResponse, [
    "TravelerResponseList",
    "travelerResponseList",
  ]);
  travelerResponseList.forEach((entry) => {
    const innerResponse =
      entry?.TravelerResponse && typeof entry.TravelerResponse === "object"
        ? entry.TravelerResponse
        : entry?.travelerResponse && typeof entry.travelerResponse === "object"
          ? entry.travelerResponse
          : null;
    const innerTraveler =
      innerResponse?.Traveler && typeof innerResponse.Traveler === "object"
        ? innerResponse.Traveler
        : innerResponse?.traveler && typeof innerResponse.traveler === "object"
          ? innerResponse.traveler
          : null;
    pushTravelerIdentifier(innerTraveler);
  });

  const singleTravelerResponse =
    travelerResponse?.TravelerResponse && typeof travelerResponse.TravelerResponse === "object"
      ? travelerResponse.TravelerResponse
      : travelerResponse?.travelerResponse && typeof travelerResponse.travelerResponse === "object"
        ? travelerResponse.travelerResponse
        : null;
  const singleTraveler =
    singleTravelerResponse?.Traveler && typeof singleTravelerResponse.Traveler === "object"
      ? singleTravelerResponse.Traveler
      : singleTravelerResponse?.traveler && typeof singleTravelerResponse.traveler === "object"
        ? singleTravelerResponse.traveler
        : null;
  pushTravelerIdentifier(singleTraveler);

  return dedupeIdentifiers(identifiers);
};

const paxLabel = (value) => {
  const code = String(value || "").toUpperCase();
  if (code === "ADT" || code === "ADULT") return "Adult";
  if (code === "CHD" || code === "CNN" || code === "CHILD") return "Child";
  if (code === "INF" || code === "INFANT") return "Infant";
  return value || "Passenger";
};

const normalizePaxTypeCode = (value) => {
  const code = String(value || "").toUpperCase().trim();
  if (code === "ADT" || code === "ADULT") return "ADT";
  if (code === "CHD" || code === "CNN" || code === "CHILD") return "CHD";
  if (code === "INF" || code === "INFANT") return "INF";
  return code || "ADT";
};

const DISABILITY_SSR_OPTIONS = [
  { code: "BLND", label: "Blind Traveler" },
  { code: "DEAF", label: "Deaf Traveler" },
  { code: "DPNA", label: "Intellectual/Development Disability Assistance" },
  { code: "WCHC", label: "Wheelchair Completely Immobile" },
  { code: "WCHR", label: "Wheelchair Can Use Stairs" },
  { code: "WCHS", label: "Wheelchair Cannot Use Stairs" },
  { code: "WCLB", label: "Wheelchair Lithium-Ion Battery" },
  { code: "WCMP", label: "Wheelchair Manual Powered" },
  { code: "WCBW", label: "Wheelchair Wet Cell Battery" },
  { code: "WCBD", label: "Wheelchair Non-spillable Battery" },
];

const MEAL_SSR_OPTIONS = [
  { code: "BBML", label: "Baby Meal" },
  { code: "CHML", label: "Child Meal" },
  { code: "DBML", label: "Diabetic Meal" },
  { code: "FPML", label: "Fruit Platter Meal" },
  { code: "HNML", label: "Hindu Meal" },
  { code: "VJML", label: "Jain Meal" },
  { code: "KSML", label: "Kosher Meal" },
  { code: "LCML", label: "Low Calorie Meal" },
  { code: "LFML", label: "Low Fat Meal" },
  { code: "LSML", label: "Low Salt Meal" },
  { code: "MOML", label: "Muslim Meal" },
  { code: "NLML", label: "Non Lactose Meal" },
  { code: "NOML", label: "No Meal" },
  { code: "SFML", label: "Seafood Meal" },
  { code: "VGML", label: "Vegan Meal" },
  { code: "AVML", label: "Vegetarian Hindu Meal" },
  { code: "VLML", label: "Vegetarian Lacto Ovo Meal" },
  { code: "VOML", label: "Vegetarian Oriental Meal" },
  { code: "RVML", label: "Vegetarian Raw Meal" },
];

const getMealSsrOptionsByPaxType = (paxTypeCode) => {
  const normalizedPaxType = normalizePaxTypeCode(paxTypeCode);
  return MEAL_SSR_OPTIONS.filter((item) => {
    if (item.code === "BBML") return normalizedPaxType === "INF";
    if (item.code === "CHML") return normalizedPaxType === "CHD";
    return true;
  });
};

const buildPassengerCounts = (passengers = []) =>
  passengers.reduce(
    (acc, passenger) => {
      const code = String(passenger?.PaxType || passenger?.paxType || passenger?.type || "")
        .trim()
        .toUpperCase();
      if (["ADT", "ADULT"].includes(code)) acc.adultCount += 1;
      if (["CHD", "CNN", "CHILD"].includes(code)) acc.childCount += 1;
      if (["INF", "INFANT"].includes(code)) acc.infantCount += 1;
      return acc;
    },
    { adultCount: 0, childCount: 0, infantCount: 0 }
  );

const buildPreviewSessionKey = (payload) => {
  const bookingBody = payload?.bookingBody || {};
  const passengers = Array.isArray(payload?.passengers)
    ? payload.passengers
    : Array.isArray(bookingBody?.Passengers)
    ? bookingBody.Passengers
    : [];
  const selectedAirPrice = payload?.selectedAirPrice || {};
  const selectedOffer = payload?.selectedOffer || {};

  const offerListIdentifier =
    selectedAirPrice?.farePolicyRequest?.offerListIdentifier ||
    selectedOffer?.farePolicyRequest?.offerListIdentifier ||
    selectedAirPrice?.seatAvailabilityRequest?.offerListIdentifier ||
    selectedOffer?.seatAvailabilityRequest?.offerListIdentifier ||
    "";
  const offerIdentifier =
    selectedAirPrice?.OfferIdentifier ||
    selectedAirPrice?.offerIdentifier ||
    selectedOffer?.OfferIdentifier ||
    selectedOffer?.offerIdentifier ||
    "";
  const resultId =
    selectedAirPrice?.ResultId || selectedOffer?.ResultId || bookingBody?.ResultId || "";
  const searchId =
    selectedAirPrice?.SearchId || selectedOffer?.SearchId || bookingBody?.SearchId || "";

  const passengerSignature = passengers
    .map((passenger) =>
      [
        toSafeText(passenger?.PaxType || passenger?.paxType),
        toSafeText(passenger?.FirstName || passenger?.firstName),
        toSafeText(passenger?.LastName || passenger?.lastName),
        toSafeText(passenger?.DateOfBirth || passenger?.dateOfBirth),
      ]
        .map((item) => item.toUpperCase())
        .join("-")
    )
    .join("|");

  return [
    toSafeText(resultId).toUpperCase(),
    toSafeText(searchId).toUpperCase(),
    toSafeText(offerListIdentifier).toUpperCase(),
    toSafeText(offerIdentifier).toUpperCase(),
    passengerSignature,
  ].join("::");
};

const FLOW_CONTEXT_STORAGE_KEY = "flyjatt:book_hold_flow_context";
const PRECOMMIT_STORAGE_KEY = "flyjatt:last_precommit_response";
const COMMIT_STORAGE_KEY = "flyjatt:last_book_hold_response";
const FLOW_TTL_MS = 10 * 60 * 1000;

const generateUniqueBookingKey = (prefix) => {
  const randomPart =
    typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`;
};

const createFlowContext = (previewSessionKey) => {
  const createdAt = Date.now();
  const expiresAt = createdAt + FLOW_TTL_MS;
  return {
    previewSessionKey,
    bookingFlowKey: generateUniqueBookingKey("flow"),
    bookingOfferKey: generateUniqueBookingKey("offer"),
    createdAt,
    expiresAt,
  };
};

const isFlowExpired = (flowContext) =>
  Number(flowContext?.expiresAt || 0) > 0 &&
  Number(flowContext?.expiresAt || 0) <= Date.now();

const PreviewBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(location?.state || {});
  const [preCommitData, setPreCommitData] = useState(null);
  const [finalCommitData, setFinalCommitData] = useState(null);
  const [flowContext, setFlowContext] = useState(null);
  const [specialRequestDialogOpen, setSpecialRequestDialogOpen] = useState(false);
  const [specialRequestSelections, setSpecialRequestSelections] = useState({});
  const [specialRequestResponse, setSpecialRequestResponse] = useState(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const previewSessionKey = useMemo(
    () => buildPreviewSessionKey(previewPayload),
    [previewPayload]
  );

  const clearStoredBookHoldResponses = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(PRECOMMIT_STORAGE_KEY);
    window.sessionStorage.removeItem(COMMIT_STORAGE_KEY);
  };

  const destroyFlowContext = ({
    clearResponses = true,
    clearInMemory = true,
  } = {}) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(FLOW_CONTEXT_STORAGE_KEY);
      if (clearResponses) {
        clearStoredBookHoldResponses();
      }
    }
    if (clearInMemory) {
      setFlowContext(null);
      setPreCommitData(null);
      setFinalCommitData(null);
    }
  };

  const ensureActiveFlowContext = (forceNew = false) => {
    if (typeof window === "undefined") return null;
    if (!previewSessionKey) return null;

    if (!forceNew && flowContext) {
      const sameContext = flowContext?.previewSessionKey === previewSessionKey;
      if (sameContext && !isFlowExpired(flowContext)) {
        return flowContext;
      }
    }

    let stored = null;
    if (!forceNew) {
      try {
        const raw = window.sessionStorage.getItem(FLOW_CONTEXT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            parsed.previewSessionKey === previewSessionKey &&
            !isFlowExpired(parsed) &&
            parsed.bookingFlowKey
          ) {
            stored = parsed;
          }
        }
      } catch (error) {
        console.warn("Unable to parse booking flow context cache", error);
      }
    }

    if (stored) {
      setFlowContext(stored);
      return stored;
    }

    const next = createFlowContext(previewSessionKey);
    try {
      window.sessionStorage.setItem(FLOW_CONTEXT_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("Unable to store booking flow context", error);
    }
    setFlowContext(next);
    return next;
  };

  useEffect(() => {
    if (previewPayload?.bookingBody) return;
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:preview_booking");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.bookingBody) {
            setPreviewPayload(parsed);
          }
        }
      }
    } catch (error) {
      console.warn("Unable to read cached preview booking payload", error);
    }
  }, [previewPayload]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!previewSessionKey) {
      destroyFlowContext();
      return;
    }

    const activeContext = ensureActiveFlowContext(false);
    if (!activeContext) {
      destroyFlowContext();
      return;
    }

    if (isFlowExpired(activeContext)) {
      destroyFlowContext();
      return;
    }

    let matchedPreCommit = null;
    let matchedFinalCommit = null;
    try {
      const preCommitRaw = window.sessionStorage.getItem(PRECOMMIT_STORAGE_KEY);
      if (preCommitRaw) {
        const parsed = JSON.parse(preCommitRaw);
        const contextKey = parsed?.previewSessionKey || "";
        const flowKey = parsed?.bookingFlowKey || "";
        const expiresAt = Number(parsed?.expiresAt || 0);
        const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;

        if (
          (contextKey && contextKey !== previewSessionKey) ||
          (flowKey && flowKey !== activeContext.bookingFlowKey) ||
          (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= Date.now())
        ) {
          window.sessionStorage.removeItem(PRECOMMIT_STORAGE_KEY);
        } else if (data?.reservationId) {
          matchedPreCommit = data;
        }
      }

      const finalCommitRaw = window.sessionStorage.getItem(COMMIT_STORAGE_KEY);
      if (finalCommitRaw) {
        const parsed = JSON.parse(finalCommitRaw);
        const contextKey = parsed?.previewSessionKey || "";
        const flowKey = parsed?.bookingFlowKey || "";
        const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;

        if (
          (contextKey && contextKey !== previewSessionKey) ||
          (flowKey && flowKey !== activeContext.bookingFlowKey)
        ) {
          window.sessionStorage.removeItem(COMMIT_STORAGE_KEY);
        } else if (
          data?.reservationId &&
          matchedPreCommit?.reservationId &&
          String(data.reservationId) === String(matchedPreCommit.reservationId)
        ) {
          matchedFinalCommit = data;
        }
      }
    } catch (error) {
      console.warn("Unable to read cached booking commit payload", error);
      destroyFlowContext();
      return;
    }

    setPreCommitData(matchedPreCommit);
    setFinalCommitData(matchedFinalCommit);
  }, [previewSessionKey, location?.state?.finalCommitResponse]);

  useEffect(() => {
    if (!flowContext) return undefined;
    if (typeof window === "undefined") return undefined;

    const timer = window.setInterval(() => {
      if (isFlowExpired(flowContext)) {
        destroyFlowContext();
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [flowContext]);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      try {
        const user = await fetchBookingAuthMe();
        if (!cancelled) {
          setAuthUser(user || null);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthUser(null);
        }
        console.warn("Unable to load booking auth session", error);
      }
    };
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuthDialogForAction = (actionKey) => {
    setPendingAuthAction(actionKey);
    setAuthError("");
    setAuthDialogOpen(true);
  };

  const handleAuthInputChange = (field, value) => {
    setAuthForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAuthSubmit = async () => {
    const email = String(authForm.email || "").trim();
    const password = String(authForm.password || "");
    const name = String(authForm.name || "").trim();

    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }
    if (authMode === "register" && !name) {
      setAuthError("Name is required for registration.");
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");
    try {
      const user =
        authMode === "register"
          ? await registerBookingUser({ name, email, password })
          : await loginBookingUser({ email, password });
      setAuthUser(user || null);
      setAuthDialogOpen(false);
      Swal.fire({
        icon: "success",
        title: authMode === "register" ? "Registration successful" : "Login successful",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const bookingBody = previewPayload?.bookingBody || {};
  const passengers = Array.isArray(previewPayload?.passengers)
    ? previewPayload.passengers
    : Array.isArray(bookingBody?.Passengers)
    ? bookingBody.Passengers
    : [];
  const selectedAirPrice = previewPayload?.selectedAirPrice || {};
  const selectedOffer = previewPayload?.selectedOffer || {};
  const flightInfoSource =
    selectedAirPrice && Object.keys(selectedAirPrice).length
      ? selectedAirPrice
      : selectedOffer;
  const priceRows = getArrayByKeys(flightInfoSource, ["PriceBreakDown", "priceBreakDown"]);
  const currency =
    flightInfoSource?.CurrencyCode ||
    flightInfoSource?.currencyCode ||
    priceRows?.[0]?.CurrencyCode ||
    priceRows?.[0]?.currencyCode ||
    "USD";

  const fareTotals = useMemo(() => {
    const base = priceRows.reduce(
      (sum, row) => sum + toNumberValue(row?.BaseFare ?? row?.baseFare),
      0
    );
    const taxes = priceRows.reduce(
      (sum, row) => sum + toNumberValue(row?.Taxes ?? row?.taxes),
      0
    );
    const total = priceRows.reduce(
      (sum, row) => sum + toNumberValue(row?.TotalFare ?? row?.totalFare),
      0
    );
    const netFare =
      toNumberValue(flightInfoSource?.NetFare ?? flightInfoSource?.netFare) || total;
    return { base, taxes, total, netFare };
  }, [priceRows, flightInfoSource]);

  const passengerCounts = useMemo(
    () => buildPassengerCounts(passengers),
    [passengers]
  );
  const preCommitTravelerIdentifiers = useMemo(
    () => {
      const direct = Array.isArray(preCommitData?.travelerIdentifiers)
        ? preCommitData.travelerIdentifiers
        : [];
      if (direct.length) return dedupeIdentifiers(direct);
      return extractTravelerIdentifiersFromTravelerResponse(preCommitData?.travelerResponse);
    },
    [preCommitData]
  );
  const preCommitOfferIdentifiers = useMemo(
    () => {
      const direct = Array.isArray(preCommitData?.offerIdentifiers)
        ? preCommitData.offerIdentifiers
        : [];
      if (direct.length) return dedupeIdentifiers(direct);
      return extractOfferIdentifiersFromAddOfferResponse(preCommitData?.addOfferResponse);
    },
    [preCommitData]
  );
  const specialRequestTravelers = useMemo(
    () =>
      preCommitTravelerIdentifiers.map((travelerIdentifier, index) => {
        const passenger = passengers[index] || {};
        const paxTypeCode = normalizePaxTypeCode(
          passenger?.PaxType || passenger?.paxType || passenger?.type
        );
        const fullName = [
          passenger?.Title || passenger?.title || "",
          passenger?.FirstName || passenger?.firstName || "",
          passenger?.LastName || passenger?.lastName || "",
        ]
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        return {
          travelerIdentifier: String(travelerIdentifier),
          label: fullName || `Traveler ${index + 1}`,
          paxTypeCode,
          paxType: paxLabel(passenger?.PaxType || passenger?.paxType),
        };
      }),
    [preCommitTravelerIdentifiers, passengers]
  );
  const canAddSpecialRequest = Boolean(
    preCommitData?.reservationId &&
      preCommitOfferIdentifiers.length > 0 &&
      specialRequestTravelers.length > 0
  );
  const specialRequestBlockedReason = useMemo(() => {
    if (!preCommitData?.reservationId) return "Preview booking first.";
    if (preCommitOfferIdentifiers.length === 0) {
      return "Offer identifier not found in pre-commit response.";
    }
    if (specialRequestTravelers.length === 0) {
      return "Traveler identifiers not found in pre-commit response.";
    }
    return "";
  }, [preCommitData?.reservationId, preCommitOfferIdentifiers, specialRequestTravelers]);

  useEffect(() => {
    if (!specialRequestDialogOpen) return;
    setSpecialRequestSelections((prevState) => {
      const nextState = { ...prevState };
      specialRequestTravelers.forEach((traveler) => {
        const existing = nextState[traveler.travelerIdentifier] || {};
        const allowedMealCodes = new Set(
          getMealSsrOptionsByPaxType(traveler.paxTypeCode).map((item) => item.code)
        );
        const normalizedMealCode = String(existing.mealCode || "").trim();
        const mealCodeToKeep =
          normalizedMealCode && allowedMealCodes.has(normalizedMealCode)
            ? normalizedMealCode
            : "";
        nextState[traveler.travelerIdentifier] = {
          mealCode: mealCodeToKeep,
          disabilityCode: String(existing.disabilityCode || "").trim(),
        };
      });
      return nextState;
    });
  }, [specialRequestDialogOpen, specialRequestTravelers]);

  const isCommittedForCurrentPrecommit = Boolean(
    preCommitData?.reservationId &&
      finalCommitData?.reservationId &&
      finalCommitData?.locator &&
      String(preCommitData.reservationId) === String(finalCommitData.reservationId)
  );
  const bookingFlowSteps = useMemo(
    () => [
      {
        key: "precommit",
        label: "1. Pre-Commit API",
        done: Boolean(preCommitData?.workbenchResponse || preCommitData?.reservationId),
      },
      {
        key: "traveler",
        label: "2. Add Traveller",
        done: preCommitTravelerIdentifiers.length > 0,
      },
      {
        key: "offer",
        label: "3. Add Offer",
        done: preCommitOfferIdentifiers.length > 0,
      },
      {
        key: "preview",
        label: "4. Preview Booking",
        done: Boolean(preCommitData?.reservationId),
      },
      {
        key: "confirm",
        label: "5. Confirm Booking",
        done: Boolean(finalCommitData?.locator),
      },
    ],
    [
      preCommitData,
      finalCommitData,
      preCommitTravelerIdentifiers.length,
      preCommitOfferIdentifiers.length,
    ]
  );

  const getBookHoldBaseInput = () => {
    const selectedOfferForBookHold =
      selectedAirPrice && Object.keys(selectedAirPrice).length
        ? selectedAirPrice
        : selectedOffer;

    if (
      !passengers.length ||
      !selectedOfferForBookHold ||
      !Object.keys(selectedOfferForBookHold).length
    ) {
      return null;
    }

    return {
      selectedAirPrice: selectedOfferForBookHold,
      selectedOffer,
      passengers,
      seatSelections: Array.isArray(previewPayload?.seatSelections)
        ? previewPayload.seatSelections
        : Array.isArray(bookingBody?.SeatSelections)
        ? bookingBody.SeatSelections
        : [],
      adultCount: passengerCounts.adultCount,
      childCount: passengerCounts.childCount,
      infantCount: passengerCounts.infantCount,
    };
  };

  const handlePrepareBooking = async () => {
    if (!authUser?.id) {
      openAuthDialogForAction("prepare");
      return;
    }

    const baseInput = getBookHoldBaseInput();
    if (!baseInput) {
      Swal.fire("Missing data", "Preview booking payload is incomplete.", "error");
      return;
    }
    const activeContext = ensureActiveFlowContext(false);
    if (!activeContext) {
      Swal.fire(
        "Session key error",
        "Unable to create booking session key. Please refresh and try again.",
        "error"
      );
      return;
    }

    if (isFlowExpired(activeContext)) {
      destroyFlowContext();
      Swal.fire(
        "Session expired",
        "Booking preview session expired. Please start again.",
        "warning"
      );
      return;
    }

    setSubmitting(true);
    Swal.fire({
      title: "Preparing booking preview...",
      text: "Running pre-commit API, traveler and offer steps.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const responseData = await prepareTravelportBookHold({
        ...baseInput,
        bookingFlowKey: activeContext.bookingFlowKey,
        bookingOfferKey: activeContext.bookingOfferKey,
        bookingFlowExpiresAt: activeContext.expiresAt,
      });
      setPreCommitData(responseData || null);
      setFinalCommitData(null);

      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            PRECOMMIT_STORAGE_KEY,
            JSON.stringify({
              previewSessionKey,
              bookingFlowKey: activeContext.bookingFlowKey,
              bookingOfferKey: activeContext.bookingOfferKey,
              expiresAt: activeContext.expiresAt,
              data: responseData || {},
            })
          );
          window.sessionStorage.removeItem(COMMIT_STORAGE_KEY);
        }
      } catch (storageError) {
        console.warn("Unable to cache pre-commit response", storageError);
      }

      const reservationId = responseData?.reservationId || "N/A";
      const offerId = Array.isArray(responseData?.offerIdentifiers)
        ? responseData.offerIdentifiers[0] || "N/A"
        : "N/A";

      Swal.fire({
        icon: "success",
        title: "Booking Preview Ready",
        html: `Reservation ID: <b>${reservationId}</b><br/>Offer ID: <b>${offerId}</b><br/>Now click <b>Confirm Booking</b> to get locator.`,
      });
    } catch (error) {
      if (error?.requiresLogin || error?.status === 401) {
        Swal.close();
        openAuthDialogForAction("prepare");
        return;
      }
      destroyFlowContext();
      Swal.fire(
        "Preview failed",
        error instanceof Error
          ? error.message
          : "There was an error preparing booking preview.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpecialRequestValueChange = (travelerIdentifier, field, value) => {
    setSpecialRequestSelections((prevState) => ({
      ...prevState,
      [travelerIdentifier]: {
        ...(prevState[travelerIdentifier] || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmitSpecialRequests = async () => {
    const reservationId = String(preCommitData?.reservationId || "").trim();
    const primaryOfferIdentifier = String(preCommitOfferIdentifiers[0] || "").trim();
    if (!reservationId || !primaryOfferIdentifier) {
      Swal.fire(
        "Booking preview required",
        "Preview booking first to get reservation and offer identifiers.",
        "warning"
      );
      return;
    }

    const specialRequests = [];
    specialRequestTravelers.forEach((traveler) => {
      const selection = specialRequestSelections[traveler.travelerIdentifier] || {};
      const mealCode = String(selection?.mealCode || "").trim();
      const disabilityCode = String(selection?.disabilityCode || "").trim();
      const allowedMealCodes = new Set(
        getMealSsrOptionsByPaxType(traveler.paxTypeCode).map((item) => item.code)
      );

      if (mealCode && allowedMealCodes.has(mealCode)) {
        specialRequests.push({
          travelerIdentifier: traveler.travelerIdentifier,
          offerIdentifier: primaryOfferIdentifier,
          ssrCode: mealCode,
        });
      }
      if (disabilityCode) {
        specialRequests.push({
          travelerIdentifier: traveler.travelerIdentifier,
          offerIdentifier: primaryOfferIdentifier,
          ssrCode: disabilityCode,
        });
      }
    });

    if (!specialRequests.length) {
      Swal.fire(
        "No special request selected",
        "Choose at least one meal or disability SSR code.",
        "info"
      );
      return;
    }

    setSubmitting(true);
    Swal.fire({
      title: "Adding special requests...",
      text: "Submitting SSR requests for selected travelers.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response = await addTravelportSpecialServices({
        reservationId,
        offerIdentifier: primaryOfferIdentifier,
        specialRequests,
      });
      setSpecialRequestResponse(response || null);
      setSpecialRequestDialogOpen(false);

      await Swal.fire({
        icon: "success",
        title: "Special request added",
        html: `Submitted <b>${specialRequests.length}</b> SSR request(s) successfully.`,
      });
    } catch (error) {
      Swal.fire(
        "Special request failed",
        error instanceof Error
          ? error.message
          : "Unable to add special requests right now.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalCommit = async () => {
    if (!authUser?.id) {
      openAuthDialogForAction("commit");
      return;
    }

    const activeContext = ensureActiveFlowContext(false);
    if (!activeContext) {
      Swal.fire(
        "Session key error",
        "Booking session key is missing. Please preview booking again.",
        "warning"
      );
      return;
    }

    if (isFlowExpired(activeContext)) {
      destroyFlowContext();
      Swal.fire(
        "Session expired",
        "Booking session expired after 10 minutes. Please run preview again.",
        "warning"
      );
      return;
    }

    const reservationId = String(preCommitData?.reservationId || "").trim();
    if (!reservationId) {
      Swal.fire(
        "Preview required",
        "Please preview booking first, then confirm booking.",
        "warning"
      );
      return;
    }

    setSubmitting(true);
    Swal.fire({
      title: "Confirming booking...",
      text: "Please wait while we commit reservation and fetch locator.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const responseData = await commitTravelportBookHold({
        reservationId,
        bookingFlowKey: activeContext.bookingFlowKey,
        bookingOfferKey: activeContext.bookingOfferKey,
        bookingFlowExpiresAt: activeContext.expiresAt,
      });
      setFinalCommitData(responseData || null);

      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            COMMIT_STORAGE_KEY,
            JSON.stringify({
              previewSessionKey,
              bookingFlowKey: activeContext.bookingFlowKey,
              bookingOfferKey: activeContext.bookingOfferKey,
              expiresAt: activeContext.expiresAt,
              data: responseData || {},
            })
          );
          window.sessionStorage.removeItem(PRECOMMIT_STORAGE_KEY);
          window.sessionStorage.removeItem(FLOW_CONTEXT_STORAGE_KEY);
        }
      } catch (storageError) {
        console.warn("Unable to cache final commit response", storageError);
      }
      setFlowContext(null);
      setPreCommitData(null);

      const locator = responseData?.locator || "N/A";
      await Swal.fire({
        icon: "success",
        title: "Booking Confirmed",
        html: `Reservation ID: <b>${reservationId}</b><br/>PNR Locator: <b>${locator}</b><br/>Opening booking details...`,
      });
      navigate(`/bookingconfirmation?pnr=${encodeURIComponent(locator)}`, {
        state: {
          previewPayload,
          preCommitResponse: preCommitData || null,
          finalCommitResponse: responseData || null,
        },
      });
    } catch (error) {
      if (error?.requiresLogin || error?.status === 401) {
        Swal.close();
        openAuthDialogForAction("commit");
        return;
      }
      if (error?.status === 409 && error?.payload?.previousBooking) {
        const previous = error.payload.previousBooking || {};
        await Swal.fire({
          icon: "info",
          title: "Duplicate Booking Blocked",
          html: `Previous booking found for same flight/date.<br/>Locator: <b>${
            previous?.locator || "N/A"
          }</b><br/>Reservation: <b>${previous?.reservationId || "N/A"}</b>`,
        });
        return;
      }
      if (error?.status === 429) {
        await Swal.fire({
          icon: "warning",
          title: "Daily Booking Limit Reached",
          text: error instanceof Error ? error.message : "Maximum 10 bookings allowed per day.",
        });
        return;
      }
      Swal.fire(
        "Booking failed",
        error instanceof Error
          ? error.message
          : "There was an error confirming booking.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!authUser?.id || !pendingAuthAction) return;
    const action = pendingAuthAction;
    setPendingAuthAction(null);
    if (action === "prepare") {
      handlePrepareBooking();
    } else if (action === "commit") {
      handleFinalCommit();
    }
  }, [authUser, pendingAuthAction]);

  if (!passengers.length || !Object.keys(flightInfoSource || {}).length) {
    return (
      <Box>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Preview booking data not found. Please go back and click Preview Booking again.
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate("/selectedflightdetails")}
            sx={{ bgcolor: "var(--primary-button)", textTransform: "none" }}
          >
            Back To Booking Details
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper elevation={0} sx={{ p: 1.5, border: "1px solid #E3EBF7", mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#123d66", mb: 1 }}>
            Booking Flow
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
            {bookingFlowSteps.map((step) => (
              <Box
                key={step.key}
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: step.done ? "#BEE5C8" : "#D8E2EF",
                  bgcolor: step.done ? "#EAF9EF" : "#F7FAFF",
                  color: step.done ? "#1E6A3A" : "#4F6178",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {step.label}
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: "1px solid #E3EBF7",
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 12, color: "#56718D", fontWeight: 600 }}>
            {authUser?.email
              ? `Logged in as ${authUser.email}`
              : "Login required before preview/confirm booking"}
          </Typography>
          {!authUser?.email ? (
            <Button
              variant="outlined"
              onClick={() => openAuthDialogForAction("prepare")}
              sx={{ textTransform: "none", borderRadius: "10px", fontWeight: 700 }}
            >
              Login / Register
            </Button>
          ) : null}
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: "1px solid #DCE4EE", borderRadius: "14px", overflow: "hidden", mb: 2 }}
        >
          <Box
            sx={{
              px: { xs: "12px", md: "16px" },
              py: "11px",
              bgcolor: "var(--primary-button)",
              borderBottom: "1px solid rgba(8, 25, 47, 0.18)",
            }}
          >
            <Typography sx={{ color: "#FFFFFF", fontSize: { xs: "14px", md: "16px" }, fontWeight: 800 }}>
              Flight Information
            </Typography>
          </Box>
          <Box sx={{ p: { xs: "10px", md: "14px" }, bgcolor: "#FFFFFF" }}>
            <FlightDetailsContent data={flightInfoSource} compactLayout amenityIconsOnly />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.5 }}>
            Passenger Information
          </Typography>
          <Grid container spacing={1.2}>
            {passengers.map((passenger, index) => (
              <Grid item xs={12} md={6} key={`passenger-${index}`}>
                <Box
                  sx={{
                    border: "1px solid #E9EEF8",
                    borderRadius: "10px",
                    p: 1.2,
                    bgcolor: "#FCFEFF",
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.4 }}>
                    {passenger?.Title ? `${passenger.Title} ` : ""}
                    {passenger?.FirstName || ""} {passenger?.LastName || ""}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    {paxLabel(passenger?.PaxType)} | {passenger?.Gender || "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    DOB:{" "}
                    {passenger?.DateOfBirth
                      ? moment(passenger.DateOfBirth).format("DD MMM YYYY")
                      : "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    Passport: {passenger?.PassportNumber || "N/A"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                    Nationality: {passenger?.PassportNationality || "N/A"}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #E3EBF7", mb: 2 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#123d66", mb: 1.5 }}>
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
            const bags = Array.isArray(row?.Bag || row?.bag)
              ? row?.Bag || row?.bag
              : [];
            const baggageText = bags.length
              ? Array.from(
                  new Set(
                    bags.map(
                      (bag) =>
                        bag?.Allowance ||
                        bag?.allowance ||
                        bag?.Baggage ||
                        bag?.baggage ||
                        "N/A"
                    )
                  )
                ).join(" | ")
              : "N/A";
            return (
              <Box
                key={`fare-row-${idx}`}
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
                <Typography sx={{ fontSize: 12, color: "#63748E" }}>{baggageText}</Typography>
              </Box>
            );
          })}

          <Divider sx={{ my: 1.2 }} />
          <Grid container spacing={1}>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 13, color: "#63748E" }}>
                Total Base: <strong>{formatMoney(fareTotals.base)} {currency}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 13, color: "#63748E" }}>
                Total Tax: <strong>{formatMoney(fareTotals.taxes)} {currency}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 13, color: "#123d66" }}>
                Grand Total: <strong>{formatMoney(fareTotals.netFare)} {currency}</strong>
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: "flex", gap: 1.2, justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            sx={{ textTransform: "none", borderRadius: "10px" }}
          >
            Back
          </Button>
          {!preCommitData?.reservationId || isCommittedForCurrentPrecommit ? (
            <Button
              variant="contained"
              disabled={submitting}
              onClick={handlePrepareBooking}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                fontWeight: 700,
                bgcolor: "var(--primary-button)",
                ":hover": { bgcolor: "var(--primary-button)" },
              }}
            >
              {isCommittedForCurrentPrecommit
                ? "Preview New Booking"
                : "Preview Booking"}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                disabled={submitting || !canAddSpecialRequest}
                onClick={() => setSpecialRequestDialogOpen(true)}
                sx={{ textTransform: "none", borderRadius: "10px", fontWeight: 700 }}
              >
                Add Special Request
              </Button>
              <Button
                variant="contained"
                disabled={submitting}
                onClick={handleFinalCommit}
                sx={{
                  textTransform: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  bgcolor: "var(--primary-button)",
                  ":hover": { bgcolor: "var(--primary-button)" },
                }}
              >
                Confirm Booking
              </Button>
            </>
          )}
          {isCommittedForCurrentPrecommit && finalCommitData?.locator ? (
            <Button
              variant="outlined"
              onClick={() =>
                navigate(
                  `/bookingconfirmation?pnr=${encodeURIComponent(
                    String(finalCommitData.locator)
                  )}`,
                  {
                    state: {
                      previewPayload,
                      preCommitResponse: preCommitData || null,
                      finalCommitResponse: finalCommitData || null,
                    },
                  }
                )
              }
              sx={{ textTransform: "none", borderRadius: "10px" }}
            >
              Open Booking
            </Button>
          ) : null}
        </Box>
        {!isCommittedForCurrentPrecommit &&
        preCommitData?.reservationId &&
        !canAddSpecialRequest ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Special request is currently unavailable: {specialRequestBlockedReason}
          </Alert>
        ) : null}

        <Dialog
          open={specialRequestDialogOpen}
          onClose={() => setSpecialRequestDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#123d66" }}>
            Add Special Request
          </DialogTitle>
          <DialogContent dividers>
            <Typography sx={{ fontSize: 12, color: "#5E6E85", mb: 1.2 }}>
              Select meal and/or disability SSR codes per traveler.
            </Typography>
            {specialRequestTravelers.length === 0 ? (
              <Alert severity="info">
                Traveler identifiers are not ready yet. Please preview booking first.
              </Alert>
            ) : (
              <Box sx={{ display: "grid", gap: 1.2 }}>
                {specialRequestTravelers.map((traveler) => {
                  const selection =
                    specialRequestSelections[traveler.travelerIdentifier] || {};
                  const travelerMealOptions = getMealSsrOptionsByPaxType(
                    traveler.paxTypeCode
                  );
                  return (
                    <Box
                      key={traveler.travelerIdentifier}
                      sx={{
                        border: "1px solid #E3EBF7",
                        borderRadius: "10px",
                        p: 1.2,
                        bgcolor: "#FAFCFF",
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#123d66" }}>
                        {traveler.label}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#63748E", mb: 1 }}>
                        {traveler.paxType} • Traveler ID: {traveler.travelerIdentifier}
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Meal SSR</InputLabel>
                            <Select
                              label="Meal SSR"
                              value={selection.mealCode || ""}
                              onChange={(event) =>
                                handleSpecialRequestValueChange(
                                  traveler.travelerIdentifier,
                                  "mealCode",
                                  event.target.value
                                )
                              }
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {travelerMealOptions.map((item) => (
                                <MenuItem key={item.code} value={item.code}>
                                  {item.code} - {item.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Disability SSR</InputLabel>
                            <Select
                              label="Disability SSR"
                              value={selection.disabilityCode || ""}
                              onChange={(event) =>
                                handleSpecialRequestValueChange(
                                  traveler.travelerIdentifier,
                                  "disabilityCode",
                                  event.target.value
                                )
                              }
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {DISABILITY_SSR_OPTIONS.map((item) => (
                                <MenuItem key={item.code} value={item.code}>
                                  {item.code} - {item.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </Box>
            )}
            {specialRequestResponse?.requestCount ? (
              <Alert severity="success" sx={{ mt: 1.2 }}>
                Last submission: {specialRequestResponse.requestCount} special request(s) added.
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSpecialRequestDialogOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={submitting || !canAddSpecialRequest}
              onClick={handleSubmitSpecialRequests}
              sx={{
                textTransform: "none",
                bgcolor: "var(--primary-button)",
                ":hover": { bgcolor: "var(--primary-button)" },
              }}
            >
              Save Special Request
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={authDialogOpen}
          onClose={() => {
            if (!authSubmitting) setAuthDialogOpen(false);
          }}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#123d66" }}>
            {authMode === "register" ? "Register to Continue Booking" : "Login to Continue Booking"}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <Button
                variant={authMode === "login" ? "contained" : "outlined"}
                onClick={() => setAuthMode("login")}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  bgcolor: authMode === "login" ? "var(--primary-button)" : undefined,
                  ":hover": {
                    bgcolor: authMode === "login" ? "var(--primary-button)" : undefined,
                  },
                }}
              >
                Login
              </Button>
              <Button
                variant={authMode === "register" ? "contained" : "outlined"}
                onClick={() => setAuthMode("register")}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  bgcolor: authMode === "register" ? "var(--primary-button)" : undefined,
                  ":hover": {
                    bgcolor: authMode === "register" ? "var(--primary-button)" : undefined,
                  },
                }}
              >
                Register
              </Button>
            </Box>

            {authMode === "register" ? (
              <TextField
                label="Full Name"
                fullWidth
                size="small"
                value={authForm.name}
                onChange={(event) => handleAuthInputChange("name", event.target.value)}
                sx={{ mb: 1.2 }}
              />
            ) : null}

            <TextField
              label="Email"
              fullWidth
              size="small"
              type="email"
              value={authForm.email}
              onChange={(event) => handleAuthInputChange("email", event.target.value)}
              sx={{ mb: 1.2 }}
            />
            <TextField
              label="Password"
              fullWidth
              size="small"
              type="password"
              value={authForm.password}
              onChange={(event) => handleAuthInputChange("password", event.target.value)}
            />

            {authError ? (
              <Alert severity="error" sx={{ mt: 1.2 }}>
                {authError}
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setAuthDialogOpen(false)}
              disabled={authSubmitting}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAuthSubmit}
              disabled={authSubmitting}
              sx={{
                textTransform: "none",
                bgcolor: "var(--primary-button)",
                ":hover": { bgcolor: "var(--primary-button)" },
              }}
            >
              {authSubmitting
                ? "Please wait..."
                : authMode === "register"
                ? "Register & Continue"
                : "Login & Continue"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default PreviewBooking;
