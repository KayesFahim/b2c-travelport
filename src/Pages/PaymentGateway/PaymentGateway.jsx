import { Box, Container, Grid, Typography } from "@mui/material";
import React, { useState } from "react";
import NavBar from "../../Shared/NavBar/NavBar";
import reactSvg from "../../utils/reactSvg";
import _CardIcons from "../../asstes/img/paument/card.svg?react";
import _BkashIcons from "../../asstes/img/paument/bkash.svg?react";
import _NogodICons from "../../asstes/img/paument/nogod.svg?react";
import _FsIocns from "../../asstes/img/paument/fs.svg?react";
import shurjopayLogo from "../../asstes/img/paument/shurjopay.png";
import { useLocation } from "react-router-dom";
import commaNumber from "comma-number";
import secureLocalStorage from "react-secure-storage";
import Swal from "sweetalert2";
import { config } from "../../config";
import FareBreakdown from "../BookingDetaills/FareBreakdown/FareBreakdown";

const CardIcons = reactSvg(_CardIcons);
const BkashIcons = reactSvg(_BkashIcons);
const NogodICons = reactSvg(_NogodICons);
const FsIocns = reactSvg(_FsIocns);

const PaymentGateway = () => {
  const location = useLocation();
  const [activeOption, setActiveOption] = useState("shurjopay");
  const paymentData = location?.state?.paymentData;
  const token = secureLocalStorage.getItem("access_token");
  console.log(location?.state);
  const handleOptionClick = (option) => {
    setActiveOption(option);
  };

  const handlePaymentClick = async () => {
    try {
      // if (activeOption === "mastercard") {
      //   window.open(paymentData?.sslpaymentLink?.url, "_blank");
      // } else 
      if (activeOption === "shurjopay") {
        window.open(paymentData?.surjopay?.url, "_blank");
      } else if (activeOption === "bkash") {
        window.open(paymentData?.bkash?.url, "_blank");
      } 
      // else if (activeOption === "fswallet") {
      //   const response = await fetch(
      //     `${config.baseUrl}/WalletTransection/Wallet`,
      //     {
      //       method: "POST",
      //       headers: {
      //         "Content-Type": "application/json",
      //         Authorization: `Bearer ${token}`,
      //       },
      //       body: JSON.stringify({
      //         bookingId: paymentData?.bookingData[0]?.BookingId,
      //         paidAmount: paymentData?.bookingData[0]?.NetFare,
      //         offerAmmount: String(paymentData?.bookingData[0]?.NetFare),
      //         currierName: paymentData?.bookingData[0]?.CarrierName,
      //       }),
      //     }
      //   );

      //   if (!response.ok) {
      //     const errorText = await response.json();
      //     console.error("Response Error:", response.status, errorText);
      //     Swal.fire({
      //       icon: "error",
      //       title: "Payment Failed",
      //       text: errorText.message || "Something went wrong!",
      //       footer: errorText.error || `Status Code: ${response.status}`,
      //     });

      //     throw new Error("Network response was not ok");
      //   }

      //   const data = await response.json();
      //   Swal.fire({
      //     icon: "success",
      //     title: "Payment Successful",
      //     text: "Your payment has been processed successfully!",
      //     footer: `Booking ID: ${data.bookingId}`,
      //   });
      // } 
      else {
        console.error("Unsupported payment option selected");
        Swal.fire({
          icon: "warning",
          title: "Unsupported Payment Option",
          text: "Please select a valid payment option.",
        });
      }
    } catch (error) {
      console.error("Error:", error.message);
      Swal.fire({
        icon: "error",
        title: "An Error Occurred",
        text: error.message || "Unexpected error occurred, please try again!",
      });
    }
  };
  console.log("payment", paymentData);
  return (
    <Box>
      <NavBar />

      <Box
        sx={{
          // height: "100vh",
          mb: 2,
        }}
      >
        <Container>
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Box
                  sx={{
                    bgcolor: "white",
                    borderRadius: "5px",
                    mt: "30px",
                    p: "30px 15px",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: "20px" }}>
                      Payment Details
                    </Typography>
                  </Box>
                  <Box sx={{ py: "30px" }}>
                    <Box
                      sx={{
                        display: "flex",
                        // alignItems: "center",
                        gap: { xs: "10px", sm: "10px", md: "10px" }, // Adjust gap based on screen size
                        // justifyContent: { xs: "flex-start", md: "center" }, // Change alignment for smaller screens
                        flexWrap: "wrap", // Allow wrapping of items for smaller screens
                        // padding: { xs: "10px", md: "20px" }, // Add padding for better spacing
                      }}
                    >
                      {/* Mastercard Option */}
                      {/* <Box
                        sx={{
                          width: "250px",
                          bgcolor:
                            activeOption === "mastercard"
                              ? "#fff8f8"
                              : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          borderRight:
                            activeOption === "mastercard"
                              ? "2px solid #FCAF17"
                              : "none",
                          borderBottom:
                            activeOption === "mastercard"
                              ? "2px solid #FCAF17"
                              : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOptionClick("mastercard")}
                      >
                        <Box>
                          <CardIcons
                            style={{ width: "70px", height: "60px" }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              color:
                                activeOption === "mastercard"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                            }}
                          >
                            Visa Mastercard
                          </Typography>
                        </Box>
                      </Box> */}
                      {/* shurjopay Option */}
                      <Box
                        sx={{
                          width: "250px",
                          bgcolor:
                            activeOption === "shurjopay"
                              ? "#fff8f8"
                              : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          borderRight:
                            activeOption === "shurjopay"
                              ? "2px solid #FCAF17"
                              : "none",
                          borderBottom:
                            activeOption === "shurjopay"
                              ? "2px solid #FCAF17"
                              : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOptionClick("shurjopay")}
                      >
                        <Box>
                          <img
                            src={shurjopayLogo}
                            style={{ width: "100px", height: "60px" }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              color:
                                activeOption === "shurjopay"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                            }}
                          >
                            ShurjoPay
                          </Typography>
                        </Box>
                      </Box>

                      {/* BKash Option */}
                      <Box
                        sx={{
                          width: "250px",
                          bgcolor:
                            activeOption === "bkash" ? "#fff8f8" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          borderRight:
                            activeOption === "bkash"
                              ? "2px solid #FCAF17"
                              : "none",
                          borderBottom:
                            activeOption === "bkash"
                              ? "2px solid #FCAF17"
                              : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOptionClick("bkash")}
                      >
                        <Box>
                          <BkashIcons
                            style={{ width: "100px", height: "60px" }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              color:
                                activeOption === "bkash"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                            }}
                          >
                            BKash
                          </Typography>
                        </Box>
                      </Box>

                      {/* Nagad Option */}
                      {/* <Box
                        sx={{
                          width: "250px",
                          bgcolor:
                            activeOption === "nagad" ? "#fff8f8" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          borderRight:
                            activeOption === "nagad"
                              ? "2px solid #FCAF17"
                              : "none",
                          borderBottom:
                            activeOption === "nagad"
                              ? "2px solid #FCAF17"
                              : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOptionClick("nagad")}
                      >
                        <Box>
                          <NogodICons
                            style={{ width: "100px", height: "60px" }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              color:
                                activeOption === "nagad"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                            }}
                          >
                            Nagad
                          </Typography>
                        </Box>
                      </Box> */}

                      {/* Fly Jatt Wallet Option */}
                      {/* <Box
                        sx={{
                          width: "250px",
                          bgcolor:
                            activeOption === "fswallet" ? "#fff8f8" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          borderRight:
                            activeOption === "fswallet"
                              ? "2px solid #FCAF17"
                              : "none",
                          borderBottom:
                            activeOption === "fswallet"
                              ? "2px solid #FCAF17"
                              : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOptionClick("fswallet")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1px",
                          }}
                        >
                          <FsIocns style={{ width: "100px", height: "60px" }} />
                          <Typography
                            sx={{
                              color:
                                activeOption === "fswallet"
                                  ? "#E34825"
                                  : "#000000",
                            }}
                          >
                            FS
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              color:
                                activeOption === "fswallet"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                            }}
                          >
                            Wallet
                          </Typography>
                        </Box>
                      </Box> */}
                    </Box>
                    <Box>
                      {/* {activeOption === "mastercard" && (
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "20px",
                              py: "50px",
                            }}
                          >
                           
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Order Amount :{" "}
                                {commaNumber(
                                  paymentData?.sslpaymentLink?.airTicketPrice
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                           
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Gate Way Charge :{" "}
                                {commaNumber(
                                  paymentData?.sslpaymentLink
                                    ?.paymentGatwayCharge
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                           
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "280px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Amount will be charged :{" "}
                                {commaNumber(
                                  paymentData?.sslpaymentLink?.total_amount
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )} */}
                      {activeOption === "shurjopay" && (
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "20px",
                              py: "50px",
                            }}
                          >
                            {/* item one  */}
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontsize: "10px",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Order Amount :{" "}
                                {commaNumber(
                                  paymentData?.surjopay?.airTicketPrice
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                            {/* item one  */}
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Gate Way Charge :{" "}
                                {commaNumber(paymentData?.surjopay?.paymentGatwayCharge)} BDT
                              </Typography>
                            </Box>
                            {/* item one  */}
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "280px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Amount will be charged :{" "}
                                {commaNumber(
                                  paymentData?.surjopay?.total_amount
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      {activeOption === "bkash" && (
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "20px",
                              py: "50px",
                            }}
                          >
                            {/* item one  */}
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Order Amount :{" "}
                                {commaNumber(
                                  paymentData?.bkash?.airTicketPrice
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                            {/* item one  */}
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Gate Way Charge :{" "}
                                {commaNumber(
                                  paymentData?.bkash?.paymentGatwayCharge
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                            {/* item one  */}
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "280px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Amount will be charged :{" "}
                                {commaNumber(paymentData?.bkash?.total_amount)}{" "}
                                BDT
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      {/* {activeOption === "nagad" && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            py: "30px",
                          }}
                        >
                          <Typography>
                            For Development Reason Nagad will be disable Thank
                            you for your Cooperation.
                          </Typography>
                        </Box>
                      )} */}
                      {/* {activeOption === "fswallet" && (
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "20px",
                              py: "50px",
                            }}
                          >
                           
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                FS Wallet :{" "}
                                {commaNumber(
                                  paymentData?.walletPayment?.walletAmmount
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                          
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "250px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Order Amount :{" "}
                                {commaNumber(paymentData?.walletPayment?.price)}{" "}
                                BDT
                              </Typography>
                            </Box>
                           
                            <Box
                              sx={{
                                border: "1px solid #DADCE0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "280px",
                                height: "50px",
                                borderRadius: "5px",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#5F6368",
                                  fontSize: "12px",
                                  p: 1,
                                }}
                              >
                                Total Amount :{" "}
                                {commaNumber(
                                  paymentData?.walletPayment?.priceAfterPayment
                                )}{" "}
                                BDT
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )} */}
                    </Box>
                  </Box>
                </Box>
                <Box>
                  <Box
                    onClick={handlePaymentClick}
                    sx={{
                      bgcolor: "#38AF00",
                      height: "50px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Typography sx={{ color: "white", fontSize: "15px" }}>
                      {
                      // activeOption === "mastercard" ? (
                      //   <>
                      //     {"PAY USING SSL COMMERCEZ "}
                      //     {commaNumber(
                      //       paymentData?.sslpaymentLink?.total_amount
                      //     )}{" "}
                      //     BDT
                      //   </>
                      // ) :
                       activeOption === "shurjopay" ? (
                        <>
                          {"PAY USING ShurjoPay"}{" "}
                          {commaNumber(paymentData?.surjopay?.total_amount)} BDT
                        </>
                      ) : activeOption === "bkash" ? (
                        <>
                          {"PAY USING bkash"}{" "}
                          {commaNumber(paymentData?.bkash?.total_amount)} BDT
                        </>
                      ) : 
                      // activeOption === "fswallet" ? (
                      //   <>
                      //     {"PAY USING FLY JATT WALLET"}{" "}
                      //     {commaNumber(paymentData?.walletPayment?.price)} BDT
                      //   </>
                      // ) : 
                      null}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4} mt={3}>
                <FareBreakdown
                  airPriceData={location?.state?.paymentData?.bookingData}
                />
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PaymentGateway;
