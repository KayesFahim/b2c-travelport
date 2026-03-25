import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Tabs,
    Tab,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
    TextField,
    Button,
    Alert,
    Stack,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    CircularProgress,
    Switch,
    FormControlLabel,
    MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ArticleIcon from "@mui/icons-material/Article";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import InfoIcon from "@mui/icons-material/Info";
import HomeIcon from "@mui/icons-material/Home";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

const BLOG_TAGS = ["Travel Tips", "Fare Rules", "Airline Updates", "Visa Insights", "Travel Tech", "Destination", "News"];

const cardStyle = {
    borderRadius: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    mb: 3,
};

const inputStyle = { "& .MuiOutlinedInput-root": { borderRadius: "10px" } };

const saveBtnStyle = {
    borderRadius: "12px",
    textTransform: "none",
    fontWeight: 700,
    px: 4,
    py: 1.2,
    background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
    "&:hover": { background: "linear-gradient(135deg, #0d6b64 0%, #0b8a7e 100%)" },
};

// ─────────────────────────────────────────
// Blog Tab
// ─────────────────────────────────────────
function BlogTab() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editPost, setEditPost] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [seedingDemo, setSeedingDemo] = useState(false);
    const [alert, setAlert] = useState(null);
    const [form, setForm] = useState({
        title: "", tag: "Travel Tips", excerpt: "", content: "", imageUrl: "", published: true, authorName: "FlyJatt Team",
    });

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/cms/blog?admin=true");
            const data = await res.json();
            setPosts(Array.isArray(data) ? data : []);
        } catch {
            setAlert({ type: "error", msg: "Failed to load blog posts" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const openAdd = () => {
        setEditPost(null);
        setForm({ title: "", tag: "Travel Tips", excerpt: "", content: "", imageUrl: "", published: true, authorName: "FlyJatt Team" });
        setDialogOpen(true);
    };

    const openEdit = (post) => {
        setEditPost(post);
        setForm({
            title: post.title ?? "",
            tag: post.tag ?? "Travel Tips",
            excerpt: post.excerpt ?? "",
            content: post.content ?? "",
            imageUrl: post.imageUrl ?? "",
            published: post.published !== false,
            authorName: post.authorName ?? "FlyJatt Team",
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const isEdit = editPost != null;
            const url = isEdit ? `/api/cms/blog?id=${editPost.id}` : "/api/cms/blog";
            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed");
            setDialogOpen(false);
            setAlert({ type: "success", msg: isEdit ? "Post updated." : "Post created." });
            fetchPosts();
        } catch {
            setAlert({ type: "error", msg: "Failed to save post." });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await fetch(`/api/cms/blog?id=${deleteConfirm.id}`, { method: "DELETE" });
            setAlert({ type: "success", msg: "Post deleted." });
            setDeleteConfirm(null);
            fetchPosts();
        } catch {
            setAlert({ type: "error", msg: "Failed to delete." });
        }
    };

    const handleSeedDemo = async () => {
        setSeedingDemo(true);
        try {
            const res = await fetch("/api/cms/blog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "seed-demo" }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload?.message || "Failed to seed demo posts.");
            setAlert({ type: "success", msg: payload?.message || "Demo posts loaded." });
            fetchPosts();
        } catch (error) {
            setAlert({ type: "error", msg: error instanceof Error ? error.message : "Failed to seed demo posts." });
        } finally {
            setSeedingDemo(false);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setUploadingImage(true);
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Unable to read selected image."));
                reader.readAsDataURL(file);
            });

            const res = await fetch("/api/cms/blog-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                    dataUrl,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload?.url) {
                throw new Error(payload?.message || "Image upload failed.");
            }

            setForm((prev) => ({ ...prev, imageUrl: payload.url }));
            setAlert({ type: "success", msg: "Blog image uploaded successfully." });
        } catch (error) {
            setAlert({ type: "error", msg: error instanceof Error ? error.message : "Image upload failed." });
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700} color="#1e293b">Blog Posts</Typography>
                <Stack direction="row" spacing={1.2}>
                    <Button
                        startIcon={seedingDemo ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                        variant="outlined"
                        onClick={handleSeedDemo}
                        disabled={seedingDemo}
                        sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
                    >
                        {seedingDemo ? "Loading Demo..." : "Load Demo Data"}
                    </Button>
                    <Button startIcon={<AddIcon />} variant="contained" onClick={openAdd} sx={{ ...saveBtnStyle, px: 2.5, py: 0.8 }}>
                        New Post
                    </Button>
                </Stack>
            </Stack>

            {alert && (
                <Alert severity={alert.type} sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            <Card elevation={0} sx={cardStyle}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tag</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Author</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={28} />
                                    </TableCell>
                                </TableRow>
                            ) : posts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                                        No blog posts yet. Click "New Post" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : posts.map((post) => (
                                <TableRow key={post.id} hover>
                                    <TableCell sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {post.title}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={post.tag} size="small" sx={{ bgcolor: "rgba(0,154,214,0.1)", color: "#009ad6", fontWeight: 600, fontSize: 11 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 13, color: "#64748b" }}>{post.authorName ?? "—"}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={post.published ? "Published" : "Draft"}
                                            size="small"
                                            sx={{
                                                bgcolor: post.published ? "rgba(16,185,129,0.12)" : "rgba(156,163,175,0.2)",
                                                color: post.published ? "#059669" : "#6b7280",
                                                fontWeight: 600, fontSize: 11,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12, color: "#94a3b8" }}>
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => openEdit(post)} sx={{ color: "#0ea5e9" }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" onClick={() => setDeleteConfirm(post)} sx={{ color: "#ef4444" }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
                PaperProps={{ sx: { borderRadius: "16px" } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
                    {editPost ? "Edit Blog Post" : "New Blog Post"}
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Title *" value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                size="small" sx={inputStyle} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth select label="Tag" value={form.tag}
                                onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))}
                                size="small" sx={inputStyle}>
                                {BLOG_TAGS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Author Name" value={form.authorName}
                                onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
                                size="small" sx={inputStyle} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Cover Image URL" value={form.imageUrl}
                                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                                size="small" sx={inputStyle} placeholder="https://..." />
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "stretch", sm: "center" }}>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={uploadingImage ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                                    disabled={uploadingImage}
                                    sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700, width: "fit-content" }}
                                >
                                    {uploadingImage ? "Uploading..." : "Upload to Vercel Blob"}
                                    <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                                </Button>
                                {form.imageUrl ? (
                                    <Typography sx={{ fontSize: 12, color: "#64748b", wordBreak: "break-all" }}>
                                        {form.imageUrl}
                                    </Typography>
                                ) : null}
                            </Stack>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Short Excerpt" value={form.excerpt}
                                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                                size="small" sx={inputStyle} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={5} label="Full Content" value={form.content}
                                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                                size="small" sx={inputStyle} />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch checked={form.published}
                                        onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))} />
                                }
                                label="Published (visible on site)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving || !form.title.trim()}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                        sx={{ ...saveBtnStyle, px: 3, py: 0.9 }}>
                        {saving ? "Saving..." : "Save Post"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}
                PaperProps={{ sx: { borderRadius: "14px" } }}>
                <DialogTitle fontWeight={700}>Delete Post?</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete &quot;<strong>{deleteConfirm?.title}</strong>&quot;? This cannot be undone.</Typography>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2.5 }}>
                    <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    <Button variant="contained" color="error" sx={{ borderRadius: "10px" }} onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ─────────────────────────────────────────
