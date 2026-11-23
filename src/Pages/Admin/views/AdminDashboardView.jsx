import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Typography,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    Divider,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import UpdateIcon from "@mui/icons-material/Update";
import secureLocalStorage from "react-secure-storage";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

const getAuthHeaders = () => {
    secureLocalStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
    return {};
};

const STATUS_COLORS = {
    booked: "#f59e0b",
    processing: "#0ea5e9",
    ticketed: "#10b981",
    completed: "#14b8a6",
    cancelled: "#ef4444",
    failed: "#64748b",
};

function formatSignedPercent(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return "0%";
    const abs = Math.abs(numeric).toFixed(1).replace(/\.0$/, "");
    return `${numeric >= 0 ? "+" : "-"}${abs}%`;
}

function formatMoney(value, currency = "BDT") {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value ?? "-");
    return `${currency} ${amount.toLocaleString()}`;
}

const StatCard = ({ title, value, icon: Icon, color, growth }) => {
    const positive = Number(growth || 0) >= 0;

    return (
        <Card
            sx={{
                borderRadius: "16px",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.07)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                height: "100%",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            }}
        >
            <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                        <Typography sx={{ color: "#64748b", fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
                            {title}
                        </Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color, mt: 1, mb: 1.2 }}>
                            {value}
                        </Typography>
                        <Chip
                            size="small"
                            icon={<TrendingUpIcon sx={{ fontSize: "14px !important" }} />}
                            label={`${formatSignedPercent(growth)} vs previous 30 days`}
                            sx={{
                                backgroundColor: positive ? "#dcfce7" : "#fee2e2",
                                color: positive ? "#15803d" : "#b91c1c",
                                fontWeight: 700,
                                fontSize: 11,
                                ".MuiChip-icon": {
                                    color: positive ? "#15803d" : "#b91c1c",
                                },
                            }}
                        />
                    </Box>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "14px",
                            backgroundColor: `${color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Icon sx={{ color, fontSize: 28 }} />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default function AdminDashboardView() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadDashboard = useCallback(async (isBackgroundRefresh = false) => {
        try {
            if (isBackgroundRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError("");

            const response = await fetch("/api/admin/dashboard-stats", {
                method: "GET",
                credentials: "include",
                headers: {
                    ...getAuthHeaders(),
                },
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || "Unable to load dashboard stats");
            }

            setDashboard(payload);
            setLastUpdated(new Date());
        } catch (fetchError) {
            setDashboard((prev) => prev || null);
            setError(fetchError instanceof Error ? fetchError.message : "Unable to load dashboard stats");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const start = async () => {
            await loadDashboard(false);
        };

        start();

        const interval = setInterval(() => {
            if (active) {
                loadDashboard(true).catch(() => {});
            }
        }, 45000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [loadDashboard]);

    const statusPieData = useMemo(() => {
        const status = dashboard?.statusBreakdown || {};
        return [
            { name: "Booked", key: "booked", value: Number(status.booked || 0) },
            { name: "Processing", key: "processing", value: Number(status.processing || 0) },
            { name: "Ticketed", key: "ticketed", value: Number(status.ticketed || 0) },
            { name: "Completed", key: "completed", value: Number(status.completed || 0) },
            { name: "Cancelled", key: "cancelled", value: Number(status.cancelled || 0) },
            { name: "Failed", key: "failed", value: Number(status.failed || 0) },
        ].filter((row) => row.value > 0);
    }, [dashboard]);

    const statusTotal = useMemo(
        () => statusPieData.reduce((sum, item) => sum + item.value, 0),
        [statusPieData]
    );

    const getStatusColor = (status) => {
        switch (status) {
            case "Completed":
            case "Ticketed":
                return "#10b981";
            case "Booked":
            case "Pending":
                return "#f59e0b";
            case "Processing":
                return "#0ea5e9";
            case "Cancelled":
            case "Failed":
                return "#ef4444";
            default:
                return "#64748b";
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                        Admin Performance Dashboard
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                        Real-time booking, revenue, and customer intelligence
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    {lastUpdated ? (
                        <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                            Updated {lastUpdated.toLocaleTimeString()}
                        </Typography>
                    ) : null}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={refreshing ? <CircularProgress size={14} /> : <UpdateIcon />}
                        onClick={() => loadDashboard(true)}
                        disabled={loading || refreshing}
                        sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Bookings"
                        value={loading ? "-" : String(dashboard?.totalBookings ?? 0)}
                        icon={EventNoteIcon}
                        color="#0d9488"
                        growth={dashboard?.growth?.bookingsPct || 0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Revenue"
                        value={loading ? "-" : formatMoney(dashboard?.totalRevenue, dashboard?.currency)}
                        icon={AttachMoneyIcon}
                        color="#0ea5e9"
                        growth={dashboard?.growth?.revenuePct || 0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Active Customers"
                        value={loading ? "-" : String(dashboard?.totalCustomers ?? 0)}
                        icon={PeopleIcon}
                        color="#f59e0b"
                        growth={dashboard?.growth?.customersPct || 0}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Ticketed + Committed"
                        value={loading ? "-" : String(dashboard?.ticketedBookings ?? 0)}
                        icon={TrendingUpIcon}
                        color="#ef4444"
                        growth={dashboard?.growth?.bookingsPct || 0}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: "16px", border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 8px 20px rgba(15,23,42,0.07)" }}>
                        <CardHeader
                            title="Bookings & Revenue Trend"
                            subheader="Last 6 months"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12, color: "#64748b" },
                                borderBottom: "1px solid rgba(148,163,184,0.15)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={Array.isArray(dashboard?.monthlyStats) ? dashboard.monthlyStats : []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                                    <XAxis dataKey="month" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: "1px solid rgba(148,163,184,0.25)",
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                            {loading ? (
                                <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                                    <CircularProgress size={22} />
                                </Box>
                            ) : null}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: "16px", border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 8px 20px rgba(15,23,42,0.07)", height: "100%" }}>
                        <CardHeader
                            title="Status Distribution"
                            subheader={`Total ${statusTotal} bookings`}
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12, color: "#64748b" },
                                borderBottom: "1px solid rgba(148,163,184,0.15)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={statusPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={56}
                                        outerRadius={84}
                                        paddingAngle={1.5}
                                        dataKey="value"
                                    >
                                        {statusPieData.map((entry) => (
                                            <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#94a3b8"} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>

                            <Box sx={{ mt: 1 }}>
                                {statusPieData.length ? statusPieData.map((item) => {
                                    const percentage = statusTotal ? ((item.value / statusTotal) * 100).toFixed(1) : "0.0";
                                    return (
                                        <Box key={item.key} sx={{ display: "flex", alignItems: "center", mb: 0.8 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: STATUS_COLORS[item.key], mr: 1 }} />
                                            <Typography sx={{ fontSize: 12.5, color: "#334155", flex: 1 }}>{item.name}</Typography>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                                                {item.value} ({percentage}%)
                                            </Typography>
                                        </Box>
                                    );
                                }) : (
                                    <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>No status data available.</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: "16px", border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 8px 20px rgba(15,23,42,0.07)", height: "100%" }}>
                        <CardHeader
                            title="Top Routes"
                            subheader="By revenue"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12, color: "#64748b" },
                                borderBottom: "1px solid rgba(148,163,184,0.15)",
                            }}
                        />
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Route</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Bookings</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Passengers</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Revenue</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(dashboard?.topRoutes || []).map((row) => (
                                        <TableRow key={row.route} hover>
                                            <TableCell sx={{ fontWeight: 600, color: "#0f172a" }}>{row.route}</TableCell>
                                            <TableCell align="right">{row.bookings}</TableCell>
                                            <TableCell align="right">{row.passengers}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: "#0d9488" }}>
                                                {formatMoney(row.revenue, row.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && !(dashboard?.topRoutes || []).length ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#64748b" }}>
                                                No route performance data.
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: "16px", border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 8px 20px rgba(15,23,42,0.07)", height: "100%" }}>
                        <CardHeader
                            title="Top Airlines"
                            subheader="By revenue"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12, color: "#64748b" },
                                borderBottom: "1px solid rgba(148,163,184,0.15)",
                            }}
                        />
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Airline</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Bookings</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Passengers</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Revenue</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(dashboard?.topAirlines || []).map((row) => (
                                        <TableRow key={row.airline} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.airline}</TableCell>
                                            <TableCell align="right">{row.bookings}</TableCell>
                                            <TableCell align="right">{row.passengers}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: "#0d9488" }}>
                                                {formatMoney(row.revenue, row.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && !(dashboard?.topAirlines || []).length ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#64748b" }}>
                                                No airline performance data.
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Grid>
            </Grid>

            <Card sx={{ borderRadius: "16px", border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 8px 20px rgba(15,23,42,0.07)" }}>
                <CardHeader
                    title="Recent Bookings"
                    subheader={
                        loading
                            ? "Loading latest activity"
                            : `Today: ${dashboard?.today?.bookings || 0} bookings • ${formatMoney(dashboard?.today?.revenue || 0, dashboard?.currency)}`
                    }
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                        "& .MuiCardHeader-subheader": { fontSize: 12, color: "#64748b" },
                        borderBottom: "1px solid rgba(148,163,184,0.15)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Booking ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PNR</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Route</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!loading && (dashboard?.recentBookings || []).map((booking) => (
                                <TableRow key={booking.id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: "#0d9488", fontSize: 13 }}>{booking.id}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.customer}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.pnr}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.route}</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: 13 }} align="right">
                                        {formatMoney(booking.amount, booking.currency)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={booking.status}
                                            size="small"
                                            sx={{
                                                backgroundColor: `${getStatusColor(booking.status)}20`,
                                                color: getStatusColor(booking.status),
                                                fontWeight: 700,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.date}</TableCell>
                                </TableRow>
                            ))}
                            {!loading && !(dashboard?.recentBookings || []).length ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#64748b" }}>
                                        No recent bookings.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Divider />
                <Box sx={{ px: 2, py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                        Auto-refresh is enabled every 45 seconds to keep operational stats current.
                    </Typography>
                </Box>
            </Card>
        </Box>
    );
}
