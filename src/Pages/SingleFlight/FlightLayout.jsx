import { Box, Grid, Tooltip, Typography } from "@mui/material";
import moment from "moment";
import React from "react";
import { convertMinutesToHoursAndMinutes } from "../common/funcation";
import { resolveAirlineName, resolveAirportInfo } from "../../utils/travelLookup";

const formatTime = (value) => {
  if (!value) return "--:--";
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("HH:mm") : "--:--";
};

const formatDate = (value) => {
  if (!value) return "--";
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("ddd, DD MMM YYYY") : "--";
};

const getStopLabel = (segments = []) => {
  const stopCount = Math.max((segments?.length || 1) - 1, 0);
  if (stopCount === 0) return "Non-stop";
  return `${stopCount} Stop${stopCount > 1 ? "s" : ""}`;
};

const getLayoverDetails = (segments = []) => {
  if (!Array.isArray(segments) || segments.length < 2) return [];

  return segments.slice(0, -1).map((segment, index) => {
    const nextSegment = segments[index + 1] || {};
    const arrTime = moment(segment?.ArrTime);
    const depTime = moment(nextSegment?.DepTime);
    const connectionMinutes =
      arrTime.isValid() && depTime.isValid()
        ? Math.max(depTime.diff(arrTime, "minutes"), 0)
        : null;

    const layoverCode = segment?.ArrTo || nextSegment?.DepFrom || "";
    const layoverNameFallback = segment?.ArrAirPort || nextSegment?.DepAirPort || "";
    const layoverAddressFallback =
      segment?.ArrLocation || nextSegment?.DepLocation || "";
    const layoverAirportInfo = resolveAirportInfo(
      layoverCode,
      layoverNameFallback,
      layoverAddressFallback
    );

    return {
      code: layoverAirportInfo.code || layoverCode || "--",
      name: layoverAirportInfo.name || layoverNameFallback || "Transit airport",
      address: layoverAirportInfo.address || layoverAddressFallback,
      duration:
        connectionMinutes === null
          ? "N/A"
          : convertMinutesToHoursAndMinutes(connectionMinutes),
    };
  });
};

