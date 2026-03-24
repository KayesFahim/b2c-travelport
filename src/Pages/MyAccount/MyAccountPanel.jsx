import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import secureLocalStorage from "react-secure-storage";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { config } from "../../config";
import NavBar from "../../Shared/NavBar/NavBar";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import HistoryIcon from "@mui/icons-material/History";
import PaymentIcon from "@mui/icons-material/Payment";
import GroupIcon from "@mui/icons-material/Group";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import HelpCenterIcon from "@mui/icons-material/HelpCenter";
import { fetchTravelBuddies } from "../../utils/travelBuddyApi";

const TABS = [
    { id: "Dashboard", label: "Dashboard", icon: DashboardIcon },
    { id: "Personal Information", label: "Personal Information", icon: PersonIcon },
    { id: "Booking History", label: "Booking History", icon: HistoryIcon },
    { id: "Payment History", label: "Payment History", icon: PaymentIcon },
    { id: "Travel Buddy", label: "Travel Buddy", icon: GroupIcon },
    { id: "Raise Case", label: "Raise Case", icon: SupportAgentIcon },
    { id: "Help Center", label: "Help Center", icon: HelpCenterIcon },
];

const STATUS_KEYS = ["Booked", "IssueInProcess", "Ticketed", "Cancelled"];

const panelStyle = {
    border: "1px solid rgba(0, 154, 214, 0.18)",
    borderRadius: "16px",
    backgroundColor: "#fff",
    boxShadow: "0 16px 34px rgba(10, 35, 60, 0.07)",
};

const statCardStyle = {
    borderRadius: "16px",
    border: "1px solid rgba(0, 154, 214, 0.22)",
    background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(236,248,255,0.82) 100%)",
    p: 2.1,
};

const sectionTitleStyle = {
    fontSize: 19,
    fontWeight: 800,
    color: "#10355b",
    letterSpacing: "0.2px",
};

