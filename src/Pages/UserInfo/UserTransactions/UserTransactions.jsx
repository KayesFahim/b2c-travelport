import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography, Pagination } from "@mui/material";
import secureLocalStorage from "react-secure-storage";
import moment from "moment";
import commaNumber from "comma-number";
import { config } from "../../../config";

const UserTransactions = () => {
  const [transactionsData, setTransactionsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // Error state
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 3; // Adjust as needed
  const token = secureLocalStorage.getItem("access_token");
  const [selectedTab] = useState("Booked"); // Tab state
  // const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!token) {
        setTransactionsData([]);
        setError("");
        setLoading(false);
        return;
      }

      setError(""); // Reset error state

      try {
        const normalizedBaseUrl = String(config?.baseUrl || "").trim().replace(/\/+$/, "");
        const response = await fetch(
          `${normalizedBaseUrl}/user/oneUserAllTransection?page=${currentPage}&limit=${itemsPerPage}&status=${encodeURIComponent(selectedTab)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(response.statusText || "Failed to fetch data");
        }

        const data = await response.json();
        setTransactionsData(data?.transactions || []);
      } catch (error) {
        setTransactionsData([]);
        setError("Unable to load transactions right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [token, currentPage, selectedTab, itemsPerPage]);

  // Pagination logic
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = transactionsData?.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Box>
      <Box
        sx={{
          bgcolor: "var(--primary-color)",
          borderRadius: "3px",
          px: "30px",
          display: "flex",
          alignItems: "center",
          py: "10px",
          justifyContent: "space-between",
          cursor: "pointer",
          mb: 2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: {
              xs: "12px",
              sm: "12px",
              md: "14px",
              lg: "14px",
            },
          }}
        >
          Transaction List
        </Typography>
      </Box>
      <Box
        sx={{
          p: {
            xs: "15px",
            md: "20px 30px",
          },
          bgcolor: "white",
          borderRadius: "5px",
        }}
      >
        {/* Loader */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "20vh",
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography sx={{ color: "#B3261E", textAlign: "center", my: 2 }}>
            {error}
          </Typography>
        ) : (
          <Box>
            {/* Transactions */}
            {currentTransactions.length > 0 ? (
              currentTransactions.map((transaction, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid #D9D9D9",
                    mt: index === 0 ? "0" : 1,
                    p: 1,
                    borderRadius: "5px",
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        bgcolor: "var(--primary-button)",
                        p: "5px",
                        borderRadius: "5px",
                        display: "inline-block",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          fontSize: {
                            xs: "12px",
                            md: "13px",
                          },
                        }}
                      >
                        TransX ID: {transaction?.tranId}
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        color: "var(--primary-button)",
                        fontSize: { xs: "12px", md: "14px" },
                        fontWeight: 600,
                        pt: "10px",
                      }}
                    >
                      {transaction?.requestType} by Hasibul Amount BDT{" "}
                      {commaNumber(parseInt(transaction?.offerAmmount))}
                    </Typography>

                    <Typography
                      sx={{
                        color: "var(--meta-black)",
                        fontSize: { xs: "11px", md: "12px" },
                        fontWeight: 500,
                        pt: "5px",
                      }}
                    >
                      Request at:{" "}
                      {moment(transaction?.tranDate).format(
                        "ddd, DD MMM hh:mm A"
                      )}
                    </Typography>

                    <Typography
                      sx={{
                        color: "var(--meta-black)",
                        fontSize: { xs: "11px", md: "12px" },
                        fontWeight: 500,
                        pt: "5px",
                      }}
                    >
                      Status: {transaction?.status}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              // Show "No transactions available" only if not loading

              <Typography
                sx={{ color: "var(--meta-black)", textAlign: "center", my: 2 }}
              >
                {loading
                  ? ""
                  : currentTransactions.length <= 0 &&
                  "No transactions available."}
              </Typography>
            )}
          </Box>
        )}

        {/* Pagination Component */}
        {!loading &&
          !error &&
          transactionsData.length > transactionsPerPage && (
            <Pagination
              count={Math.ceil(transactionsData.length / transactionsPerPage)}
              page={currentPage}
              onChange={handlePageChange}
              sx={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
              }}
              variant="outlined"
              color="secondary"
            />
          )}
      </Box>
    </Box>
  );
};

export default UserTransactions;
