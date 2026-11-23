import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Paper,
    Button,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert,
    CircularProgress,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import UpdateIcon from "@mui/icons-material/Update";
import secureLocalStorage from "react-secure-storage";
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ChartTooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

const getAuthHeaders = () => {
    secureLocalStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
    return {};
};

const STATUS_COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#ef4444", "#64748b"];

function formatMoney(value, currency = "BDT") {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return `${currency} 0`;
    return `${currency} ${amount.toLocaleString()}`;
}

function toCsv(rows) {
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const value = String(cell ?? "");
                    const escaped = value.replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(",")
        )
        .join("\n");
}

function exportCsv(filename, rows) {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function Reports() {
    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [reportType, setReportType] = useState("overview");
    const [dateRange, setDateRange] = useState("quarter");
    const [selectedAirline, setSelectedAirline] = useState("All");

    const loadReports = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError("");

            const [dashboardRes, analyticsRes] = await Promise.all([
                fetch("/api/admin/dashboard-stats", {
                    method: "GET",
                    credentials: "include",
                    headers: { ...getAuthHeaders() },
                }),
                fetch("/api/admin/search-analytics?limit=50", {
                    method: "GET",
                    credentials: "include",
                    headers: { ...getAuthHeaders() },
                }),
            ]);

            const dashboardPayload = await dashboardRes.json().catch(() => ({}));
            const analyticsPayload = await analyticsRes.json().catch(() => ({}));

            if (!dashboardRes.ok) {
                throw new Error(dashboardPayload?.message || "Unable to load report data");
            }
            if (!analyticsRes.ok) {
                throw new Error(analyticsPayload?.message || "Unable to load analytics data");
            }

            setDashboard(dashboardPayload);
            setAnalytics(analyticsPayload);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : "Unable to load reports");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadReports(false).catch(() => {});
    }, [loadReports]);

    const monthlyData = useMemo(() => {
        const rows = Array.isArray(dashboard?.monthlyStats) ? dashboard.monthlyStats : [];
        if (dateRange === "month") return rows.slice(-1);
        if (dateRange === "week") return rows.slice(-2);
        if (dateRange === "quarter") return rows.slice(-3);
        return rows;
    }, [dashboard, dateRange]);

    const statusPieData = useMemo(() => {
        const status = dashboard?.statusBreakdown || {};
        const rows = [
            { name: "Ticketed", value: Number(status.ticketed || 0) },
            { name: "Completed", value: Number(status.completed || 0) },
            { name: "Booked", value: Number(status.booked || 0) },
            { name: "Processing", value: Number(status.processing || 0) },
            { name: "Cancelled + Failed", value: Number(status.cancelled || 0) + Number(status.failed || 0) },
        ];
        return rows.filter((item) => item.value > 0);
    }, [dashboard]);

    const topRoutes = useMemo(() => {
        return Array.isArray(dashboard?.topRoutes) ? dashboard.topRoutes : [];
    }, [dashboard]);

    const topAirlines = useMemo(() => {
        const rows = Array.isArray(dashboard?.topAirlines) ? dashboard.topAirlines : [];
        if (selectedAirline === "All") return rows;
        return rows.filter((row) => String(row.airline || "").toLowerCase() === selectedAirline.toLowerCase());
    }, [dashboard, selectedAirline]);

    const airlineOptions = useMemo(() => {
        const set = new Set(["All"]);
        (dashboard?.topAirlines || []).forEach((row) => {
            if (row?.airline) set.add(row.airline);
        });
        return Array.from(set);
    }, [dashboard]);

    const conversionRate = useMemo(() => {
        const successfulSearches = Number(analytics?.stats?.searches?.successful || 0);
        const successfulBookings = Number(analytics?.stats?.bookings?.successful || 0);
        if (!successfulSearches) return 0;
        return Number(((successfulBookings / successfulSearches) * 100).toFixed(2));
    }, [analytics]);

    const avgRevenuePerBooking = useMemo(() => {
        const totalRevenue = Number(dashboard?.totalRevenue || 0);
        const totalBookings = Math.max(1, Number(dashboard?.ticketedBookings || 0));
        return Math.round(totalRevenue / totalBookings);
    }, [dashboard]);

    const handleExport = () => {
        const rows = [
            ["Section", "Name", "Bookings", "Passengers", "Revenue", "Currency"],
            ...topRoutes.map((row) => ["Top Route", row.route, row.bookings, row.passengers, row.revenue, row.currency]),
            ...topAirlines.map((row) => ["Top Airline", row.airline, row.bookings, row.passengers, row.revenue, row.currency]),
        ];
        exportCsv(`flyjatt-admin-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    };

    return (
        <Box>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 8px 20px rgba(15,23,42,0.07)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    mb: 3,
                }}
            >
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Report Type"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                            >
                                <MenuItem value="overview">Overview Report</MenuItem>
                                <MenuItem value="bookings">Bookings Report</MenuItem>
                                <MenuItem value="revenue">Revenue Report</MenuItem>
                                <MenuItem value="operations">Operations Report</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Date Range"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                            >
                                <MenuItem value="week">Last 8 Weeks</MenuItem>
                                <MenuItem value="month">Last Month</MenuItem>
                                <MenuItem value="quarter">Last Quarter</MenuItem>
                                <MenuItem value="year">Last 6 Months</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Airline Filter"
                                value={selectedAirline}
                                onChange={(e) => setSelectedAirline(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                            >
                                {airlineOptions.map((airline) => (
                                    <MenuItem key={airline} value={airline}>{airline}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={handleExport}
                                    sx={{
                                        borderColor: "#0d9488",
                                        color: "#0d9488",
                                        fontWeight: 700,
                                        borderRadius: "12px",
                                        textTransform: "none",
                                    }}
                                >
                                    Export
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={refreshing ? <CircularProgress size={14} /> : <UpdateIcon />}
                                    onClick={() => loadReports(true)}
                                    disabled={loading || refreshing}
                                    sx={{
                                        borderColor: "#0ea5e9",
                                        color: "#0ea5e9",
                                        fontWeight: 700,
                                        borderRadius: "12px",
                                        textTransform: "none",
                                    }}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<PrintIcon />}
                                    onClick={() => window.print()}
                                    sx={{
                                        borderColor: "#64748b",
                                        color: "#64748b",
                                        fontWeight: 700,
                                        borderRadius: "12px",
                                        textTransform: "none",
                                    }}
                                >
                                    Print
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)" }}>
                        <Typography sx={{ color: "#64748b", fontSize: 12, fontWeight: 700, mb: 0.5 }}>Total Bookings</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>
                            {loading ? "-" : Number(dashboard?.totalBookings || 0).toLocaleString()}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)" }}>
                        <Typography sx={{ color: "#64748b", fontSize: 12, fontWeight: 700, mb: 0.5 }}>Total Revenue</Typography>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#0ea5e9" }}>
                            {loading ? "-" : formatMoney(dashboard?.totalRevenue, dashboard?.currency)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)" }}>
                        <Typography sx={{ color: "#64748b", fontSize: 12, fontWeight: 700, mb: 0.5 }}>Avg Revenue/Booking</Typography>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>
                            {loading ? "-" : formatMoney(avgRevenuePerBooking, dashboard?.currency)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.2)" }}>
                        <Typography sx={{ color: "#64748b", fontSize: 12, fontWeight: 700, mb: 0.5 }}>Search to Booking Conversion</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>
                            {loading ? "-" : `${conversionRate}%`}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Card
                        sx={{
                            borderRadius: "16px",
                            boxShadow: "0 8px 20px rgba(15,23,42,0.07)",
                            border: "1px solid rgba(148,163,184,0.2)",
                        }}
                    >
                        <CardHeader
                            title={reportType === "revenue" ? "Revenue Trend" : "Bookings & Revenue Trend"}
                            subheader="Live data from booking records"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12 },
                                borderBottom: "1px solid rgba(148,163,184,0.15)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                                    <XAxis dataKey="month" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <ChartTooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            border: "1px solid rgba(148,163,184,0.2)",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Legend />
                                    {reportType !== "revenue" ? (
                                        <Line type="monotone" dataKey="bookings" stroke="#0d9488" strokeWidth={2.4} dot={{ r: 4 }} />
                                    ) : null}
                                    <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.4} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card
                        sx={{
                            borderRadius: "16px",
                            boxShadow: "0 8px 20px rgba(15,23,42,0.07)",
                            border: "1px solid rgba(148,163,184,0.2)",
                            height: "100%",
                        }}
                    >
                        <CardHeader
                            title="Booking Status Distribution"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                                borderBottom: "1px solid rgba(148,163,184,0.15)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                        {statusPieData.map((entry, index) => (
                                            <Cell key={`${entry.name}-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ mt: 2 }}>
                                {statusPieData.map((item, idx) => (
                                    <Box key={item.name} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                                        <Typography sx={{ fontSize: 13, flex: 1 }}>{item.name}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 8px 20px rgba(15,23,42,0.07)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    mb: 3,
                }}
            >
                <CardHeader
                    title="Top Routes by Revenue"
                    subheader="From live booking data"
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                        borderBottom: "1px solid rgba(148,163,184,0.15)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Route</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Bookings</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Passengers</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Revenue</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {topRoutes.map((route) => (
                                <TableRow key={route.route} hover>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{route.route}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="right">{route.bookings}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="right">{route.passengers}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: "#10b981" }} align="right">
                                        {formatMoney(route.revenue, route.currency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && !topRoutes.length ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#6b7280" }}>
                                        No route performance data available.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 8px 20px rgba(15,23,42,0.07)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    mb: 3,
                }}
            >
                <CardHeader
                    title="Airline Performance"
                    subheader={selectedAirline === "All" ? "All major airlines" : `Filtered by ${selectedAirline}`}
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                        borderBottom: "1px solid rgba(148,163,184,0.15)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Airline</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Bookings</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Passengers</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Revenue</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Performance</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {topAirlines.map((airline) => (
                                <TableRow key={airline.airline} hover>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{airline.airline}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="center">{airline.bookings}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="center">{airline.passengers}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: "#10b981" }} align="right">
                                        {formatMoney(airline.revenue, airline.currency)}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="center">
                                        <Chip
                                            label={airline.bookings > 20 ? "High" : airline.bookings > 5 ? "Medium" : "Low"}
                                            size="small"
                                            sx={{
                                                backgroundColor: airline.bookings > 20 ? "#dcfce7" : airline.bookings > 5 ? "#fff7ed" : "#f1f5f9",
                                                color: airline.bookings > 20 ? "#15803d" : airline.bookings > 5 ? "#c2410c" : "#475569",
                                                fontWeight: 700,
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && !topAirlines.length ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#6b7280" }}>
                                        No airline performance data available.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 8px 20px rgba(15,23,42,0.07)",
                    border: "1px solid rgba(148,163,184,0.2)",
                }}
            >
                <CardHeader
                    title="Latest Booking Failures"
                    subheader="From operational booking logs"
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 800, fontSize: 16 },
                        borderBottom: "1px solid rgba(148,163,184,0.15)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Timestamp</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Stage</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Message</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Reservation ID</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(analytics?.latestBookingFailures || []).slice(0, 8).map((log, idx) => (
                                <TableRow key={`${log.timestamp}-${idx}`} hover>
                                    <TableCell sx={{ fontSize: 12 }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{log.stage || "-"}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>
                                        <Chip
                                            label={log.status || "N/A"}
                                            size="small"
                                            sx={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{log.message || log.details || "-"}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{log.reservationId || "-"}</TableCell>
                                </TableRow>
                            ))}
                            {!loading && !(analytics?.latestBookingFailures || []).length ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#6b7280" }}>
                                        No booking failure logs.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={22} />
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}
