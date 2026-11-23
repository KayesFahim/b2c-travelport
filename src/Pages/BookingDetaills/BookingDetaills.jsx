import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import NavBar from "../../Shared/NavBar/NavBar";
import FareBreakdown from "./FareBreakdown/FareBreakdown";
import Support from "./Support/Support";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import Swal from "sweetalert2";
import commaNumber from "comma-number";
import FlightDetails from "../ShowDetails/FlightDetailsContent";
import FlightForm from "./PassengerInfo/FlightForm";
import Loading from "./Loading";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { getFareOptionKey } from "../../utils/fareOptionKey";
import { fetchTravelportBuildFromProducts } from "../../utils/travelportBuildFromProducts";
import { fetchTravelportSeatAvailability } from "../../utils/travelportSeatAvailability";
import { fetchTravelportAncillaryShop } from "../../utils/travelportAncillaryShop";
import RightSidebarInfo from "./RightSidebarInfo";
import BrandSelector from "./BrandSelector";

const isFlightOfferShape = (value) => {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value?.ResultId ||
    value?.resultId ||
    value?.identifier ||
    value?.SearchId ||
    value?.searchId ||
    value?.AllLegsInfo ||
    value?.allLegsInfo
  );
};

const resolveSelectedOfferFromRouteState = (routeState) => {
  if (!routeState || typeof routeState !== "object") {
    return {};
  }

  if (isFlightOfferShape(routeState?.selectedOffer)) {
    return routeState.selectedOffer;
  }

  if (isFlightOfferShape(routeState)) {
    return routeState;
  }

  return {};
};

const getValueByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

const getArrayByKeys = (obj, keys = []) => {
  if (!obj || typeof obj !== "object") return [];
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
  }
  return [];
};

const normalizeIdentifier = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
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

const normalizeIdentifierList = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => normalizeIdentifier(item)).filter(Boolean))
    );
  }
  const single = normalizeIdentifier(value);
  return single ? [single] : [];
};

const toTextValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toTextValue(item);
      if (parsed) return parsed;
    }
    return "";
  }
  if (typeof value === "object") {
    return (
      toTextValue(value?.value) ||
      toTextValue(value?.Value) ||
      toTextValue(value?.name) ||
      toTextValue(value?.Name) ||
      toTextValue(value?.code) ||
      toTextValue(value?.Code) ||
      ""
    );
  }
  return "";
};

const toNumberValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toNumberValue(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  if (typeof value === "object") {
    return toNumberValue(
      value?.value ??
      value?.Value ??
      value?.amount ??
      value?.Amount ??
      value?.TotalPrice ??
      value?.totalPrice ??
      value?.Base ??
      value?.base ??
      null
    );
  }
  return null;
};

const resolvePriceFromNode = (node = {}) => {
  const priceSource =
    getValueByKeys(node, ["Price", "price", "Amount", "amount"]) || node;
  const amount = toNumberValue(
    getValueByKeys(priceSource, [
      "TotalPrice",
      "totalPrice",
      "ApproximateTotalPrice",
      "approximateTotalPrice",
      "Base",
      "base",
      "value",
      "Value",
      "amount",
      "Amount",
    ]) ?? priceSource
  );

  const currencyCandidate =
    getValueByKeys(priceSource, ["CurrencyCode", "currencyCode", "currency"]) ||
    getValueByKeys(priceSource?.CurrencyCode || priceSource?.currencyCode || {}, [
      "value",
      "Value",
      "code",
      "Code",
    ]);
  const currencyCode = normalizeIdentifier(currencyCandidate).toUpperCase();

  return {
    amount,
    currencyCode: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "",
  };
};

const resolveAncillaryCategory = ({ name = "", classification = "", details = "" }) => {
  const corpus = `${name} ${classification} ${details}`.toLowerCase();
  if (/(bag|baggage|carry|checked|luggage|allowance)/.test(corpus)) {
    return "Extra Bag";
  }
  if (
    /(meal|food|vegan|vegetarian|kosher|muslim|baby|child|diabetic|fruit|seafood|lacto|jain|hindu|snack|drink|beverage)/.test(
      corpus
    )
  ) {
    return "Meal";
  }
  if (/(seat|legroom|aisle|window|exit row|preferred)/.test(corpus)) {
    return "Seat Purchase";
  }
  return "Other Addons";
};

const normalizePaxTypeCode = (value) => {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "ADT";
  if (["CHD", "CHILD", "CNN"].includes(code)) return "CHD";
  if (["INF", "INFANT"].includes(code)) return "INF";
  return "";
};

const getPaxTypeLabel = (value) => {
  const normalized = normalizePaxTypeCode(value);
  if (normalized === "ADT") return "Adult (ADT)";
  if (normalized === "CHD") return "Child (CHD)";
  if (normalized === "INF") return "Infant (INF)";
  return "Passenger";
};

const parseTravelerReferenceRows = (value) => {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];
  const parsed = [];
  const dedupe = new Set();

  rows.forEach((row, index) => {
    const item = row && typeof row === "object" ? row : {};
    const travelerIdentifier = normalizeIdentifier(
      row && typeof row !== "object"
        ? row
        : getValueByKeys(item, [
          "id",
          "ID",
          "Identifier",
          "identifier",
          "TravelerIdentifier",
          "travelerIdentifier",
          "TravelerIdentifierRef",
          "travelerIdentifierRef",
          "TravelerRef",
          "travelerRef",
        ])
    );
    const passengerTypeCode = normalizePaxTypeCode(
      getValueByKeys(item, [
        "passengerTypeCode",
        "PassengerTypeCode",
        "paxType",
        "PaxType",
        "travelerTypeCode",
        "TravelerTypeCode",
        "travelerType",
        "TravelerType",
      ])
    );
    const travelerNumberRaw = Number(
      getValueByKeys(item, [
        "travelerNumber",
        "TravelerNumber",
        "passengerNumber",
        "PassengerNumber",
        "travelerSequence",
        "TravelerSequence",
      ])
    );
    const travelerNumber =
      Number.isFinite(travelerNumberRaw) && travelerNumberRaw > 0
        ? Math.trunc(travelerNumberRaw)
        : undefined;

    if (!travelerIdentifier && !passengerTypeCode) return;
    const key = `${travelerIdentifier || "idx"}::${passengerTypeCode || "UNK"}::${
      travelerNumber ?? index + 1
    }`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    parsed.push({
      travelerIdentifier,
      passengerTypeCode: passengerTypeCode || "ADT",
      ...(travelerNumber ? { travelerNumber } : {}),
    });
  });

  return parsed;
};

const ANCILLARY_WRAPPER_TYPES = new Set([
  "catalogofferingsancillarylistresponse",
  "catalogofferingsresponse",
  "catalogofferingsid",
  "catalogofferingsancillary",
  "catalogofferings",
  "result",
  "error",
  "errordetail",
  "warning",
  "referencelist",
  "referencelistproduct",
  "referencelistbrand",
  "referencelistancillary",
  "referencelistflight",
  "identifier",
  "currencycode",
  "pricedetail",
]);

