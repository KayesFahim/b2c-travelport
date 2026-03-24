import React, { useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import secureLocalStorage from "react-secure-storage";
import { config } from "../config";

const SignInWithGoogle = ({ closeModal, onLoginSuccess, setOpen }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogIn = () => {
    setIsLoading(true);

    const authWindow = window.open(
      `${config.baseUrl}/social-site/google`,
      "_blank",
      "width=500,height=650"
    );

    if (!authWindow) {
      setIsLoading(false);
      return;
    }

    const onMessage = (event) => {
      // Keep origin check aligned with current backend baseUrl configuration.
      if (event.origin !== config.baseUrl) return;

      const payload = event.data || {};
      const user = payload.user || {};
      const accessToken = user.access_token;
      const userData = user.userData;
      const expireIn = user.expireIn;
      const responseData = payload.data;

      if (!accessToken || !userData) return;

      try {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("expire_in", String(expireIn || ""));
        localStorage.setItem("user", JSON.stringify(userData));

        secureLocalStorage.setItem("access_token", accessToken);
        secureLocalStorage.setItem("userData", userData);
        if (responseData) {
          secureLocalStorage.setItem("data", responseData);
        }
      } catch {
        // Ignore storage failures and still complete login flow.
      }

      try {
        authWindow.close();
      } catch {
        // Ignore popup close issues.
      }

      window.removeEventListener("message", onMessage);
      setIsLoading(false);

      if (typeof closeModal === "function") closeModal();
      if (typeof setOpen === "function") setOpen(false);
      if (typeof onLoginSuccess === "function") onLoginSuccess(payload);
    };

    window.addEventListener("message", onMessage);

    const timer = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(timer);
        window.removeEventListener("message", onMessage);
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <Box
      onClick={!isLoading ? handleGoogleLogIn : undefined}
      sx={{
        border: "1px solid #D9D9D9",
        borderRadius: "8px",
        py: 1.2,
        px: 1.5,
        cursor: isLoading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        opacity: isLoading ? 0.7 : 1,
      }}
      role="button"
      aria-label="Login with Google"
    >
      {isLoading ? (
        <CircularProgress size={20} />
      ) : (
        <GoogleIcon sx={{ color: "var(--primary-button)" }} />
      )}
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#1F1F1F" }}>
        {isLoading ? "Opening Google..." : "Login with Google"}
      </Typography>
    </Box>
  );
};

export default SignInWithGoogle;
