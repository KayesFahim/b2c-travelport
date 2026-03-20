import { Box, Grid, Typography } from "@mui/material";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import moment from "moment";
import { format } from "date-fns";
import PassengerListSlikton from "../PassengerListSlikton";

const PassengerDetails = ({ loading, booking, quesData }) => {
  console.log("booking", booking);
  return (
    <Box sx={{ overflowX: "auto" }}>
      {loading ? (
        <PassengerListSlikton />
      ) : (
        quesData[0] && typeof quesData[0] === "object" ? (
          quesData[0]?.PassengerList?.map((paxInfo, i) => (
            <Grid container key={i} spacing={4} sx={{ pb:4 }}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    Name :
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-text-color)",
                    }}
                  >
                    {paxInfo.Title} {paxInfo?.FirstName} {paxInfo?.LastName}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    Gender :
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-text-color)",
                    }}
                  >
                    {paxInfo.Gender}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    DOB :
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-text-color)",
                    }}
                  >
                    {moment(paxInfo?.DateOfBirth).format("DD MMM YYYY")}
                  </Typography>
                </Box>

                {/* {
                    booking?.personId?.map((copy, index) => (
                      <React.Fragment key={index}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "12px",
                              color: "var(--primary-button)",
                              fontWeight: 600,
                            }}
                          >
                            Passport Copy :
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "12px",
                              color: "var(--primary-text-color)",
                            }}
                          >
                            <a
                              href={copy?.passport}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Passport
                            </a>
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "12px",
                              color: "var(--primary-button)",
                              fontWeight: 600,
                            }}
                          >
                            Visa Copy :
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "12px",
                              color: "var(--primary-text-color)",
                            }}
                          >
                            <a
                              href={copy?.visa}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Visa
                            </a>
                          </Typography>
                        </Box>
                      </React.Fragment>
                    ))} */}

                {paxInfo?.PassportImage !== null && (
                  <React.Fragment>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "12px",
                          color: "var(--primary-button)",
                          fontWeight: 600,
                        }}
                      >
                        Passport Copy :
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "12px",
                          color: "var(--primary-text-color)",
                        }}
                      >
                        <a
                          href={paxInfo?.PassportImage}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Passport
                        </a>
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "12px",
                          color: "var(--primary-button)",
                          fontWeight: 600,
                        }}
                      >
                        Visa Copy :
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "12px",
                          color: "var(--primary-text-color)",
                        }}
                      >
                        <a
                          href={paxInfo?.VisaImage}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Visa
                        </a>
                      </Typography>
                    </Box>
                  </React.Fragment>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    Pax :
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-text-color)",
                    }}
                  >
                    {paxInfo?.PaxType}
                  </Typography>
                </Box>

                <Box>
                  {paxInfo?.PassportNumber !== null && (
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--primary-button)",
                            fontWeight: 600,
                          }}
                        >
                          Passport No :
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--primary-text-color)",
                          }}
                        >
                          {paxInfo?.PassportNumber}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--primary-button)",
                            fontWeight: 600,
                          }}
                        >
                          Expire Date :
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "var(--primary-text-color)",
                          }}
                        >
                          {moment(paxInfo?.PassportExpiryDate).format(
                            "DD MMM YYYY"
                          )}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    Booking Date :
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "var(--primary-text-color)",
                    }}
                  >
                    {quesData[0]?.BookingDate
                      ? format(new Date(quesData[0]?.BookingDate), "dd MMMM yyyy")
                      : "N/A"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          ))
        ) : (
          <p>No data available</p>
        )
      )}
    </Box>
  );
};

export default PassengerDetails;
