import type { NextApiRequest, NextApiResponse } from "next";

type FarePolicyBody = {
  offerIdentifier?: string;
  resultId?: string;
  ResultId?: string;
  fareRuleType?: string;
};

type ErrorResponse = {
  message: string;
  details?: string;
};

type NormalizedFareRuleInfo = {
  category: string;
  info: string;
};

type NormalizedFareRulePaxInfo = {
  paxType: string;
  fareBasisCode: string;
  fareRuleInfos: NormalizedFareRuleInfo[];
};

type NormalizedFareRule = {
  route: string;
  fareRulePaxInfos: NormalizedFareRulePaxInfo[];
};

type PenaltyAmount = {
  value: number | null;
  currencyCode: string | null;
  text: string | null;
} | null;

type PenaltyEntry = {
  passengerTypeCodes: string[];
  penaltyTypes: string[];
  appliesTo: string | null;
  amount: PenaltyAmount;
  details: string[];
};

type PenaltySummary = {
  change: PenaltyEntry[];
  cancel: PenaltyEntry[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function formatLabel(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (typeof source.value === "string") return source.value.trim();
    if (typeof source.code === "string") return source.code.trim();
  }
  return "";
}

function collectDetailLines(
  value: unknown,
  prefix = "",
  depth = 0,
  collector: string[] = []
): string[] {
  if (depth > 4) return collector;

  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const text = stringifyValue(value);
    if (text) {
      collector.push(prefix ? `${prefix}: ${text}` : text);
    }
    return collector;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectDetailLines(item, prefix, depth + 1, collector);
    }
    return collector;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key !== "@type"
    );

    if (!entries.length) {
      const text = stringifyValue(value);
      if (text) collector.push(prefix ? `${prefix}: ${text}` : text);
      return collector;
    }

    for (const [key, nestedValue] of entries) {
      const label = formatLabel(key);
      const nextPrefix = prefix ? `${prefix} • ${label}` : label;
      collectDetailLines(nestedValue, nextPrefix, depth + 1, collector);
    }
  }

  return collector;
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function compactUnique(values: string[]): string[] {
  return uniqueLines(values);
}

function toArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueLines(value.map((item) => stringifyValue(item)).filter(Boolean));
  }

  const text = stringifyValue(value);
  if (!text) return [];
  return uniqueLines(
    text
      .split(/[|,/]|(?:\s{2,})/g)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function buildRouteFromFlightRefs(
  refs: string[],
  flightMap: Map<string, string>,
  fallbackIndex: number
): string {
  const route = refs.map((ref) => flightMap.get(ref) || ref).join(" / ");
  return route || `Rule ${fallbackIndex + 1}`;
}

function normalizePenaltyAmount(value: unknown): PenaltyAmount {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return {
      value,
      currencyCode: null,
      text: String(value),
    };
  }

  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    return {
      value: Number.isFinite(numeric) ? numeric : null,
      currencyCode: null,
      text: value.trim(),
    };
  }

  if (typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const numericRaw =
    source.value ??
    source.Value ??
    source.amount ??
    source.Amount ??
    source.penaltyAmount ??
    source.PenaltyAmount;
  const numeric = Number(
    typeof numericRaw === "string"
      ? numericRaw.replace(/[^\d.-]/g, "")
      : numericRaw
  );
  const currencyCode =
    stringifyValue(
      source.currencyCode ??
        source.CurrencyCode ??
        source.currency ??
        source.Currency
    ) || null;
  const text =
    stringifyValue(source.text ?? source.Text) ||
    stringifyValue(numericRaw) ||
    uniqueLines(collectDetailLines(source)).join(" | ");

  return {
    value: Number.isFinite(numeric) ? numeric : null,
    currencyCode,
    text: text || null,
  };
}

