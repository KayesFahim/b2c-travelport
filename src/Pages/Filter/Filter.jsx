import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import React, { memo, useState } from "react";
import TimeSesation from "../BookingDetaills/TimeSesation/TimeSesation";
import Slider from "@mui/material/Slider";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const stops = [
  { label: "Direct", value: 1 },
  { label: "1 Stop", value: 2 },
  { label: "1+ Stop", value: 3 },
];

const refundable = [
  { name: "Non Refundable", value: false },
  { name: "Refundable", value: true },
];

const timeBuckets = [
  { name: "Morning", startTime: "06:00:00", endTime: "11:59:59" },
  { name: "Afternoon", startTime: "12:00:00", endTime: "17:59:59" },
  { name: "Evening", startTime: "18:00:00", endTime: "23:59:59" },
];

const connectionDurations = [
  { name: "Short", value: "short", helper: "< 2h layover" },
  { name: "Medium", value: "medium", helper: "2h to 4h layover" },
  { name: "Long", value: "long", helper: "> 4h layover" },
];

const sectionTitleSx = {
  color: "#1E2A3B",
  fontSize: 13,
  fontWeight: 700,
};

const sectionSx = {
  px: 0,
  py: 0,
  borderBottom: "1px solid #EDF1F7",
};

const sectionContentSx = {
  mt: 1.1,
};

const chipButtonSx = (active) => ({
  borderRadius: "999px",
  textTransform: "none",
  fontWeight: 600,
  borderColor: active ? "var(--primary-color)" : "#D9E0EC",
  color: active ? "var(--primary-color)" : "#425466",
  backgroundColor: active ? "rgba(14, 116, 144, 0.08)" : "#FFFFFF",
  "&:hover": {
    borderColor: "var(--primary-color)",
    backgroundColor: active ? "rgba(14, 116, 144, 0.14)" : "#F6F9FC",
  },
});

const FilterSection = ({ title, children, borderBottom = true }) => (
  <Accordion
    defaultExpanded
    sx={{
      ...sectionSx,
      boxShadow: "none",
      "&:before": {
        display: "none",
      },
      borderBottom: borderBottom ? sectionSx.borderBottom : "none",
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      sx={{
        px: 1.5,
        minHeight: "unset",
        "& .MuiAccordionSummary-content": {
          my: 1.4,
        },
      }}
    >
      <Typography sx={sectionTitleSx}>{title}</Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ px: 1.5, pb: 1.4, pt: 0 }}>
      <Box sx={sectionContentSx}>{children}</Box>
    </AccordionDetails>
  </Accordion>
);

