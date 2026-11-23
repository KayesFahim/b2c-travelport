import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    TextField,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Grid,
    Paper,
    IconButton,
    Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import secureLocalStorage from "react-secure-storage";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

const getAuthHeaders = () => {
    secureLocalStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
    return {};
};

const STATUS_OPTIONS = [
    { label: "All Status", value: "ALL" },
    { label: "Booked", value: "BOOKED" },
    { label: "Completed", value: "COMMITTED" },
    { label: "Ticketed", value: "TICKETED" },
    { label: "Processing", value: "PREPARED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Failed", value: "FAILED" },
];

const getStatusColor = (status) => {
    const normalized = String(status || "").toLowerCase();
    switch (normalized) {
        case "Completed":
        case "completed":
        case "ticketed":
            return "#10b981";
        case "Pending":
        case "pending":
        case "booked":
            return "#f59e0b";
        case "Processing":
        case "processing":
            return "#0ea5e9";
        case "Cancelled":
        case "cancelled":
            return "#ef4444";
        case "failed":
            return "#ef4444";
        default:
            return "#6b7280";
    }
};

export default function BookingManagement() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [detailsDialog, setDetailsDialog] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadBookings = async () => {
            try {
                setLoading(true);
                setError("");
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("pageSize", "200");
                if (searchTerm.trim()) params.set("search", searchTerm.trim());
                if (filterStatus !== "ALL") params.set("status", filterStatus);

                const response = await fetch(`/api/admin/bookings?${params.toString()}`, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        ...getAuthHeaders(),
                    },
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload?.message || "Unable to load bookings");
                }
                if (cancelled) return;
                setBookings(Array.isArray(payload?.bookings) ? payload.bookings : []);
            } catch (fetchError) {
                if (!cancelled) {
                    setBookings([]);
                    setError(fetchError instanceof Error ? fetchError.message : "Unable to load bookings");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadBookings();
        return () => {
            cancelled = true;
        };
    }, [searchTerm, filterStatus]);

    const summary = useMemo(() => {
        const total = bookings.length;
        const completed = bookings.filter((b) => ["completed", "ticketed"].includes(String(b.status || "").toLowerCase())).length;
        const pending = bookings.filter((b) => String(b.status || "").toLowerCase() === "booked").length;
        const processing = bookings.filter((b) => String(b.status || "").toLowerCase() === "processing").length;
        return { total, completed, pending, processing };
    }, [bookings]);

    const filteredBookings = bookings;

    const handleViewDetails = (booking) => {
        setSelectedBooking(booking);
        setDetailsDialog(true);
    };

    return (
        <Box>
            {/* Header with Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Bookings</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>
                            {summary.total}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Completed</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>
                            {summary.completed}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Pending</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                            {summary.pending}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Processing</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0ea5e9" }}>
                            {summary.processing}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Search & Filter */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    mb: 3,
                }}
            >
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Search by Booking ID, Customer Name, or Email"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ mr: 1, color: "#9ca3af" }} />,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => {
                                    setSearchTerm("");
                                    setFilterStatus("ALL");
                                }}
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    py: 1.5,
                                }}
                                startIcon={<SearchIcon />}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {error ? (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : null}

            {/* Bookings Table */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
            >
                <CardHeader
                    title={`Bookings (${filteredBookings.length})`}
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Booking ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Route</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Airline</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!loading && filteredBookings.map((booking) => (
                                <TableRow
                                    key={booking.id}
                                    sx={{
                                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 600, color: "#0d9488", fontSize: 12 }}>{booking.id}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>
                                        <Typography sx={{ fontWeight: 500 }}>{booking.customer}</Typography>
                                        <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>{booking.email}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{booking.route}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{booking.airline}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }} align="right">{booking.amount}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={booking.status}
                                            size="small"
                                            sx={{
                                                backgroundColor: `${getStatusColor(booking.status)}20`,
                                                color: getStatusColor(booking.status),
                                                fontWeight: 600,
                                                fontSize: 11,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{booking.date}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewDetails(booking)}
                                                sx={{ color: "#0d9488" }}
                                            >
                                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && !filteredBookings.length ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 3, color: "#6b7280" }}>
                                        No bookings found.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Details Dialog */}
            <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, backgroundColor: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    Booking Details - {selectedBooking?.id}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedBooking && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Customer</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedBooking.customer}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Email</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedBooking.email}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Route</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedBooking.route}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Airline</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedBooking.airline}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>PNR</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedBooking.pnr || "-"}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Amount</Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: 18, color: "#0d9488" }}>{selectedBooking.amount} {selectedBooking.currency}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
