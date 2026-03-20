import { TextField } from "@mui/material";
import moment from "moment";
import React from "react";
import DatePicker from "react-datepicker";

const DateofBairthDatePicker = ({
  value,
  category,
  error,
  helperText,
  handleDateChange,
  index,
  field,
  depdate,
}) => {
  const today = new Date(depdate);
  // Helper functions to calculate date ranges
  const subtractYears = (date, years) => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() - years);
    return newDate;
  };

  const getDateRanges = (category) => {
    if (category === "adult") {
      return {
        minDate: subtractYears(today, 100), // Assuming a maximum age of 100 years for adults
        maxDate: subtractYears(today, 12), // Minimum age for adults is 12 years
      };
    } else if (category === "infant") {
      return {
        minDate: subtractYears(today, 2), // Maximum age for infants is 2 years
        maxDate: today, // Infants can be as young as today (0 years old)
      };
    } else {
      // For children, minimum age is 2 years, and maximum age is 12 years
      return {
        minDate: subtractYears(today, 12),
        maxDate: subtractYears(today, 2),
      };
    }
  };
  const utcDate = moment(value).utc().toDate(); // corrction this line

  const { minDate, maxDate } = getDateRanges(category);
  return (
    <>
      <DatePicker
        selected={value ? utcDate : null} // Default to null initially
        onChange={(date) => handleDateChange(date, category, index, field)}
        dateFormat="dd MMM yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        customInput={
          <TextField
            // label="Date of Birth"
            variant="outlined"
            fullWidth
            required // Make the field required
            error={error} // If there's an error, show it
            helperText={helperText} // Optional helper text
            InputProps={{
              sx: {
                height: 40, // Reduce field height
                borderRadius: 2, // Add border radius
                fontSize: "12px",
              },
            }}
          />
        }
        popperPlacement="bottom-start"
        minDate={minDate} // Dynamic minDate based on category
        maxDate={maxDate} // Dynamic maxDate based on category
      />
    </>
  );
};

export default DateofBairthDatePicker;
