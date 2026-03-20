import { Box, Button, Typography } from "@mui/material";
import React, { useState } from "react";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import GoogleIcon from "@mui/icons-material/Google";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const SignIn = () => {
  const [lodaing, setLoading] = useState(false);

  const [userSignInInfo, setUserSignInInfo] = useState({
    signInEmail: "",
    signInPass: "",
  });

  const handleUserSignInInfo = (e) => {
    const { name, value } = e.target;
    setUserSignInInfo((prevSignInfo) => ({
      ...prevSignInfo,
      [name]: value,
    }));
  };

  if (lodaing) {
    <Typography>loading</Typography>;
  }

  const handleSubmitUserSignInInfo = async (e) => {
    e.preventDefault();
    let body = {
      email: String(userSignInInfo?.signInEmail),
      password: String(userSignInInfo?.signInPass),
    };

    try {
      const response = await fetch("http://192.168.10.91:3000/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setUserSignInInfo({
          signInEmail: "",
          signInPass: "",
        });
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "User signed in successfully!",
        });
      } else {
        throw new Error("Sign in request failed");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error signing in. Please try again.",
      });
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 0px",
      }}
    >
      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 1)",
          boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
          width: "450px",
          borderRadius: "5px",
          padding: "20px 60px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #D9D9D9",
            justifyContent: "center",
            height: "40px",
            borderRadius: "3px",
          }}
        >
          <GoogleIcon sx={{ color: "var(--primary-button)" }} />
          <Typography sx={{ color: "#5F6368", pl: "5px" }}>
            {" "}
            Login with Google
          </Typography>
        </Box>

        <Box sx={{ py: "20px" }}>
          <Typography
            sx={{
              color: "var(--primary-button)",
              fontWeight: 600,
              fontSize: "16px",
            }}
          >
            Sign In
          </Typography>

          <form onSubmit={handleSubmitUserSignInInfo}>
            <Box sx={{ pt: "20px" }}>
              {/* email input */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                  gap: "20px",
                  borderBottom: "1px solid #D9D9D9",
                }}
              >
                <MailIcon sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                  >
                    Email
                  </Typography>
                  <input
                    placeholder="sakhwat@gmail.com"
                    type="email"
                    name="signInEmail"
                    value={userSignInInfo?.signInEmail}
                    onChange={handleUserSignInInfo}
                    style={{
                      border: "none",
                      outline: "none",
                      color: "black",
                      paddingTop: "5px",
                      paddingBottom: "8px",
                    }}
                  />
                </Box>
              </Box>
              {/* password input */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                  gap: "20px",
                  borderBottom: "1px solid #D9D9D9",
                }}
              >
                <LockIcon sx={{ color: "var(--icons-color)" }} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontSize: "12px", color: "var(--icons-color)" }}
                  >
                    Password
                  </Typography>
                  <input
                    placeholder="**********"
                    type="password"
                    name="signInPass"
                    value={userSignInInfo?.signInPass}
                    onChange={handleUserSignInInfo}
                    style={{
                      border: "none",
                      outline: "none",
                      color: "black",
                      paddingTop: "5px",
                      paddingBottom: "8px",
                    }}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  pt: "20px",
                }}
              >
                <Link style={{ textDecoration: "none" }} to="">
                  <Typography
                    sx={{
                      fontSize: "13px",
                      color: "var(--primary-button)",
                      fontWeight: 600,
                    }}
                  >
                    Forgot Password ?
                  </Typography>
                </Link>
              </Box>
              {/* Phone input */}

              <Button
                type="submit"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "var(--primary-button)",
                  mt: "20px",
                  width: "100%",
                  textTransform: "capitalize",
                  fontSize: "16px",
                  height: "40px",
                  color: "var(--white)",
                  ":hover": {
                    bgcolor: "var(--primary-button)",
                    color: "var(--white)",
                  },
                }}
              >
                Sign In
              </Button>
              <Box sx={{ pt: "10px" }}>
                <Typography
                  sx={{
                    color: "var(--primary-button)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  Don’t have an Account?{" "}
                  <Link
                    to="/signUp"
                    style={{ textDecoration: "none", color: "#5F646C" }}
                  >
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default SignIn;