function normalizePenaltyEntry(
  rawPenalty: unknown,
  fallbackPaxTypes: string[] = []
): PenaltyEntry | null {
  if (!rawPenalty || typeof rawPenalty !== "object") {
    return null;
  }

  const source = rawPenalty as Record<string, unknown>;
  const passengerTypeCodes = toStringList(
    source.passengerTypeCodes ??
      source.PassengerTypeCodes ??
      source.passengerTypes ??
      source.PassengerTypes
  );
  const penaltyTypes = toStringList(
    source.penaltyTypes ??
      source.PenaltyTypes ??
      source.penaltyType ??
      source.PenaltyType ??
      source.timeFrame ??
      source.TimeFrame
  );
  const appliesTo =
    stringifyValue(
      source.appliesTo ??
        source.AppliesTo ??
        source.application ??
        source.Application
    ) || null;
  const amount = normalizePenaltyAmount(
    source.amount ??
      source.Amount ??
      source.penaltyAmount ??
      source.PenaltyAmount ??
      source.fee ??
      source.Fee
  );
  const details = uniqueLines(collectDetailLines(source)).slice(0, 4);

  return {
    passengerTypeCodes:
      passengerTypeCodes.length > 0
        ? passengerTypeCodes
        : fallbackPaxTypes.length > 0
          ? fallbackPaxTypes
          : ["ALL"],
    penaltyTypes: penaltyTypes.length > 0 ? penaltyTypes : ["Anytime"],
    appliesTo,
    amount,
    details,
  };
}

