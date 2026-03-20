import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneInTalkRoundedIcon from "@mui/icons-material/PhoneInTalkRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import NavBar from "../../Shared/NavBar/NavBar";

const initialFormValues = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

function validate(values) {
  const nextErrors = {};

  if (!values.name.trim()) {
    nextErrors.name = "Name is required.";
  } else if (values.name.trim().length < 2) {
    nextErrors.name = "Name must be at least 2 characters.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!values.email.trim()) {
    nextErrors.email = "Email is required.";
  } else if (!emailPattern.test(values.email.trim())) {
    nextErrors.email = "Enter a valid email address.";
  }

  if (!values.subject.trim()) {
    nextErrors.subject = "Subject is required.";
  }

  if (!values.message.trim()) {
    nextErrors.message = "Message is required.";
  } else if (values.message.trim().length < 10) {
    nextErrors.message = "Message must be at least 10 characters.";
  }

  if (values.phone.trim()) {
    const cleaned = values.phone.replace(/[\s()+-]/g, "");
    if (!/^\d{7,15}$/.test(cleaned)) {
      nextErrors.phone = "Enter a valid phone number.";
    }
  }

  return nextErrors;
}

const contactHighlights = [
  {
    icon: <EmailRoundedIcon />,
    title: "Email",
    text: "info@flyjatt.com",
  },
  {
    icon: <PhoneInTalkRoundedIcon />,
    title: "Phone",
    text: "+88 01736-987906",
  },
  {
    icon: <PlaceRoundedIcon />,
    title: "Address",
    text: "DCC7, North Ibrahimpur, Kafrul, Dhaka-1206, Bangladesh",
  },
  {
    icon: <AccessTimeRoundedIcon />,
    title: "Support Hours",
    text: "24/7 online support",
  },
];

const Contact = () => {
  const [formValues, setFormValues] = useState(initialFormValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate(formValues);
    setErrors(nextErrors);
    setSubmitSuccess("");
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to submit your message.");
      }

      setSubmitSuccess(
        payload?.message || "Message sent successfully. Our team will contact you soon."
      );
      setFormValues(initialFormValues);
      setErrors({});
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100%" }}>
      <NavBar />

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "24px",
            border: "1px solid rgba(0,154,214,0.2)",
            px: { xs: 3, md: 6 },
            py: { xs: 5, md: 6 },
            background:
              "linear-gradient(125deg, rgba(0,154,214,0.15) 0%, rgba(0,154,214,0.05) 45%, rgba(255,255,255,0.98) 100%)",
            mb: 4,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: "-80px",
              right: "-80px",
              width: 240,
              height: 240,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,154,214,0.28), rgba(0,154,214,0))",
              pointerEvents: "none",
            }}
          />

          <Stack spacing={2} sx={{ position: "relative", zIndex: 2, maxWidth: 760 }}>
            <Chip
              label="Contact Fly Jatt"
              sx={{
                width: "fit-content",
                fontWeight: 700,
                color: "var(--primary-color)",
                bgcolor: "rgba(0,154,214,0.15)",
              }}
            />
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "30px", md: "42px" },
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--flight-color)",
              }}
            >
              Let’s plan your next booking with confidence.
            </Typography>
            <Typography sx={{ color: "var(--text-color)", fontSize: { xs: "15px", md: "17px" } }}>
              Share your requirement and our team will respond with route options,
              policy details, and booking support.
            </Typography>
          </Stack>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              {contactHighlights.map((item) => (
                <Card
                  key={item.title}
                  sx={{
                    borderRadius: "16px",
                    border: "1px solid rgba(0,154,214,0.15)",
                    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
                  }}
                >
                  <CardContent sx={{ display: "flex", gap: 1.6, alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(0,154,214,0.12)",
                        color: "var(--primary-color)",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: "var(--flight-color)" }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ mt: 0.5, color: "var(--text-color)", lineHeight: 1.6 }}>
                        {item.text}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card
              sx={{
                borderRadius: "20px",
                border: "1px solid rgba(0,154,214,0.18)",
                boxShadow: "0 16px 30px rgba(15,23,42,0.06)",
              }}
            >
              <CardContent sx={{ p: { xs: 2.4, md: 3.2 } }}>
                <Typography
                  sx={{
                    fontSize: { xs: "22px", md: "28px" },
                    fontWeight: 800,
                    color: "var(--flight-color)",
                    mb: 0.6,
                  }}
                >
                  Send a message
                </Typography>
                <Typography sx={{ color: "var(--text-color)", mb: 2.5 }}>
                  Fill out the form and we will get back to you shortly.
                </Typography>

                {submitSuccess ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {submitSuccess}
                  </Alert>
                ) : null}
                {submitError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {submitError}
                  </Alert>
                ) : null}

                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={formValues.name}
                        onChange={handleChange}
                        error={Boolean(errors.name)}
                        helperText={errors.name || ""}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        value={formValues.email}
                        onChange={handleChange}
                        error={Boolean(errors.email)}
                        helperText={errors.email || ""}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone Number (optional)"
                        name="phone"
                        value={formValues.phone}
                        onChange={handleChange}
                        error={Boolean(errors.phone)}
                        helperText={errors.phone || ""}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Subject"
                        name="subject"
                        value={formValues.subject}
                        onChange={handleChange}
                        error={Boolean(errors.subject)}
                        helperText={errors.subject || ""}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={5}
                        label="How can we help you?"
                        name="message"
                        value={formValues.message}
                        onChange={handleChange}
                        error={Boolean(errors.message)}
                        helperText={errors.message || ""}
                      />
                    </Grid>
                  </Grid>

                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<SendRoundedIcon />}
                    disabled={submitting}
                    sx={{
                      mt: 2.5,
                      px: 3,
                      py: 1.2,
                      borderRadius: "12px",
                      fontWeight: 700,
                      bgcolor: "var(--primary-color)",
                      "&:hover": {
                        bgcolor: "var(--primary-button)",
                      },
                    }}
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Contact;
