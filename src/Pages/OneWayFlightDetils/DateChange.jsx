import { Box, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import WarningIcon from "@mui/icons-material/Warning";
import { extractUnifiedPenaltyRows } from "../../utils/flightPolicyUtils";
import {
  fetchTravelportFarePolicyWithFallback,
} from "../../utils/travelportFarePolicy";

const DateChange = ({ searchId, resultId }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!searchId || !resultId) return;

      setLoading(true);
      setErrorMessage("");

      try {
        const payload = await fetchTravelportFarePolicyWithFallback({
          searchId,
          resultId,
          offerIdentifier: resultId,
          fareRuleTypes: ["LongText", "ShortText", "Structured"],
        });
        const extractedRows = extractUnifiedPenaltyRows(payload, "dateChange");
        setRows(extractedRows);
        if (!extractedRows.length) {
          setErrorMessage("Date change policy not available from fare rules");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to fetch rules"
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchId, resultId]);

  return (
    <Box sx={{ p: 1, maxWidth: "100%", overflowX: "hidden" }}>
      {loading ? (
        <Typography sx={{ fontSize: "12px", color: "var(--meta-black)" }}>
          Loading date change policy...
        </Typography>
      ) : null}

      {!loading && rows.length === 0 ? (
        <Typography sx={{ fontSize: "12px", color: "var(--meta-black)" }}>
          {errorMessage || "Date change policy not available from API"}
        </Typography>
      ) : null}

      {rows.map((rule) => (
        <Box
          key={rule.id}
          sx={{
            border: "1px solid #DFE7EF",
            borderRadius: "8px",
            background: "#FFFFFF",
            p: { xs: "10px", md: "12px" },
            mb: "10px",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "12px", md: "13px" },
              fontWeight: 700,
              color: "var(--primary-color)",
              mb: "6px",
              overflowWrap: "anywhere",
            }}
          >
            {rule.timeFrame}
          </Typography>

          {rule.details.map((detail, index) => (
            <Typography
              key={`${rule.id}-${index}`}
              sx={{
                fontSize: { xs: "11px", md: "12px" },
                color: "var(--meta-black)",
                lineHeight: 1.5,
                mb: "2px",
                overflowWrap: "anywhere",
              }}
            >
              {detail}
            </Typography>
          ))}
        </Box>
      ))}

      <Box
        sx={{
          border: "1px solid #E67D7D",
          borderRadius: "6px",
          background: "#FDF5F5",
          p: "8px",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
          <WarningIcon sx={{ color: "#D62828", fontSize: "18px" }} />
          <Typography
            sx={{
              fontSize: { xs: "10.5px", md: "11px" },
              color: "#D62828",
            }}
          >
            Date change policy is API-driven and airline-controlled. Fare
            difference may apply at reissue.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DateChange;
