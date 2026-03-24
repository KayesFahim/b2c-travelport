import React, { useState } from "react";
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
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import {
    BarChart,
    Bar,
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

const reportData = [
    { month: "January", bookings: 240, revenue: 2400, customers: 120, refunds: 80 },
    { month: "February", bookings: 180, revenue: 1398, customers: 95, refunds: 60 },
    { month: "March", bookings: 200, revenue: 9800, customers: 140, refunds: 120 },
    { month: "April", bookings: 220, revenue: 3908, customers: 160, refunds: 90 },
    { month: "May", bookings: 250, revenue: 4800, customers: 180, refunds: 110 },
    { month: "June", bookings: 290, revenue: 3800, customers: 210, refunds: 100 },
];

const topRoutes = [
    { route: "NYC → LAX", bookings: 450, revenue: "$12,500", passengers: 850 },
    { route: "DXB → NYC", bookings: 380, revenue: "$11,200", passengers: 720 },
    { route: "LOS → DXB", bookings: 320, revenue: "$9,600", passengers: 640 },
    { route: "CDG → LAX", bookings: 280, revenue: "$8,400", passengers: 560 },
    { route: "NRT → LAX", bookings: 250, revenue: "$7,500", passengers: 450 },
];

const airlinePerformance = [
    { airline: "United Airlines", bookings: 450, revenue: "$13,500", rating: 4.5 },
    { airline: "Emirates", bookings: 420, revenue: "$12,600", rating: 4.7 },
    { airline: "Qatar Airways", bookings: 380, revenue: "$11,400", rating: 4.8 },
    { airline: "American Airlines", bookings: 350, revenue: "$10,500", rating: 4.3 },
    { airline: "Air France", bookings: 320, revenue: "$9,600", rating: 4.4 },
];

const pieData = [
    { name: "Completed", value: 65 },
    { name: "Pending", value: 15 },
    { name: "Cancelled", value: 12 },
    { name: "Failed", value: 8 },
];

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280"];

export default function Reports() {
    const [reportType, setReportType] = useState("overview");
    const [dateRange, setDateRange] = useState("month");
    const [selectedAirline, setSelectedAirline] = useState("All");

    return (
        <Box>
            {/* Report Header */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
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
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            >
                                <MenuItem value="overview">Overview Report</MenuItem>
                                <MenuItem value="bookings">Bookings Report</MenuItem>
                                <MenuItem value="revenue">Revenue Report</MenuItem>
                                <MenuItem value="aircraft">Aircraft Performance</MenuItem>
                                <MenuItem value="customer">Customer Report</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Date Range"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            >
                                <MenuItem value="week">This Week</MenuItem>
                                <MenuItem value="month">This Month</MenuItem>
                                <MenuItem value="quarter">This Quarter</MenuItem>
                                <MenuItem value="year">This Year</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Airline Filter"
                                value={selectedAirline}
                                onChange={(e) => setSelectedAirline(e.target.value)}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            >
                                <MenuItem value="All">All Airlines</MenuItem>
                                <MenuItem value="United">United Airlines</MenuItem>
                                <MenuItem value="Emirates">Emirates</MenuItem>
                                <MenuItem value="Qatar">Qatar Airways</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    sx={{
                                        borderColor: "#0d9488",
                                        color: "#0d9488",
                                        fontWeight: 600,
                                        borderRadius: "12px",
                                        textTransform: "none",
                                    }}
                                >
                                    Export
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<PrintIcon />}
                                    sx={{
                                        borderColor: "#0d9488",
                                        color: "#0d9488",
                                        fontWeight: 600,
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

            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Bookings</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>1,380</Typography>
                        <Typography sx={{ fontSize: 11, color: "#10b981", mt: 0.5 }}>↑ 12% from last period</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Revenue</Typography>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#0ea5e9" }}>$35,706</Typography>
                        <Typography sx={{ fontSize: 11, color: "#10b981", mt: 0.5 }}>↑ 8% from last period</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Avg Revenue/Booking</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>$25.87</Typography>
                        <Typography sx={{ fontSize: 11, color: "#ef4444", mt: 0.5 }}>↓ 3% from last period</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Conversion Rate</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>3.2%</Typography>
                        <Typography sx={{ fontSize: 11, color: "#10b981", mt: 0.5 }}>↑ 0.5% from last period</Typography>
                    </Paper>
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
                            subheader="Monthly performance"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                                "& .MuiCardHeader-subheader": { fontSize: 12 },
                                borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={reportData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="month" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <ChartTooltip
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
                            title="Booking Status Distribution"
                            sx={{
                                "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                                borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                            }}
                        />
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ mt: 2 }}>
                                {pieData.map((item, idx) => (
                                    <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS[idx] }} />
                                        <Typography sx={{ fontSize: 13, flex: 1 }}>{item.name}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS[idx] }}>{item.value}%</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Top Routes */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    mb: 3,
                }}
            >
                <CardHeader
                    title="Top Routes by Revenue"
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Route</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Bookings</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Revenue</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Passengers</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {topRoutes.map((route, idx) => (
                                <TableRow
                                    key={idx}
                                    sx={{
                                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                                    }}
                                >
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{route.route}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="right">{route.bookings}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#10b981" }} align="right">{route.revenue}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="right">{route.passengers}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Airline Performance */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
            >
                <CardHeader
                    title="Airline Performance"
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Airline</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Bookings</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Revenue</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Rating</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {airlinePerformance.map((airline, idx) => (
                                <TableRow
                                    key={idx}
                                    sx={{
                                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                                    }}
                                >
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{airline.airline}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="center">{airline.bookings}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#10b981" }} align="right">{airline.revenue}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="center">
                                        <Chip
                                            label={`${airline.rating} ⭐`}
                                            size="small"
                                            sx={{
                                                backgroundColor: "#f59e0b20",
                                                color: "#f59e0b",
                                                fontWeight: 600,
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}