const FlightLayout = ({ alllegs, flight, booking }) => {
  const segments = Array.isArray(alllegs?.Segments) ? alllegs.Segments : [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || {};

  const marketingCarrier = booking
    ? flight?.MarketingCarrier
    : firstSegment?.MarketingCarrier;
  const marketingCarrierNameRaw = booking
    ? flight?.MarketingCarrierName
    : firstSegment?.MarketingCarrierName;
  const marketingCarrierName = resolveAirlineName(
    marketingCarrier,
    marketingCarrierNameRaw
  );

  const flightNumbers = booking
    ? `${flight?.MarketingCarrier || ""}-${flight?.MarketingFlightNumber || ""}`
    : segments
        .map((segment) =>
          `${segment?.MarketingCarrier || ""}-${segment?.MarketingFlightNumber || ""}`
        )
        .filter((item) => !item.startsWith("-"))
        .join(" • ");

  const depCode = booking ? flight?.DepFrom : alllegs?.DepFrom;
  const depDateTime = booking ? flight?.DepDate : alllegs?.DepDate;
  const depAirport = booking ? flight?.DepAirPort : firstSegment?.DepAirPort;
  const depAirportLocation = booking
    ? flight?.DepLocation
    : firstSegment?.DepLocation;

  const arrCode = booking ? flight?.ArrTo : alllegs?.ArrTo;
  const arrDateTime = booking
    ? flight?.ArrDate || flight?.ArrTime
    : lastSegment?.ArrTime;
  const arrAirport = booking ? flight?.ArrAirPort : lastSegment?.ArrAirPort;
  const arrAirportLocation = booking
    ? flight?.ArrLocation
    : lastSegment?.ArrLocation;

  const depAirportInfo = resolveAirportInfo(
    depCode || depAirport,
    depAirport,
    depAirportLocation
  );
  const arrAirportInfo = resolveAirportInfo(
    arrCode || arrAirport,
    arrAirport,
    arrAirportLocation
  );

  const durationMinutes = booking ? flight?.Duration : alllegs?.Duration;
  const durationLabel = convertMinutesToHoursAndMinutes(durationMinutes || 0);
  const stopLabel = getStopLabel(segments);
  const layoverDetails = getLayoverDetails(segments);
  const hasLayoverDetails = layoverDetails.length > 0;
  const stopCount = Math.max((segments?.length || 1) - 1, 0);
  const timelineNodeCount = Math.min(stopCount, 3);
  const timelineNodes = Array.from({ length: timelineNodeCount }, (_, index) =>
    ((index + 1) / (timelineNodeCount + 1)) * 100
  );

  return (
    <Grid container spacing={{ xs: 1, md: 1.2 }} alignItems="center">
      <Grid item xs={12} md={2.7}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
          <Box
            sx={{
              width: { xs: 30, md: 36 },
              height: { xs: 30, md: 36 },
              borderRadius: "9px",
              border: "1px solid rgba(0,154,214,0.2)",
              backgroundColor: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <img
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
              }}
              src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${marketingCarrier}.png`}
              alt={`${marketingCarrierName || "Airline"} logo`}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: "var(--depature-color)",
                fontWeight: 700,
                fontSize: { xs: "12px", md: "13px" },
                lineHeight: 1.2,
              }}
              noWrap
            >
              {marketingCarrierName || marketingCarrier || "Airline"}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "11px", md: "12px" },
                color: "#5E7388",
                lineHeight: 1.2,
              }}
              noWrap
            >
              {flightNumbers || "Flight details unavailable"}
            </Typography>
          </Box>
        </Box>
      </Grid>

      <Grid item xs={4.8} md={3}>
        <Typography
          sx={{
            color: "var(--depature-color)",
            fontSize: { xs: "14px", md: "19px" },
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {depCode || "--"}
          <span
            style={{
              marginLeft: "6px",
              color: "var(--primary-button)",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {formatTime(depDateTime)}
          </span>
        </Typography>
          <Typography
            sx={{
              color: "#6B7F94",
              fontSize: { xs: "11px", md: "12px" },
              lineHeight: 1.2,
            }}
            noWrap
          >
            {depAirportInfo.name || depCode || "--"}
          </Typography>
          <Typography
            sx={{
              color: "#8297AB",
              fontSize: { xs: "9px", md: "10px" },
              lineHeight: 1.2,
            }}
            noWrap
          >
            {depAirportInfo.address || depAirportLocation || ""}
          </Typography>
          <Typography
            sx={{
              color: "var(--flight-text-color)",
              fontSize: { xs: "10px", md: "11px" },
            lineHeight: 1.2,
          }}
        >
          {formatDate(depDateTime)}
        </Typography>
      </Grid>

      <Grid item xs={2.4} md={3.3}>
        <Box sx={{ textAlign: "center", px: { xs: 0.3, md: 0.8 } }}>
          <Typography
            sx={{
              fontSize: { xs: "9px", md: "11px" },
              color: "#627A94",
              fontWeight: 600,
              mb: 0.35,
            }}
          >
            {durationLabel}
          </Typography>
          <Box
            sx={{
              position: "relative",
              height: "12px",
              mb: 0.35,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                borderTop: "1px dashed #9FC2DD",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: "50%",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--primary-button)",
                transform: "translate(-10%, -50%)",
              }}
            />
            {timelineNodes.map((position, idx) => (
              <Box
                key={`timeline-stop-${idx}`}
                sx={{
                  position: "absolute",
                  left: `${position}%`,
                  top: "50%",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#325D83",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
            <Box
              sx={{
                position: "absolute",
                right: 0,
                top: "50%",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--primary-button)",
                transform: "translate(10%, -50%)",
              }}
            />
          </Box>
          <Tooltip
            arrow
            placement="bottom"
            disableHoverListener={!hasLayoverDetails}
            title={
              hasLayoverDetails ? (
                <Box sx={{ py: 0.3 }}>
                  {layoverDetails.map((layover, index) => (
                    <Box
                      key={`layover-${index}`}
                      sx={{
                        mb: index === layoverDetails.length - 1 ? 0 : 0.7,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#fff",
                          lineHeight: 1.25,
                        }}
                      >
                        Connection {index + 1}: {layover.duration}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#E4EEFF",
                          lineHeight: 1.25,
                        }}
                      >
                        {layover.code} - {layover.name}
                      </Typography>
                      {layover.address ? (
                        <Typography
                          sx={{
                            fontSize: "10px",
                            color: "#C7DAF5",
                            lineHeight: 1.2,
                          }}
                        >
                          {layover.address}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Box>
              ) : (
                ""
              )
            }
          >
            <Typography
              sx={{
                fontSize: { xs: "9px", md: "11px" },
                color: "#435D78",
                fontWeight: 600,
                cursor: hasLayoverDetails ? "help" : "default",
                textDecoration: hasLayoverDetails ? "underline dotted" : "none",
                textUnderlineOffset: "2px",
              }}
            >
              {stopLabel}
            </Typography>
          </Tooltip>
        </Box>
      </Grid>

      <Grid item xs={4.8} md={3}>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            sx={{
              color: "var(--depature-color)",
              fontSize: { xs: "14px", md: "19px" },
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                marginRight: "6px",
                color: "var(--primary-button)",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {formatTime(arrDateTime)}
            </span>
            {arrCode || "--"}
          </Typography>
          <Typography
            sx={{
              color: "#6B7F94",
              fontSize: { xs: "11px", md: "12px" },
              lineHeight: 1.2,
            }}
            noWrap
          >
            {arrAirportInfo.name || arrCode || "--"}
          </Typography>
          <Typography
            sx={{
              color: "#8297AB",
              fontSize: { xs: "9px", md: "10px" },
              lineHeight: 1.2,
            }}
            noWrap
          >
            {arrAirportInfo.address || arrAirportLocation || ""}
          </Typography>
          <Typography
            sx={{
              color: "var(--flight-text-color)",
              fontSize: { xs: "10px", md: "11px" },
              lineHeight: 1.2,
            }}
          >
            {formatDate(arrDateTime)}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

export default FlightLayout;
