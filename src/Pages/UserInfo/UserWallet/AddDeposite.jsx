import React, { useEffect, useRef } from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Tabs,
  Typography,
} from "@mui/material";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import { useState } from "react";
import { styled } from "@mui/material/styles";
import reactSvg from "../../../utils/reactSvg";
import _CardIcons from "../../../asstes/img/paument/card.svg?react";
import _BkashIcons from "../../../asstes/img/paument/bkash.svg?react";
import _NogodICons from "../../../asstes/img/paument/nogod.svg?react";
import { useLocation } from "react-router-dom";
import commaNumber from "comma-number";
import secureLocalStorage from "react-secure-storage";
import shurjopayLogo from "../../../asstes/img/paument/shurjopay.png";
import Swal from "sweetalert2";
import axios from "axios";
import moment from "moment";
import { Calendar } from "react-date-range";
import banksData from "../../../Pages/fakeData/Banks";
import { config } from "../../../config";

const CardIcons = reactSvg(_CardIcons);
const BkashIcons = reactSvg(_BkashIcons);
const NogodICons = reactSvg(_NogodICons);

const CustomButton = styled(Box)(({ theme }) => ({
  backgroundColor: "#0F3D6A",
  color: "#FFFFFF",
  fontWeight: 400,
  textTransform: "none",
  height: "40px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
}));

