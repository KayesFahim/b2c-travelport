import { Box, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Tabs, Tab } from "@mui/material";
import { normalizeFareRulesPayload } from "../../utils/flightPolicyUtils";
import {
  fetchTravelportFarePolicyWithFallback,
} from "../../utils/travelportFarePolicy";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index ? <Box sx={{ p: 2 }}>{children}</Box> : null}
    </div>
  );
}

function normalizeRuleInfos(ruleInfoList) {
  if (!Array.isArray(ruleInfoList)) return [];

  return ruleInfoList
    .map((info, index) => {
      if (typeof info === "string") {
        return {
          category: `Rule ${index + 1}`,
          info,
        };
      }

      if (info && typeof info === "object") {
        return {
          category:
            info.category || info.Category || info.title || `Rule ${index + 1}`,
          info: info.info || info.Info || info.description || "",
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter((item) => item.info);
}

function normalizePaxInfos(rule) {
  const directPaxInfos =
    rule?.fareRulePaxInfos ||
    rule?.FareRulePaxInfos ||
    rule?.paxInfos ||
    rule?.PaxInfos;

  if (Array.isArray(directPaxInfos) && directPaxInfos.length > 0) {
    return directPaxInfos.map((paxInfo, index) => ({
      paxType: paxInfo?.paxType || paxInfo?.PaxType || `PAX ${index + 1}`,
      fareBasisCode: paxInfo?.fareBasisCode || paxInfo?.FareBasisCode || "",
      fareRuleInfos: normalizeRuleInfos(
        paxInfo?.fareRuleInfos || paxInfo?.FareRuleInfos || []
      ),
    }));
  }

  const fallbackRuleInfos = normalizeRuleInfos(
    rule?.fareRuleInfos || rule?.FareRuleInfos || []
  );
  if (fallbackRuleInfos.length > 0) {
    return [
      {
        paxType: rule?.paxType || rule?.PaxType || "All Passengers",
        fareBasisCode: rule?.fareBasisCode || rule?.FareBasisCode || "",
        fareRuleInfos: fallbackRuleInfos,
      },
    ];
  }

  return [];
}

function normalizeRulesForUI(rules) {
  return rules
    .map((rule, index) => ({
      route:
        rule?.route ||
        rule?.Route ||
        rule?.segment ||
        rule?.Segment ||
        `Rule ${index + 1}`,
      fareRulePaxInfos: normalizePaxInfos(rule),
    }))
    .filter((rule) => rule.fareRulePaxInfos.length > 0);
}

const FarePolicy = ({ searchId, resultId }) => {
  const [fareRules, setFareRules] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [showAllStates, setShowAllStates] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const toggleShowAll = (key) => {
    setShowAllStates((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

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

        const normalized = normalizeRulesForUI(
          normalizeFareRulesPayload(payload)
        );

        setFareRules(normalized);
        setTabIndex(0);
        setShowAllStates({});
        if (!normalized.length) {
          setErrorMessage("Fare policy not available for this offer");
        }
      } catch (error) {
        setFareRules([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Fare policy is not available"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchId, resultId]);

  if (loading) {
    return (
      <Typography sx={{ fontSize: "14px", color: "var(--meta-black)" }}>
        Loading fare policy...
      </Typography>
    );
  }

  if (!fareRules.length) {
    return (
      <Typography sx={{ fontSize: "14px", color: "var(--meta-black)" }}>
        {errorMessage || "Fare policy not available"}
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <Tabs
        value={tabIndex}
        onChange={handleChange}
        aria-label="fare rules tabs"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          maxWidth: "100%",
          "& .MuiTab-root": {
            minHeight: "34px",
            textTransform: "capitalize",
            fontSize: "12px",
          },
        }}
      >
        {fareRules.map((rule, index) => (
          <Tab
            style={{ textTransform: "capitalize" }}
            key={`${rule.route}-${index}`}
            label={rule.route || `Rule ${index + 1}`}
          />
        ))}
      </Tabs>

      {fareRules.map((rule, i) => (
        <TabPanel key={`${rule.route}-panel-${i}`} value={tabIndex} index={i}>
          {rule.fareRulePaxInfos.map((paxInfo, j) => {
            const showKey = `${i}-${j}`;
            const showAll = showAllStates[showKey] || false;
            const visibleInfos = showAll
              ? paxInfo.fareRuleInfos
              : paxInfo.fareRuleInfos.slice(0, 1);

            return (
              <Box key={showKey} sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: "15px", fontWeight: 700 }}>
                  {paxInfo.paxType}
                </Typography>

                {paxInfo.fareBasisCode ? (
                  <Typography sx={{ fontSize: "13px", color: "#4A5568" }}>
                    Fare Basis Code: {paxInfo.fareBasisCode}
                  </Typography>
                ) : null}

                {visibleInfos.map((info, k) => (
                  <Box key={`${showKey}-${k}`} sx={{ mt: 1 }}>
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "var(--primary-color)",
                      }}
                    >
                      {info.category}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "12px",
                        textTransform: "capitalize",
                        color: "gray",
                        overflowWrap: "anywhere",
                      }}
                      dangerouslySetInnerHTML={{ __html: info.info }}
                    />
                  </Box>
                ))}

                {paxInfo.fareRuleInfos.length > 1 ? (
                  <Typography
                    variant="button"
                    sx={{
                      cursor: "pointer",
                      fontWeight: "bold",
                      mt: 2,
                      color: "var(--primary-color)",
                    }}
                    onClick={() => toggleShowAll(showKey)}
                  >
                    {showAll ? "See Less" : "See More"}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </TabPanel>
      ))}
    </Box>
  );
};

export default FarePolicy;
