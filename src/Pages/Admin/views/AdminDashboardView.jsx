import React, { useEffect, useMemo, useState } from "react";
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
    Paper,
    Chip,
    Button,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import secureLocalStorage from "react-secure-storage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

const getAuthHeaders = () => {
    const token = String(secureLocalStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || "").trim();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const COLORS = ["#0d9488", "#0ea5e9", "#f59e0b", "#ef4444"];

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card
        sx={{
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
            border: `1px solid rgba(0, 0, 0, 0.05)`,
            transition: "all 0.3s ease",
            "&:hover": {
                boxShadow: "0 10px 16px rgba(0, 0, 0, 0.1)",
                transform: "translateY(-4px)",
            },
        }}
    >
        <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                    <Typography color="textSecondary" sx={{ fontSize: 12, fontWeight: 500, letterSpacing: 0.5 }}>
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 32,
                            fontWeight: 800,
                            color: color,
                            mt: 1,
                            mb: 1,
                        }}
                    >
                        {value}
                    </Typography>
                    {trend && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <TrendingUpIcon sx={{ fontSize: 14, color: "#10b981" }} />
                            <Typography sx={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                                {trend} from last month
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box
                    sx={{
                        width: 60,
                        height: 60,
                        borderRadius: "12px",
                        background: `${color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Icon sx={{ fontSize: 28, color }} />
                </Box>
            </Box>
        </CardContent>
    </Card>
);

export default function AdminDashboardView() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadDashboard = async () => {
            try {
                setLoading(true);
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
                if (cancelled) return;
                setDashboard(payload);
            } catch (fetchError) {
                if (!cancelled) {
                    setDashboard(null);
                    setError(fetchError instanceof Error ? fetchError.message : "Unable to load dashboard stats");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    const paymentMethodData = useMemo(() => {
        const total = Number(dashboard?.totalBookings || 0);
        const completed = Number(dashboard?.ticketedBookings || 0);
        const pending = Number(dashboard?.pendingBookings || 0);
        const cancelled = Number(dashboard?.cancelledBookings || 0);
        if (!total) {
            return [
                { name: "Completed", value: 0 },
                { name: "Pending", value: 0 },
                { name: "Cancelled", value: 0 },
            ];
        }
        return [
            { name: "Completed", value: Math.round((completed / total) * 100) },
            { name: "Pending", value: Math.round((pending / total) * 100) },
            { name: "Cancelled", value: Math.round((cancelled / total) * 100) },
        ];
    }, [dashboard]);

    const getStatusColor = (status) => {
        switch (status) {
            case "Completed":
                return "#10b981";
            case "Booked":
            case "Pending":
                return "#f59e0b";
            case "Processing":
                return "#0ea5e9";
            case "Cancelled":
                return "#ef4444";
            default:
                return "#6b7280";
        }
    };

    return (
        <Box>
            {error ? (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : null}

            {/* KPI Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Bookings"
                        value={loading ? "-" : String(dashboard?.totalBookings ?? 0)}
                        icon={EventNoteIcon}
                        color="#0d9488"
                        trend={null}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Revenue"
                        value={loading ? "-" : `${dashboard?.currency || "BDT"} ${Number(dashboard?.totalRevenue || 0).toLocaleString()}`}
                        icon={AttachMoneyIcon}
                        color="#0ea5e9"
                        trend={null}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Active Customers"
                        value={loading ? "-" : String(dashboard?.totalCustomers ?? 0)}
                        icon={PeopleIcon}
                        color="#f59e0b"
                        trend={null}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Ticketed Bookings"
                        value={loading ? "-" : String(dashboard?.ticketedBookings ?? 0)}
                        icon={TrendingUpIcon}
                        color="#ef4444"
                        trend={null}
                    />
                </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Card
                        sx={{
                            borderRadius: "16px",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                            border: "1px solid rgba(0, 0, 0, 0.05)",
                        }}
                    >
                        <CardHeader
                            title="Bookings & Revenue Trend"
                            subheader="Last 6 months performance"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12 },
                                borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={Array.isArray(dashboard?.monthlyStats) ? dashboard.monthlyStats : []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="month" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            border: "1px solid rgba(0,0,0,0.1)",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="bookings" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                            {loading ? (
                                <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                                    <CircularProgress size={20} />
                                </Box>
                            ) : null}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card
                        sx={{
                            borderRadius: "16px",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                            border: "1px solid rgba(0, 0, 0, 0.05)",
                            height: "100%",
                        }}
                    >
                        <CardHeader
                            title="Payment Methods"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                                borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ mt: 2 }}>
                                {paymentMethodData.map((method, idx) => (
                                    <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS[idx] }} />
                                        <Typography sx={{ fontSize: 13, flex: 1 }}>{method.name}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS[idx] }}>{method.value}%</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Recent Bookings Table */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
            >
                <CardHeader
                    title="Recent Bookings"
                    action={<Button variant="text" size="small" sx={{ color: "#0d9488", fontWeight: 600 }}>View All</Button>}
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
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!loading && (dashboard?.recentBookings || []).map((booking) => (
                                <TableRow
                                    key={booking.id}
                                    sx={{
                                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 600, color: "#0d9488", fontSize: 13 }}>{booking.id}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.customer}</TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.route}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }} align="right">{booking.amount} {booking.currency}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={booking.status}
                                            size="small"
                                            sx={{
                                                backgroundColor: `${getStatusColor(booking.status)}20`,
                                                color: getStatusColor(booking.status),
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 13 }}>{booking.date}</TableCell>
                                </TableRow>
                            ))}
                            {!loading && !(dashboard?.recentBookings || []).length ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: "#6b7280" }}>
                                        No recent bookings.
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
