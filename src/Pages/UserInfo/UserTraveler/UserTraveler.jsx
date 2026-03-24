import React, { useEffect, useState } from "react";
import { Box, Typography, Pagination, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddTraveler from "./AddTraveler";
import secureLocalStorage from "react-secure-storage";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { fetchTravelBuddies } from "../../../utils/travelBuddyApi";

const UserTraveler = () => {
  const [travelData, setTravelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3); // You can change this to the number of items per page
  const token = secureLocalStorage.getItem("access_token");
  const navigate = useNavigate();

  const handleAddTravellerClick = () => {
    navigate("/myprofile/addtravler");
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setErrorText("");
        setLoading(true);
        const data = await fetchTravelBuddies({ token });
        setTravelData(Array.isArray(data?.travelBuddies) ? data.travelBuddies : []);
      } catch (error) {
        setTravelData([]);
        setErrorText("Unable to load travellers right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [token]);
  // Logic for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = travelData?.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Box>
      <Box
        sx={{
          bgcolor: "var(--primary-color)",
          borderRadius: "5px",
          px: { xs: "15px", md: "30px" },
          display: "flex",
          alignItems: "center",
          py: "10px",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={handleAddTravellerClick}
      >
        <Typography sx={{ fontWeight: 600, fontSize: "14px" }}>
          Add Traveller
        </Typography>
        <AddIcon sx={{ fontWeight: 600 }} />
      </Box>

      <Box
        sx={{
          p: {
            xs: "15px",
            md: "20px 30px",
          },
          bgcolor: "white",
          mt: "15px",
          borderRadius: "5px",
        }}
      >
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
        ) : errorText ? (
          <Typography sx={{ color: "#B3261E", textAlign: "center" }}>
            {errorText}
          </Typography>
        ) : currentItems?.length > 0 ? (
          currentItems?.map((travel, index) => (
            <Box key={index}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid #D9D9D9",
                  p: 1,
                  borderRadius: "5px",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      bgcolor: "var(--primary-button)",
                      p: "5px",
                      height: "20px",
                      width: "fit-content",
                      borderRadius: "5px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      px: "10px",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "white",
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "13px",
                          lg: "13px",
                        },
                      }}
                    >
                      {travel?.title} {" "}{travel?.firstName
                      } {" "} {travel?.lastName}
                      {/* Pass no: {travel?.passport} */}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        color: "var(--primary-button)",
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "13px",
                          lg: "13px",
                        },
                        fontWeight: 600,
                        pt: "5px",
                      }}
                    >
                      Pass no: {travel?.passport}
                    </Typography>
                    <Typography
                      sx={{
                        color: "var(--primary-button)",
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "13px",
                          lg: "13px",
                        },
                        fontWeight: 600,
                        pt: "5px",
                      }}
                    >
                      {travel?.fullName}
                    </Typography>
                    <Typography
                      sx={{
                        color: "var(--meta-black)",
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "12px",
                          lg: "12px",
                        },
                        fontWeight: 500,
                        pt: "5px",
                      }}
                    >
                      {travel.gender}, ADT, DOB:{" "}
                      {moment(travel?.dob).format("DD MMM YYYY")}
                    </Typography>
                    <Typography
                      sx={{
                        color: "var(--meta-black)",
                        fontSize: {
                          xs: "11px",
                          sm: "11px",
                          md: "12px",
                          lg: "12px",
                        },
                        fontWeight: 500,
                        pt: "5px",
                      }}
                    >
                      Nationality: {travel?.nationality}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: "var(--meta-black)", textAlign: "center" }}>
            No travel Buddies available.
          </Typography>
        )}
      </Box>
      {/* Pagination */}
      {travelData?.length > itemsPerPage && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={Math.ceil(travelData.length / itemsPerPage)}
            page={currentPage}
            onChange={handlePageChange}
            variant="outlined"
            color="secondary"
            sx={{ mt: 3, display: "flex", justifyContent: "center" }}
          />
        </Box>
      )}
    </Box>
  );
};

export default UserTraveler;
