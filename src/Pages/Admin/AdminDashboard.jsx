import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    AppBar,
    Avatar,
    Box,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BookingIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import PaymentIcon from "@mui/icons-material/Payment";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNavigate } from "react-router-dom";
import AdminDashboardView from "./views/AdminDashboardView";
import BookingManagement from "./views/BookingManagement";
import CustomerManagement from "./views/CustomerManagement";
import PaymentManagement from "./views/PaymentManagement";
import Reports from "./views/Reports";
import AdminSettings from "./views/AdminSettings";
import CmsManagement from "./views/CmsManagement";
import ArticleIcon from "@mui/icons-material/Article";

const DRAWER_WIDTH = 250;

const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: DashboardIcon, color: "#0d9488", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "ACCOUNTANT", "RESERVATION"] },
    { id: "bookings", label: "Booking Management", icon: BookingIcon, color: "#0ea5e9", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "RESERVATION"] },
    { id: "customers", label: "Customer Management", icon: PeopleIcon, color: "#f59e0b", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "RESERVATION"] },
    { id: "payments", label: "Payment Management", icon: PaymentIcon, color: "#8b5cf6", roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
    { id: "reports", label: "Reports", icon: BarChartIcon, color: "#ef4444", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"] },
    { id: "cms", label: "CMS", icon: ArticleIcon, color: "#8b5cf6", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
    { id: "settings", label: "Settings", icon: SettingsIcon, color: "#6b7280", roles: ["SUPER_ADMIN", "ADMIN"] },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState("");
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadSession = async () => {
            try {
                setAuthLoading(true);
                setAuthError("");

                const response = await fetch("/api/auth/me", {
                    method: "GET",
                    credentials: "include",
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok || !payload?.user) {
                    throw new Error(payload?.message || "You must be logged in to access the admin area.");
                }

                if (!payload.user.admin || payload.user.role === "CUSTOMER") {
                    throw new Error("You do not have permission to access the admin area.");
                }

                if (!cancelled) {
                    setCurrentUser(payload.user);
                }
            } catch (error) {
                if (!cancelled) {
                    setAuthError(error instanceof Error ? error.message : "Unable to validate admin session.");
                }
            } finally {
                if (!cancelled) {
                    setAuthLoading(false);
                }
            }
        };

        loadSession();

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleMenuItems = useMemo(() => {
        if (!currentUser?.role) return [];
        return menuItems.filter((item) => item.roles.includes(currentUser.role));
    }, [currentUser]);

    useEffect(() => {
        if (!visibleMenuItems.length) return;
        const tabStillAllowed = visibleMenuItems.some((item) => item.id === activeTab);
        if (!tabStillAllowed) {
            setActiveTab(visibleMenuItems[0].id);
        }
    }, [activeTab, visibleMenuItems]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleMenuClose();
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // Ignore logout failure.
        }
        navigate("/signIn");
    };

    const renderContent = () => {
        const allowed = visibleMenuItems.some((item) => item.id === activeTab);
        if (!allowed) {
            return (
                <Alert severity="warning" sx={{ borderRadius: "12px" }}>
                    You do not have access to this section.
                </Alert>
            );
        }

        switch (activeTab) {
            case "dashboard":
                return <AdminDashboardView />;
            case "bookings":
                return <BookingManagement />;
            case "customers":
                return <CustomerManagement />;
            case "payments":
                return <PaymentManagement />;
            case "reports":
                return <Reports />;
            case "settings":
                return <AdminSettings />;
            case "cms":
                return <CmsManagement />;
            default:
                return <AdminDashboardView />;
        }
    };

    const drawerContent = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2.5, background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)" }}>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 800, letterSpacing: 1 }}>
                    🧳 FlyJatt Admin
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Management Portal
                </Typography>
            </Box>

            <Divider />

            <List sx={{ flex: 1, py: 2 }}>
                {visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <ListItem
                            button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setMobileOpen(false);
                            }}
                            sx={{
                                mx: 1,
                                mb: 0.5,
                                borderRadius: "12px",
                                backgroundColor: activeTab === item.id ? `${item.color}15` : "transparent",
                                borderLeft: activeTab === item.id ? `4px solid ${item.color}` : "none",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    backgroundColor: `${item.color}25`,
                                    transform: "translateX(4px)",
                                },
                            }}
                        >
                            <ListItemIcon sx={{ color: activeTab === item.id ? item.color : "#9ca3af", minWidth: 40 }}>
                                <Icon />
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                sx={{
                                    "& .MuiTypography-root": {
                                        fontSize: 14,
                                        fontWeight: activeTab === item.id ? 600 : 500,
                                        color: activeTab === item.id ? item.color : "#6b7280",
                                    },
                                }}
                            />
                        </ListItem>
                    );
                })}
            </List>

            <Divider />

            <Box sx={{ p: 2 }}>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, rgba(15, 118, 110, 0.1) 0%, rgba(13, 148, 136, 0.1) 100%)",
                        textAlign: "center",
                    }}
                >
                    <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 0.5 }}>
                        Logged in as
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f766e" }}>
                        {currentUser?.name || currentUser?.email || "Admin User"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {String(currentUser?.role || "ADMIN").replace(/_/g, " ")}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );

    if (authLoading) {
        return (
            <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
                <Box sx={{ textAlign: "center" }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 1.5, color: "#64748b" }}>
                        Loading admin access...
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (authError) {
        return (
            <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", px: 2 }}>
                <Alert severity="error" sx={{ maxWidth: 520, borderRadius: "12px" }}>
                    {authError}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: DRAWER_WIDTH,
                        boxSizing: "border-box",
                        backgroundColor: "#fff",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
                    },
                    display: { xs: "none", md: "block" },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: DRAWER_WIDTH,
                        boxSizing: "border-box",
                        backgroundColor: "#fff",
                    },
                    display: { xs: "block", md: "none" },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Top AppBar */}
                <AppBar
                    position="sticky"
                    sx={{
                        backgroundColor: "#fff",
                        color: "#1f2937",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { xs: "block", md: "none" } }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, color: "#0f766e" }}>
                            {visibleMenuItems.find((m) => m.id === activeTab)?.label || "Dashboard"}
                        </Typography>

                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            <IconButton color="inherit" size="small">
                                <NotificationsIcon sx={{ fontSize: 20 }} />
                            </IconButton>

                            <Avatar
                                onClick={handleMenuOpen}
                                sx={{
                                    width: 36,
                                    height: 36,
                                    background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                }}
                            >
                                {String(currentUser?.name || currentUser?.email || "AD").slice(0, 2).toUpperCase()}
                            </Avatar>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                transformOrigin={{ vertical: "top", horizontal: "right" }}
                            >
                                <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
                                <MenuItem onClick={handleMenuClose}>My Account</MenuItem>
                                <Divider />
                                <MenuItem onClick={handleLogout} sx={{ color: "#ef4444" }}>
                                    <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
                                    Logout
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* Page Content */}
                <Box sx={{ flex: 1, p: { xs: 1.5, md: 2.5 }, overflowY: "auto" }}>
                    {renderContent()}
                </Box>
            </Box>
        </Box>
    );
}
