import { Skeleton, TableCell, TableRow } from "@mui/material";
import React from "react";

const BookingFlightInfoSlikton = () => {
  return (
    <>
    {[...Array(2)].map((_, index) => (
      <TableRow key={index}>
        {[...Array(6)].map((_, cellIndex) => (
          <TableCell key={cellIndex}>
            <Skeleton animation="wave" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
  );
};

export default BookingFlightInfoSlikton;

