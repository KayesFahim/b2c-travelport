import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const dashboardData = [
  { month: "Jan", bookings: 240, revenue: 2400, customers: 120 },
  { month: "Feb", bookings: 180, revenue: 1398, customers: 95 },
  { month: "Mar", bookings: 200, revenue: 9800, customers: 140 },
  { month: "Apr", bookings: 220, revenue: 3908, customers: 160 },
  { month: "May", bookings: 250, revenue: 4800, customers: 180 },
  { month: "Jun", bookings: 290, revenue: 3800, customers: 210 },
];

const paymentMethodData = [
  { name: "Credit Card", value: 45 },
  { name: "Debit Card", value: 25 },
  { name: "UPI", value: 20 },
  { name: "Others", value: 10 },
];

const COLORS = ["#0d9488", "#0ea5e9", "#f59e0b", "#ef4444"];

const recentBookings = [
  { id: "BK001", customer: "John Doe", route: "NYC ↔ LAX", amount: "$450", status: "Completed", date: "Mar 24" },
  { id: "BK002", customer: "Jane Smith", route: "DXB ↔ NYC", amount: "$520", status: "Pending", date: "Mar 24" },
  { id: "BK003", customer: "Mike Johnson", route: "LOS ↔ DXB", amount: "$380", status: "Completed", date: "Mar 23" },
  { id: "BK004", customer: "Sarah Williams", route: "NYC ↔ DXB", amount: "$600", status: "Processing", date: "Mar 23" },
];

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
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "#10b981";
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
      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value="1,240"
            icon={EventNoteIcon}
            color="#0d9488"
            trend="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value="$45,230"
            icon={AttachMoneyIcon}
            color="#0ea5e9"
            trend="+8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Customers"
            value="892"
            icon={PeopleIcon}
            color="#f59e0b"
            trend="+5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Conversion Rate"
            value="3.8%"
            icon={TrendingUpIcon}
            color="#ef4444"
            trend="+2%"
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
                <LineChart data={dashboardData}>
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
              {recentBookings.map((booking) => (
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
                  <TableCell sx={{ fontWeight: 600, fontSize: 13 }} align="right">{booking.amount}</TableCell>
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
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
