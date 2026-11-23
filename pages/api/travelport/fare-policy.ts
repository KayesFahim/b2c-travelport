import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "@/server/travelport-token";

type FarePolicyBody = {
  offerIdentifier?: unknown;
  OfferIdentifier?: unknown;
  offerListIdentifier?: unknown;
  OfferListIdentifier?: unknown;
  productIdentifiers?: unknown;
  ProductIdentifiers?: unknown;
  productIdentifier?: unknown;
  ProductIdentifier?: unknown;
  resultId?: unknown;
  ResultId?: unknown;
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

function normalizeIdentifier(value: unknown): string {
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
    const source = value as Record<string, unknown>;
    return (
      normalizeIdentifier(source.value) ||
      normalizeIdentifier(source.Value) ||
      normalizeIdentifier(source.id) ||
      normalizeIdentifier(source.ID) ||
      normalizeIdentifier(source.identifier) ||
      normalizeIdentifier(source.Identifier) ||
      normalizeIdentifier(source.offerIdentifier) ||
      normalizeIdentifier(source.OfferIdentifier) ||
      ""
    );
  }
  return "";
}

function normalizeIdentifierList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeIdentifier(item))
          .filter((item) => item.length > 0)
      )
    );
  }

  const single = normalizeIdentifier(value);
  return single ? [single] : [];
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
      const textFareRuleCandidates = [
        fareRule?.TextFareRule,
        fareRule?.textFareRule,
        fareRule?.TextFareRules,
        fareRule?.textFareRules,
      ].filter((item) => item !== undefined && item !== null);
      const textFareRules = textFareRuleCandidates.flatMap((item) =>
        Array.isArray(item) ? item : [item]
      );
      const shortTextCandidates = [
        fareRule?.ShortTextFareRules,
        fareRule?.ShortTextFareRule,
        fareRule?.shortTextFareRules,
        fareRule?.shortTextFareRule,
        fareRule?.ShortTextRules,
        fareRule?.shortTextRules,
        fareRule?.ShortText,
        fareRule?.shortText,
        fareRule?.FareRuleText,
        fareRule?.fareRuleText,
        fareRule?.Text,
        fareRule?.text,
      ].filter((item) => item !== undefined && item !== null);
      const shortTextRules = [...shortTextCandidates, ...textFareRules].flatMap((item) =>
        Array.isArray(item) ? item : [item]
      );
      const longTextCandidates = [
        fareRule?.LongTextFareRules,
        fareRule?.LongTextFareRule,
        fareRule?.longTextFareRules,
        fareRule?.longTextFareRule,
        fareRule?.LongTextRules,
        fareRule?.longTextRules,
        fareRule?.LongText,
        fareRule?.longText,
      ].filter((item) => item !== undefined && item !== null);
      const longTextRules = [...longTextCandidates, ...textFareRules].flatMap((item) =>
        Array.isArray(item) ? item : [item]
      );
      const fareRuleTypeLower = String(fareRuleTypeHint).toLowerCase();
      const preferShortText =
        fareRuleTypeLower === "shorttext";
      const preferLongText = fareRuleTypeLower === "longtext";
      const preferStructured = fareRuleTypeLower === "structured";

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
            { type: "longText", items: longTextRules },
            { type: "structured", items: structuredRules },
          ]
        : preferLongText
          ? [
              { type: "longText", items: longTextRules },
              { type: "shortText", items: shortTextRules },
              { type: "structured", items: structuredRules },
            ]
          : [
              { type: "structured", items: structuredRules },
              { type: "longText", items: longTextRules },
              { type: "shortText", items: shortTextRules },
            ];

      for (const sourceGroup of orderedRuleSources) {
        if (sourceGroup.type !== "structured" && paxRuleMap.size > 0) {
          continue;
        }
        if (
          sourceGroup.type === "structured" &&
          !preferStructured &&
          paxRuleMap.size > 0
        ) {
          continue;
        }

        for (const rawRule of sourceGroup.items) {
          if (!rawRule || typeof rawRule !== "object") {
            const text = stringifyValue(rawRule);
            if (!text) continue;
            ensurePax("ALL", "");
            paxRuleMap.get("ALL")?.fareRuleInfos.push({
              category: sourceGroup.type === "longText" ? "Long Text" : "Short Text",
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

          const defaultCategory =
            sourceGroup.type === "longText" ? "Long Text" : "Short Text";
          const category = formatLabel(
            stringifyValue(
              rule?.name ??
                rule?.Name ??
                rule?.category ??
                rule?.Category ??
                rule?.title ??
                rule?.Title ??
                rule?.headline ??
                rule?.Headline ??
                defaultCategory
            )
          );
          const primaryValue = stripHtml(
            stringifyValue(rule?.value ?? rule?.Value)
          );
          if (primaryValue) {
            for (const paxType of normalizedPaxTypes) {
              paxRuleMap.get(String(paxType))?.fareRuleInfos.push({
                category,
                info: primaryValue,
              });
            }
            continue;
          }
          const textCandidates = [
            rule?.value,
            rule?.Value,
            rule?.ShortText,
            rule?.shortText,
            rule?.LongText,
            rule?.longText,
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

type FareRuleEndpoints = {
  fromOffer: string;
  fromCatalogProductOfferings: string;
};

type FareRuleAttempt = {
  fareRuleType: string;
  offerIdentifier: string;
  productIdentifier: string;
  strategy: "fromoffer" | "fromcatalogproductofferings";
  url: string;
};

function resolveFareRulesEndpoints(version: string): FareRuleEndpoints {
  const configuredFareRules = String(process.env.TRAVELPORT_FARE_RULES || "").trim();
  const configuredFromOffer = String(
    process.env.TRAVELPORT_FARE_RULES_FROM_OFFER || ""
  ).trim();
  const configuredFromCatalog = String(
    process.env.TRAVELPORT_FARE_RULES_FROM_CATALOG_PRODUCT_OFFERINGS || ""
  ).trim();

  const baseUrl = String(process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net")
    .trim()
    .replace(/\/+$/, "");
  const baseWithVersion = /\/\d+$/.test(baseUrl) ? baseUrl : `${baseUrl}/${version}`;

  const defaultFromOffer = `${baseWithVersion}/air/farerule/farerules/fromoffer`;
  const defaultFromCatalog = `${baseWithVersion}/air/farerule/farerules/fromcatalogproductofferings`;

  const configuredFareRulesLower = configuredFareRules.toLowerCase();

  let fromOffer = configuredFromOffer || defaultFromOffer;
  let fromCatalogProductOfferings = configuredFromCatalog || defaultFromCatalog;

  if (configuredFareRulesLower.includes("/fromoffer")) {
    fromOffer = configuredFareRules;
  }
  if (configuredFareRulesLower.includes("/fromcatalogproductofferings")) {
    fromCatalogProductOfferings = configuredFareRules;
  } else if (
    !configuredFromCatalog &&
    fromOffer.toLowerCase().includes("/fromoffer")
  ) {
    fromCatalogProductOfferings = fromOffer.replace(
      /\/fromoffer(?:\?.*)?$/i,
      "/fromcatalogproductofferings"
    );
  }

  return {
    fromOffer,
    fromCatalogProductOfferings,
  };
}

function buildQueryUrl(
  baseUrl: string,
  entries: Array<[string, string | undefined]>
): string {
  const [path, rawQuery = ""] = String(baseUrl || "").split("?");
  const query = new URLSearchParams(rawQuery);

  for (const [key, rawValue] of entries) {
    const value = String(rawValue || "").trim();
    if (!value) continue;
    query.set(key, value);
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildFareRulesFromOfferUrl(params: {
  baseUrl: string;
  fareRuleType: string;
  offerIdentifier: string;
  productIdentifier?: string;
}) {
  return buildQueryUrl(params.baseUrl, [
    ["fareRuleType", params.fareRuleType],
    ["offerIdentifier", params.offerIdentifier],
    ["productIDs", params.productIdentifier],
  ]);
}

function buildFareRulesFromCatalogProductOfferingsUrl(params: {
  baseUrl: string;
  fareRuleType: string;
  catalogProductOfferingsIdentifier: string;
  catalogProductOfferingID: string;
  productID: string;
}) {
  return buildQueryUrl(params.baseUrl, [
    ["fareRuleType", params.fareRuleType],
    ["catalogProductOfferingsIdentifier", params.catalogProductOfferingsIdentifier],
    ["catalogProductOfferingID", params.catalogProductOfferingID],
    ["productIDs", params.productID],
  ]);
}

function getFallbackRuleTypes(primaryRuleType: string): string[] {
  const normalized = String(primaryRuleType || "Structured").trim() || "Structured";
  const lower = normalized.toLowerCase();

  const candidateTypes =
    lower === "structured"
      ? ["Structured", "LongText", "ShortText"]
      : lower === "longtext"
        ? ["LongText", "ShortText", "Structured"]
        : lower === "shorttext"
          ? ["ShortText", "LongText", "Structured"]
          : [normalized, "ShortText", "LongText", "Structured"];

  return Array.from(new Set(candidateTypes.filter(Boolean)));
}

function buildOfferIdentifierCandidates(values: unknown[]): string[] {
  const candidates: string[] = [];

  for (const rawValue of values) {
    const normalized = normalizeIdentifier(rawValue);
    if (!normalized) continue;
    candidates.push(normalized);

    const withoutNumericSuffix = normalized.replace(/_\d+$/, "");
    if (withoutNumericSuffix && withoutNumericSuffix !== normalized) {
      candidates.push(withoutNumericSuffix);
    }
  }

  return Array.from(new Set(candidates));
}

function buildOfferListIdentifierCandidates(value: string): string[] {
  const normalized = String(value || "").trim();
  if (!normalized) return [];

  const withoutPcSuffix = normalized.replace(/_PC$/i, "");
  const withPcSuffix = /_PC$/i.test(normalized)
    ? normalized
    : `${normalized}_PC`;

  return Array.from(
    new Set([normalized, withoutPcSuffix, withPcSuffix].filter(Boolean))
  );
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

function extractTravelportFareRuleErrors(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const fareRuleListResponse =
    ((payload as Record<string, unknown>).FareRuleListResponse as
      | Record<string, unknown>
      | undefined) || (payload as Record<string, unknown>);
  const result = (fareRuleListResponse?.Result ?? {}) as Record<string, unknown>;
  const errorList = Array.isArray(result?.Error) ? result.Error : [];

  const messages = errorList
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const source = item as Record<string, unknown>;
      const message = stringifyValue(source.Message);
      const sourceId = stringifyValue(source.SourceID);
      const sourceCode = stringifyValue(source.SourceCode);
      if (!message) return "";
      const suffix = [sourceId, sourceCode].filter(Boolean).join("/");
      return suffix ? `${message} (${suffix})` : message;
    })
    .filter(Boolean);

  return uniqueLines(messages);
}

async function fetchFareRulesPayload(
  url: string,
  accessGroup: string,
  version: string,
  accessToken: string
) {
  const { logTravelportApi } = await import("@/utils/travelportLogger");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
    "Accept-Version": version,
    "Content-Version": version,
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await fetchUpstream(url, {
    method: "GET",
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  logTravelportApi({
    endpoint: url,
    request: { method: "GET", headers },
    response: payload,
    status: response.status,
    meta: { api: "fare-policy" },
  });
  return { response, payload };
}

async function resolveFareRulesWithFallback(
  fareRuleEndpoints: FareRuleEndpoints,
  offerIdentifiers: string[],
  offerListIdentifiers: string[],
  productIdentifiers: string[],
  requestedFareRuleType: string,
  accessGroup: string,
  version: string,
  accessToken: string
) {
  const attemptTypes = getFallbackRuleTypes(requestedFareRuleType);
  const primaryProductIdentifier = productIdentifiers[0] || "";
  const attemptCandidates: FareRuleAttempt[] = [];

  for (const currentFareRuleType of attemptTypes) {
    for (const currentOfferIdentifier of offerIdentifiers) {
      if (primaryProductIdentifier) {
        attemptCandidates.push({
          fareRuleType: currentFareRuleType,
          offerIdentifier: currentOfferIdentifier,
          productIdentifier: primaryProductIdentifier,
          strategy: "fromoffer",
          url: buildFareRulesFromOfferUrl({
            baseUrl: fareRuleEndpoints.fromOffer,
            fareRuleType: currentFareRuleType,
            offerIdentifier: currentOfferIdentifier,
            productIdentifier: primaryProductIdentifier,
          }),
        });
      }

      attemptCandidates.push({
        fareRuleType: currentFareRuleType,
        offerIdentifier: currentOfferIdentifier,
        productIdentifier: "",
        strategy: "fromoffer",
        url: buildFareRulesFromOfferUrl({
          baseUrl: fareRuleEndpoints.fromOffer,
          fareRuleType: currentFareRuleType,
          offerIdentifier: currentOfferIdentifier,
        }),
      });
    }
  }

  if (offerListIdentifiers.length > 0 && primaryProductIdentifier) {
    for (const currentFareRuleType of attemptTypes) {
      for (const currentOfferListIdentifier of offerListIdentifiers) {
        for (const currentOfferIdentifier of offerIdentifiers) {
          attemptCandidates.push({
            fareRuleType: currentFareRuleType,
            offerIdentifier: currentOfferIdentifier,
            productIdentifier: primaryProductIdentifier,
            strategy: "fromcatalogproductofferings",
            url: buildFareRulesFromCatalogProductOfferingsUrl({
              baseUrl: fareRuleEndpoints.fromCatalogProductOfferings,
              fareRuleType: currentFareRuleType,
              catalogProductOfferingsIdentifier: currentOfferListIdentifier,
              catalogProductOfferingID: currentOfferIdentifier,
              productID: primaryProductIdentifier,
            }),
          });
        }
      }
    }
  }

  const attempts = attemptCandidates.filter(
    (attempt, index, list) =>
      list.findIndex((item) => item.url === attempt.url) === index
  );
  let lastErrorDetails = "";

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    let response: Response;
    let payload: Record<string, unknown>;
    try {
      const fetched = await fetchFareRulesPayload(
        attempt.url,
        accessGroup,
        version,
        accessToken
      );
      response = fetched.response;
      payload = fetched.payload as Record<string, unknown>;
    } catch (fetchErr) {
      lastErrorDetails =
        fetchErr instanceof Error
          ? `${fetchErr.message} [${attempt.strategy}, type=${attempt.fareRuleType}]`
          : `Upstream fare rule error [${attempt.strategy}, type=${attempt.fareRuleType}]`;
      continue;
    }

    if (!response.ok) {
      const details = getErrorDetails(payload, response.status);
      lastErrorDetails = `${details} [${attempt.strategy}, type=${attempt.fareRuleType}]`;
      continue;
    }

    const embeddedErrors = extractTravelportFareRuleErrors(payload);
    if (embeddedErrors.length > 0) {
      lastErrorDetails = embeddedErrors.join(" | ");
      continue;
    }

    const fareRules = mapTravelportFareRules(payload, attempt.fareRuleType);
    const primaryPenaltySummary = extractUnifiedPenaltySummary(payload);
    const fallbackPenaltySummary = extractPenaltySummaryFromMappedRules(fareRules);
    const penaltiesCancellation = mergePenaltySummary(
      primaryPenaltySummary,
      fallbackPenaltySummary
    );

    const usableData = fareRules.length > 0 || hasPenaltyData(penaltiesCancellation);
    if (usableData || index === attempts.length - 1) {
      return {
        fareRules,
        penaltiesCancellation,
        fareRuleType: attempt.fareRuleType,
        fallbackUsed: index > 0,
        strategy: attempt.strategy,
        offerIdentifier: attempt.offerIdentifier,
        productIdentifier: attempt.productIdentifier || null,
        unavailable: !usableData,
        unavailableReason: usableData ? null : lastErrorDetails || null,
      };
    }
  }

  return {
    fareRules: [],
    penaltiesCancellation: { change: [], cancel: [] },
    fareRuleType: requestedFareRuleType,
    fallbackUsed: true,
    strategy: attempts[attempts.length - 1]?.strategy || "fromoffer",
    offerIdentifier: offerIdentifiers[0] || "",
    productIdentifier: primaryProductIdentifier || null,
    unavailable: true,
    unavailableReason:
      lastErrorDetails || "Fare rules are not available from Travelport for this offer.",
  };
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as FarePolicyBody;
    const offerIdentifiers = buildOfferIdentifierCandidates([
      body.offerIdentifier,
      body.OfferIdentifier,
      body.resultId,
      body.ResultId,
    ]);
    const offerIdentifier = offerIdentifiers[0] || "";
    const offerListIdentifier = normalizeIdentifier(
      body.offerListIdentifier ?? body.OfferListIdentifier
    );
    const offerListIdentifiers = buildOfferListIdentifierCandidates(
      offerListIdentifier
    );
    const productIdentifiers = normalizeIdentifierList(
      body.productIdentifiers ??
        body.ProductIdentifiers ??
        body.productIdentifier ??
        body.ProductIdentifier
    );
    const requestedFareRuleType = body.fareRuleType || "Structured";

    if (!offerIdentifier) {
      return res.status(400).json({ message: "offerIdentifier is required" });
    }

    const accessToken = await createToken();
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";
    const fareRuleEndpoints = resolveFareRulesEndpoints(version);

    const resolved = await resolveFareRulesWithFallback(
      fareRuleEndpoints,
      offerIdentifiers,
      offerListIdentifiers,
      productIdentifiers,
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
      strategy: resolved.strategy,
      offerIdentifier: resolved.offerIdentifier,
      requestedOfferIdentifier: offerIdentifier,
      offerListIdentifier,
      productIdentifier: resolved.productIdentifier,
      unavailable: Boolean(resolved.unavailable),
      ...(resolved.unavailableReason
        ? { unavailableReason: resolved.unavailableReason }
        : {}),
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error || "");
    const normalized = rawMessage.toUpperCase();
    if (normalized.includes("OFFER NOT FOUND")) {
      return res.status(200).json({
        fareRules: [],
        penaltiesCancellation: { change: [], cancel: [] },
        unavailable: true,
        unavailableReason:
          "This offer identifier is no longer valid. Search again for updated fare rules.",
      });
    }
    const message = publicErrorMessage(error, "Unexpected server error");
    return res.status(500).json({ message });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
