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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Grid,
    Paper,
    IconButton,
    Tooltip,
    Avatar,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import secureLocalStorage from "react-secure-storage";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

const getAuthHeaders = () => {
    const token = String(secureLocalStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || "").trim();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailsDialog, setDetailsDialog] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadCustomers = async () => {
            try {
                setLoading(true);
                setError("");
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("pageSize", "300");
                if (searchTerm.trim()) params.set("search", searchTerm.trim());

                const response = await fetch(`/api/admin/customers?${params.toString()}`, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        ...getAuthHeaders(),
                    },
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload?.message || "Unable to load customers");
                }
                if (cancelled) return;
                setCustomers(Array.isArray(payload?.customers) ? payload.customers : []);
            } catch (fetchError) {
                if (!cancelled) {
                    setCustomers([]);
                    setError(fetchError instanceof Error ? fetchError.message : "Unable to load customers");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadCustomers();
        return () => {
            cancelled = true;
        };
    }, [searchTerm]);

    const summary = useMemo(() => {
        const total = customers.length;
        const active = customers.filter((c) => String(c.status || "").toLowerCase() === "active").length;
        const inactive = total - active;
        const totalBookings = customers.reduce((sum, c) => sum + Number(c.bookings || 0), 0);
        return { total, active, inactive, totalBookings };
    }, [customers]);

    const filteredCustomers = customers;

    const handleViewDetails = (customer) => {
        setSelectedCustomer(customer);
        setDetailsDialog(true);
    };

    const getInitials = (name) => {
        if (!name) return "NA";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    return (
        <Box>
            {/* Header Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Customers</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>
                            {summary.total}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Active</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>
                            {summary.active}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Bookings</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0ea5e9" }}>
                            {summary.totalBookings}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Inactive</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                            {summary.inactive}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Search */}
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
                        <Grid item xs={12} md={9}>
                            <TextField
                                fullWidth
                                placeholder="Search by Name, Email, or Phone"
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
                            <Button
                                fullWidth
                                variant="outlined"
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    py: 1.5,
                                }}
                                startIcon={<SearchIcon />}
                                onClick={() => setSearchTerm("")}
                            >
                                Clear Search
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {error ? (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : null}

            {/* Customers Table */}
            <Card
                sx={{
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
            >
                <CardHeader
                    title={`Customers (${filteredCustomers.length})`}
                    sx={{
                        "& .MuiCardHeader-title": { fontWeight: 700, fontSize: 16 },
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Country</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Bookings</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Total Spent</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Join Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!loading && filteredCustomers.map((customer) => (
                                <TableRow
                                    key={customer.id}
                                    sx={{
                                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                                    }}
                                >
                                    <TableCell sx={{ fontSize: 12 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Avatar sx={{ width: 32, height: 32, background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)", fontSize: 12, fontWeight: 700 }}>
                                                {getInitials(customer.name)}
                                            </Avatar>
                                            <Typography sx={{ fontWeight: 600 }}>{customer.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{customer.email}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{customer.phone}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{customer.country}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="center">{customer.bookings}</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#0d9488" }} align="right">{customer.totalSpent} {customer.currency}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={customer.status}
                                            size="small"
                                            sx={{
                                                backgroundColor: customer.status === "Active" ? "#10b98120" : "#f5a52220",
                                                color: customer.status === "Active" ? "#10b981" : "#f59e0b",
                                                fontWeight: 600,
                                                fontSize: 11,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{customer.joinDate}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewDetails(customer)}
                                                sx={{ color: "#0d9488" }}
                                            >
                                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && !filteredCustomers.length ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 3, color: "#6b7280" }}>
                                        No customers found.
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
                    Customer Details
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedCustomer && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box sx={{ textAlign: "center", mb: 2 }}>
                                <Avatar sx={{ width: 64, height: 64, background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)", fontSize: 24, fontWeight: 700, mx: "auto" }}>
                                    {getInitials(selectedCustomer.name)}
                                </Avatar>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Name</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedCustomer.name}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Email</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedCustomer.email}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Phone</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedCustomer.phone}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Country</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{selectedCustomer.country}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Total Bookings</Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: 18, color: "#0d9488" }}>{selectedCustomer.bookings}</Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Total Spent</Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: 18, color: "#10b981" }}>{selectedCustomer.totalSpent} {selectedCustomer.currency}</Typography>
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
