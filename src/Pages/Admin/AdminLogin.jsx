import React, { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

function getAuthHeaders() {
    secureLocalStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
    return {};
}

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            try {
                const response = await fetch("/api/admin/me", {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        ...getAuthHeaders(),
                    },
                });

                if (!cancelled && response.ok) {
                    navigate("/admin/dashboard", { replace: true });
                    return;
                }
            } catch {
                // Keep login form available.
            } finally {
                if (!cancelled) {
                    setCheckingSession(false);
                }
            }
        };

        checkSession();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!email.trim() || !password) {
            setError("Email and password are required.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/admin/login", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.user) {
                throw new Error(payload?.message || "Unable to sign in to the admin portal.");
            }

            if (payload?.token) {
                secureLocalStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
            }

            navigate("/admin/dashboard", { replace: true });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Admin login failed.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: "calc(100vh - 120px)",
                display: "grid",
                placeItems: "center",
                px: 2,
                py: 6,
            }}
        >
            <Card
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 460,
                    borderRadius: "24px",
                    border: "1px solid rgba(15,118,110,0.14)",
                    boxShadow: "0 24px 80px rgba(15,118,110,0.10)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,250,0.98) 100%)",
                }}
            >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
                        <Box>
                            <Typography sx={{ color: "#0f766e", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>
                                FLYJATT ADMIN
                            </Typography>
                            <Typography variant="h4" sx={{ mt: 1, fontWeight: 800, color: "#0f172a" }}>
                                Admin login
                            </Typography>
                            <Typography sx={{ mt: 1, color: "#64748b" }}>
                                Use the super admin or team access credentials configured for the admin portal.
                            </Typography>
                        </Box>

                        {error ? (
                            <Alert severity="error" sx={{ borderRadius: "12px" }}>
                                {error}
                            </Alert>
                        ) : null}

                        <TextField
                            label="Admin email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            fullWidth
                            autoComplete="username"
                        />

                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            fullWidth
                            autoComplete="current-password"
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                height: 48,
                                borderRadius: "14px",
                                textTransform: "none",
                                fontWeight: 700,
                                background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                            }}
                        >
                            {loading ? "Signing in..." : "Login to admin"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}