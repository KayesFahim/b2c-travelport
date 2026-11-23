import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  CABIN_PREFERENCE_OPTIONS,
  CARRIER_PREFERENCE_OPTIONS,
  CONNECTION_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  FARE_TYPE_OPTIONS,
  MAX_CONNECTION_DURATION_OPTIONS,
  MAX_OVERNIGHT_DURATION_OPTIONS,
  POPULAR_AIRLINE_OPTIONS,
  ROUND_TRIP_SEARCH_MODES,
  UPSELL_COUNT_OPTIONS,
  countActiveTravelportFilters,
  createDefaultTravelportSearchFilters,
  formatContentSourceSummary,
  normalizeCarrierCodes,
  normalizeTravelportSearchFilters,
} from "../../utils/travelportSearchCriteria";

const SearchCriteriaFilter = ({ filters, onChange }) => {
  const reactId = useId();
  const baseId = useMemo(
    () => `tp-filter-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId]
  );
  const popoverId = `${baseId}-popover`;

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const allSourcesCheckboxRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [supportsNativePopover, setSupportsNativePopover] = useState(true);
  const [airlineQuery, setAirlineQuery] = useState("");
  const [customCarrierInput, setCustomCarrierInput] = useState("");

  const currentFilters = useMemo(
    () => normalizeTravelportSearchFilters(filters),
    [filters]
  );

  const updateFilters = (patch) => {
    if (typeof onChange !== "function") return;
    onChange(
      normalizeTravelportSearchFilters({
        ...currentFilters,
        ...patch,
      })
    );
  };

  const hasGds = currentFilters.contentSources.includes("GDS");
  const hasNdc = currentFilters.contentSources.includes("NDC");
  const allSourcesSelected = hasGds && hasNdc;
  const isNdcOnly = !hasGds && hasNdc;
  const activeFilterCount = countActiveTravelportFilters(currentFilters);

  useEffect(() => {
    if (!allSourcesCheckboxRef.current) return;
    allSourcesCheckboxRef.current.indeterminate =
      (hasGds && !hasNdc) || (!hasGds && hasNdc);
  }, [hasGds, hasNdc]);

  useEffect(() => {
    if (typeof HTMLElement === "undefined") return;
    const nativeSupported = Object.hasOwn(HTMLElement.prototype, "popover");
    setSupportsNativePopover(nativeSupported);
    if (nativeSupported && triggerRef.current) {
      triggerRef.current.setAttribute("popovertarget", popoverId);
    }
    if (nativeSupported && popoverRef.current) {
      popoverRef.current.setAttribute("popover", "auto");
    }
  }, [popoverId]);

  const positionFallbackPopover = () => {
    const popEl = popoverRef.current;
    const triggerEl = triggerRef.current;
    if (!popEl || !triggerEl || typeof window === "undefined") return;
    if (typeof CSS !== "undefined" && CSS.supports?.("position-area: block-end")) {
      return;
    }
    const rect = triggerEl.getBoundingClientRect();
    const popWidth = Math.min(window.innerWidth * 0.94, 760);
    const left = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - popWidth - 12)
    );
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const top =
      spaceBelow >= 280
        ? rect.bottom + 8
        : Math.max(12, rect.top - Math.min(540, rect.top - 16));
    popEl.style.inset = "auto";
    popEl.style.margin = "0";
    popEl.style.left = `${left}px`;
    popEl.style.top = `${top}px`;
  };

  useEffect(() => {
    const popEl = popoverRef.current;
    if (!popEl) return undefined;

    const handleToggle = (event) => {
      const nextOpen = event?.newState === "open";
      setIsOpen(nextOpen);
      if (nextOpen) {
        positionFallbackPopover();
      }
    };

    const handleBeforeToggle = (event) => {
      if (event?.newState === "open") {
        positionFallbackPopover();
      }
    };

    popEl.addEventListener("toggle", handleToggle);
    popEl.addEventListener("beforetoggle", handleBeforeToggle);
    return () => {
      popEl.removeEventListener("toggle", handleToggle);
      popEl.removeEventListener("beforetoggle", handleBeforeToggle);
    };
  }, []);

  useEffect(() => {
    if (supportsNativePopover || !isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleOutsideClick = (event) => {
      const popEl = popoverRef.current;
      const triggerEl = triggerRef.current;
      if (
        popEl &&
        !popEl.contains(event.target) &&
        triggerEl &&
        !triggerEl.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, supportsNativePopover]);

  const closePopover = () => {
    const popEl = popoverRef.current;
    if (supportsNativePopover && popEl?.hidePopover) {
      popEl.hidePopover();
    } else {
      setIsOpen(false);
    }
  };

  const handleFallbackToggle = () => {
    if (supportsNativePopover) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => positionFallbackPopover());
      }
      return next;
    });
  };

  const handleToggleAllSources = () => {
    if (allSourcesSelected) {
      updateFilters({ contentSources: ["GDS"] });
    } else {
      updateFilters({ contentSources: ["GDS", "NDC"] });
    }
  };

  const handleToggleSingleSource = (source) => {
    const exists = currentFilters.contentSources.includes(source);
    const next = exists
      ? currentFilters.contentSources.filter((item) => item !== source)
      : [...currentFilters.contentSources, source];
    if (next.length === 0) {
      // Never leave zero content sources selected; switch to the other source cleanly.
      updateFilters({ contentSources: [source === "GDS" ? "NDC" : "GDS"] });
      return;
    }
    updateFilters({ contentSources: next });
  };

  const handleToggleCarrier = (code) => {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return;
    const exists = currentFilters.carriers.includes(normalized);
    const next = exists
      ? currentFilters.carriers.filter((item) => item !== normalized)
      : [...currentFilters.carriers, normalized];
    updateFilters({ carriers: next });
  };

  const handleAddCustomCarriers = () => {
    const parsed = normalizeCarrierCodes(customCarrierInput);
    if (!parsed.length) return;
    updateFilters({
      carriers: Array.from(new Set([...currentFilters.carriers, ...parsed])),
    });
    setCustomCarrierInput("");
  };

  const filteredAirlines = useMemo(() => {
    const q = airlineQuery.trim().toLowerCase();
    if (!q) return POPULAR_AIRLINE_OPTIONS;
    return POPULAR_AIRLINE_OPTIONS.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
  }, [airlineQuery]);

  const selectedConnectionLabel =
    CONNECTION_TYPE_OPTIONS.find((item) => item.value === currentFilters.connectionType)
      ?.label || "Any Stops";

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0.75,
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          className="flyjatt-filter-trigger flyjatt-touch-btn"
          aria-expanded={isOpen}
          aria-controls={popoverId}
          onClick={supportsNativePopover ? undefined : handleFallbackToggle}
        >
          <TuneRoundedIcon sx={{ fontSize: 18, color: "#007bb0" }} />
          <span>Search Criteria</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 800,
              backgroundColor: "rgba(0, 123, 176, 0.12)",
              color: "#0b4a82",
            }}
          >
            {formatContentSourceSummary(currentFilters.contentSources)}
          </span>
          {currentFilters.connectionType !== "Any" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 800,
                backgroundColor: "rgba(15, 115, 108, 0.12)",
                color: "#0f736c",
              }}
            >
              {selectedConnectionLabel}
            </span>
          )}
          {currentFilters.carriers.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 800,
                backgroundColor: "rgba(217, 119, 6, 0.14)",
                color: "#92400e",
              }}
            >
              {currentFilters.carriers.length} Airline
              {currentFilters.carriers.length > 1 ? "s" : ""}
            </span>
          )}
          {activeFilterCount > 0 && (
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                minWidth: 20,
                height: 20,
                paddingInline: 5,
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 800,
                backgroundColor: "#007bb0",
                color: "#ffffff",
              }}
            >
              {activeFilterCount}
            </span>
          )}
          <KeyboardArrowDownRoundedIcon
            sx={{
              fontSize: 18,
              color: "#0b4a82",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 160ms ease",
            }}
          />
        </button>

        {currentFilters.carriers.slice(0, 4).map((code) => (
          <Chip
            key={`chip-carrier-${code}`}
            size="small"
            label={`${
              currentFilters.carrierPreferenceType === "Prohibited" ? "Exclude" : "Only/Pref"
            } ${code}`}
            onDelete={() => handleToggleCarrier(code)}
            sx={{
              fontWeight: 700,
              bgcolor: "rgba(0,123,176,0.1)",
              color: "#0b4a82",
            }}
          />
        ))}
        {currentFilters.carriers.length > 4 && (
          <Chip
            size="small"
            label={`+${currentFilters.carriers.length - 4} more`}
            sx={{ fontWeight: 700, bgcolor: "#eef6fd", color: "#0b4a82" }}
          />
        )}
      </Box>

      <div
        id={popoverId}
        ref={popoverRef}
        className={`flyjatt-filter-popover${
          !supportsNativePopover && isOpen ? " flyjatt-popover-fallback-open" : ""
        }`}
        hidden={supportsNativePopover ? undefined : !isOpen}
      >
        <Box
          sx={{
            px: 2.2,
            py: 1.5,
            borderBottom: "1px solid #d7e6f5",
            background: "linear-gradient(120deg, #083a66 0%, #007bb0 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>
              Travelport Search Criteria Filters
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.88)", mt: 0.25 }}>
              Sent directly in CatalogProductOfferingsRequestAir, SearchModifiersAir & PricingModifiersAir
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              type="button"
              size="small"
              startIcon={<RestartAltRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => onChange?.(createDefaultTravelportSearchFilters())}
              sx={{
                textTransform: "none",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.78rem",
                borderRadius: "9px",
                border: "1px solid rgba(255,255,255,0.36)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.14)" },
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              size="small"
              aria-label="Close search criteria filters"
              onClick={closePopover}
              sx={{
                minWidth: 36,
                minHeight: 36,
                p: 0.5,
                borderRadius: "9px",
                color: "#ffffff",
                "&:hover": { bgcolor: "rgba(255,255,255,0.16)" },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            p: 2,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.6,
          }}
        >
          {/* 1. Content Source (GDS, NDC, ALL) */}
          <fieldset className="flyjatt-filter-fieldset">
            <legend>Content Source (contentSourceList)</legend>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <label htmlFor={`${baseId}-src-all`} className="flyjatt-check-label">
                <input
                  ref={allSourcesCheckboxRef}
                  id={`${baseId}-src-all`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={allSourcesSelected}
                  onChange={handleToggleAllSources}
                />
                <span>ALL Content Sources (GDS + NDC)</span>
              </label>

              <label htmlFor={`${baseId}-src-gds`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-src-gds`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={hasGds}
                  onChange={() => handleToggleSingleSource("GDS")}
                />
                <span>GDS Only (Edifact / Classic)</span>
              </label>

              <label htmlFor={`${baseId}-src-ndc`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-src-ndc`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={hasNdc}
                  onChange={() => handleToggleSingleSource("NDC")}
                />
                <span>NDC Content</span>
              </label>
            </Box>
          </fieldset>

          {/* 2. Stops & Connection Preferences */}
          <fieldset className="flyjatt-filter-fieldset">
            <legend>Stops &amp; Connections (ConnectionPreferencesAir / FlightType)</legend>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                gap: 0.4,
              }}
            >
              {CONNECTION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`${baseId}-conn-${option.value}`}
                  className="flyjatt-radio-label"
                >
                  <input
                    id={`${baseId}-conn-${option.value}`}
                    type="radio"
                    name={`${baseId}-connection-type`}
                    className="flyjatt-radio-input"
                    value={option.value}
                    checked={currentFilters.connectionType === option.value}
                    onChange={() => updateFilters({ connectionType: option.value })}
                  />
                  <span>
                    {option.label}{" "}
                    <Typography
                      component="span"
                      sx={{ fontSize: "0.75rem", color: "#4e6b88", fontWeight: 500 }}
                    >
                      ({option.hint})
                    </Typography>
                  </span>
                </label>
              ))}
            </Box>

            <Box
              sx={{
                mt: 1.1,
                pt: 1,
                borderTop: "1px dashed #d7e6f5",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.2,
              }}
            >
              <Box>
                <label
                  htmlFor={`${baseId}-max-conn`}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.25rem",
                  }}
                >
                  Max Connection Layover (maxConnectionDuration)
                </label>
                <select
                  id={`${baseId}-max-conn`}
                  className="flyjatt-native-select"
                  value={currentFilters.maxConnectionDuration}
                  onChange={(e) => updateFilters({ maxConnectionDuration: e.target.value })}
                >
                  {MAX_CONNECTION_DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value || "any"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Box>

              <Box>
                <label
                  htmlFor={`${baseId}-max-overnight`}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.25rem",
                  }}
                >
                  Max Overnight Layover (maxOvernightDuration)
                </label>
                <select
                  id={`${baseId}-max-overnight`}
                  className="flyjatt-native-select"
                  value={currentFilters.maxOvernightDuration}
                  onChange={(e) => updateFilters({ maxOvernightDuration: e.target.value })}
                >
                  {MAX_OVERNIGHT_DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value || "any"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Box>
            </Box>

            <Box sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 1 }}>
              <label htmlFor={`${baseId}-no-apt-chg`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-no-apt-chg`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.prohibitChangeOfAirportInd}
                  onChange={(e) =>
                    updateFilters({ prohibitChangeOfAirportInd: e.target.checked })
                  }
                />
                <span>No Airport Change (prohibitChangeOfAirportInd)</span>
              </label>

              <label
                htmlFor={`${baseId}-no-interline`}
                className="flyjatt-check-label"
                style={{ opacity: isNdcOnly ? 0.55 : 1 }}
              >
                <input
                  id={`${baseId}-no-interline`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  disabled={isNdcOnly}
                  checked={!isNdcOnly && currentFilters.excludeInterlineConnectionsInd}
                  onChange={(e) =>
                    updateFilters({ excludeInterlineConnectionsInd: e.target.checked })
                  }
                />
                <span>
                  Exclude Interline Connections {isNdcOnly ? "(GDS only)" : ""}
                </span>
              </label>

              <label htmlFor={`${baseId}-no-train`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-no-train`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.excludeGroundTrain}
                  onChange={(e) =>
                    updateFilters({ excludeGroundTrain: e.target.checked })
                  }
                />
                <span>Exclude Ground / Train Segments</span>
              </label>
            </Box>
          </fieldset>

          {/* 3. Specific Airlines (CarrierPreference) */}
          <fieldset className="flyjatt-filter-fieldset">
            <legend>Specific Airlines (SearchModifiersAir.CarrierPreference)</legend>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                {CARRIER_PREFERENCE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    htmlFor={`${baseId}-car-mode-${opt.value}`}
                    className="flyjatt-radio-label"
                  >
                    <input
                      id={`${baseId}-car-mode-${opt.value}`}
                      type="radio"
                      name={`${baseId}-carrier-pref`}
                      className="flyjatt-radio-input"
                      value={opt.value}
                      checked={currentFilters.carrierPreferenceType === opt.value}
                      onChange={() => updateFilters({ carrierPreferenceType: opt.value })}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </Box>
              {currentFilters.carriers.length > 0 && (
                <Button
                  type="button"
                  size="small"
                  onClick={() => updateFilters({ carriers: [] })}
                  sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem" }}
                >
                  Clear Airlines ({currentFilters.carriers.length})
                </Button>
              )}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                gap: 1,
                mb: 1,
              }}
            >
              <Box>
                <label
                  htmlFor={`${baseId}-airline-search`}
                  style={{
                    display: "block",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.2rem",
                  }}
                >
                  Filter Airlines List
                </label>
                <input
                  id={`${baseId}-airline-search`}
                  type="search"
                  className="flyjatt-native-input"
                  placeholder="Search carrier code or name (e.g. EK, Qatar, Biman)..."
                  value={airlineQuery}
                  onChange={(e) => setAirlineQuery(e.target.value)}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.75 }}>
                <Box sx={{ minWidth: { xs: 140, sm: 165 } }}>
                  <label
                    htmlFor={`${baseId}-custom-iata`}
                    style={{
                      display: "block",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "#294661",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Add Custom IATA
                  </label>
                  <input
                    id={`${baseId}-custom-iata`}
                    type="text"
                    className="flyjatt-native-input"
                    placeholder="e.g. EK, QR"
                    value={customCarrierInput}
                    onChange={(e) => setCustomCarrierInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent?.isComposing) {
                        e.preventDefault();
                        handleAddCustomCarriers();
                      }
                    }}
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </Box>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleAddCustomCarriers}
                  startIcon={<AddRoundedIcon />}
                  sx={{
                    minHeight: 44,
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                maxHeight: 168,
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 0.25,
                p: 0.5,
                borderRadius: "10px",
                border: "1px solid #d7e6f5",
                bgcolor: "#ffffff",
              }}
            >
              {filteredAirlines.map((airline) => {
                const checked = currentFilters.carriers.includes(airline.code);
                return (
                  <label
                    key={airline.code}
                    htmlFor={`${baseId}-air-${airline.code}`}
                    className="flyjatt-check-label"
                    style={{ fontSize: "0.82rem" }}
                  >
                    <input
                      id={`${baseId}-air-${airline.code}`}
                      type="checkbox"
                      className="flyjatt-check-input"
                      checked={checked}
                      onChange={() => handleToggleCarrier(airline.code)}
                    />
                    <span>
                      <strong>{airline.code}</strong> — {airline.name}
                    </span>
                  </label>
                );
              })}
            </Box>
          </fieldset>

          {/* 4. Cabin Preference & Fare Selection (PricingModifiersAir) */}
          <fieldset className="flyjatt-filter-fieldset">
            <legend>Cabin &amp; Fare Rules (CabinPreference / FareSelectionDetail)</legend>

            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#1d3d5c", mb: 0.35 }}
            >
              Cabin Matching Behavior
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 1 }}>
              {CABIN_PREFERENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`${baseId}-cab-${opt.value}`}
                  className="flyjatt-radio-label"
                >
                  <input
                    id={`${baseId}-cab-${opt.value}`}
                    type="radio"
                    name={`${baseId}-cabin-pref`}
                    className="flyjatt-radio-input"
                    value={opt.value}
                    checked={currentFilters.cabinPreferenceType === opt.value}
                    onChange={() => updateFilters({ cabinPreferenceType: opt.value })}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </Box>

            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#1d3d5c", mb: 0.35 }}
            >
              Fare Type (Public / Private)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 1 }}>
              {FARE_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value || "default"}
                  htmlFor={`${baseId}-ftype-${opt.value || "default"}`}
                  className="flyjatt-radio-label"
                >
                  <input
                    id={`${baseId}-ftype-${opt.value || "default"}`}
                    type="radio"
                    name={`${baseId}-fare-type`}
                    className="flyjatt-radio-input"
                    value={opt.value}
                    checked={currentFilters.fareType === opt.value}
                    onChange={() => updateFilters({ fareType: opt.value })}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 0.25,
                pt: 0.6,
                borderTop: "1px dashed #d7e6f5",
              }}
            >
              <label htmlFor={`${baseId}-refundable`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-refundable`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.refundableOnlyInd}
                  onChange={(e) =>
                    updateFilters({ refundableOnlyInd: e.target.checked })
                  }
                />
                <span>Refundable Fares Only (refundableOnlyInd)</span>
              </label>

              <label htmlFor={`${baseId}-no-minstay`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-no-minstay`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.prohibitMinStayFaresInd}
                  onChange={(e) =>
                    updateFilters({ prohibitMinStayFaresInd: e.target.checked })
                  }
                />
                <span>Exclude Min-Stay Fares</span>
              </label>

              <label htmlFor={`${baseId}-no-maxstay`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-no-maxstay`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.prohibitMaxStayFaresInd}
                  onChange={(e) =>
                    updateFilters({ prohibitMaxStayFaresInd: e.target.checked })
                  }
                />
                <span>Exclude Max-Stay Fares</span>
              </label>

              <label htmlFor={`${baseId}-no-advpur`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-no-advpur`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.prohibitAdvancePurchaseFaresInd}
                  onChange={(e) =>
                    updateFilters({
                      prohibitAdvancePurchaseFaresInd: e.target.checked,
                    })
                  }
                />
                <span>Exclude Advance-Purchase Fares</span>
              </label>
            </Box>
          </fieldset>

          {/* 5. Pricing, Upsells, Currency & NDC Promo Code */}
          <fieldset className="flyjatt-filter-fieldset">
            <legend>Catalog Response, Currency &amp; Upsells</legend>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.2,
              }}
            >
              <Box>
                <label
                  htmlFor={`${baseId}-currency`}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.25rem",
                  }}
                >
                  Currency (PricingModifiersAir.currencyCode)
                </label>
                <select
                  id={`${baseId}-currency`}
                  className="flyjatt-native-select"
                  value={currentFilters.currencyCode}
                  onChange={(e) => updateFilters({ currencyCode: e.target.value })}
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value || "default"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Box>

              <Box>
                <label
                  htmlFor={`${baseId}-upsells`}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.25rem",
                  }}
                >
                  Upsells Count (maxNumberOfUpsellsToReturn)
                </label>
                <select
                  id={`${baseId}-upsells`}
                  className="flyjatt-native-select"
                  value={currentFilters.maxNumberOfUpsellsToReturn}
                  onChange={(e) =>
                    updateFilters({ maxNumberOfUpsellsToReturn: e.target.value })
                  }
                >
                  {UPSELL_COUNT_OPTIONS.map((opt) => (
                    <option key={opt.value || "env"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Box>

              <Box>
                <label
                  htmlFor={`${baseId}-promo-code`}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.25rem",
                  }}
                >
                  Promo Code (NDC only)
                </label>
                <input
                  id={`${baseId}-promo-code`}
                  type="text"
                  className="flyjatt-native-input"
                  placeholder="Optional promo code"
                  value={currentFilters.promotionalCode}
                  onChange={(e) => updateFilters({ promotionalCode: e.target.value })}
                  disabled={!hasNdc}
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </Box>

              <Box>
                <label
                  htmlFor={`${baseId}-promo-supplier`}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#294661",
                    marginBottom: "0.25rem",
                  }}
                >
                  Promo Airline IATA (2 letters, NDC)
                </label>
                <input
                  id={`${baseId}-promo-supplier`}
                  type="text"
                  maxLength={2}
                  className="flyjatt-native-input"
                  placeholder={
                    currentFilters.carriers.length === 1
                      ? `Auto: ${currentFilters.carriers[0]}`
                      : "e.g. BA"
                  }
                  value={currentFilters.promotionalCodeSupplier}
                  onChange={(e) =>
                    updateFilters({ promotionalCodeSupplier: e.target.value })
                  }
                  disabled={!hasNdc}
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 1 }}>
              <label htmlFor={`${baseId}-branded`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-branded`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.returnBrandedFaresInd}
                  onChange={(e) =>
                    updateFilters({ returnBrandedFaresInd: e.target.checked })
                  }
                />
                <span>Include Branded Fares (returnBrandedFaresInd)</span>
              </label>

              <label htmlFor={`${baseId}-excl-bag-fees`} className="flyjatt-check-label">
                <input
                  id={`${baseId}-excl-bag-fees`}
                  type="checkbox"
                  className="flyjatt-check-input"
                  checked={currentFilters.excludeBaggageFeesInd}
                  onChange={(e) =>
                    updateFilters({ excludeBaggageFeesInd: e.target.checked })
                  }
                />
                <span>Exclude Optional Bag Fees in Offer Calc</span>
              </label>
            </Box>
          </fieldset>

          {/* 6. Round-Trip Search Representation (Combinable vs Leg-Based / Next Leg) */}
          <fieldset className="flyjatt-filter-fieldset">
            <legend>Round-Trip Mode (SearchRepresentation)</legend>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 0.85,
                mt: 0.4,
              }}
            >
              {ROUND_TRIP_SEARCH_MODES.map((option) => {
                const isSelected = currentFilters.roundTripSearchMode === option.value;
                return (
                  <label
                    key={option.value}
                    htmlFor={`${baseId}-rt-mode-${option.value}`}
                    className="flyjatt-radio-label"
                    style={{
                      border: isSelected
                        ? "1px solid #007bb0"
                        : "1px solid #d7e6f5",
                      background: isSelected ? "#eef7fd" : "#ffffff",
                      alignItems: "flex-start",
                      paddingBlock: "0.55rem",
                    }}
                  >
                    <input
                      id={`${baseId}-rt-mode-${option.value}`}
                      type="radio"
                      name={`${baseId}-rt-mode`}
                      className="flyjatt-radio-input"
                      style={{ marginTop: "0.15rem" }}
                      checked={isSelected}
                      onChange={() =>
                        updateFilters({ roundTripSearchMode: option.value })
                      }
                    />
                    <span>
                      <span style={{ display: "block", fontWeight: 700, color: "#0f2942" }}>
                        {option.label}
                      </span>
                      <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 500, color: "#4c657f" }}>
                        {option.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </Box>
          </fieldset>
        </Box>

        <Box
          sx={{
            px: 2.2,
            py: 1.35,
            borderTop: "1px solid #d7e6f5",
            bgcolor: "#f5fafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1d3d5c" }}>
            Source: {formatContentSourceSummary(currentFilters.contentSources)} |{" "}
            {selectedConnectionLabel}
            {currentFilters.carriers.length > 0
              ? ` | ${currentFilters.carriers.length} Airline(s)`
              : ""}
          </Typography>
          <Button
            type="button"
            variant="contained"
            startIcon={<CheckCircleRoundedIcon />}
            onClick={closePopover}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "10px",
              px: 2.2,
              background: "linear-gradient(120deg, #0b4a82 0%, #007bb0 100%)",
            }}
          >
            Done
          </Button>
        </Box>
      </div>
    </Box>
  );
};

export default SearchCriteriaFilter;
