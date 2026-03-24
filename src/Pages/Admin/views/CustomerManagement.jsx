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
    Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";

const customersData = [
    { id: 1, name: "John Doe", email: "john@example.com", phone: "+1-555-0101", country: "USA", bookings: 12, spent: "$2,450", joinDate: "2023-08-15", status: "Active" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "+44-555-0102", country: "UK", bookings: 8, spent: "$1,850", joinDate: "2023-09-22", status: "Active" },
    { id: 3, name: "Mike Johnson", email: "mike@example.com", phone: "+1-555-0103", country: "USA", bookings: 15, spent: "$3,200", joinDate: "2023-07-10", status: "Active" },
    { id: 4, name: "Sarah Williams", email: "sarah@example.com", phone: "+1-555-0104", country: "Canada", bookings: 5, spent: "$950", joinDate: "2024-01-12", status: "Active" },
    { id: 5, name: "Robert Brown", email: "robert@example.com", phone: "+61-555-0105", country: "Australia", bookings: 0, spent: "$0", joinDate: "2024-02-28", status: "Inactive" },
];

export default function CustomerManagement() {
    const [customers, setCustomers] = useState(customersData);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailsDialog, setDetailsDialog] = useState(false);
    const [editDialog, setEditDialog] = useState(false);
    const [formData, setFormData] = useState({});

    const filteredCustomers = customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    );

    const handleViewDetails = (customer) => {
        setSelectedCustomer(customer);
        setDetailsDialog(true);
    };

    const handleEditCustomer = (customer) => {
        setSelectedCustomer(customer);
        setFormData(customer);
        setEditDialog(true);
    };

    const handleDeleteCustomer = (id) => {
        if (window.confirm("Are you sure you want to delete this customer?")) {
            setCustomers(customers.filter((c) => c.id !== id));
        }
    };

    const handleSaveCustomer = () => {
        setCustomers(
            customers.map((c) => (c.id === formData.id ? formData : c))
        );
        setEditDialog(false);
        setSelectedCustomer(null);
    };

    const handleAddCustomer = () => {
        setFormData({
            id: customers.length + 1,
            name: "",
            email: "",
            phone: "",
            country: "",
            bookings: 0,
            spent: "$0",
            joinDate: new Date().toISOString().split("T")[0],
            status: "Active",
        });
        setEditDialog(true);
    };

    const getInitials = (name) => {
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
                            {customers.length}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Active</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>
                            {customers.filter((c) => c.status === "Active").length}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Bookings</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0ea5e9" }}>
                            {customers.reduce((sum, c) => sum + c.bookings, 0)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
                        <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Inactive</Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                            {customers.filter((c) => c.status === "Inactive").length}
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
                                variant="contained"
                                sx={{
                                    background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                                    color: "#fff",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    py: 1.5,
                                }}
                                startIcon={<AddIcon />}
                                onClick={handleAddCustomer}
                            >
                                Add Customer
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

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
                            {filteredCustomers.map((customer) => (
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
                                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#0d9488" }} align="right">{customer.spent}</TableCell>
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
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditCustomer(customer)}
                                                sx={{ color: "#0ea5e9" }}
                                            >
                                                <EditIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteCustomer(customer.id)}
                                                sx={{ color: "#ef4444" }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
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
                                <Typography sx={{ fontWeight: 600, fontSize: 18, color: "#10b981" }}>{selectedCustomer.spent}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, backgroundColor: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    {selectedCustomer?.id ? "Edit Customer" : "Add New Customer"}
                </DialogTitle>
                <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Name"
                        fullWidth
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <TextField
                        label="Email"
                        fullWidth
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <TextField
                        label="Phone"
                        fullWidth
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <TextField
                        label="Country"
                        fullWidth
                        value={formData.country || ""}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        sx={{ background: "#0d9488" }}
                        onClick={handleSaveCustomer}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