const AddDeposite = () => {
  const [value, setValue] = useState("cash");
  // const [selectedTab, setSelectedTab] = useState("cash");
  const handleTabChange = (event, newValue) => {
    setValue(newValue);
    // setCurrentPage(1); // Reset to the first page when the tab changes
  };

  // const handleChange = (event, newValue) => {
  //   setValue(newValue);
  // };
  // Cheque date
  const [openChequeDate, setOpenChequeDate] = useState(false);
  const [selectedChequeDate, setSelectedChequeDate] = useState(null);
  // BANK date
  const [openBankDate, setOpenBankDate] = useState(false);
  const [selectedBankDate, setSelectedBankDate] = useState(null);

  const bankDatas = banksData;

  const handleSelectCheque = (date) => {
    setSelectedChequeDate(date);
    setOpenChequeDate(false);
  };
  const handleSelectBank = (date) => {
    setSelectedBankDate(date);
    setOpenBankDate(false);
  };

  const [payableAmount, setPayableAmount] = useState("");
  const [gatewayFee, setGatewayFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const handlePayableAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    setPayableAmount(amount);

    // Calculate gateway fee (2.5%)
    const fee = amount * 0.035;
    setGatewayFee(fee);

    // Calculate total amount to be deposited
    const total = amount + fee;
    setTotalAmount(total);
  };
  const [payableShurjoPayAmount, setPayableShurjoPayAmount] = useState("");
  const [gatewayShurjoPayFee, setGatewayShurjoPayFee] = useState(0);
  const [totalShurjoPayAmount, setTotalShurjoPayAmount] = useState(0);

  const handlePayableShurjoPayAmountChange = (e) => {
    const amountShurjo = parseFloat(e.target.value) || 0;
    setPayableShurjoPayAmount(amountShurjo); // Update this to amountShurjo

    // Calculate gateway fee (2%)
    const feeShurjo = amountShurjo * 0.02;
    setGatewayShurjoPayFee(feeShurjo);

    // Calculate total amount to be deposited
    const totalamountShurjo = amountShurjo + feeShurjo;
    setTotalShurjoPayAmount(totalamountShurjo);
  };

  const [payableBikasAmount, setPayableBikashAmount] = useState("");
  const [gatewayBikashFee, setGatewayBikashFee] = useState(0);
  const [totalBikashAmount, setTotalBikashAmount] = useState(0);

  const handlePayableBikashAmountChange = (e) => {
    const amountBikash = parseFloat(e.target.value) || 0;
    setPayableBikashAmount(amountBikash); // Update this to amountShurjo

    // Calculate gateway fee (1.25%)
    const feeBikash = amountBikash * 0.0125;
    setGatewayBikashFee(feeBikash);

    // Calculate total amount to be deposited
    const totalamountBikash = amountBikash + feeBikash;
    setTotalBikashAmount(totalamountBikash);
  };

  const location = useLocation();
  const [activeOption, setActiveOption] = useState("mastercard");
  const paymentData = location?.state;
  const token = secureLocalStorage.getItem("access_token");
  const [depositeToBank, setDepositeToBank] = useState([]);
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch(`${config.baseUrl}/bankAdd/allbank`);
        if (!response.ok) {
          throw new Error("Failed to fetch");
        }
        const data = await response.json();
        setDepositeToBank(data);
      } catch (error) {
        console.error("Error fetching bank data:", error);
      }
    };

    fetchBanks();
  }, []);

  const handleOptionClick = (option) => {
    setActiveOption(option);
  };

  const handlePaymentClick = async () => {
    // Show SweetAlert2 confirmation dialog
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to make this deposit?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, proceed with deposit",
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Declare the URL based on the activeOption
        let url;
        if (activeOption === "mastercard") {
          url = `${config.baseUrl}/deposit/sslcommerz/deposit`;
        } else if (activeOption === "shurjopay") {
          url = `${config.baseUrl}/deposit/surjo/deposit`;
        } else if (activeOption === "bkash") {
          url = `${config.baseUrl}/deposit/bkash/deposit`;
        }

        // Proceed with API call
        const body = {
          amount:
            activeOption === "mastercard"
              ? totalAmount
              : activeOption === "shurjopay"
              ? totalShurjoPayAmount
              : payableBikasAmount,
        };

        try {
          const response = await axios.post(url, body, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.data.sslcommerz) {
            window.location.href = response.data.sslcommerz;
          } else if (response.data.surjoPay) {
            window.location.href = response.data.surjoPay;
          } else if (response.data.bkash) {
            window.location.href = response.data.bkash;
          } else {
            Swal.fire("Error", "Failed to get the redirect URL", "error");
          }
        } catch (error) {
          Swal.fire("Error", "Payment failed. Please try again.", "error");
        }
      }
    });
  };

  const fileInputRef = useRef(null);
  const fileInputChequeRef = useRef(null);
  const fileInputBankRef = useRef(null);
  const [formCashData, setFormCashData] = useState({
    senderName: "",
    receiverName: "",
    reference: "",
    amount: "",
  });
  const [formChequeData, setFormChequeData] = useState({
    chequeNumber: "",
    chequeBankName: "",
    reference: "",
    amount: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedChequeFile, setSelectedChequeFile] = useState(null);
  const [selectedBankFile, setSelectedBankFile] = useState(null);
  const [selectedOptionFrom, setSelectedOptionFrom] =
    useState("Deposit From AC");
  const [selectedOptionTo, setSelectedOptionTo] = useState("Deposit To AC");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");

  const handleSelectChangeFrom = (event) => {
    setSelectedOptionFrom(event.target.value);
  };

  const handleSelectChangeTo = (event) => {
    setSelectedOptionTo(event.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormCashData({
      ...formCashData,
      [name]: value,
    });
  };
  // Cheque inputvalue
  const handleInputChequeChange = (e) => {
    const { name, value } = e.target;
    setFormChequeData({
      ...formChequeData,
      [name]: value,
    });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  // Cheque
  const handleChequeFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedChequeFile(file);
    }
  };
  // Bank
  const handleBankFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedBankFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  const handleButtonChequeClick = () => {
    fileInputChequeRef.current.click();
  };
  const handleButtonBankClick = () => {
    fileInputBankRef.current.click();
  };

  const handleDepositeCash = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("depositType", value);
    formData.append("senderName", formCashData.senderName);
    formData.append("branch", formCashData.receiverName);
    formData.append("referance", formCashData.reference);
    formData.append("ammount", formCashData.amount);
    if (selectedFile) {
      formData.append("receiptImage", selectedFile);
    }

    try {
      const response = await fetch(`${config.baseUrl}/deposit/createDeposit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          title: "Success!",
          text: "Deposit request submitted successfully.",
          icon: "success",
        });

        setFormCashData({
          senderName: "",
          receiverName: "",
          reference: "",
          amount: "",
        });
        setSelectedFile(null);
      } else {
        Swal.fire({
          title: "Error",
          text: "Error submitting deposit request.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error in request:", error);
      Swal.fire({
        title: "Error",
        text: "An error occurred while submitting your request.",
        icon: "error",
      });
    }
  };
  const handleDepositeCheque = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("depositType", value);
    formData.append("chequeNumber", formChequeData.chequeNumber);
    formData.append("chequeBankName", formChequeData.chequeBankName);
    formData.append("chequeIssueDate", selectedChequeDate);
    formData.append("referance", formChequeData.reference);
    formData.append("ammount", formChequeData.amount);
    if (selectedChequeFile) {
      formData.append("receiptImage", selectedChequeFile);
    }

    try {
      const response = await fetch(`${config.baseUrl}/deposit/createDeposit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          title: "Success!",
          text: "Deposit request submitted successfully.",
          icon: "success",
        });

        setFormChequeData({
          chequeNumber: "",
          chequeBankName: "",
          reference: "",
          amount: "",
        });
        setSelectedChequeFile(null);
      } else {
        Swal.fire({
          title: "Error",
          text: "Error submitting deposit request.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error in request:", error);
      Swal.fire({
        title: "Error",
        text: "An error occurred while submitting your request.",
        icon: "error",
      });
    }
  };
  const handleDepositeBankTransfer = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("depositType", value);
    formData.append("depositeFrom", selectedOptionFrom);
    formData.append("depositedAccount", selectedOptionTo);
    formData.append("transferDate", selectedBankDate);
    formData.append("transectionId", transactionId);
    formData.append("ammount", amount);
    if (selectedBankFile) {
      formData.append("receiptImage", selectedBankFile);
    }

    try {
      const response = await fetch(`${config.baseUrl}/deposit/createDeposit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          title: "Success!",
          text: "Deposit request submitted successfully.",
          icon: "success",
        });

        setSelectedOptionFrom("");
        setSelectedOptionTo("");
        setSelectedBankDate(null);
        setAmount("");
        setTransactionId("");
        setSelectedBankFile(null);
      } else {
        Swal.fire({
          title: "Error",
          text: "Error submitting deposit request.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error in request:", error);
      Swal.fire({
        title: "Error",
        text: "An error occurred while submitting your request.",
        icon: "error",
      });
    }
  };
  return (
    <Box>
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: "5px",
          p: {
            xs: "15px ",
            // sm: "20px 30px 10px 40px",
            md: "20px 30px",
            // lg: "30px 30px 40px 40px",
          },
        }}
      >
        <Box
          sx={{
            ".MuiTabs-root": {
              minHeight: "20px !important",
            },
          }}
        >
          {/* tabs for md device */}
          <Tabs
            value={value}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Booking status tabs"
            sx={{
              color: "white",
              bgcolor: "var(--primary-button)",
              width: "fit-content",
              margin: { xs: "0px 0px" },
              "& .MuiTab-root": {
                fontSize: { xs: "8px", sm: "10px", md: "12px" },
                textTransform: "capitalize",
                color: "white",
                minHeight: "20px", // Custom minimum height for tabs
                padding: { xs: "8px 6px", md: "8px 16px" }, // Custom padding for better spacing
                "&.Mui-selected": {
                  backgroundColor: "var(--primary-color)",
                  color: "#13406B",
                  fontWeight: "bold",
                  padding: { xs: "8px 6px", md: "8px 16px" },
                },
              },
              display: { xs: "none", md: "block" },
            }}
          >
            <Tab label="Cash" value="cash" />
            <Tab label="Cheque" value="Cheque" />
            <Tab label="Bank Tranasfer" value="BankTranasfer" />
            <Tab label="INSTANT DEPOSIT" value="instantDeposit" />
          </Tabs>

          {/* tabs for sx device */}
          <Tabs
            value={value}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Booking status tabs"
            sx={{
              bgcolor: "var(--primary-button)",
              width: { xs: "100%", md: "fit-content" }, // Ensure tabs take full width on small devices
              margin: { xs: "0 auto" }, // Center tabs on small screens
              "& .MuiTab-root": {
                fontSize: { xs: "10px", sm: "12px", md: "14px" }, // Adjust font size for devices
                textTransform: "capitalize",
                color: "white",
                minHeight: "30px", // Increase minimum height for better touch targets
                padding: { xs: "8px 4px", md: "10px 16px" }, // Reduce padding on smaller screens
                "&.Mui-selected": {
                  backgroundColor: "var(--primary-color)",
                  color: "#13406B",
                  fontWeight: "bold",
                  padding: { xs: "8px 4px", md: "10px 16px" },
                },
              },
              display: { xs: "block", md: "none" }, // Always ensure visibility

              overflowX: "auto", // Prevent content overflow on small screens
            }}
          >
            <Tab label="Cash" value="cash" />
            <Tab label="Cheque" value="Cheque" />
            <Tab label="Bank Tranasfer" value="BankTranasfer" />
            <Tab label="INSTANT DEPOSIT" value="instantDeposit" />
          </Tabs>
        </Box>

        <Box
          sx={{
            my: {
              xs: "20px",
              sm: "20px",
              // md: "30px",
              // lg: "30px",
            },
          }}
        >
          {value === "cash" ? (
            <>
              <form onSubmit={handleDepositeCash}>
                <Grid container>
                  <Grid container spacing={{ xs: 3, sm: 3, md: 3, lg: 3 }}>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Sender Name
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            mt: "5px",
                          }}
                        >
                          <input
                            placeholder="Enter Sender Name"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="senderName"
                            value={formCashData?.senderName}
                            onChange={handleInputChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Reciver Name
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <input
                            placeholder="Enter Reciver Name"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            name="receiverName"
                            required
                            value={formCashData?.receiverName}
                            onChange={handleInputChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Reference
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <input
                            placeholder="Enter Reference"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="reference"
                            value={formCashData?.reference}
                            onChange={handleInputChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                  <Grid container spacing={4} sx={{ mt: "4px" }}>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Enter Amount
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "10px" }}>
                          <input
                            placeholder="Enter Enter Amount"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="amount"
                            value={formCashData?.amount}
                            onChange={handleInputChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={5} lg={5}>
                      <Box sx={{ mt: "4px", pb: "5px" }}>
                        <CustomButton onClick={handleButtonClick}>
                          Choose Attachment Copy
                        </CustomButton>
                      </Box>
                      <input
                        required
                        ref={fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleFileSelect}
                      />
                      {selectedFile ? (
                        <Typography
                          sx={{
                            fontSize: "11px",
                            color: "var(--secondary-color)",
                            fontWeight: 600,
                          }}
                        >
                          {selectedFile.name}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "11px",
                            color: "var(--secondary-color)",
                            fontWeight: 600,
                          }}
                        >
                          Upload JPG,JPEG,PNG,PDF,formats
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    pt: {
                      xs: "20px",
                      sm: "40px",
                      // md: "100px",
                      // lg: "100px",
                    },
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    type="submit"
                    sx={{
                      color: "#ffff",
                      background: "#444542",
                      textTransform: "capitalize",
                      width: { xs: "100%", md: "40%" },
                      ":hover": {
                        backgroundColor: "#444542",
                      },
                    }}
                  >
                    Submit Deposit Request
                  </Button>
                </Box>
              </form>
            </>
          ) : value === "Cheque" ? (
            <>
              <form onSubmit={handleDepositeCheque}>
                <Grid container>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Cheque Number
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <input
                            placeholder="Enter Cheque Number"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="chequeNumber"
                            value={formChequeData?.chequeNumber}
                            onChange={handleInputChequeChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Bank Name
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <input
                            placeholder="Enter Bank Name"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="chequeBankName"
                            value={formChequeData?.chequeBankName}
                            onChange={handleInputChequeChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{
                          position: "relative",
                        }}
                      >
                        <Box
                          sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                          onClick={() => setOpenChequeDate(true)}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--primary-button)",
                              }}
                            >
                              Cheque Date
                            </Typography>
                          </Box>
                          <Box sx={{ mt: "5px" }}>
                            <Typography
                              sx={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--primary-button)",
                              }}
                            >
                              {selectedChequeDate
                                ? moment(selectedChequeDate).format(
                                    "ddd/MM/YYYY"
                                  )
                                : "Select Date"}
                            </Typography>
                          </Box>
                        </Box>
                        {openChequeDate && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: "100%",
                              left: "-64%",

                              zIndex: 1000,
                              bgcolor: "white",
                              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                            }}
                          >
                            <Calendar
                              color="var(--primary-color)"
                              date={selectedChequeDate || new Date()}
                              onChange={(date) => handleSelectCheque(date)}
                              months={1}
                              direction="horizontal"
                              style={{
                                fontSize: "11px",
                                padding: "0",
                                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                  <Grid container spacing={4} sx={{ mt: "4px" }}>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Reference
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <input
                            placeholder="Enter Reference"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="reference"
                            value={formChequeData?.reference}
                            onChange={handleInputChequeChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={3} lg={3}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Enter Amount
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "5px" }}>
                          <input
                            placeholder="Enter Enter Amount"
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                            required
                            name="amount"
                            value={formChequeData?.amount}
                            onChange={handleInputChequeChange}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={5} lg={5}>
                      <Box sx={{ mt: "5px", pb: "5px" }}>
                        <CustomButton onClick={handleButtonChequeClick}>
                          Choose Attachment Copy
                        </CustomButton>
                      </Box>
                      <input
                        required
                        ref={fileInputChequeRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleChequeFileSelect}
                      />
                      {selectedChequeFile ? (
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--secondary-color)",
                            fontWeight: 600,
                          }}
                        >
                          {selectedChequeFile.name}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "11px",
                            color: "var(--secondary-color)",
                            fontWeight: 600,
                          }}
                        >
                          Upload JPG,JPEG,PNG,PDF,formats
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    pt: {
                      xs: "20px",
                      sm: "20px",
                      md: "40px",
                      // lg: "100px",
                    },
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    type="submit"
                    sx={{
                      color: "#ffff",
                      background: "#444542",
                      textTransform: "capitalize",
                      width: { xs: "100%", md: "40%" },
                      ":hover": {
                        backgroundColor: "#444542",
                      },
                    }}
                  >
                    Submit Deposit Request
                  </Button>
                </Box>
              </form>
            </>
          ) : value === "BankTranasfer" ? (
            <>
              <form onSubmit={handleDepositeBankTransfer}>
                <Grid container>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box sx={{ borderBottom: "1px solid #13406B" }}>
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Deposit From
                          </Typography>
                        </Box>
                        <Box sx={{}}>
                          <FormControl
                            fullWidth
                            variant="outlined"
                            sx={{
                              padding: 0,
                              "& .MuiOutlinedInput-root": {
                                padding: 0, // Removes padding inside the Select input
                              },
                            }}
                          >
                            <Select
                              defaultValue="Deposit From AC"
                              sx={{
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none",
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                  {
                                    border: "none",
                                  },
                                fontSize: "13px",
                                padding: 0,
                                margin: 0,
                              }}
                              style={{
                                backgroundColor: "#ffff",
                                p: 0,
                              }}
                              value={selectedOptionFrom}
                              onChange={handleSelectChangeFrom}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    maxHeight: 200,
                                    width: 200,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="Deposit From AC">
                                Deposit From AC
                              </MenuItem>
                              {bankDatas?.map((bank, index) => (
                                <MenuItem
                                  sx={{ fontSize: "13px" }}
                                  key={index}
                                  value={bank?.name}
                                >
                                  {`${bank?.name}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box sx={{ borderBottom: "1px solid #13406B" }}>
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Deposit To
                          </Typography>
                        </Box>
                        <Box>
                          <FormControl fullWidth variant="outlined">
                            <Select
                              defaultValue="Deposit To AC"
                              sx={{
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none",
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                  {
                                    border: "none",
                                  },
                                fontSize: "13px",
                              }}
                              style={{
                                backgroundColor: "#ffff",
                                textTransform: "capitalize",
                              }}
                              value={selectedOptionTo}
                              onChange={handleSelectChangeTo}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    maxHeight: 200,
                                    width: 400,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="Deposit To AC">
                                Deposit To AC
                              </MenuItem>
                              {depositeToBank?.map((bank, index) => (
                                <MenuItem
                                  sx={{ fontSize: "13px" }}
                                  key={index}
                                  value={`${bank?.accountHolderName}. ${bank?.bankName}, ${bank?.branchName} (A/C - ${bank?.accountNumber})`}
                                >
                                  {`${bank?.accountHolderName}. ${bank?.bankName}, ${bank?.branchName} (A/C - ${bank?.accountNumber})`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box sx={{ position: "relative" }}>
                        <Box
                          sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                          onClick={() => setOpenBankDate(true)}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--primary-button)",
                              }}
                            >
                              Transaction Date
                            </Typography>
                          </Box>
                          <Box sx={{ mt: "14px" }}>
                            <Typography
                              sx={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--primary-button)",
                                pb: "13px",
                              }}
                            >
                              {selectedBankDate
                                ? moment(selectedBankDate).format("ddd/MM/YYYY")
                                : "Select Transaction Date"}
                            </Typography>
                          </Box>
                        </Box>
                        {openBankDate && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: "100%",
                              left: "-64%",
                              zIndex: 1000,
                              bgcolor: "white",
                              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                            }}
                          >
                            <Calendar
                              color="var(--primary-color)"
                              date={selectedBankDate || new Date()}
                              onChange={(date) => handleSelectBank(date)}
                              months={1}
                              direction="horizontal"
                              style={{
                                fontSize: "11px",
                                padding: "0",
                                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.09)",
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                  <Grid container spacing={2} sx={{ mt: "15px" }}>
                    <Grid item xs={12} sm={12} md={4} lg={4}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Transaction ID
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "10px" }}>
                          <input
                            required
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter Transaction ID"
                            style={{
                              outline: "none",
                              border: "none",

                              width: "100%",
                              padding: "2px 0",
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={12} md={3} lg={3}>
                      <Box
                        sx={{ borderBottom: "1px solid #13406B", pb: "5px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "var(--primary-button)",
                            }}
                          >
                            Enter Amount
                          </Typography>
                        </Box>
                        <Box sx={{ mt: "10px" }}>
                          <input
                            required
                            placeholder="Enter Enter Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{
                              outline: "none",
                              border: "none",
                              width: "100%",
                              padding: "2px 0",
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={12} md={5} lg={5}>
                      <Box sx={{ mt: "10px", pb: "5px" }}>
                        <CustomButton onClick={handleButtonBankClick}>
                          Choose Attachment Copy
                        </CustomButton>
                      </Box>
                      <input
                        required
                        ref={fileInputBankRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleBankFileSelect}
                      />
                      {selectedBankFile ? (
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--secondary-color)",
                            fontWeight: 600,
                          }}
                        >
                          {selectedBankFile.name}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--secondary-color)",
                            fontWeight: 600,
                          }}
                        >
                          Upload JPG,JPEG,PNG,PDF,formats
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    pt: {
                      xs: "20px",
                      sm: "20px",
                      md: "40px",
                      // lg: "100px",
                    },
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    type="submit"
                    sx={{
                      color: "#ffff",
                      background: "#444542",
                      textTransform: "capitalize",
                      width: { xs: "100%", md: "40%" },
                      ":hover": {
                        backgroundColor: "#444542",
                      },
                    }}
                  >
                    Submit Deposit Request
                  </Button>
                </Box>
              </form>
            </>
          ) : value === "instantDeposit" ? (
            <>
              <Box sx={{ height: "100%" }}>
                <Box
                  sx={{
                    bgcolor: "white",
                    borderRadius: "5px",
                    height: {
                      xs: "100%",
                      sm: "100%",
                      // md: "300px",
                      // lg: "300px",
                    },
                    // mt: "30px",
                    p: "10px 10px 10px 10px",
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexDirection: {
                          xs: "column",
                          sm: "column",
                          md: "row",
                          lg: "row",
                        },
                        gap: "10px",
                        justifyContent: "center",
                      }}
                    >
                      {/* Mastercard Option */}
                      <Box
                        sx={{
                          width: "200px",
                          bgcolor:
                            activeOption === "mastercard"
                              ? "#fff8f8"
                              : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          border:
                            activeOption === "mastercard"
                              ? "1px solid #FCAF17"
                              : "none",
                          // borderBottom:
                          //   activeOption === "mastercard"
                          //     ? "2px solid #FCAF17"
                          //     : "none",
                          cursor: "pointer",
                          py: 1,
                        }}
                        onClick={() => handleOptionClick("mastercard")}
                      >
                        {/* <Box>
                          <CardIcons />
                        </Box> */}
                        <Box>
                          <CardIcons />
                          <Typography
                            sx={{
                              color:
                                activeOption === "mastercard"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                              pr: "5px",
                              pt: 2,
                            }}
                          >
                            Visa Mastercard
                          </Typography>
                        </Box>
                      </Box>

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
                          border:
                            activeOption === "shurjopay"
                              ? "1px solid #FCAF17"
                              : "none",
                          // borderBottom:
                          //   activeOption === "shurjopay"
                          //     ? "1px solid #FCAF17"
                          //     : "none",
                          cursor: "pointer",
                          py: 1,
                        }}
                        onClick={() => handleOptionClick("shurjopay")}
                      >
                        {/* <Box>
                          <img
                            src={shurjopayLogo}
                            style={{ width: "100px", height: "60px" }}
                          />
                        </Box> */}
                        <Box>
                          <img
                            src={shurjopayLogo}
                            style={{ width: "100px", height: "40px" }}
                          />
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
                          border:
                            activeOption === "bkash"
                              ? "1px solid #FCAF17"
                              : "none",
                          // borderBottom:
                          //   activeOption === "bkash"
                          //     ? "2px solid #FCAF17"
                          //     : "none",
                          cursor: "pointer",
                          py: 1,
                        }}
                        onClick={() => handleOptionClick("bkash")}
                      >
                        {/* <Box>
                          <BkashIcons />
                        </Box> */}
                        <Box>
                          <BkashIcons />
                          <Typography
                            sx={{
                              color:
                                activeOption === "bkash"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                              pt: 1,
                            }}
                          >
                            BKash
                          </Typography>
                        </Box>
                      </Box>

                      {/* Nagad Option */}
                      <Box
                        sx={{
                          width: "250px",
                          bgcolor:
                            activeOption === "nagad" ? "#fff8f8" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "20px",
                          height: "60px",
                          border:
                            activeOption === "nagad"
                              ? "1px solid #FCAF17"
                              : "none",
                          // borderBottom:
                          //   activeOption === "nagad"
                          //     ? "2px solid #FCAF17"
                          //     : "none",
                          cursor: "pointer",
                          py: 1,
                        }}
                        onClick={() => handleOptionClick("nagad")}
                      >
                        {/* <Box>
                          <NogodICons />
                        </Box> */}
                        <Box>
                          <NogodICons />
                          <Typography
                            sx={{
                              color:
                                activeOption === "nagad"
                                  ? "#E34825"
                                  : "#000000",
                              fontSize: "13px",
                              pt: 1,
                            }}
                          >
                            Nagad
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      {activeOption === "mastercard" && (
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "20px",
                              py: "40px",
                            }}
                          >
                            <Grid container spacing={2}>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Amount To Be Deposited
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="number"
                                      value={payableAmount}
                                      onChange={handlePayableAmountChange}
                                      placeholder="Enter Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",
                                        width: "100%",
                                        padding: "2px 0",
                                        "-moz-appearance": "textfield",
                                        "-webkit-appearance": "none",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Getaway Fee(3.5%)
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="text"
                                      value={gatewayFee.toFixed(2)} // Keep it 2 decimal points
                                      readOnly
                                      placeholder="Enter Enter Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",

                                        width: "100%",
                                        padding: "2px 0",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Payable Amount
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="text"
                                      value={totalAmount.toFixed(2)}
                                      readOnly
                                      placeholder="Total Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",

                                        width: "100%",
                                        padding: "2px 0",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>
                      )}
                      {activeOption === "shurjopay" && (
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "20px",
                              py: "40px",
                            }}
                          >
                            <Grid container spacing={2}>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Amount To Be Deposited
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="number"
                                      value={payableShurjoPayAmount}
                                      onChange={
                                        handlePayableShurjoPayAmountChange
                                      }
                                      placeholder="Enter Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",
                                        width: "100%",
                                        padding: "1px 0",
                                        "-moz-appearance": "textfield",
                                        "-webkit-appearance": "none",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Getaway Fee(2%)
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="text"
                                      value={gatewayShurjoPayFee.toFixed(2)} // Keep it 2 decimal points
                                      readOnly
                                      placeholder="Enter Enter Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",

                                        width: "100%",
                                        padding: "2px 0",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Payable Amount
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="text"
                                      value={totalShurjoPayAmount.toFixed(2)}
                                      readOnly
                                      placeholder="Total Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",

                                        width: "100%",
                                        padding: "2px 0",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>
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
                              py: "40px",
                            }}
                          >
                            <Grid container spacing={2}>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Amount To Be Deposited
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="number"
                                      value={payableBikasAmount}
                                      onChange={handlePayableBikashAmountChange}
                                      placeholder="Enter Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",
                                        width: "100%",
                                        padding: "1px 0",
                                        "-moz-appearance": "textfield",
                                        "-webkit-appearance": "none",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Getaway Fee(1.25%)
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="text"
                                      value={gatewayBikashFee.toFixed(2)} // Keep it 2 decimal points
                                      readOnly
                                      placeholder="Enter Enter Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",

                                        width: "100%",
                                        padding: "2px 0",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                              {/* item one  */}
                              <Grid item xs={12} sm={12} md={4} lg={4}>
                                <Box
                                  sx={{
                                    borderBottom: "1px solid #13406B",
                                    pb: "5px",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "var(--primary-button)",
                                      }}
                                    >
                                      Payable Amount
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: "5px" }}>
                                    <input
                                      type="text"
                                      value={totalBikashAmount.toFixed(2)}
                                      readOnly
                                      placeholder="Total Amount"
                                      style={{
                                        outline: "none",
                                        border: "none",

                                        width: "100%",
                                        padding: "2px 0",
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>
                      )}
                      {activeOption === "nagad" && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            py: "30px",
                            fontsize: "13px",
                          }}
                        >
                          <Typography>
                            For Development Reason Nagad will be disable Thank
                            you for your Cooperation.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
                <Box>
                  <Box
                    onClick={handlePaymentClick}
                    sx={{
                      bgcolor: "var(--primary-color)",
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      borderRadius: "5px",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "var(--meta-black)",
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "13px",
                          lg: "13px",
                        },
                      }}
                    >
                      {activeOption === "mastercard" ? (
                        <>
                          {"PAY USING SSL COMMERCEZ "}
                          {commaNumber(totalAmount.toFixed(2))} BDT
                        </>
                      ) : activeOption === "shurjopay" ? (
                        <>
                          {"PAY USING ShurjoPay "}
                          {commaNumber(totalShurjoPayAmount.toFixed(2))} BDT
                        </>
                      ) : activeOption === "bkash" ? (
                        <>
                          {"PAY USING bkash "}
                          {commaNumber(totalBikashAmount.toFixed(2))} BDT
                        </>
                      ) : activeOption === "fswallet" ? (
                        <>
                          {"PAY USING FLY JATT WALLET"}{" "}
                          {commaNumber(paymentData?.walletPayment?.price)} BDT
                        </>
                      ) : null}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            ""
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AddDeposite;
