import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import { bookTravelportHotel } from "../../utils/travelportHotel";

const HotelBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = secureLocalStorage.getItem("access_token");

  const bookingContext = useMemo(() => {
    if (location?.state?.property && location?.state?.roomOffer) {
      return location.state;
    }
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem("flyjatt:selected_hotel_offer");
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }, [location?.state]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cardType, setCardType] = useState("VI");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  if (!bookingContext) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb" }}>
        <NavBar />
        <Container sx={{ py: 6, textAlign: "center" }}>
          <HotelRoundedIcon sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: "20px", color: "#0f2942" }}>
            No hotel room selected
          </Typography>
          <Typography sx={{ color: "#64748b", mt: 0.8, mb: 2 }}>
            Search for a stay and choose a room rate before proceeding to guest checkout.
          </Typography>
          <Button
            type="button"
            variant="contained"
            onClick={() => navigate("/hotel")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Search Stays
          </Button>
        </Container>
      </Box>
    );
  }

  const { property, roomOffer, searchCriteria, nights } = bookingContext;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setRequiresLogin(false);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMessage("Please fill in guest first name, last name, and email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await bookTravelportHotel(
        {
          propertyCode: property?.propertyCode,
          chainCode: property?.chainCode,
          hotelName: property?.hotelName,
          checkIn: searchCriteria?.checkIn,
          checkOut: searchCriteria?.checkOut,
          rooms: searchCriteria?.rooms,
          adults: searchCriteria?.adults,
          children: searchCriteria?.children,
          currency: roomOffer?.currencyCode || searchCriteria?.currency || "USD",
          catalogOfferingsIdentifier: roomOffer?.catalogOfferingsIdentifier,
          catalogOfferingIdentifier: roomOffer?.catalogOfferingIdentifier,
          productIdentifier: roomOffer?.productIdentifier,
          rateCode: roomOffer?.rateCode,
          guest: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          payment: cardNumber.trim()
            ? {
                cardType,
                cardNumber: cardNumber.trim(),
                expiryMonth: expiryMonth.trim(),
                expiryYear: expiryYear.trim(),
                cardHolderName: `${firstName.trim()} ${lastName.trim()}`,
              }
            : undefined,
          specialRequests: specialRequests.trim(),
        },
        token
      );
      setConfirmation(res);
    } catch (err) {
      if (err?.requiresLogin || err?.status === 401) {
        setRequiresLogin(true);
      }
      setErrorMessage(err?.message || "Hotel reservation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fb", pb: 6 }}>
      <NavBar />
      <Container sx={{ pt: 3 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: "24px", color: "#0f2942", mb: 2 }}>
          Complete Your Stay Reservation
        </Typography>

        {confirmation ? (
          <Box
            sx={{
              bgcolor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #bbf7d0",
              p: 4,
              textAlign: "center",
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 52, color: "#16a34a", mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "22px", color: "#14532d" }}>
              Hotel Reservation Confirmed!
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "15px", color: "#334155" }}>
              Confirmation Locator:{" "}
              <strong>{confirmation.confirmationLocator || confirmation.reservationId}</strong>
            </Typography>
            <Button
              type="button"
              variant="contained"
              sx={{ mt: 2.5, textTransform: "none", fontWeight: 700 }}
              onClick={() => navigate("/hotel")}
            >
              Back to Stays
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={8}>
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #d7e6f5",
                  p: 3,
                }}
              >
                {errorMessage && (
                  <Alert
                    severity={requiresLogin ? "warning" : "error"}
                    sx={{ mb: 2 }}
                    action={
                      requiresLogin ? (
                        <Button
                          type="button"
                          size="small"
                          color="inherit"
                          onClick={() => navigate("/signIn")}
                        >
                          Sign In
                        </Button>
                      ) : null
                    }
                  >
                    {errorMessage}
                  </Alert>
                )}

                <fieldset className="flyjatt-filter-fieldset" style={{ marginBottom: "1.2rem" }}>
                  <legend>Primary Guest Details</legend>
                  <Grid container spacing={1.5} sx={{ mt: 0.2 }}>
                    <Grid item xs={12} sm={6}>
                      <label htmlFor="hotel-guest-first" className="flyjatt-stay-label">
                        First Name <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="hotel-guest-first"
                        type="text"
                        className="flyjatt-native-input"
                        autoComplete="given-name"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <label htmlFor="hotel-guest-last" className="flyjatt-stay-label">
                        Last Name <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="hotel-guest-last"
                        type="text"
                        className="flyjatt-native-input"
                        autoComplete="family-name"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <label htmlFor="hotel-guest-email" className="flyjatt-stay-label">
                        Email Address <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="hotel-guest-email"
                        type="email"
                        className="flyjatt-native-input"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <label htmlFor="hotel-guest-phone" className="flyjatt-stay-label">
                        Phone Number
                      </label>
                      <input
                        id="hotel-guest-phone"
                        type="tel"
                        className="flyjatt-native-input"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </fieldset>

                <fieldset className="flyjatt-filter-fieldset" style={{ marginBottom: "1.2rem" }}>
                  <legend>Payment / Guarantee Card (Optional unless required by rate)</legend>
                  <Grid container spacing={1.5} sx={{ mt: 0.2 }}>
                    <Grid item xs={12} sm={4}>
                      <label htmlFor="hotel-card-type" className="flyjatt-stay-label">
                        Card Network
                      </label>
                      <select
                        id="hotel-card-type"
                        className="flyjatt-native-select"
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value)}
                      >
                        <option value="VI">Visa (VI)</option>
                        <option value="CA">Mastercard (CA)</option>
                        <option value="AX">American Express (AX)</option>
                      </select>
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <label htmlFor="hotel-card-num" className="flyjatt-stay-label">
                        Card Number
                      </label>
                      <input
                        id="hotel-card-num"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        className="flyjatt-native-input"
                        placeholder="Card number for hotel guarantee"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <label htmlFor="hotel-exp-month" className="flyjatt-stay-label">
                        Expiry Month (MM)
                      </label>
                      <input
                        id="hotel-exp-month"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp-month"
                        maxLength={2}
                        className="flyjatt-native-input"
                        placeholder="MM"
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <label htmlFor="hotel-exp-year" className="flyjatt-stay-label">
                        Expiry Year (YY)
                      </label>
                      <input
                        id="hotel-exp-year"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp-year"
                        maxLength={2}
                        className="flyjatt-native-input"
                        placeholder="YY"
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </fieldset>

                <Box sx={{ mb: 2 }}>
                  <label htmlFor="hotel-special-requests" className="flyjatt-stay-label">
                    Special Requests (Late check-in, bed preference, etc.)
                  </label>
                  <textarea
                    id="hotel-special-requests"
                    rows={3}
                    className="flyjatt-native-input"
                    style={{ minHeight: "88px", resize: "vertical" }}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  sx={{
                    minHeight: "48px",
                    px: 4,
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 800,
                    background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                  }}
                >
                  {submitting ? (
                    <>
                      <CircularProgress size={18} sx={{ color: "#fff", mr: 1 }} />
                      Confirming Stay...
                    </>
                  ) : (
                    `Confirm Booking • ${roomOffer?.currencyCode || "USD"} ${Number(roomOffer?.totalPrice || 0).toLocaleString()}`
                  )}
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #d7e6f5",
                  p: 2.5,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#0b4a82" }}>
                  {property?.hotelName}
                </Typography>
                <Typography sx={{ fontSize: "13px", color: "#64748b", mt: 0.4 }}>
                  {property?.address}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#0f2942" }}>
                  {roomOffer?.roomName}
                </Typography>
                <Chip
                  size="small"
                  label={roomOffer?.mealPlan || "Room Only"}
                  sx={{ mt: 0.8, fontWeight: 700 }}
                />
                <Typography sx={{ fontSize: "13px", color: "#475569", mt: 1.2 }}>
                  Check-in: <strong>{searchCriteria?.checkIn}</strong>
                  <br />
                  Check-out: <strong>{searchCriteria?.checkOut}</strong>
                  <br />
                  Duration: <strong>{nights} night(s)</strong> • {searchCriteria?.rooms} room(s)
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span>Room Base</span>
                  <span>
                    {roomOffer?.currencyCode} {Number(roomOffer?.basePrice || 0).toLocaleString()}
                  </span>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "14px", mt: 0.5 }}>
                  <span>Taxes &amp; Fees</span>
                  <span>
                    {roomOffer?.currencyCode} {Number(roomOffer?.taxes || 0).toLocaleString()}
                  </span>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0b4a82",
                    mt: 1.2,
                  }}
                >
                  <span>Total</span>
                  <span>
                    {roomOffer?.currencyCode} {Number(roomOffer?.totalPrice || 0).toLocaleString()}
                  </span>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default HotelBooking;
