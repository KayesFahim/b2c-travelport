import {
  AirplanemodeActiveRounded,
  AirlineSeatReclineNormalRounded,
  CheckCircleRounded,
  ConnectingAirportsRounded,
  ExitToAppRounded,
  EventSeatRounded,
  InfoOutlined,
  MeetingRoomRounded,
  StraightenRounded,
  ViewColumnRounded,
  WcRounded,
  RuleRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { extractUnifiedPenaltyRows } from "../../utils/flightPolicyUtils";
import secureLocalStorage from "react-secure-storage";
import { fetchTravelportFarePolicy } from "../../utils/travelportFarePolicy";

const getArrayByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getValueByKeys = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => toText(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return (
      toText(value.text) ||
      toText(value.Text) ||
      toText(value.value) ||
      toText(value.Value) ||
      toText(value.Allowance) ||
      toText(value.allowance) ||
      ""
    );
  }
  return "";
};

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
      normalizeIdentifier(value.offerIdentifier) ||
      normalizeIdentifier(value.OfferIdentifier) ||
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

const buildPolicyRows = (data, mode) => {
  const rows = extractUnifiedPenaltyRows(data, mode);
  if (!rows.length) {
    return [
      {
        timeFrame: "Policy",
        details: ["Policy details will be confirmed before ticketing."],
      },
    ];
  }

  return rows.slice(0, 3).map((row) => ({
    timeFrame: String(row?.timeFrame || "Policy").trim() || "Policy",
    details: (Array.isArray(row?.details) ? row.details : [])
      .map((detail) => String(detail || "").trim())
      .filter(Boolean)
      .slice(0, 2),
  }));
};

const sectionTitleSx = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#19385A",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  mb: "8px",
};

const labelSx = {
  fontSize: "11px",
  color: "#53687D",
  fontWeight: 600,
};

const valueSx = {
  fontSize: "11px",
  color: "#2B3D52",
  fontWeight: 600,
};

const stripHtml = (value) =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractFareRuleCategories = (payload, maxCategories = 40, maxDetailsPerCategory = 25) => {
  const fareRules = Array.isArray(payload?.fareRules) ? payload.fareRules : [];
  const categoryMap = new Map();

  for (const fareRule of fareRules) {
    const route = toText(getValueByKeys(fareRule, ["route", "Route"]));
    const paxInfos = getArrayByKeys(fareRule, ["fareRulePaxInfos", "FareRulePaxInfos"]);

    for (const paxInfo of paxInfos) {
      const paxType = toText(getValueByKeys(paxInfo, ["paxType", "PaxType"]));
      const ruleInfos = getArrayByKeys(paxInfo, ["fareRuleInfos", "FareRuleInfos"]);

      for (const info of ruleInfos) {
        const category =
          toText(getValueByKeys(info, ["category", "Category"])) || "General";
        const detail = stripHtml(getValueByKeys(info, ["info", "Info"]));
        if (!detail) continue;
        const contextPrefix = [route, paxType].filter(Boolean).join(" • ");
        const line = contextPrefix ? `${contextPrefix}: ${detail}` : detail;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }

        const entries = categoryMap.get(category);
        if (!entries.includes(line) && entries.length < maxDetailsPerCategory) {
          entries.push(line);
        }
      }
    }
  }

  return Array.from(categoryMap.entries())
    .slice(0, maxCategories)
    .map(([category, details]) => ({
      category,
      details,
    }))
    .filter((item) => item.details.length > 0);
};

const toPrettyJson = (value) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch (error) {
    return "{}";
  }
};

const SEAT_ROW_KEYS = [
  "Rows",
  "rows",
  "SeatRows",
  "seatRows",
  "SeatRow",
  "seatRow",
  "CabinRows",
  "cabinRows",
];

const SEAT_LIST_KEYS = [
  "Seat",
  "seat",
  "Seats",
  "seats",
  "SeatInfo",
  "seatInfo",
  "SeatDetails",
  "seatDetails",
  "Space",
  "space",
];

const SEAT_CHARACTERISTIC_KEYS = [
  "Characteristic",
  "characteristic",
  "Characteristics",
  "characteristics",
  "SeatCharacteristic",
  "seatCharacteristic",
  "SeatCharacteristics",
  "seatCharacteristics",
  "LocationCharacteristic",
  "locationCharacteristic",
  "LocationCharacteristics",
  "locationCharacteristics",
];

const SEAT_CONTEXT_PASSENGER_KEYS = [
  "PassengerTypeCode",
  "passengerTypeCode",
  "PaxType",
  "paxType",
  "PassengerType",
  "passengerType",
  "TravelerType",
  "travelerType",
  "PassengerRef",
  "passengerRef",
  "TravelerRef",
  "travelerRef",
];

const SEAT_CONTEXT_CABIN_KEYS = [
  "CabinClass",
  "cabinClass",
  "cabin",
  "Cabin",
  "cabinType",
  "CabinType",
  "classOfService",
  "ClassOfService",
  "bookingClass",
  "BookingClass",
  "RBD",
  "rbd",
];

const SEAT_CONTEXT_PRODUCT_KEYS = [
  "ProductIdentifier",
  "productIdentifier",
  "productIdentifiers",
  "ProductIdentifiers",
  "ProductRef",
  "productRef",
  "ProductRefs",
  "productRefs",
];

const SEAT_CONTEXT_SEGMENT_KEYS = [
  "segmentRef",
  "SegmentRef",
  "flightRef",
  "FlightRef",
  "bound",
  "Bound",
  "segmentId",
  "SegmentId",
  "segmentKey",
  "SegmentKey",
];

const CONTEXT_TEXT_KEYS = [
  "value",
  "Value",
  "id",
  "ID",
  "identifier",
  "Identifier",
  "code",
  "Code",
  "name",
  "Name",
  "text",
  "Text",
  "ref",
  "Ref",
];

const getValuesByKeys = (obj, keys = []) => {
  const values = [];
  keys.forEach((key) => {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      values.push(value);
    }
  });
  return values;
};

const collectContextTextValues = (value, depth = 0) => {
  if (depth > 3 || value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = toText(value);
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectContextTextValues(item, depth + 1));
  }
  if (typeof value === "object") {
    const nested = [];
    CONTEXT_TEXT_KEYS.forEach((key) => {
      if (value?.[key] !== undefined) {
        nested.push(value[key]);
      }
    });
    return nested.flatMap((item) => collectContextTextValues(item, depth + 1));
  }
  return [];
};

const mergeUniqueTextLists = (...lists) =>
  Array.from(
    new Set(
      lists
        .flatMap((list) => (Array.isArray(list) ? list : []))
        .map((item) => toText(item))
        .filter(Boolean)
    )
  );

const normalizePassengerLabel = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  const normalized = raw.toUpperCase().replace(/\s+/g, "");
  if (normalized === "ADT") return "Adult (ADT)";
  if (normalized === "CHD" || normalized === "CNN") return "Child (CHD)";
  if (normalized === "INF") return "Infant (INF)";
  if (normalized.includes("ADULT")) return "Adult";
  if (normalized.includes("CHILD")) return "Child";
  if (normalized.includes("INFANT")) return "Infant";
  return raw;
};

const normalizeCabinClassLabel = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  const normalized = raw.toUpperCase().replace(/\s+/g, "");
  if (normalized === "Y" || normalized.includes("ECONOMY")) return "Economy";
  if (normalized === "W" || normalized.includes("PREMIUMECONOMY")) {
    return "Premium Economy";
  }
  if (normalized === "C" || normalized === "J" || normalized.includes("BUSINESS")) {
    return "Business";
  }
  if (normalized === "F" || normalized.includes("FIRST")) return "First";
  return raw;
};

const resolveNodeSeatContext = (node, inherited = {}) => {
  const passengerLabels = mergeUniqueTextLists(
    inherited?.passengerLabels || [],
    getValuesByKeys(node, SEAT_CONTEXT_PASSENGER_KEYS)
      .flatMap((value) => collectContextTextValues(value))
      .map((value) => normalizePassengerLabel(value))
      .filter(Boolean)
  );

  const cabinClasses = mergeUniqueTextLists(
    inherited?.cabinClasses || [],
    getValuesByKeys(node, SEAT_CONTEXT_CABIN_KEYS)
      .flatMap((value) => collectContextTextValues(value))
      .map((value) => normalizeCabinClassLabel(value))
      .filter(Boolean)
  );

  const productIdentifiers = mergeUniqueTextLists(
    inherited?.productIdentifiers || [],
    getValuesByKeys(node, SEAT_CONTEXT_PRODUCT_KEYS)
      .flatMap((value) => normalizeIdentifierList(value))
      .filter(Boolean)
  );

  const segmentRefs = mergeUniqueTextLists(
    inherited?.segmentRefs || [],
    getValuesByKeys(node, SEAT_CONTEXT_SEGMENT_KEYS)
      .flatMap((value) => collectContextTextValues(value))
      .filter(Boolean)
  );

  return {
    passengerLabels,
    cabinClasses,
    productIdentifiers,
    segmentRefs,
  };
};

const formatShortIdentifier = (value, maxLength = 14) => {
  const text = toText(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const parseSegmentRefSummary = (value) => {
  const text = toText(value);
  if (!text) {
    return {
      flightCode: "",
      route: "",
      raw: "",
    };
  }

  const parts = text
    .split("•")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    flightCode: parts[0] || "",
    route: parts[1] || "",
    raw: text,
  };
};

const formatLegRouteForTab = (value) => {
  const route = toText(value);
  if (!route) return "";
  return route
    .replace(/\s*(?:to|→|->|–|—)\s*/gi, "-")
    .replace(/\s*-\s*/g, "-")
    .trim();
};

const resolveSeatSectionLegKey = (section, fallbackIndex = 0) =>
  toText(section?.segmentRefs?.[0]) ||
  toText(section?.id) ||
  `section-${fallbackIndex + 1}`;

const AIRCRAFT_EQUIPMENT_NAME_MAP = Object.freeze({
  "318": "Airbus A318",
  "319": "Airbus A319",
  "320": "Airbus A320",
  "321": "Airbus A321",
  "32N": "Airbus A320neo",
  "32Q": "Airbus A321neo",
  "333": "Airbus A330-300",
  "339": "Airbus A330-900neo",
  "343": "Airbus A340-300",
  "346": "Airbus A340-600",
  "359": "Airbus A350-900",
  "351": "Airbus A350-1000",
  "380": "Airbus A380-800",
  "738": "Boeing 737-800",
  "73H": "Boeing 737-800",
  "739": "Boeing 737-900",
  "777": "Boeing 777",
  "772": "Boeing 777-200",
  "773": "Boeing 777-300",
  "77W": "Boeing 777-300ER",
  "787": "Boeing 787",
  "788": "Boeing 787-8",
  "789": "Boeing 787-9",
  "78X": "Boeing 787-10",
});

const resolveAircraftModelName = (equipmentCode, fallback = "") => {
  const normalizedCode = toText(equipmentCode).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalizedCode) return toText(fallback);
  return AIRCRAFT_EQUIPMENT_NAME_MAP[normalizedCode] || toText(fallback) || `Aircraft ${normalizedCode}`;
};

const parseDurationMinutes = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const raw = toText(value);
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return Math.max(0, Number(raw));
  }

  const isoMatch = raw
    .toUpperCase()
    .match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (isoMatch) {
    const days = Number(isoMatch[1] || 0);
    const hours = Number(isoMatch[2] || 0);
    const minutes = Number(isoMatch[3] || 0);
    const seconds = Number(isoMatch[4] || 0);
    const roundedMinutes = minutes + Math.floor(seconds / 60);
    return days * 24 * 60 + hours * 60 + roundedMinutes;
  }

  const hoursMatch = raw.match(/(\d+)\s*H/i);
  const minutesMatch = raw.match(/(\d+)\s*(M|MIN)/i);
  if (hoursMatch || minutesMatch) {
    const hours = Number(hoursMatch?.[1] || 0);
    const minutes = Number(minutesMatch?.[1] || 0);
    return hours * 60 + minutes;
  }

  return null;
};

const resolveFlightDateTime = (detail = {}) => {
  const dateTime = toText(getValueByKeys(detail, ["dateTime", "DateTime"]));
  if (dateTime) return dateTime;

  const date = toText(getValueByKeys(detail, ["date", "Date"]));
  const time = toText(getValueByKeys(detail, ["time", "Time"]));
  if (date && time) return `${date}T${time}`;
  if (date) return date;
  if (time) return time;
  return "";
};

const getMinutesBetweenDateTimes = (departure, arrival) => {
  const depRaw = toText(departure);
  const arrRaw = toText(arrival);
  if (!depRaw || !arrRaw) return null;
  const depDate = new Date(depRaw);
  const arrDate = new Date(arrRaw);
  if (Number.isNaN(depDate.getTime()) || Number.isNaN(arrDate.getTime())) return null;
  const minutes = Math.round((arrDate.getTime() - depDate.getTime()) / (60 * 1000));
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const formatFlightDurationLabel = (value) => {
  const minutes = parseDurationMinutes(value);
  if (minutes !== null) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (mins) parts.push(`${mins}m`);
    return parts.join(" ") || "0m";
  }
  return toText(value);
};

