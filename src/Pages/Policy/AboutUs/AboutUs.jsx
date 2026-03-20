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
import { Link as RouterLink } from "react-router-dom";
import NavBar from "../../../Shared/NavBar/NavBar";

const values = [
  {
    title: "Clear Pricing",
    description:
      "We show transparent fares so travelers and agents can make decisions fast without hidden surprises.",
  },
  {
    title: "Reliable Support",
    description:
      "From first search to ticketing, we keep support available for route guidance, changes, and urgent assistance.",
  },
  {
    title: "Smart Technology",
    description:
      "Our booking flows are designed for speed, accurate fare details, and stable performance across devices.",
  },
  {
    title: "Global Access",
    description:
      "By connecting strong supplier content, we help travelers reach more destinations with better options.",
  },
];

const milestones = [
  { label: "Founded", value: "2024" },
  { label: "Focus", value: "Flight-first OTA" },
  { label: "Core Market", value: "Bangladesh + Global routes" },
  { label: "Platform", value: "Web booking + API-ready" },
];

const AboutUs = () => {
  return (
    <Box sx={{ minHeight: "100%" }}>
      <NavBar />

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "24px",
            px: { xs: 3, md: 6 },
            py: { xs: 5, md: 7 },
            border: "1px solid rgba(0,154,214,0.18)",
            background:
              "linear-gradient(125deg, rgba(0,154,214,0.12) 0%, rgba(0,154,214,0.04) 45%, rgba(255,255,255,0.95) 100%)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: "-110px",
              right: "-60px",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,154,214,0.24), rgba(0,154,214,0))",
              pointerEvents: "none",
            }}
          />

          <Stack spacing={2} sx={{ maxWidth: 760, position: "relative", zIndex: 2 }}>
            <Chip
              label="About Fly Jatt"
              sx={{
                width: "fit-content",
                bgcolor: "rgba(0,154,214,0.12)",
                color: "var(--primary-color)",
                fontWeight: 700,
              }}
            />
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "30px", md: "44px" },
                lineHeight: 1.15,
                fontWeight: 800,
                color: "var(--flight-color)",
              }}
            >
              Building a faster, cleaner way to search and book flights.
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "15px", md: "17px" },
                color: "var(--text-color)",
                maxWidth: 680,
              }}
            >
              Fly Jatt is a modern travel platform focused on reliable flight discovery,
              transparent fare details, and smooth booking workflows. We combine
              supplier connectivity and practical UI design to reduce friction for both
              travelers and travel businesses.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} pt={1}>
              <Button
                component={RouterLink}
                to="/contact"
                variant="contained"
                sx={{
                  bgcolor: "var(--primary-color)",
                  borderRadius: "12px",
                  px: 3,
                  py: 1.2,
                  fontWeight: 700,
                  "&:hover": { bgcolor: "var(--primary-button)" },
                }}
              >
                Contact Team
              </Button>
              <Button
                component={RouterLink}
                to="/"
                variant="outlined"
                sx={{
                  borderColor: "var(--primary-color)",
                  color: "var(--primary-color)",
                  borderRadius: "12px",
                  px: 3,
                  py: 1.2,
                  fontWeight: 700,
                  "&:hover": {
                    borderColor: "var(--primary-color)",
                    bgcolor: "rgba(0,154,214,0.06)",
                  },
                }}
              >
                Explore Flights
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Grid container spacing={3} sx={{ mt: { xs: 1, md: 2 } }}>
          {milestones.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <Card
                sx={{
                  borderRadius: "16px",
                  border: "1px solid rgba(0,154,214,0.15)",
                  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
                }}
              >
                <CardContent>
                  <Typography
                    sx={{ fontSize: "13px", fontWeight: 600, color: "var(--text-color)" }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.8,
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "var(--flight-color)",
                    }}
                  >
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <Typography
            sx={{
              fontSize: { xs: "24px", md: "32px" },
              fontWeight: 800,
              color: "var(--flight-color)",
              mb: 1.2,
            }}
          >
            What drives us
          </Typography>
          <Typography sx={{ color: "var(--text-color)", mb: 3 }}>
            We build for practical outcomes: faster search, fewer booking errors, and
            better confidence at checkout.
          </Typography>

          <Grid container spacing={3}>
            {values.map((item) => (
              <Grid item xs={12} md={6} key={item.title}>
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: "16px",
                    border: "1px solid rgba(0,154,214,0.14)",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.4, md: 3 } }}>
                    <Typography
                      sx={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--flight-color)",
                        mb: 1,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography sx={{ color: "var(--text-color)", lineHeight: 1.7 }}>
                      {item.description}
                    </Typography>
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

export default AboutUs;
