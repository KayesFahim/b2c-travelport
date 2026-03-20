import React, { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const PNRHistory = ({ quesData }) => {
  const [expanded, setExpanded] = useState(true);

  const handleChange = () => {
    setExpanded(!expanded);
  };
  console.log(quesData);
  return (
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
          PNR History
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ background: "white" }}>
        <Typography sx={{
            color: "var(--primary-button)",
            fontWeight: 600,
            fontSize: "13px",
            textAlign: "center",
          }}> PNR: {quesData[0]?.PNR}</Typography>
      </AccordionDetails>
    </Accordion>
  );
};

export default PNRHistory;
