import React from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { toast } from "react-toastify";
import { config } from "../config";
import secureLocalStorage from "react-secure-storage";
import GoogleIcon from "@mui/icons-material/Google";
import { Box } from "@mui/material";
const GoogleLogIn = ({ closeModal, onLoginSuccess }) => {
  const handleSignWithGoogle = async (data) => {
    if (!data?.access_token) {
      toast.error("Google login token is missing.");
      return;
    }

    try {
      const url = `${config.baseUrl}/auth/google/${data.access_token}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const userData = await response.json();
      toast.success("Login successful!");
      secureLocalStorage.setItem("access_token", userData?.access_token);
      secureLocalStorage.setItem("userData", userData?.userData);
      secureLocalStorage.setItem("data", userData);
      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(userData);
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error.message || "Login failed. Please try again.");
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleSignWithGoogle(tokenResponse);
      closeModal();
    },
    onError: (error) => {
      console.error("Google Login Failed:", error);
      toast.error("Google Login Failed. Please try again.");
    },
  });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        border: "1px solid #D9D9D9",
        justifyContent: "center",
        height: "40px",
        borderRadius: "3px",
        px: 2,
        cursor: "pointer",
      }}
      onClick={handleGoogleLogin}
    >
      <GoogleIcon sx={{ color: "var(--primary-button)" }} />
      <Box sx={{ color: "var(--primary-button)", pl: "5px" }}>
        Login with Google
      </Box>
    </Box>
  );
};

const SignInWithGoogle = ({ closeModal, onLoginSuccess }) => {
  // Hide Google sign-in silently when OAuth client ID is not configured.
  if (!config.googleClientId) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <GoogleLogIn closeModal={closeModal} onLoginSuccess={onLoginSuccess} />
    </GoogleOAuthProvider>
  );
};

export default SignInWithGoogle;