// Contact Info Tab
// ─────────────────────────────────────────
function ContactInfoTab() {
    const [settings, setSettings] = useState({
        email: "info@flyjatt.com",
        phone: "+88 01736-987906",
        address: "DCC7, North Ibrahimpur, Kafrul, Dhaka-1206, Bangladesh",
        supportHours: "24/7 online support",
        mapEmbed: "",
    });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetch("/api/cms/settings?section=contact")
            .then((r) => r.json())
            .then((data) => {
                if (data && typeof data === "object" && !data.message) {
                    setSettings((prev) => ({ ...prev, ...data }));
                }
            })
            .catch(() => { });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/cms/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section: "contact", settings }),
            });
            if (!res.ok) throw new Error();
            setAlert({ type: "success", msg: "Contact settings saved." });
        } catch {
            setAlert({ type: "error", msg: "Failed to save." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} color="#1e293b" mb={2}>Contact Page Settings</Typography>
            {alert && (
                <Alert severity={alert.type} sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}
            <Card elevation={0} sx={cardStyle}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        {[
                            { label: "Support Email", field: "email" },
                            { label: "Support Phone", field: "phone" },
                            { label: "Support Hours", field: "supportHours" },
                        ].map(({ label, field }) => (
                            <Grid item xs={12} sm={6} key={field}>
                                <TextField fullWidth label={label} value={settings[field] ?? ""}
                                    onChange={(e) => setSettings((p) => ({ ...p, [field]: e.target.value }))}
                                    size="small" sx={inputStyle} />
                            </Grid>
                        ))}
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Office Address"
                                value={settings.address ?? ""}
                                onChange={(e) => setSettings((p) => ({ ...p, address: e.target.value }))}
                                size="small" sx={inputStyle} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Google Maps Embed URL (optional)"
                                value={settings.mapEmbed ?? ""}
                                onChange={(e) => setSettings((p) => ({ ...p, mapEmbed: e.target.value }))}
                                size="small" sx={inputStyle} placeholder="https://maps.google.com/..." />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
            <Box display="flex" justifyContent="flex-end">
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave} disabled={saving} sx={saveBtnStyle}>
                    {saving ? "Saving..." : "Save Contact Info"}
                </Button>
            </Box>
        </Box>
    );
}

