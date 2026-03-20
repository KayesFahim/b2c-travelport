const DEFAULT_CURRENCY = "BDT";

function toText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    if (typeof value.value === "string") {
      return value.value.trim();
    }
    if (typeof value.code === "string") {
      return value.code.trim();
    }
  }
  return "";
}

function normalizeCurrencyCode(value) {
  const text = toText(value);
  return text ? text.toUpperCase() : "";
}

function getNestedValue(obj, path) {
  return path.reduce((acc, key) => {
    if (acc && typeof acc === "object") {
      return acc[key];
    }
    return undefined;
  }, obj);
}

function compactUnique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    if (!value) continue;
    const normalized = value.trim();
    if (!normalized) continue;
    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    output.push(normalized);
  }

  return output;
}

export function getFlightCurrencyCode(flightData) {
  if (!flightData || typeof flightData !== "object") {
    return DEFAULT_CURRENCY;
  }

  const currencyCandidates = [
    flightData.CurrencyCode,
    flightData.currencyCode,
    getNestedValue(flightData, ["PriceBreakDown", 0, "CurrencyCode"]),
    getNestedValue(flightData, ["PriceBreakDown", 0, "currencyCode"]),
    getNestedValue(flightData, ["PriceBreakDown", 0, "Amount", "CurrencyCode"]),
    getNestedValue(flightData, ["PriceBreakDown", 0, "Amount", "currencyCode"]),
    getNestedValue(flightData, ["BestCombinablePrice", "CurrencyCode"]),
  ];

  for (const candidate of currencyCandidates) {
    const normalized = normalizeCurrencyCode(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_CURRENCY;
}

export function getCurrencySymbol(currencyCode, locale = "en") {
  const normalizedCode = normalizeCurrencyCode(currencyCode) || DEFAULT_CURRENCY;
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const symbolPart = formatter
      .formatToParts(0)
      .find((part) => part.type === "currency");
    const symbol = symbolPart?.value?.trim();
    return symbol || normalizedCode;
  } catch (error) {
    return normalizedCode;
  }
}

export function normalizeFareRulesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.fareRules,
    payload.FareRules,
    payload.preBookingFares,
    payload.PreBookingFares,
    payload.preBookingFareRules,
    payload.PreBookingFareRules,
    payload.data,
    payload.result,
    payload.results,
    payload.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizeMiniRulesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.miniRules,
    payload.MiniRules,
    payload.rules,
    payload.Rules,
    payload.data,
    payload.result,
    payload.results,
    payload.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function pickTimeFrame(rule) {
  if (!rule || typeof rule !== "object") return "";

  const directCandidates = [
    rule.timeFrame,
    rule.TimeFrame,
    rule.timeframe,
    rule.Timeframe,
    rule.window,
    rule.Window,
    rule.period,
    rule.Period,
    rule.duration,
    rule.Duration,
    rule.label,
    rule.Label,
    rule.title,
    rule.Title,
  ];

  for (const candidate of directCandidates) {
    const text = toText(candidate);
    if (text) return text;
  }

  const from = toText(rule.from || rule.From || rule.start || rule.Start);
  const to = toText(rule.to || rule.To || rule.end || rule.End);
  if (from || to) {
    return [from || "From", to || "To"].filter(Boolean).join(" to ");
  }

  return "";
}

function collectRuleEntries(rule, mode) {
  if (!rule || typeof rule !== "object") return [];

  const modeKeyWords =
    mode === "dateChange"
      ? ["change", "date", "reissue", "reschedule"]
      : ["cancel", "refund", "void"];
  const alwaysInclude = ["fee", "charge", "policy", "penalty", "amount"];

  const entries = [];
  const stack = [{ value: rule, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || current.depth > 3) continue;

    const { value, depth } = current;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          stack.push({ value: item, depth: depth + 1 });
        }
      }
      continue;
    }

    if (!value || typeof value !== "object") continue;

    for (const [key, rawValue] of Object.entries(value)) {
      if (rawValue === null || rawValue === undefined) continue;
      const keyLower = key.toLowerCase();

      if (typeof rawValue === "object") {
        stack.push({ value: rawValue, depth: depth + 1 });
        continue;
      }

      const text = toText(rawValue);
      if (!text) continue;

      const hasModeKeyword = modeKeyWords.some((word) =>
        keyLower.includes(word)
      );
      const hasPolicyKeyword = alwaysInclude.some((word) =>
        keyLower.includes(word)
      );

      if (hasModeKeyword || hasPolicyKeyword) {
        entries.push(`${key}: ${text}`);
      } else if (modeKeyWords.some((word) => text.toLowerCase().includes(word))) {
        entries.push(text);
      }
    }
  }

  return compactUnique(entries);
}

export function extractMiniRuleRows(payload, mode) {
  const rules = normalizeMiniRulesPayload(payload);
  if (!rules.length) return [];

  return rules.map((rule, index) => {
    const timeFrame = pickTimeFrame(rule) || `Rule ${index + 1}`;
    const details = collectRuleEntries(rule, mode);

    return {
      id: `${mode}-${index}`,
      timeFrame,
      details: details.length ? details : ["Policy details available from API"],
    };
  });
}