const formatFlightDistanceLabel = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  const numeric = Number(raw.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${Math.round(numeric)} mi`;
  }
  return raw;
};

const hasRowCharacteristicMatch = (seat, matcher) =>
  Array.isArray(seat?.characteristics) &&
  seat.characteristics.some((item) => matcher(toText(item).toUpperCase()));

const buildSectionRowFeatureMetadata = (rows = []) => {
  const exitRows = new Set();
  const doorRows = new Set();
  const lavatoryRows = new Set();
  const wingRows = new Set();
  const extraLegroomRows = new Set();
  const frontRows = new Set();
  const rearRows = new Set();
  const pitchRows = new Set();
  const rowNumbers = [];

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const rowNumber = Number(row?.rowNumber || row?.label);
    if (!Number.isFinite(rowNumber) || rowNumber <= 0) return;
    rowNumbers.push(rowNumber);

    const seats = Array.isArray(row?.seats) ? row.seats : [];
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(seat, (text) => text.includes("EXIT"))
      )
    ) {
      exitRows.add(rowNumber);
    }
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(
          seat,
          (text) => text.includes("DOOR") || text.includes("ENTRY")
        )
      )
    ) {
      doorRows.add(rowNumber);
    }
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(
          seat,
          (text) => text.includes("LAVATORY") || text.includes("RESTROOM") || text === "LA"
        )
      )
    ) {
      lavatoryRows.add(rowNumber);
    }
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(seat, (text) => text.includes("WING"))
      )
    ) {
      wingRows.add(rowNumber);
    }
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(
          seat,
          (text) =>
            text.includes("LEGROOM") ||
            text.includes("EXTRA") ||
            text.includes("BULKHEAD")
        )
      )
    ) {
      extraLegroomRows.add(rowNumber);
    }
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(seat, (text) => text.includes("FRONT"))
      )
    ) {
      frontRows.add(rowNumber);
    }
    if (
      seats.some((seat) =>
        hasRowCharacteristicMatch(seat, (text) => text.includes("REAR"))
      )
    ) {
      rearRows.add(rowNumber);
    }
    if (seats.some((seat) => Boolean(toText(seat?.pitch)))) {
      pitchRows.add(rowNumber);
    }
  });

  const sortedRows = Array.from(new Set(rowNumbers)).sort((a, b) => a - b);
  if (!doorRows.size && sortedRows.length) {
    doorRows.add(sortedRows[0]);
    if (sortedRows.length > 1) {
      doorRows.add(sortedRows[sortedRows.length - 1]);
    }
  }
  if (!frontRows.size && sortedRows.length) {
    frontRows.add(sortedRows[0]);
  }
  if (!rearRows.size && sortedRows.length > 1) {
    rearRows.add(sortedRows[sortedRows.length - 1]);
  }
  if (!extraLegroomRows.size && exitRows.size) {
    exitRows.forEach((rowNumber) => extraLegroomRows.add(rowNumber));
  }

  return {
    exitRows: Array.from(exitRows).sort((a, b) => a - b),
    doorRows: Array.from(doorRows).sort((a, b) => a - b),
    lavatoryRows: Array.from(lavatoryRows).sort((a, b) => a - b),
    wingRows: Array.from(wingRows).sort((a, b) => a - b),
    extraLegroomRows: Array.from(extraLegroomRows).sort((a, b) => a - b),
    frontRows: Array.from(frontRows).sort((a, b) => a - b),
    rearRows: Array.from(rearRows).sort((a, b) => a - b),
    pitchRows: Array.from(pitchRows).sort((a, b) => a - b),
  };
};

const formatRowMarkerList = (rows = [], limit = 5) => {
  const list = (Array.isArray(rows) ? rows : [])
    .filter((item) => Number.isFinite(Number(item)) && Number(item) > 0)
    .map((item) => Number(item));
  if (!list.length) return "";
  if (list.length <= limit) return list.join(", ");
  return `${list.slice(0, limit).join(", ")} +${list.length - limit}`;
};

const normalizeLayoutPositionLabel = (value) => {
  const normalized = toText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return "";
  if (normalized === "W" || normalized.includes("WINDOW")) return "Window";
  if (normalized === "A" || normalized.includes("AISLE")) return "Aisle";
  if (
    normalized === "C" ||
    normalized.includes("CENTER") ||
    normalized.includes("CENTRE")
  ) {
    return "Center";
  }
  if (normalized === "M" || normalized.includes("MIDDLE")) return "Middle";
  return "";
};

const normalizeColumnCode = (value) =>
  normalizeSeatCode(value)
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);

const getSortedUniqueColumns = (rows = []) =>
  Array.from(
    new Set(
      (Array.isArray(rows) ? rows : []).flatMap((row) =>
        (Array.isArray(row?.seats) ? row.seats : [])
          .map((seat) => normalizeColumnCode(seat?.column))
          .filter(Boolean)
      )
    )
  ).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

const buildColumnGroups = (columns = []) => {
  const sorted = Array.from(
    new Set((Array.isArray(columns) ? columns : []).map((item) => normalizeColumnCode(item)).filter(Boolean))
  ).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

  if (!sorted.length) return [];

  const groups = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    const currentCode = current.charCodeAt(0);
    const previousCode = previous.charCodeAt(0);
    if (!Number.isFinite(currentCode) || !Number.isFinite(previousCode)) {
      groups[groups.length - 1].push(current);
      continue;
    }
    if (currentCode - previousCode > 1) {
      groups.push([current]);
    } else {
      groups[groups.length - 1].push(current);
    }
  }
  return groups;
};

const buildSeatLayoutPattern = (columns = []) => {
  const groups = buildColumnGroups(columns);
  if (!groups.length) return "";
  const pattern = groups.map((group) => group.length).join("-");
  if (!pattern) return "";
  return groups.length > 1 ? pattern : `${pattern} Across`;
};

const buildRowRangeLabel = (rows = [], explicitStart = 0, explicitEnd = 0) => {
  const start = Number(explicitStart) || 0;
  const end = Number(explicitEnd) || 0;
  if (start > 0 && end > 0) {
    return start === end ? String(start) : `${start}-${end}`;
  }

  const rowNumbers = (Array.isArray(rows) ? rows : [])
    .map((row) => Number(row?.rowNumber))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (!rowNumbers.length) return "";
  const min = rowNumbers[0];
  const max = rowNumbers[rowNumbers.length - 1];
  return min === max ? String(min) : `${min}-${max}`;
};

const buildColumnSummary = (columns = [], columnLocationMap = new Map()) =>
  (Array.isArray(columns) ? columns : [])
    .map((column) => {
      const normalizedColumn = normalizeColumnCode(column);
      const location = toText(columnLocationMap?.get(normalizedColumn));
      return location ? `${normalizedColumn} (${location})` : normalizedColumn;
    })
    .filter(Boolean)
    .join(" • ");

const resolveSeatLocationType = (seat = {}, fallbackLocation = "") => {
  const direct = normalizeLayoutPositionLabel(
    getValueByKeys(seat, ["locationType", "LocationType", "position", "Position"])
  );
  if (direct) return direct;

  const characteristics = Array.isArray(seat?.characteristics)
    ? seat.characteristics
    : [];
  const normalizedCharacteristicLocations = characteristics
    .map((item) => normalizeLayoutPositionLabel(item))
    .filter(Boolean);
  if (normalizedCharacteristicLocations.length) {
    return normalizedCharacteristicLocations[0];
  }

  const fallback = normalizeLayoutPositionLabel(fallbackLocation);
  return fallback || "";
};

const PITCH_KEYS = [
  "pitch",
  "Pitch",
  "seatPitch",
  "SeatPitch",
  "seat_spacing",
  "SeatSpacing",
  "seatSpacing",
  "spacing",
  "Spacing",
  "seatDistance",
  "SeatDistance",
  "distance",
  "Distance",
];

const PITCH_VALUE_KEYS = ["value", "Value", "amount", "Amount", "text", "Text"];
const PITCH_UNIT_KEYS = ["unit", "Unit", "uom", "UOM", "measure", "Measure"];

const collectPitchTextCandidates = (value, depth = 0) => {
  if (depth > 3 || value === null || value === undefined) return [];
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? [String(value)] : [];
  }
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPitchTextCandidates(item, depth + 1));
  }
  if (typeof value === "object") {
    const nested = [];
    const nestedValue = getValueByKeys(value, PITCH_VALUE_KEYS);
    const nestedUnit = toText(getValueByKeys(value, PITCH_UNIT_KEYS));
    if (nestedValue !== "") {
      const merged = `${toText(nestedValue)} ${nestedUnit}`.trim();
      if (merged) nested.push(merged);
    }
    PITCH_KEYS.forEach((key) => {
      if (value?.[key] !== undefined) {
        nested.push(value[key]);
      }
    });
    return nested.flatMap((item) => collectPitchTextCandidates(item, depth + 1));
  }
  return [];
};

const formatPitchLabel = (value) => {
  const text = toText(value);
  if (!text) return "";
  const compact = text.replace(/\s+/g, " ").trim();
  const normalizedLower = compact.toLowerCase();
  const numeric = Number(compact.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return compact;
  if (/cm|centimeter|centimetre/.test(normalizedLower)) {
    return `${numeric.toFixed(numeric % 1 ? 1 : 0)} cm`;
  }
  if (/mm|millimeter|millimetre/.test(normalizedLower)) {
    return `${numeric.toFixed(numeric % 1 ? 1 : 0)} mm`;
  }
  if (/in|inch|\"/.test(compact)) {
    return `${numeric.toFixed(numeric % 1 ? 1 : 0)}"`;
  }
  return `${numeric.toFixed(numeric % 1 ? 1 : 0)}"`;
};

const resolvePitchLabelFromNode = (node) => {
  if (!node || typeof node !== "object") return "";
  const candidates = PITCH_KEYS.flatMap((key) =>
    node?.[key] !== undefined ? collectPitchTextCandidates(node[key]) : []
  );
  const formatted = candidates.map((item) => formatPitchLabel(item)).find(Boolean);
  return formatted || "";
};

const buildCabinLayoutMetadata = (cabin) => {
  const layoutEntries = getArrayByKeys(cabin, ["Layout", "layout"]);
  const rowRangeEntry = layoutEntries.find((item) => {
    const start = toNumberValue(getValueByKeys(item, ["startRow", "StartRow"]));
    const end = toNumberValue(getValueByKeys(item, ["endRow", "EndRow"]));
    return start > 0 || end > 0;
  });

  const explicitStartRow = toNumberValue(
    getValueByKeys(rowRangeEntry || {}, ["startRow", "StartRow"])
  );
  const explicitEndRow = toNumberValue(
    getValueByKeys(rowRangeEntry || {}, ["endRow", "EndRow"])
  );

  const orderedColumns = [];
  const columnLocationMap = new Map();

  layoutEntries.forEach((entry) => {
    const columnCode = normalizeColumnCode(
      getValueByKeys(entry, [
        "value",
        "Value",
        "column",
        "Column",
        "location",
        "Location",
      ])
    );
    if (!columnCode) return;

    if (!orderedColumns.includes(columnCode)) {
      orderedColumns.push(columnCode);
    }

    const positions = getValuesByKeys(entry, [
      "position",
      "Position",
      "positions",
      "Positions",
    ])
      .flatMap((value) => collectContextTextValues(value))
      .map((item) => normalizeLayoutPositionLabel(item))
      .filter(Boolean);

    if (positions.length && !columnLocationMap.has(columnCode)) {
      columnLocationMap.set(columnCode, positions[0]);
    }
  });

  return {
    orderedColumns,
    columnLocationMap,
    explicitStartRow,
    explicitEndRow,
  };
};

const PASSENGER_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "infant", label: "Infant" },
];

const toTravelerTypeCode = (value) => {
  const normalized = toText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return "";
  if (normalized.includes("ADT") || normalized.includes("ADULT")) return "ADT";
  if (
    normalized.includes("CHD") ||
    normalized.includes("CNN") ||
    normalized.includes("CHILD")
  ) {
    return "CHD";
  }
  if (normalized.includes("INF") || normalized.includes("INFANT")) return "INF";
  return "";
};

const toTravelerTypeLabel = (typeCode) => {
  if (typeCode === "ADT") return "Adult";
  if (typeCode === "CHD") return "Child";
  if (typeCode === "INF") return "Infant";
  return "Traveler";
};

const buildTravelerSeatOptions = (data) => {
  const priceRows = getArrayByKeys(data, ["PriceBreakDown", "priceBreakDown"]);
  const orderedTypeCodes = ["ADT", "CHD", "INF"];
  const countsByType = {
    ADT: 0,
    CHD: 0,
    INF: 0,
  };

  priceRows.forEach((row) => {
    const typeCode = toTravelerTypeCode(row?.PaxType || row?.paxType);
    if (!typeCode) return;
    const count = Math.max(1, Number(row?.PaxCount ?? row?.paxCount ?? 1) || 1);
    countsByType[typeCode] += count;
  });

  if (!Object.values(countsByType).some((count) => count > 0)) {
    countsByType.ADT = 1;
  }

  const options = [];
  let travelerIndex = 0;
  orderedTypeCodes.forEach((typeCode) => {
    const count = countsByType[typeCode];
    for (let travelerNumber = 1; travelerNumber <= count; travelerNumber += 1) {
      const typeLabel = toTravelerTypeLabel(typeCode);
      options.push({
        key: `${typeCode}-${travelerNumber}`,
        label: `${typeLabel} ${travelerNumber}`,
        travelerTypeCode: typeCode,
        travelerNumber,
        travelerIndex,
      });
      travelerIndex += 1;
    }
  });

  return options;
};

const buildSeatSelectionScopeKey = (selection) => {
  const travelerIndex = Number(selection?.travelerIndex);
  const travelerTypeCode = toText(selection?.travelerTypeCode).toUpperCase();
  const travelerNumber = Number(selection?.travelerNumber || 0);
  const productIdentifier = toText(selection?.productIdentifier);
  const segmentRef = toText(selection?.segmentRef);

  const travelerScope = Number.isFinite(travelerIndex)
    ? `IDX-${travelerIndex}`
    : travelerTypeCode && travelerNumber > 0
    ? `${travelerTypeCode}-${travelerNumber}`
    : travelerTypeCode
    ? travelerTypeCode
    : "TRAVELER";

  return `${travelerScope}::${productIdentifier}::${segmentRef}`;
};

const resolvePassengerGroup = (value) => {
  const normalized = toText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return "";
  if (normalized.includes("ADT") || normalized.includes("ADULT")) return "adult";
  if (normalized.includes("CHD") || normalized.includes("CNN") || normalized.includes("CHILD")) {
    return "child";
  }
  if (normalized.includes("INF") || normalized.includes("INFANT")) return "infant";
  return "";
};

const resolvePassengerGroupsFromLabels = (labels = []) =>
  Array.from(
    new Set(
      (Array.isArray(labels) ? labels : [])
        .map((label) => resolvePassengerGroup(label))
        .filter(Boolean)
    )
  );

const buildSeatMapStats = (sections = []) => {
  const stats = {
    total: 0,
    available: 0,
    paid: 0,
    unavailable: 0,
    unknown: 0,
    minPaid: 0,
    minPaidCurrencyCode: "",
  };

  (Array.isArray(sections) ? sections : []).forEach((section) => {
    (section?.rows || []).forEach((row) => {
      (row?.seats || []).forEach((seat) => {
        stats.total += 1;
        if (seat?.status === "available") stats.available += 1;
        else if (seat?.status === "paid") stats.paid += 1;
        else if (seat?.status === "unavailable") stats.unavailable += 1;
        else stats.unknown += 1;

        if (seat?.price > 0 && (!stats.minPaid || seat.price < stats.minPaid)) {
          stats.minPaid = seat.price;
          stats.minPaidCurrencyCode = toText(seat?.currencyCode).toUpperCase();
        }
      });
    });
  });

  return stats;
};

const toNumberValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = toText(value);
  if (!text) return 0;
  const normalized = text.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSeatCode = (value) =>
  toText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizeSeatCharacteristicLabel = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return "";
  if (normalized === "CH" || normalized.includes("CHARGE")) return "Chargeable";
  if (normalized === "BK" || normalized.includes("BLOCK")) return "Blocked";
  if (normalized === "A" || normalized.includes("AISLE")) return "Aisle";
  if (normalized === "W" || normalized.includes("WINDOW")) return "Window";
  if (
    normalized === "C" ||
    normalized.includes("CENTER") ||
    normalized.includes("CENTRE")
  ) {
    return "Center";
  }
  if (normalized === "M" || normalized.includes("MIDDLE")) return "Middle";
  if (normalized === "N" || normalized.includes("NORMAL")) return "Standard";
  if (normalized === "K" || normalized.includes("BULKHEAD")) return "Bulkhead";
  if (normalized === "E") return "Exit Row";
  if (normalized === "LA" || normalized.includes("LAVATORY")) {
    return "Lavatory (Washroom)";
  }
  if (normalized === "D" || normalized.includes("DOOR")) return "Door";
  if (normalized.includes("WING")) return "Wing";
  if (normalized === "H" || normalized.includes("HANDICAP")) return "Accessible";
  if (normalized.includes("EXIT")) return "Exit Row";
  if (normalized.includes("LEGROOM")) return "Extra Legroom";
  if (normalized.includes("BULKHEAD")) return "Bulkhead";
  if (normalized.includes("FRONT")) return "Front Cabin";
  if (normalized.includes("REAR")) return "Rear Cabin";
  const words = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ");
  return words
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ")
    .trim();
};

const extractCharacteristicValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractCharacteristicValues(item));
  }
  if (typeof value === "object") {
    const base = [
      getValueByKeys(value, [
        "value",
        "Value",
        "code",
        "Code",
        "name",
        "Name",
        "description",
        "Description",
        "text",
        "Text",
      ]),
    ];

    SEAT_CHARACTERISTIC_KEYS.forEach((key) => {
      const nested = value?.[key];
      if (nested !== undefined) {
        base.push(nested);
      }
    });

    return base.flatMap((item) => extractCharacteristicValues(item));
  }
  return [String(value)];
};

const resolveSeatCharacteristics = (seat) => {
  const sources = [];
  SEAT_CHARACTERISTIC_KEYS.forEach((key) => {
    if (seat?.[key] !== undefined) {
      sources.push(seat[key]);
    }
  });

  const seatAssignment = getValueByKeys(seat, ["seatAssignment", "SeatAssignment"]);
  if (seatAssignment && typeof seatAssignment === "object") {
    SEAT_CHARACTERISTIC_KEYS.forEach((key) => {
      if (seatAssignment?.[key] !== undefined) {
        sources.push(seatAssignment[key]);
      }
    });
  }

  if (!sources.length) return [];

  return Array.from(
    new Set(
      sources
        .flatMap((source) => extractCharacteristicValues(source))
        .map((item) => normalizeSeatCharacteristicLabel(item))
        .filter(Boolean)
    )
  ).slice(0, 4);
};

const parseSeatCodeParts = (seatCode) => {
  const normalized = normalizeSeatCode(seatCode);
  const match = normalized.match(/^(\d{1,4})([A-Z]{1,2})$/);
  if (!match) {
    const embeddedMatch = normalized.match(/(\d{1,4})([A-Z]{1,2})/);
    if (embeddedMatch) {
      return {
        rowNumber: Number(embeddedMatch[1]),
        column: embeddedMatch[2],
      };
    }
    return null;
  }
  return {
    rowNumber: Number(match[1]),
    column: match[2],
  };
};

const resolveSeatCodeValue = (seat) => {
  const direct = normalizeSeatCode(
    getValueByKeys(seat, [
      "seatNumber",
      "SeatNumber",
      "seatCode",
      "SeatCode",
      "designation",
      "Designation",
      "label",
      "Label",
      "code",
      "Code",
      "seat",
      "Seat",
      "number",
      "Number",
      "seatLabel",
      "SeatLabel",
      "value",
      "Value",
      "id",
      "ID",
    ])
  );
  if (parseSeatCodeParts(direct)) return direct;

  const seatAssignment = getValueByKeys(seat, ["seatAssignment", "SeatAssignment"]);
  const assignmentCode = normalizeSeatCode(
    getValueByKeys(
      seatAssignment && typeof seatAssignment === "object" ? seatAssignment : {},
      [
        "seatNumber",
        "SeatNumber",
        "seatCode",
        "SeatCode",
        "designation",
        "Designation",
        "label",
        "Label",
        "code",
        "Code",
        "seat",
        "Seat",
        "number",
        "Number",
        "value",
        "Value",
      ]
    )
  );
  if (parseSeatCodeParts(assignmentCode)) return assignmentCode;

  return direct;
};

const resolveSeatStatusValue = (seat) => {
  const direct = toText(
    getValueByKeys(seat, [
      "availability",
      "Availability",
      "status",
      "Status",
      "seatStatus",
      "SeatStatus",
      "bookabilityStatus",
      "BookabilityStatus",
      "occupancyStatus",
      "OccupancyStatus",
      "seatAvailabilityStatus",
      "SeatAvailabilityStatus",
    ])
  );
  if (direct) return direct;

  const statusNode = getValueByKeys(seat, ["status", "Status", "seatAvailabilityStatus"]);
  return toText(statusNode);
};