function toText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function parseDateValue(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

function formatDateTime(value) {
    if (!value) return "-";
    const date = parseDateValue(value);
    if (!date) return "-";
    return moment(date).format("ddd, DD MMM YYYY hh:mm A");
}

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function bookingRouteText(booking) {
    const from = booking?.laginfo?.[0]?.DepFrom ||
        booking?.AllLegsInfo?.[0]?.Segments?.[0]?.DepFrom ||
        "-";
    const to = booking?.laginfo?.[0]?.ArrTo ||
        booking?.AllLegsInfo?.[0]?.Segments?.[0]?.ArrTo ||
        "-";
    return `${from} -> ${to}`;
}

function bookingPnrText(booking) {
    return toText(
        booking?.PNR ||
        booking?.locator ||
        booking?.Locator ||
        booking?.pnr ||
        booking?.bookingPnr,
        "-"
    );
}

function bookingCostText(booking) {
    const raw =
        booking?.NetFare ??
        booking?.netFare ??
        booking?.GrossFare ??
        booking?.grossFare ??
        booking?.totalFare ??
        booking?.TotalFare;

    const amount = Number(raw);
    if (!Number.isFinite(amount)) return "-";

    const currency = toText(
        booking?.CurrencyCode ||
        booking?.currencyCode ||
        booking?.PriceBreakDown?.[0]?.CurrencyCode ||
        booking?.PriceBreakDown?.[0]?.currencyCode,
        "BDT"
    );

    return `${Math.round(amount).toLocaleString("en-US")} ${currency}`;
}

function getInitials(name) {
    const cleaned = String(name || "").trim();
    if (!cleaned) return "U";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getValueByPathList(source, paths = []) {
    for (const path of paths) {
        if (!path) continue;
        const keys = String(path).split(".");
        let current = source;
        let isMissing = false;

        for (const key of keys) {
            if (
                current === null ||
                current === undefined ||
                typeof current !== "object" ||
                !(key in current)
            ) {
                isMissing = true;
                break;
            }
            current = current[key];
        }

        if (!isMissing && current !== undefined && current !== null && current !== "") {
            return current;
        }
    }

    return undefined;
}

function extractBookingEmails(booking) {
    const collected = [];
    const pushEmail = (value) => {
        const email = normalizeEmail(value);
        if (email && email.includes("@")) {
            collected.push(email);
        }
    };

    pushEmail(booking?.email);
    pushEmail(booking?.Email);
    pushEmail(booking?.userEmail);
    pushEmail(booking?.contactEmail);
    pushEmail(booking?.ContactEmail);
    pushEmail(booking?.contact?.email);
    pushEmail(booking?.Contact?.Email);

    const passengerBuckets = [
        booking?.PassengerList,
        booking?.passengers,
        booking?.bookingBody?.Passengers,
    ];

    passengerBuckets.forEach((bucket) => {
        if (!Array.isArray(bucket)) return;
        bucket.forEach((passenger) => {
            pushEmail(passenger?.email);
            pushEmail(passenger?.Email);
            pushEmail(passenger?.contactEmail);
            pushEmail(passenger?.ContactEmail);
        });
    });

    return Array.from(new Set(collected));
}

function filterBookingsByEmail(rows, email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return Array.isArray(rows) ? rows : [];

    return (Array.isArray(rows) ? rows : []).filter((booking) => {
        const bookingEmails = extractBookingEmails(booking);
        if (!bookingEmails.length) return true;
        return bookingEmails.includes(normalizedEmail);
    });
}

function parseSessionStorageJson(key) {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function buildCachedBookingFromSession(previewPayload, finalCommitPayload) {
    if (!previewPayload?.bookingBody && !finalCommitPayload) {
        return null;
    }

    const selectedAirPrice =
        previewPayload?.selectedAirPrice && typeof previewPayload.selectedAirPrice === "object"
            ? previewPayload.selectedAirPrice
            : previewPayload?.selectedOffer && typeof previewPayload.selectedOffer === "object"
                ? previewPayload.selectedOffer
                : {};

    const firstSegment =
        Array.isArray(selectedAirPrice?.AllLegsInfo) && selectedAirPrice.AllLegsInfo[0]?.Segments?.[0]
            ? selectedAirPrice.AllLegsInfo[0].Segments[0]
            : {};

    const reservationId = toText(
        getValueByPathList(finalCommitPayload, [
            "reservationId",
            "ReservationResponse.Reservation.Identifier.value",
            "ReservationResponse.Reservation.Identifier",
            "Reservation.Identifier.value",
            "Reservation.Identifier",
            "data.reservationId",
        ])
    );

    const locator = toText(finalCommitPayload?.locator || selectedAirPrice?.locator);
    if (!locator) {
        return null;
    }

    const bookingId = reservationId || locator;

    const passengers = Array.isArray(previewPayload?.passengers)
        ? previewPayload.passengers
        : Array.isArray(previewPayload?.bookingBody?.Passengers)
            ? previewPayload.bookingBody.Passengers
            : [];

    const bookingEmail =
        toText(passengers?.[0]?.Email) ||
        toText(passengers?.[0]?.email) ||
        toText(previewPayload?.bookingBody?.Email);

    return {
        ...selectedAirPrice,
        bookingId,
        BookingId: bookingId,
        bookingStatus: "Booked",
        BookingStatus: "Booked",
        reservationId,
        locator,
        PNR: locator || "N/A",
        email: bookingEmail,
        PassengerList: passengers,
        laginfo: selectedAirPrice?.laginfo || [
            {
                DepFrom: firstSegment?.DepFrom || "-",
                ArrTo: firstSegment?.ArrTo || "-",
                DepDate: firstSegment?.DepTime || new Date().toISOString(),
                ArrDate: firstSegment?.ArrTime || firstSegment?.DepTime || new Date().toISOString(),
            },
        ],
    };
}

function dedupeBookings(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach((booking, index) => {
        const key =
            toText(booking?.bookingId) ||
            toText(booking?.BookingId) ||
            toText(booking?.reservationId) ||
            toText(booking?.locator) ||
            toText(booking?.PNR) ||
            `fallback-${index}`;
        map.set(key, booking);
    });
    return Array.from(map.values());
}

function getSessionFallbackAccountData(email) {
    const previewPayload = parseSessionStorageJson("flyjatt:preview_booking");
    const commitWrapper = parseSessionStorageJson("flyjatt:last_book_hold_response");
    const finalCommitPayload =
        commitWrapper && typeof commitWrapper === "object" && commitWrapper.data
            ? commitWrapper.data
            : commitWrapper;

    const localBookings = [];
    const cachedBooking = buildCachedBookingFromSession(previewPayload, finalCommitPayload);
    if (cachedBooking) {
        localBookings.push(cachedBooking);
    }

    return {
        bookings: filterBookingsByEmail(dedupeBookings(localBookings), email),
        transactions: [],
        travelBuddies: [],
    };
}

export default function MyAccountPanel() {
    const location = useLocation();
    const navigate = useNavigate();
    const token = toText(secureLocalStorage.getItem("access_token")) ||
        (typeof window !== "undefined" ? toText(window.localStorage.getItem("access_token")) : "");

    const [activeTab, setActiveTab] = useState("Dashboard");
    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState("");

    const [profile, setProfile] = useState({});
    const [profileDraft, setProfileDraft] = useState({});
    const [editingProfile, setEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const [bookings, setBookings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [travelBuddies, setTravelBuddies] = useState([]);

    const [selectedDateKey, setSelectedDateKey] = useState(moment().format("YYYY-MM-DD"));
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const [raiseCaseForm, setRaiseCaseForm] = useState({
        subject: "",
        message: "",
    });
    const [raiseCaseState, setRaiseCaseState] = useState({
        submitting: false,
        success: "",
        error: "",
    });

    useEffect(() => {
        const tabFromQuery = new URLSearchParams(location.search).get("tab");
        if (!tabFromQuery) return;
        const normalized = tabFromQuery.toLowerCase();
        if (normalized === "bookings") setActiveTab("Booking History");
        if (normalized === "profile") setActiveTab("Personal Information");
        if (normalized === "payments") setActiveTab("Payment History");
    }, [location.search]);

    useEffect(() => {
        let cancelled = false;

        const hydrateFromSessionUser = async () => {
            const response = await fetch("/api/auth/me", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Not authenticated");
            }

            const payload = await response.json().catch(() => ({}));
            const sessionUser = payload?.user || {};
            return {
                firstName: toText(sessionUser?.name).split(" ")[0] || "",
                lastName: toText(sessionUser?.name).split(" ").slice(1).join(" "),
                email: toText(sessionUser?.email),
                phone: "",
                gender: "",
                dob: "",
                nationality: "BD",
                passport: "",
            };
        };

        const fetchJson = async (url, options = {}) => {
            const response = await fetch(url, {
                ...options,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(options.headers || {}),
                },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.message || `Request failed (${response.status})`);
            }

            return response.json().catch(() => ({}));
        };

        const fetchBookingsByStatus = async (status) => {
            // Primary source: local Next.js API route backed by Prisma + session userId
            try {
                const payload = await fetchJson(
                    `/api/user/bookings/${status}?page=1&limit=100`
                );
                return payload?.bookings || [];
            } catch {
                // Backward-compatible fallback: legacy external API
                const payload = await fetchJson(
                    `${config.baseUrl}/user/bookings/${status}?page=1&limit=100`
                );
                return payload?.bookings || [];
            }
        };

        const fetchProfileInfo = async () => {
            try {
                return await fetchJson(`/api/user/profileInfo`);
            } catch {
                return await fetchJson(`${config.baseUrl}/user/profileInfo`);
            }
        };

        const fetchAll = async () => {
            try {
                setLoading(true);
                setErrorText("");

                let sessionProfile = null;
                try {
                    sessionProfile = await hydrateFromSessionUser();
                } catch (error) {
                    sessionProfile = null;
                }

                const sessionEmail = toText(sessionProfile?.email);

                if (!token) {
                    if (!sessionProfile) {
                        throw new Error("Not authenticated");
                    }
                    if (cancelled) return;

                    const fallbackData = getSessionFallbackAccountData(sessionEmail);
                    const [bookingDataByStatus, buddyData] = await Promise.all([
                        Promise.all(
                            STATUS_KEYS.map((status) =>
                                fetchBookingsByStatus(status).catch(() => [])
                            )
                        ),
                        fetchTravelBuddies({ token }).catch(() => ({ travelBuddies: [] })),
                    ]);
                    const dbBookings = dedupeBookings(bookingDataByStatus.flat());
                    const mergedBookings = dedupeBookings([
                        ...dbBookings,
                        ...fallbackData.bookings,
                    ]);
                    const mergedTravelBuddies = Array.isArray(buddyData?.travelBuddies) && buddyData.travelBuddies.length
                        ? buddyData.travelBuddies
                        : fallbackData.travelBuddies;

                    setProfile(sessionProfile);
                    setProfileDraft({
                        fullName: `${toText(sessionProfile?.firstName)} ${toText(sessionProfile?.lastName)}`.trim(),
                        email: toText(sessionProfile?.email),
                        phone: "",
                        gender: "",
                        dob: "",
                        nationality: "BD",
                        passport: "",
                    });
                    setBookings(mergedBookings);
                    setTransactions(fallbackData.transactions);
                    setTravelBuddies(mergedTravelBuddies);
                    return;
                }

                const [profileData, buddyData, transactionData, bookingDataByStatus] =
                    await Promise.all([
                        fetchProfileInfo().catch(() => sessionProfile || {}),
                        fetchTravelBuddies({ token }).catch(() => ({ travelBuddies: [] })),
                        fetchJson(`${config.baseUrl}/user/oneUserAllTransection?page=1&limit=50`).catch(() => ({ transactions: [] })),
                        Promise.all(
                            STATUS_KEYS.map((status) =>
                                fetchBookingsByStatus(status).catch(() => [])
                            )
                        ),
                    ]);

                if (cancelled) return;

                const allBookings = bookingDataByStatus.flat();
                const uniqueBookings = dedupeBookings(allBookings);

                const resolvedEmail = toText(profileData?.email) || sessionEmail;
                const fallbackData = getSessionFallbackAccountData(resolvedEmail);
                // The API already returns bookings based on the authenticated User ID.
                // We previously filtered by email which hid valid bookings for this User ID.
                const mergedBookings = dedupeBookings([
                    ...uniqueBookings,
                    ...fallbackData.bookings,
                ]);

                setProfile(profileData || {});
                setProfileDraft({
                    fullName: `${toText(profileData?.firstName)} ${toText(profileData?.lastName)}`.trim(),
                    email: toText(profileData?.email),
                    phone: toText(profileData?.phone),
                    gender: toText(profileData?.gender),
                    dob: toText(profileData?.dob || profileData?.dateOfBirth),
                    nationality: toText(profileData?.nationality || "BD"),
                    passport: toText(profileData?.passport || profileData?.passportNumber),
                });
                setTravelBuddies(Array.isArray(buddyData?.travelBuddies) ? buddyData.travelBuddies : []);
                setTransactions(Array.isArray(transactionData?.transactions) ? transactionData.transactions : []);
                setBookings(mergedBookings);
            } catch (error) {
                if (!cancelled) {
                    const errorMessage = error instanceof Error ? error.message : "Failed to load account data.";
                    if (errorMessage === "Not authenticated" || errorMessage === "Login required") {
                        secureLocalStorage.removeItem("access_token");
                        navigate("/");
                        return;
                    }
                    setErrorText(errorMessage);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();

        return () => {
            cancelled = true;
        };
    }, [token, navigate]);

    const bookingStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const holdCount = bookings.filter((item) => {
            const status = normalizeStatus(item?.bookingStatus);
            return status.includes("issueinprocess") || status.includes("hold");
        }).length;

        const pastCount = bookings.filter((item) => {
            const depDate = parseDateValue(getDepDate(item));
            return depDate ? depDate < today : false;
        }).length;

        const upcomingCount = bookings.filter((item) => {
            const depDate = parseDateValue(getDepDate(item));
            return depDate ? depDate >= today : false;
        }).length;

        return {
            total: bookings.length,
            hold: holdCount,
            past: pastCount,
            upcoming: upcomingCount,
        };
    }, [bookings]);

    const bookingsByDate = useMemo(() => {
        return bookings.reduce((acc, booking) => {
            const depDate = parseDateValue(getDepDate(booking));
            if (!depDate) return acc;
            const key = formatDateKey(depDate);
            if (!key) return acc;
            if (!acc[key]) acc[key] = [];
            acc[key].push(booking);
            return acc;
        }, {});
    }, [bookings]);

    const selectedDateBookings = useMemo(() => {
        if (!selectedDateKey) return [];
        return bookingsByDate[selectedDateKey] || [];
    }, [bookingsByDate, selectedDateKey]);

    useEffect(() => {
        if (!bookings.length) {
            setSelectedDateKey("");
            return;
        }

        if (selectedDateKey && bookingsByDate[selectedDateKey]?.length) {
            return;
        }

        const firstAvailableDate = Object.keys(bookingsByDate).sort()[0] || "";
        setSelectedDateKey(firstAvailableDate);
    }, [bookings, bookingsByDate, selectedDateKey]);

    const todayKey = formatDateKey(new Date());
    const currentMonthYearLabel = currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
    const monthStartWeekday = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
    ).getDay();
    const daysInMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
    ).getDate();

    const goToPreviousMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);
            const requestBody = {
                fullName: profileDraft.fullName,
                email: profileDraft.email,
                phone: profileDraft.phone,
                dob: profileDraft.dob || null,
                gender: profileDraft.gender,
                nationility: profileDraft.nationality,
                passport: profileDraft.passport,
            };

            let response = await fetch(`/api/user/updateUserProfile`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 404 || response.status === 405) {
                response = await fetch(`${config.baseUrl}/user/updateUserProfile`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(requestBody),
                });
            }

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || "Failed to update profile.");
            }

            setEditingProfile(false);
            setErrorText("");
            const resolvedProfile = payload?.profile || {};
            setProfile((prev) => ({
                ...prev,
                firstName: toText(resolvedProfile.firstName) || toText(profileDraft.fullName).split(" ")[0] || "",
                lastName: toText(resolvedProfile.lastName) || toText(profileDraft.fullName).split(" ").slice(1).join(" "),
                email: toText(resolvedProfile.email) || profileDraft.email,
                phone: toText(resolvedProfile.phone) || profileDraft.phone,
                gender: toText(resolvedProfile.gender) || profileDraft.gender,
                dob: toText(resolvedProfile.dateOfBirth) || profileDraft.dob,
                nationality: toText(resolvedProfile.nationality) || profileDraft.nationality,
                passport: toText(resolvedProfile.passportNumber) || profileDraft.passport,
            }));
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : "Failed to update profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleRaiseCase = async (event) => {
        event.preventDefault();
        setRaiseCaseState({ submitting: true, success: "", error: "" });

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: toText(profile?.firstName || profile?.name, "Traveler"),
                    email: toText(profile?.email),
                    phone: toText(profile?.phone),
                    subject: toText(raiseCaseForm.subject),
                    message: toText(raiseCaseForm.message),
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || "Failed to raise case.");
            }

            setRaiseCaseForm({ subject: "", message: "" });
            setRaiseCaseState({
                submitting: false,
                success: payload?.message || "Case submitted successfully.",
                error: "",
            });
        } catch (error) {
            setRaiseCaseState({
                submitting: false,
                success: "",
                error: error instanceof Error ? error.message : "Failed to raise case.",
            });
        }
    };

    const renderDashboard = () => (
        <Grid container spacing={2.2}>
            {[
                { label: "Total Booking", value: bookingStats.total },
                { label: "Past Booking", value: bookingStats.past },
                { label: "Hold", value: bookingStats.hold },
                { label: "Upcoming Flights", value: bookingStats.upcoming },
            ].map((card) => (
                <Grid item xs={12} sm={6} md={3} key={card.label}>
                    <Paper sx={statCardStyle}>
                        <Typography sx={{ fontSize: 12, color: "#4b6784", fontWeight: 700 }}>{card.label}</Typography>
                        <Typography sx={{ fontSize: 34, fontWeight: 800, color: "#0f4b7d", lineHeight: 1.1 }}>
                            {card.value}
                        </Typography>
                    </Paper>
                </Grid>
            ))}

            <Grid item xs={12}>
                <Paper sx={{ ...panelStyle, p: 2.2, background: "linear-gradient(180deg,#ffffff 0%,#f6fbff 100%)" }}>
                    <Typography sx={sectionTitleStyle}>
                        Travel Calendar
                    </Typography>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1fr" },
                            gap: 2,
                            mt: 1.4,
                        }}
                    >
                        <Box
                            sx={{
                                border: "1px solid #D9E3EE",
                                borderRadius: "10px",
                                p: 1.6,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mb: 1.5,
                                }}
                            >
                                <Button size="small" onClick={goToPreviousMonth}>Prev</Button>
                                <Typography sx={{ fontWeight: 700, color: "var(--primary-button)" }}>
                                    {currentMonthYearLabel}
                                </Typography>
                                <Button size="small" onClick={goToNextMonth}>Next</Button>
                            </Box>

                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    gap: 1,
                                    mb: 1.3,
                                }}
                            >
                                <Typography sx={{ fontSize: 12, color: "#5C6B7A", fontWeight: 700 }}>
                                    Legend:
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: "#5C6B7A" }}>
                                    Number = total flights on that day
                                </Typography>
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        bgcolor: "#f59e0b",
                                    }}
                                />
                                <Typography sx={{ fontSize: 11, color: "#5C6B7A" }}>Today</Typography>
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(7, minmax(0,1fr))",
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                    <Typography
                                        key={day}
                                        sx={{ textAlign: "center", fontSize: 12, color: "#5C6B7A", fontWeight: 700 }}
                                    >
                                        {day}
                                    </Typography>
                                ))}
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(7, minmax(0,1fr))",
                                    gap: 1,
                                }}
                            >
                                {Array.from({ length: monthStartWeekday }).map((_, index) => (
                                    <Box key={`empty-${index}`} sx={{ minHeight: 66 }} />
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, index) => {
                                    const day = index + 1;
                                    const dateKey = formatDateKey(
                                        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                                    );
                                    const dayBookings = bookingsByDate[dateKey] || [];
                                    const isActive = selectedDateKey === dateKey;
                                    const isToday = dateKey === todayKey;
                                    return (
                                        <Button
                                            key={dateKey}
                                            onClick={() => setSelectedDateKey(dateKey)}
                                            sx={{
                                                minHeight: 66,
                                                borderRadius: "10px",
                                                border: isToday ? "1px solid #f59e0b" : "1px solid #D8E1EA",
                                                color: "#0f2f4a",
                                                backgroundColor: isActive
                                                    ? "rgba(19,64,107,0.12)"
                                                    : isToday
                                                        ? "rgba(245,158,11,0.12)"
                                                        : "#fff",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 0.2,
                                                textTransform: "none",
                                                p: 0.4,
                                            }}
                                        >
                                            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{day}</Typography>
                                            <Typography sx={{ fontSize: 10, color: "#b46900", fontWeight: 700 }}>
                                                {isToday ? "Today" : ""}
                                            </Typography>
                                            <Typography sx={{ fontSize: 11, color: "#2b7a4b", fontWeight: 700 }}>
                                                {dayBookings.length > 0 ? dayBookings.length : ""}
                                            </Typography>
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                border: "1px solid #D9E3EE",
                                borderRadius: "10px",
                                p: 1.6,
                                maxHeight: { xs: "none", lg: 560 },
                                overflow: "auto",
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, color: "var(--primary-button)", mb: 1.2 }}>
                                {selectedDateKey
                                    ? `Bookings on ${new Date(selectedDateKey).toLocaleDateString("en-US", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })}`
                                    : "Select a date to view bookings"}
                            </Typography>

                            {selectedDateBookings.length ? (
                                selectedDateBookings.slice(0, 20).map((item) => (
                                    <Box
                                        key={item?.bookingId || item?.id}
                                        sx={{
                                            border: "1px solid rgba(0, 154, 214, 0.2)",
                                            borderRadius: "12px",
                                            p: 1.4,
                                            mb: 1,
                                            backgroundColor: "#fff",
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 600, color: "var(--primary-button)", fontSize: 13 }}>
                                            {toText(item?.bookingId, "Booking")}: {bookingRouteText(item)}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: "#3f4b57" }}>
                                            {formatDateTime(getDepDate(item))}
                                        </Typography>
                                    </Box>
                                ))
                            ) : (
                                <Typography sx={{ color: "#637487", fontSize: 13 }}>
                                    No scheduled flights for selected date.
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );

    const renderPersonalInformation = () => (
        <Paper sx={{ ...panelStyle, p: { xs: 1.6, md: 2.2 } }}>
            <Typography sx={sectionTitleStyle}>Personal Information</Typography>
            <Typography sx={{ fontSize: 13, color: "#4f6d8b", mb: 1.8 }}>
                Keep your traveler profile updated for faster booking and smoother ticketing.
            </Typography>

            <Grid container spacing={1.8}>
                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            borderRadius: "16px",
                            p: 1.8,
                            border: "1px solid rgba(0, 154, 214, 0.24)",
                            background:
                                "linear-gradient(145deg, rgba(13,74,121,0.98) 0%, rgba(0,154,214,0.95) 62%, rgba(24,183,166,0.94) 100%)",
                            color: "#fff",
                            boxShadow: "0 18px 28px rgba(12, 56, 96, 0.22)",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, mb: 1.5 }}>
                            <Avatar
                                sx={{
                                    width: 58,
                                    height: 58,
                                    bgcolor: "rgba(255,255,255,0.16)",
                                    border: "1px solid rgba(255,255,255,0.42)",
                                    fontWeight: 800,
                                }}
                            >
                                {getInitials(profileDraft.fullName)}
                            </Avatar>
                            <Box>
                                <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>
                                    {toText(profileDraft.fullName, "Traveler")}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                                    {toText(profileDraft.email, "No email")}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                            <Chip
                                size="small"
                                label="Verified Profile"
                                sx={{
                                    bgcolor: "rgba(255,255,255,0.18)",
                                    color: "#fff",
                                    fontWeight: 700,
                                }}
                            />
                            <Chip
                                size="small"
                                label={editingProfile ? "Editing" : "Ready"}
                                sx={{
                                    bgcolor: "rgba(255,255,255,0.18)",
                                    color: "#fff",
                                    fontWeight: 700,
                                }}
                            />
                        </Box>

                        <Divider sx={{ borderColor: "rgba(255,255,255,0.22)", my: 1.4 }} />

                        <Grid container spacing={1}>
                            <Grid item xs={6}>
                                <Paper
                                    sx={{
                                        p: 1,
                                        borderRadius: "12px",
                                        bgcolor: "rgba(255,255,255,0.16)",
                                        color: "#fff",
                                    }}
                                >
                                    <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.88)" }}>
                                        Nationality
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                                        {toText(profileDraft.nationality, "-")}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6}>
                                <Paper
                                    sx={{
                                        p: 1,
                                        borderRadius: "12px",
                                        bgcolor: "rgba(255,255,255,0.16)",
                                        color: "#fff",
                                    }}
                                >
                                    <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.88)" }}>
                                        Passport
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                                        {toText(profileDraft.passport, "N/A")}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Paper
                        sx={{
                            borderRadius: "16px",
                            p: { xs: 1.3, md: 1.8 },
                            border: "1px solid rgba(0, 154, 214, 0.18)",
                            background:
                                "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,250,255,1) 100%)",
                        }}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.6 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#0f436f" }}>
                                Profile Form
                            </Typography>
                            {editingProfile ? (
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setEditingProfile(false);
                                            setProfileDraft((prev) => ({ ...prev }));
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button variant="contained" disabled={savingProfile} onClick={handleSaveProfile}>
                                        {savingProfile ? "Saving..." : "Save"}
                                    </Button>
                                </Box>
                            ) : (
                                <Button variant="contained" onClick={() => setEditingProfile(true)}>
                                    Edit Profile
                                </Button>
                            )}
                        </Box>

                        <Grid container spacing={1.2}>
                            {[
                                { key: "fullName", label: "Full Name" },
                                { key: "email", label: "Email" },
                                { key: "phone", label: "Phone" },
                                { key: "gender", label: "Gender" },
                                { key: "dob", label: "Date of Birth" },
                                { key: "nationality", label: "Nationality" },
                                { key: "passport", label: "Passport" },
                            ].map((field) => (
                                <Grid item xs={12} sm={6} key={field.key}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={field.label}
                                        value={toText(profileDraft[field.key])}
                                        onChange={(event) =>
                                            setProfileDraft((prev) => ({
                                                ...prev,
                                                [field.key]: event.target.value,
                                            }))
                                        }
                                        disabled={!editingProfile}
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "12px",
                                            },
                                        }}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Paper>
    );

    const renderBookingHistory = () => (
        <Paper sx={{ ...panelStyle, p: 2.2 }}>
            <Typography sx={sectionTitleStyle}>
                Booking History
            </Typography>
            <TableContainer sx={{ mt: 1.4 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                            <TableCell>Booking ID</TableCell>
                            <TableCell>PNR</TableCell>
                            <TableCell>Route</TableCell>
                            <TableCell>Departure</TableCell>
                            <TableCell align="right">Cost</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bookings.length ? (
                            bookings.map((item) => (
                                <TableRow key={item?.bookingId || item?.id} hover>
                                    <TableCell>{toText(item?.bookingId, "-")}</TableCell>
                                    <TableCell>{bookingPnrText(item)}</TableCell>
                                    <TableCell>{bookingRouteText(item)}</TableCell>
                                    <TableCell>{formatDateTime(getDepDate(item))}</TableCell>
                                    <TableCell align="right">{bookingCostText(item)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={toText(item?.bookingStatus, "-")}
                                            sx={{
                                                backgroundColor: "rgba(0, 154, 214, 0.14)",
                                                color: "#0d4f81",
                                                fontWeight: 700,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => {
                                                const bookingId = toText(
                                                    item?.bookingId ||
                                                    item?.BookingId ||
                                                    item?.reservationId ||
                                                    item?.locator ||
                                                    item?.PNR,
                                                    ""
                                                );
                                                try {
                                                    sessionStorage.setItem(
                                                        "flyjatt:account_booking_details",
                                                        JSON.stringify(item)
                                                    );
                                                } catch {
                                                    // Ignore storage errors and continue with route state.
                                                }
                                                navigate(
                                                    `/my-account/bookingdetails${bookingId ? `?id=${encodeURIComponent(bookingId)}` : ""
                                                    }`,
                                                    { state: { booking: item } }
                                                );
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No booking history found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );

    const renderPaymentHistory = () => (
        <Paper sx={{ ...panelStyle, p: 2.2 }}>
            <Typography sx={sectionTitleStyle}>
                Payment History
            </Typography>
            <TableContainer sx={{ mt: 1.4 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.length ? (
                            transactions.map((item) => (
                                <TableRow key={item?.tranId || item?.id} hover>
                                    <TableCell>{toText(item?.tranId, "-")}</TableCell>
                                    <TableCell>{toText(item?.requestType, "-")}</TableCell>
                                    <TableCell>BDT {Number(item?.offerAmmount || 0)}</TableCell>
                                    <TableCell>{toText(item?.status, "-")}</TableCell>
                                    <TableCell>{formatDateTime(item?.tranDate)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No payment history found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );

    const renderTravelBuddy = () => (
        <Paper sx={{ ...panelStyle, p: 2.2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography sx={sectionTitleStyle}>
                    Travel Buddy
                </Typography>
                <Button variant="contained" onClick={() => navigate("/myprofile/addtravler")}>
                    Add Travel Buddy
                </Button>
            </Box>
            <TableContainer sx={{ mt: 1.4 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f0f8ff" }}>
                            <TableCell>Name</TableCell>
                            <TableCell>Passport</TableCell>
                            <TableCell>Gender</TableCell>
                            <TableCell>Nationality</TableCell>
                            <TableCell>DOB</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {travelBuddies.length ? (
                            travelBuddies.map((item, index) => (
                                <TableRow key={`${item?.passport || "buddy"}-${index}`} hover>
                                    <TableCell>{`${toText(item?.title)} ${toText(item?.firstName)} ${toText(item?.lastName)}`.trim()}</TableCell>
                                    <TableCell>{toText(item?.passport, "-")}</TableCell>
                                    <TableCell>{toText(item?.gender, "-")}</TableCell>
                                    <TableCell>{toText(item?.nationality, "-")}</TableCell>
                                    <TableCell>{formatDateTime(item?.dob)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No travel buddies found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );

    const renderRaiseCase = () => (
        <Paper sx={{ ...panelStyle, p: 2.2 }}>
            <Typography sx={sectionTitleStyle}>
                Raise Case
            </Typography>
            {raiseCaseState.success ? <Alert sx={{ mb: 1.2 }}>{raiseCaseState.success}</Alert> : null}
            {raiseCaseState.error ? <Alert severity="error" sx={{ mb: 1.2 }}>{raiseCaseState.error}</Alert> : null}
            <Box component="form" onSubmit={handleRaiseCase} sx={{ display: "grid", gap: 1.4 }}>
                <TextField
                    label="Subject"
                    value={raiseCaseForm.subject}
                    onChange={(event) =>
                        setRaiseCaseForm((prev) => ({ ...prev, subject: event.target.value }))
                    }
                    required
                />
                <TextField
                    label="Message"
                    multiline
                    minRows={4}
                    value={raiseCaseForm.message}
                    onChange={(event) =>
                        setRaiseCaseForm((prev) => ({ ...prev, message: event.target.value }))
                    }
                    required
                />
                <Box>
                    <Button type="submit" variant="contained" disabled={raiseCaseState.submitting}>
                        {raiseCaseState.submitting ? "Submitting..." : "Submit Case"}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );

    const renderHelpCenter = () => (
        <Paper sx={{ ...panelStyle, p: 2.2 }}>
            <Typography sx={sectionTitleStyle}>
                Help Center
            </Typography>
            <Grid container spacing={1.4}>
                {[
                    {
                        title: "How can I issue ticket after hold?",
                        body: "Open Booking History, click View Details, and proceed through booking actions for held bookings.",
                    },
                    {
                        title: "How to update personal information?",
                        body: "Go to Personal Information tab, click Edit, update fields, and save.",
                    },
                    {
                        title: "Where do I download ticket copy?",
                        body: "In Booking History details dialog, use the Downloads PDF section to download booking copy or e-ticket copy.",
                    },
                    {
                        title: "Need urgent support?",
                        body: "Use Raise Case with booking ID and details. Support team will contact you quickly.",
                    },
                ].map((item) => (
                    <Grid item xs={12} md={6} key={item.title}>
                        <Paper
                            sx={{
                                border: "1px solid rgba(0, 154, 214, 0.2)",
                                borderRadius: "12px",
                                p: 1.4,
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, color: "#15324f", mb: 0.5 }}>{item.title}</Typography>
                            <Typography sx={{ fontSize: 13, color: "#546b82" }}>{item.body}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    "radial-gradient(circle at 12% 0%, rgba(0,154,214,0.2), transparent 36%), radial-gradient(circle at 90% 0%, rgba(20,184,166,0.16), transparent 30%), #f1f7fc",
            }}
        >
            <NavBar />
            <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 1.5, md: 2.5 }, py: { xs: 2, md: 3 } }}>
                <Paper
                    sx={{
                        ...panelStyle,
                        p: { xs: 1.4, md: 2.2 },
                        mb: 2,
                        background:
                            "linear-gradient(130deg, rgba(12,57,96,0.96) 0%, rgba(0,154,214,0.9) 66%, rgba(23,188,164,0.88) 100%)",
                        color: "#fff",
                    }}
                >
                    <Typography sx={{ fontSize: { xs: 23, md: 32 }, fontWeight: 800, color: "#fff" }}>
                        My Account Panel
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.88)", fontSize: 13 }}>
                        Manage bookings, profile, payments, travel buddies, support, and help center from one place.
                    </Typography>
                </Paper>

                {errorText ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {errorText}
                    </Alert>
                ) : null}

                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={3}>
                        <Paper sx={{ ...panelStyle, overflow: "hidden", p: 1 }}>
                            <Box sx={{ display: "flex", flexDirection: { xs: "row", md: "column" }, overflowX: "auto", gap: 0.5 }}>
                                {TABS.map((tabObj) => {
                                    const isActive = activeTab === tabObj.id;
                                    const IconComponent = tabObj.icon;
                                    return (
                                        <Box
                                            key={tabObj.id}
                                            onClick={() => setActiveTab(tabObj.id)}
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                borderRadius: "12px",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.5,
                                                backgroundColor: isActive ? "#eef6fd" : "transparent",
                                                color: isActive ? "#0f4b7d" : "#34516e",
                                                fontWeight: isActive ? 800 : 600,
                                                minWidth: { xs: "auto", md: "auto" },
                                                textAlign: "left",
                                                whiteSpace: "nowrap",
                                                "&:hover": {
                                                    backgroundColor: isActive ? "#eef6fd" : "rgba(0, 0, 0, 0.04)",
                                                }
                                            }}
                                        >
                                            <IconComponent sx={{ fontSize: 20, color: isActive ? "#0f4b7d" : "#607890" }} />
                                            <Typography sx={{ fontSize: 14, fontWeight: "inherit" }}>
                                                {tabObj.label}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={9}>
                        {loading ? (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                {activeTab === "Dashboard" ? renderDashboard() : null}
                                {activeTab === "Personal Information" ? renderPersonalInformation() : null}
                                {activeTab === "Booking History" ? renderBookingHistory() : null}
                                {activeTab === "Payment History" ? renderPaymentHistory() : null}
                                {activeTab === "Travel Buddy" ? renderTravelBuddy() : null}
                                {activeTab === "Raise Case" ? renderRaiseCase() : null}
                                {activeTab === "Help Center" ? renderHelpCenter() : null}
                            </>
                        )}
                    </Grid>
                </Grid>

            </Box>
        </Box>
    );
}
