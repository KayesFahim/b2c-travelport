const RECENT_SEARCHES_KEY = "flyjatt:recent_searches";
const MAX_RECENT_SEARCHES = 6;

function toUpperText(value) {
  return String(value ?? "").trim().toUpperCase();
}

function toText(value) {
  return String(value ?? "").trim();
}

function toSafeDateString(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeSegments(segments) {
  if (!Array.isArray(segments)) {
    return [];
  }

  return segments
    .map((segment) => {
      const depfrom = toUpperText(segment?.depfrom ?? segment?.DepFrom);
      const arrto = toUpperText(segment?.arrto ?? segment?.ArrTo);
      const depdate = toSafeDateString(segment?.depdate ?? segment?.Date);
      const depFromText = toText(segment?.depFromText);
      const arrToText = toText(segment?.arrToText);

      if (!depfrom || !arrto || !depdate) {
        return null;
      }

      return {
        depfrom,
        arrto,
        depdate,
        depFromText,
        arrToText,
      };
    })
    .filter(Boolean);
}

function buildFingerprint(entry) {
  const segments = Array.isArray(entry?.segments) ? entry.segments : [];
  const segmentKey = segments
    .map((segment) => `${segment.depfrom}-${segment.arrto}-${segment.depdate}`)
    .join("|");

  return [
    entry?.tripType || "",
    segmentKey,
    Number(entry?.adultCount || 0),
    Number(entry?.childCount || 0),
    Number(entry?.infantCount || 0),
    toText(entry?.cabinClass),
  ].join("::");
}

export function readRecentSearches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((item) => item && typeof item === "object")
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function saveRecentSearch(entryInput) {
  if (typeof window === "undefined" || !entryInput || typeof entryInput !== "object") {
    return [];
  }

  const normalizedSegments = normalizeSegments(entryInput.segments);
  if (normalizedSegments.length === 0) {
    return readRecentSearches();
  }

  const firstSegment = normalizedSegments[0];
  const lastSegment = normalizedSegments[normalizedSegments.length - 1];

  const departureDate =
    toSafeDateString(entryInput.departureDate) || firstSegment.depdate;
  const returnDate = toSafeDateString(entryInput.returnDate);

  const normalizedEntry = {
    id:
      toText(entryInput.id) ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tripType: toText(entryInput.tripType || "oneway").toLowerCase(),
    fromCode: toUpperText(entryInput.fromCode || firstSegment.depfrom),
    toCode: toUpperText(entryInput.toCode || lastSegment.arrto),
    fromLabel: toText(entryInput.fromLabel || firstSegment.depFromText || firstSegment.depfrom),
    toLabel: toText(entryInput.toLabel || lastSegment.arrToText || lastSegment.arrto),
    fromAddress: toText(entryInput.fromAddress),
    toAddress: toText(entryInput.toAddress),
    departureDate,
    returnDate,
    adultCount: Number(entryInput.adultCount || 1),
    childCount: Number(entryInput.childCount || 0),
    infantCount: Number(entryInput.infantCount || 0),
    cabinClass: toText(entryInput.cabinClass || "1"),
    segments: normalizedSegments,
    searchedAt: new Date().toISOString(),
  };

  const existing = readRecentSearches();
  const fingerprint = buildFingerprint(normalizedEntry);
  const deduped = existing.filter(
    (item) => buildFingerprint(item) !== fingerprint
  );
  const next = [normalizedEntry, ...deduped].slice(0, MAX_RECENT_SEARCHES);

  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    return deduped.slice(0, MAX_RECENT_SEARCHES);
  }

  return next;
}

export { RECENT_SEARCHES_KEY };
