import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import commaNumber from "comma-number";
import { getFlightCurrencyCode } from "../../utils/flightPolicyUtils";

const FareDetails = ({ data }) => {
  const currency = getFlightCurrencyCode(data);

  return (
    <Box>
      {/* <Box
        sx={{
          display: {
            xs: "block",
            sm: "block",
            md: "none",
            lg: "none",
          },
          width: "100%",
          border: "1px solid var(--primary-button)",
          borderRadius: "1px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            color: "white",
            bgcolor: "var(--primary-button)",
            py: 0.6,
          }}
        >
          <Typography
            sx={{
              
              fontSize: "10px",
              fontWeight: 600,
              textAlign: "center",
              width: "25%",
              borderRight: "1px solid var(--primary-button)",
            }}
          >
            Pax Type
          </Typography>
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 600,
              width: "25%",
              textAlign: "center",
              borderRight: "1px solid var(--primary-button)",
            }}
          >
            Base Fare
          </Typography>
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 600,
              width: "25%",
              textAlign: "center",
              borderRight: "1px solid var(--primary-button)",
            }}
          >
            Tax
          </Typography>
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 600,
              width: "25%",
              textAlign: "center",
            }}
          >
            Total
          </Typography>
        </Box>
        {data?.PriceBreakDown?.map((price, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              borderTop: "1px solid var(--primary-button)",
              alignItems: "center",
              width: "100%",
              py: 0.6,
            }}
          >
            <Typography
              sx={{
                color: "black",
                fontSize: "10px",
                fontWeight: 600,
                textAlign: "center",
                width: "25%",
                
              }}
            >
              {price?.PaxType} x{price?.PaxCount}
            </Typography>
            <Typography
              sx={{
                color: "black",
                fontSize: "10px",
                fontWeight: 600,
                width: "25%",
                textAlign: "center",
               
              }}
            >
              {commaNumber(price?.BaseFare + price?.ServiceFee)} x
              {price?.PaxCount}
            </Typography>
            <Typography
              sx={{
                color: "black",
                fontSize: "10px",
                fontWeight: 600,
                width: "25%",
                textAlign: "center",
               
              }}
            >
              {price?.Taxes ? commaNumber(price?.Taxes) : 0} BDT
            </Typography>
            <Typography
              sx={{
                color: "black",
                fontSize: "10px",
                fontWeight: 600,
                width: "25%",
                textAlign: "center",
              }}
            >
              {commaNumber(
                (price?.BaseFare +
                  price?.Taxes +
                  price?.ServiceFee +
                  price?.OtherCharges) *
                  price?.PaxCount
              )}{" "}
              BDT
            </Typography>
          </Box>
        ))}
      </Box> */}
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: "0",
          display: { xs: "block", sm: "block", md: "block", lg: "block" },
        }}
      >
        <Table
          sx={{
            width: "860px",
          }}
          size="small"
        >
          <TableHead>
            <TableRow
              sx={{
                "th:not([scope='row'])": {
                  color: "white",
                  background: "var(--primary-button)",
                  fontSize: "12px",
                  fontFamily: "DM Sans !important",
                },
              }}
            >
              <TableCell align="center">Pax Type</TableCell>
              <TableCell align="center">Pax Count</TableCell>
              <TableCell align="center">Base Fare</TableCell>
              <TableCell align="center">Tax</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">AIT & VAT</TableCell>
              <TableCell align="center">Sub Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              "& td, & th": {
                color: "var(--secondary-color)",
                fontSize: "12px",
              },
            }}
          >
            {data?.PriceBreakDown?.map((price, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:last-child td, &:last-child th": {
                    border: 0,
                  },
                }}
              >
                <TableCell align="center">{price?.PaxType}</TableCell>
                <TableCell align="center">{price?.PaxCount}</TableCell>
                <TableCell align="center">
                  {price?.BaseFare ? commaNumber(price?.BaseFare) : 0} {currency}
                </TableCell>
                <TableCell align="center">
                  {price?.Taxes ? commaNumber(price?.Taxes) : 0} {currency}
                </TableCell>
                <TableCell align="center">
                  {price?.TotalFare
                    ? commaNumber(price?.TotalFare - price?.ServiceFee)
                    : 0}{" "}
                  {currency}{" "}
                </TableCell>
                <TableCell align="center">
                  {price?.ServiceFee ? price?.ServiceFee : 0} {currency}
                </TableCell>
                <TableCell align="center">
                  {/* {commaNumber(
                    // (price?.BaseFare +
                    //   price?.Taxes +
                    //   price?.ServiceFee +
                    //   price?.OtherCharges) *
                    //   price?.PaxCount
                    data?.NetFare
                  )}{" "}
                  BDT */}
                  {/* {price?.TotalFare
                    ? commaNumber(price?.TotalFare - price?.ServiceFee)
                    : 0} */}
                  {commaNumber(data?.NetFare)} {currency}{" "}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FareDetails;