// ─────────────────────────────────────────
// About Us Tab
// ─────────────────────────────────────────
function AboutUsTab() {
    const [settings, setSettings] = useState({
        headline: "Building a faster, cleaner way to search and book flights.",
        subtext: "FlyJatt powers flight search and booking for travelers and travel agents with reliable fare content, clear policies, and stable availability.",
        mission: "Make flight booking transparent and accessible for every traveler.",
        value1Title: "Clear Pricing", value1Desc: "We show transparent fares so travelers and agents can make decisions fast without hidden surprises.",
        value2Title: "Reliable Support", value2Desc: "From first search to ticketing, we keep support available for route guidance, changes, and urgent assistance.",
        value3Title: "Smart Technology", value3Desc: "Our booking flows are designed for speed, accurate fare details, and stable performance across devices.",
        value4Title: "Global Access", value4Desc: "By connecting strong supplier content, we help travelers reach more destinations with better options.",
        founded: "2024",
        focus: "Flight-first OTA",
        coreMarket: "Bangladesh + Global routes",
        platform: "Web booking + API-ready",
    });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetch("/api/cms/settings?section=about")
            .then((r) => r.json())
            .then((data) => {
                if (data && typeof data === "object" && !data.message) {
                    setSettings((prev) => ({ ...prev, ...data }));
                }
            })
            .catch(() => { });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/cms/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section: "about", settings }),
            });
            if (!res.ok) throw new Error();
            setAlert({ type: "success", msg: "About Us content saved." });
        } catch {
            setAlert({ type: "error", msg: "Failed to save." });
        } finally {
            setSaving(false);
        }
    };

    const field = (label, key, multiline = false, rows = 2) => (
        <Grid item xs={12} sm={multiline ? 12 : 6} key={key}>
            <TextField fullWidth multiline={multiline} rows={multiline ? rows : undefined}
                label={label} value={settings[key] ?? ""}
                onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                size="small" sx={inputStyle} />
        </Grid>
    );

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} color="#1e293b" mb={2}>About Us Page Content</Typography>
            {alert && (
                <Alert severity={alert.type} sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            <Card elevation={0} sx={cardStyle}>
                <CardHeader title={<Typography fontWeight={700} fontSize={14}>Hero Section</Typography>}
                    sx={{ pb: 0, pt: 2, px: 3 }} />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        {field("Page Headline", "headline", true, 2)}
                        {field("Sub Text", "subtext", true, 3)}
                        {field("Mission Statement", "mission", true, 2)}
                    </Grid>
                </CardContent>
            </Card>

            <Card elevation={0} sx={cardStyle}>
                <CardHeader title={<Typography fontWeight={700} fontSize={14}>Our Values (4 Cards)</Typography>}
                    sx={{ pb: 0, pt: 2, px: 3 }} />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        {[1, 2, 3, 4].flatMap((n) => [
                            field(`Value ${n} Title`, `value${n}Title`),
                            field(`Value ${n} Description`, `value${n}Desc`, true, 2),
                        ])}
                    </Grid>
                </CardContent>
            </Card>

            <Card elevation={0} sx={cardStyle}>
                <CardHeader title={<Typography fontWeight={700} fontSize={14}>Milestones / Stats</Typography>}
                    sx={{ pb: 0, pt: 2, px: 3 }} />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        {field("Founded Year", "founded")}
                        {field("Focus", "focus")}
                        {field("Core Market", "coreMarket")}
                        {field("Platform", "platform")}
                    </Grid>
                </CardContent>
            </Card>

            <Box display="flex" justifyContent="flex-end">
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave} disabled={saving} sx={saveBtnStyle}>
                    {saving ? "Saving..." : "Save About Us"}
                </Button>
            </Box>
        </Box>
    );
}

