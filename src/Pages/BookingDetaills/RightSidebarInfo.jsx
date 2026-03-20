import {
  AirlineSeatReclineNormalRounded,
  LuggageRounded,
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
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
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

const normalizeBagEntries = (bagSource) => {
  const list = [];

  if (Array.isArray(bagSource)) {
    bagSource.forEach((item) => {
      if (!item) return;
      list.push({
        type: String(getValueByKeys(item, ["Type", "type"])).toLowerCase(),
        value:
          toText(getValueByKeys(item, ["Allowance", "allowance", "text", "Text"])) ||
          toText(item),
      });
    });
    return list.filter((item) => item.value);
  }

  if (bagSource && typeof bagSource === "object") {
    const allowanceList = getArrayByKeys(bagSource, ["allowance", "Allowance"]);
    if (allowanceList.length > 0) {
      allowanceList.forEach((item) => {
        if (!item) return;
        list.push({
          type: String(getValueByKeys(item, ["type", "Type"])).toLowerCase(),
          value:
            toText(getValueByKeys(item, ["text", "Text", "allowance", "Allowance"])) ||
            toText(item),
        });
      });
      return list.filter((item) => item.value);
    }

    const directValue =
      toText(getValueByKeys(bagSource, ["Allowance", "allowance", "text", "Text"])) ||
      toText(bagSource);
    if (directValue) {
      return [{ type: "", value: directValue }];
    }
  }

  return [];
};

const extractBaggageRows = (data) => {
  const breakdown = getArrayByKeys(data, ["PriceBreakDown", "priceBreakDown"]);
  if (breakdown.length === 0) return [];

  return breakdown.map((item, index) => {
    const paxType = getValueByKeys(item, ["PaxType", "paxType"]) || `PAX ${index + 1}`;
    const bagSource =
      getValueByKeys(item, ["Bag", "bag", "Bags", "bags"]) || [];
    const entries = normalizeBagEntries(bagSource);

    const checked =
      entries.find((entry) => /check|checked/i.test(entry.type))?.value ||
      entries[0]?.value ||
      "As per fare rules";
    const cabin =
      entries.find((entry) => /cabin|carry|hand/i.test(entry.type))?.value ||
      "As per airline policy";

    return {
      paxType,
      checked,
      cabin,
    };
  });
};

const extractAmenities = (data) => {
  const legs = getArrayByKeys(data, ["AllLegsInfo", "allLegsInfo"]);
  const amenityList = [];

  legs.forEach((leg) => {
    const segments = getArrayByKeys(leg, ["Segments", "segments"]);
    segments.forEach((segment) => {
      const amenities = getArrayByKeys(segment, ["Amenities", "amenities"]);
      amenities.forEach((amenity) => {
        const text =
          toText(getValueByKeys(amenity, ["text", "Text", "headline", "Headline"])) ||
          toText(amenity);
        if (text) amenityList.push(text);
      });

      const universal = getArrayByKeys(segment, [
        "universalProductAttributes",
        "UniversalProductAttributes",
      ]);
      universal.forEach((item) => {
        const headline = toText(getValueByKeys(item, ["headline", "Headline"]));
        const description = toText(
          getValueByKeys(item, ["description", "Description"])
        );
        if (headline) amenityList.push(headline);
        if (description) amenityList.push(description);
      });
    });
  });

  return Array.from(
    new Set(
      amenityList
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
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

const extractFareRuleHighlights = (payload, limit = 8) => {
  const fareRules = Array.isArray(payload?.fareRules) ? payload.fareRules : [];
  const lines = [];

  for (const fareRule of fareRules) {
    const route = toText(getValueByKeys(fareRule, ["route", "Route"]));
    const paxInfos = getArrayByKeys(fareRule, ["fareRulePaxInfos", "FareRulePaxInfos"]);

    for (const paxInfo of paxInfos) {
      const paxType = toText(getValueByKeys(paxInfo, ["paxType", "PaxType"]));
      const ruleInfos = getArrayByKeys(paxInfo, ["fareRuleInfos", "FareRuleInfos"]);

      for (const info of ruleInfos) {
        const category =
          toText(getValueByKeys(info, ["category", "Category"])) || "Rule";
        const detail = stripHtml(getValueByKeys(info, ["info", "Info"]));
        if (!detail) continue;
        const prefix = [route, paxType, category].filter(Boolean).join(" • ");
        lines.push(prefix ? `${prefix}: ${detail}` : detail);
        if (lines.length >= limit) {
          return lines;
        }
      }
    }
  }

  return lines;
};

const RightSidebarInfo = ({ data }) => {
  const token = secureLocalStorage.getItem("access_token");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [structuredPolicy, setStructuredPolicy] = useState(null);
  const [shortTextPolicy, setShortTextPolicy] = useState(null);

  const offerIdentifier = useMemo(
    () =>
      getValueByKeys(data, [
        "offerIdentifier",
        "OfferIdentifier",
        "ResultId",
        "resultId",
        "identifier",
        "Identifier",
      ]) || "",
    [data]
  );
  const searchId = useMemo(
    () => getValueByKeys(data, ["SearchId", "searchId", "transactionId"]) || "",
    [data]
  );

  useEffect(() => {
    let isCancelled = false;

    const fetchPolicy = async () => {
      if (!offerIdentifier) {
        setStructuredPolicy(null);
        setShortTextPolicy(null);
        setPolicyError("");
        return;
      }

      setPolicyLoading(true);
      setPolicyError("");

      const [structuredResult, shortTextResult] = await Promise.allSettled([
        fetchTravelportFarePolicy({
          searchId,
          resultId: offerIdentifier,
          offerIdentifier,
          fareRuleType: "Structured",
          token,
        }),
        fetchTravelportFarePolicy({
          searchId,
          resultId: offerIdentifier,
          offerIdentifier,
          fareRuleType: "ShortText",
          token,
        }),
      ]);

      if (isCancelled) return;

      const resolvedStructured =
        structuredResult.status === "fulfilled" ? structuredResult.value : null;
      const resolvedShortText =
        shortTextResult.status === "fulfilled" ? shortTextResult.value : null;

      setStructuredPolicy(resolvedStructured);
      setShortTextPolicy(resolvedShortText);

      if (!resolvedStructured && !resolvedShortText) {
        const structuredMessage =
          structuredResult.status === "rejected"
            ? structuredResult.reason?.message
            : "";
        const shortMessage =
          shortTextResult.status === "rejected"
            ? shortTextResult.reason?.message
            : "";
        setPolicyError(
          structuredMessage ||
            shortMessage ||
            "Fare policy is not available for this fare."
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
  }, [offerIdentifier, searchId, token]);

  const policySource = structuredPolicy || shortTextPolicy || data;
  const baggageRows = useMemo(() => extractBaggageRows(data), [data]);
  const amenities = useMemo(() => extractAmenities(data), [data]);
  const dateChangeRows = useMemo(
    () => buildPolicyRows(policySource, "dateChange"),
    [policySource]
  );
  const cancellationRows = useMemo(
    () => buildPolicyRows(policySource, "cancellation"),
    [policySource]
  );
  const structuredHighlights = useMemo(
    () => extractFareRuleHighlights(structuredPolicy, 8),
    [structuredPolicy]
  );
  const shortTextHighlights = useMemo(
    () => extractFareRuleHighlights(shortTextPolicy, 8),
    [shortTextPolicy]
  );

  return (
    <Box
      sx={{
        bgcolor: "#FFFFFF",
        borderRadius: "10px",
        border: "1px solid #DFE7EF",
        p: "12px",
      }}
    >
      <Typography
        sx={{
          fontSize: "12px",
          color: "#293247",
          fontWeight: 700,
          mb: "10px",
        }}
      >
        Baggage Information & Fare Rules
      </Typography>

      <Box>
        <Typography sx={sectionTitleSx}>
          <LuggageRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
          Baggage
        </Typography>
        {baggageRows.length ? (
          baggageRows.map((row, index) => (
            <Box
              key={`${row.paxType}-${index}`}
              sx={{
                border: "1px solid #E4ECF4",
                borderRadius: "8px",
                p: "8px",
                mb: "8px",
                bgcolor: "#FBFDFF",
              }}
            >
              <Typography sx={{ ...valueSx, mb: "4px" }}>{row.paxType}</Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <Typography sx={labelSx}>Checked</Typography>
                <Typography sx={valueSx}>{row.checked}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <Typography sx={labelSx}>Cabin</Typography>
                <Typography sx={valueSx}>{row.cabin}</Typography>
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ fontSize: "11px", color: "#6B7F94" }}>
            Baggage data not available.
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: "10px" }} />

      <Box>
        <Typography sx={sectionTitleSx}>
          <AirlineSeatReclineNormalRounded
            sx={{ fontSize: "16px", color: "var(--primary-button)" }}
          />
          Amenities
        </Typography>
        {amenities.length ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {amenities.map((item, index) => (
              <Chip
                key={`${item}-${index}`}
                label={item}
                size="small"
                sx={{
                  background: "#EEF5FC",
                  color: "#1E456D",
                  fontWeight: 600,
                  "& .MuiChip-label": {
                    px: "8px",
                  },
                }}
              />
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: "11px", color: "#6B7F94" }}>
            Amenities are not provided by the supplier for this fare.
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: "10px" }} />

      <Box>
        <Typography sx={sectionTitleSx}>
          <RuleRounded sx={{ fontSize: "16px", color: "var(--primary-button)" }} />
          Fare Policy
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            mb: "8px",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={`Long: ${structuredHighlights.length ? "Available" : "N/A"}`}
              sx={{
                background: "#EEF5FC",
                color: "#1E456D",
                fontWeight: 700,
              }}
            />
            <Chip
              size="small"
              label={`Short: ${shortTextHighlights.length ? "Available" : "N/A"}`}
              sx={{
                background: "#F2F8F4",
                color: "#1F6B4F",
                fontWeight: 700,
              }}
            />
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsPolicyModalOpen(true)}
            disabled={!offerIdentifier}
            sx={{
              textTransform: "none",
              fontSize: "11px",
              fontWeight: 700,
              borderColor: "#BFD4E7",
              color: "#1E456D",
            }}
          >
            View Full Policy
          </Button>
        </Box>

        {policyLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "8px" }}>
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: "11px", color: "#6B7F94" }}>
              Loading short and long fare policy...
            </Typography>
          </Box>
        ) : null}
        {policyError ? (
          <Typography sx={{ fontSize: "11px", color: "#AE2A2A", mb: "8px" }}>
            {policyError}
          </Typography>
        ) : null}

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

        <Box
          sx={{
            border: "1px solid #E4ECF4",
            borderRadius: "8px",
            p: "8px",
            mt: "8px",
            bgcolor: "#FBFDFF",
          }}
        >
          <Typography sx={{ ...labelSx, mb: "4px" }}>Long Policy (Structured)</Typography>
          {structuredHighlights.length ? (
            structuredHighlights.slice(0, 2).map((line, index) => (
              <Typography
                key={`structured-preview-${index}`}
                sx={{ fontSize: "10px", color: "#607489", fontWeight: 600, mt: "1px" }}
              >
                {line}
              </Typography>
            ))
          ) : (
            <Typography sx={{ fontSize: "10px", color: "#607489", fontWeight: 600 }}>
              Structured fare policy not available.
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            border: "1px solid #E4ECF4",
            borderRadius: "8px",
            p: "8px",
            mt: "8px",
            bgcolor: "#FBFDFF",
          }}
        >
          <Typography sx={{ ...labelSx, mb: "4px" }}>Short Policy (ShortText)</Typography>
          {shortTextHighlights.length ? (
            shortTextHighlights.slice(0, 2).map((line, index) => (
              <Typography
                key={`short-preview-${index}`}
                sx={{ fontSize: "10px", color: "#607489", fontWeight: 600, mt: "1px" }}
              >
                {line}
              </Typography>
            ))
          ) : (
            <Typography sx={{ fontSize: "10px", color: "#607489", fontWeight: 600 }}>
              Short text fare policy not available.
            </Typography>
          )}
        </Box>
      </Box>

      <Dialog
        open={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontSize: "15px", fontWeight: 700 }}>
          Fare Policy (Long & Short)
        </DialogTitle>
        <DialogContent dividers>
          {policyLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", py: 1 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontSize: "13px", color: "#6B7F94" }}>
                Loading fare policy...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gap: "14px" }}>
              <Box>
                <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#1E456D", mb: "6px" }}>
                  Long Policy (Structured)
                </Typography>
                {structuredHighlights.length ? (
                  structuredHighlights.map((line, index) => (
                    <Typography
                      key={`structured-modal-${index}`}
                      sx={{ fontSize: "12px", color: "#395068", mb: "4px" }}
                    >
                      {line}
                    </Typography>
                  ))
                ) : (
                  <Typography sx={{ fontSize: "12px", color: "#607489" }}>
                    Structured fare policy not available.
                  </Typography>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#1E6B4F", mb: "6px" }}>
                  Short Policy (ShortText)
                </Typography>
                {shortTextHighlights.length ? (
                  shortTextHighlights.map((line, index) => (
                    <Typography
                      key={`short-modal-${index}`}
                      sx={{ fontSize: "12px", color: "#395068", mb: "4px" }}
                    >
                      {line}
                    </Typography>
                  ))
                ) : (
                  <Typography sx={{ fontSize: "12px", color: "#607489" }}>
                    Short text fare policy not available.
                  </Typography>
                )}
              </Box>

              {policyError ? (
                <Typography sx={{ fontSize: "12px", color: "#AE2A2A" }}>
                  {policyError}
                </Typography>
              ) : null}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RightSidebarInfo;