const resolveSeatStatus = (value, price = 0) => {
  const normalized = toText(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (!normalized) {
    return price > 0 ? "paid" : "unknown";
  }

  if (/paid|charge|purchase|forsale|forpurchase|fee/.test(normalized)) {
    return "paid";
  }
  if (
    /occup|unavail|blocked|taken|held|closed|notavail|notsell|reserved|noseat|notseat/.test(
      normalized
    )
  ) {
    return "unavailable";
  }
  if (/avail|open|free|vacant|select/.test(normalized)) {
    return price > 0 ? "paid" : "available";
  }
  if (price > 0) return "paid";
  return "unknown";
};

const resolveSeatPrice = (seat) => {
  const direct = getValueByKeys(seat, [
    "price",
    "Price",
    "amount",
    "Amount",
    "totalPrice",
    "TotalPrice",
    "seatPrice",
    "SeatPrice",
    "fee",
    "Fee",
  ]);

  const directAmount = toNumberValue(
    direct && typeof direct === "object"
      ? getValueByKeys(direct, [
          "value",
          "Value",
          "amount",
          "Amount",
          "totalPrice",
          "TotalPrice",
          "ApproximateTotalPrice",
          "approximateTotalPrice",
        ])
      : direct
  );
  if (directAmount > 0) return directAmount;

  const priceCandidates = getArrayByKeys(seat, [
    "Price",
    "price",
    "Prices",
    "prices",
    "PriceBreakdown",
    "priceBreakdown",
  ]);

  for (const item of priceCandidates) {
    const amount = toNumberValue(
      getValueByKeys(item, [
        "value",
        "Value",
        "amount",
        "Amount",
        "totalPrice",
        "TotalPrice",
        "ApproximateTotalPrice",
        "approximateTotalPrice",
      ])
    );
    if (amount > 0) return amount;
  }

  return 0;
};

const resolveSeatFromObject = (seat, rowFallback = 0, seatIndex = 0) => {
  if (!seat || typeof seat !== "object" || Array.isArray(seat)) {
    return null;
  }

  const rowFromSeat = toNumberValue(
    getValueByKeys(seat, ["rowNumber", "RowNumber", "row", "Row"])
  );
  const explicitColumn = normalizeSeatCode(
    getValueByKeys(seat, [
      "column",
      "Column",
      "seatColumn",
      "SeatColumn",
      "columnIdentifier",
      "ColumnIdentifier",
      "location",
      "Location",
      "letter",
      "Letter",
      "seatLetter",
      "SeatLetter",
    ])
  ).replace(/[^A-Z]/g, "");

  let seatCode = resolveSeatCodeValue(seat);
  if (!seatCode && (rowFromSeat || rowFallback) && explicitColumn) {
    seatCode = `${rowFromSeat || rowFallback}${explicitColumn}`;
  }

  const parsedCode = parseSeatCodeParts(seatCode);
  if (!parsedCode) {
    return null;
  }

  const price = resolveSeatPrice(seat);
  const status = resolveSeatStatus(resolveSeatStatusValue(seat), price);
  const seatAssignment = getValueByKeys(seat, ["seatAssignment", "SeatAssignment"]);
  const pitch =
    resolvePitchLabelFromNode(seat) ||
    (seatAssignment && typeof seatAssignment === "object"
      ? resolvePitchLabelFromNode(seatAssignment)
      : "");
  const characteristics = resolveSeatCharacteristics(seat);
  const locationType = resolveSeatLocationType(
    {
      characteristics,
      locationType: getValueByKeys(seat, [
        "locationType",
        "LocationType",
        "position",
        "Position",
      ]),
    },
    ""
  );

  return {
    id: `${parsedCode.rowNumber}-${parsedCode.column}-${seatIndex}`,
    code: `${parsedCode.rowNumber}${parsedCode.column}`,
    rowNumber: parsedCode.rowNumber,
    column: parsedCode.column,
    status,
    price,
    pitch,
    locationType,
    characteristics,
  };
};

const sortSeatsByColumn = (a, b) =>
  String(a?.column || "").localeCompare(String(b?.column || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const resolveSeatsFromRow = (row, rowIndex = 0) => {
  if (!row || typeof row !== "object") return null;

  const rowNumberFallback = toNumberValue(
    getValueByKeys(row, ["rowNumber", "RowNumber", "row", "Row", "label", "Label"])
  );

  let seatCandidates = [];
  SEAT_LIST_KEYS.forEach((key) => {
    const values = getArrayByKeys(row, [key]);
    if (values.length) {
      seatCandidates = seatCandidates.concat(values);
    }
  });

  if (!seatCandidates.length) {
    Object.values(row).forEach((value) => {
      if (Array.isArray(value)) {
        seatCandidates = seatCandidates.concat(value);
      }
    });
  }

  const seatMap = new Map();
  seatCandidates.forEach((seat, seatIndex) => {
    const normalizedSeat = resolveSeatFromObject(
      seat,
      rowNumberFallback,
      seatIndex
    );
    if (!normalizedSeat) return;
    if (!seatMap.has(normalizedSeat.code)) {
      seatMap.set(normalizedSeat.code, normalizedSeat);
    }
  });

  const seats = Array.from(seatMap.values()).sort(sortSeatsByColumn);
  if (!seats.length) return null;

  const rowNumber = rowNumberFallback || seats[0].rowNumber || rowIndex + 1;
  return {
    id: `row-${rowNumber}-${rowIndex}`,
    rowNumber,
    label: String(rowNumber),
    seats,
  };
};

const buildSeatSection = (rows, parent, sectionIndex, context = {}) => {
  const parsedRows = rows
    .map((row, rowIndex) => resolveSeatsFromRow(row, rowIndex))
    .filter(Boolean);

  if (!parsedRows.length) return null;

  const mergedRowsMap = new Map();
  parsedRows.forEach((row) => {
    const existing = mergedRowsMap.get(row.rowNumber);
    if (!existing) {
      mergedRowsMap.set(row.rowNumber, row);
      return;
    }

    const mergedSeatMap = new Map(
      [...existing.seats, ...row.seats].map((seat) => [seat.code, seat])
    );
    existing.seats = Array.from(mergedSeatMap.values()).sort(sortSeatsByColumn);
  });

  const mergedRows = Array.from(mergedRowsMap.values()).sort(
    (a, b) => a.rowNumber - b.rowNumber
  );
  const seatCount = mergedRows.reduce((sum, row) => sum + row.seats.length, 0);
  const sectionColumns = getSortedUniqueColumns(mergedRows);
  const rowRange = buildRowRangeLabel(mergedRows);
  const seatLayoutPattern = buildSeatLayoutPattern(sectionColumns);
  const columnSummary = buildColumnSummary(sectionColumns);
  const sectionPitch =
    mergeUniqueTextLists(
      mergedRows.flatMap((row) =>
        (Array.isArray(row?.seats) ? row.seats : [])
          .map((seat) => toText(seat?.pitch))
          .filter(Boolean)
      )
    )[0] || resolvePitchLabelFromNode(parent);
  const rowFeatureMeta = buildSectionRowFeatureMetadata(mergedRows);

  const cabinTitle =
    toText(
      getValueByKeys(parent, [
        "CabinName",
        "cabinName",
        "Cabin",
        "cabin",
        "Compartment",
        "compartment",
        "cabinType",
        "CabinType",
        "name",
        "Name",
      ])
    ) || `Cabin ${sectionIndex + 1}`;

  const segmentRef = toText(
    getValueByKeys(parent, [
      "segmentRef",
      "SegmentRef",
      "flightRef",
      "FlightRef",
      "bound",
      "Bound",
    ])
  );
  const inferredCabinClass = normalizeCabinClassLabel(
    getValueByKeys(parent, [
      "CabinClass",
      "cabinClass",
      "classOfService",
      "ClassOfService",
      "cabinType",
      "CabinType",
    ])
  );

  const passengerLabels = mergeUniqueTextLists(context?.passengerLabels || []);
  const cabinClasses = mergeUniqueTextLists(
    context?.cabinClasses || [],
    inferredCabinClass ? [inferredCabinClass] : []
  );
  const productIdentifiers = mergeUniqueTextLists(context?.productIdentifiers || []);
  const segmentRefs = mergeUniqueTextLists(
    context?.segmentRefs || [],
    segmentRef ? [segmentRef] : []
  );

  const title = [cabinClasses[0] || cabinTitle, segmentRefs[0]]
    .filter(Boolean)
    .join(" • ");

  return {
    id: `seat-section-${sectionIndex}`,
    title: title || `Cabin ${sectionIndex + 1}`,
    rows: mergedRows,
    seatCount,
    rowRange,
    seatLayoutPattern,
    columnSummary,
    pitch: sectionPitch,
    aircraftInfo: null,
    exitRows: rowFeatureMeta.exitRows,
    doorRows: rowFeatureMeta.doorRows,
    lavatoryRows: rowFeatureMeta.lavatoryRows,
    wingRows: rowFeatureMeta.wingRows,
    extraLegroomRows: rowFeatureMeta.extraLegroomRows,
    frontRows: rowFeatureMeta.frontRows,
    rearRows: rowFeatureMeta.rearRows,
    pitchRows: rowFeatureMeta.pitchRows,
    passengerLabels,
    cabinClasses,
    productIdentifiers,
    segmentRefs,
  };
};

const getSeatStatusScore = (status) => {
  if (status === "unavailable") return 5;
  if (status === "paid") return 4;
  if (status === "available") return 3;
  return 1;
};

const collectSeatCodesFromValue = (value, depth = 0) => {
  if (depth > 4 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSeatCodesFromValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return [
      ...collectSeatCodesFromValue(value?.value, depth + 1),
      ...collectSeatCodesFromValue(value?.Value, depth + 1),
      ...collectSeatCodesFromValue(value?.seat, depth + 1),
      ...collectSeatCodesFromValue(value?.Seat, depth + 1),
      ...collectSeatCodesFromValue(value?.seats, depth + 1),
      ...collectSeatCodesFromValue(value?.Seats, depth + 1),
    ];
  }
  const text = toText(value);
  if (!text) return [];
  return text
    .split(/[\s,;|/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const resolveCharacteristicFallbackStatus = (space) => {
  const rawCodes = getArrayByKeys(space, ["Characteristic", "characteristic"])
    .flatMap((item) => collectContextTextValues(item))
    .map((item) => toText(item).toUpperCase())
    .filter(Boolean);

  if (rawCodes.some((item) => item === "BK" || item.includes("BLOCK"))) {
    return "unavailable";
  }
  if (
    rawCodes.some(
      (item) =>
        item === "CH" ||
        item.includes("CHARGE") ||
        item.includes("PAY")
    )
  ) {
    return "paid";
  }
  return "unknown";
};

const extractCatalogAncillarySeatSections = (payload) => {
  const root =
    payload?.CatalogOfferingsAncillaryListResponse &&
    typeof payload.CatalogOfferingsAncillaryListResponse === "object"
      ? payload.CatalogOfferingsAncillaryListResponse
      : null;
  if (!root) return [];

  const travelerFlights = getArrayByKeys(root, [
    "CatalogOfferingsID",
    "catalogOfferingsID",
  ]);
  if (!travelerFlights.length) return [];

  const travelerChartMap = new Map();

  travelerFlights.forEach((travelerFlight, travelerIndex) => {
    const travelerId =
      toText(getValueByKeys(travelerFlight, ["id", "ID"])) ||
      normalizeIdentifier(getValueByKeys(travelerFlight, ["Identifier", "identifier"])) ||
      `traveler-${travelerIndex + 1}`;

    const passengerLabels = Array.from(
      new Set(
        getArrayByKeys(travelerFlight, [
          "TravelerIdentifierRef",
          "travelerIdentifierRef",
        ])
          .flatMap((item) =>
            collectContextTextValues(
              getValueByKeys(item, [
                "passengerTypeCode",
                "PassengerTypeCode",
                "passengerType",
                "PassengerType",
                "travelerType",
                "TravelerType",
              ])
            )
          )
          .map((label) => normalizePassengerLabel(label))
          .filter(Boolean)
      )
    );

    const segmentDescriptors = getArrayByKeys(travelerFlight, ["Flight", "flight"])
      .map((flight) => {
        const carrier = toText(getValueByKeys(flight, ["carrier", "Carrier"]));
        const number = toText(getValueByKeys(flight, ["number", "Number"]));
        const dep = toText(
          getValueByKeys(flight?.Departure, ["location", "Location"])
        );
        const arr = toText(
          getValueByKeys(flight?.Arrival, ["location", "Location"])
        );
        const equipmentCode = toText(
          getValueByKeys(flight, ["equipment", "Equipment", "aircraftType", "AircraftType"])
        ).toUpperCase();
        const aircraftModelName = resolveAircraftModelName(
          equipmentCode,
          getValueByKeys(flight, ["aircraftModel", "AircraftModel", "model", "Model"])
        );
        const flightCode = [carrier, number].filter(Boolean).join(" ");
        const route = [dep, arr].filter(Boolean).join("-");
        const segmentRef = [flightCode, route].filter(Boolean).join(" • ");

        return {
          segmentRef,
          flightCode,
          route,
          carrier,
          number,
          equipmentCode,
          aircraftModelName,
          duration: formatFlightDurationLabel(
            getValueByKeys(flight, [
              "duration",
              "Duration",
              "durationIso",
              "DurationIso",
              "durationISO",
              "DurationISO",
              "totalDuration",
              "TotalDuration",
              "totalDurationIso",
              "TotalDurationIso",
              "totalDurationISO",
              "TotalDurationISO",
            ]) ??
              getMinutesBetweenDateTimes(
                resolveFlightDateTime(flight?.Departure || {}),
                resolveFlightDateTime(flight?.Arrival || {})
              )
          ),
          distance: formatFlightDistanceLabel(
            getValueByKeys(flight, ["distance", "Distance"])
          ),
          departureAirport: dep,
          arrivalAirport: arr,
        };
      })
      .filter((item) => Boolean(item?.segmentRef));
    const segmentRefs = segmentDescriptors.map((item) => item.segmentRef);
    const flightMetaBySegmentRef = new Map(
      segmentDescriptors.map((item) => [item.segmentRef, item])
    );

    const offerings = getArrayByKeys(travelerFlight, [
      "CatalogOffering",
      "catalogOffering",
    ]);

    offerings.forEach((offering) => {
      const offeringPrice = getValueByKeys(offering, ["Price", "price"]);
      const totalPrice = toNumberValue(
        getValueByKeys(offeringPrice || {}, [
          "TotalPrice",
          "totalPrice",
          "Base",
          "base",
          "ApproximateTotalPrice",
          "approximateTotalPrice",
        ])
      );
      const currencyCode = toText(
        getValueByKeys(
          offeringPrice?.CurrencyCode || offeringPrice?.currencyCode || {},
          ["value", "Value", "code", "Code"]
        )
      );

      const productOptions = getArrayByKeys(offering, [
        "ProductOptions",
        "productOptions",
      ]);

      productOptions.forEach((productOption) => {
        const products = getArrayByKeys(productOption, ["Product", "product"]);
        products.forEach((product) => {
          const chartRef = toText(
            getValueByKeys(product, ["SeatingChartRef", "seatingChartRef"])
          );
          if (!chartRef) return;

          const mapKey = `${travelerId}::${chartRef}`;
          if (!travelerChartMap.has(mapKey)) {
            travelerChartMap.set(mapKey, {
              travelerId,
              chartRef,
              passengerLabels: [...passengerLabels],
              segmentRefs: [...segmentRefs],
              flightMetaBySegmentRef: new Map(flightMetaBySegmentRef),
              productIdentifiers: [],
              seatByCode: new Map(),
            });
          }

          const mapEntry = travelerChartMap.get(mapKey);
          if (!(mapEntry.flightMetaBySegmentRef instanceof Map)) {
            mapEntry.flightMetaBySegmentRef = new Map();
          }
          flightMetaBySegmentRef.forEach((value, key) => {
            if (!mapEntry.flightMetaBySegmentRef.has(key)) {
              mapEntry.flightMetaBySegmentRef.set(key, value);
            }
          });
          const productId = normalizeIdentifier(
            getValueByKeys(product, ["id", "ID", "Identifier", "identifier"])
          );
          if (productId && !mapEntry.productIdentifiers.includes(productId)) {
            mapEntry.productIdentifiers.push(productId);
          }

          const brandName = toText(
            getValueByKeys(product?.Brand || {}, ["name", "Name"])
          );
          const seatAvailabilityItems = getArrayByKeys(product, [
            "SeatAvailability",
            "seatAvailability",
          ]);

          seatAvailabilityItems.forEach((availabilityItem) => {
            const rawStatus = toText(
              getValueByKeys(availabilityItem, [
                "seatAvailabilityStatus",
                "SeatAvailabilityStatus",
                "status",
                "Status",
              ])
            );
            const resolvedStatus = resolveSeatStatus(rawStatus, totalPrice);
            const seatCodes = collectSeatCodesFromValue(
              getValueByKeys(availabilityItem, ["value", "Value", "seat", "Seat"])
            );

            seatCodes.forEach((seatCodeCandidate) => {
              const parsed = parseSeatCodeParts(seatCodeCandidate);
              if (!parsed) return;
              const seatCode = `${parsed.rowNumber}${parsed.column}`;
              const current = mapEntry.seatByCode.get(seatCode);
              const nextStatusScore = getSeatStatusScore(resolvedStatus);
              const currentStatusScore = getSeatStatusScore(current?.status);
              if (!current || nextStatusScore >= currentStatusScore) {
                mapEntry.seatByCode.set(seatCode, {
                  status: resolvedStatus,
                  price: totalPrice,
                  currencyCode,
                  brandName,
                });
              }
            });
          });
        });
      });
    });
  });

  const seatingCharts = getArrayByKeys(
    getArrayByKeys(root, ["ReferenceList", "referenceList"]).find(
      (item) =>
        toText(getValueByKeys(item, ["@type", "type"])) ===
          "ReferenceListSeatingChart" || getArrayByKeys(item, ["SeatingChart"]).length
    ) || {},
    ["SeatingChart", "seatingChart"]
  );

  if (!seatingCharts.length || !travelerChartMap.size) return [];

  const seatingChartById = new Map();
  seatingCharts.forEach((chart, index) => {
    const id =
      toText(getValueByKeys(chart, ["id", "ID"])) || `seatingChart-${index + 1}`;
    seatingChartById.set(id, chart);
  });

  const sections = [];

  travelerChartMap.forEach((entry) => {
    const seatingChart = seatingChartById.get(entry.chartRef);
    if (!seatingChart) return;

    const cabins = getArrayByKeys(seatingChart, ["Cabin", "cabin"]);
    cabins.forEach((cabin, cabinIndex) => {
      const cabinName =
        normalizeCabinClassLabel(
          getValueByKeys(cabin, ["name", "Name", "CabinClass", "cabinClass"])
        ) || `Cabin ${cabinIndex + 1}`;
      const layoutMetadata = buildCabinLayoutMetadata(cabin);
      const cabinPitch = resolvePitchLabelFromNode(cabin);

      const rawRows = getArrayByKeys(cabin, ["Row", "row", "Rows", "rows"]);
      const parsedRows = rawRows
        .map((row, rowIndex) => {
          const rowLabel = toText(
            getValueByKeys(row, [
              "label",
              "Label",
              "rowNumber",
              "RowNumber",
              "value",
              "Value",
            ])
          );
          const rowNumber = toNumberValue(
            rowLabel ||
              getValueByKeys(row, [
                "rowNumber",
                "RowNumber",
                "number",
                "Number",
                "index",
                "Index",
              ])
          );
          if (!rowNumber) return null;

          const spaces = getArrayByKeys(row, [
            "Space",
            "space",
            "Seat",
            "seat",
            "Seats",
            "seats",
          ]);

          const seats = spaces
            .map((space, seatIndex) => {
              const location = normalizeSeatCode(
                getValueByKeys(space, [
                  "location",
                  "Location",
                  "column",
                  "Column",
                  "seatLetter",
                  "SeatLetter",
                  "value",
                  "Value",
                ])
              ).replace(/[^A-Z]/g, "");
              if (!location) return null;

              const seatCode = `${rowNumber}${location}`;
              const mappedSeat = entry.seatByCode.get(seatCode);
              const fallbackStatus = resolveCharacteristicFallbackStatus(space);
              const status = mappedSeat?.status || fallbackStatus;
              const price = mappedSeat?.price || 0;
              const currencyCode = mappedSeat?.currencyCode || "";
              const brandName = mappedSeat?.brandName || "";
              const layoutLocationType = toText(
                layoutMetadata?.columnLocationMap?.get(location)
              );
              const seatPitch = resolvePitchLabelFromNode(space) || cabinPitch;
              const characteristics = mergeUniqueTextLists(
                resolveSeatCharacteristics(space),
                layoutLocationType ? [layoutLocationType] : [],
                brandName ? [brandName] : []
              );
              const locationType = resolveSeatLocationType(
                { characteristics, locationType: layoutLocationType },
                layoutLocationType
              );

              return {
                id: `${entry.travelerId}-${entry.chartRef}-${rowNumber}-${location}-${seatIndex}`,
                code: seatCode,
                rowNumber,
                column: location,
                status,
                price,
                currencyCode,
                pitch: seatPitch,
                locationType,
                characteristics,
              };
            })
            .filter(Boolean)
            .sort(sortSeatsByColumn);

          if (!seats.length) return null;
          return {
            id: `${entry.travelerId}-${entry.chartRef}-row-${rowNumber}-${rowIndex}`,
            rowNumber,
            label: rowLabel || String(rowNumber),
            seats,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.rowNumber - b.rowNumber);

      if (!parsedRows.length) return;
      const fallbackColumns = getSortedUniqueColumns(parsedRows);
      const sectionColumns =
        Array.isArray(layoutMetadata?.orderedColumns) && layoutMetadata.orderedColumns.length
          ? layoutMetadata.orderedColumns
          : fallbackColumns;
      const rowRange = buildRowRangeLabel(
        parsedRows,
        layoutMetadata?.explicitStartRow,
        layoutMetadata?.explicitEndRow
      );
      const seatLayoutPattern = buildSeatLayoutPattern(sectionColumns);
      const columnSummary = buildColumnSummary(
        sectionColumns,
        layoutMetadata?.columnLocationMap
      );
      const sectionPitch =
        cabinPitch ||
        mergeUniqueTextLists(
          parsedRows.flatMap((row) =>
            (Array.isArray(row?.seats) ? row.seats : [])
              .map((seat) => toText(seat?.pitch))
              .filter(Boolean)
          )
        )[0] ||
        "";
      const primarySegmentRef = toText(entry.segmentRefs?.[0]);
      const primaryFlightMeta =
        entry.flightMetaBySegmentRef?.get(primarySegmentRef) ||
        Array.from(entry.flightMetaBySegmentRef?.values?.() || [])[0] ||
        null;
      const rowFeatureMeta = buildSectionRowFeatureMetadata(parsedRows);

      sections.push({
        id: `${entry.travelerId}-${entry.chartRef}-${cabinIndex}`,
        title: [cabinName, entry.segmentRefs[0]].filter(Boolean).join(" • "),
        rows: parsedRows,
        seatCount: parsedRows.reduce((sum, row) => sum + row.seats.length, 0),
        rowRange,
        seatLayoutPattern,
        columnSummary,
        pitch: sectionPitch,
        aircraftInfo: primaryFlightMeta,
        exitRows: rowFeatureMeta.exitRows,
        doorRows: rowFeatureMeta.doorRows,
        lavatoryRows: rowFeatureMeta.lavatoryRows,
        wingRows: rowFeatureMeta.wingRows,
        extraLegroomRows: rowFeatureMeta.extraLegroomRows,
        frontRows: rowFeatureMeta.frontRows,
        rearRows: rowFeatureMeta.rearRows,
        pitchRows: rowFeatureMeta.pitchRows,
        passengerLabels: [...entry.passengerLabels],
        cabinClasses: [cabinName],
        productIdentifiers: [...entry.productIdentifiers],
        segmentRefs: [...entry.segmentRefs],
      });
    });
  });

  return sections;
};

const extractSeatMapSections = (payload) => {
  if (!payload || typeof payload !== "object") return [];

  const ancillarySeatSections = extractCatalogAncillarySeatSections(payload);
  if (ancillarySeatSections.length) {
    return ancillarySeatSections;
  }

  const sections = [];
  const visitedRowArrays = new Set();
  const rowArrayIds = new WeakMap();
  let rowArraySerial = 0;

  const getRowArrayIdentifier = (rows) => {
    if (!rowArrayIds.has(rows)) {
      rowArraySerial += 1;
      rowArrayIds.set(rows, rowArraySerial);
    }
    return rowArrayIds.get(rows);
  };

  const getContextSignature = (context = {}) =>
    [
      (context?.passengerLabels || []).join("|"),
      (context?.cabinClasses || []).join("|"),
      (context?.productIdentifiers || []).join("|"),
      (context?.segmentRefs || []).join("|"),
    ].join("::");

  const walk = (node, inheritedContext = {}) => {
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, inheritedContext));
      return;
    }
    if (!node || typeof node !== "object") return;
    const currentContext = resolveNodeSeatContext(node, inheritedContext);

    SEAT_ROW_KEYS.forEach((key) => {
      const rows = node?.[key];
      if (!Array.isArray(rows) || !rows.length) {
        return;
      }
      const visitKey = `${getRowArrayIdentifier(rows)}::${key}::${getContextSignature(
        currentContext
      )}`;
      if (visitedRowArrays.has(visitKey)) return;
      visitedRowArrays.add(visitKey);
      const section = buildSeatSection(rows, node, sections.length, currentContext);
      if (section) {
        sections.push(section);
      }
    });

    Object.values(node).forEach((value) => {
      if (value && typeof value === "object") {
        walk(value, currentContext);
      }
    });
  };

  walk(payload, {
    passengerLabels: [],
    cabinClasses: [],
    productIdentifiers: [],
    segmentRefs: [],
  });
  if (sections.length) return sections;

  const flatSeatMap = new Map();
  let seatIndex = 0;
  const walkFlat = (node) => {
    if (Array.isArray(node)) {
      node.forEach((item) => walkFlat(item));
      return;
    }
    if (!node || typeof node !== "object") return;

    const seat = resolveSeatFromObject(node, 0, seatIndex++);
    if (seat) {
      flatSeatMap.set(seat.code, seat);
    }

    Object.values(node).forEach((value) => {
      if (value && typeof value === "object") {
        walkFlat(value);
      }
    });
  };

  walkFlat(payload);
  if (!flatSeatMap.size) return [];

  const grouped = new Map();
  Array.from(flatSeatMap.values()).forEach((seat) => {
    if (!grouped.has(seat.rowNumber)) {
      grouped.set(seat.rowNumber, []);
    }
    grouped.get(seat.rowNumber).push(seat);
  });

  const rows = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rowNumber, seats]) => ({
      id: `fallback-row-${rowNumber}`,
      rowNumber,
      label: String(rowNumber),
      seats: seats.sort(sortSeatsByColumn),
    }));
  const rowFeatureMeta = buildSectionRowFeatureMetadata(rows);

  return [
    {
      id: "fallback-seat-layout",
      title: "Seat Layout",
      rows,
      seatCount: rows.reduce((sum, row) => sum + row.seats.length, 0),
      rowRange: buildRowRangeLabel(rows),
      seatLayoutPattern: buildSeatLayoutPattern(getSortedUniqueColumns(rows)),
      columnSummary: buildColumnSummary(getSortedUniqueColumns(rows)),
      pitch: "",
      aircraftInfo: null,
      exitRows: rowFeatureMeta.exitRows,
      doorRows: rowFeatureMeta.doorRows,
      lavatoryRows: rowFeatureMeta.lavatoryRows,
      wingRows: rowFeatureMeta.wingRows,
      extraLegroomRows: rowFeatureMeta.extraLegroomRows,
      frontRows: rowFeatureMeta.frontRows,
      rearRows: rowFeatureMeta.rearRows,
      pitchRows: rowFeatureMeta.pitchRows,
      passengerLabels: [],
      cabinClasses: [],
      productIdentifiers: [],
      segmentRefs: [],
    },
  ];
};

const getSeatTone = (status) => {
  if (status === "available") {
    return {
      background: "#E8F7ED",
      border: "#B7E3C4",
      color: "#177245",
      label: "Free / Available",
    };
  }
  if (status === "paid") {
    return {
      background: "#FFF9E5",
      border: "#F0DA95",
      color: "#8A6A00",
      label: "Paid",
    };
  }
  if (status === "unavailable") {
    return {
      background: "#FDECEC",
      border: "#F3C2C2",
      color: "#B3261E",
      label: "Occupied",
    };
  }
  return {
    background: "#E8F7ED",
    border: "#B7E3C4",
    color: "#177245",
    label: "Free / Available",
  };
};

const formatSeatPrice = (value, currencyCode = "") => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "";
  const normalizedCurrency = toText(currencyCode).toUpperCase();
  if (normalizedCurrency) {
    return `${normalizedCurrency} ${numericValue.toFixed(0)}`;
  }
  return `$${numericValue.toFixed(0)}`;
};

const getSeatChargeLabel = (seat) => {
  if (seat?.status === "paid") {
    return seat?.price > 0
      ? formatSeatPrice(seat.price, seat?.currencyCode)
      : "Paid";
  }
  if (seat?.status === "available") return "Free";
  if (seat?.status === "unavailable") return "Not available";
  return "--";
};

const RightSidebarInfo = ({
  data,
  seatAvailabilityData = null,
  seatAvailabilityLoading = false,
  seatAvailabilityError = "",
  seatAvailabilityRequest = null,
  enablePostBuildFetch = false,
  autoOpenSeatMap = false,
  autoOpenSeatMapKey = "",
  seatMapOnly = false,
  seatSelections = [],
  onSeatSelectionsChange = () => {},
}) => {
  const token = secureLocalStorage.getItem("access_token");
  const lastAutoOpenSeatMapKeyRef = useRef("");
  const [isSeatMapModalOpen, setIsSeatMapModalOpen] = useState(false);
  const [isFarePolicyModalOpen, setIsFarePolicyModalOpen] = useState(false);
  const [seatPassengerFilter, setSeatPassengerFilter] = useState("all");
  const [seatAssignmentTravelerKey, setSeatAssignmentTravelerKey] = useState("");
  const [activeSeatLegTab, setActiveSeatLegTab] = useState("");
  const [activePolicyTab, setActivePolicyTab] = useState("long");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [longTextPolicy, setLongTextPolicy] = useState(null);
  const [shortTextPolicy, setShortTextPolicy] = useState(null);
  const farePolicyRequest = useMemo(
    () =>
      data?.farePolicyRequest && typeof data.farePolicyRequest === "object"
        ? data.farePolicyRequest
        : null,
    [data]
  );
  const searchId = useMemo(
    () => getValueByKeys(data, ["SearchId", "searchId", "transactionId"]) || "",
    [data]
  );
  const fareRequestOfferIdentifier = useMemo(
    () =>
      normalizeIdentifier(
        farePolicyRequest?.offerIdentifier ||
          seatAvailabilityRequest?.offerIdentifier ||
          getValueByKeys(data, [
            "offerIdentifier",
            "OfferIdentifier",
            "Identifier",
            "identifier",
            "ResultId",
            "resultId",
          ])
      ),
    [data, farePolicyRequest, seatAvailabilityRequest]
  );
  const fareRequestOfferListIdentifier = useMemo(
    () =>
      normalizeIdentifier(
        farePolicyRequest?.offerListIdentifier ||
          seatAvailabilityRequest?.offerListIdentifier ||
          getValueByKeys(data, ["offerListIdentifier", "OfferListIdentifier"])
      ),
    [data, farePolicyRequest, seatAvailabilityRequest]
  );
  const fareRequestProductIdentifiers = useMemo(
    () =>
      normalizeIdentifierList(
        farePolicyRequest?.productIdentifiers ||
          seatAvailabilityRequest?.productIdentifiers ||
          getValueByKeys(data, [
            "productIdentifiers",
            "ProductIdentifiers",
            "productIdentifier",
            "ProductIdentifier",
          ])
      ),
    [data, farePolicyRequest, seatAvailabilityRequest]
  );
  const dateChangeRows = useMemo(
    () => buildPolicyRows(data, "dateChange"),
    [data]
  );
  const cancellationRows = useMemo(
    () => buildPolicyRows(data, "cancellation"),
    [data]
  );
  const longTextPolicyCategories = useMemo(
    () => extractFareRuleCategories(longTextPolicy, 40, 25),
    [longTextPolicy]
  );
  const shortTextPolicyCategories = useMemo(
    () => extractFareRuleCategories(shortTextPolicy, 40, 25),
    [shortTextPolicy]
  );
  const hasLongTextPolicy = longTextPolicyCategories.length > 0;
  const hasShortTextPolicy = shortTextPolicyCategories.length > 0;
  const hasSeatAvailabilityData = useMemo(
    () =>
      Boolean(
        seatAvailabilityData &&
          typeof seatAvailabilityData === "object" &&
          Object.keys(seatAvailabilityData).length > 0
      ),
    [seatAvailabilityData]
  );
  const seatMapResponseJson = useMemo(
    () => toPrettyJson(seatAvailabilityData),
    [seatAvailabilityData]
  );
  const seatMapSections = useMemo(
    () => extractSeatMapSections(seatAvailabilityData),
    [seatAvailabilityData]
  );
  const hasVisualSeatMap = useMemo(
    () => seatMapSections.some((section) => Array.isArray(section?.rows) && section.rows.length),
    [seatMapSections]
  );
  const visibleSeatMapSections = useMemo(() => {
    if (seatPassengerFilter === "all") return seatMapSections;
    return seatMapSections.filter((section) => {
      const groups = resolvePassengerGroupsFromLabels(section?.passengerLabels || []);
      if (!groups.length) {
        return true;
      }
      return groups.includes(seatPassengerFilter);
    });
  }, [seatMapSections, seatPassengerFilter]);
  const seatMapLegGroups = useMemo(() => {
    const groups = [];
    const groupIndexByKey = new Map();

    visibleSeatMapSections.forEach((section, index) => {
      const legKey = resolveSeatSectionLegKey(section, index);
      const existingGroupIndex = groupIndexByKey.get(legKey);
      if (existingGroupIndex !== undefined) {
        groups[existingGroupIndex].sections.push(section);
        return;
      }

      const primarySegmentRef = toText(section?.segmentRefs?.[0]);
      const segmentSummary = parseSegmentRefSummary(primarySegmentRef);
      const titleText = toText(section?.title);
      const titleParts = titleText
        .split("•")
        .map((item) => item.trim())
        .filter(Boolean);
      const aircraftInfo =
        section?.aircraftInfo && typeof section.aircraftInfo === "object"
          ? section.aircraftInfo
          : null;
      const groupIndex = groups.length;

      groups.push({
        id: legKey,
        legNumber: groupIndex + 1,
        flightLabel:
          segmentSummary.flightCode ||
          titleParts[0] ||
          `Flight ${groupIndex + 1}`,
        routeLabel: segmentSummary.route || titleParts[1] || "",
        aircraftLabel: toText(aircraftInfo?.aircraftModelName),
        equipmentCode: toText(aircraftInfo?.equipmentCode).toUpperCase(),
        sections: [section],
      });
      groupIndexByKey.set(legKey, groupIndex);
    });

    return groups;
  }, [visibleSeatMapSections]);
  const activeSeatLegGroup = useMemo(() => {
    if (!seatMapLegGroups.length) return null;
    return (
      seatMapLegGroups.find((group) => group.id === activeSeatLegTab) ||
      seatMapLegGroups[0]
    );
  }, [activeSeatLegTab, seatMapLegGroups]);
  const renderedSeatMapSections = useMemo(() => {
    return activeSeatLegGroup?.sections || [];
  }, [activeSeatLegGroup]);
  const seatMapStats = useMemo(
    () => buildSeatMapStats(renderedSeatMapSections),
    [renderedSeatMapSections]
  );
  const seatMapLegNumbers = useMemo(() => {
    const map = new Map();
    let cursor = 0;
    visibleSeatMapSections.forEach((section, index) => {
      const key = resolveSeatSectionLegKey(section, index);
      if (!map.has(key)) {
        cursor += 1;
        map.set(key, cursor);
      }
    });
    return map;
  }, [visibleSeatMapSections]);
  const travelerSeatOptions = useMemo(() => buildTravelerSeatOptions(data), [data]);
  const selectedSeatTravelerOption = useMemo(
    () =>
      travelerSeatOptions.find((option) => option.key === seatAssignmentTravelerKey) ||
      travelerSeatOptions[0] ||
      null,
    [seatAssignmentTravelerKey, travelerSeatOptions]
  );

  useEffect(() => {
    let isCancelled = false;

    const fetchPolicy = async () => {
      if (!enablePostBuildFetch) {
        setLongTextPolicy(null);
        setShortTextPolicy(null);
        setPolicyError("");
        setPolicyLoading(false);
        return;
      }

      if (!fareRequestOfferIdentifier) {
        setLongTextPolicy(null);
        setShortTextPolicy(null);
        setPolicyError("");
        setPolicyLoading(false);
        return;
      }

      setPolicyLoading(true);
      setPolicyError("");

      const [longTextResult, shortTextResult] = await Promise.allSettled([
        fetchTravelportFarePolicy({
          searchId,
          resultId: fareRequestOfferIdentifier,
          offerIdentifier: fareRequestOfferIdentifier,
          offerListIdentifier: fareRequestOfferListIdentifier,
          productIdentifiers: fareRequestProductIdentifiers,
          fareRuleType: "LongText",
          token,
        }),
        fetchTravelportFarePolicy({
          searchId,
          resultId: fareRequestOfferIdentifier,
          offerIdentifier: fareRequestOfferIdentifier,
          offerListIdentifier: fareRequestOfferListIdentifier,
          productIdentifiers: fareRequestProductIdentifiers,
          fareRuleType: "ShortText",
          token,
        }),
      ]);

      if (isCancelled) return;

      const resolvedLongText =
        longTextResult.status === "fulfilled" ? longTextResult.value : null;
      const resolvedShortText =
        shortTextResult.status === "fulfilled" ? shortTextResult.value : null;

      setLongTextPolicy(resolvedLongText);
      setShortTextPolicy(resolvedShortText);

      if (!resolvedLongText && !resolvedShortText) {
        const longTextMessage =
          longTextResult.status === "rejected"
            ? longTextResult.reason?.message
            : "";
        const shortMessage =
          shortTextResult.status === "rejected"
            ? shortTextResult.reason?.message
            : "";
        setPolicyError(
          longTextMessage && shortMessage
            ? "Fare policy is currently unavailable for this fare option."
            : longTextMessage ||
                shortMessage ||
                "Fare policy is currently unavailable for this fare option."
        );
      } else {
        setPolicyError("");
      }

      setPolicyLoading(false);
    };

    fetchPolicy();

    return () => {
      isCancelled = true;
    };
  }, [
    enablePostBuildFetch,
    fareRequestOfferIdentifier,
    fareRequestOfferListIdentifier,
    fareRequestProductIdentifiers,
    searchId,
    token,
  ]);

  useEffect(() => {
    if (!isFarePolicyModalOpen) return;
    if (activePolicyTab === "long" && !longTextPolicyCategories.length && shortTextPolicyCategories.length) {
      setActivePolicyTab("short");
    } else if (
      activePolicyTab === "short" &&
      !shortTextPolicyCategories.length &&
      longTextPolicyCategories.length
    ) {
      setActivePolicyTab("long");
    }
  }, [
    activePolicyTab,
    isFarePolicyModalOpen,
    longTextPolicyCategories.length,
    shortTextPolicyCategories.length,
  ]);

  useEffect(() => {
    if (!seatMapLegGroups.length) {
      if (activeSeatLegTab !== "") {
        setActiveSeatLegTab("");
      }
      return;
    }
    const isActiveLegValid = seatMapLegGroups.some(
      (group) => group.id === activeSeatLegTab
    );
    if (!isActiveLegValid) {
      setActiveSeatLegTab(seatMapLegGroups[0].id);
    }
  }, [activeSeatLegTab, seatMapLegGroups]);

  useEffect(() => {
    if (!travelerSeatOptions.length) {
      if (seatAssignmentTravelerKey) {
        setSeatAssignmentTravelerKey("");
      }
      return;
    }
    if (!seatAssignmentTravelerKey) {
      setSeatAssignmentTravelerKey(travelerSeatOptions[0].key);
      return;
    }
    const stillValid = travelerSeatOptions.some(
      (option) => option.key === seatAssignmentTravelerKey
    );
    if (!stillValid) {
      setSeatAssignmentTravelerKey(travelerSeatOptions[0].key);
    }
  }, [seatAssignmentTravelerKey, travelerSeatOptions]);

  useEffect(() => {
    if (!autoOpenSeatMap) return;
    if (seatAvailabilityLoading) return;
    if (seatAvailabilityError) return;
    if (!hasSeatAvailabilityData) return;

    const nextKey = toText(autoOpenSeatMapKey) || "default";
    if (lastAutoOpenSeatMapKeyRef.current === nextKey) return;

    lastAutoOpenSeatMapKeyRef.current = nextKey;
    setIsSeatMapModalOpen(true);
  }, [
    autoOpenSeatMap,
    autoOpenSeatMapKey,
    hasSeatAvailabilityData,
    seatAvailabilityError,
    seatAvailabilityLoading,
  ]);

  return (
    <Box
      sx={{
        bgcolor: "#FFFFFF",
        borderRadius: "10px",
        border: "1px solid #DFE7EF",
        p: "12px",
      }}
    >
      <Box sx={seatMapOnly ? { display: "none" } : undefined}>
        <Typography sx={sectionTitleSx}>
          <RuleRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
          Fare Rules
        </Typography>

        <Box
          sx={{
            border: "1px solid #E4ECF4",
            borderRadius: "8px",
            p: "8px",
            mb: "8px",
            bgcolor: "#FBFDFF",
          }}
        >
          <Typography sx={{ ...labelSx, mb: "4px" }}>Date Change</Typography>
          {dateChangeRows.map((row, index) => (
            <Box key={`change-${index}`} sx={{ mb: index === dateChangeRows.length - 1 ? 0 : "7px" }}>
              <Typography sx={{ ...valueSx, color: "#203E5D" }}>{row.timeFrame}</Typography>
              {row.details.map((line, detailIndex) => (
                <Typography
                  key={`change-${index}-${detailIndex}`}
                  sx={{ fontSize: "10px", color: "#607489", fontWeight: 600, mt: "1px" }}
                >
                  {line}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            border: "1px solid #E4ECF4",
            borderRadius: "8px",
            p: "8px",
            bgcolor: "#FBFDFF",
          }}
        >
          <Typography sx={{ ...labelSx, mb: "4px" }}>Cancellation</Typography>
          {cancellationRows.map((row, index) => (
            <Box key={`cancel-${index}`} sx={{ mb: index === cancellationRows.length - 1 ? 0 : "7px" }}>
              <Typography sx={{ ...valueSx, color: "#203E5D" }}>{row.timeFrame}</Typography>
              {row.details.map((line, detailIndex) => (
                <Typography
                  key={`cancel-${index}-${detailIndex}`}
                  sx={{ fontSize: "10px", color: "#607489", fontWeight: 600, mt: "1px" }}
                >
                  {line}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: "10px", display: seatMapOnly ? "none" : "block" }} />

      <Box sx={seatMapOnly ? { display: "none" } : undefined}>
        <Typography sx={sectionTitleSx}>
          <RuleRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
          Fare Policy
        </Typography>
        {policyLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "8px" }}>
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: "11px", color: "#6B7F94" }}>
              Loading fare policy...
            </Typography>
          </Box>
        ) : null}
        {policyError ? (
          <Typography sx={{ fontSize: "11px", color: "#AE2A2A", mb: "8px" }}>
            {policyError}
          </Typography>
        ) : null}
        {!policyLoading && !policyError ? (
          <Typography sx={{ fontSize: "11px", color: "#607489", fontWeight: 600, mb: "8px" }}>
            {hasLongTextPolicy || hasShortTextPolicy
              ? "Long text and short text fare policy are available in the details view."
              : "Fare policy details are not available for this fare option."}
          </Typography>
        ) : null}
        <Box sx={{ mt: "8px", display: "flex", justifyContent: "flex-start" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsFarePolicyModalOpen(true)}
            sx={{
              textTransform: "none",
              fontSize: "11px",
              fontWeight: 700,
              borderColor: "#BFD4E7",
              color: "#1E456D",
            }}
          >
            View Fare Policy
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: "10px", display: seatMapOnly ? "none" : "block" }} />

      <Box>
        <Typography sx={sectionTitleSx}>
          <AirlineSeatReclineNormalRounded
            sx={{ fontSize: "16px", color: "var(--primary-button)" }}
          />
          Seat Map
        </Typography>
        {seatAvailabilityLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "8px" }}>
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: "11px", color: "#6B7F94" }}>
              Loading seat availability...
            </Typography>
          </Box>
        ) : null}
        {!seatAvailabilityLoading && seatAvailabilityError ? (
          <Typography sx={{ fontSize: "11px", color: "#AE2A2A", mb: "8px" }}>
            {seatAvailabilityError}
          </Typography>
        ) : null}
        {!seatAvailabilityLoading &&
        !seatAvailabilityError &&
        hasSeatAvailabilityData ? (
          <Box
            sx={{
              border: "1px solid #E4ECF4",
              borderRadius: "8px",
              p: "8px",
              bgcolor: "#FBFDFF",
            }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={() => setIsSeatMapModalOpen(true)}
              sx={{
                textTransform: "none",
                fontSize: "11px",
                fontWeight: 700,
                borderColor: "#BFD4E7",
                color: "#1E456D",
              }}
            >
              {hasVisualSeatMap ? "View Seat Map" : "View Seat Data"}
            </Button>
          </Box>
        ) : null}
        {!seatAvailabilityLoading &&
        !seatAvailabilityError &&
        !hasSeatAvailabilityData ? (
          <Typography sx={{ fontSize: "11px", color: "#6B7F94" }}>
            Seat map is not available for this fare option.
          </Typography>
        ) : null}
      </Box>

      <Dialog
        open={isSeatMapModalOpen}
        onClose={() => setIsSeatMapModalOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            width: "min(1080px, calc(100vw - 24px))",
            maxWidth: "min(1080px, calc(100vw - 24px))",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "15px", fontWeight: 700 }}>
          Seat Map
        </DialogTitle>
        <DialogContent dividers>
          {hasSeatAvailabilityData && hasVisualSeatMap ? (
            <Box>
              <Box
                sx={{
                  border: "1px solid #D7E5F4",
                  borderRadius: "12px",
                  p: "11px",
                  background:
                    "linear-gradient(165deg, #FBFDFF 0%, #F1F7FF 100%)",
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "999px",
                        bgcolor: "#E7F2FF",
                        border: "1px solid #CDE0F4",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <EventSeatRounded sx={{ fontSize: 18, color: "#1E456D" }} />
                    </Box>
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
                        Flight-wise and leg-wise aligned layout
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel id="seat-passenger-filter-label">
                        View
                      </InputLabel>
                      <Select
                        labelId="seat-passenger-filter-label"
                        value={seatPassengerFilter}
                        label="View"
                        onChange={(event) => setSeatPassengerFilter(String(event.target.value))}
                        sx={{
                          height: "32px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#1E456D",
                          background: "#FFFFFF",
                        }}
                      >
                        {PASSENGER_FILTER_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel id="seat-assign-traveler-label">
                        Assign To
                      </InputLabel>
                      <Select
                        labelId="seat-assign-traveler-label"
                        value={seatAssignmentTravelerKey}
                        label="Assign To"
                        onChange={(event) =>
                          setSeatAssignmentTravelerKey(String(event.target.value))
                        }
                        sx={{
                          height: "32px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#1E456D",
                          background: "#FFFFFF",
                        }}
                      >
                        {travelerSeatOptions.map((option) => (
                          <MenuItem key={option.key} value={option.key}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Box sx={{ mt: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Chip
                    label={`Total ${seatMapStats.total}`}
                    size="small"
                    sx={{ bgcolor: "#E9F3FD", color: "#1E456D", fontWeight: 700 }}
                  />
                  <Chip
                    label={`Free ${seatMapStats.available}`}
                    size="small"
                    sx={{ bgcolor: "#E8F7ED", color: "#1A6A3F", fontWeight: 700 }}
                  />
                  <Chip
                    label={`Paid ${seatMapStats.paid}`}
                    size="small"
                    sx={{ bgcolor: "#FFF9E5", color: "#8A6A00", fontWeight: 700 }}
                  />
                  <Chip
                    label={`Occupied ${seatMapStats.unavailable}`}
                    size="small"
                    sx={{ bgcolor: "#FDECEC", color: "#B3261E", fontWeight: 700 }}
                  />
                  {seatMapStats.minPaid > 0 ? (
                    <Chip
                      label={`Paid seats from ${formatSeatPrice(
                        seatMapStats.minPaid,
                        seatMapStats.minPaidCurrencyCode
                      )}`}
                      size="small"
                      sx={{ bgcolor: "#FFF8F0", color: "#9A581F", fontWeight: 700 }}
                    />
                  ) : null}
                </Box>

                <Box sx={{ mt: "9px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <InfoOutlined sx={{ fontSize: 14, color: "#1E456D" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Hover on seat to see seat charge
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <InfoOutlined sx={{ fontSize: 14, color: "#6B7F94" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Not available
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <EventSeatRounded sx={{ fontSize: 14, color: "#1A6A3F" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Free / Available (Green)
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <EventSeatRounded sx={{ fontSize: 14, color: "#8A6A00" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Paid Seat (Yellow)
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <EventSeatRounded sx={{ fontSize: 14, color: "#B3261E" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Occupied (Red, Disabled)
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <ExitToAppRounded sx={{ fontSize: 14, color: "#B03030" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Exit Row
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MeetingRoomRounded sx={{ fontSize: 14, color: "#89652A" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Door Row
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <WcRounded sx={{ fontSize: 14, color: "#2B708D" }} />
                    <Typography sx={{ fontSize: "10px", color: "#45627D", fontWeight: 700 }}>
                      Lavatory (Washroom)
                    </Typography>
                  </Box>
                </Box>

                {Array.isArray(seatSelections) && seatSelections.length ? (
                  <Box
                    sx={{
                      mt: "9px",
                      border: "1px solid #D8E6F4",
                      borderRadius: "10px",
                      bgcolor: "#FFFFFF",
                      p: "8px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#1E456D",
                        mb: "6px",
                      }}
                    >
                      Selected Seat Assignments ({seatSelections.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {seatSelections.map((selection, index) => {
                        const travelerTypeCode = toText(
                          selection?.travelerTypeCode
                        ).toUpperCase();
                        const travelerLabel = toTravelerTypeLabel(travelerTypeCode);
                        const travelerNumber = Number(selection?.travelerNumber || 0);
                        const chipLabel = `${travelerLabel}${
                          travelerNumber > 0 ? ` ${travelerNumber}` : ""
                        } • ${toText(selection?.seatAssignment)} • ${
                          toText(selection?.segmentRef) || toText(selection?.productIdentifier)
                        }`;
                        return (
                          <Chip
                            key={`${buildSeatSelectionScopeKey(selection)}-${index}`}
                            size="small"
                            label={chipLabel}
                            onDelete={() =>
                              onSeatSelectionsChange(
                                seatSelections.filter((_, rowIndex) => rowIndex !== index)
                              )
                            }
                            sx={{
                              height: "24px",
                              borderRadius: "999px",
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#1E456D",
                              bgcolor: "#ECF5FF",
                              border: "1px solid #CFE1F4",
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                ) : null}

                {seatMapLegGroups.length ? (
                  <Box
                    sx={{
                      mt: "10px",
                      border: "1px solid #D8E6F4",
                      borderRadius: "10px",
                      bgcolor: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    <Tabs
                      value={activeSeatLegGroup?.id || false}
                      onChange={(_, value) => setActiveSeatLegTab(String(value))}
                      variant="scrollable"
                      scrollButtons="auto"
                      allowScrollButtonsMobile
                      sx={{
                        minHeight: "36px",
                        bgcolor: "#F7FBFF",
                        "& .MuiTab-root": {
                          minHeight: "36px",
                          textTransform: "none",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#4D637A",
                          px: "10px",
                        },
                        "& .Mui-selected": {
                          color: "#1E456D",
                        },
                        "& .MuiTabs-indicator": {
                          height: "2px",
                        },
                      }}
                    >
                      {seatMapLegGroups.map((group) => (
                        <Tab
                          key={`seat-map-leg-tab-${group.id}`}
                          value={group.id}
                          label={`Leg ${group.legNumber} : ${
                            formatLegRouteForTab(group.routeLabel) ||
                            group.flightLabel
                          }`}
                        />
                      ))}
                    </Tabs>
                    <Box sx={{ px: "10px", py: "7px", borderTop: "1px solid #E7EFF8" }}>
                      {activeSeatLegGroup ? (
                        <Typography
                          sx={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#4F657B",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {`Showing Leg ${activeSeatLegGroup.legNumber} • ${activeSeatLegGroup.flightLabel}${
                            activeSeatLegGroup.routeLabel
                              ? ` • ${activeSeatLegGroup.routeLabel}`
                              : ""
                          }${
                            activeSeatLegGroup.aircraftLabel
                              ? ` • ${activeSeatLegGroup.aircraftLabel}`
                              : activeSeatLegGroup.equipmentCode
                              ? ` • ${activeSeatLegGroup.equipmentCode}`
                              : ""
                          }`}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: "10px", fontWeight: 700, color: "#4F657B" }}>
                          Select a leg to view seat layouts
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ) : null}
              </Box>

              {!renderedSeatMapSections.length ? (
                <Box
                  sx={{
                    border: "1px solid #E4ECF4",
                    borderRadius: "10px",
                    p: "14px",
                    bgcolor: "#FBFDFF",
                  }}
                >
                  <Typography sx={{ fontSize: "12px", color: "#607489", fontWeight: 600 }}>
                    {activeSeatLegGroup
                      ? "No seat layouts found for this leg and passenger filter."
                      : "No seat layouts found for this passenger filter."}
                  </Typography>
                </Box>
              ) : (
                renderedSeatMapSections.map((section, sectionIndex) => {
                const rows = Array.isArray(section?.rows) ? section.rows : [];
                if (!rows.length) return null;

                const columns = Array.from(
                  new Set(
                    rows.flatMap((row) =>
                      Array.isArray(row?.seats)
                        ? row.seats.map((seat) => String(seat?.column || "").trim()).filter(Boolean)
                        : []
                    )
                  )
                ).sort((a, b) =>
                  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
                );

                if (!columns.length) return null;

                const rowHeaderWidth = 64;
                const seatCellWidth = 44;
                const seatCellHeight = 42;
                const seatCellGap = 6;
                const gridTemplate = `${rowHeaderWidth}px repeat(${columns.length}, ${seatCellWidth}px) ${rowHeaderWidth}px`;
                const gridMinWidth = Math.max(
                  440,
                  rowHeaderWidth * 2 + columns.length * (seatCellWidth + seatCellGap)
                );
                const sectionCharacteristics = Array.from(
                  new Set(
                    rows.flatMap((row) =>
                      (Array.isArray(row?.seats) ? row.seats : []).flatMap((seat) =>
                        Array.isArray(seat?.characteristics) ? seat.characteristics : []
                      )
                    )
                  )
                );
                const cabinClasses = Array.isArray(section?.cabinClasses)
                  ? section.cabinClasses
                  : [];
                const segmentRefs = Array.isArray(section?.segmentRefs)
                  ? section.segmentRefs
                  : [];
                const primarySegmentRef = toText(segmentRefs[0]);
                const segmentSummary = parseSegmentRefSummary(primarySegmentRef);
                const sectionSegmentRef = primarySegmentRef;
                const sectionProductIdentifier =
                  toText(section?.productIdentifiers?.[0]) ||
                  toText(seatAvailabilityRequest?.productIdentifiers?.[sectionIndex]) ||
                  toText(seatAvailabilityRequest?.productIdentifiers?.[0]);
                const legKey = resolveSeatSectionLegKey(section, sectionIndex);
                const legNumber = seatMapLegNumbers.get(legKey) || sectionIndex + 1;
                const flightLabel =
                  segmentSummary.flightCode ||
                  toText(section?.title).split("•")[0]?.trim() ||
                  `Flight ${legNumber}`;
                const routeLabel = segmentSummary.route;
                const rowRangeLabel = toText(section?.rowRange);
                const layoutPatternLabel = toText(section?.seatLayoutPattern);
                const columnSummaryLabel = toText(section?.columnSummary);
                const pitchLabel = toText(section?.pitch);
                const sectionAircraftInfo =
                  section?.aircraftInfo && typeof section.aircraftInfo === "object"
                    ? section.aircraftInfo
                    : null;
                const aircraftModelLabel = toText(
                  sectionAircraftInfo?.aircraftModelName
                );
                const aircraftDurationLabel = toText(sectionAircraftInfo?.duration);
                const aircraftDistanceLabel = toText(sectionAircraftInfo?.distance);
                const exitRows = Array.isArray(section?.exitRows) ? section.exitRows : [];
                const doorRows = Array.isArray(section?.doorRows) ? section.doorRows : [];
                const lavatoryRows = Array.isArray(section?.lavatoryRows)
                  ? section.lavatoryRows
                  : [];
                const wingRows = Array.isArray(section?.wingRows) ? section.wingRows : [];
                const extraLegroomRows = Array.isArray(section?.extraLegroomRows)
                  ? section.extraLegroomRows
                  : [];
                const frontRows = Array.isArray(section?.frontRows) ? section.frontRows : [];
                const rearRows = Array.isArray(section?.rearRows) ? section.rearRows : [];
                const pitchRows = Array.isArray(section?.pitchRows) ? section.pitchRows : [];
                const exitRowSet = new Set(exitRows.map((item) => Number(item)));
                const doorRowSet = new Set(doorRows.map((item) => Number(item)));
                const lavatoryRowSet = new Set(lavatoryRows.map((item) => Number(item)));
                const wingRowSet = new Set(wingRows.map((item) => Number(item)));
                const extraLegroomRowSet = new Set(
                  extraLegroomRows.map((item) => Number(item))
                );
                const frontRowSet = new Set(frontRows.map((item) => Number(item)));
                const rearRowSet = new Set(rearRows.map((item) => Number(item)));
                const pitchRowSet = new Set(pitchRows.map((item) => Number(item)));
                const exitRowsLabel = formatRowMarkerList(exitRows);
                const doorRowsLabel = formatRowMarkerList(doorRows);
                const lavatoryRowsLabel = formatRowMarkerList(lavatoryRows);
                const wingRowsLabel = formatRowMarkerList(wingRows);
                const extraLegroomRowsLabel = formatRowMarkerList(extraLegroomRows);
                const frontRowsLabel = formatRowMarkerList(frontRows);
                const rearRowsLabel = formatRowMarkerList(rearRows);
                const pitchRowsLabel = formatRowMarkerList(pitchRows);
                const hasLayoutContext =
                  rowRangeLabel ||
                  layoutPatternLabel ||
                  columnSummaryLabel;
                const hasSectionContext =
                  cabinClasses.length ||
                  hasLayoutContext ||
                  aircraftModelLabel ||
                  aircraftDurationLabel ||
                  aircraftDistanceLabel;
                const leftPanelFeatures = [
                  {
                    key: "exit",
                    label: "Exit Rows",
                    value: exitRowsLabel || "Not available",
                    icon: <ExitToAppRounded sx={{ fontSize: 12, color: "#B03030" }} />,
                    color: "#8A1E1E",
                    background: "#FDEEEE",
                    border: "#F2CACA",
                  },
                  {
                    key: "door",
                    label: "Door Rows",
                    value: doorRowsLabel || "Not available",
                    icon: <MeetingRoomRounded sx={{ fontSize: 12, color: "#89652A" }} />,
                    color: "#5B4A2A",
                    background: "#FFF8EC",
                    border: "#F0DEC1",
                  },
                  {
                    key: "lavatory",
                    label: "Lavatory (Washroom)",
                    value: lavatoryRowsLabel || "Not available",
                    icon: <WcRounded sx={{ fontSize: 12, color: "#2B708D" }} />,
                    color: "#2B5A71",
                    background: "#E9F5FA",
                    border: "#CFE6EF",
                  },
                  {
                    key: "wing",
                    label: "Wing Area",
                    value: wingRowsLabel || "Not available",
                    icon: <AirplanemodeActiveRounded sx={{ fontSize: 12, color: "#5A6F84" }} />,
                    color: "#495E73",
                    background: "#EDF2F7",
                    border: "#D8E1EA",
                  },
                ];
                const rightPanelFeatures = [
                  {
                    key: "extra-legroom",
                    label: "Extra Legroom",
                    value: extraLegroomRowsLabel || "Not available",
                    icon: <EventSeatRounded sx={{ fontSize: 12, color: "#2E62A8" }} />,
                    color: "#1F4E8A",
                    background: "#EAF3FF",
                    border: "#CADCF4",
                  },
                  {
                    key: "pitch",
                    label: "Pitch",
                    value:
                      [pitchLabel, pitchRowsLabel ? `Rows ${pitchRowsLabel}` : ""]
                        .filter(Boolean)
                        .join(" • ") || "Not available",
                    icon: <StraightenRounded sx={{ fontSize: 12, color: "#8B6A2F" }} />,
                    color: "#5B4A2A",
                    background: "#FFF6E6",
                    border: "#F0DEC1",
                  },
                  {
                    key: "front",
                    label: "Front Rows",
                    value: frontRowsLabel || "Not available",
                    icon: (
                      <AirplanemodeActiveRounded
                        sx={{ fontSize: 12, color: "#355673", transform: "rotate(90deg)" }}
                      />
                    ),
                    color: "#355673",
                    background: "#EAF2FA",
                    border: "#D2E0EE",
                  },
                  {
                    key: "rear",
                    label: "Rear Rows",
                    value: rearRowsLabel || "Not available",
                    icon: (
                      <AirplanemodeActiveRounded
                        sx={{ fontSize: 12, color: "#355673", transform: "rotate(-90deg)" }}
                      />
                    ),
                    color: "#355673",
                    background: "#EAF2FA",
                    border: "#D2E0EE",
                  },
                ];

                return (
                  <Box
                    key={section?.id || `seat-section-${sectionIndex}`}
                    sx={{
                      border: "1px solid #E4ECF4",
                      borderRadius: "10px",
                      bgcolor: "#FFFFFF",
                      mb: sectionIndex === renderedSeatMapSections.length - 1 ? 0 : "10px",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        px: "11px",
                        py: "9px",
                        borderBottom: "1px solid #EAF1F8",
                        bgcolor: "#F8FBFF",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: "999px",
                              bgcolor: "#E9F2FD",
                              border: "1px solid #CCE0F2",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <AirplanemodeActiveRounded
                              sx={{ fontSize: 16, color: "#1E456D" }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "12px",
                                fontWeight: 800,
                                color: "#203E5D",
                                lineHeight: 1.2,
                              }}
                            >
                              {`Leg ${legNumber} • ${flightLabel}`}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                minWidth: 0,
                                mt: "1px",
                              }}
                            >
                              <ConnectingAirportsRounded
                                sx={{ fontSize: 12, color: "#6A8098", flexShrink: 0 }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: "#607489",
                                  lineHeight: 1.2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {routeLabel || section?.title || `Cabin ${sectionIndex + 1}`}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Chip
                          size="small"
                          label={`${section?.seatCount || 0} seats`}
                          sx={{
                            height: "22px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#3F5D78",
                            background: "#EAF2FA",
                            border: "1px solid #D1DFEE",
                          }}
                        />
                      </Box>

                      {hasSectionContext ? (
                        <Box
                          sx={{
                            width: "100%",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            pt: "8px",
                          }}
                        >
                          {cabinClasses.slice(0, 1).map((item) => (
                            <Chip
                              key={`${section?.id || sectionIndex}-cabin-${item}`}
                              size="small"
                              label={`Cabin: ${item}`}
                              sx={{
                                height: "22px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#1E456D",
                                background: "#E8F2FD",
                                border: "1px solid #CCDEF2",
                              }}
                            />
                          ))}
                          {layoutPatternLabel ? (
                            <Chip
                              key={`${section?.id || sectionIndex}-layout-pattern`}
                              size="small"
                              icon={<ViewColumnRounded sx={{ fontSize: "12px !important" }} />}
                              label={`Layout: ${layoutPatternLabel}`}
                              sx={{
                                height: "22px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#3B4E68",
                                background: "#EDF1F8",
                                border: "1px solid #D6DFEA",
                                "& .MuiChip-icon": { color: "#556B87" },
                              }}
                            />
                          ) : null}
                          {aircraftModelLabel ? (
                            <Chip
                              key={`${section?.id || sectionIndex}-aircraft-model`}
                              size="small"
                              icon={<AirplanemodeActiveRounded sx={{ fontSize: "12px !important" }} />}
                              label={`Aircraft: ${aircraftModelLabel}`}
                              sx={{
                                height: "22px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#234769",
                                background: "#E7F1FC",
                                border: "1px solid #CFE0F2",
                                "& .MuiChip-icon": { color: "#2A5D87" },
                              }}
                            />
                          ) : null}
                        </Box>
                      ) : null}
                      {columnSummaryLabel ? (
                        <Typography
                          sx={{
                            pt: hasSectionContext ? "7px" : 0,
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#5E768E",
                            lineHeight: 1.35,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {`Seat locations: ${columnSummaryLabel}`}
                        </Typography>
                      ) : null}
                      {aircraftDurationLabel || aircraftDistanceLabel ? (
                        <Typography
                          sx={{
                            pt: columnSummaryLabel ? "4px" : hasSectionContext ? "7px" : 0,
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#5E768E",
                            lineHeight: 1.35,
                          }}
                        >
                          {[aircraftDurationLabel ? `Duration ${aircraftDurationLabel}` : "", aircraftDistanceLabel ? `Distance ${aircraftDistanceLabel}` : ""]
                            .filter(Boolean)
                            .join(" • ")}
                        </Typography>
                      ) : null}
                    </Box>

                    <Box sx={{ p: "10px" }}>
                      <Box
                        sx={{
                          display: "grid",
                          gap: "10px",
                          gridTemplateColumns: {
                            xs: "1fr",
                            lg: "165px minmax(0, 1fr) 165px",
                          },
                          alignItems: "start",
                        }}
                      >
                        <Box
                          sx={{
                            order: { xs: 2, lg: 1 },
                            display: "grid",
                            gap: "7px",
                            gridTemplateColumns: {
                              xs: "repeat(2, minmax(0, 1fr))",
                              sm: "repeat(4, minmax(0, 1fr))",
                              lg: "1fr",
                            },
                          }}
                        >
                          {leftPanelFeatures.map((feature) => (
                            <Box
                              key={`${section?.id || sectionIndex}-${feature.key}-left`}
                              sx={{
                                border: `1px solid ${feature.border}`,
                                borderRadius: "10px",
                                bgcolor: feature.background,
                                p: "7px",
                                minWidth: 0,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                                {feature.icon}
                                <Typography
                                  sx={{
                                    fontSize: "10px",
                                    fontWeight: 800,
                                    color: feature.color,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {feature.label}
                                </Typography>
                              </Box>
                              <Typography
                                sx={{
                                  mt: "4px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#37506A",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {feature.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Box
                          sx={{
                            order: { xs: 1, lg: 2 },
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "center", mb: "6px" }}>
                            <Chip
                              size="small"
                              icon={
                                <AirplanemodeActiveRounded
                                  sx={{ fontSize: "12px !important", transform: "rotate(90deg)" }}
                                />
                              }
                              label="Aircraft Front"
                              sx={{
                                height: "22px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#355673",
                                background: "#EAF2FA",
                                border: "1px solid #D2E0EE",
                                "& .MuiChip-icon": { color: "#355673" },
                              }}
                            />
                          </Box>
                          <Box
                            sx={{
                              position: "relative",
                              border: "1px solid #D7E6F5",
                              borderRadius: { xs: "24px", md: "120px 120px 34px 34px" },
                              background:
                                "linear-gradient(180deg, rgba(252,254,255,1) 0%, rgba(239,246,255,1) 100%)",
                              px: { xs: "6px", md: "10px" },
                              py: "10px",
                              overflow: "hidden",
                              width: "fit-content",
                              maxWidth: "100%",
                            }}
                          >
                            <Box
                              sx={{
                                position: "absolute",
                                inset: { md: "8px 10px" },
                                borderLeft: { md: "1px solid rgba(120,151,181,0.25)" },
                                borderRight: { md: "1px solid rgba(120,151,181,0.25)" },
                                borderRadius: { md: "90px" },
                                pointerEvents: "none",
                                display: { xs: "none", md: "block" },
                              }}
                            />
                            <Box
                              sx={{
                                overflowX: "auto",
                                minWidth: 0,
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <Box sx={{ minWidth: `${gridMinWidth}px`, mx: "auto", position: "relative" }}>
                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: gridTemplate,
                                    gap: `${seatCellGap}px`,
                                    alignItems: "center",
                                    mb: "7px",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      textAlign: "center",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      color: "#607489",
                                    }}
                                  >
                                    Row
                                  </Typography>
                                  {columns.map((column) => (
                                    <Typography
                                      key={`${section?.id || sectionIndex}-column-${column}`}
                                      sx={{
                                        textAlign: "center",
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#607489",
                                      }}
                                    >
                                      {column}
                                    </Typography>
                                  ))}
                                  <Typography
                                    sx={{
                                      textAlign: "center",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      color: "#607489",
                                    }}
                                  >
                                    Row
                                  </Typography>
                                </Box>

                                {rows.map((row, rowIndex) => {
                                  const seatByColumn = new Map(
                                    (Array.isArray(row?.seats) ? row.seats : []).map((seat) => [
                                      String(seat?.column || ""),
                                      seat,
                                    ])
                                  );
                                  const rowNumber = Number(
                                    row?.rowNumber || row?.label || rowIndex + 1
                                  );
                                  const rowLabel = row?.label || row?.rowNumber || rowIndex + 1;
                                  const isExitRow = exitRowSet.has(rowNumber);
                                  const isDoorRow = doorRowSet.has(rowNumber);
                                  const isLavatoryRow = lavatoryRowSet.has(rowNumber);
                                  const isWingRow = wingRowSet.has(rowNumber);
                                  const isExtraLegroomRow = extraLegroomRowSet.has(rowNumber);
                                  const isFrontRow = frontRowSet.has(rowNumber);
                                  const isRearRow = rearRowSet.has(rowNumber);
                                  const isPitchRow = pitchRowSet.has(rowNumber);

                                  return (
                                    <Box
                                      key={row?.id || `${section?.id || sectionIndex}-row-${rowIndex}`}
                                      sx={{
                                        display: "grid",
                                        gridTemplateColumns: gridTemplate,
                                        gap: `${seatCellGap}px`,
                                        alignItems: "center",
                                        mb: rowIndex === rows.length - 1 ? 0 : "6px",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          minHeight: `${seatCellHeight}px`,
                                          display: "flex",
                                          flexDirection: "column",
                                          justifyContent: "center",
                                          alignItems: "center",
                                          gap: "2px",
                                          px: "2px",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            textAlign: "center",
                                            fontSize: "10px",
                                            fontWeight: 800,
                                            color: "#203E5D",
                                            lineHeight: 1,
                                          }}
                                        >
                                          {rowLabel}
                                        </Typography>
                                        {isExitRow ? (
                                          <Chip
                                            size="small"
                                            label="EXIT"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#9B1C1C",
                                              bgcolor: "#FDEBEB",
                                              border: "1px solid #F3C3C3",
                                            }}
                                          />
                                        ) : null}
                                        {isDoorRow ? (
                                          <Chip
                                            size="small"
                                            label="DOOR"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#7C5A1F",
                                              bgcolor: "#FFF7E8",
                                              border: "1px solid #F0DDC1",
                                            }}
                                          />
                                        ) : null}
                                        {isLavatoryRow ? (
                                          <Chip
                                            size="small"
                                            label="LAV"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#2E617C",
                                              bgcolor: "#EAF6FB",
                                              border: "1px solid #CFE8F2",
                                            }}
                                          />
                                        ) : null}
                                        {isExtraLegroomRow ? (
                                          <Chip
                                            size="small"
                                            label="XL"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#1F4E8A",
                                              bgcolor: "#EAF3FF",
                                              border: "1px solid #CADCF4",
                                            }}
                                          />
                                        ) : null}
                                      </Box>

                                      {columns.map((column) => {
                                        const seat = seatByColumn.get(column);
                                        if (!seat) {
                                          return (
                                            <Box
                                              key={`${row?.id || rowIndex}-${column}-empty`}
                                              sx={{
                                                width: `${seatCellWidth}px`,
                                                height: `${seatCellHeight}px`,
                                                borderRadius: "8px",
                                                border: "1px dashed #E2EAF3",
                                                bgcolor: isWingRow ? "#F0F5FA" : "#FAFCFE",
                                              }}
                                            />
                                          );
                                        }

                                        const seatTone = getSeatTone(seat.status);
                                        const seatChargeLabel = getSeatChargeLabel(seat);
                                        const characteristicText =
                                          Array.isArray(seat.characteristics) &&
                                          seat.characteristics.length
                                            ? seat.characteristics.join(", ")
                                            : "Not available";
                                        const seatLocationText =
                                          toText(seat?.locationType) || "Not specified";
                                        const seatPitchText =
                                          toText(seat?.pitch) || pitchLabel || "Not specified";
                                        const normalizedCharacteristics = Array.isArray(
                                          seat?.characteristics
                                        )
                                          ? seat.characteristics.map((item) =>
                                              toText(item).toUpperCase()
                                            )
                                          : [];
                                        const hasSeatExtraLegroom =
                                          isExtraLegroomRow ||
                                          normalizedCharacteristics.some(
                                            (item) =>
                                              item.includes("LEGROOM") ||
                                              item.includes("EXTRA") ||
                                              item.includes("BULKHEAD")
                                          );
                                        const hasSeatPitch = Boolean(toText(seat?.pitch));
                                        const seatMetaHint = hasSeatExtraLegroom
                                          ? "XL"
                                          : hasSeatPitch
                                          ? toText(seat?.pitch).replace(/\s+/g, "").slice(0, 5)
                                          : "";
                                        const travelerSelectionScope = {
                                          travelerTypeCode:
                                            selectedSeatTravelerOption?.travelerTypeCode || "",
                                          travelerNumber:
                                            selectedSeatTravelerOption?.travelerNumber || 0,
                                          travelerIndex:
                                            selectedSeatTravelerOption?.travelerIndex ?? -1,
                                          productIdentifier: sectionProductIdentifier,
                                          segmentRef: sectionSegmentRef,
                                        };
                                        const selectionScopeKey =
                                          buildSeatSelectionScopeKey(travelerSelectionScope);
                                        const scopedSelection = Array.isArray(seatSelections)
                                          ? seatSelections.find(
                                              (selection) =>
                                                buildSeatSelectionScopeKey(selection) ===
                                                selectionScopeKey
                                            )
                                          : null;
                                        const isSeatSelected =
                                          Boolean(scopedSelection) &&
                                          normalizeSeatCode(scopedSelection?.seatAssignment) ===
                                            normalizeSeatCode(seat?.code);
                                        const seatShadows = [
                                          isExitRow ? "inset 0 0 0 1px rgba(174,42,42,0.25)" : "",
                                          hasSeatExtraLegroom
                                            ? "inset 0 0 0 1px rgba(46,98,168,0.30)"
                                            : "",
                                          isSeatSelected
                                            ? "0 0 0 2px rgba(8,91,160,0.28)"
                                            : "",
                                        ]
                                          .filter(Boolean)
                                          .join(", ");
                                        const isSeatDisabled = seat?.status === "unavailable";
                                        const isSeatSelectable =
                                          seat?.status === "available" || seat?.status === "paid";
                                        const seatSelectionDisabled =
                                          !isSeatSelectable ||
                                          !selectedSeatTravelerOption ||
                                          !sectionProductIdentifier ||
                                          !toText(seatAvailabilityRequest?.offerListIdentifier) ||
                                          !toText(seatAvailabilityRequest?.offerIdentifier);

                                        return (
                                          <Tooltip
                                            key={`${row?.id || rowIndex}-${column}-${seat.code}`}
                                            arrow
                                            placement="top"
                                            title={
                                              <Box sx={{ py: "2px" }}>
                                                <Typography sx={{ fontSize: "11px", fontWeight: 700 }}>
                                                  Seat {seat.code}
                                                </Typography>
                                                <Typography sx={{ fontSize: "10px", mt: "2px" }}>
                                                  Type: {seat.status === "available" ? "Free" : seatTone.label}
                                                </Typography>
                                                <Typography sx={{ fontSize: "10px", mt: "2px" }}>
                                                  Charge: {seat.status === "available" ? "Free" : seatChargeLabel}
                                                </Typography>
                                                <Typography sx={{ fontSize: "10px", mt: "2px" }}>
                                                  Location: {seatLocationText}
                                                </Typography>
                                                <Typography sx={{ fontSize: "10px", mt: "2px" }}>
                                                  Pitch: {seatPitchText}
                                                </Typography>
                                                <Typography sx={{ fontSize: "10px", mt: "2px" }}>
                                                  Attributes: {characteristicText}
                                                </Typography>
                                                {selectedSeatTravelerOption ? (
                                                  <Typography sx={{ fontSize: "10px", mt: "2px" }}>
                                                    Assigning for: {selectedSeatTravelerOption.label}
                                                  </Typography>
                                                ) : null}
                                                {isSeatSelected ? (
                                                  <Typography
                                                    sx={{
                                                      fontSize: "10px",
                                                      mt: "2px",
                                                      fontWeight: 700,
                                                      color: "#0B5E9A",
                                                    }}
                                                  >
                                                    Selected
                                                  </Typography>
                                                ) : null}
                                              </Box>
                                            }
                                          >
                                            <Box
                                              onClick={() => {
                                                if (seatSelectionDisabled) return;
                                                const nextSelection = {
                                                  offerListIdentifier: toText(
                                                    seatAvailabilityRequest?.offerListIdentifier
                                                  ),
                                                  offerIdentifier: toText(
                                                    seatAvailabilityRequest?.offerIdentifier
                                                  ),
                                                  productIdentifier: sectionProductIdentifier,
                                                  travelerTypeCode:
                                                    selectedSeatTravelerOption?.travelerTypeCode,
                                                  travelerNumber:
                                                    selectedSeatTravelerOption?.travelerNumber,
                                                  travelerIndex:
                                                    selectedSeatTravelerOption?.travelerIndex,
                                                  segmentRef: sectionSegmentRef,
                                                  seatAssignment: seat.code,
                                                };
                                                const currentSelections = Array.isArray(
                                                  seatSelections
                                                )
                                                  ? seatSelections
                                                  : [];
                                                const nextSelections = currentSelections.filter(
                                                  (selection) =>
                                                    buildSeatSelectionScopeKey(selection) !==
                                                    selectionScopeKey
                                                );
                                                const isToggleOff =
                                                  isSeatSelected &&
                                                  normalizeSeatCode(
                                                    scopedSelection?.seatAssignment
                                                  ) === normalizeSeatCode(seat.code);
                                                if (!isToggleOff) {
                                                  nextSelections.push(nextSelection);
                                                }
                                                onSeatSelectionsChange(nextSelections);
                                              }}
                                              sx={{
                                                width: `${seatCellWidth}px`,
                                                height: `${seatCellHeight}px`,
                                                borderRadius: "8px",
                                                border: `1px solid ${
                                                  isSeatSelected
                                                    ? "#0B5E9A"
                                                    : hasSeatExtraLegroom
                                                    ? "#7FA6D8"
                                                    : seatTone.border
                                                }`,
                                                bgcolor: isSeatSelected
                                                  ? "#E4F1FF"
                                                  : seatTone.background,
                                                color: seatTone.color,
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                letterSpacing: "0.2px",
                                                lineHeight: 1.1,
                                                gap: "1px",
                                                boxShadow: seatShadows || "none",
                                                opacity: isSeatDisabled ? 0.6 : 1,
                                                cursor: seatSelectionDisabled
                                                  ? "not-allowed"
                                                  : "pointer",
                                                transition:
                                                  "transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease",
                                                "&:hover": seatSelectionDisabled
                                                  ? {}
                                                  : {
                                                      transform: "translateY(-1px)",
                                                      boxShadow:
                                                        seatShadows ||
                                                        "0 4px 10px rgba(17,57,90,0.15)",
                                                    },
                                              }}
                                            >
                                              {isSeatSelected ? (
                                                <CheckCircleRounded
                                                  sx={{
                                                    fontSize: "13px",
                                                    color: "#0B5E9A",
                                                    lineHeight: 1,
                                                  }}
                                                />
                                              ) : (
                                                <EventSeatRounded
                                                  sx={{ fontSize: "14px", color: seatTone.color, lineHeight: 1 }}
                                                />
                                              )}
                                              <Typography sx={{ fontSize: "8px", fontWeight: 700, lineHeight: 1 }}>
                                                {seat.code}
                                              </Typography>
                                              {seatMetaHint ? (
                                                <Typography
                                                  sx={{
                                                    fontSize: "7px",
                                                    fontWeight: 800,
                                                    lineHeight: 1,
                                                    color: hasSeatExtraLegroom ? "#1F4E8A" : "#4E6178",
                                                  }}
                                                >
                                                  {seatMetaHint}
                                                </Typography>
                                              ) : null}
                                            </Box>
                                          </Tooltip>
                                        );
                                      })}

                                      <Box
                                        sx={{
                                          minHeight: `${seatCellHeight}px`,
                                          display: "flex",
                                          flexDirection: "column",
                                          justifyContent: "center",
                                          alignItems: "center",
                                          gap: "2px",
                                          px: "2px",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            textAlign: "center",
                                            fontSize: "10px",
                                            fontWeight: 800,
                                            color: "#203E5D",
                                            lineHeight: 1,
                                          }}
                                        >
                                          {rowLabel}
                                        </Typography>
                                        {isFrontRow ? (
                                          <Chip
                                            size="small"
                                            label="FRONT"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#355673",
                                              bgcolor: "#EAF2FA",
                                              border: "1px solid #D2E0EE",
                                            }}
                                          />
                                        ) : null}
                                        {isRearRow ? (
                                          <Chip
                                            size="small"
                                            label="REAR"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#355673",
                                              bgcolor: "#EAF2FA",
                                              border: "1px solid #D2E0EE",
                                            }}
                                          />
                                        ) : null}
                                        {isPitchRow ? (
                                          <Chip
                                            size="small"
                                            label="PITCH"
                                            sx={{
                                              height: "14px",
                                              borderRadius: "999px",
                                              fontSize: "8px",
                                              fontWeight: 800,
                                              color: "#7C5A1F",
                                              bgcolor: "#FFF7E8",
                                              border: "1px solid #F0DDC1",
                                            }}
                                          />
                                        ) : null}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "center", mt: "6px" }}>
                            <Chip
                              size="small"
                              icon={
                                <AirplanemodeActiveRounded
                                  sx={{ fontSize: "12px !important", transform: "rotate(-90deg)" }}
                                />
                              }
                              label="Aircraft Rear"
                              sx={{
                                height: "22px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#355673",
                                background: "#EAF2FA",
                                border: "1px solid #D2E0EE",
                                "& .MuiChip-icon": { color: "#355673" },
                              }}
                            />
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            order: { xs: 3, lg: 3 },
                            display: "grid",
                            gap: "7px",
                            gridTemplateColumns: {
                              xs: "repeat(2, minmax(0, 1fr))",
                              sm: "repeat(4, minmax(0, 1fr))",
                              lg: "1fr",
                            },
                          }}
                        >
                          {rightPanelFeatures.map((feature) => (
                            <Box
                              key={`${section?.id || sectionIndex}-${feature.key}-right`}
                              sx={{
                                border: `1px solid ${feature.border}`,
                                borderRadius: "10px",
                                bgcolor: feature.background,
                                p: "7px",
                                minWidth: 0,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                                {feature.icon}
                                <Typography
                                  sx={{
                                    fontSize: "10px",
                                    fontWeight: 800,
                                    color: feature.color,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {feature.label}
                                </Typography>
                              </Box>
                              <Typography
                                sx={{
                                  mt: "4px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#37506A",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {feature.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>

                    {sectionCharacteristics.length ? (
                      <Box
                        sx={{
                          px: "10px",
                          pb: "10px",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {sectionCharacteristics.map((item) => (
                          <Chip
                            key={`${section?.id || sectionIndex}-char-${item}`}
                            size="small"
                            label={item}
                            sx={{
                              height: "22px",
                              borderRadius: "999px",
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#37546F",
                              background: "#EDF4FB",
                              border: "1px solid #D4E1EE",
                            }}
                          />
                        ))}
                      </Box>
                    ) : null}
                  </Box>
                );
              })
              )}
            </Box>
          ) : hasSeatAvailabilityData ? (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: "10px",
                bgcolor: "#F7FAFD",
                border: "1px solid #E3EBF4",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#27496A",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {seatMapResponseJson}
            </Box>
          ) : (
            <Typography sx={{ fontSize: "12px", color: "#607489" }}>
              Seat map response is not available.
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFarePolicyModalOpen}
        onClose={() => setIsFarePolicyModalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontSize: "15px", fontWeight: 700 }}>
          Fare Policy
        </DialogTitle>
        <DialogContent dividers>
          {policyLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px", py: "8px" }}>
              <CircularProgress size={16} />
              <Typography sx={{ fontSize: "12px", color: "#607489" }}>
                Loading fare policy...
              </Typography>
            </Box>
          ) : (
            <>
              {policyError ? (
                <Typography sx={{ fontSize: "12px", color: "#AE2A2A", mb: "10px" }}>
                  {policyError}
                </Typography>
              ) : null}

              <Box
                sx={{
                  border: "1px solid #E4ECF4",
                  borderRadius: "10px",
                  overflow: "hidden",
                  mb: "10px",
                }}
              >
                <Tabs
                  value={activePolicyTab}
                  onChange={(_, value) => setActivePolicyTab(value)}
                  variant="fullWidth"
                  sx={{
                    minHeight: "40px",
                    bgcolor: "#F6FAFF",
                    "& .MuiTab-root": {
                      minHeight: "40px",
                      textTransform: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#4D637A",
                    },
                    "& .Mui-selected": {
                      color: "#1E456D",
                    },
                    "& .MuiTabs-indicator": {
                      height: "3px",
                    },
                  }}
                >
                  <Tab value="long" label="Long Text" />
                  <Tab value="short" label="Short Text" />
                </Tabs>
              </Box>

              <Box
                sx={{
                  border: "1px solid #E4ECF4",
                  borderRadius: "10px",
                  p: "10px",
                  bgcolor: "#FBFDFF",
                }}
              >
                <Typography sx={{ ...labelSx, fontSize: "12px", mb: "6px" }}>
                  {activePolicyTab === "long"
                    ? "Long Text Policy By Category"
                    : "Short Text Policy By Category"}
                </Typography>

                {(activePolicyTab === "long"
                  ? longTextPolicyCategories
                  : shortTextPolicyCategories
                ).length ? (
                  (activePolicyTab === "long"
                    ? longTextPolicyCategories
                    : shortTextPolicyCategories
                  ).map((categoryItem, index) => (
                    <Box
                      key={`${activePolicyTab}-category-${categoryItem.category}-${index}`}
                      sx={{ mb: "10px" }}
                    >
                      <Typography
                        sx={{
                          fontSize: "11px",
                          color: "#1E456D",
                          fontWeight: 700,
                          lineHeight: 1.4,
                        }}
                      >
                        {`${index + 1}. ${categoryItem.category}`}
                      </Typography>
                      {categoryItem.details.map((line, detailIndex) => (
                        <Typography
                          key={`${activePolicyTab}-line-${index}-${detailIndex}`}
                          sx={{
                            fontSize: "11px",
                            color: "#415B74",
                            fontWeight: 600,
                            lineHeight: 1.45,
                            mt: "3px",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {line}
                        </Typography>
                      ))}
                    </Box>
                  ))
                ) : (
                  <Typography sx={{ fontSize: "11px", color: "#607489", fontWeight: 600 }}>
                    {activePolicyTab === "long"
                      ? "Long text fare policy not available."
                      : "Short text fare policy not available."}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RightSidebarInfo;