function stripHtml(value) {
  return toText(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPenaltyList(payload, mode) {
  if (!payload || typeof payload !== "object") return [];
  const source =
    payload.penaltiesCancellation ||
    payload.PenaltiesCancellation ||
    payload.penalties ||
    payload.Penalties ||
    {};
  const key = mode === "dateChange" ? "change" : "cancel";
  const fallbackKey = mode === "dateChange" ? "Change" : "Cancel";
  const list = source[key] || source[fallbackKey] || [];
  return Array.isArray(list) ? list : [];
}

function formatPenaltyAmount(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  if (typeof amount === "string" || typeof amount === "number") {
    return String(amount);
  }
  if (typeof amount !== "object") return "";

  const text = toText(amount.text || amount.Text);
  if (text) return text;

  const currency = toText(
    amount.currencyCode ||
      amount.CurrencyCode ||
      amount.currency ||
      amount.Currency
  );
  const value = toText(
    amount.value || amount.Value || amount.amount || amount.Amount
  );
  return [currency, value].filter(Boolean).join(" ").trim();
}

function normalizePenaltyDetails(penalty, mode) {
  if (!penalty || typeof penalty !== "object") {
    return [];
  }

  const penaltyTypes = Array.isArray(penalty.penaltyTypes)
    ? penalty.penaltyTypes
    : Array.isArray(penalty.PenaltyTypes)
      ? penalty.PenaltyTypes
      : [];
  const passengerTypeCodes = Array.isArray(penalty.passengerTypeCodes)
    ? penalty.passengerTypeCodes
    : Array.isArray(penalty.PassengerTypeCodes)
      ? penalty.PassengerTypeCodes
      : [];
  const appliesTo = toText(
    penalty.appliesTo ||
      penalty.AppliesTo ||
      penalty.application ||
      penalty.Application
  );
  const amountText = formatPenaltyAmount(
    penalty.amount ||
      penalty.Amount ||
      penalty.penaltyAmount ||
      penalty.PenaltyAmount ||
      penalty.fee ||
      penalty.Fee
  );
  const details = Array.isArray(penalty.details)
    ? penalty.details.map((item) => stripHtml(item)).filter(Boolean)
    : [];
  const normalizedPassengerTypes = passengerTypeCodes
    .map((item) => toText(item))
    .filter(Boolean);
  const normalizedPenaltyTypes = penaltyTypes
    .map((item) => toText(item))
    .filter(Boolean);

  return {
    timeFrame:
      normalizedPenaltyTypes.join(", ") ||
      `Policy ${mode === "dateChange" ? "Change" : "Cancel"}`,
    details: compactUnique([
      `passengerTypeCodes: ${
        normalizedPassengerTypes.length
          ? normalizedPassengerTypes.join(", ")
          : "ALL"
      }`,
      `penaltyTypes: ${
        normalizedPenaltyTypes.length
          ? normalizedPenaltyTypes.join(", ")
          : "Anytime"
      }`,
      `appliesTo: ${appliesTo || "N/A"}`,
      `amount: ${amountText || "null"}`,
      ...details,
    ]),
  };
}

function extractPenaltyRowsFromFareRules(payload, mode) {
  const modeKeyWords =
    mode === "dateChange"
      ? ["change", "date", "reissue", "reschedule"]
      : ["cancel", "refund", "void"];
  const fareRules = normalizeFareRulesPayload(payload);
  const rows = [];

  for (let index = 0; index < fareRules.length; index += 1) {
    const rule = fareRules[index];
    const route = toText(rule.route || rule.Route || `Rule ${index + 1}`);
    const paxInfos = Array.isArray(rule.fareRulePaxInfos)
      ? rule.fareRulePaxInfos
      : Array.isArray(rule.FareRulePaxInfos)
        ? rule.FareRulePaxInfos
        : [];

    for (const paxInfo of paxInfos) {
      const paxType = toText(paxInfo.paxType || paxInfo.PaxType || "ALL");
      const ruleInfos = Array.isArray(paxInfo.fareRuleInfos)
        ? paxInfo.fareRuleInfos
        : Array.isArray(paxInfo.FareRuleInfos)
          ? paxInfo.FareRuleInfos
          : [];

      for (const info of ruleInfos) {
        const category = toText(info.category || info.Category || "Rule");
        const message = stripHtml(info.info || info.Info);
        const combined = `${category} ${message}`.toLowerCase();
        if (!combined) continue;

        const hasKeyword = modeKeyWords.some((word) => combined.includes(word));
        if (!hasKeyword) continue;

        rows.push({
          id: `${mode}-fare-rule-${rows.length}`,
          timeFrame: category || route,
          details: compactUnique([
            route,
            paxType ? `Passenger Type: ${paxType}` : "",
            message,
          ]),
        });
      }
    }
  }

  return rows;
}

export function extractUnifiedPenaltyRows(payload, mode) {
  const penalties = getPenaltyList(payload, mode);
  if (penalties.length > 0) {
    const rows = penalties
      .map((penalty, index) => {
        const normalized = normalizePenaltyDetails(penalty, mode);
        if (!normalized.timeFrame && normalized.details.length === 0) {
          return null;
        }

        return {
          id: `${mode}-penalty-${index}`,
          timeFrame: normalized.timeFrame || `Rule ${index + 1}`,
          details: normalized.details.length
            ? normalized.details
            : ["Policy details available from API"],
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      return rows;
    }
  }

  return extractPenaltyRowsFromFareRules(payload, mode);
}
