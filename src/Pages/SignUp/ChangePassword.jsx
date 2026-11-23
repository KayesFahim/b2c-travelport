import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/utils/passwordPolicy";
import {
  Box,
  Button,
  Container,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import React, { useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import NavBar from "../../Shared/NavBar/NavBar";
import BrandWordmark from "../../Shared/BrandWordmark/BrandWordmark";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { config } from "../../config";

const ChangePassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false); // State to handle loading
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const validatePassword = (password) => {

    if (!isValidPassword(password)) {
      return PASSWORD_POLICY_MESSAGE;
    }
    return "";
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    setPasswordError("");
    setConfirmPasswordError("");

    // Validate password length and complexity
    if (newPassword && validatePassword(newPassword)) {
      setPasswordError(validatePassword(newPassword));
      return;
    }

    // Ensure passwords match
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const resData = await response.json().catch(() => ({}));

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text:
            resData?.message ||
            "Your password has been reset successfully!",
        }).then(() => {
          navigate("/"); // Redirect to another page
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed!",
          text:
            resData?.message ||
            "Password reset failed. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text:
          error?.message ||
          "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <NavBar />
      <Box sx={{ bgcolor: "#EBF0F4" }}>
        <Container
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          <Box
            sx={{
              background: "#ffff",
              width: "450px",
              px: "20px",
              borderRadius: "5px",
              py: "15px",
            }}
          >
            <Box
              sx={{
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                my: "10px",
              }}
            >
              <BrandWordmark width={120} height={100} fontSize={30} />
            </Box>
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--primary-button)",
                textAlign: "center",
              }}
            >
              New Password
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                py: "10px",
                color: "var(--primary-button)",
                textAlign: "center",
                paddingBottom: "20px",
              }}
            >
              Choose a new password for your account.
            </Typography>
            <form onSubmit={handlePasswordReset}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                  flexDirection: "column",
                }}
              >
                {/* Password Field */}
                <Box sx={{ width: "100%" }}>
                  <Typography
                    sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                  >
                    Password
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "8px",
                      gap: 1,
                      borderBottom: "1px solid #D9D9D9",
                      width: "100%",
                    }}
                  >
                    <LockIcon
                      sx={{
                        color: "var(--icons-color)",
                        fontSize: 20,
                        pb: 0.5,
                      }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          position: "relative",
                          width: "100%",
                        }}
                      >
                        <input
                          placeholder="Enter Password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onBlur={() =>
                            setPasswordError(validatePassword(newPassword))
                          } // Validation on Blur
                          onChange={(e) => setNewPassword(e.target.value)} // On change to update the value
                          style={{
                            border: "none",
                            outline: "none",
                            color: "black",
                            paddingTop: "5px",
                            paddingBottom: "8px",
                            width: "100%",
                          }}
                        />
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          sx={{ position: "absolute", right: 0 }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                {passwordError && (
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "red",
                      textAlign: "left",
                      width: "100%",
                      pt: "5px",
                    }}
                  >
                    {passwordError}
                  </Typography>
                )}

                {/* Confirm Password Field */}
                <Box sx={{ width: "100%", pt: "20px" }}>
                  <Typography
                    sx={{ fontSize: "13px", color: "var(--primary-button)" }}
                  >
                    Confirm Password
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      pt: "12px",
                      gap: 1,
                      borderBottom: "1px solid #D9D9D9",
                      width: "100%",
                    }}
                  >
                    <LockIcon
                      sx={{
                        color: "var(--icons-color)",
                        fontSize: 20,
                        pb: 0.5,
                      }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          position: "relative",
                          width: "100%",
                        }}
                      >
                        <input
                          placeholder="Confirm Password"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onBlur={() =>
                            setConfirmPasswordError(
                              newPassword !== confirmPassword
                                ? "Passwords do not match!"
                                : ""
                            )
                          } // Validation on Blur
                          onChange={(e) => setConfirmPassword(e.target.value)} // On change to update the value
                          style={{
                            border: "none",
                            outline: "none",
                            color: "black",
                            paddingTop: "5px",
                            paddingBottom: "8px",
                            width: "100%",
                          }}
                        />
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          sx={{ position: "absolute", right: 0 }}
                        >
                          {showConfirmPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                {confirmPasswordError && (
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "red",
                      textAlign: "left",
                      width: "100%",
                      pt: "5px",
                    }}
                  >
                    {confirmPasswordError}
                  </Typography>
                )}
                <Button
                  sx={{
                    backgroundColor: "var(--primary-button)",
                    color: "#fff",
                    width: "100%",
                    borderRadius: "5px",
                    ":hover": {
                      backgroundColor: "var(--primary-button)",
                      color: "#fff",
                    },
                    py: "8px",
                    mt: "20px",
                    fontWeight: "500",
                  }}
                  type="submit"
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: "white" }} />
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </Box>
            </form>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ChangePassword;
