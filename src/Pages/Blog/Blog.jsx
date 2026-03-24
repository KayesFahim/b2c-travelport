import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import NavBar from "../../Shared/NavBar/NavBar";

const categories = [
    "Flight Tips",
    "Fare Rules",
    "Airline Updates",
    "Visa Insights",
    "Travel Tech",
];

const FALLBACK_POSTS = [
    {
        id: "fallback-1",
        title: "How to Read Fare Rules Before You Book",
        tag: "Fare Rules",
        date: "March 18, 2026",
        imageUrl:
            "https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=80",
    },
    {
        id: "fallback-2",
        title: "Best Time Windows for Lower International Fares",
        tag: "Flight Tips",
        date: "March 15, 2026",
        imageUrl:
            "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    },
    {
        id: "fallback-3",
        title: "Transit Strategy: Short vs Long Connection",
        tag: "Travel Tech",
        date: "March 12, 2026",
        imageUrl:
            "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
    },
    {
        id: "fallback-4",
        title: "Baggage Policy Differences Across Major Carriers",
        tag: "Airline Updates",
        date: "March 10, 2026",
        imageUrl:
            "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1200&q=80",
    },
    {
        id: "fallback-5",
        title: "Multi-City Booking: Mistakes That Cost More",
        tag: "Flight Tips",
        date: "March 8, 2026",
        imageUrl:
            "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=80",
    },
    {
        id: "fallback-6",
        title: "Booking Confidence: What to Verify Pre-Ticketing",
        tag: "Travel Tech",
        date: "March 5, 2026",
        imageUrl:
            "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80",
    },
];

function normalizePost(post, index) {
    const createdAt = post?.createdAt ? new Date(post.createdAt) : null;
    const isValidDate = createdAt instanceof Date && !Number.isNaN(createdAt.getTime());

    return {
        id: post?.id ?? `dynamic-${index}`,
        title: String(post?.title || "Untitled Post"),
        tag: String(post?.tag || "Travel Tips"),
        date: isValidDate
            ? createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            : "Recently",
        imageUrl:
            String(post?.imageUrl || "").trim() ||
            "https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=80",
        excerpt: String(post?.excerpt || ""),
    };
}

const Blog = () => {
    const [posts, setPosts] = useState(FALLBACK_POSTS);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/cms/blog")
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                if (Array.isArray(data) && data.length > 0) {
                    setPosts(data.map(normalizePost));
                }
            })
            .catch(() => {
                // Keep fallback posts.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const featuredPost = useMemo(() => posts[0] || FALLBACK_POSTS[0], [posts]);

    return (
        <Box sx={{ minHeight: "100%" }}>
            <NavBar />

            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
                <Box
                    sx={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "26px",
                        p: { xs: 3, md: 6 },
                        border: "1px solid rgba(0,154,214,0.2)",
                        background:
                            "linear-gradient(115deg, rgba(0,154,214,0.18) 0%, rgba(0,154,214,0.05) 43%, rgba(255,255,255,0.98) 100%)",
                        mb: 5,
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            right: "-90px",
                            top: "-90px",
                            width: 260,
                            height: 260,
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle, rgba(0,154,214,0.3), rgba(0,154,214,0))",
                            pointerEvents: "none",
                        }}
                    />
                    <Stack spacing={2} sx={{ maxWidth: 760, position: "relative", zIndex: 2 }}>
                        <Chip
                            label="Fly Jatt Journal"
                            sx={{
                                width: "fit-content",
                                bgcolor: "rgba(0,154,214,0.14)",
                                color: "var(--primary-color)",
                                fontWeight: 700,
                            }}
                        />
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: "30px", md: "46px" },
                                lineHeight: 1.1,
                                fontWeight: 800,
                                color: "var(--flight-color)",
                            }}
                        >
                            Modern travel stories, fare insights, and booking strategy.
                        </Typography>
                        <Typography
                            sx={{
                                color: "var(--text-color)",
                                fontSize: { xs: "15px", md: "17px" },
                                maxWidth: 650,
                            }}
                        >
                            Curated content for travelers and agents who want clearer decisions,
                            smarter routes, and fewer booking surprises.
                        </Typography>
                        <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                            {categories.map((item) => (
                                <Chip
                                    key={item}
                                    label={item}
                                    sx={{
                                        borderRadius: "999px",
                                        border: "1px solid rgba(0,154,214,0.3)",
                                        bgcolor: "rgba(255,255,255,0.8)",
                                        color: "var(--flight-color)",
                                        fontWeight: 600,
                                    }}
                                />
                            ))}
                        </Stack>
                    </Stack>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Card
                            sx={{
                                height: "100%",
                                borderRadius: "20px",
                                overflow: "hidden",
                                border: "1px solid rgba(0,154,214,0.14)",
                                boxShadow: "0 16px 30px rgba(15,23,42,0.06)",
                            }}
                        >
                            <Box
                                component="img"
                                src={featuredPost.imageUrl}
                                alt={featuredPost.title}
                                sx={{ width: "100%", height: { xs: 220, md: 320 }, objectFit: "cover" }}
                            />
                            <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
                                <Chip
                                    label="Featured"
                                    size="small"
                                    sx={{
                                        mb: 1.2,
                                        bgcolor: "rgba(0,154,214,0.14)",
                                        color: "var(--primary-color)",
                                        fontWeight: 700,
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: { xs: "22px", md: "30px" },
                                        fontWeight: 800,
                                        color: "var(--flight-color)",
                                        lineHeight: 1.25,
                                        mb: 1.2,
                                    }}
                                >
                                    {featuredPost.title}
                                </Typography>
                                <Typography sx={{ color: "var(--text-color)", mb: 2 }}>
                                    {featuredPost.excerpt ||
                                        "A practical guide to route selection, fare comparison, baggage checks, and timing rules before final ticketing."}
                                </Typography>
                                <Button
                                    endIcon={<ArrowOutwardRoundedIcon />}
                                    sx={{
                                        color: "var(--primary-color)",
                                        fontWeight: 700,
                                        px: 0,
                                        "&:hover": { bgcolor: "transparent", color: "var(--primary-button)" },
                                    }}
                                >
                                    Read story
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Stack spacing={2.2} sx={{ height: "100%" }}>
                            {posts.slice(1, 4).map((post) => (
                                <Card
                                    key={post.id}
                                    sx={{
                                        display: "flex",
                                        gap: 1.8,
                                        p: 1.3,
                                        borderRadius: "16px",
                                        border: "1px solid rgba(0,154,214,0.14)",
                                        boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={post.imageUrl}
                                        alt={post.title}
                                        sx={{
                                            width: 120,
                                            minWidth: 120,
                                            height: 105,
                                            borderRadius: "12px",
                                            objectFit: "cover",
                                        }}
                                    />
                                    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                        <Typography sx={{ fontSize: "12px", color: "var(--text-color)", mb: 0.6 }}>
                                            {post.date} · {post.tag}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                color: "var(--flight-color)",
                                                lineHeight: 1.35,
                                                fontSize: "16px",
                                            }}
                                        >
                                            {post.title}
                                        </Typography>
                                    </Box>
                                </Card>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>

                <Box sx={{ mt: { xs: 5, md: 6 } }}>
                    <Typography
                        sx={{
                            fontSize: { xs: "24px", md: "32px" },
                            fontWeight: 800,
                            color: "var(--flight-color)",
                            mb: 0.8,
                        }}
                    >
                        Latest posts
                    </Typography>
                    <Typography sx={{ color: "var(--text-color)", mb: 3 }}>
                        Fresh travel intelligence from fare behavior to booking operations.
                    </Typography>

                    <Grid container spacing={3}>
                        {posts.map((post) => (
                            <Grid item xs={12} sm={6} md={4} key={post.id}>
                                <Card
                                    sx={{
                                        height: "100%",
                                        borderRadius: "16px",
                                        overflow: "hidden",
                                        border: "1px solid rgba(0,154,214,0.14)",
                                        boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={post.imageUrl}
                                        alt={post.title}
                                        sx={{ width: "100%", height: 190, objectFit: "cover" }}
                                    />
                                    <CardContent>
                                        <Typography sx={{ fontSize: "12px", color: "var(--text-color)", mb: 0.8 }}>
                                            {post.date} · {post.tag}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: "var(--flight-color)",
                                                fontWeight: 700,
                                                lineHeight: 1.35,
                                                fontSize: "17px",
                                                mb: 1.2,
                                            }}
                                        >
                                            {post.title}
                                        </Typography>
                                        <Button
                                            endIcon={<ArrowOutwardRoundedIcon />}
                                            sx={{
                                                px: 0,
                                                color: "var(--primary-color)",
                                                fontWeight: 700,
                                                "&:hover": {
                                                    bgcolor: "transparent",
                                                    color: "var(--primary-button)",
                                                },
                                            }}
                                        >
                                            Read more
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Container>
        </Box>
    );
};

export default Blog;
