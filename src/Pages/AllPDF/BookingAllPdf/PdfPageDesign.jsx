import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import pdflogo from "../../../asstes/img/flyjattlogo.svg";
import pdfSceenCopy from "../../../asstes/img/flyjattlogo.svg";
import depature from "../../../asstes/img/flyjattlogo.svg";
import bg from "../../../asstes/img/flyjattlogo.svg";
// import logo from "../../../asstes/img/logopng.png";
// import { Link } from "react-router-dom";
// import { format } from "date-fns";
import moment from "moment";
import { calculateTransitTime } from "../../../Pages/common/funcation";
import { convertMinutesToHoursAndMinutes } from "../../../Pages/common/funcation";
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
const PDFPageDesign = ({ SingleBooking }) => {
  const imgUrl = "https://cdn.flyfarint.com/flogo/BS.jpg";

  const pdfData = SingleBooking[0];
  const netFare = pdfData?.NetFare || 0;
  const netFareInWords = toWords.convert(netFare);
  const discount = pdfData?.GrossFare - pdfData?.NetFare;
  const styles = StyleSheet.create({
    page: {
      //   flexDirection: "row",
      backgroundColor: "#fff",
      padding: "20px 30px",
    },
    section: {
      margin: 3,
      padding: 0,
      flexGrow: 1,
    },
    bordered: {
      border: "1px solid #202124",
    },
    boldText: {
      fontFamily: "Helvetica-Bold",
    },
    image: {
      width: 150, // Adjust width as needed
      height: 60, // Adjust height as needed
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ ...styles.boldText, fontSize: "14px" }}>
              FlyIT Search
            </Text>
            <View style={{ paddingTop: "10px" }}>
              <Text style={{ color: "#767676", fontSize: "8px" }}>
                Mirpur-14, Dhaka 1216
              </Text>
              <Text style={{ color: "#767676", fontSize: "8px" }}>
                Email: info@flyjatt.com
              </Text>
              <Text style={{ color: "#767676", fontSize: "8px" }}>
                Phone: +8801736-987906
              </Text>
            </View>
          </View>
          <View>
            <Text style={{ ...styles.boldText, fontSize: "13px" }}>
              {" "}
              {pdfData?.BookingStatus === "IssueInProcess"
                ? "E-Ticket-Copy"
                : " Booking Copy"}{" "}
            </Text>
          </View>
          <View
            style={{
              height: "60px",
              width: "110px",
              border: "1px solid #b5cde2",
              borderRadius: "6px",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#eef6fd",
            }}
          >
            <Text style={{ fontSize: "18px", color: "#0e4f7a", ...styles.boldText }}>
              Fly Jatt
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            marginTop: "30px",
            gap: "30px",
          }}
        >
          <View>
            <Text style={{ fontSize: "12px", color: "#000000" }}>
              Date: {moment(pdfData.BookingDate).format("DD MMM YYYY")}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: "12px", color: "#000000" }}>
              PNR: {pdfData?.PNR}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: "12px", color: "#000000" }}>
              FLIGHT TYPE: {pdfData?.TripType}
            </Text>
          </View>
        </View>
        {/* flight details  */}
        <View>
          <View
            style={{
              flexDirection: "row",
              marginTop: "20px",
            }}
          >
            <View>
              <Text style={{ fontSize: "13px", color: "#003566" }}>
                FLIGHT ITNERARIES
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "column",
              marginTop: "20px",
              borderLeft: "2px solid #DEDEDE",
              borderBottom: "2px solid #DEDEDE",
              borderRight: "2px solid #DEDEDE",
            }}
          >
            <View
              style={{
                backgroundColor: "#DEDEDE",
                width: "100%",
                height: "23px",
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: "20px",
              }}
            >
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Flight Segment
                </Text>
              </View>
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Flight
                </Text>
              </View>
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Career name
                </Text>
              </View>
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Departure
                </Text>
              </View>
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Arrival
                </Text>
              </View>
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Terminal
                </Text>
              </View>
              <View style={{ width: "14.3%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>Class</Text>
              </View>
            </View>
            {pdfData.AllLegsInfo.map((leg, index) => (
              <View key={index}>
                {leg.Segments.map((segment, segIndex) => (
                  <View
                    key={segIndex}
                    style={{
                      width: "100%",
                      borderTop: "1px solid #DEDEDE",
                      height: "35px",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingLeft: "20px",
                      marginBottom: "5px",
                    }}
                  >
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {segment?.DepFrom}-{segment?.ArrTo}
                      </Text>
                    </View>
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {segment?.MarketingCarrier} -{" "}
                        {segment?.MarketingFlightNumber}
                      </Text>
                    </View>
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {segment?.MarketingCarrierName}
                      </Text>
                    </View>
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {new Date(segment?.DepTime).toLocaleDateString("en-GB")}
                      </Text>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {new Date(segment?.DepTime).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {new Date(segment?.ArrTime).toLocaleDateString("en-GB")}
                      </Text>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {new Date(segment?.ArrTime).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {segment?.DepartureGate || "Terminal-1"}
                      </Text>
                    </View>
                    <View style={{ width: "14.3%" }}>
                      <Text style={{ fontSize: "8px", color: "#000000" }}>
                        {segment.SegmentCode.cabinCode === "Y"
                          ? "Economy"
                          : segment.SegmentCode.cabinCode}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
        {/* PASSENGER DETAILS  */}
        <View>
          <View
            style={{
              flexDirection: "row",
              marginTop: "20px",
            }}
          >
            <View>
              <Text style={{ fontSize: "13px", color: "#003566" }}>
                PASSENGER DETAILS
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "column",
              marginTop: "20px",
              borderLeft: "2px solid #DEDEDE",
              borderBottom: "2px solid #DEDEDE",
              borderRight: "2px solid #DEDEDE",
            }}
          >
            <View
              style={{
                backgroundColor: "#DEDEDE",
                width: "100%",
                height: "23px",
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: "20px",
              }}
            >
              <View style={{ width: "17%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>Name</Text>
              </View>
              <View style={{ width: "16.6%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>Type</Text>
              </View>
              <View style={{ width: "16.6%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Gender
                </Text>
              </View>
              <View style={{ width: "16.6%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>DOB</Text>
              </View>
              <View style={{ width: "16.6%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Passport No
                </Text>
              </View>
              <View style={{ width: "16.6%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Baggage
                </Text>
              </View>
            </View>
            {pdfData?.PassengerList?.map((passenger, index) => {
              // Find the baggage info for the passenger type (Adult, Child, or Infant)
              const passengerBaggage = pdfData?.PriceBreakDown.find(
                (breakdown) => breakdown.PaxType === passenger.PaxType
              )?.Bag;

              return (
                <View
                  key={index}
                  style={{
                    width: "100%",
                    height: "35px",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingLeft: "20px",
                    borderTop: "1px solid #DEDEDE",
                    marginBottom: "5px",
                  }}
                >
                  <View style={{ width: "17%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {passenger.Title} {passenger.FirstName}{" "}
                      {passenger.LastName}
                    </Text>
                  </View>
                  <View style={{ width: "16.6%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {passenger.PaxType}
                    </Text>
                  </View>
                  <View style={{ width: "16.6%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {passenger.Gender}
                    </Text>
                  </View>
                  <View style={{ width: "16.6%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {new Date(passenger.DateOfBirth).toLocaleDateString(
                        "en-GB"
                      )}
                    </Text>
                  </View>
                  <View style={{ width: "16.6%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {passenger.PassportNumber || "N/A"}
                    </Text>
                  </View>
                  <View style={{ width: "16.6%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {/* Display baggage allowance for this PaxType */}
                      {passengerBaggage[0]?.Allowance}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        {/* Price breakdowan  */}
        <View>
          <View
            style={{
              flexDirection: "row",
              marginTop: "20px",
            }}
          >
            <View>
              <Text style={{ fontSize: "13px", color: "#003566" }}>
                PRICE BREAKDOWN
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "column",
              marginTop: "20px",
              borderLeft: "2px solid #DEDEDE",
              borderBottom: "2px solid #DEDEDE",
              borderRight: "2px solid #DEDEDE",
            }}
          >
            <View
              style={{
                backgroundColor: "#DEDEDE",
                width: "100%",
                height: "23px",
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: "20px",
              }}
            >
              <View style={{ width: "20%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Pax Type
                </Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Pax Count
                </Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Base Fare
                </Text>
              </View>
              <View style={{ width: "20%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Tax & Service Fee
                </Text>
              </View>
              {/* <View style={{ width: "15%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  discount
                </Text>
              </View> */}
              <View style={{ width: "20%" }}>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  Total Fare
                </Text>
              </View>
            </View>
            {pdfData?.PriceBreakDown?.map((price, index) => (
              <>
                <View
                  key={index}
                  style={{
                    width: "100%",
                    height: "35px",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingLeft: "20px",
                    borderTop: "1px solid #DEDEDE",
                    marginBottom: "5px",
                  }}
                >
                  <View style={{ width: "20%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {price.PaxType}
                    </Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {price.PaxCount}
                    </Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {commaNumber(price.BaseFare)} BDT
                    </Text>
                  </View>
                  <View style={{ width: "20%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {commaNumber(price?.Taxes + price?.ServiceFee)} BDT
                      {/* {commaNumber(price.Taxes + price.SerViceFee)} */}
                    </Text>
                  </View>
                  {/* <View style={{ width: "15%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {discount} BDT
                      
                    </Text>
                  </View> */}
                  <View style={{ width: "20%" }}>
                    <Text style={{ fontSize: "8px", color: "#000000" }}>
                      {commaNumber(
                        (price?.BaseFare + (price?.Taxes + price?.ServiceFee)) *
                        price?.PaxCount
                      )}{" "}
                      BDT
                    </Text>
                  </View>
                </View>
              </>
            ))}

            <View
              style={{
                width: "100%",
                flexDirection: "column",
                alignItems: "flex-end",
                paddingRight: "65px",
                borderTop: "1px solid #DEDEDE",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: "15px",
                  paddingTop: "5px",
                }}
              >
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  AMOUNT
                </Text>
                <Text style={{ fontSize: "8px", color: "#000000" }}>
                  {commaNumber(pdfData?.GrossFare)} BDT
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: "15px",
                  paddingTop: "5px",
                }}
              >
                <Text style={{ fontSize: "8px", color: "green" }}>
                  DISCOUNT
                </Text>
                <Text style={{ fontSize: "8px", color: "green" }}>
                  {commaNumber(discount)} BDT
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: "15px",
                  marginTop: "5px",
                  paddingBottom: "5px"
                }}
              >
                <Text style={{ fontSize: "10px", color: "#000000" }}>
                  TOTAL AMOUNT
                </Text>
                <Text style={{ fontSize: "10px", color: "#000000" }}>
                  {commaNumber(pdfData?.NetFare)} BDT
                </Text>
              </View>
            </View>
          </View>

          {/* <View
            style={{
              border: "1px solid #DEDEDE",
              padding: "20px",
              marginTop: "20px",
              width: "50%",
            }}
          >
            <View style={{ flexDirection: "row", gap: "100px" }}>
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  Base fare total amount
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  {commaNumber(pdfData?.BaseFare)} BDT
                </Text>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", gap: "150px", paddingTop: "10px" }}
            >
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  Discount
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  {commaNumber(pdfData?.GrossFare - pdfData?.NetFare)} BDT
                </Text>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", gap: "170px", paddingTop: "10px" }}
            >
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>Tax</Text>
              </View>
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  {commaNumber(pdfData?.Taxes)} BDT
                </Text>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", gap: "150px", paddingTop: "10px" }}
            >
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  AIT & VAT
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: "8px", color: "#272323" }}>
                  {commaNumber(pdfData?.SerViceFee)} BDT
                </Text>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", gap: "80px", paddingTop: "10px" }}
            >
              <View>
                <Text style={{ fontSize: "10px", color: "#272323" }}>
                  Total Ticket fare Amount
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: "10px", color: "#272323" }}>
                  {commaNumber(pdfData?.NetFare)} BDT
                </Text>
              </View>
            </View>
          </View> */}
          <View>
            <Text
              style={{ fontSize: "10px", color: "#003566", paddingTop: "5px" }}
            >
              In words: {netFareInWords}
            </Text>
          </View>
          <View style={{ marginTop: "15px" }}>
            <Text style={{ fontSize: "10px", color: "#000000" }}>Note:</Text>
            <Text
              style={{ fontSize: "10px", color: "#767676", paddingTop: "5px" }}
            >
              All payment should be made in favor of.This Invoice will not be
              recognized as paid unless supported by Company Official Receipt.
              3% Bank Charge will be add on total bill amount, if the bill
              Paid/settled by Debit/Credit Card
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PDFPageDesign;
