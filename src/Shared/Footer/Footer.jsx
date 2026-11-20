import React, { useState } from "react";
import { Box, Container, Grid, IconButton, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import XIcon from "@mui/icons-material/X";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import YouTubeIcon from "@mui/icons-material/YouTube";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { toast } from "react-toastify";
import paymentBannerImg from "../../asstes/img/footer img/payment.png";

const resolveAssetSrc = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.src === "string") return value.src;
  return "";
};

const Footer = () => {
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscribedMessage, setSubscribedMessage] = useState("");

  const handleSubscribe = (event) => {
    event.preventDefault();
    const cleaned = String(subscriberEmail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      toast.warning("Please enter a valid email address for fare alerts.");
      return;
    }
    setSubscribedMessage(`Fare alerts enabled for ${cleaned}.`);
    toast.success("Subscribed to Fly Jatt fare drops and schedule updates.");
    setSubscriberEmail("");
  };

  const quickLinks = [
    { label: "Flight Search", to: "/" },
    { label: "About Fly Jatt", to: "/about" },
    { label: "Travel Blog", to: "/blog" },
    { label: "Contact Support", to: "/contact" },
    { label: "My Bookings", to: "/my-account/booking" },
  ];

  const policyLinks = [
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms & Conditions", to: "/terms-conditions" },
    { label: "Booking History", to: "/my-account/booking" },
    { label: "Traveler Account", to: "/my-account/profile" },
  ];

  const socialChannels = [
    { label: "Visit Fly Jatt on Facebook", icon: <FacebookRoundedIcon fontSize="small" />, href: "https://facebook.com" },
    { label: "Follow Fly Jatt on X", icon: <XIcon fontSize="small" />, href: "https://x.com" },
    { label: "Connect with Fly Jatt on LinkedIn", icon: <LinkedInIcon fontSize="small" />, href: "https://linkedin.com" },
    { label: "Watch Fly Jatt on YouTube", icon: <YouTubeIcon fontSize="small" />, href: "https://youtube.com" },
  ];

  return (
    <Box
      component="footer"
      sx={{
        background:
          "linear-gradient(155deg, #061c39 0%, #0b2d56 58%, #0e3d70 100%)",
        color: "#e2e8f0",
        pt: { xs: 5, md: 7 },
        pb: { xs: 3.5, md: 4.5 },
        borderTop: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 3.5, md: 5 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    bgcolor: "rgba(56, 189, 248, 0.16)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#38bdf8",
                  }}
                >
                  <FlightTakeoffRoundedIcon />
                </Box>
                <Typography
                  sx={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    letterSpacing: "0.3px",
                    color: "#ffffff",
                  }}
                >
                  Fly Jatt
                </Typography>
              </Stack>

              <Typography
                sx={{
                  color: "#cbd5e1",
                  fontSize: "0.92rem",
                  lineHeight: 1.65,
                  maxWidth: 380,
                }}
              >
                Modern GDS-powered flight search, transparent branded fare comparison, interactive cabin seat maps, and instant e-ticketing.
              </Typography>

              <Stack spacing={1} sx={{ mt: 2.2 }}>
                <Typography
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "#e2e8f0",
                    fontSize: "0.88rem",
                  }}
                >
                  <SupportAgentRoundedIcon sx={{ fontSize: 18, color: "#38bdf8" }} />
                  24/7 Operations Desk • support@flyjatt.com
                </Typography>
                <Typography
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "#e2e8f0",
                    fontSize: "0.88rem",
                  }}
                >
                  <LanguageRoundedIcon sx={{ fontSize: 18, color: "#38bdf8" }} />
                  Dhaka • Dubai • London Global Corridors
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                {socialChannels.map((item) => (
                  <IconButton
                    key={item.label}
                    component="a"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="flyjatt-touch-btn flyjatt-focus-ring"
                    sx={{
                      minWidth: 44,
                      minHeight: 44,
                      color: "#ffffff",
                      bgcolor: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      "&:hover:not(:disabled)": {
                        bgcolor: "#0082c4",
                        borderColor: "#38bdf8",
                      },
                    }}
                  >
                    {item.icon}
                  </IconButton>
                ))}
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Typography
              component="h3"
              sx={{ color: "#ffffff", fontWeight: 800, fontSize: "0.96rem", mb: 1.5 }}
            >
              Explore
            </Typography>
            <Stack spacing={1.1}>
              {quickLinks.map((link) => (
                <RouterLink
                  key={link.to + link.label}
                  to={link.to}
                  className="flyjatt-focus-ring"
                  style={{
                    color: "#cbd5e1",
                    textDecoration: "none",
                    fontSize: "0.89rem",
                    fontWeight: 600,
                    paddingBlock: "2px",
                  }}
                >
                  {link.label}
                </RouterLink>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Typography
              component="h3"
              sx={{ color: "#ffffff", fontWeight: 800, fontSize: "0.96rem", mb: 1.5 }}
            >
              Policies &amp; Account
            </Typography>
            <Stack spacing={1.1}>
              {policyLinks.map((link) => (
                <RouterLink
                  key={link.to + link.label}
                  to={link.to}
                  className="flyjatt-focus-ring"
                  style={{
                    color: "#cbd5e1",
                    textDecoration: "none",
                    fontSize: "0.89rem",
                    fontWeight: 600,
                    paddingBlock: "2px",
                  }}
                >
                  {link.label}
                </RouterLink>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} sm={12} md={4}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: "18px",
                bgcolor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <Typography
                component="h3"
                sx={{ color: "#ffffff", fontWeight: 800, fontSize: "1rem" }}
              >
                Fare Drop Alerts
              </Typography>
              <Typography sx={{ color: "#cbd5e1", fontSize: "0.86rem", mt: 0.6, mb: 1.8 }}>
                Receive weekly route specials and airline brand announcements straight in your inbox.
              </Typography>

              <Box
                component="form"
                onSubmit={handleSubscribe}
                noValidate
                sx={{ display: "flex", gap: 1, flexWrap: { xs: "wrap", sm: "nowrap" } }}
              >
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address for fare alerts
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="flyjatt-focus-ring"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: "44px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.24)",
                    backgroundColor: "rgba(6, 28, 57, 0.72)",
                    color: "#ffffff",
                    padding: "0 14px",
                    fontSize: "0.9rem",
                  }}
                />
                <button
                  type="submit"
                  className="flyjatt-touch-btn"
                  style={{
                    minHeight: "44px",
                    padding: "0 18px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#38bdf8",
                    color: "#061c39",
                    fontWeight: 800,
                    fontSize: "0.86rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  Subscribe
                  <SendRoundedIcon sx={{ fontSize: 16 }} />
                </button>
              </Box>

              {subscribedMessage ? (
                <Typography
                  role="status"
                  sx={{ mt: 1, fontSize: "0.8rem", color: "#7dd3fc", fontWeight: 600 }}
                >
                  {subscribedMessage}
                </Typography>
              ) : null}

              <Box sx={{ mt: 2 }}>
                <img
                  src={resolveAssetSrc(paymentBannerImg)}
                  alt="Supported payment providers"
                  width={340}
                  height={44}
                  loading="lazy"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.92)",
                    padding: "4px 8px",
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: 4.5,
            pt: 2.5,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontSize: "0.84rem", color: "#94a3b8" }}>
            &copy; {new Date().getFullYear()} Fly Jatt. All rights reserved. Powered by Travelport GDS.
          </Typography>
          <Typography sx={{ fontSize: "0.84rem", color: "#94a3b8" }}>
            Live Fares • Branded Seat Selection • Instant PNR Hold
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