// ─────────────────────────────────────────
// Homepage Tab
// ─────────────────────────────────────────
function HomepageTab() {
    const [settings, setSettings] = useState({
        mainTitle: "Discover Great Flight Deals.",
        subTitle: "Book your Flight, Hotels and Desire Holiday Packages",
        contactPhone: "+880 1712-345678",
        contactEmail: "info@flyjatt.com",
        copyright: "© 2024 FlyJatt. All rights reserved.",
        bannerImageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop",
        slide1Url: "", slide2Url: "", slide3Url: "", slide4Url: "", slide5Url: "",
    });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetch("/api/cms/settings?section=homepage")
            .then((r) => r.json())
            .then((data) => {
                if (data && typeof data === "object" && !data.message) {
                    setSettings((prev) => ({ ...prev, ...data }));
                }
            })
            .catch(() => { });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/cms/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section: "homepage", settings }),
            });
            if (!res.ok) throw new Error();
            setAlert({ type: "success", msg: "Homepage settings saved." });
        } catch {
            setAlert({ type: "error", msg: "Failed to save." });
        } finally {
            setSaving(false);
        }
    };

    const tf = (label, key) => (
        <Grid item xs={12} sm={6} key={key}>
            <TextField fullWidth label={label} value={settings[key] ?? ""}
                onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                size="small" sx={inputStyle} />
        </Grid>
    );

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} color="#1e293b" mb={2}>Homepage Settings</Typography>
            {alert && (
                <Alert severity={alert.type} sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            <Card elevation={0} sx={cardStyle}>
                <CardHeader title={<Typography fontWeight={700} fontSize={14}>Hero Text</Typography>}
                    sx={{ pb: 0, pt: 2, px: 3 }} />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        {tf("Main Title", "mainTitle")}
                        {tf("Sub Title", "subTitle")}
                    </Grid>
                </CardContent>
            </Card>

            <Card elevation={0} sx={cardStyle}>
                <CardHeader title={<Typography fontWeight={700} fontSize={14}>Contact Details (shown in footer/header)</Typography>}
                    sx={{ pb: 0, pt: 2, px: 3 }} />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        {tf("Phone Number", "contactPhone")}
                        {tf("Email Address", "contactEmail")}
                        <Grid item xs={12}>
                            <TextField fullWidth label="Copyright Text" value={settings.copyright ?? ""}
                                onChange={(e) => setSettings((p) => ({ ...p, copyright: e.target.value }))}
                                size="small" sx={inputStyle} />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Card elevation={0} sx={cardStyle}>
                <CardHeader title={<Typography fontWeight={700} fontSize={14}>Banner & Slider Images (URLs)</Typography>}
                    sx={{ pb: 0, pt: 2, px: 3 }} />
                <Divider sx={{ mt: 1 }} />
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Banner Image URL" value={settings.bannerImageUrl ?? ""}
                                onChange={(e) => setSettings((p) => ({ ...p, bannerImageUrl: e.target.value }))}
                                size="small" sx={inputStyle} placeholder="https://..." />
                        </Grid>
                        {[1, 2, 3, 4, 5].map((n) =>
                            tf(`Slider Image ${n} URL`, `slide${n}Url`)
                        )}
                    </Grid>
                </CardContent>
            </Card>

            <Box display="flex" justifyContent="flex-end">
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave} disabled={saving} sx={saveBtnStyle}>
                    {saving ? "Saving..." : "Save Homepage Settings"}
                </Button>
            </Box>
        </Box>
    );
}

