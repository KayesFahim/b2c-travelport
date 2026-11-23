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
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { useLocation, useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";
import NavBar from "../../Shared/NavBar/NavBar";
import {
  bookTravelportHotel,
  fetchTravelportHotelRules,
} from "../../utils/travelportHotel";

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

  const [title, setTitle] = useState("MR");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cardType, setCardType] = useState("VI");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [billingStreet, setBillingStreet] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingCountry, setBillingCountry] = useState("AE");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  // Step 4: optional live rules verification right on checkout page
  const [rateRules, setRateRules] = useState(bookingContext?.rateRules || null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState("");

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

  const { property, roomOffer, searchCriteria, nights, fromPackage } = bookingContext;

  const displayCurrency =
    rateRules?.currencyCode || roomOffer?.currencyCode || searchCriteria?.currency || "USD";
  const displayBase =
    rateRules?.basePrice !== undefined && rateRules?.basePrice !== null
      ? Number(rateRules.basePrice)
      : Number(roomOffer?.basePrice || 0);
  const displayTaxes =
    rateRules?.taxes !== undefined && rateRules?.taxes !== null
      ? Number(rateRules.taxes)
      : Number(roomOffer?.taxes || 0);
  const displayTotal =
    rateRules?.totalPrice !== undefined && rateRules?.totalPrice !== null
      ? Number(rateRules.totalPrice)
      : Number(roomOffer?.totalPrice || 0);

  const handleLoadRules = async () => {
    setRulesLoading(true);
    setRulesError("");
    try {
      const res = await fetchTravelportHotelRules(
        {
          catalogOfferingsIdentifier: roomOffer?.catalogOfferingsIdentifier,
          catalogOfferingIdentifier: roomOffer?.catalogOfferingIdentifier,
          authority: roomOffer?.authority || roomOffer?.aggregator || "TVPT",
          propertyCode: property?.propertyCode,
          chainCode: property?.chainCode,
        },
        token
      );
      setRateRules(res?.rules || {});
    } catch (err) {
      setRulesError(err?.message || "Unable to fetch live rate rules.");
    } finally {
      setRulesLoading(false);
    }
  };

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
          currency: displayCurrency,
          catalogOfferingsIdentifier: roomOffer?.catalogOfferingsIdentifier,
          catalogOfferingIdentifier: roomOffer?.catalogOfferingIdentifier,
          authority: roomOffer?.authority || roomOffer?.aggregator || "TVPT",
          acceptPriceChangeInd: true,
          acceptGuaranteeChangeInd: true,
          guest: {
            title,
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
                ...(billingStreet.trim() || billingCity.trim()
                  ? {
                      billingAddress: {
                        street: billingStreet.trim(),
                        city: billingCity.trim(),
                        countryCode: billingCountry.trim() || "AE",
                      },
                    }
                  : {}),
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
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        {/* 5-Step Travelport Stays v11 Progress Bar */}
        <Box
          sx={{
            mb: 2.2,
            px: 2,
            py: 1.2,
            borderRadius: "12px",
            bgcolor: "#ffffff",
            border: "1px solid #d7e6f5",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.2,
          }}
        >
          <Button
            type="button"
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate(fromPackage ? "/package" : -1)}
            sx={{ textTransform: "none", fontWeight: 800, color: "#0b4a82" }}
          >
            {fromPackage ? "Back to Package Organizer" : "Back to Room Selection"}
          </Button>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip size="small" label="1. Search ✓" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="2. Details ✓" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="3. Availability ✓" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip
              size="small"
              label={rateRules ? "4. Rules ✓" : "4. Rules (Optional)"}
              color={rateRules ? "success" : "default"}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Chip size="small" label="5. Create Reservation" color="primary" sx={{ fontWeight: 800 }} />
          </Stack>
        </Box>

        <Typography component="h1" sx={{ fontWeight: 800, fontSize: "24px", color: "#0f2942", mb: 2 }}>
          Step 5: Complete Your Stay Reservation
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
            <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2.5 }}>
              {fromPackage && (
                <Button
                  type="button"
                  variant="outlined"
                  sx={{ textTransform: "none", fontWeight: 700 }}
                  onClick={() => navigate("/package")}
                >
                  Return to Package Organizer
                </Button>
              )}
              <Button
                type="button"
                variant="contained"
                sx={{ textTransform: "none", fontWeight: 700 }}
                onClick={() => navigate("/hotel")}
              >
                Back to Stays
              </Button>
            </Stack>
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
                    <Grid item xs={12} sm={3}>
                      <label htmlFor="hotel-guest-title" className="flyjatt-stay-label">
                        Title
                      </label>
                      <select
                        id="hotel-guest-title"
                        className="flyjatt-native-select"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      >
                        <option value="MR">Mr</option>
                        <option value="MRS">Mrs</option>
                        <option value="MS">Ms</option>
                        <option value="DR">Dr</option>
                      </select>
                    </Grid>
                    <Grid item xs={12} sm={4.5}>
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
                    <Grid item xs={12} sm={4.5}>
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
                  <legend>
                    Payment / Guarantee Card{" "}
                    {roomOffer?.creditCardRequired || roomOffer?.prepayRequired
                      ? "(Required by Hotel Rate)"
                      : "(Optional unless required by rate)"}
                  </legend>
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
                    <Grid item xs={6} sm={3}>
                      <label htmlFor="hotel-exp-month" className="flyjatt-stay-label">
                        Expiry (MM)
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
                    <Grid item xs={6} sm={3}>
                      <label htmlFor="hotel-exp-year" className="flyjatt-stay-label">
                        Expiry (YY)
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
                    <Grid item xs={12} sm={6}>
                      <label htmlFor="hotel-billing-street" className="flyjatt-stay-label">
                        Billing Street (Optional)
                      </label>
                      <input
                        id="hotel-billing-street"
                        type="text"
                        autoComplete="street-address"
                        className="flyjatt-native-input"
                        placeholder="Street address"
                        value={billingStreet}
                        onChange={(e) => setBillingStreet(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={8} sm={4}>
                      <label htmlFor="hotel-billing-city" className="flyjatt-stay-label">
                        Billing City
                      </label>
                      <input
                        id="hotel-billing-city"
                        type="text"
                        autoComplete="address-level2"
                        className="flyjatt-native-input"
                        placeholder="City"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <label htmlFor="hotel-billing-country" className="flyjatt-stay-label">
                        Country
                      </label>
                      <input
                        id="hotel-billing-country"
                        type="text"
                        maxLength={2}
                        autoComplete="country"
                        className="flyjatt-native-input"
                        placeholder="AE"
                        value={billingCountry}
                        onChange={(e) => setBillingCountry(e.target.value.toUpperCase())}
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
                    `Confirm Reservation • ${displayCurrency} ${displayTotal.toLocaleString()}`
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
                <Typography sx={{ fontWeight: 800, fontSize: "16.5px", color: "#0b4a82" }}>
                  {property?.hotelName}
                </Typography>
                <Typography sx={{ fontSize: "13px", color: "#64748b", mt: 0.4 }}>
                  {property?.address}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#0f2942" }}>
                  {roomOffer?.roomName}
                </Typography>
                <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
                  <Chip size="small" label={roomOffer?.mealPlan || "Room Only"} sx={{ fontWeight: 700 }} />
                  {roomOffer?.bedType && (
                    <Chip size="small" label={roomOffer.bedType} variant="outlined" sx={{ fontWeight: 700 }} />
                  )}
                  <Chip
                    size="small"
                    icon={<VerifiedUserRoundedIcon sx={{ fontSize: "14px !important" }} />}
                    label={roomOffer?.cancellationSummary || "Standard Policy"}
                    color={roomOffer?.refundable ? "success" : "default"}
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Typography sx={{ fontSize: "13px", color: "#475569", mt: 1.3, lineHeight: 1.6 }}>
                  Check-in: <strong>{searchCriteria?.checkIn}</strong>
                  <br />
                  Check-out: <strong>{searchCriteria?.checkOut}</strong>
                  <br />
                  Duration: <strong>{nights} night(s)</strong> • {searchCriteria?.rooms} room(s)
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                {/* Verified Step 4 Rules Panel */}
                {rateRules ? (
                  <Box sx={{ mb: 1.5, p: 1.2, borderRadius: "10px", bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#166534", mb: 0.5 }}>
                      Verified Live Rate Rules (v11 Step 4)
                    </Typography>
                    {rateRules.cancellationPolicy && (
                      <Typography sx={{ fontSize: "11.5px", color: "#334155", mb: 0.4 }}>
                        <strong>Cancellation:</strong> {rateRules.cancellationPolicy}
                      </Typography>
                    )}
                    {rateRules.guaranteePolicy && (
                      <Typography sx={{ fontSize: "11.5px", color: "#334155" }}>
                        <strong>Guarantee:</strong> {rateRules.guaranteePolicy}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ mb: 1.5 }}>
                    <Button
                      type="button"
                      size="small"
                      fullWidth
                      variant="outlined"
                      disabled={rulesLoading}
                      onClick={handleLoadRules}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: "9px" }}
                    >
                      {rulesLoading ? "Verifying Rate Rules..." : "Verify Live Rate Rules (Step 4)"}
                    </Button>
                    {rulesError && (
                      <Typography sx={{ fontSize: "11.5px", color: "#b91c1c", mt: 0.5 }}>
                        {rulesError}
                      </Typography>
                    )}
                  </Box>
                )}

                <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span>Room Base</span>
                  <span>
                    {displayCurrency} {displayBase.toLocaleString()}
                  </span>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "14px", mt: 0.5 }}>
                  <span>Taxes &amp; Fees</span>
                  <span>
                    {displayCurrency} {displayTaxes.toLocaleString()}
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
                    {displayCurrency} {displayTotal.toLocaleString()}
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
