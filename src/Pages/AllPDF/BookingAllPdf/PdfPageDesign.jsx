import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import moment from "moment";
import commaNumber from "comma-number";
import { ToWords } from "to-words";

const toWords = new ToWords({
  localeCode: "en-BD",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: {
      name: "Taka",
      plural: "Taka",
      symbol: "BDT ",
      fractionalUnit: {
        name: "Paisa",
        plural: "Paisa",
        symbol: "",
      },
    },
  },
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#F1F7FC",
    padding: "30px 40px",
    fontFamily: "Helvetica",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    border: "1px solid #DFE7EF",
    marginBottom: 15,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: "#0f4b7d",
    padding: "8px 15px",
  },
  cardHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  brandBox: {
    backgroundColor: "#0f4b7d",
    padding: "10px 20px",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    fontWeight: "heavy",
  },
  companyInfo: {
    color: "#607890",
    fontSize: 9,
    marginTop: 5,
    lineHeight: 1.4,
  },
  badge: {
    backgroundColor: "#E8F3FF",
    border: "1px solid #BFE0FF",
    color: "#15488C",
    padding: "5px 10px",
    borderRadius: 4,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoGridRow: {
    flexDirection: "row",
    padding: "10px 15px",
    backgroundColor: "#F9FBFC",
    borderBottom: "1px solid #DFE7EF",
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: "#607890",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    color: "#15324f",
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F4F7FA",
    borderBottom: "1px solid #DFE7EF",
    padding: "8px 15px",
  },
  tableRow: {
    flexDirection: "row",
    padding: "10px 15px",
    borderBottom: "1px dashed #EBEEF3",
  },
  tableColHeader: {
    fontSize: 9,
    color: "#607890",
    fontFamily: "Helvetica-Bold",
  },
  tableColValue: {
    fontSize: 9,
    color: "#15324f",
  },
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: "15px",
    backgroundColor: "#F9FBFC",
  },
  summaryGrid: {
    width: "50%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#607890",
  },
  summaryValue: {
    fontSize: 10,
    color: "#15324f",
    fontFamily: "Helvetica-Bold",
  },
  summaryTotalLabel: {
    fontSize: 11,
    color: "#0f4b7d",
    fontFamily: "Helvetica-Bold",
  },
  summaryTotalValue: {
    fontSize: 12,
    color: "#0f4b7d",
    fontFamily: "Helvetica-Bold",
  },
  notesBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#FCFDFD",
    border: "1px dashed #CCDBEA",
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 9,
    color: "#c0392b",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8,
    color: "#607890",
    lineHeight: 1.4,
  },
});

