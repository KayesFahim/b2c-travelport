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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

const bookingsData = [
  { id: "BK001", customer: "John Doe", email: "john@example.com", route: "NYC → LAX", date: "2024-03-24", amount: "$450", status: "Completed", seats: "12A, 12B", airline: "United Airlines" },
  { id: "BK002", customer: "Jane Smith", email: "jane@example.com", route: "DXB → NYC", date: "2024-03-24", amount: "$520", status: "Pending", seats: "5C, 5D", airline: "Emirates" },
  { id: "BK003", customer: "Mike Johnson", email: "mike@example.com", route: "LOS → DXB", date: "2024-03-23", amount: "$380", status: "Completed", seats: "15F", airline: "Qatar Airways" },
  { id: "BK004", customer: "Sarah Williams", email: "sarah@example.com", route: "NYC → DXB", date: "2024-03-23", amount: "$600", status: "Processing", seats: "2A", airline: "American Airlines" },
  { id: "BK005", customer: "Robert Brown", email: "robert@example.com", route: "CDG → LAX", date: "2024-03-22", amount: "$480", status: "Cancelled", seats: "None", airline: "Air France" },
];

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

export default function BookingManagement() {
  const [bookings, setBookings] = useState(bookingsData);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "All" || booking.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setDetailsDialog(true);
  };

  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    setOpenDialog(true);
  };

  const handleDeleteBooking = (id) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      setBookings(bookings.filter((b) => b.id !== id));
    }
  };

  const handleUpdateStatus = (newStatus) => {
    if (selectedBooking) {
      setBookings(
        bookings.map((b) =>
          b.id === selectedBooking.id ? { ...b, status: newStatus } : b
        )
      );
      setOpenDialog(false);
      setSelectedBooking(null);
    }
  };

  return (
    <Box>
      {/* Header with Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
            <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Total Bookings</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0d9488" }}>
              {bookings.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
            <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Completed</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>
              {bookings.filter((b) => b.status === "Completed").length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
            <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Pending</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
              {bookings.filter((b) => b.status === "Pending").length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", borderRadius: "12px", backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
            <Typography sx={{ color: "#6b7280", fontSize: 12, fontWeight: 600, mb: 0.5 }}>Processing</Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#0ea5e9" }}>
              {bookings.filter((b) => b.status === "Processing").length}
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
                <MenuItem value="All">All Status</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Processing">Processing</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
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
                startIcon={<FilterAltIcon />}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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
              {filteredBookings.map((booking) => (
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
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditBooking(booking)}
                        sx={{ color: "#0ea5e9" }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBooking(booking.id)}
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
                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Seats</Typography>
                <Typography sx={{ fontWeight: 600 }}>{selectedBooking.seats}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600, mb: 0.5 }}>Amount</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 18, color: "#0d9488" }}>{selectedBooking.amount}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, backgroundColor: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          Update Booking Status
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ mb: 2, fontWeight: 600 }}>
            Booking: {selectedBooking?.id}
          </Typography>
          <TextField
            select
            fullWidth
            label="New Status"
            defaultValue={selectedBooking?.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
              },
            }}
          >
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Processing">Processing</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" sx={{ background: "#0d9488" }}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
