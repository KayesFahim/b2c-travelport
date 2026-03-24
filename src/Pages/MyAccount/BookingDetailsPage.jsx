import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Paper,
    Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import NavBar from "../../Shared/NavBar/NavBar";
import BookingAllPdf from "../AllPDF/BookingAllPdf/BookingAllPdf";
import FlightDetailsContent from "../ShowDetails/FlightDetailsContent";

const ACCOUNT_BOOKING_CACHE_KEY = "flyjatt:account_booking_details";

const panelStyle = {
    border: "1px solid rgba(0, 154, 214, 0.18)",
    borderRadius: "16px",
    backgroundColor: "#fff",
    boxShadow: "0 16px 34px rgba(10, 35, 60, 0.07)",
};

function toText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function toNumberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
    return toNumberValue(value).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function paxLabelDetail(value) {
    const code = String(value || "").toUpperCase();
    if (code === "ADT" || code === "ADULT") return "Adult";
    if (code === "CHD" || code === "CNN" || code === "CHILD") return "Child";
    if (code === "INF" || code === "INFANT") return "Infant";
    return value || "Passenger";
}

function parseDateValue(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isTicketedStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    return status === "ticketed" || status === "issued" || status === "ticket issue done";
}

function formatDateTime(value) {
    if (!value) return "-";
    const date = parseDateValue(value);
    if (!date) return "-";
    return moment(date).format("ddd, DD MMM YYYY hh:mm A");
}

function getDepDate(booking) {
    return (
        booking?.laginfo?.[0]?.DepDate ||
        booking?.AllLegsInfo?.[0]?.Segments?.[0]?.DepTime ||
        booking?.DepartureDate ||
        booking?.departureDate ||
        null
    );
}

function bookingRouteText(booking) {
    const from =
        booking?.laginfo?.[0]?.DepFrom ||
        booking?.AllLegsInfo?.[0]?.Segments?.[0]?.DepFrom ||
        "-";
    const to =
        booking?.laginfo?.[0]?.ArrTo ||
        booking?.AllLegsInfo?.[0]?.Segments?.[0]?.ArrTo ||
        "-";
    return `${from} -> ${to}`;
}

function adaptBookingForPdf(rawBooking) {
    const depDate = getDepDate(rawBooking) || new Date().toISOString();
    const arrDate = rawBooking?.laginfo?.[0]?.ArrDate || depDate;
    const segment = {
        DepFrom: rawBooking?.laginfo?.[0]?.DepFrom || "-",
        ArrTo: rawBooking?.laginfo?.[0]?.ArrTo || "-",
        MarketingCarrier: rawBooking?.CurrierCode || "",
        MarketingFlightNumber: rawBooking?.flightNumber || "",
        MarketingCarrierName: rawBooking?.Curriername || "",
        DepTime: depDate,
        ArrTime: arrDate,
        DepartureGate: "",
        SegmentCode: {
            cabinCode: "Y",
        },
    };

    const paxCount = Number(rawBooking?.paxCount || 1);
    const grossFare = Number(rawBooking?.GrossFare || rawBooking?.grossFare || 0);
    const netFare = Number(rawBooking?.NetFare || rawBooking?.netFare || grossFare);
    const taxes = Number(rawBooking?.Taxes || rawBooking?.taxes || 0);
    const serviceFee = Number(rawBooking?.ServiceFee || rawBooking?.SerViceFee || 0);

    const passengerList = Array.isArray(rawBooking?.PassengerList)
        ? rawBooking.PassengerList
        : [];

    const priceBreakDown = Array.isArray(rawBooking?.PriceBreakDown)
        ? rawBooking.PriceBreakDown
        : [
            {
                PaxType: "ADT",
                PaxCount: paxCount,
                BaseFare: Math.max(0, netFare - taxes - serviceFee),
                Taxes: taxes,
                ServiceFee: serviceFee,
                Bag: [{ Allowance: "N/A" }],
            },
        ];

    return [
        {
            ...rawBooking,
            BookingId: rawBooking?.bookingId || rawBooking?.BookingId || "N/A",
            BookingStatus: rawBooking?.bookingStatus || rawBooking?.BookingStatus || "Booked",
            BookingDate:
                rawBooking?.bookingDate || rawBooking?.BookingDate || new Date().toISOString(),
            TripType: rawBooking?.TripType || rawBooking?.tripType || "OneWay",
            PNR: rawBooking?.PNR || rawBooking?.locator || "N/A",
            AllLegsInfo:
                Array.isArray(rawBooking?.AllLegsInfo) && rawBooking.AllLegsInfo.length
                    ? rawBooking.AllLegsInfo
                    : [{ Segments: [segment] }],
            PassengerList: passengerList,
            PriceBreakDown: priceBreakDown,
            GrossFare: grossFare,
            NetFare: netFare,
        },
    ];
}

