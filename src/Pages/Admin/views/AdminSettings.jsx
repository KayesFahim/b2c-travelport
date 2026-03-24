import React, { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Typography,
    Alert,
    Stack,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    MenuItem,
    CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TuneIcon from "@mui/icons-material/Tune";
import GroupIcon from "@mui/icons-material/Group";
import secureLocalStorage from "react-secure-storage";

const sectionStyle = {
    borderRadius: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    mb: 3,
};

export default function AdminSettings() {
    const getAuthHeaders = () => {
        const token = String(
            secureLocalStorage.getItem("access_token") ||
            secureLocalStorage.getItem("flyjatt_booking_auth_token") ||
            ""
        ).trim();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const [saved, setSaved] = useState(false);
    const [teamUsers, setTeamUsers] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamAlert, setTeamAlert] = useState({ type: "", message: "" });
    const [currentUser, setCurrentUser] = useState(null);
    const [newTeamUser, setNewTeamUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "STAFF",
    });
    const [creatingUser, setCreatingUser] = useState(false);
    const [savingSearchControl, setSavingSearchControl] = useState(false);
    const [searchControlState, setSearchControlState] = useState({
        success: "",
        error: "",
    });
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState("");
    const [analytics, setAnalytics] = useState({
        stats: {
            searches: { total: 0, successful: 0, failed: 0, blocked: 0 },
            bookings: { attempts: 0, failed: 0, successful: 0 },
        },
        latestSearchLogs: [],
        latestBookingFailures: [],
    });

    const [searchControl, setSearchControl] = useState({
        anonSearchLimit: "10",
        loggedSearchesPerBooking: "50",
        minimumLoggedSearchLimit: "50",
    });

    const [general, setGeneral] = useState({
        siteName: "FlyJatt",
        supportEmail: "support@flyjatt.com",
        supportPhone: "+880 17XX-XXXXXX",
        currency: "BDT",
        timezone: "Asia/Dhaka",
    });

    const [notifications, setNotifications] = useState({
        emailOnBooking: true,
        emailOnCancellation: true,
        smsOnBooking: false,
        adminDailyReport: true,
    });

    const [security, setSecurity] = useState({
        sessionTimeout: "60",
        maxLoginAttempts: "5",
    });

    const handleSave = () => {
        // In a real implementation, POST to /api/cms/settings with section="admin"
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const loadTeamUsers = async () => {
        try {
            setTeamLoading(true);
            const [meRes, usersRes] = await Promise.all([
                fetch("/api/auth/myaccount", {
                    credentials: "include",
                    headers: {
                        ...getAuthHeaders(),
                    },
                }),
                fetch("/api/admin/users", {
                    credentials: "include",
                    headers: {
                        ...getAuthHeaders(),
                    },
                }),
            ]);

            const meData = await meRes.json().catch(() => ({}));
            const usersData = await usersRes.json().catch(() => ({}));

            if (meRes.ok && meData?.user) {
                setCurrentUser(meData.user);
            }

            if (usersRes.ok) {
                setTeamUsers(Array.isArray(usersData?.users) ? usersData.users : []);
            } else {
                setTeamUsers([]);
            }
        } catch {
            setTeamUsers([]);
        } finally {
            setTeamLoading(false);
        }
    };

    const loadSearchControlSettings = async () => {
        try {
            const response = await fetch("/api/cms/settings?section=search_control", {
                credentials: "include",
                headers: {
                    ...getAuthHeaders(),
                },
            });
            if (!response.ok) return;
            const payload = await response.json().catch(() => ({}));
            setSearchControl((prev) => ({
                ...prev,
                anonSearchLimit: String(payload?.anonSearchLimit || prev.anonSearchLimit),
                loggedSearchesPerBooking: String(
                    payload?.loggedSearchesPerBooking || prev.loggedSearchesPerBooking
                ),
                minimumLoggedSearchLimit: String(
                    payload?.minimumLoggedSearchLimit || prev.minimumLoggedSearchLimit
                ),
            }));
        } catch {
            // Keep defaults when settings are unavailable.
        }
    };

    const loadAnalytics = async () => {
        try {
            setAnalyticsLoading(true);
            setAnalyticsError("");
            const response = await fetch("/api/admin/search-analytics?limit=30", {
                credentials: "include",
                headers: {
                    ...getAuthHeaders(),
                },
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || "Unable to load analytics");
            }
            setAnalytics({
                stats: {
                    searches: {
                        total: Number(payload?.stats?.searches?.total || 0),
                        successful: Number(payload?.stats?.searches?.successful || 0),
                        failed: Number(payload?.stats?.searches?.failed || 0),
                        blocked: Number(payload?.stats?.searches?.blocked || 0),
                    },
                    bookings: {
                        attempts: Number(payload?.stats?.bookings?.attempts || 0),
                        failed: Number(payload?.stats?.bookings?.failed || 0),
                        successful: Number(payload?.stats?.bookings?.successful || 0),
                    },
                },
                latestSearchLogs: Array.isArray(payload?.latestSearchLogs) ? payload.latestSearchLogs : [],
                latestBookingFailures: Array.isArray(payload?.latestBookingFailures)
                    ? payload.latestBookingFailures
                    : [],
            });
        } catch (error) {
            setAnalyticsError(error instanceof Error ? error.message : "Unable to load analytics");
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleSaveSearchControl = async () => {
        try {
            setSavingSearchControl(true);
            setSearchControlState({ success: "", error: "" });

            const payload = {
                section: "search_control",
                settings: {
                    anonSearchLimit: String(searchControl.anonSearchLimit || "10"),
                    loggedSearchesPerBooking: String(searchControl.loggedSearchesPerBooking || "50"),
                    minimumLoggedSearchLimit: String(searchControl.minimumLoggedSearchLimit || "50"),
                },
            };

            const response = await fetch("/api/cms/settings", {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.message || "Unable to save search control settings");
            }

            setSearchControlState({ success: "Search control settings saved.", error: "" });
        } catch (error) {
            setSearchControlState({
                success: "",
                error: error instanceof Error ? error.message : "Unable to save search control settings",
            });
        } finally {
            setSavingSearchControl(false);
        }
    };

    useEffect(() => {
        loadTeamUsers();
        loadSearchControlSettings();
        loadAnalytics();
    }, []);

    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

    const handleCreateTeamUser = async () => {
        if (!newTeamUser.email.trim() || !newTeamUser.password.trim()) {
            setTeamAlert({ type: "error", message: "Email and password are required." });
            return;
        }

        try {
            setCreatingUser(true);
            setTeamAlert({ type: "", message: "" });
            const response = await fetch("/api/admin/users", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(newTeamUser),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || "Failed to create user");
            }
            setTeamAlert({ type: "success", message: "Team user created successfully." });
            setNewTeamUser({ name: "", email: "", password: "", role: "STAFF" });
            loadTeamUsers();
        } catch (error) {
            setTeamAlert({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to create user",
            });
        } finally {
            setCreatingUser(false);
        }
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                <TuneIcon sx={{ color: "#6b7280", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700} color="#1e293b">
                    Admin Settings
                </Typography>
                <Chip label="General" size="small" sx={{ bgcolor: "rgba(107,114,128,0.12)", color: "#6b7280", fontWeight: 600 }} />
            </Stack>

            {saved && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: "12px" }}>
                    Settings saved successfully.
                </Alert>
            )}

            {/* General Settings */}
            <Card sx={sectionStyle} elevation={0}>
                <CardHeader
                    title={
                        <Typography fontWeight={700} fontSize={15} color="#1e293b">
                            General Settings
                        </Typography>
                    }
                    sx={{ pb: 0, pt: 2.5, px: 3 }}
                />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ px: 3, pt: 2.5 }}>
                    <Grid container spacing={2.5}>
                        {[
                            { label: "Site Name", field: "siteName" },
                            { label: "Support Email", field: "supportEmail" },
                            { label: "Support Phone", field: "supportPhone" },
                            { label: "Default Currency", field: "currency" },
                            { label: "Timezone", field: "timezone" },
                        ].map(({ label, field }) => (
                            <Grid item xs={12} sm={6} key={field}>
                                <TextField
                                    fullWidth
                                    label={label}
                                    value={general[field]}
                                    onChange={(e) => setGeneral((p) => ({ ...p, [field]: e.target.value }))}
                                    size="small"
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card sx={sectionStyle} elevation={0}>
                <CardHeader
                    avatar={<NotificationsIcon sx={{ color: "#f59e0b" }} />}
                    title={
                        <Typography fontWeight={700} fontSize={15} color="#1e293b">
                            Notification Settings
                        </Typography>
                    }
                    sx={{ pb: 0, pt: 2.5, px: 3 }}
                />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ px: 3, pt: 2 }}>
                    <Grid container spacing={1}>
                        {[
                            { label: "Email on new booking", field: "emailOnBooking" },
                            { label: "Email on cancellation", field: "emailOnCancellation" },
                            { label: "SMS on new booking", field: "smsOnBooking" },
                            { label: "Daily admin report email", field: "adminDailyReport" },
                        ].map(({ label, field }) => (
                            <Grid item xs={12} sm={6} key={field}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications[field]}
                                            onChange={(e) =>
                                                setNotifications((p) => ({ ...p, [field]: e.target.checked }))
                                            }
                                            color="primary"
                                        />
                                    }
                                    label={<Typography fontSize={14}>{label}</Typography>}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* Security Settings */}
            <Card sx={sectionStyle} elevation={0}>
                <CardHeader
                    avatar={<SecurityIcon sx={{ color: "#ef4444" }} />}
                    title={
                        <Typography fontWeight={700} fontSize={15} color="#1e293b">
                            Security Settings
                        </Typography>
                    }
                    sx={{ pb: 0, pt: 2.5, px: 3 }}
                />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ px: 3, pt: 2.5 }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Session Timeout (minutes)"
                                type="number"
                                value={security.sessionTimeout}
                                onChange={(e) => setSecurity((p) => ({ ...p, sessionTimeout: e.target.value }))}
                                size="small"
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Max Login Attempts"
                                type="number"
                                value={security.maxLoginAttempts}
                                onChange={(e) => setSecurity((p) => ({ ...p, maxLoginAttempts: e.target.value }))}
                                size="small"
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Team Access / Roles */}
            <Card sx={sectionStyle} elevation={0}>
                <CardHeader
                    avatar={<GroupIcon sx={{ color: "#0ea5e9" }} />}
                    title={
                        <Typography fontWeight={700} fontSize={15} color="#1e293b">
                            Team Access & Roles
                        </Typography>
                    }
                    sx={{ pb: 0, pt: 2.5, px: 3 }}
                />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ px: 3, pt: 2.5 }}>
                    {teamAlert.message ? (
                        <Alert severity={teamAlert.type || "info"} sx={{ mb: 2, borderRadius: "10px" }}>
                            {teamAlert.message}
                        </Alert>
                    ) : null}

                    <Typography sx={{ color: "#64748b", fontSize: 13, mb: 2 }}>
                        Only one Super Admin is allowed and protected from edit/delete. Super Admin can create Admin, Manager, Staff, Accountant, and Reservation users.
                    </Typography>

                    {isSuperAdmin ? (
                        <Grid container spacing={1.4} sx={{ mb: 2.2 }}>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Name"
                                    value={newTeamUser.name}
                                    onChange={(e) => setNewTeamUser((p) => ({ ...p, name: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Email"
                                    value={newTeamUser.email}
                                    onChange={(e) => setNewTeamUser((p) => ({ ...p, email: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Password"
                                    type="password"
                                    value={newTeamUser.password}
                                    onChange={(e) => setNewTeamUser((p) => ({ ...p, password: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <TextField
                                    fullWidth
                                    select
                                    size="small"
                                    label="Role"
                                    value={newTeamUser.role}
                                    onChange={(e) => setNewTeamUser((p) => ({ ...p, role: e.target.value }))}
                                >
                                    <MenuItem value="ADMIN">Admin</MenuItem>
                                    <MenuItem value="MANAGER">Manager</MenuItem>
                                    <MenuItem value="STAFF">Staff</MenuItem>
                                    <MenuItem value="ACCOUNTANT">Accountant</MenuItem>
                                    <MenuItem value="RESERVATION">Reservation</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={handleCreateTeamUser}
                                    disabled={creatingUser}
                                    sx={{ height: 40, textTransform: "none", fontWeight: 700 }}
                                >
                                    {creatingUser ? "Adding..." : "Add User"}
                                </Button>
                            </Grid>
                        </Grid>
                    ) : (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: "10px" }}>
                            You can view team access, but only Super Admin can create/update/delete team users.
                        </Alert>
                    )}

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {teamLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">Loading team users...</TableCell>
                                    </TableRow>
                                ) : !teamUsers.length ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">No admin users found.</TableCell>
                                    </TableRow>
                                ) : (
                                    teamUsers.map((item) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>{item.name || "-"}</TableCell>
                                            <TableCell>{item.email}</TableCell>
                                            <TableCell>{item.role}</TableCell>
                                            <TableCell>
                                                {item.role === "SUPER_ADMIN" ? (
                                                    <Chip size="small" label="Protected" sx={{ bgcolor: "rgba(239,68,68,0.14)", color: "#dc2626", fontWeight: 700 }} />
                                                ) : (
                                                    <Chip size="small" label="Editable" sx={{ bgcolor: "rgba(14,165,233,0.14)", color: "#0284c7", fontWeight: 700 }} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Search Limits & Analytics */}
            <Card sx={sectionStyle} elevation={0}>
                <CardHeader
                    avatar={<TuneIcon sx={{ color: "#0ea5e9" }} />}
                    title={
                        <Typography fontWeight={700} fontSize={15} color="#1e293b">
                            Search Limits & Booking Analytics
                        </Typography>
                    }
                    sx={{ pb: 0, pt: 2.5, px: 3 }}
                />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ px: 3, pt: 2.5 }}>
                    {searchControlState.success ? (
                        <Alert severity="success" sx={{ mb: 1.5, borderRadius: "10px" }}>
                            {searchControlState.success}
                        </Alert>
                    ) : null}
                    {searchControlState.error ? (
                        <Alert severity="error" sx={{ mb: 1.5, borderRadius: "10px" }}>
                            {searchControlState.error}
                        </Alert>
                    ) : null}

                    <Grid container spacing={1.4} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Guest Search Limit (24h)"
                                value={searchControl.anonSearchLimit}
                                onChange={(e) =>
                                    setSearchControl((prev) => ({ ...prev, anonSearchLimit: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Logged Searches Per Booking"
                                value={searchControl.loggedSearchesPerBooking}
                                onChange={(e) =>
                                    setSearchControl((prev) => ({ ...prev, loggedSearchesPerBooking: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Minimum Logged Search Limit"
                                value={searchControl.minimumLoggedSearchLimit}
                                onChange={(e) =>
                                    setSearchControl((prev) => ({ ...prev, minimumLoggedSearchLimit: e.target.value }))
                                }
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveSearchControl}
                            disabled={savingSearchControl}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            {savingSearchControl ? "Saving..." : "Save Search Limits"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={loadAnalytics}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Refresh Analytics
                        </Button>
                    </Box>

                    {analyticsError ? (
                        <Alert severity="error" sx={{ mb: 1.5, borderRadius: "10px" }}>
                            {analyticsError}
                        </Alert>
                    ) : null}

                    {analyticsLoading ? (
                        <Box sx={{ display: "grid", placeItems: "center", py: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <>
                            <Grid container spacing={1.2} sx={{ mb: 2 }}>
                                {[
                                    { label: "Search Total", value: analytics.stats.searches.total },
                                    { label: "Search Blocked", value: analytics.stats.searches.blocked },
                                    { label: "Booking Attempts", value: analytics.stats.bookings.attempts },
                                    { label: "Booking Failed", value: analytics.stats.bookings.failed },
                                ].map((card) => (
                                    <Grid item xs={12} sm={6} md={3} key={card.label}>
                                        <Box sx={{ p: 1.2, border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#f8fafc" }}>
                                            <Typography sx={{ fontSize: 12, color: "#64748b" }}>{card.label}</Typography>
                                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{card.value}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>

                            <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 1 }}>Recent Search Logs</Typography>
                            <TableContainer sx={{ mb: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Route</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Count/Limit</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {analytics.latestSearchLogs.length ? (
                                            analytics.latestSearchLogs.map((row, index) => (
                                                <TableRow key={`search-log-${index}`} hover>
                                                    <TableCell>{row?.timestamp || "-"}</TableCell>
                                                    <TableCell>{row?.mode || "-"}</TableCell>
                                                    <TableCell>{row?.status || "-"}</TableCell>
                                                    <TableCell>{row?.route || "-"}</TableCell>
                                                    <TableCell>{`${row?.count || 0}/${row?.limit || 0}`}</TableCell>
                                                    <TableCell>{row?.message || "-"}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">No search logs found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 1 }}>Recent Booking Failures</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Reservation</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {analytics.latestBookingFailures.length ? (
                                            analytics.latestBookingFailures.map((row, index) => (
                                                <TableRow key={`booking-fail-${index}`} hover>
                                                    <TableCell>{row?.timestamp || "-"}</TableCell>
                                                    <TableCell>{row?.stage || "-"}</TableCell>
                                                    <TableCell>{row?.status || "-"}</TableCell>
                                                    <TableCell>{row?.reservationId || "-"}</TableCell>
                                                    <TableCell>{row?.message || "-"}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">No booking failures found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </CardContent>
            </Card>

            <Box display="flex" justifyContent="flex-end">
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 700,
                        px: 4,
                        py: 1.2,
                        background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                        "&:hover": { background: "linear-gradient(135deg, #0d6b64 0%, #0b8a7e 100%)" },
                    }}
                >
                    Save Settings
                </Button>
            </Box>
        </Box>
    );
}