// ─────────────────────────────────────────
// Main CmsManagement component
// ─────────────────────────────────────────
export default function CmsManagement() {
    const [tab, setTab] = useState(0);

    const tabs = [
        { label: "Blog", icon: <ArticleIcon fontSize="small" /> },
        { label: "Contact Info", icon: <ContactMailIcon fontSize="small" /> },
        { label: "About Us", icon: <InfoIcon fontSize="small" /> },
        { label: "Homepage", icon: <HomeIcon fontSize="small" /> },
    ];

    const previewLinks = [
        { label: "Blogs", href: "/blogs", tabIndex: 0 },
        { label: "Contact", href: "/contact", tabIndex: 1 },
        { label: "About Us", href: "/about-us", tabIndex: 2 },
        { label: "Homepage", href: "/", tabIndex: 3 },
    ];

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                <ArticleIcon sx={{ color: "#8b5cf6", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700} color="#1e293b">CMS Management</Typography>
                <Chip label="Content" size="small" sx={{ bgcolor: "rgba(139,92,246,0.12)", color: "#8b5cf6", fontWeight: 600 }} />
            </Stack>

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 44 },
                        "& .Mui-selected": { color: "#0d9488" },
                        "& .MuiTabs-indicator": { backgroundColor: "#0d9488" },
                    }}
                >
                    {tabs.map((t, i) => (
                        <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
                    ))}
                </Tabs>
            </Box>

            <Card elevation={0} sx={{ ...cardStyle, mb: 2.2 }}>
                <CardContent sx={{ py: 1.8 }}>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                        spacing={1.2}
                    >
                        <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                            Live Preview Links
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                            {previewLinks.map((item) => {
                                const isActive = tab === item.tabIndex;
                                return (
                                    <Button
                                        key={item.label}
                                        component="a"
                                        href={item.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        size="small"
                                        endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                                        variant={isActive ? "contained" : "outlined"}
                                        sx={{
                                            borderRadius: "999px",
                                            textTransform: "none",
                                            fontWeight: 700,
                                            ...(isActive
                                                ? {
                                                    bgcolor: "#0d9488",
                                                    "&:hover": { bgcolor: "#0b8177" },
                                                }
                                                : {
                                                    color: "#0f766e",
                                                    borderColor: "rgba(13,148,136,0.35)",
                                                    "&:hover": {
                                                        borderColor: "#0f766e",
                                                        bgcolor: "rgba(13,148,136,0.05)",
                                                    },
                                                }),
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                );
                            })}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {tab === 0 && <BlogTab />}
            {tab === 1 && <ContactInfoTab />}
            {tab === 2 && <AboutUsTab />}
            {tab === 3 && <HomepageTab />}
        </Box>
    );
}
