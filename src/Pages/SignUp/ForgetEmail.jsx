import { useState } from "react";
import { Alert, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { fetchWithTimeout, readApiResponse } from "@/utils/apiClient";

export default function ForgetEmail() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetchWithTimeout("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const payload = await readApiResponse(response);
      setMessage(payload.message);
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  return <Container className="flyjatt-auth-container" maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}><Paper sx={{ p: { xs: 2.5, sm: 4.5 }, borderRadius: 3 }}>
    <Typography component="h1" variant="h4" sx={{ mb: 1 }}>Reset your password</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Enter your email address and we’ll send a link to reset your password.</Typography>
    <Stack component="form" spacing={2.5} onSubmit={submit}>
      <TextField label="Email address" type="email" autoComplete="email" required fullWidth value={email} onChange={(event) => setEmail(event.target.value)} />
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Button variant="contained" type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      <Typography component={Link} to="/signIn" sx={{ textAlign: "center", color: "#0079aa" }}>Back to sign in</Typography>
    </Stack>
  </Paper></Container>;
}
