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
import React from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import NavBar from "../../Shared/NavBar/NavBar";

const categories = [
  "Flight Tips",
  "Fare Rules",
  "Airline Updates",
  "Visa Insights",
  "Travel Tech",
];

const posts = [
  {
    title: "How to Read Fare Rules Before You Book",
    import { useState, useEffect } from "react";
    tag: "Fare Rules",
    date: "March 18, 2026",
    image:
      "https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Best Time Windows for Lower International Fares",
    tag: "Flight Tips",
    date: "March 15, 2026",
    const FALLBACK_POSTS = [
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Transit Strategy: Short vs Long Connection",
    tag: "Travel Tech",
    date: "March 12, 2026",
    image:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Baggage Policy Differences Across Major Carriers",
    tag: "Airline Updates",
    date: "March 10, 2026",
    image:
      "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Multi-City Booking: Mistakes That Cost More",
    tag: "Flight Tips",
    date: "March 8, 2026",
    image:
      "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Booking Confidence: What to Verify Pre-Ticketing",
    tag: "Travel Tech",
    date: "March 5, 2026",
    image:
      "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80",
  },
];

const Blog = () => {
  return (
    <Box sx={{ minHeight: "100%" }}>
      <NavBar />

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
];
            p: { xs: 3, md: 6 },
            border: "1px solid rgba(0,154,214,0.2)",
  const [posts, setPosts] = useState(FALLBACK_POSTS);

  useEffect(() => {
    fetch("/api/cms/blog")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(
            data.map((p) => ({
              ...p,
              date: new Date(p.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              }),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);
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
                src="https://images.unsplash.com/photo-1494412685616-a5d310fbb07d?auto=format&fit=crop&w=1400&q=80"
                alt="Featured travel guide"
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
                  The 2026 Flight Booking Playbook for Smart Travelers
                </Typography>
                <Typography sx={{ color: "var(--text-color)", mb: 2 }}>
                  A practical guide to route selection, fare comparison, baggage checks,
                  and timing rules before final ticketing.
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
              {posts.slice(0, 3).map((post) => (
                <Card
                  key={post.title}
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
                    src={post.imageUrl || post.image}
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
              <Grid item xs={12} sm={6} md={4} key={post.title}>
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
                    src={post.imageUrl || post.image}
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

        <Box
          sx={{
            mt: { xs: 5, md: 7 },
            p: { xs: 3, md: 4 },
            borderRadius: "20px",
            border: "1px solid rgba(0,154,214,0.2)",
            background:
              "linear-gradient(130deg, rgba(0,154,214,0.1) 0%, rgba(255,255,255,1) 58%)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ color: "var(--flight-color)", fontWeight: 800, fontSize: "24px" }}>
              Get new travel articles weekly
            </Typography>
            <Typography sx={{ color: "var(--text-color)", mt: 0.6 }}>
              Updates on flight trends, booking policy changes, and route insights.
            </Typography>
          </Box>
          <Button
            variant="contained"
            sx={{
              bgcolor: "var(--primary-color)",
              px: 3.2,
              py: 1.2,
              borderRadius: "12px",
              fontWeight: 700,
              "&:hover": { bgcolor: "var(--primary-button)" },
            }}
          >
            Subscribe
          </Button>
        </Box>
      </Container >
    </Box >
  );
};

export default Blog;