export default function BookingDetailsPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const queryBookingId = useMemo(() => {
        const search = new URLSearchParams(location.search);
        return toText(search.get("id"));
    }, [location.search]);

    const cachedBooking = useMemo(() => {
        const search = new URLSearchParams(location.search);
        const targetId = search.get("id");
        const fromState = location.state?.booking;
        if (fromState && typeof fromState === "object") return fromState;

        try {
            const raw = sessionStorage.getItem(ACCOUNT_BOOKING_CACHE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (!parsed || typeof parsed !== "object") return null;

            if (!targetId) return parsed;
            const parsedId = String(
                parsed?.bookingId || parsed?.BookingId || parsed?.reservationId || parsed?.locator || parsed?.PNR || ""
            );
            return parsedId && parsedId === targetId ? parsed : null;
        } catch {
            return null;
        }
    }, [location.search, location.state]);

    const [booking, setBooking] = useState(cachedBooking);
    const [passengersDetailed, setPassengersDetailed] = useState([]);
    const [contactInfo, setContactInfo] = useState({ email: "", phone: "", address: "" });
    const [specialServices, setSpecialServices] = useState([]);
    const [brandInfo, setBrandInfo] = useState({ code: "", name: "", features: [], amenities: [] });
    const [loadingDetails, setLoadingDetails] = useState(Boolean(queryBookingId));
    const [loadingError, setLoadingError] = useState("");

    const [issuingTicket, setIssuingTicket] = useState(false);
    const [ticketStatusOverride, setTicketStatusOverride] = useState("");
    const [issueMessage, setIssueMessage] = useState("");
    const [issueError, setIssueError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadDetails = async () => {
            if (!queryBookingId) {
                setBooking(cachedBooking || null);
                setPassengersDetailed([]);
                setContactInfo({ email: "", phone: "", address: "" });
                setSpecialServices([]);
                setBrandInfo({ code: "", name: "", features: [], amenities: [] });
                setLoadingDetails(false);
                return;
            }

            setLoadingDetails(true);
            setLoadingError("");

            const response = await fetch(`/api/user/booking-details?id=${encodeURIComponent(queryBookingId)}`, {
                method: "GET",
                credentials: "include",
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || "Unable to load booking details");
            }

            if (cancelled) return;

            setBooking(payload?.booking || null);
            setPassengersDetailed(Array.isArray(payload?.passengers) ? payload.passengers : []);
            setContactInfo({
                email: toText(payload?.contact?.email),
                phone: toText(payload?.contact?.phone),
                address: toText(payload?.contact?.address),
            });
            setSpecialServices(Array.isArray(payload?.specialServices) ? payload.specialServices : []);
            setBrandInfo({
                code: toText(payload?.brand?.code),
                name: toText(payload?.brand?.name),
                features: Array.isArray(payload?.brand?.features) ? payload.brand.features : [],
                amenities: Array.isArray(payload?.brand?.amenities) ? payload.brand.amenities : [],
            });
            setLoadingDetails(false);
        };

        loadDetails().catch((error) => {
            if (cancelled) return;
            setBooking(cachedBooking || null);
            setPassengersDetailed([]);
            setContactInfo({ email: "", phone: "", address: "" });
            setSpecialServices([]);
            setBrandInfo({ code: "", name: "", features: [], amenities: [] });
            setLoadingDetails(false);
            setLoadingError(error instanceof Error ? error.message : "Unable to load booking details");
        });

        return () => {
            cancelled = true;
        };
    }, [cachedBooking, queryBookingId]);

    useEffect(() => {
        setTicketStatusOverride("");
        setIssueMessage("");
        setIssueError("");
        setIssuingTicket(false);
    }, [booking?.id, booking?.reservationId, booking?.locator]);

    if (loadingDetails) {
        return (
            <Box>
                <NavBar />
                <Container maxWidth="lg" sx={{ py: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress />
                    </Box>
                </Container>
            </Box>
        );
    }

    if (!booking) {
        return (
            <Box>
                <NavBar />
                <Container maxWidth="lg" sx={{ py: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {toText(loadingError, "Booking details not found. Please open from My Account Booking History.")}
                    </Alert>
                    <Button variant="contained" onClick={() => navigate("/my-account/booking")}>Back To Booking History</Button>
                </Container>
            </Box>
        );
    }

    const displayBooking = adaptBookingForPdf(booking)[0];
    const priceRows = Array.isArray(displayBooking?.PriceBreakDown)
        ? displayBooking.PriceBreakDown
        : [];
    const passengers = passengersDetailed.length
        ? passengersDetailed
        : Array.isArray(displayBooking?.PassengerList)
            ? displayBooking.PassengerList
            : [];
    const grossFare = toNumberValue(displayBooking?.GrossFare);
    const netFare = toNumberValue(displayBooking?.NetFare);
    const currency = priceRows?.[0]?.CurrencyCode || "BDT";
    const pnr = toText(displayBooking?.PNR, "-");
    const effectiveStatus = toText(ticketStatusOverride || displayBooking?.BookingStatus, "Booked");
    const canIssueTicket = !isTicketedStatus(effectiveStatus);
    const statusColor = (() => {
        const s = String(effectiveStatus || "").toLowerCase();
        if (s === "ticketed" || s === "issued") return { bgcolor: "#E6F9EE", color: "#1A7A41" };
        if (s === "booked") return { bgcolor: "#E8F3FF", color: "#15488C" };
        if (s === "cancelled") return { bgcolor: "#FDECEA", color: "#B71C1C" };
        return { bgcolor: "#F3F5F9", color: "#444" };
    })();

    const handleIssueTicket = async () => {
        const issuePnr = toText(
            booking?.locator ||
            booking?.Locator ||
            booking?.PNR ||
            booking?.pnr ||
            displayBooking?.PNR
        );

        if (!issuePnr) {
            setIssueError("PNR/Locator not found for this booking.");
            return;
        }

        try {
            setIssuingTicket(true);
            setIssueError("");
            setIssueMessage("");

            const response = await fetch(
                `/api/travelport/issue-ticket?pnr=${encodeURIComponent(issuePnr)}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ pnr: issuePnr }),
                }
            );

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.details || payload?.message || "Issue ticket failed.");
            }

            const ticketLocator = toText(payload?.locator || issuePnr);
            setTicketStatusOverride("Ticketed");
            setIssueMessage(`Ticket issued successfully. Locator: ${ticketLocator}`);
        } catch (error) {
            setIssueError(error instanceof Error ? error.message : "Issue ticket failed.");
        } finally {
            setIssuingTicket(false);
        }
    };

    return (
        <Box>
            <NavBar />
            <Container maxWidth="lg" sx={{ py: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#10355b" }}>
                        Booking Details
                    </Typography>
                    <Button variant="outlined" onClick={() => navigate("/my-account/booking")}>Back To Booking History</Button>
                </Box>

                <Box sx={{ display: "grid", gap: 1.5 }}>
                    {loadingError ? (
                        <Alert severity="warning">{loadingError}</Alert>
                    ) : null}

                    <Paper sx={{ ...panelStyle, p: 1.8, background: "linear-gradient(180deg,#fff 0%,#f5fbff 100%)" }}>
                        <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={6} md={2}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Booking ID</Typography>
                                <Typography sx={{ fontWeight: 700, color: "#15324f", fontSize: 13 }}>
                                    {toText(displayBooking?.BookingId, "-")}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>PNR</Typography>
                                <Typography sx={{ fontWeight: 800, color: "#c0392b", fontSize: 16, letterSpacing: "1px" }}>
                                    {pnr}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Status</Typography>
                                <Chip
                                    label={effectiveStatus}
                                    size="small"
                                    sx={{ fontWeight: 700, fontSize: 11, ...statusColor, border: "none" }}
                                />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Departure</Typography>
                                <Typography sx={{ fontWeight: 600, color: "#15324f", fontSize: 12 }}>
                                    {formatDateTime(getDepDate(booking))}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Route</Typography>
                                <Typography sx={{ fontWeight: 700, color: "#15324f", fontSize: 14 }}>
                                    {bookingRouteText(booking)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Paper sx={{ ...panelStyle, p: 1.6 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: "#0f4b7d", fontSize: 14 }}>
                                    Ticket Status
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "#607890" }}>
                                    Current status: <strong>{effectiveStatus}</strong>
                                </Typography>
                            </Box>

                            {canIssueTicket && (
                                <Button
                                    variant="contained"
                                    onClick={handleIssueTicket}
                                    disabled={issuingTicket}
                                    sx={{ minWidth: 140 }}
                                >
                                    {issuingTicket ? "Issuing..." : "Issue Ticket"}
                                </Button>
                            )}
                        </Box>

                        {issueMessage ? (
                            <Alert severity="success" sx={{ mt: 1.2 }}>
                                {issueMessage}
                            </Alert>
                        ) : null}

                        {issueError ? (
                            <Alert severity="error" sx={{ mt: 1.2 }}>
                                {issueError}
                            </Alert>
                        ) : null}
                    </Paper>

                    <Paper sx={{ ...panelStyle, p: 0, overflow: "hidden" }}>
                        <Box sx={{ px: 2, py: 1.2, bgcolor: "var(--primary-button, #003580)" }}>
                            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                                Flight Information & Amenities
                            </Typography>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                            <FlightDetailsContent data={displayBooking} compactLayout amenityIconsOnly />
                        </Box>
                    </Paper>

                    <Paper sx={{ ...panelStyle, p: 1.8 }}>
                        <Typography sx={{ fontWeight: 800, color: "#0f4b7d", mb: 1.2, fontSize: 14 }}>
                            Brand & Brand Features
                        </Typography>
                        <Grid container spacing={1.2}>
                            <Grid item xs={12} md={4}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Brand Name</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#15324f" }}>
                                    {toText(brandInfo?.name, "N/A")}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Brand Code</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#15324f" }}>
                                    {toText(brandInfo?.code, "N/A")}
                                </Typography>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 1.2 }} />

                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                            Brand Features
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", mb: 1.4 }}>
                            {brandInfo.features.length ? brandInfo.features.map((feature) => (
                                <Chip key={`brand-feature-${feature}`} size="small" label={feature} />
                            )) : <Typography sx={{ fontSize: 12, color: "#607890" }}>N/A</Typography>}
                        </Box>

                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                            Amenities
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                            {brandInfo.amenities.length ? brandInfo.amenities.map((amenity) => (
                                <Chip key={`brand-amenity-${amenity}`} size="small" label={amenity} />
                            )) : <Typography sx={{ fontSize: 12, color: "#607890" }}>N/A</Typography>}
                        </Box>
                    </Paper>

                    <Paper sx={{ ...panelStyle, p: 1.8 }}>
                        <Typography sx={{ fontWeight: 800, color: "#0f4b7d", mb: 1.2, fontSize: 14 }}>
                            Contact & Special Services
                        </Typography>
                        <Grid container spacing={1.2}>
                            <Grid item xs={12} md={4}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Contact Email</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#15324f" }}>
                                    {toText(contactInfo?.email, "N/A")}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Contact Phone</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#15324f" }}>
                                    {toText(contactInfo?.phone, "N/A")}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography sx={{ fontSize: 11, color: "#607890" }}>Address</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#15324f" }}>
                                    {toText(contactInfo?.address, "N/A")}
                                </Typography>
                            </Grid>
                        </Grid>
                        <Divider sx={{ my: 1.2 }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#10355b", mb: 0.8 }}>
                            Special Services
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                            {specialServices.length ? specialServices.map((service) => (
                                <Chip key={`ssr-${service}`} size="small" label={service} />
                            )) : <Typography sx={{ fontSize: 12, color: "#607890" }}>N/A</Typography>}
                        </Box>
                    </Paper>

                    {passengers.length > 0 && (
                        <Paper sx={{ ...panelStyle, p: 1.8 }}>
                            <Typography sx={{ fontWeight: 800, color: "#0f4b7d", mb: 1.2, fontSize: 14 }}>
                                Passengers
                            </Typography>
                            <Grid container spacing={1.2}>
                                {passengers.map((p, idx) => (
                                    <Grid item xs={12} md={6} key={`detail-pax-${idx}`}>
                                        <Box sx={{ border: "1px solid #E9EEF8", borderRadius: "10px", p: 1.3, bgcolor: "#FCFEFF" }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.4 }}>
                                                {toText(p?.title || p?.Title) ? `${toText(p?.title || p?.Title)} ` : ""}
                                                {toText(p?.firstName || p?.FirstName)} {toText(p?.lastName || p?.LastName)}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                {paxLabelDetail(p?.paxType || p?.PaxType)} | {toText(p?.gender || p?.Gender, "N/A")}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                DOB: {toText(p?.dateOfBirth || p?.DateOfBirth)
                                                    ? moment(p?.dateOfBirth || p?.DateOfBirth).format("DD MMM YYYY")
                                                    : "N/A"}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                Passport: {toText(p?.passportNumber || p?.PassportNumber, "N/A")}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                Passport Country: {toText(p?.passportIssuingCountry || p?.PassportIssuingCountry, "N/A")}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                Passport Expiry: {toText(p?.passportExpiryDate || p?.PassportExpiryDate)
                                                    ? moment(p?.passportExpiryDate || p?.PassportExpiryDate).format("DD MMM YYYY")
                                                    : "N/A"}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                Nationality: {toText(p?.nationality || p?.PassportNationality, "N/A")}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                Email: {toText(p?.email || p?.Email, "N/A")}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "#63748E" }}>
                                                Phone: {toText(p?.phone || p?.Phone, "N/A")}
                                            </Typography>
                                            {Array.isArray(p?.specialServices) && p.specialServices.length ? (
                                                <Box sx={{ mt: 0.7, display: "flex", gap: 0.6, flexWrap: "wrap" }}>
                                                    {p.specialServices.map((ssr) => (
                                                        <Chip key={`${idx}-${ssr}`} size="small" label={ssr} />
                                                    ))}
                                                </Box>
                                            ) : null}
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}

                    {priceRows.length > 0 && (
                        <Paper sx={{ ...panelStyle, p: 1.8 }}>
                            <Typography sx={{ fontWeight: 800, color: "#0f4b7d", mb: 1.2, fontSize: 14 }}>
                                Fare & Price Breakdown
                            </Typography>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr 0.5fr 1fr 1fr 1fr", md: "1fr 0.6fr 1fr 1fr 1fr 1.3fr" },
                                    gap: 1,
                                    pb: 1,
                                    borderBottom: "1px solid #E3E8EF",
                                }}
                            >
                                <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Pax Type</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>Qty</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>Base Fare</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>Tax</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>Total</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, display: { xs: "none", md: "block" } }}>
                                    Baggage
                                </Typography>
                            </Box>
                            {priceRows.map((row, idx) => {
                                const bags = Array.isArray(row?.Bag || row?.bag) ? row?.Bag || row?.bag : [];
                                const baggageText = bags.length
                                    ? [...new Set(bags.map((b) => b?.Allowance || b?.allowance || "N/A"))].join(" | ")
                                    : "N/A";
                                const rowBase = toNumberValue(row?.BaseFare ?? row?.baseFare);
                                const rowTax =
                                    toNumberValue(row?.Taxes ?? row?.taxes) + toNumberValue(row?.ServiceFee ?? row?.serviceFee);
                                const rowQty = toNumberValue(row?.PaxCount ?? row?.paxCount) || 1;
                                const rowTotal =
                                    toNumberValue(row?.TotalFare ?? row?.totalFare) || (rowBase + rowTax) * rowQty;
                                return (
                                    <Box
                                        key={`detail-price-${idx}`}
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr 0.5fr 1fr 1fr 1fr", md: "1fr 0.6fr 1fr 1fr 1fr 1.3fr" },
                                            gap: 1,
                                            py: 1,
                                            borderBottom: "1px dashed #EBEEF3",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                            {paxLabelDetail(row?.PaxType || row?.paxType)}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{rowQty}</Typography>
                                        <Typography sx={{ fontSize: 12, textAlign: "right" }}>
                                            {formatMoney(rowBase)} {currency}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, textAlign: "right" }}>
                                            {formatMoney(rowTax)} {currency}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>
                                            {formatMoney(rowTotal)} {currency}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: "#63748E", display: { xs: "none", md: "block" } }}>
                                            {baggageText}
                                        </Typography>
                                    </Box>
                                );
                            })}
                            <Divider sx={{ my: 1.2 }} />
                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 3, flexWrap: "wrap" }}>
                                {grossFare > 0 && grossFare !== netFare && (
                                    <Typography sx={{ fontSize: 13, color: "#607890" }}>
                                        Gross: <strong>{formatMoney(grossFare)} {currency}</strong>
                                    </Typography>
                                )}
                                <Typography sx={{ fontSize: 15, color: "#0f4b7d", fontWeight: 700 }}>
                                    Total: <strong>{formatMoney(netFare || grossFare)} {currency}</strong>
                                </Typography>
                            </Box>
                        </Paper>
                    )}

                    <Paper sx={{ ...panelStyle, p: 1.4 }}>
                        <Typography sx={{ fontWeight: 800, color: "#0f4b7d", mb: 1, fontSize: 13 }}>
                            Download Booking & Ticket PDF
                        </Typography>
                        <BookingAllPdf quesData={adaptBookingForPdf(booking)} />
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
}
