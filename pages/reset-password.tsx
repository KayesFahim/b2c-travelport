import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useMemo(() => String(router.query.token || "").trim(), [router.query.token]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to reset password");
      }
      setMessage("Password reset successful. You can sign in now.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password | FlyJatt</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#f8fafc" }}>
        <section style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
          <h1 style={{ marginTop: 0, fontSize: 22 }}>Reset Password</h1>
          <form onSubmit={onSubmit}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              style={{ width: "100%", padding: 10, marginBottom: 12, border: "1px solid #cbd5e1", borderRadius: 8 }}
            />
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              style={{ width: "100%", padding: 10, marginBottom: 12, border: "1px solid #cbd5e1", borderRadius: 8 }}
            />
            {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
            {message ? <p style={{ color: "#166534" }}>{message}</p> : null}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: 11, borderRadius: 8, border: 0, background: "#0ea5e9", color: "#fff", fontWeight: 700 }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
