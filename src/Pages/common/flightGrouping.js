const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSafeText = (value) => String(value ?? "").trim();

const normalizeDateTimeMinute = (value) => {
  const raw = toSafeText(value);
  if (!raw) return "";

  const normalizedIsoLike = raw.replace(" ", "T");
  const isoMinuteMatch = normalizedIsoLike.match(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
  );
  if (isoMinuteMatch) {
    return isoMinuteMatch[0];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  const h = String(parsed.getUTCHours()).padStart(2, "0");
  const min = String(parsed.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

const normalizeDateOnly = (value) => {
  const minuteValue = normalizeDateTimeMinute(value);
  if (!minuteValue) return "";
  const match = minuteValue.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : minuteValue.slice(0, 10);
};

const getSegmentSignature = (segment) => {
  const carrier = toSafeText(segment?.MarketingCarrier);
  const flightNumber = toSafeText(segment?.MarketingFlightNumber);
  const depFrom = toSafeText(segment?.DepFrom);
  const arrTo = toSafeText(segment?.ArrTo);
  const depTime = normalizeDateTimeMinute(segment?.DepTime);
  const arrTime = normalizeDateTimeMinute(segment?.ArrTime);
  return `${carrier}-${flightNumber}-${depFrom}-${arrTo}-${depTime}-${arrTime}`;
};

const getFlightGroupSignatureStrict = (flight) => {
  const legs = Array.isArray(flight?.AllLegsInfo) ? flight.AllLegsInfo : [];

  return legs
    .map((leg) => {
      const segments = Array.isArray(leg?.Segments) ? leg.Segments : [];
      const firstSegment = segments[0] || {};
      const lastSegment = segments[segments.length - 1] || {};
      const depDate = normalizeDateOnly(leg?.DepDate || firstSegment?.DepTime);
      const depFrom = toSafeText(leg?.DepFrom || firstSegment?.DepFrom);
      const arrTo = toSafeText(leg?.ArrTo || lastSegment?.ArrTo);
      const legDuration = toSafeText(leg?.Duration);
      const segmentSignature = segments.map(getSegmentSignature).join(">");
      return `${depDate}:${depFrom}-${arrTo}:${legDuration}:${segmentSignature}`;
    })
    .join("|");
};

const getFlightGroupSignatureLoose = (flight) => {
  const legs = Array.isArray(flight?.AllLegsInfo) ? flight.AllLegsInfo : [];

  return legs
    .map((leg) => {
      const segments = Array.isArray(leg?.Segments) ? leg.Segments : [];
      const firstSegment = segments[0] || {};
      const lastSegment = segments[segments.length - 1] || {};
      const depDate = normalizeDateOnly(leg?.DepDate || firstSegment?.DepTime);
      const depFrom = toSafeText(leg?.DepFrom || firstSegment?.DepFrom);
      const arrTo = toSafeText(leg?.ArrTo || lastSegment?.ArrTo);
      const segmentSignature = segments
        .map((segment) => {
          const carrier = toSafeText(segment?.MarketingCarrier);
          const flightNumber = toSafeText(segment?.MarketingFlightNumber);
          const from = toSafeText(segment?.DepFrom);
          const to = toSafeText(segment?.ArrTo);
          const depDateOnly = normalizeDateOnly(segment?.DepTime);
          return `${carrier}-${flightNumber}-${from}-${to}-${depDateOnly}`;
        })
        .join(">");

      return `${depDate}:${depFrom}-${arrTo}:${segmentSignature}`;
    })
    .join("|");
};

export const getFlightGroupSignature = (flight) =>
  getFlightGroupSignatureStrict(flight);

const getBrandDedupeKey = (flight) => {
  const firstLeg =
    (Array.isArray(flight?.AllLegsInfo) ? flight.AllLegsInfo[0] : null) || {};
  const brandCode = toSafeText(firstLeg?.BrandCode);
  const brandName = toSafeText(firstLeg?.BrandName);
  const brandTier = toSafeText(firstLeg?.BrandFeatures?.tier);
  return [brandCode, brandName, brandTier].filter(Boolean).join("-");
};

const buildGroupedFlights = (flights = [], signatureBuilder) => {
  const groupedMap = new Map();

  for (const flight of Array.isArray(flights) ? flights : []) {
    const key = signatureBuilder(flight);
    if (!groupedMap.has(key)) {
      groupedMap.set(key, []);
    }
    groupedMap.get(key).push(flight);
  }

  return Array.from(groupedMap.entries()).map(([key, items]) => {
    const deduped = Array.from(
      new Map(
        [...items].map((item, index) => {
          const resultId = toSafeText(item?.ResultId);
          const brandKey = getBrandDedupeKey(item);
          const fareKey = toSafeText(item?.NetFare ?? item?.GrossFare);
          const fallbackKey = `${toSafeText(item?.SearchId)}-${toSafeText(
            item?.Carrier
          )}-${toSafeText(item?.NetFare)}-${index}`;
          const dedupeKey =
            [resultId, brandKey, fareKey].filter(Boolean).join("|") || fallbackKey;
          return [dedupeKey, item];
        })
      ).values()
    );

    const options = deduped.sort(
      (a, b) =>
        toSafeNumber(a?.NetFare ?? a?.GrossFare, Number.MAX_SAFE_INTEGER) -
        toSafeNumber(b?.NetFare ?? b?.GrossFare, Number.MAX_SAFE_INTEGER)
    );

    return {
      key,
      primary: options[0] || null,
      options,
      count: options.length,
    };
  });
};

export const groupFlightsBySchedule = (flights = []) => {
  const strictGroups = buildGroupedFlights(flights, getFlightGroupSignatureStrict);
  const hasGroupedBrands = strictGroups.some((group) => group?.count > 1);

  const groupedFlights = hasGroupedBrands
    ? strictGroups
    : buildGroupedFlights(flights, getFlightGroupSignatureLoose);

  return groupedFlights.sort(
    (a, b) =>
      toSafeNumber(
        a?.primary?.NetFare ?? a?.primary?.GrossFare,
        Number.MAX_SAFE_INTEGER
      ) -
      toSafeNumber(
        b?.primary?.NetFare ?? b?.primary?.GrossFare,
        Number.MAX_SAFE_INTEGER
      )
  );
};
