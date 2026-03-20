import React, { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Box } from "@mui/material";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import PdfPageDesign from "./PdfPageDesign";

const BookingAllPdf = ({ quesData }) => {
  const [expanded, setExpanded] = useState(true);

  const handleChange = () => {
    setExpanded(!expanded);
  };

  const bookingCopy =
    quesData[0]?.BookingStatus === "Booked" ||
    quesData[0]?.BookingStatus === "Cancelled";
  const eTicketCopy = quesData[0]?.BookingStatus === "IssueInProcess";
  console.log("ques", quesData);
  return (
    <Box>
      <Accordion
        sx={{ background: "white", boxShadow: "none" }}
        expanded={!expanded}
        onChange={handleChange}
      >
        <AccordionSummary
          expandIcon={
            <ArrowDropDownIcon
              sx={{ color: "var(--primary-button)", fontSize: "30px" }}
            />
          }
        >
          <Typography
            sx={{
              color: "var(--primary-button)",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            Downloads PDF
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ background: "white" }}>
          <Typography>
            <div>
              {/* Conditional rendering for PDF download links */}
              {bookingCopy && (
                <PDFDownloadLink
                  document={<PdfPageDesign SingleBooking={quesData} />}
                  fileName={`${quesData[0]?.BookingId}_booking_copy.pdf`}
                >
                  {({ loading }) =>
                    loading ? "Loading document..." : "Download Booking Copy"
                  }
                </PDFDownloadLink>
              )}
              {eTicketCopy && (
                <PDFDownloadLink
                  document={<PdfPageDesign SingleBooking={quesData} />}
                  fileName={`${quesData[0]?.BookingId}_e_ticket_copy.pdf`}
                >
                  {({ loading }) =>
                    loading ? "Loading document..." : "Download E-Ticket Copy"
                  }
                </PDFDownloadLink>
              )}
            </div>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default BookingAllPdf;
