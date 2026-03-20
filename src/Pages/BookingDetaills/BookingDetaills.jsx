import { Box, Container, Grid, Typography } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import NavBar from "../../Shared/NavBar/NavBar";
import FareBreakdown from "./FareBreakdown/FareBreakdown";
import Support from "./Support/Support";
import { useLocation } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import Swal from "sweetalert2";
import commaNumber from "comma-number";
import FlightDetails from "../ShowDetails/FlightDetails";
import FlightForm from "./PassengerInfo/FlightForm";
import Loading from "./Loading";
import {
  getCurrencySymbol,
  getFlightCurrencyCode,
} from "../../utils/flightPolicyUtils";
import { fetchTravelportBuildFromProducts } from "../../utils/travelportBuildFromProducts";
import RightSidebarInfo from "./RightSidebarInfo";
import BrandSelector from "./BrandSelector";

const getFareOptionKey = (option, index = 0) =>
  String(
    option?.ResultId ||
      `${option?.SearchId || "search"}-${option?.NetFare || option?.netFare || 0}-${index}`
  );

const BookingDetaills = () => {
  const [airPriceData, setAirPriceData] = useState([]);
  const [selectedBrandKey, setSelectedBrandKey] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const data = location?.state || {};
  const token = secureLocalStorage.getItem("access_token");

  useEffect(() => {
    const fetchAirPriceData = async () => {
      if (!data || typeof data !== "object" || !Object.keys(data).length) {
        setAirPriceData([]);
        setLoading(false);
        return;
      }

      const priceBreakDown = Array.isArray(data?.PriceBreakDown)
        ? data.PriceBreakDown
        : Array.isArray(data?.priceBreakDown)
          ? data.priceBreakDown
          : [];
      const getPaxCount = (codes = []) =>
        priceBreakDown
          .filter((row) =>
            codes.includes(
              String(row?.PaxType || row?.paxType || "").toUpperCase()
            )
          )
          .reduce(
            (sum, row) => sum + Number(row?.PaxCount || row?.paxCount || 0),
            0
          );

      const adultCount = getPaxCount(["ADT", "ADULT"]) || 1;
      const childCount = getPaxCount(["CHD", "CNN", "CHILD"]);
      const infantCount = getPaxCount(["INF", "INFANT"]);

      try {
        setLoading(true);
        const response = await fetchTravelportBuildFromProducts({
          selectedOffer: data,
          token,
          adultCount,
          childCount,
          infantCount,
        });
        const normalized = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : response
              ? [response]
              : [];

        setAirPriceData(normalized.length ? normalized : [data]);
      } catch (error) {
        console.error("Error fetching build-from-products data:", error);
        setAirPriceData([data]);
      } finally {
        setLoading(false);
      }
    };

    fetchAirPriceData();
  }, [data, token]);

  const airPriceOptions = useMemo(
    () => (Array.isArray(airPriceData) ? airPriceData.filter(Boolean) : []),
    [airPriceData]
  );
  const optionKeys = useMemo(
    () => airPriceOptions.map((option, index) => getFareOptionKey(option, index)),
    [airPriceOptions]
  );

  useEffect(() => {
    if (!optionKeys.length) {
      setSelectedBrandKey("");
      return;
    }
    if (!selectedBrandKey || !optionKeys.includes(selectedBrandKey)) {
      setSelectedBrandKey(optionKeys[0]);
    }
  }, [optionKeys, selectedBrandKey]);

  const selectedAirPrice = useMemo(() => {
    if (!airPriceOptions.length) return null;
    const selectedIndex = optionKeys.indexOf(selectedBrandKey);
    if (selectedIndex >= 0) return airPriceOptions[selectedIndex];
    return airPriceOptions[0];
  }, [airPriceOptions, optionKeys, selectedBrandKey]);

  const activeBookingData = selectedAirPrice || data;

  useEffect(() => {
    if (!loading && selectedAirPrice?.RePriceStatus === "PriceChanged") {
      const currency = getFlightCurrencyCode(selectedAirPrice);
      const symbol = getCurrencySymbol(currency);
      const netFare = Number(
        selectedAirPrice?.NetFare ?? selectedAirPrice?.netFare ?? 0
      );
      Swal.fire({
        html: `Selected option is available with the updated fare. <br>
               New Fare: ${currency} <span style="color: red;">${symbol}${commaNumber(
                 netFare
               )}</span>`,
      });
    }
  }, [loading, selectedAirPrice]);

  return (
    <Box sx={{ backgroundColor: "#EBF0F4", height: "100%" }}>
      <NavBar />
      <Container>
        <Grid container sx={{ pt: "50px" }} spacing={2}>
          <Grid
            item
            xs={12}
            md={3}
            sx={{
              display: {
                xs: "block",
                md: "none",
              },
            }}
          >
            <Grid contaner>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <BrandSelector
                  loading={loading}
                  options={airPriceOptions}
                  selectedKey={selectedBrandKey}
                  onSelect={setSelectedBrandKey}
                />
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <FareBreakdown
                  loading={loading}
                  data={data}
                  airPriceData={airPriceData}
                  selectedAirPrice={selectedAirPrice}
                />
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} mt={3}>
                <Support />
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} mt={2}>
                <RightSidebarInfo data={activeBookingData} />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} sm={12} md={9} lg={9}>
            <Grid container>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <Box sx={{ bgcolor: "#C1DAFF" }}>
                  <Typography
                    sx={{
                      color: "#13406B",
                      fontSize: "13px",
                      fontWeight: 600,
                      px: "15px",
                      py: "5px",
                    }}
                  >
                    Flight Information
                  </Typography>
                </Box>
                <Box sx={{ pt: "20px", bgcolor: "white", px: "10px" }}>
                  <FlightDetails data={activeBookingData} />
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <Box sx={{ bgcolor: "#C1DAFF", mt: "20px" }}>
                  <Typography
                    sx={{
                      color: "#13406B",
                      fontSize: "13px",
                      fontWeight: 600,
                      px: "15px",
                      py: "5px",
                    }}
                  >
                    Passenger Information
                  </Typography>
                </Box>
                <Box
                  sx={{
                    py: 2,
                    bgcolor: "white",
                    px: { xs: 1, md: 2 },
                    mb: 2,
                  }}
                >
                  {loading ? (
                    <Loading />
                  ) : (
                    <FlightForm
                      data={activeBookingData}
                      airPriceData={airPriceData}
                      selectedAirPrice={selectedAirPrice}
                    />
                  )}
                  {/* <PassengerInfo data={data} airPriceData={airPriceData} /> */}
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid
            item
            xs={12}
            md={3}
            sx={{
              display: {
                xs: "none",
                md: "block",
              },
            }}
          >
            <Grid contaner>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <BrandSelector
                  loading={loading}
                  options={airPriceOptions}
                  selectedKey={selectedBrandKey}
                  onSelect={setSelectedBrandKey}
                />
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <FareBreakdown
                  loading={loading}
                  data={data}
                  airPriceData={airPriceData}
                  selectedAirPrice={selectedAirPrice}
                />
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} mt={2}>
                <Support />
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} mt={2}>
                <RightSidebarInfo data={activeBookingData} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default BookingDetaills;
