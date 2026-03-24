import React, { useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    TextField,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";

const paymentsData = [
    { id: "PAY001", bookingId: "BK001", customer: "John Doe", method: "Credit Card", amount: "$450", status: "Success", date: "2024-03-24", transactionId: "TXN123456" },
    { id: "PAY002", bookingId: "BK002", customer: "Jane Smith", method: "Debit Card", amount: "$520", status: "Pending", date: "2024-03-24", transactionId: "TXN123457" },
    { id: "PAY003", bookingId: "BK003", customer: "Mike Johnson", method: "UPI", amount: "$380", status: "Success", date: "2024-03-23", transactionId: "TXN123458" },
    { id: "PAY004", bookingId: "BK004", customer: "Sarah Williams", method: "Credit Card", amount: "$600", status: "Failed", date: "2024-03-23", transactionId: "TXN123459" },
    { id: "PAY005", bookingId: "BK005", customer: "Robert Brown", method: "Net Banking", amount: "$480", status: "Success", date: "2024-03-22", transactionId: "TXN123460" },
];

const paymentChartData = [
    { month: "Jan", success: 24, failed: 2, pending: 1 },
    { month: "Feb", success: 18, failed: 3, pending: 2 },
    { month: "Mar", success: 20, failed: 1, pending: 3 },
    { month: "Apr", success: 22, failed: 2, pending: 1 },
    { month: "May", success: 25, failed: 1, pending: 2 },
    { month: "Jun", success: 29, failed: 2, pending: 1 },
];

const getStatusColor = (status) => {
    switch (status) {
        case "Success":
            return "#10b981";
        case "Pending":
            return "#f59e0b";
        case "Failed":
            return "#ef4444";
        default:
            return "#6b7280";
    }
};

export default function PaymentManagement() {
    const [payments, setPayments] = useState(paymentsData);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [openRefundDialog, setOpenRefundDialog] = useState(false);

    const filteredPayments = payments.filter((payment) => {
        const matchesSearch =
            payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === "All" || payment.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const totalRevenue = filteredPayments
        .filter((p) => p.status === "Success")
        .reduce((sum, p) => sum + parseInt(p.amount.replace("$", "")), 0);

    const successCount = filteredPayments.filter((p) => p.status === "Success").length;
    const failedCount = filteredPayments.filter((p) => p.status === "Failed").length;
    const pendingCount = filteredPayments.filter((p) => p.status === "Pending").length;

    const handleViewDetails = (payment) => {
        setSelectedPayment(payment);
        setOpenDetailsDialog(true);
    };

    const handleRefund = (payment) => {
        setSelectedPayment(payment);
        setOpenRefundDialog(true);
    };

    const handleConfirmRefund = () => {
        if (selectedPayment) {
            setPayments(
                payments.map((p) =>
                    p.id === selectedPayment.id ? { ...p, status: "Refunded" } : p
                )
            );
            setOpenRefundDialog(false);
            setSelectedPayment(null);
        }
    };

    return (
        <Box>
            {/* Header Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Transactions</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>
                            {payments.length}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Revenue</Typography>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>
                            ${totalRevenue.toLocaleString()}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Success Rate</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0ea5e9" }}>
                            {((successCount / payments.length) * 100).toFixed(1)}%
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Failed Transactions</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>
                            {failedCount}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Payment Trends Chart */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    mb: 3,
                }}
            >
                <CardHeader
                    title="Payment Status Trends"
                    subheader="Last 6 months"
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                        "& .MuiCardHeader-subheader": { fontSize: 12 },
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                />
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={paymentChartData}>
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
                            <Bar dataKey="success" fill="#10b981" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

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
                                placeholder="Search by Payment ID, Customer, or Transaction ID"
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
                                SelectProps={{
                                    native: true,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            >
                                <option value="All">All Status</option>
                                <option value="Success">Success</option>
                                <option value="Pending">Pending</option>
                                <option value="Failed">Failed</option>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button
                                fullWidth
                                variant="contained"
                                sx={{
                                    background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                                    color: "#fff",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    py: 1.5,
                                }}
                                startIcon={<DownloadIcon />}
                            >
                                Export
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
            >
                <CardHeader
                    title={`Payments (${filteredPayments.length})`}
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Payment ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Booking ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Method</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPayments.map((payment) => (
                                <TableRow
                                    key={payment.id}
                                    sx={{
                                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 600, color: "#0d9488", fontSize: 12 }}>{payment.id}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{payment.bookingId}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{payment.customer}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>
                                        <Chip
                                            label={payment.method}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: 11, fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }} align="right">{payment.amount}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={payment.status}
                                            size="small"
                                            sx={{
                                                backgroundColor: `${getStatusColor(payment.status)}20`,
                                                color: getStatusColor(payment.status),
                                                fontWeight: 600,
                                                fontSize: 11,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{payment.date}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewDetails(payment)}
                                                sx={{ color: "#0d9488" }}
                                            >
                                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                        {payment.status === "Success" && (
                                            <Tooltip title="Process Refund">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRefund(payment)}
                                                    sx={{ color: "#ef4444" }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Details Dialog */}
            <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, backgroundColor: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    Payment Details
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedPayment && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Payment ID</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedPayment.id}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Transaction ID</Typography>
                                <Typography sx={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{selectedPayment.transactionId}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Customer</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedPayment.customer}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Payment Method</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedPayment.method}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Amount</Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: 18, color: "#0d9488" }}>{selectedPayment.amount}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Status</Typography>
                                <Chip
                                    label={selectedPayment.status}
                                    sx={{
                                        backgroundColor: `${getStatusColor(selectedPayment.status)}20`,
                                        color: getStatusColor(selectedPayment.status),
                                        fontWeight: 600,
                                    }}
                                />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Refund Dialog */}
            <Dialog open={openRefundDialog} onClose={() => setOpenRefundDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, backgroundColor: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    Process Refund
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to process a refund for payment <strong>{selectedPayment?.id}</strong> with amount <strong>{selectedPayment?.amount}</strong>?
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>
                        This action will initiate the refund process and the status will be updated to "Refunded".
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <Button onClick={() => setOpenRefundDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        sx={{ background: "#ef4444" }}
                        onClick={handleConfirmRefund}
                    >
                        Process Refund
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
