import React from "react";
import { useLocation } from "react-router-dom";
import OneWaySearchResult from "../OneWay/OneWaySearchResult";
import RoundWaySearchResult from "../RoundWay/RoundWaySearchResult";
import MultiCitySearchResult from "../MultiCity/MultiCitySearchResult";

const normalizeTripValue = (value) => String(value || "").trim().toLowerCase();

const getSegmentsFromState = (state) => {
  if (Array.isArray(state?.segments) && state.segments.length > 0) {
    return state.segments;
  }

  if (
    Array.isArray(state?.searchData?.segments) &&
    state.searchData.segments.length > 0
  ) {
    return state.searchData.segments;
  }

  return [];
};

const resolveResultView = (state) => {
  const trip = normalizeTripValue(state?.valueBox || state?.tripType);
  const segments = getSegmentsFromState(state);

  if (trip === "multicity") {
    return "multicity";
  }

  if (["roundway", "roundtrip", "return"].includes(trip)) {
    return "roundway";
  }

  if (trip === "oneway") {
    return "oneway";
  }

  if (segments.length > 2) {
    return "multicity";
  }

  if (segments.length === 2) {
    return "roundway";
  }

  return "oneway";
};

const FlightsResult = () => {
  const location = useLocation();
  const state = location?.state || {};
  const view = resolveResultView(state);

  if (view === "multicity") {
    return <MultiCitySearchResult />;
  }

  if (view === "roundway") {
    return <RoundWaySearchResult />;
  }

  return <OneWaySearchResult />;
};

export default FlightsResult;