const Filter = memo(
  ({
    flightData,
    uniqueLayover = [],
    handleResetData,
    handleRefundable,
    handleAirLine,
    handleStops,
    selectedStops,
    handleLayover,
    handleDepartTime,
    selectedDepartTime,
    selectedArrivalTime,
    selectedAirlins,
    selectedRefundable,
    selectedLayover,
    uniqueCarriers = [],
    uniqueBaggages = [],
    handleBaggage,
    selectedBaggage,
    priceRange,
    handlePriceRangeChange,
    minPrice,
    maxPrice,
    selectedConnectionDuration = [],
    handleConnectionDuration = () => {},
  }) => {
    const [showAllAirlines, setShowAllAirlines] = useState(false);
    const [showAllLayovers, setShowAllLayovers] = useState(false);

    const visibleAirlines = showAllAirlines
      ? uniqueCarriers
      : uniqueCarriers.slice(0, 6);
    const visibleLayovers = showAllLayovers
      ? uniqueLayover
      : uniqueLayover.slice(0, 6);

    return (
      <Box
        sx={{
          border: "1px solid #E6EDF7",
          borderRadius: "14px",
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: 1.5,
            py: 1.2,
            borderBottom: "1px solid #E8EEF8",
            background:
              "linear-gradient(180deg, rgba(243,248,255,0.9) 0%, rgba(255,255,255,1) 100%)",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1A2D45",
              }}
            >
              Smart Filters
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: "#6A7C92",
              }}
            >
              {flightData?.length || 0} flights found
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ display: { xs: "none", lg: "block" } }}>
              <TimeSesation searchlimit="searchlimit" />
            </Box>
            <Button
              onClick={handleResetData}
              sx={{
                borderRadius: "999px",
                px: 1.5,
                py: 0.5,
                textTransform: "none",
                fontSize: "12px",
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: "var(--primary-color)",
                "&:hover": {
                  backgroundColor: "var(--primary-color)",
                  opacity: 0.95,
                },
              }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>

        <FilterSection title="Price Range">
          <Slider
            value={priceRange}
            onChange={handlePriceRangeChange}
            valueLabelDisplay="auto"
            min={minPrice}
            max={maxPrice}
            sx={{ color: "var(--primary-color)" }}
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 12, color: "#64748B" }}>
              {minPrice}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#64748B" }}>
              {maxPrice}
            </Typography>
          </Stack>
        </FilterSection>

        <FilterSection title="Stops">
          <Grid container spacing={1}>
            {stops.map((item) => {
              const active = selectedStops.includes(item.value);
              return (
                <Grid key={item.value} item xs={6}>
                  <Button
                    fullWidth
                    variant={active ? "contained" : "outlined"}
                    onClick={() => handleStops(item.value)}
                    sx={{
                      borderRadius: "10px",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 12,
                      borderColor: active ? "var(--primary-color)" : "#CCD7E7",
                      color: active ? "#FFFFFF" : "#2B3B4F",
                      backgroundColor: active
                        ? "var(--primary-color)"
                        : "transparent",
                      "&:hover": {
                        backgroundColor: active
                          ? "var(--primary-color)"
                          : "#F8FAFC",
                        borderColor: "var(--primary-color)",
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </FilterSection>

        <FilterSection title="Flight Time (Departure)">
          <Grid container spacing={1}>
            {timeBuckets.map((timeItem) => {
              const active = selectedDepartTime?.name === timeItem.name;
              return (
                <Grid item xs={6} key={`depart-${timeItem.name}`}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() =>
                      handleDepartTime(
                        "Depart",
                        timeItem.name,
                        timeItem.startTime,
                        timeItem.endTime
                      )
                    }
                    sx={chipButtonSx(active)}
                  >
                    {timeItem.name}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </FilterSection>

        <FilterSection title="Flight Time (Arrival)">
          <Grid container spacing={1}>
            {timeBuckets.map((timeItem) => {
              const active = selectedArrivalTime?.name === timeItem.name;
              return (
                <Grid item xs={6} key={`arrival-${timeItem.name}`}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() =>
                      handleDepartTime(
                        "Arrival",
                        timeItem.name,
                        timeItem.startTime,
                        timeItem.endTime
                      )
                    }
                    sx={chipButtonSx(active)}
                  >
                    {timeItem.name}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </FilterSection>

        <FilterSection title="Connection Duration">
          <Grid container spacing={1}>
            {connectionDurations.map((item) => {
              const active = selectedConnectionDuration.includes(item.value);
              return (
                <Grid item xs={12} key={item.value}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleConnectionDuration(item.value)}
                    sx={{
                      ...chipButtonSx(active),
                      justifyContent: "space-between",
                      px: 1.4,
                    }}
                  >
                    <span>{item.name}</span>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>
                      {item.helper}
                    </span>
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </FilterSection>

        <FilterSection title="Airlines">
          {visibleAirlines.map((airline) => (
            <Box
              key={airline.code}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 0.4,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.6}>
                <Checkbox
                  size="small"
                  checked={selectedAirlins.includes(airline.code)}
                  onChange={() => handleAirLine(airline.code)}
                  sx={{
                    color: "#A4B4CB",
                    "&.Mui-checked": {
                      color: "var(--primary-color)",
                    },
                  }}
                />
                <img
                  src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${airline.code}.png`}
                  alt={airline.name}
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                <Typography sx={{ fontSize: 13, color: "#334155" }}>
                  {airline.name}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 11, color: "#6B7C93" }}>
                {airline.price}
              </Typography>
            </Box>
          ))}
          {uniqueCarriers.length > 6 && (
            <Button
              onClick={() => setShowAllAirlines((prev) => !prev)}
              sx={{
                mt: 1,
                textTransform: "none",
                fontSize: 12,
                color: "var(--primary-color)",
                fontWeight: 600,
              }}
            >
              {showAllAirlines ? "Show Less" : "Show More"}
            </Button>
          )}
        </FilterSection>

        <FilterSection title="Fare Type">
          {refundable.map((item) => (
            <Stack
              key={item.name}
              direction="row"
              alignItems="center"
              spacing={0.6}
              sx={{ py: 0.2 }}
            >
              <Checkbox
                size="small"
                checked={selectedRefundable.includes(item.value)}
                onChange={() => handleRefundable(item.value)}
                sx={{
                  color: "#A4B4CB",
                  "&.Mui-checked": {
                    color: "var(--primary-color)",
                  },
                }}
              />
              <Typography sx={{ fontSize: 13, color: "#334155" }}>
                {item.name}
              </Typography>
            </Stack>
          ))}
        </FilterSection>

        <FilterSection title="Baggage">
          {uniqueBaggages.map((bag) => (
            <Stack
              key={bag.name}
              direction="row"
              alignItems="center"
              spacing={0.6}
              sx={{ py: 0.2 }}
            >
              <Checkbox
                size="small"
                checked={selectedBaggage.includes(bag.name)}
                onChange={() => handleBaggage(bag.name)}
                sx={{
                  color: "#A4B4CB",
                  "&.Mui-checked": {
                    color: "var(--primary-color)",
                  },
                }}
              />
              <Typography sx={{ fontSize: 13, color: "#334155" }}>
                {bag.name}
              </Typography>
            </Stack>
          ))}
        </FilterSection>

        {uniqueLayover.length > 0 && (
          <FilterSection title="Layover Airport" borderBottom={false}>
            {visibleLayovers.map((layover) => (
              <Stack
                key={layover.code}
                direction="row"
                alignItems="center"
                spacing={0.6}
                sx={{ py: 0.2 }}
              >
                <Checkbox
                  size="small"
                  checked={selectedLayover.includes(layover.code)}
                  onChange={() => handleLayover(layover.code)}
                  sx={{
                    color: "#A4B4CB",
                    "&.Mui-checked": {
                      color: "var(--primary-color)",
                    },
                  }}
                />
                <Typography sx={{ fontSize: 13, color: "#334155" }} noWrap>
                  {layover.name}
                </Typography>
              </Stack>
            ))}
            {uniqueLayover.length > 6 && (
              <Button
                onClick={() => setShowAllLayovers((prev) => !prev)}
                sx={{
                  mt: 1,
                  textTransform: "none",
                  fontSize: 12,
                  color: "var(--primary-color)",
                  fontWeight: 600,
                }}
              >
                {showAllLayovers ? "Show Less" : "Show More"}
              </Button>
            )}
          </FilterSection>
        )}
      </Box>
    );
  }
);

export default Filter;
