import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Container, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import XIcon from "@mui/icons-material/X";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import YouTubeIcon from "@mui/icons-material/YouTube";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";

const linkStyle = {
  color: "var(--footer-text-color)",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.9,
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [homepageSettings, setHomepageSettings] = useState({
    contactEmail: "info@flyjatt.com",
    contactPhone: "",
    copyright: "",
  });

  useEffect(() => {
    fetch("/api/homepage")
      .then((response) => response.json())
      .then((payload) => {
        if (payload && typeof payload === "object") {
          setHomepageSettings((prev) => ({
            ...prev,
            contactEmail: String(payload.contactEmail || prev.contactEmail),
            contactPhone: String(payload.contactPhone || ""),
            copyright: String(payload.copyright || ""),
          }));
        }
      })
      .catch(() => {
        // Keep defaults when API is unavailable.
      });
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        mt: 8,
        color: "var(--footer-text-color)",
        background:
          "radial-gradient(circle at 12% 18%, rgba(0,154,214,0.26), transparent 38%), radial-gradient(circle at 86% 12%, rgba(0,181,173,0.16), transparent 34%), linear-gradient(180deg, #04233d 0%, #021426 100%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Container sx={{ py: { xs: 5, md: 6 }, position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            mb: 4,
            p: { xs: 2.2, md: 2.8 },
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.16)",
            background:
              "linear-gradient(120deg, rgba(0,154,214,0.32), rgba(0,100,156,0.2))",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                color: "white",
                fontWeight: 800,
                fontSize: { xs: "20px", md: "24px" },
                lineHeight: 1.2,
              }}
            >
              Ready for your next smart booking?
            </Typography>
            <Typography sx={{ mt: 0.7, color: "rgba(255,255,255,0.85)", fontSize: "14px" }}>
              Compare better fares, cleaner routes, and faster confirmation in one place.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/"
            sx={{
              px: 2.4,
              py: 1.1,
              borderRadius: "999px",
              fontWeight: 700,
              color: "#ffffff",
              bgcolor: "var(--primary-color)",
              "&:hover": {
                bgcolor: "var(--primary-button)",
              },
            }}
          >
            Search Flights
          </Button>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "1.4fr 1fr 1fr 1.2fr" },
            gap: { xs: 3, md: 4 },
          }}
        >
          <Box>
            <Typography sx={{ color: "white", fontSize: "24px", fontWeight: 800, letterSpacing: "0.3px" }}>
              Fly Jatt
            </Typography>
            <Typography sx={{ mt: 1.2, fontSize: "14px", lineHeight: 1.8 }}>
              API-first flight booking interface focused on stronger fare depth, transparent policies,
              and quicker checkout for modern travel teams.
            </Typography>
            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Chip
                icon={<FlightTakeoffRoundedIcon sx={{ color: "white !important" }} />}
                label="Global Flights"
                sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)" }}
              />
              <Chip
                icon={<SupportAgentRoundedIcon sx={{ color: "white !important" }} />}
                label="24/7 Support"
                sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)" }}
              />
            </Box>
          </Box>

          <Box>
            <Typography sx={{ color: "var(--footer-text-color-heading)", fontWeight: 700, mb: 1 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <RouterLink to="/" style={linkStyle}>
                Home
              </RouterLink>
              <RouterLink to="/about" style={linkStyle}>
                About
              </RouterLink>
              <RouterLink to="/blog" style={linkStyle}>
                Blog
              </RouterLink>
              <RouterLink to="/contact" style={linkStyle}>
                Contact
              </RouterLink>
            </Box>
          </Box>

          <Box>
            <Typography sx={{ color: "var(--footer-text-color-heading)", fontWeight: 700, mb: 1 }}>
              Policies
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <RouterLink to="/terms" style={linkStyle}>
                Terms & Conditions
              </RouterLink>
              <RouterLink to="/privacypolicy" style={linkStyle}>
                Privacy Policy
              </RouterLink>
              <a href={`mailto:${homepageSettings.contactEmail}`} style={linkStyle}>
                {homepageSettings.contactEmail}
              </a>
              {homepageSettings.contactPhone ? (
                <Typography sx={{ fontSize: "13px", color: "var(--footer-text-color)" }}>
                  {homepageSettings.contactPhone}
                </Typography>
              ) : null}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.6 }}>
                <LanguageRoundedIcon sx={{ fontSize: 16, color: "var(--icons-color)" }} />
                <Typography sx={{ fontSize: "13px", color: "var(--footer-text-color)" }}>
                  Dhaka, Bangladesh
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box>
            <Typography sx={{ color: "var(--footer-text-color-heading)", fontWeight: 700, mb: 1 }}>
              Get Updates
            </Typography>
            <Typography sx={{ fontSize: "13px", mb: 1.2, lineHeight: 1.7 }}>
              Fare alerts, product updates, and launch offers delivered in your inbox.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                placeholder="Your email"
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    borderRadius: "999px",
                    bgcolor: "rgba(255,255,255,0.06)",
                    "& fieldset": {
                      borderColor: "rgba(255,255,255,0.22)",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(255,255,255,0.42)",
                    },
                  },
                  "& input::placeholder": {
                    color: "rgba(225,236,249,0.78)",
                    opacity: 1,
                  },
                }}
              />
              <Button
                sx={{
                  px: 2.2,
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  bgcolor: "var(--primary-color)",
                  color: "#fff",
                  "&:hover": { bgcolor: "var(--primary-button)" },
                }}
              >
                Subscribe
              </Button>
            </Box>
            <Box sx={{ mt: 1.6, display: "flex", gap: 1 }}>
              {[FacebookRoundedIcon, XIcon, YouTubeIcon, LinkedInIcon].map((Icon, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "999px",
                    bgcolor: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .2s ease",
                    "&:hover": {
                      bgcolor: "var(--primary-color)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 18, color: "white" }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 4,
            pt: 2.2,
            borderTop: "1px solid rgba(255,255,255,0.14)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: "13px", color: "var(--footer-text-color)" }}>
            {homepageSettings.copyright || `Copyright © ${currentYear} Fly Jatt. All rights reserved.`}
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <RouterLink to="/privacypolicy" style={{ ...linkStyle, fontSize: "13px" }}>
              Privacy
            </RouterLink>
            <RouterLink to="/terms" style={{ ...linkStyle, fontSize: "13px" }}>
              Terms
            </RouterLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
