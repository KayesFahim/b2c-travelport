import React, { useState } from "react";
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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TuneIcon from "@mui/icons-material/Tune";

const sectionStyle = {
    borderRadius: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    mb: 3,
};

export default function AdminSettings() {
    const [saved, setSaved] = useState(false);

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
