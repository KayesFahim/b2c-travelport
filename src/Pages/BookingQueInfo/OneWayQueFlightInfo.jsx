import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import moment from "moment";
import BookingFlightInfoSlikton from "./BookingFlightInfoSlikton";

const OneWayQueFlightInfo = ({ loading, quesData }) => {
  const convertMinutesToHoursAndMinutes = (Duration) => {
    const hours = Math.floor(Duration / 60);
    const minutes = Duration % 60;
    return `${hours}H ${minutes}Min`;
  };
  return (
    <Box>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow
              style={{
                backgroundColor: "var(--primary-button)",
                color: "white",
              }}
            >
              <TableCell
                style={{ color: "white", textAlign: "left", fontSize: "12px" }}
              >
                Flight
              </TableCell>
              <TableCell
                style={{ color: "white", textAlign: "left", fontSize: "12px" }}
              >
                Departure From
              </TableCell>
              <TableCell
                style={{ color: "white", textAlign: "left", fontSize: "12px" }}
              >
                Arrival To
              </TableCell>
              <TableCell
                style={{ color: "white", textAlign: "left", fontSize: "12px" }}
              >
                Depart At
              </TableCell>
              <TableCell
                style={{ color: "white", textAlign: "left", fontSize: "12px" }}
              >
                Arrive At
              </TableCell>
              <TableCell
                style={{ color: "white", textAlign: "left", fontSize: "12px" }}
              >
                Info
              </TableCell>
            </TableRow>
          </TableHead>
          {loading ? (
            <BookingFlightInfoSlikton />
          ) : (
            <TableBody>
            {quesData[0]?.AllLegsInfo?.map((leg, legIndex) =>
              leg?.Segments.map((flight, segmentIndex) => (
                <TableRow
                  key={`${legIndex}-${segmentIndex}`}
                  sx={{
                    borderBottom: "2px solid #f5f5f5",
                  }}
                >
                  {/* Flight Information */}
                  <TableCell
                    sx={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "12px",
                      alignItems: "center",
                      border: "none",
                    }}
                  >
                    <img
                      style={{ height: "65px", width: "65px" }}
                      src={`https://tbbd-flight.s3.ap-southeast-1.amazonaws.com/airlines-logo/${flight?.MarketingCarrier}.png`}
                      alt={`${
                        flight?.MarketingCarrierName || "Airline"
                      } logo`}
                    />
                    <Typography sx={{ fontSize: "12px" }}>
                      {flight?.MarketingCarrierName}
                      <br />
                      <span style={{ color: "#C32126", fontSize: "12px" }}>
                        {flight?.MarketingCarrier}{" "}
                        {flight?.MarketingFlightNumber}
                      </span>
                    </Typography>
                  </TableCell>

                  {/* Departure From */}
                  <TableCell sx={{ fontSize: "12px", padding: "8px" }}>
                    ({flight?.DepFrom}) {flight?.DepAirPort}
                  </TableCell>

                  {/* Arrival To */}
                  <TableCell sx={{ fontSize: "12px", padding: "8px" }}>
                    ({flight?.ArrTo}) {flight?.ArrAirPort}
                  </TableCell>

                  {/* Depart At */}
                  <TableCell sx={{ fontSize: "12px", padding: "8px" }}>
                    {flight?.DepTime
                      ? moment(flight.DepTime).format("DD MMM YYYY hh:mm A")
                      : "N/A"}
                  </TableCell>

                  {/* Arrive At */}
                  <TableCell sx={{ fontSize: "12px", padding: "8px" }}>
                    {flight?.ArrTime
                      ? moment(flight.ArrTime).format("DD MMM YYYY hh:mm A")
                      : "N/A"}
                  </TableCell>

                  {/* Additional Info */}
                  <TableCell sx={{ fontSize: "12px", padding: "8px" }}>
                    <Typography sx={{ fontSize: "11px" }}>
                      Cabin: 7 Kg
                    </Typography>
                    <Typography sx={{ fontSize: "11px" }}>
                      Class: {flight?.SegmentCode?.bookingCode}
                    </Typography>
                    {quesData[0]?.PriceBreakDown?.map((pax, paxIndex) => (
                      <Typography
                        key={`pax-${paxIndex}`}
                        sx={{
                          fontSize: "11px",
                          fontWeight: 500,
                          textAlign: "left",
                        }}
                      >
                        {pax.PaxType}:{" "}
                        {pax?.Bag?.map((bag, bagIndex) => (
                          <span
                            key={`bag-${paxIndex}-${bagIndex}`}
                            style={{ fontWeight: 400 }}
                          >
                            {bag.Allowance}
                            {bagIndex < pax?.Bag?.length - 1 && ", "}
                          </span>
                        ))}
                      </Typography>
                    ))}
                    <Typography sx={{ fontSize: "11px" }}>
                      Duration:{" "}
                      {convertMinutesToHoursAndMinutes(flight?.Duration)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          )}
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OneWayQueFlightInfo;
