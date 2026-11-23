import React, { useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";

const ADMIN_AUTH_TOKEN_KEY = "flyjatt_admin_auth_token";

function getAuthHeaders() {
    secureLocalStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
    return {};
}

export default function AdminEntry() {
    const navigate = useNavigate();

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

                if (!cancelled) {
                    navigate(response.ok ? "/admin/dashboard" : "/admin/login", { replace: true });
                }
            } catch {
                if (!cancelled) {
                    navigate("/admin/login", { replace: true });
                }
            }
        };

        checkSession();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    return (
        <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
            <Box sx={{ textAlign: "center" }}>
                <CircularProgress />
                <Typography sx={{ mt: 1.5, color: "#64748b" }}>
                    Checking admin session...
                </Typography>
            </Box>
        </Box>
    );
}