import { useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, Container, FormControlLabel, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { fetchWithTimeout, readApiResponse } from "@/utils/apiClient";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/utils/passwordPolicy";

export default function AuthCard({ signup = false }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError(""); setSuccess("");
    if (signup && !isValidPassword(values.password)) return setError(PASSWORD_POLICY_MESSAGE);
    if (signup && !accepted) return setError("Please read and accept the terms to create your account.");
    setLoading(true);
    try {
      const response = await fetchWithTimeout(signup ? "/api/auth/register" : "/api/auth/login", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, email: values.email.trim() }),
      });
      const payload = await readApiResponse(response);
      setValues((current) => ({ ...current, password: "" }));
      if (payload.verificationRequired) {
        setSuccess("Account created. Check your email for a verification link, then sign in.");
      } else { navigate("/my-account/dashboard", { replace: true }); }
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };

  return (
    <Container className="flyjatt-auth-container" maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
      <Paper sx={{ p: { xs: 2.5, sm: 4.5 }, borderRadius: 3, border: "1px solid #dce8f2" }}>
        <Typography component={Link} to="/" sx={{ color: "#0079aa", fontSize: 22, fontWeight: 800 }}>Fly Jatt</Typography>
        <Typography component="h1" variant="h4" sx={{ mt: 3, mb: 1 }}>{signup ? "Create your account" : "Welcome back"}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{signup ? "Keep your bookings and travelers in one place." : "Sign in to manage your bookings and traveler details."}</Typography>
        <Stack component="form" onSubmit={submit} spacing={2.5}>
          {signup && <TextField label="Full name" name="name" autoComplete="name" value={values.name} onChange={update} required fullWidth inputProps={{ maxLength: 120 }} />}
          <TextField label="Email address" name="email" type="email" autoComplete="email" value={values.email} onChange={update} required fullWidth inputProps={{ maxLength: 191 }} />
          <TextField label="Password" name="password" type={visible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} value={values.password} onChange={update} required fullWidth
            helperText={signup ? PASSWORD_POLICY_MESSAGE : undefined}
            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)} edge="end">{visible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
          {signup ? <FormControlLabel control={<Checkbox checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />} label={<Typography variant="body2">I agree to the <Link to="/terms" style={{ color: "#0079aa", textDecoration: "underline" }}>Terms &amp; Conditions</Link></Typography>} /> : <Typography component={Link} to="/OtpEmail" sx={{ color: "#0079aa", alignSelf: "flex-end", fontSize: 14 }}>Forgot password?</Typography>}
          <Box aria-live="polite">
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Box>
          <Button type="submit" variant="contained" disabled={loading || Boolean(success)} sx={{ minHeight: 48 }} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}>
            {loading ? "Please wait…" : signup ? "Create account" : "Sign In"}
          </Button>
          <Typography textAlign="center" variant="body2" color="text.secondary">
            {signup ? "Already have an account? " : "New to Fly Jatt? "}
            <Link to={signup ? "/signIn" : "/signUp"} style={{ color: "#0079aa", fontWeight: 700 }}>{signup ? "Sign in" : "Create an account"}</Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