function collectPenaltyContainers(
  value: unknown,
  collector: Array<{ penalties: unknown; paxTypes: string[] }>,
  inheritedPaxTypes: string[] = [],
  depth = 0
) {
  if (depth > 8 || value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPenaltyContainers(item, collector, inheritedPaxTypes, depth + 1);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const source = value as Record<string, unknown>;
  const localPaxTypes = toStringList(
    source.passengerTypeCodes ??
      source.PassengerTypeCodes ??
      source.passengerTypes ??
      source.PassengerTypes
  );
  const currentPaxTypes =
    localPaxTypes.length > 0 ? localPaxTypes : inheritedPaxTypes;
  const penalties = source.Penalties ?? source.penalties;

  if (penalties !== undefined) {
    collector.push({
      penalties,
      paxTypes: currentPaxTypes,
    });
  }

  for (const nestedValue of Object.values(source)) {
    collectPenaltyContainers(nestedValue, collector, currentPaxTypes, depth + 1);
  }
}

function dedupePenaltyEntries(entries: PenaltyEntry[]): PenaltyEntry[] {
  const seen = new Set<string>();
  const output: PenaltyEntry[] = [];

  for (const entry of entries) {
    const key = JSON.stringify({
      passengerTypeCodes: entry.passengerTypeCodes,
      penaltyTypes: entry.penaltyTypes,
      appliesTo: entry.appliesTo,
      amount: entry.amount,
    });
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(entry);
  }

  return output;
}

function extractUnifiedPenaltySummary(rawPayload: unknown): PenaltySummary {
  const containers: Array<{ penalties: unknown; paxTypes: string[] }> = [];
  collectPenaltyContainers(rawPayload, containers);

  const change: PenaltyEntry[] = [];
  const cancel: PenaltyEntry[] = [];

  for (const container of containers) {
    const penaltyGroups = toArray(container.penalties);
    const normalizedPenaltyGroups = penaltyGroups.length
      ? penaltyGroups
      : container.penalties
        ? [container.penalties]
        : [];

    for (const group of normalizedPenaltyGroups) {
      if (!group || typeof group !== "object") {
        continue;
      }

      const source = group as Record<string, unknown>;
      const groupPaxTypes = toStringList(
        source.passengerTypeCodes ??
          source.PassengerTypeCodes ??
          source.passengerTypes ??
          source.PassengerTypes
      );
      const fallbackPaxTypes =
        groupPaxTypes.length > 0 ? groupPaxTypes : container.paxTypes;

      const changeItems = toArray(source.Change ?? source.change);
      for (const item of changeItems) {
        const normalized = normalizePenaltyEntry(item, fallbackPaxTypes);
        if (normalized) {
          change.push(normalized);
        }
      }

      const cancelItems = toArray(source.Cancel ?? source.cancel);
      for (const item of cancelItems) {
        const normalized = normalizePenaltyEntry(item, fallbackPaxTypes);
        if (normalized) {
          cancel.push(normalized);
        }
      }
    }
  }

  return {
    change: dedupePenaltyEntries(change),
    cancel: dedupePenaltyEntries(cancel),
  };
}

function stripHtml(input: string): string {
  return input.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ").trim();
}

function dedupeFareRuleInfoEntries(
  fareRuleInfos: NormalizedFareRuleInfo[]
): NormalizedFareRuleInfo[] {
  const seen = new Set<string>();
  const output: NormalizedFareRuleInfo[] = [];

  for (const info of fareRuleInfos) {
    const key = `${info.category}::${info.info}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(info);
  }

  return output;
}

function mapTravelportFareRules(
  rawPayload: unknown,
  fareRuleTypeHint = "Structured"
): NormalizedFareRule[] {
  const payload = rawPayload as Record<string, any>;
  const fareRuleListResponse = payload?.FareRuleListResponse ?? payload;
  const fareRules = Array.isArray(fareRuleListResponse?.FareRule)
    ? fareRuleListResponse.FareRule
    : [];
  const referenceList = Array.isArray(fareRuleListResponse?.ReferenceList)
    ? fareRuleListResponse.ReferenceList
    : [];
  const flights =
    referenceList.find((item: any) => Array.isArray(item?.Flight))?.Flight ?? [];

  const flightMap = new Map<string, string>();
  for (const flight of flights) {
    const id = flight?.id;
    if (!id) continue;
    const dep = flight?.Departure?.location || "";
    const arr = flight?.Arrival?.location || "";
    flightMap.set(id, dep && arr ? `${dep} - ${arr}` : id);
  }

  return fareRules
    .map((fareRule: any, fareRuleIndex: number) => {
      const flightRefs = Array.isArray(fareRule?.Flight)
        ? fareRule.Flight.map((item: any) => item?.FlightRef || item?.id).filter(
            Boolean
          )
        : [];
      const route = buildRouteFromFlightRefs(flightRefs, flightMap, fareRuleIndex);

      const structuredRules = Array.isArray(fareRule?.StructuredFareRules)
        ? fareRule.StructuredFareRules
        : [];
      const shortTextCandidates = [
        fareRule?.ShortTextFareRules,
        fareRule?.ShortTextFareRule,
        fareRule?.shortTextFareRules,
        fareRule?.shortTextFareRule,
        fareRule?.ShortTextRules,
        fareRule?.shortTextRules,
        fareRule?.FareRuleText,
        fareRule?.fareRuleText,
        fareRule?.Text,
        fareRule?.text,
      ].filter((item) => item !== undefined && item !== null);
      const shortTextRules = shortTextCandidates.flatMap((item) =>
        Array.isArray(item) ? item : [item]
      );
      const preferShortText =
        String(fareRuleTypeHint).toLowerCase() === "shorttext";

      const paxRuleMap = new Map<string, NormalizedFareRulePaxInfo>();

      const ensurePax = (paxType: string, fareBasisCode: string) => {
        if (!paxRuleMap.has(paxType)) {
          paxRuleMap.set(paxType, {
            paxType,
            fareBasisCode,
            fareRuleInfos: [],
          });
        } else if (fareBasisCode && !paxRuleMap.get(paxType)?.fareBasisCode) {
          const existing = paxRuleMap.get(paxType)!;
          existing.fareBasisCode = fareBasisCode;
        }
      };

      const orderedRuleSources = preferShortText
        ? [
            { type: "shortText", items: shortTextRules },
            { type: "structured", items: structuredRules },
          ]
        : [
            { type: "structured", items: structuredRules },
            { type: "shortText", items: shortTextRules },
          ];

      for (const sourceGroup of orderedRuleSources) {
        if (sourceGroup.type === "shortText" && paxRuleMap.size > 0) {
          continue;
        }

        for (const rawRule of sourceGroup.items) {
          if (!rawRule || typeof rawRule !== "object") {
            const text = stringifyValue(rawRule);
            if (!text) continue;
            ensurePax("ALL", "");
            paxRuleMap.get("ALL")?.fareRuleInfos.push({
              category: "Short Text",
              info: text,
            });
            continue;
          }

          const rule = rawRule as Record<string, unknown>;
          const paxTypes = Array.isArray(rule?.passengerTypeCodes)
            ? rule.passengerTypeCodes
            : Array.isArray(rule?.PassengerTypeCodes)
              ? rule.PassengerTypeCodes
              : [];
          const normalizedPaxTypes = paxTypes.length ? paxTypes : ["ALL"];
          const fareBasisCode =
            typeof rule?.fareClassCode === "string"
              ? rule.fareClassCode
              : typeof rule?.fareBasisCode === "string"
                ? rule.fareBasisCode
                : typeof rule?.FareBasisCode === "string"
                  ? rule.FareBasisCode
                  : "";

          for (const paxType of normalizedPaxTypes) {
            ensurePax(String(paxType), fareBasisCode);
          }

          if (sourceGroup.type === "structured") {
            const applicability = stringifyValue(rule?.oneWayRoundTripRestrictions);
            if (applicability) {
              for (const paxType of normalizedPaxTypes) {
                paxRuleMap.get(String(paxType))?.fareRuleInfos.push({
                  category: "Applicability",
                  info: applicability,
                });
              }
            }

            for (const [key, value] of Object.entries(rule)) {
              if (
                [
                  "@type",
                  "passengerTypeCodes",
                  "PassengerTypeCodes",
                  "oneWayRoundTripRestrictions",
                  "fareClassCode",
                  "fareBasisCode",
                  "FareBasisCode",
                ].includes(key)
              ) {
                continue;
              }

              const lines = uniqueLines(collectDetailLines(value));
              if (!lines.length) continue;
              const info = lines.join("<br/>");
              const category = formatLabel(key);

              for (const paxType of normalizedPaxTypes) {
                paxRuleMap.get(String(paxType))?.fareRuleInfos.push({
                  category,
                  info,
                });
              }
            }
            continue;
          }

          const category = formatLabel(
            stringifyValue(
              rule?.category ??
                rule?.Category ??
                rule?.title ??
                rule?.Title ??
                rule?.headline ??
                rule?.Headline ??
                "Short Text"
            )
          );
          const textCandidates = [
            rule?.ShortText,
            rule?.shortText,
            rule?.Text,
            rule?.text,
            rule?.Description,
            rule?.description,
            rule?.RuleText,
            rule?.ruleText,
            rule?.Paragraph,
            rule?.paragraph,
          ];
          const textLines = uniqueLines(
            textCandidates
              .flatMap((item) => collectDetailLines(item))
              .filter((line) => !/^id\s*:/i.test(line))
          );
          const fallbackLines = uniqueLines(
            collectDetailLines(rule).filter((line) => !/^id\s*:/i.test(line))
          );
          const lines = textLines.length ? textLines : fallbackLines;
          if (!lines.length) continue;
          const info = lines.slice(0, 8).join("<br/>");

          for (const paxType of normalizedPaxTypes) {
            paxRuleMap.get(String(paxType))?.fareRuleInfos.push({
              category,
              info,
            });
          }
        }
      }

      return {
        route,
        fareRulePaxInfos: Array.from(paxRuleMap.values())
          .map((paxInfo) => ({
            ...paxInfo,
            fareRuleInfos: dedupeFareRuleInfoEntries(paxInfo.fareRuleInfos),
          }))
          .filter((paxInfo) => paxInfo.fareRuleInfos.length > 0),
      };
    })
    .filter((rule) => rule.fareRulePaxInfos.length > 0);
}

function extractPenaltySummaryFromMappedRules(
  mappedFareRules: NormalizedFareRule[]
): PenaltySummary {
  const change: PenaltyEntry[] = [];
  const cancel: PenaltyEntry[] = [];

  for (const fareRule of mappedFareRules) {
    for (const paxInfo of fareRule.fareRulePaxInfos) {
      const paxType = stringifyValue(paxInfo.paxType) || "ALL";
      for (const info of paxInfo.fareRuleInfos) {
        const category = stringifyValue(info.category) || "Rule";
        const text = stripHtml(stringifyValue(info.info));
        const combined = `${category} ${text}`.toLowerCase();
        if (!combined) continue;

        const entry: PenaltyEntry = {
          passengerTypeCodes: [paxType],
          penaltyTypes: [category],
          appliesTo: null,
          amount: null,
          details: compactUnique([fareRule.route, text]).slice(0, 3),
        };

        if (/(change|reissue|resched)/i.test(combined)) {
          change.push(entry);
        }
        if (/(cancel|refund|void)/i.test(combined)) {
          cancel.push(entry);
        }
      }
    }
  }

  return {
    change: dedupePenaltyEntries(change),
    cancel: dedupePenaltyEntries(cancel),
  };
}

function mergePenaltySummary(primary: PenaltySummary, fallback: PenaltySummary): PenaltySummary {
  return {
    change: primary.change.length > 0 ? primary.change : fallback.change,
    cancel: primary.cancel.length > 0 ? primary.cancel : fallback.cancel,
  };
}

function buildFareRulesUrl(
  fareRulesUrl: string,
  fareRuleType: string,
  offerIdentifier: string
) {
  return `${fareRulesUrl}?fareRuleType=${encodeURIComponent(
    fareRuleType
  )}&offerIdentifier=${encodeURIComponent(offerIdentifier)}`;
}

function getFallbackRuleTypes(primaryRuleType: string): string[] {
  const normalized = String(primaryRuleType || "Structured").trim() || "Structured";
  if (normalized.toLowerCase() === "structured") {
    return ["Structured", "ShortText"];
  }
  return [normalized];
}

function getErrorDetails(payload: any, status: number): string {
  return (
    payload?.message ||
    payload?.error_description ||
    payload?.detail ||
    `Travelport fare policy failed (${status})`
  );
}

function hasPenaltyData(summary: PenaltySummary): boolean {
  return summary.change.length > 0 || summary.cancel.length > 0;
}

async function fetchFareRulesPayload(
  url: string,
  accessGroup: string,
  version: string,
  accessToken: string
) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Accept-Version": version,
      "Content-Version": version,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function resolveFareRulesWithFallback(
  fareRulesUrl: string,
  offerIdentifier: string,
  requestedFareRuleType: string,
  accessGroup: string,
  version: string,
  accessToken: string
) {
  const attemptTypes = getFallbackRuleTypes(requestedFareRuleType);
  let lastErrorDetails = "";

  for (let index = 0; index < attemptTypes.length; index += 1) {
    const currentFareRuleType = attemptTypes[index];
    const url = buildFareRulesUrl(
      fareRulesUrl,
      currentFareRuleType,
      offerIdentifier
    );
    const { response, payload } = await fetchFareRulesPayload(
      url,
      accessGroup,
      version,
      accessToken
    );

    if (!response.ok) {
      lastErrorDetails = getErrorDetails(payload, response.status);
      continue;
    }

    const fareRules = mapTravelportFareRules(payload, currentFareRuleType);
    const primaryPenaltySummary = extractUnifiedPenaltySummary(payload);
    const fallbackPenaltySummary = extractPenaltySummaryFromMappedRules(fareRules);
    const penaltiesCancellation = mergePenaltySummary(
      primaryPenaltySummary,
      fallbackPenaltySummary
    );

    const usableData = fareRules.length > 0 || hasPenaltyData(penaltiesCancellation);
    if (usableData || index === attemptTypes.length - 1) {
      return {
        fareRules,
        penaltiesCancellation,
        fareRuleType: currentFareRuleType,
        fallbackUsed:
          String(currentFareRuleType).toLowerCase() !==
          String(requestedFareRuleType).toLowerCase(),
      };
    }
  }

  throw new Error(lastErrorDetails || "Travelport fare policy failed");
}

async function createToken(): Promise<string> {
  const authUrl = getRequiredEnv("TRAVELPORT_AUTH_URL");
  const clientId = getRequiredEnv("TRAVELPORT_CLIENT_ID");
  const clientSecret = getRequiredEnv("TRAVELPORT_CLIENT_SECRET");
  const username = getRequiredEnv("TRAVELPORT_USERNAME");
  const password = getRequiredEnv("TRAVELPORT_PASSWORD");
  const grantType = process.env.TRAVELPORT_AUTH_GRANT_TYPE || "password";
  const useBasicAuth = process.env.TRAVELPORT_USE_BASIC_AUTH === "true";

  const body = new URLSearchParams();
  body.append("grant_type", grantType);
  body.append("username", username);
  body.append("password", password);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (useBasicAuth) {
    const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers.Authorization = `Basic ${basicToken}`;
  } else {
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
  }

  const response = await fetch(authUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.message ||
        `Travelport auth failed (${response.status})`
    );
  }

  return payload.access_token as string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as FarePolicyBody;
    const offerIdentifier =
      body.offerIdentifier || body.resultId || body.ResultId || "";
    const requestedFareRuleType = body.fareRuleType || "Structured";

    if (!offerIdentifier) {
      return res.status(400).json({ message: "offerIdentifier is required" });
    }

    const accessToken = await createToken();
    const fareRulesUrl = getRequiredEnv("TRAVELPORT_FARE_RULES");
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";

    const resolved = await resolveFareRulesWithFallback(
      fareRulesUrl,
      offerIdentifier,
      requestedFareRuleType,
      accessGroup,
      version,
      accessToken
    );

    return res.status(200).json({
      fareRules: resolved.fareRules,
      penaltiesCancellation: resolved.penaltiesCancellation,
      fareRuleType: resolved.fareRuleType,
      requestedFareRuleType,
      fallbackUsed: resolved.fallbackUsed,
      offerIdentifier,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return res.status(500).json({ message });
  }
}