const PDFPageDesign = ({ SingleBooking }) => {
  const pdfData = SingleBooking[0];
  const netFare = pdfData?.NetFare || 0;
  const netFareInWords = toWords.convert(netFare);
  const discount = (pdfData?.GrossFare || 0) - netFare;
  const bookingCopyType =
    pdfData?.BookingStatus === "IssueInProcess" ? "E-Ticket Copy" : "Booking Copy";

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER SECTION */}
        <View style={styles.headerSection}>
          <View>
            <View style={styles.brandBox}>
              <Text style={styles.brandText}>Fly Jatt</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text>Mirpur-14, Dhaka 1216</Text>
              <Text>Email: info@flyjatt.com | Phone: +8801736-987906</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 5 }}>
            <View style={styles.badge}>
              <Text>{bookingCopyType}</Text>
            </View>
            <View style={{ ...styles.badge, backgroundColor: "#E6F9EE", borderColor: "#C9EAD7", color: "#1A7A41" }}>
              <Text>{pdfData?.BookingStatus || "Booked"}</Text>
            </View>
          </View>
        </View>

        {/* BOOKING INFO SUMMARY */}
        <View style={styles.card}>
          <View style={styles.infoGridRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>PNR</Text>
              <Text style={{ ...styles.value, color: "#c0392b", fontSize: 13 }}>{pdfData?.PNR || "N/A"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Booking Date</Text>
              <Text style={styles.value}>{moment(pdfData?.BookingDate).format("DD MMM YYYY")}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Flight Type</Text>
              <Text style={styles.value}>{pdfData?.TripType || "OneWay"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Booking ID</Text>
              <Text style={styles.value}>{pdfData?.BookingId || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* FLIGHT ITINERARIES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>FLIGHT ITINERARY</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableColHeader, width: "15%" }}>Route</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%" }}>Airline & Flight</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%" }}>Departure</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%" }}>Arrival</Text>
            <Text style={{ ...styles.tableColHeader, width: "15%" }}>Terminal</Text>
            <Text style={{ ...styles.tableColHeader, width: "10%" }}>Class</Text>
          </View>
          {(pdfData?.AllLegsInfo || []).map((leg, lIdx) => (
            <View key={lIdx}>
              {(leg.Segments || []).map((segment, sIdx) => (
                <View key={sIdx} style={styles.tableRow}>
                  <Text style={{ ...styles.tableColValue, width: "15%", fontFamily: "Helvetica-Bold" }}>
                    {segment?.DepFrom} - {segment?.ArrTo}
                  </Text>
                  <View style={{ width: "20%" }}>
                    <Text style={{ ...styles.tableColValue, fontFamily: "Helvetica-Bold" }}>{segment?.MarketingCarrierName}</Text>
                    <Text style={{ ...styles.tableColValue, fontSize: 8 }}>
                      {segment?.MarketingCarrier} {segment?.MarketingFlightNumber}
                    </Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={{ ...styles.tableColValue, fontFamily: "Helvetica-Bold" }}>
                      {moment(segment?.DepTime).format("DD MMM YYYY")}
                    </Text>
                    <Text style={styles.tableColValue}>{moment(segment?.DepTime).format("HH:mm")}</Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={{ ...styles.tableColValue, fontFamily: "Helvetica-Bold" }}>
                      {moment(segment?.ArrTime).format("DD MMM YYYY")}
                    </Text>
                    <Text style={styles.tableColValue}>{moment(segment?.ArrTime).format("HH:mm")}</Text>
                  </View>
                  <Text style={{ ...styles.tableColValue, width: "15%" }}>{segment?.DepartureGate || "TBA"}</Text>
                  <Text style={{ ...styles.tableColValue, width: "10%" }}>
                    {segment?.SegmentCode?.cabinCode === "Y" ? "Economy" : segment?.SegmentCode?.cabinCode || "Economy"}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* PASSENGER DETAILS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>PASSENGER DETAILS</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableColHeader, width: "24%" }}>Name</Text>
            <Text style={{ ...styles.tableColHeader, width: "12%" }}>Type</Text>
            <Text style={{ ...styles.tableColHeader, width: "12%" }}>Gender</Text>
            <Text style={{ ...styles.tableColHeader, width: "16%" }}>DOB</Text>
            <Text style={{ ...styles.tableColHeader, width: "16%" }}>Passport No</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%" }}>Ticket No</Text>
          </View>
          {(pdfData?.PassengerList || []).map((passenger, index) => {
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={{ ...styles.tableColValue, width: "24%", fontFamily: "Helvetica-Bold" }}>
                  {passenger?.Title ? passenger.Title + " " : ""}{passenger?.FirstName} {passenger?.LastName}
                </Text>
                <Text style={{ ...styles.tableColValue, width: "12%" }}>{passenger?.PaxType || "Adult"}</Text>
                <Text style={{ ...styles.tableColValue, width: "12%" }}>{passenger?.Gender || "N/A"}</Text>
                <Text style={{ ...styles.tableColValue, width: "16%" }}>
                  {passenger?.DateOfBirth ? moment(passenger.DateOfBirth).format("DD MMM YYYY") : "N/A"}
                </Text>
                <Text style={{ ...styles.tableColValue, width: "16%" }}>{passenger?.PassportNumber || "N/A"}</Text>
                <Text style={{ ...styles.tableColValue, width: "20%" }}>{passenger?.TicketNumber || "N/A"}</Text>
              </View>
            );
          })}
        </View>

        {/* PRICE BREAKDOWN */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>PRICE & FARE BREAKDOWN</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableColHeader, width: "25%" }}>Pax Type</Text>
            <Text style={{ ...styles.tableColHeader, width: "15%" }}>Count</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%", textAlign: "right" }}>Base Fare</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%", textAlign: "right" }}>Taxes & Fees</Text>
            <Text style={{ ...styles.tableColHeader, width: "20%", textAlign: "right" }}>Total</Text>
          </View>
          {(pdfData?.PriceBreakDown || []).map((price, index) => {
            const rowBase = price?.BaseFare || 0;
            const rowTaxes = (price?.Taxes || 0) + (price?.ServiceFee || price?.SerViceFee || 0);
            const rowTotal = (rowBase + rowTaxes) * (price?.PaxCount || 1);
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={{ ...styles.tableColValue, width: "25%", fontFamily: "Helvetica-Bold" }}>{price?.PaxType}</Text>
                <Text style={{ ...styles.tableColValue, width: "15%" }}>{price?.PaxCount}</Text>
                <Text style={{ ...styles.tableColValue, width: "20%", textAlign: "right" }}>{commaNumber(rowBase)}</Text>
                <Text style={{ ...styles.tableColValue, width: "20%", textAlign: "right" }}>{commaNumber(rowTaxes)}</Text>
                <Text style={{ ...styles.tableColValue, width: "20%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>{commaNumber(rowTotal)}</Text>
              </View>
            );
          })}

          <View style={styles.summarySection}>
            <View style={styles.summaryGrid}>
              {discount > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Gross Amount</Text>
                    <Text style={styles.summaryValue}>{commaNumber(pdfData?.GrossFare)} BDT</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={{ ...styles.summaryLabel, color: "#1A7A41" }}>Discount</Text>
                    <Text style={{ ...styles.summaryValue, color: "#1A7A41" }}>- {commaNumber(discount)} BDT</Text>
                  </View>
                  <View style={{ borderBottom: "1px solid #DFE7EF", marginVertical: 4 }} />
                </>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                <Text style={styles.summaryTotalValue}>{commaNumber(netFare)} BDT</Text>
              </View>
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 8, color: "#607890", textAlign: "right", fontStyle: "italic" }}>
                  In words: {netFareInWords}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Important Information:</Text>
          <Text style={styles.notesText}>
            All payments should be made in favor of Fly Jatt. This Invoice will not be recognized as paid unless supported by Company Official Receipt. A 3% Bank Charge will be added to the total bill amount if the bill is paid/settled by Debit or Credit Card.
          </Text>
        </View>

      </Page>
    </Document>
  );
};

export default PDFPageDesign;