const extractAncillaryItems = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  const root =
    payload?.CatalogOfferingsAncillaryListResponse &&
      typeof payload.CatalogOfferingsAncillaryListResponse === "object"
      ? payload.CatalogOfferingsAncillaryListResponse
      : payload;
  const rootCatalogOfferingsIdentifier = normalizeIdentifier(
    getValueByKeys(root, [
      "CatalogOfferingsIdentifier",
      "catalogOfferingsIdentifier",
      "Identifier",
      "identifier",
    ])
  );

  // Build ReferenceList lookup maps for Product / Ancillary / Brand refs
  const refProductMap = new Map();
  const refAncillaryMap = new Map();
  const referenceLists = getArrayByKeys(root, ["ReferenceList", "referenceList"]);
  referenceLists.forEach((refList) => {
    getArrayByKeys(refList, ["Product", "product"]).forEach((prod) => {
      const id = normalizeIdentifier(getValueByKeys(prod, ["id", "ID", "Identifier", "identifier"]));
      if (id) refProductMap.set(id, prod);
    });
    getArrayByKeys(refList, ["Ancillary", "ancillary"]).forEach((anc) => {
      const id = normalizeIdentifier(getValueByKeys(anc, ["id", "ID", "Identifier", "identifier"]));
      if (id) refAncillaryMap.set(id, anc);
    });
  });

  const items = [];
  const dedupe = new Set();

  const pushItem = ({
    name,
    classification,
    details,
    amount,
    currencyCode,
    category,
    offerListIdentifier = "",
    offerIdentifier = "",
    productIdentifier = "",
    travelerReferences = [],
  }) => {
    const cleanName = String(name || "").trim();
    const cleanClass = String(classification || "").trim();
    // Never emit response wrapper types as fake ancillary items
    if (
      ANCILLARY_WRAPPER_TYPES.has(cleanName.toLowerCase()) ||
      (ANCILLARY_WRAPPER_TYPES.has(cleanClass.toLowerCase()) && !cleanName)
    ) {
      return;
    }
    if (!cleanName && !cleanClass && amount === null) return;
    const normalizedName = cleanName || cleanClass || "Ancillary";
    if (ANCILLARY_WRAPPER_TYPES.has(normalizedName.toLowerCase())) return;
    const normalizedCategory = category || "Other Addons";
    const normalizedTravelerReferences = Array.isArray(travelerReferences)
      ? travelerReferences
          .filter((row) => row && typeof row === "object")
          .map((row) => ({
            travelerIdentifier: normalizeIdentifier(row.travelerIdentifier),
            passengerTypeCode: normalizePaxTypeCode(row.passengerTypeCode) || "ADT",
            ...(Number.isFinite(Number(row.travelerNumber)) && Number(row.travelerNumber) > 0
              ? { travelerNumber: Math.trunc(Number(row.travelerNumber)) }
              : {}),
          }))
      : [];
    const travelerRefKey = normalizedTravelerReferences
      .map(
        (ref) =>
          `${ref.travelerIdentifier || "any"}:${ref.passengerTypeCode}:${
            ref.travelerNumber || 0
          }`
      )
      .sort()
      .join("|");
    const key = [
      offerListIdentifier,
      offerIdentifier,
      productIdentifier,
      travelerRefKey,
      normalizedCategory.toLowerCase(),
      normalizedName.toLowerCase(),
      String(amount ?? ""),
      String(currencyCode || ""),
    ].join("::");
    if (dedupe.has(key)) return;
    dedupe.add(key);

    const passengerTypeCodes = Array.from(
      new Set(
        normalizedTravelerReferences
          .map((reference) => normalizePaxTypeCode(reference.passengerTypeCode))
          .filter(Boolean)
      )
    );

    items.push({
      category: normalizedCategory,
      name: normalizedName,
      classification: cleanClass && !ANCILLARY_WRAPPER_TYPES.has(cleanClass.toLowerCase()) ? cleanClass : "Ancillary",
      details: details || "",
      amount,
      currencyCode: currencyCode || "",
      offerListIdentifier,
      offerIdentifier,
      productIdentifier,
      travelerReferences: normalizedTravelerReferences,
      passengerTypeCodes: passengerTypeCodes.length ? passengerTypeCodes : ["ADT"],
      isSelectable: Boolean(offerListIdentifier && offerIdentifier && productIdentifier),
    });
  };

  const processNodeAsItem = (rawNode, context = {}) => {
    if (!rawNode || typeof rawNode !== "object") return;
    const nodeType = toTextValue(getValueByKeys(rawNode, ["@type", "type"])).toLowerCase();
    if (ANCILLARY_WRAPPER_TYPES.has(nodeType)) return;

    const productRef = normalizeIdentifier(
      getValueByKeys(rawNode, ["productRef", "ProductRef"])
    );
    const node = (productRef && refProductMap.get(productRef))
      ? { ...refProductMap.get(productRef), ...rawNode }
      : rawNode;

    const rawAncillary = getValueByKeys(node, ["Ancillary", "ancillary"]);
    const ancRef = normalizeIdentifier(getValueByKeys(node, ["ancillaryRef", "AncillaryRef"]));
    const ancillaryNode =
      rawAncillary && typeof rawAncillary === "object"
        ? rawAncillary
        : ancRef && refAncillaryMap.get(ancRef)
          ? refAncillaryMap.get(ancRef)
          : null;

    const name =
      toTextValue(
        getValueByKeys(ancillaryNode || {}, [
          "Description",
          "description",
          "Name",
          "name",
          "CommercialName",
          "commercialName",
        ])
      ) ||
      toTextValue(
        getValueByKeys(node, [
          "Name",
          "name",
          "CommercialName",
          "commercialName",
          "Description",
          "description",
          "Text",
          "text",
          "Label",
          "label",
          "SSRCode",
          "ssrCode",
          "SubCode",
          "subCode",
        ])
      ) ||
      toTextValue(getValueByKeys(node?.Brand || {}, ["Name", "name"]));

    const classification = toTextValue(
      getValueByKeys(ancillaryNode || {}, ["classification", "Classification", "type", "@type"]) ||
      getValueByKeys(node, [
        "classification",
        "Classification",
        "AncillaryType",
        "ancillaryType",
        "ProductType",
        "productType",
        "GroupCode",
        "groupCode",
        "@type",
        "type",
      ])
    );

    const inclusion = toTextValue(getValueByKeys(node, ["Inclusion", "inclusion"]));
    const identifier = normalizeIdentifier(
      getValueByKeys(node, ["id", "ID", "productRef", "ProductIdentifier", "productIdentifier"])
    );
    const ancillaryDescription = toTextValue(
      getValueByKeys(ancillaryNode || {}, ["Description", "description", "value"])
    );
    const details = [
      ancillaryDescription && ancillaryDescription !== name ? ancillaryDescription : "",
      inclusion,
      identifier ? `Code: ${identifier}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    const nodePrice = resolvePriceFromNode(node);
    const amount =
      nodePrice.amount !== null
        ? nodePrice.amount
        : context.amount !== undefined && context.amount !== null
          ? context.amount
          : null;
    const currencyCode = nodePrice.currencyCode || context.currencyCode || "";
    const category = resolveAncillaryCategory({
      name,
      classification,
      details,
    });
    const productIdentifier =
      normalizeIdentifier(
        getValueByKeys(node, [
          "id",
          "ID",
          "productRef",
          "ProductIdentifier",
          "productIdentifier",
          "Identifier",
          "identifier",
        ])
      ) || normalizeIdentifier(context.productIdentifier);
    const offerIdentifier = normalizeIdentifier(context.offerIdentifier);
    const offerListIdentifier =
      normalizeIdentifier(context.offerListIdentifier) || rootCatalogOfferingsIdentifier;
    const contextualTravelerReferences = Array.isArray(context.travelerReferences)
      ? context.travelerReferences
      : [];
    const travelerReferences = [
      ...contextualTravelerReferences,
      ...parseTravelerReferenceRows(
        getValueByKeys(node, [
          "TravelerIdentifierRef",
          "travelerIdentifierRef",
          "TravelerRef",
          "travelerRef",
        ])
      ),
      ...parseTravelerReferenceRows(
        getValueByKeys(ancillaryNode || {}, [
          "TravelerIdentifierRef",
          "travelerIdentifierRef",
          "TravelerRef",
          "travelerRef",
        ])
      ),
    ];

    pushItem({
      name,
      classification,
      details,
      amount,
      currencyCode,
      category,
      offerListIdentifier,
      offerIdentifier,
      productIdentifier,
      travelerReferences,
    });
  };

  const catalogOfferingGroups = [
    ...getArrayByKeys(root, ["CatalogOfferingsID", "catalogOfferingsID"]),
    ...getArrayByKeys(root, ["CatalogOfferingsAncillary", "catalogOfferingsAncillary"]),
    ...getArrayByKeys(root, ["CatalogOfferings", "catalogOfferings"]),
  ];

  catalogOfferingGroups.forEach((groupNode) => {
    const groupOfferListIdentifier =
      normalizeIdentifier(
        getValueByKeys(groupNode, [
          "offerListIdentifier",
          "OfferListIdentifier",
          "CatalogOfferingsIdentifier",
          "catalogOfferingsIdentifier",
          "Identifier",
          "identifier",
        ])
      ) || rootCatalogOfferingsIdentifier;
    const groupTravelerReferences = parseTravelerReferenceRows(
      getValueByKeys(groupNode, [
        "TravelerIdentifierRef",
        "travelerIdentifierRef",
        "TravelerRef",
        "travelerRef",
      ])
    );
    const offerings = getArrayByKeys(groupNode, [
      "CatalogOffering",
      "catalogOffering",
      "AncillaryOffering",
      "ancillaryOffering",
    ]);
    offerings.forEach((offeringNode) => {
      const offeringPrice = resolvePriceFromNode(offeringNode);
      const offerIdentifier = normalizeIdentifier(
        getValueByKeys(offeringNode, [
          "id",
          "ID",
          "CatalogOfferingIdentifier",
          "catalogOfferingIdentifier",
          "Identifier",
          "identifier",
        ])
      );
      const offeringTravelerReferences = parseTravelerReferenceRows(
        getValueByKeys(offeringNode, [
          "TravelerIdentifierRef",
          "travelerIdentifierRef",
          "TravelerRef",
          "travelerRef",
        ])
      );
      const travelerReferences =
        offeringTravelerReferences.length > 0
          ? offeringTravelerReferences
          : groupTravelerReferences;
      const productOptions = getArrayByKeys(offeringNode, [
        "ProductOptions",
        "productOptions",
        "ProductOption",
        "productOption",
      ]);
      productOptions.forEach((optionNode) => {
        const products = getArrayByKeys(optionNode, [
          "Product",
          "product",
          "Products",
          "products",
        ]);
        products.forEach((productNode) =>
          processNodeAsItem(productNode, {
            amount: offeringPrice.amount,
            currencyCode: offeringPrice.currencyCode,
            offerListIdentifier: groupOfferListIdentifier,
            offerIdentifier,
            travelerReferences,
          })
        );
      });

      const directProducts = getArrayByKeys(offeringNode, [
        "Product",
        "product",
        "Products",
        "products",
      ]);
      directProducts.forEach((productNode) =>
        processNodeAsItem(productNode, {
          amount: offeringPrice.amount,
          currencyCode: offeringPrice.currencyCode,
          offerListIdentifier: groupOfferListIdentifier,
          offerIdentifier,
          travelerReferences,
        })
      );

      // If an offering carries Ancillary/Price directly with no nested Product array
      if (productOptions.length === 0 && directProducts.length === 0) {
        processNodeAsItem(offeringNode, {
          amount: offeringPrice.amount,
          currencyCode: offeringPrice.currencyCode,
          offerListIdentifier: groupOfferListIdentifier,
          offerIdentifier,
          travelerReferences,
        });
      }
    });
  });

  if (items.length) {
    return items;
  }

  // Safe fallback walk: strictly require an actual price OR Ancillary/SSR/SubCode field and NEVER match response wrappers
  const walk = (node, depth = 0) => {
    if (depth > 6 || node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
      return;
    }
    if (typeof node !== "object") return;

    const nodeType = toTextValue(getValueByKeys(node, ["@type", "type"])).toLowerCase();
    const isWrapper = ANCILLARY_WRAPPER_TYPES.has(nodeType);
    const hasRealAncillarySignal =
      !isWrapper &&
      (Boolean(getValueByKeys(node, ["Ancillary", "ancillary", "SSRCode", "ssrCode", "SubCode", "subCode", "CommercialName", "commercialName"])) ||
        resolvePriceFromNode(node).amount !== null);

    if (hasRealAncillarySignal) {
      processNodeAsItem(node);
    }

    Object.entries(node).forEach(([k, childNode]) => {
      if (k === "Result" || k === "Error" || k === "Warning" || k === "ancillaryShopMeta") return;
      walk(childNode, depth + 1);
    });
  };

  walk(root);
  return items;
};

const groupAncillaryItems = (items = []) => {
  const groups = {
    "Extra Bag": [],
    Meal: [],
    "Seat Purchase": [],
    "Other Addons": [],
  };

  items.forEach((item) => {
    const category = groups[item?.category] ? item.category : "Other Addons";
    groups[category].push(item);
  });

  return groups;
};

const buildAncillarySelectionKey = (item) => {
  const offerListIdentifier = normalizeIdentifier(item?.offerListIdentifier);
  const offerIdentifier = normalizeIdentifier(item?.offerIdentifier);
  const productIdentifier = normalizeIdentifier(item?.productIdentifier);
  if (!offerListIdentifier || !offerIdentifier || !productIdentifier) return "";
  return `${offerListIdentifier}::${offerIdentifier}::${productIdentifier}`;
};

const resolveSeatAvailabilityRequestFromOffer = (offer) => {
  const explicitSeatRequest =
    (offer?.seatAvailabilityRequest && typeof offer.seatAvailabilityRequest === "object"
      ? offer.seatAvailabilityRequest
      : null) ||
    (offer?.SeatAvailabilityRequest && typeof offer.SeatAvailabilityRequest === "object"
      ? offer.SeatAvailabilityRequest
      : null);

  const offerListIdentifier = normalizeIdentifier(
    getValueByKeys(explicitSeatRequest || offer, [
      "offerListIdentifier",
      "OfferListIdentifier",
    ])
  );
  const offerIdentifier = normalizeIdentifier(
    getValueByKeys(explicitSeatRequest || offer, [
      "offerIdentifier",
      "OfferIdentifier",
      "Identifier",
      "identifier",
      "ResultId",
    ])
  );
  const productIdentifiers = normalizeIdentifierList(
    getValueByKeys(explicitSeatRequest || offer, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ])
  );

  if (!offerListIdentifier || !offerIdentifier || productIdentifiers.length === 0) {
    return null;
  }

  return {
    offerListIdentifier,
    offerIdentifier,
    productIdentifiers,
  };
};

const resolveAncillaryShopRequestFromOffer = (offer) => {
  const forceGdsOnly =
    String(process.env.NEXT_PUBLIC_TRAVELPORT_GDS_ONLY || "").toLowerCase() ===
    "true";
  const explicitRequest =
    (offer?.ancillaryRequest && typeof offer.ancillaryRequest === "object"
      ? offer.ancillaryRequest
      : null) ||
    (offer?.AncillaryRequest && typeof offer.AncillaryRequest === "object"
      ? offer.AncillaryRequest
      : null) ||
    (offer?.ancillaryShopRequest && typeof offer.ancillaryShopRequest === "object"
      ? offer.ancillaryShopRequest
      : null) ||
    (offer?.AncillaryShopRequest && typeof offer.AncillaryShopRequest === "object"
      ? offer.AncillaryShopRequest
      : null);

  const farePolicyRequest =
    offer?.farePolicyRequest && typeof offer.farePolicyRequest === "object"
      ? offer.farePolicyRequest
      : null;
  const seatAvailabilityRequest =
    offer?.seatAvailabilityRequest && typeof offer.seatAvailabilityRequest === "object"
      ? offer.seatAvailabilityRequest
      : null;
  const sourceUnified =
    offer?.sourceUnified && typeof offer.sourceUnified === "object"
      ? offer.sourceUnified
      : null;
  const sourceUnifiedFarePolicyRequest =
    sourceUnified?.farePolicyRequest && typeof sourceUnified.farePolicyRequest === "object"
      ? sourceUnified.farePolicyRequest
      : null;
  const sourceUnifiedSeatAvailabilityRequest =
    sourceUnified?.seatAvailabilityRequest &&
      typeof sourceUnified.seatAvailabilityRequest === "object"
      ? sourceUnified.seatAvailabilityRequest
      : null;
  const reservationWorkbenchRequest =
    offer?.reservationWorkbenchRequest &&
      typeof offer.reservationWorkbenchRequest === "object"
      ? offer.reservationWorkbenchRequest
      : null;

  const offerListIdentifier = normalizeIdentifier(
    getValueByKeys(explicitRequest || offer, [
      "offerListIdentifier",
      "OfferListIdentifier",
    ]) ||
    getValueByKeys(farePolicyRequest || {}, [
      "offerListIdentifier",
      "OfferListIdentifier",
    ]) ||
    getValueByKeys(seatAvailabilityRequest || {}, [
      "offerListIdentifier",
      "OfferListIdentifier",
    ])
  );

  const offerIdentifier = normalizeIdentifier(
    getValueByKeys(explicitRequest || offer, [
      "offerIdentifier",
      "OfferIdentifier",
      "Identifier",
      "identifier",
      "ResultId",
    ]) ||
    getValueByKeys(farePolicyRequest || {}, ["offerIdentifier", "OfferIdentifier"]) ||
    getValueByKeys(seatAvailabilityRequest || {}, [
      "offerIdentifier",
      "OfferIdentifier",
    ])
  );
  const productIdentifiers = normalizeIdentifierList(
    getValueByKeys(explicitRequest || offer, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ]) ||
    getValueByKeys(seatAvailabilityRequest || {}, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ]) ||
    getValueByKeys(farePolicyRequest || {}, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ]) ||
    getValueByKeys(sourceUnifiedSeatAvailabilityRequest || {}, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ]) ||
    getValueByKeys(sourceUnifiedFarePolicyRequest || {}, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ])
  );
  const reservationId = normalizeIdentifier(
    getValueByKeys(explicitRequest || reservationWorkbenchRequest || offer, [
      "reservationId",
      "ReservationId",
      "reservationIdentifier",
      "ReservationIdentifier",
      "workbenchId",
      "WorkbenchId",
    ])
  );
  const modeText = normalizeIdentifier(
    getValueByKeys(explicitRequest || offer, ["mode", "Mode"])
  ).toLowerCase();
  const explicitMode =
    modeText === "offer"
      ? "offer"
      : modeText === "offerlist" || modeText === "offer_list"
        ? "offerList"
        : modeText === "reservationworkbench" ||
          modeText === "reservation_workbench"
          ? "reservationWorkbench"
          : "";

  const mode =
    explicitMode ||
    (forceGdsOnly
      ? "offerList"
      : reservationId
        ? "reservationWorkbench"
        : productIdentifiers.length > 0
          ? "offer"
          : "offerList");

  if (mode === "reservationWorkbench") {
    if (!reservationId) return null;
    return {
      mode,
      reservationId,
    };
  }

  if (mode === "offer") {
    if ((!offerListIdentifier && !offerIdentifier) || productIdentifiers.length === 0) {
      return null;
    }
    return {
      mode,
      offerListIdentifier,
      offerIdentifier,
      productIdentifiers,
    };
  }

  if (!offerListIdentifier || !offerIdentifier) {
    return null;
  }

  return {
    mode,
    offerListIdentifier,
    offerIdentifier,
  };
};

const BookingDetaills = () => {
  const [airPriceData, setAirPriceData] = useState([]);
  const [selectedBrandKey, setSelectedBrandKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [buildProductsReady, setBuildProductsReady] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [priceAttempt, setPriceAttempt] = useState(0);
  const [seatAvailabilityData, setSeatAvailabilityData] = useState(null);
  const [seatAvailabilityLoading, setSeatAvailabilityLoading] = useState(false);
  const [seatAvailabilityError, setSeatAvailabilityError] = useState("");
  const [seatSelections, setSeatSelections] = useState([]);
  const [ancillaryDialogOpen, setAncillaryDialogOpen] = useState(false);
  const [ancillaryLoading, setAncillaryLoading] = useState(false);
  const [ancillaryError, setAncillaryError] = useState("");
  const [ancillaryData, setAncillaryData] = useState(null);
  const [ancillarySelectionState, setAncillarySelectionState] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktopLayout = useMediaQuery("(min-width:900px)");
  const isPassengerInputPage = location?.pathname === "/bookingdetails";
  const [showFlightInfoSection, setShowFlightInfoSection] = useState(
    location?.pathname !== "/bookingdetails"
  );
  const [isPassengerInfoExpanded, setIsPassengerInfoExpanded] = useState(
    location?.pathname === "/bookingdetails"
  );
  const [selectedOffer, setSelectedOffer] = useState({});
  const token = secureLocalStorage.getItem("access_token");
  const sampleSeatMapMode =
    String(process.env.NEXT_PUBLIC_USE_SAMPLE_SEAT_MAP || "").toLowerCase() ===
    "true";

  useEffect(() => {
    const routeOffer = resolveSelectedOfferFromRouteState(location?.state);
    if (isFlightOfferShape(routeOffer)) {
      setSelectedOffer(routeOffer);
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "flyjatt:selected_offer",
            JSON.stringify({ selectedOffer: routeOffer })
          );
        }
      } catch (storageError) {
        console.warn("Unable to store selected offer for booking page", storageError);
      }
      return;
    }

    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:selected_offer");
        if (raw) {
          const parsed = JSON.parse(raw);
          const cachedOffer = resolveSelectedOfferFromRouteState(parsed);
          if (isFlightOfferShape(cachedOffer)) {
            setSelectedOffer(cachedOffer);
            return;
          }
        }
      }
    } catch (storageError) {
      console.warn("Unable to read cached selected offer for booking page", storageError);
    }

    setSelectedOffer({});
  }, [location?.state]);

  useEffect(() => {
    let cancelled = false;
    const fetchAirPriceData = async () => {
      if (
        !selectedOffer ||
        typeof selectedOffer !== "object" ||
        !Object.keys(selectedOffer).length
      ) {
        setAirPriceData([]);
        setLoading(false);
        setBuildProductsReady(false);
        return;
      }

      const priceBreakDown = Array.isArray(selectedOffer?.PriceBreakDown)
        ? selectedOffer.PriceBreakDown
        : Array.isArray(selectedOffer?.priceBreakDown)
          ? selectedOffer.priceBreakDown
          : [];
      const getPaxCount = (codes = []) =>
        priceBreakDown
          .filter((row) =>
            codes.includes(
              String(row?.PaxType || row?.paxType || "").toUpperCase()
            )
          )
          .reduce(
            (sum, row) => sum + Number(row?.PaxCount || row?.paxCount || 0),
            0
          );

      const adultCount = getPaxCount(["ADT", "ADULT"]) || 1;
      const childCount = getPaxCount(["CHD", "CNN", "CHILD"]);
      const infantCount = getPaxCount(["INF", "INFANT"]);

      try {
        setPriceError("");
        setLoading(true);
        setBuildProductsReady(false);
        const response = await fetchTravelportBuildFromProducts({
          selectedOffer,
          token,
          adultCount,
          childCount,
          infantCount,
        });
        const normalized = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : response
              ? [response]
              : [];

        if (!normalized.length) throw new Error("This fare could not be verified. Please search again.");
        if (!cancelled) setAirPriceData(normalized);
      } catch (error) {
        if (!cancelled) {
          setPriceError(error?.message || "This fare could not be verified. Please try again.");
          setAirPriceData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBuildProductsReady(true);
        }
      }
    };

    fetchAirPriceData();
    return () => { cancelled = true; };
  }, [selectedOffer, token, priceAttempt]);

  const airPriceOptions = useMemo(
    () => (Array.isArray(airPriceData) ? airPriceData.filter(Boolean) : []),
    [airPriceData]
  );
  const optionKeys = useMemo(
    () => airPriceOptions.map((option, index) => getFareOptionKey(option, index)),
    [airPriceOptions]
  );

  useEffect(() => {
    if (!optionKeys.length) {
      setSelectedBrandKey("");
      return;
    }
    if (!selectedBrandKey || !optionKeys.includes(selectedBrandKey)) {
      setSelectedBrandKey(optionKeys[0]);
    }
  }, [optionKeys, selectedBrandKey]);

  const selectedAirPrice = useMemo(() => {
    if (!airPriceOptions.length) return null;
    const selectedIndex = optionKeys.indexOf(selectedBrandKey);
    if (selectedIndex >= 0) return airPriceOptions[selectedIndex];
    return airPriceOptions[0];
  }, [airPriceOptions, optionKeys, selectedBrandKey]);

  const postBuildOfferForAncillaries = useMemo(
    () => (buildProductsReady ? selectedAirPrice || airPriceOptions[0] || null : null),
    [airPriceOptions, buildProductsReady, selectedAirPrice]
  );
  const activeBookingData = postBuildOfferForAncillaries || selectedOffer;
  const ancillaryShopRequest = useMemo(
    () => resolveAncillaryShopRequestFromOffer(activeBookingData || {}),
    [activeBookingData]
  );
  const ancillaryItems = useMemo(
    () => extractAncillaryItems(ancillaryData),
    [ancillaryData]
  );
  const groupedAncillaryItems = useMemo(
    () => groupAncillaryItems(ancillaryItems),
    [ancillaryItems]
  );
  const selectedAncillarySelections = useMemo(() => {
    const selectedRows = [];
    ancillaryItems.forEach((item) => {
      if (!item?.isSelectable) return;
      const key = buildAncillarySelectionKey(item);
      if (!key) return;
      const rowSelection = ancillarySelectionState?.[key];
      if (!rowSelection?.selected) return;

      const passengerTypeCodes = Array.isArray(item?.passengerTypeCodes)
        ? item.passengerTypeCodes.map((code) => normalizePaxTypeCode(code)).filter(Boolean)
        : [];
      const selectedType =
        normalizePaxTypeCode(rowSelection?.passengerTypeCode) ||
        passengerTypeCodes[0] ||
        "ADT";
      const travelerReferences = Array.isArray(item?.travelerReferences)
        ? item.travelerReferences
        : [];
      const matchedTravelerReference =
        travelerReferences.find(
          (reference) =>
            normalizePaxTypeCode(reference?.passengerTypeCode) === selectedType
        ) || travelerReferences[0];

      selectedRows.push({
        offerListIdentifier: normalizeIdentifier(item?.offerListIdentifier),
        offerIdentifier: normalizeIdentifier(item?.offerIdentifier),
        productIdentifier: normalizeIdentifier(item?.productIdentifier),
        travelerTypeCode: selectedType,
        ...(normalizeIdentifier(matchedTravelerReference?.travelerIdentifier)
          ? {
              travelerIdentifier: normalizeIdentifier(
                matchedTravelerReference?.travelerIdentifier
              ),
            }
          : {}),
        ...(Number.isFinite(Number(matchedTravelerReference?.travelerNumber)) &&
        Number(matchedTravelerReference?.travelerNumber) > 0
          ? { travelerNumber: Math.trunc(Number(matchedTravelerReference?.travelerNumber)) }
          : {}),
      });
    });
    return selectedRows.filter(
      (row) => row.offerListIdentifier && row.offerIdentifier && row.productIdentifier
    );
  }, [ancillaryItems, ancillarySelectionState]);

  const seatAvailabilityRequest = useMemo(
    () => resolveSeatAvailabilityRequestFromOffer(postBuildOfferForAncillaries || {}),
    [postBuildOfferForAncillaries]
  );
  const isSelectedFareBookable = useMemo(() => {
    if (priceError || loading) return false;
    if (!selectedAirPrice || typeof selectedAirPrice !== "object") return true;
    const isBookableRaw = selectedAirPrice?.IsBookable ?? selectedAirPrice?.isBookable;
    if (typeof isBookableRaw === "boolean") return isBookableRaw;
    const repricedStatus = String(selectedAirPrice?.RePriceStatus || "").trim().toLowerCase();
    if (
      ["classunavailable", "unavailable", "notavailable", "failed", "error"].includes(
        repricedStatus
      )
    ) {
      return false;
    }
    return true;
  }, [selectedAirPrice, priceError, loading]);

  useEffect(() => {
    setSeatSelections([]);
  }, [
    selectedBrandKey,
    seatAvailabilityRequest?.offerListIdentifier,
    seatAvailabilityRequest?.offerIdentifier,
  ]);

  useEffect(() => {
    setAncillarySelectionState({});
    setAncillaryData(null);
    setAncillaryError("");
  }, [
    selectedBrandKey,
    ancillaryShopRequest?.offerListIdentifier,
    ancillaryShopRequest?.offerIdentifier,
    ancillaryShopRequest?.reservationId,
  ]);

  useEffect(() => {
    setAncillarySelectionState((prevState) => {
      const validKeys = new Set(
        ancillaryItems
          .map((item) => buildAncillarySelectionKey(item))
          .filter(Boolean)
      );
      if (!validKeys.size) {
        return Object.keys(prevState || {}).length ? {} : prevState;
      }

      let hasChange = false;
      const nextState = {};
      ancillaryItems.forEach((item) => {
        const key = buildAncillarySelectionKey(item);
        if (!key || !item?.isSelectable || !validKeys.has(key)) return;

        const passengerTypeCodes = Array.isArray(item?.passengerTypeCodes)
          ? item.passengerTypeCodes.map((code) => normalizePaxTypeCode(code)).filter(Boolean)
          : [];
        const fallbackType = passengerTypeCodes[0] || "ADT";
        const previous = prevState?.[key];
        const previousType = normalizePaxTypeCode(previous?.passengerTypeCode);
        const resolvedType = passengerTypeCodes.includes(previousType)
          ? previousType
          : fallbackType;

        const nextValue = {
          selected: Boolean(previous?.selected),
          passengerTypeCode: resolvedType,
        };
        nextState[key] = nextValue;
        if (
          !previous ||
          previous.selected !== nextValue.selected ||
          previous.passengerTypeCode !== nextValue.passengerTypeCode
        ) {
          hasChange = true;
        }
      });

      const previousKeys = Object.keys(prevState || {});
      if (previousKeys.length !== Object.keys(nextState).length) {
        hasChange = true;
      }

      return hasChange ? nextState : prevState;
    });
  }, [ancillaryItems]);

  useEffect(() => {
    if (!loading && selectedAirPrice?.RePriceStatus === "PriceChanged") {
      const currency = getFlightCurrencyCode(selectedAirPrice);
      const symbol = getCurrencySymbol(currency);
      const netFare = Number(
        selectedAirPrice?.NetFare ?? selectedAirPrice?.netFare ?? 0
      );
      Swal.fire({
        icon: "info",
        title: "Fare Revalidated",
        html: `Selected option is available with updated fare.<br/>New Fare: <b>${currency} ${symbol}${commaNumber(
          netFare
        )}</b>`,
        confirmButtonText: "Continue",
      });
    }
  }, [loading, selectedAirPrice]);

  useEffect(() => {
    if (loading || priceError || isSelectedFareBookable || !airPriceOptions.length) return;
    Swal.fire({
      icon: "warning",
      title: "Class/Fare Not Available",
      text: "Selected fare class is not available anymore. Please choose another brand/fare option.",
    });
  }, [loading, priceError, isSelectedFareBookable, airPriceOptions.length]);

  useEffect(() => {
    let isCancelled = false;

    const fetchSeatAvailability = async () => {
      if (!buildProductsReady) {
        setSeatAvailabilityData(null);
        setSeatAvailabilityError("");
        setSeatAvailabilityLoading(false);
        return;
      }

      if (!seatAvailabilityRequest && !sampleSeatMapMode) {
        setSeatAvailabilityData(null);
        setSeatAvailabilityError("");
        setSeatAvailabilityLoading(false);
        return;
      }

      setSeatAvailabilityLoading(true);
      setSeatAvailabilityError("");

      try {
        const response = await fetchTravelportSeatAvailability({
          seatAvailabilityRequest,
          token,
          useSampleData: sampleSeatMapMode,
        });
        if (isCancelled) return;
        setSeatAvailabilityData(response || null);
      } catch (error) {
        if (isCancelled) return;
        setSeatAvailabilityData(null);
        setSeatAvailabilityError(
          error instanceof Error
            ? error.message
            : "Seat map is not available for this option."
        );
      } finally {
        if (!isCancelled) {
          setSeatAvailabilityLoading(false);
        }
      }
    };

    fetchSeatAvailability();

    return () => {
      isCancelled = true;
    };
  }, [buildProductsReady, sampleSeatMapMode, seatAvailabilityRequest, token]);

  useEffect(() => {
    setShowFlightInfoSection(!isPassengerInputPage);
    setIsPassengerInfoExpanded(isPassengerInputPage);
  }, [isPassengerInputPage]);

  const handleAddTravellerClick = () => {
    setShowFlightInfoSection(false);
    setIsPassengerInfoExpanded(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const section = document.getElementById("passenger-information-section");
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleViewFlightDetailsClick = () => {
    setShowFlightInfoSection(true);
    setIsPassengerInfoExpanded(false);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const section = document.getElementById("flight-information-section");
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleAncillarySelectionToggle = (item, checked) => {
    const key = buildAncillarySelectionKey(item);
    if (!key) return;
    const fallbackType =
      (Array.isArray(item?.passengerTypeCodes)
        ? item.passengerTypeCodes.map((code) => normalizePaxTypeCode(code)).find(Boolean)
        : "") || "ADT";
    setAncillarySelectionState((prevState) => ({
      ...prevState,
      [key]: {
        selected: Boolean(checked),
        passengerTypeCode:
          normalizePaxTypeCode(prevState?.[key]?.passengerTypeCode) || fallbackType,
      },
    }));
  };

  const handleAncillaryPassengerTypeChange = (item, passengerTypeCode) => {
    const key = buildAncillarySelectionKey(item);
    if (!key) return;
    const normalizedType = normalizePaxTypeCode(passengerTypeCode) || "ADT";
    setAncillarySelectionState((prevState) => ({
      ...prevState,
      [key]: {
        selected: Boolean(prevState?.[key]?.selected),
        passengerTypeCode: normalizedType,
      },
    }));
  };

  const handleContinueWithAddonClick = async () => {
    setAncillaryDialogOpen(true);
    setAncillaryLoading(true);
    setAncillaryError("");
    setAncillaryData(null);

    try {
      if (!ancillaryShopRequest) {
        throw new Error(
          "Ancillary identifiers are not available for this selection. Please select another fare option."
        );
      }

      const response = await fetchTravelportAncillaryShop({
        ancillaryRequest: ancillaryShopRequest,
        token,
      });
      setAncillaryData(response || null);
    } catch (error) {
      setAncillaryData(null);
      setAncillaryError(
        error instanceof Error
          ? error.message
          : "Unable to load add-on / ancillary options."
      );
    } finally {
      setAncillaryLoading(false);
    }
  };

  const hasSelectedOffer = isFlightOfferShape(selectedOffer);

  const sidebarContent = (
    <Grid container>
      <Grid item xs={12} sm={12} md={12} lg={12}>
        <BrandSelector
          loading={loading}
          options={airPriceOptions}
          selectedKey={selectedBrandKey}
          onSelect={setSelectedBrandKey}
        />
      </Grid>
      <Grid item xs={12} sm={12} md={12} lg={12}>
        <FareBreakdown
          loading={loading}
          data={selectedOffer}
          airPriceData={airPriceData}
          selectedAirPrice={selectedAirPrice}
        />
      </Grid>
      <Grid item xs={12} sm={12} md={12} lg={12} mt={2}>
        <RightSidebarInfo
          data={activeBookingData}
          seatAvailabilityData={seatAvailabilityData}
          seatAvailabilityLoading={seatAvailabilityLoading}
          seatAvailabilityError={seatAvailabilityError}
          seatAvailabilityRequest={seatAvailabilityRequest}
          enablePostBuildFetch={buildProductsReady}
          seatSelections={seatSelections}
          onSeatSelectionsChange={setSeatSelections}
        />
      </Grid>
      <Grid item xs={12} sm={12} md={12} lg={12} mt={2}>
        <Support />
      </Grid>
    </Grid>
  );

  if (!loading && !hasSelectedOffer) {
    return (
      <Box className="travelport-page" sx={{ backgroundColor: "#EBF0F4", minHeight: "100vh" }}>
        <NavBar />
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Box
            sx={{
              bgcolor: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid #D7E6F5",
              p: { xs: 3, md: 5 },
              textAlign: "center",
              boxShadow: "0 12px 28px rgba(8, 49, 85, 0.08)",
            }}
          >
            <Typography
              component="h1"
              sx={{ fontSize: { xs: "20px", md: "24px" }, fontWeight: 800, color: "#13406B" }}
            >
              No Flight Offer Selected
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "14px", color: "#526B86", maxWidth: 460, mx: "auto" }}>
              Please select a flight from search results to review fare rules, baggage, seat map, and continue booking.
            </Typography>
            <Button
              type="button"
              variant="contained"
              onClick={() => navigate("/")}
              sx={{
                mt: 3,
                px: 3,
                py: 1.1,
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 800,
                bgcolor: "var(--primary-button)",
                "&:hover": { bgcolor: "var(--primary-button)" },
              }}
            >
              Search Flights
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box className="travelport-page" sx={{ backgroundColor: "#EBF0F4", minHeight: "100vh" }}>
      <NavBar />
      <Container maxWidth="xl">
        {priceError && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }} action={<Button color="inherit" onClick={() => setPriceAttempt((value) => value + 1)}>Try again</Button>}>{priceError} Your booking has not been submitted.</Alert>}
        <Grid container sx={{ pt: "50px" }} spacing={2}>
          {!isDesktopLayout && (
            <Grid item xs={12} md={3}>
              {sidebarContent}
            </Grid>
          )}
          <Grid item xs={12} sm={12} md={9} lg={9}>
            <Grid container>
              {!isPassengerInputPage && (
                <Grid item xs={12} sm={12} md={12} lg={12} id="flight-information-section">
                  <Box
                    sx={{
                      bgcolor: "#C1DAFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      px: "15px",
                      py: "5px",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#13406B",
                        fontSize: { xs: "14px", md: "15px" },
                        fontWeight: 700,
                        letterSpacing: 0.2,
                      }}
                    >
                      Flight Information
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
                      {isPassengerInfoExpanded && (
                        <Button
                          variant="outlined"
                          onClick={handleViewFlightDetailsClick}
                          sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "9px",
                            px: "14px",
                            py: "4px",
                            minHeight: "30px",
                            borderColor: "var(--primary-button)",
                            color: "var(--primary-button)",
                            backgroundColor: "#FFFFFF",
                            ":hover": {
                              borderColor: "var(--primary-button)",
                              backgroundColor: "rgba(0,154,214,0.08)",
                            },
                          }}
                        >
                          View Flight Details
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Collapse in={showFlightInfoSection} timeout={220} unmountOnExit>
                    <Box sx={{ pt: "20px", bgcolor: "white", px: "10px", mb: 2 }}>
                      <FlightDetails
                        data={activeBookingData}
                        compactLayout
                        amenityIconsOnly
                      />
                    </Box>
                  </Collapse>
                </Grid>
              )}
              {!isPassengerInputPage && !isPassengerInfoExpanded && (
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  <Box
                    sx={{
                      mt: "20px",
                      py: 2,
                      bgcolor: "white",
                      px: { xs: 1, md: 2 },
                      mb: 2,
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "flex-end",
                      flexDirection: "column",
                      gap: 1.1,
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={handleContinueWithAddonClick}
                      disabled={
                        loading ||
                        ancillaryLoading ||
                        !buildProductsReady ||
                        !isSelectedFareBookable
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: "10px",
                        px: "16px",
                        py: "8px",
                        borderColor: "var(--primary-button)",
                        color: "var(--primary-button)",
                        backgroundColor: "#FFFFFF",
                        ":hover": {
                          borderColor: "var(--primary-button)",
                          backgroundColor: "rgba(0,154,214,0.08)",
                        },
                        ":disabled": {
                          borderColor: "#B8D2EA",
                          color: "#8AA6C2",
                        },
                      }}
                    >
                      {ancillaryLoading
                        ? "Loading Addon / Ancillaries..."
                        : "Continue with Addon / Ancillaries"}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleAddTravellerClick}
                      disabled={!isSelectedFareBookable}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: "10px",
                        px: "18px",
                        py: "8px",
                        bgcolor: "var(--primary-button)",
                        ":hover": {
                          bgcolor: "var(--primary-button)",
                        },
                        ":disabled": {
                          bgcolor: "#9CB5C7",
                          color: "#F4F7FA",
                        },
                      }}
                    >
                      Add Traveller to Continue Booking
                    </Button>
                    {!isSelectedFareBookable ? (
                      <Typography sx={{ fontSize: 12, color: "#B42318", mt: 0.5 }}>
                        Selected class is unavailable after revalidation. Choose another fare.
                      </Typography>
                    ) : null}
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} sm={12} md={12} lg={12} id="passenger-information-section">
                <Collapse
                  in={isPassengerInputPage || isPassengerInfoExpanded}
                  timeout={220}
                  unmountOnExit={!isPassengerInputPage}
                >
                  <Box
                    sx={{
                      mt: "16px",
                      background:
                        "linear-gradient(90deg, #EAF3FF 0%, #F4F9FF 100%)",
                      border: "1px solid #D8E7FA",
                      borderRadius: "10px 10px 0 0",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#13406B",
                        fontSize: { xs: "14px", md: "15px" },
                        fontWeight: 700,
                        px: "14px",
                        py: "7px",
                        letterSpacing: 0.2,
                      }}
                    >
                      {isPassengerInputPage
                        ? "Booking Details - Passenger Information"
                        : "Passenger Information"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      py: 1.5,
                      bgcolor: "white",
                      px: { xs: 1, md: 1.8 },
                      mb: 2,
                      border: "1px solid #E3EBF7",
                      borderTop: "none",
                      borderRadius: "0 0 10px 10px",
                    }}
                  >
                    {loading ? (
                      <Loading />
                    ) : (
                      <FlightForm
                        data={activeBookingData}
                        disabledReason={priceError}
                        airPriceData={airPriceData}
                        selectedAirPrice={selectedAirPrice}
                        seatSelections={seatSelections}
                        ancillarySelections={selectedAncillarySelections}
                      />
                    )}
                    {/* <PassengerInfo data={selectedOffer} airPriceData={airPriceData} /> */}
                  </Box>
                </Collapse>
              </Grid>
            </Grid>
          </Grid>
          {isDesktopLayout && (
            <Grid item xs={12} md={3}>
              {sidebarContent}
            </Grid>
          )}
        </Grid>
      </Container>
      <Dialog
        open={ancillaryDialogOpen}
        onClose={() => setAncillaryDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontWeight: 800,
            color: "#12385F",
          }}
        >
          Addon / Ancillary Options
          {ancillaryShopRequest ? (
            <Typography
              sx={{
                mt: 0.5,
                fontSize: "12px",
                color: "#4D6D8E",
                fontWeight: 500,
              }}
            >
              {ancillaryShopRequest.mode === "reservationWorkbench"
                ? `Mode: Reservation Workbench | Reservation: ${ancillaryShopRequest.reservationId || "N/A"
                }`
                : `Mode: ${ancillaryShopRequest.mode === "offer" ? "Offer" : "Offer List"
                } | Offer List: ${ancillaryShopRequest.offerListIdentifier || "N/A"
                } | Offer ID: ${ancillaryShopRequest.offerIdentifier || "N/A"}${Array.isArray(ancillaryShopRequest.productIdentifiers) &&
                  ancillaryShopRequest.productIdentifiers.length
                  ? ` | Products: ${ancillaryShopRequest.productIdentifiers.length}`
                  : ""
                }`}
            </Typography>
          ) : null}
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: "#F7FAFE" }}>
          {ancillaryLoading ? (
            <Typography
              sx={{
                color: "#2B4D6F",
                fontSize: "14px",
                fontWeight: 600,
                py: 2,
              }}
            >
              Loading available extra bag, meal and seat purchase options...
            </Typography>
          ) : null}

          {!ancillaryLoading && ancillaryError ? (
            <Typography
              sx={{
                color: "#A11F32",
                fontSize: "14px",
                fontWeight: 600,
                py: 1,
              }}
            >
              {ancillaryError}
            </Typography>
          ) : null}

          {!ancillaryLoading && !ancillaryError && ancillaryItems.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: "10px" }}>
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#0b4a82" }}>
                No purchasable add-ons / ancillaries are offered for this fare.
              </Typography>
              {ancillaryData?.ancillaryNotice ? (
                <Typography sx={{ fontSize: "12.5px", color: "#475569", mt: 0.4 }}>
                  Airline / GDS note: {ancillaryData.ancillaryNotice}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "12.5px", color: "#475569", mt: 0.4 }}>
                  You can continue directly to traveler details and booking confirmation.
                </Typography>
              )}
            </Alert>
          ) : null}

          {!ancillaryLoading && !ancillaryError && ancillaryItems.length > 0 ? (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#1F507C" }}>
                Selected add-ons: {selectedAncillarySelections.length}
              </Typography>
              {Object.entries(groupedAncillaryItems).map(([category, rows]) =>
                rows.length ? (
                  <Box key={category}>
                    <Typography
                      sx={{
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "#113A63",
                        mb: 1,
                      }}
                    >
                      {category} ({rows.length})
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: 1.2,
                      }}
                    >
                      {rows.map((item, index) => {
                        const selectionKey = buildAncillarySelectionKey(item);
                        const rowSelection = selectionKey
                          ? ancillarySelectionState?.[selectionKey]
                          : null;
                        const isChecked = Boolean(rowSelection?.selected);
                        const passengerTypeCodes = Array.isArray(item?.passengerTypeCodes)
                          ? item.passengerTypeCodes
                              .map((code) => normalizePaxTypeCode(code))
                              .filter(Boolean)
                          : [];
                        const fallbackPassengerType = passengerTypeCodes[0] || "ADT";
                        const selectedPassengerType =
                          normalizePaxTypeCode(rowSelection?.passengerTypeCode) ||
                          fallbackPassengerType;

                        return (
                          <Box
                            key={`${category}-${item?.name || "item"}-${index}`}
                            sx={{
                              border: "1px solid #D6E6F6",
                              borderRadius: "10px",
                              p: 1.2,
                              bgcolor: isChecked ? "#F2F9FF" : "#FFFFFF",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "13.5px",
                                fontWeight: 700,
                                color: "#1A4169",
                                lineHeight: 1.3,
                              }}
                            >
                              {item?.name || "Ancillary"}
                            </Typography>
                            {item?.details ? (
                              <Typography
                                sx={{
                                  mt: 0.4,
                                  fontSize: "12px",
                                  color: "#587796",
                                  lineHeight: 1.35,
                                }}
                              >
                                {item.details}
                              </Typography>
                            ) : null}
                            <Box
                              sx={{
                                mt: 0.9,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Chip
                                size="small"
                                label={item?.classification || "Ancillary"}
                                sx={{
                                  fontWeight: 700,
                                  color: "#21527E",
                                  backgroundColor: "#EAF4FF",
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "13px",
                                  fontWeight: 800,
                                  color: "#0E6E2E",
                                }}
                              >
                                {item?.amount !== null
                                  ? `${item?.currencyCode ? `${item.currencyCode} ` : ""}${commaNumber(item.amount)}`
                                  : "Price: N/A"}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                mt: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.8,
                              }}
                            >
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={isChecked}
                                    disabled={!item?.isSelectable}
                                    onChange={(event) =>
                                      handleAncillarySelectionToggle(item, event.target.checked)
                                    }
                                  />
                                }
                                label="Add on offer"
                                sx={{
                                  m: 0,
                                  ".MuiFormControlLabel-label": {
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: "#184A75",
                                  },
                                }}
                              />
                              {item?.isSelectable ? (
                                <FormControl
                                  size="small"
                                  fullWidth
                                  sx={{ maxWidth: 230 }}
                                  disabled={!isChecked || passengerTypeCodes.length === 0}
                                >
                                  <InputLabel id={`${selectionKey}-pax-label`}>
                                    Passenger Type
                                  </InputLabel>
                                  <Select
                                    labelId={`${selectionKey}-pax-label`}
                                    value={selectedPassengerType}
                                    label="Passenger Type"
                                    onChange={(event) =>
                                      handleAncillaryPassengerTypeChange(
                                        item,
                                        event.target.value
                                      )
                                    }
                                  >
                                    {passengerTypeCodes.map((code) => (
                                      <MenuItem key={`${selectionKey}-${code}`} value={code}>
                                        {getPaxTypeLabel(code)}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ) : (
                                <Typography sx={{ fontSize: "11px", color: "#A11F32" }}>
                                  This add-on cannot be auto-attached to offer for this response.
                                </Typography>
                              )}
                              {isChecked ? (
                                <Typography sx={{ fontSize: "11px", color: "#29577F" }}>
                                  Selected for: {getPaxTypeLabel(selectedPassengerType)}
                                </Typography>
                              ) : null}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ) : null
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2 }}>
          <Typography sx={{ fontSize: "12px", color: "#4D6D8E", fontWeight: 600 }}>
            Selected add-ons for booking: {selectedAncillarySelections.length}
          </Typography>
          <Button
            onClick={() => setAncillaryDialogOpen(false)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: "var(--primary-button)",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingDetaills;
